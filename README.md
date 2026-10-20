# MiniMakerDAO

An over-collateralized stablecoin engine on Ethereum modeled after MakerDAO's CDP (Collateralized Debt Position) architecture. Users lock native ETH as collateral to mint `dEngine` (DET), an ERC-20 stablecoin pegged 1:1 to USD, using real-time Chainlink oracle price feeds.

Includes a complete full-stack client built with Next.js 16, Wagmi v2, Viem, and RainbowKit.

---

## 1. Protocol Architecture & Mechanics

```
                         +-----------------------+
                         | Chainlink Aggregator  |
                         |   (ETH / USD Feed)    |
                         +-----------+-----------+
                                     |
                                     | latestRoundData()
                                     v
+-------------------+      +-------------------+      +-------------------+
|   User / Vault    | ---> |    VEngine.sol    | ---> |  dEngineToken.sol |
| (ETH Collateral)  | <--- |   (Core Logic)    | <--- |   (ERC-20 Debt)   |
+-------------------+      +-------------------+      +-------------------+
                                     |
                                     | liquidate()
                                     v
                           +-------------------+
                           |    Liquidator     |
                           | (Pays Debt + 10%  |
                           | Collateral Bonus) |
                           +-------------------+
```

### Core Parameters
* **Collateral Asset:** Native `ETH` (18 decimals)
* **Debt Token:** `dEngine` (`DET`, 18 decimals, $1.00 USD target peg)
* **Minimum Collateralization Ratio (MCR):** $150\%$ ($1.5\times$)
* **Liquidation Bonus:** $10\%$ discount on seized collateral
* **Oracle Decimals Adjustment:** Chainlink 8-decimal answer normalized to 18 decimals (`answer * 1e10`)

---

## 2. Mathematical Invariants & State Transitions

### Collateral Valuation & Health Factor
The oracle price is fetched via `latestRoundData()`:
$$\text{Price}_{\text{ETH/USD}} = \text{answer} \times 10^{10}$$

Total collateral USD valuation:
$$\text{Collateral}_{\text{USD}} = \frac{\text{Collateral}_{\text{ETH}} \times \text{Price}_{\text{ETH/USD}}}{10^{18}}$$

A vault is solvent if and only if:
$$\text{Collateral}_{\text{USD}} \ge 1.5 \times \text{Debt}_{\text{DET}} \iff \frac{15 \times \text{Debt}_{\text{DET}}}{10} \le \text{Collateral}_{\text{USD}}$$

$$\text{HealthFactor} = 
\begin{cases} 
\text{true}, & \text{Debt} = 0 \\ 
\text{Collateral}_{\text{USD}} \ge 1.5 \times \text{Debt}_{\text{DET}}, & \text{Debt} > 0 
\end{cases}$$

### Liquidation Threshold
When $\text{HealthFactor} == \text{false}$, any account may call `liquidate(address mainUser, uint256 debtCovering)`.

1. Seized ETH at market rate:
   $$\text{BaseCollateral}_{\text{ETH}} = \frac{\text{debtCovering} \times 10^{18}}{\text{Price}_{\text{ETH/USD}}}$$

2. Seized ETH including bonus:
   $$\text{NetCollateral}_{\text{ETH}} = \text{BaseCollateral}_{\text{ETH}} \times \left(1 + \frac{10}{100}\right) = 1.10 \times \text{BaseCollateral}_{\text{ETH}}$$

3. State accounting (Checks-Effects-Interactions):
   $$\text{debt}[\text{user}] \leftarrow \text{debt}[\text{user}] - \text{debtCovering}$$
   $$\text{collateral}[\text{user}] \leftarrow \text{collateral}[\text{user}] - \text{NetCollateral}_{\text{ETH}}$$
   * Burns covered `DET` from liquidator: `i_dEngine.burnFrom(msg.sender, debtCovering)`
   * Sends `NetCollateral` native ETH to liquidator: `payable(msg.sender).call{value: netEth}("")`

---

## 3. Smart Contracts Specification

### `src/VaultEngine.sol` (`VEngine`)
Manages state mappings, debt accounting, oracle reads, and settlements.

| Function | Visibility | Mutability | Description |
| :--- | :--- | :--- | :--- |
| `DepositAndMint(uint256 AmntMint)` | `public` | `payable` | Deposits `msg.value` as ETH collateral and mints `AmntMint` of `DET`. Reverts with `SurpassingLimit()` if MCR < 150%. |
| `DebtAndWithdraw(uint256 EthWithdraw, uint256 TokenBurn)` | `public` | `nonpayable` | Burns `TokenBurn` DET and transfers `EthWithdraw` native ETH back to caller. Reverts with `HealthFactorBroken()` if post-state MCR < 150%. |
| `liquidate(address mainUser, uint256 debtCovering)` | `external` | `nonpayable` | Liquidates an under-collateralized vault. Reverts with `HealthGood()` if healthy, or `InsufficientCollateral()` if vault balance < debt payout. |
| `ETHToUSD()` | `public` | `view` | Fetches raw Chainlink round data and returns normalized 18-decimal USD price. |
| `healthFactor(address user)` | `public` | `view` | Returns `true` if vault collateral $\ge 1.5 \times \text{debt}$. |
| `debtAmntToETH(uint256 _amntpaying)` | `public` | `view` | Converts a given DET USD debt amount into wei of ETH based on current oracle price. |

#### Custom Errors
* `SurpassingLimit()`: Mint requested exceeds 150% collateral threshold.
* `HealthFactorBroken()`: Collateral withdrawal breaks health factor.
* `HealthGood()`: Attempted liquidation on an account whose health factor is $\ge 1.0$.
* `InsufficientCollateral()`: Account collateral is less than total liquidation payout.

### `src/dEngineToken.sol` (`dEngine`)
Standard `ERC20Burnable`, `Ownable` contract. Ownership is transferred to `VEngine` at deployment so only the engine contract can invoke `mint()` and `burn()`.

---

## 4. Frontend Client Architecture

Located in [`frontend/`](./frontend), the UI is built with **Next.js 16 (App Router)**, **TypeScript**, **Turbopack**, and **Tailwind CSS**.

### Web3 Integration Stack
* **Wagmi v2 (`wagmi`) & Viem (`viem`):** Contract reads/writes, typed event polling, gas estimation, BigInt serialization.
* **RainbowKit (`@rainbow-me/rainbowkit`):** Injected, MetaMask, and WalletConnect multi-wallet provider modal.
* **TanStack Query (`@tanstack/react-query`):** Dynamic caching and RPC state hydration.

### Client-Side Risk Calculations ([`frontend/app/page.tsx`](./frontend/app/page.tsx))
The dashboard runs client-side simulation to prevent users from executing transactions that would revert:

1. **Liquidation Price:**
   $$P_{\text{liq}} = \frac{\text{Debt}_{\text{DET}} \times 1.5}{\text{Collateral}_{\text{ETH}}}$$

2. **Safety Drop Cushion:**
   $$\text{DropBuffer} = \frac{P_{\text{current}} - P_{\text{liq}}}{P_{\text{current}}} \times 100\%$$

3. **Max Safe Mint Capacity:**
   $$\text{MaxMint} = \max\left(0, \frac{\text{Collateral}_{\text{USD}}}{1.5} - \text{Debt}_{\text{USD}}\right)$$

4. **Max Safe Redeemable Collateral:**
   $$\text{MaxRedeem}_{\text{ETH}} = \frac{\text{Collateral}_{\text{USD}} - (\text{Debt}_{\text{USD}} \times 1.5)}{P_{\text{current}}}$$

5. **Pre-Flight Health Simulation:**
   Both `DepositAndMint` and `BurnAndRedeem` forms project post-execution health factor in real-time, blocking inputs that cause `SurpassingLimit` or `HealthFactorBroken`.

---

## 5. Repository Structure

```
.
├── src/
│   ├── VaultEngine.sol          # Core CDP Engine
│   ├── dEngineToken.sol         # Mintable/burnable ERC-20 token
│   └── constants/
│       └── contracts.js         # Root JS contract export
├── script/
│   ├── DeployVEngine.s.sol      # Foundry deployment script
│   └── HelperConfig.s.sol       # Multi-chain network configuration
├── test/
│   └── unit/                    # Fuzz & unit test suites
├── frontend/
│   ├── app/
│   │   ├── layout.tsx           # Global HTML wrapper
│   │   ├── page.tsx             # Main CDP dashboard & vault terminal
│   │   ├── providers.tsx        # RainbowKit & React Query provider tree
│   │   └── wagmi.ts             # Wagmi client configuration (Chains & Transports)
│   ├── constants/
│   │   ├── addresses.ts         # Contract addresses (Sepolia & Local Anvil)
│   │   ├── contracts.ts         # TypeScript ABI & address exports
│   │   ├── abi.json             # VEngine ABI
│   │   └── dEngineAbi.json      # dEngineToken ABI
│   └── package.json
├── foundry.toml                 # Foundry compiler & optimizer configuration
└── README.md
```

---

## 6. Local Development

### Prerequisites
* [Foundry](https://getfoundry.sh/) (`forge`, `cast`, `anvil`)
* [Node.js](https://nodejs.org/) (v18.18+ or v20+)
* [Git](https://git-scm.com/)

### 1. Smart Contracts Setup

```bash
# Clone repository
git clone https://github.com/Saad18819/MiniMakerDAO.git
cd MiniMakerDAO

# Install submodules (forge-std, openzeppelin, chainlink)
git submodule update --init --recursive

# Compile contracts
forge build

# Run unit and fuzz tests
forge test

# Run tests with detailed traces
forge test -vvvv

# Generate test coverage report
forge coverage
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the client.

---

## 7. Environment Variables

### Contracts Deployment (`.env`)
Create a `.env` in the root directory:
```ini
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
```

### Frontend (`frontend/.env.local` or Vercel Environment Variables)
```ini
# WalletConnect Cloud Project ID (https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Dedicated Sepolia RPC (Alchemy / Infura)
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key

# Contract Addresses (Optional: Fallbacks pre-configured in code)
NEXT_PUBLIC_VENGINE_ADDRESS=0xf488c53008623f4f080bc9D7CFCB857141dC0577
NEXT_PUBLIC_DENGINE_ADDRESS=0xf777ea495e843E8f32e4cFF7D6fE0690d4239b8A
```

---

## 8. Deployment & Verified Contracts

### Deploying with Foundry
```bash
forge script script/DeployVEngine.s.sol:DeployVEngine \
  --rpc-url $SEPOLIA_RPC_URL \
  --account <your_keystore_account> \
  --broadcast \
  --verify \
  -vvvv
```

### Deployed Addresses (Sepolia Testnet)
* **`VEngine` (Vault Engine):** [`0xf488c53008623f4f080bc9D7CFCB857141dC0577`](https://sepolia.etherscan.io/address/0xf488c53008623f4f080bc9D7CFCB857141dC0577)
* **`dEngineToken` (`DET`):** [`0xf777ea495e843E8f32e4cFF7D6fE0690d4239b8A`](https://sepolia.etherscan.io/address/0xf777ea495e843E8f32e4cFF7D6fE0690d4239b8A)
* **Chainlink ETH/USD Feed (Sepolia):** [`0x694AA1769357215DE4FAC081bf1f309aDC325306`](https://sepolia.etherscan.io/address/0x694AA1769357215DE4FAC081bf1f309aDC325306)

### Vercel Deployment Configuration
* **Framework Preset:** `Next.js`
* **Root Directory:** `frontend`
* **Build Command:** `next build`
* **Output Directory:** `Next.js default`

---

## 9. Security & Design Considerations

* **Reentrancy Protection:** All withdrawals and liquidations update contract accounting (`debt` and `collateral` mappings) before transferring native ETH via low-level `.call{value: ...}("")`, upholding the Checks-Effects-Interactions (CEI) pattern.
* **Privileged Roles:** `dEngineToken` ownership is exclusively granted to `VEngine`. No EOA or multisig can mint arbitrary unbacked tokens.
* **Oracle Stale Data:** Price feeds are retrieved synchronously within transaction execution. Liquidations cannot occur without current round data.
* **Liquidation Incentives:** Liquidators receive an explicit 10% bonus over the covered debt value in collateral, incentivizing bot execution when collateral valuations drop.

---

## 10. License

This project is licensed under the MIT License.
