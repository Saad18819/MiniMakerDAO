# MiniMakerDAO 🪙

An over-collateralized stablecoin engine built on Ethereum, inspired by MakerDAO's multi-collateral vault system. MiniMakerDAO allows users to deposit collateral (such as Wrapped ETH) to mint `dEngineToken`, an algorithmically pegged stablecoin, backed by live Chainlink oracle price feeds.

---

## 📌 Features

* **Over-Collateralized Minting:** Users can mint `dEngine` stablecoins against deposited collateral while maintaining a safe health factor.
* **Chainlink Price Feed Integration:** Real-time, reliable market pricing for collateral assets powered by Chainlink Oracles.
* **Automated Health Factor Mechanics:** Built-in risk engine to prevent under-collateralization and enable system solvency.
* **Liquidations:** Open liquidation mechanism enabling liquidators to pay off bad debt and receive discounted collateral.
* **Foundry Development Suite:** Fully unit-tested, integration-tested, and optimized using Foundry (`forge`).

---

## 🏗️ Architecture & Core Contracts

src/
├── dEngineToken.sol    # ERC-20 Stablecoin contract (Mintable/Burnable by VEngine)
└── VEngine.sol         # Vault Engine controlling collateral, minting, and liquidations

* **`dEngineToken.sol`**: An ERC-20 token contract with administrative ownership assigned exclusively to `VEngine.sol`, ensuring tokens can only be minted or burned through audited vault logic.
* **`VEngine.sol`**: The core protocol engine managing deposits, withdrawals, collateral valuation via Chainlink, borrowing health factors, and debt settlement.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Git](https://git-scm.com/) and [Foundry](https://getfoundry.sh/) installed on your machine.

forge --version

### Installation

1. **Clone the Repository**
   git clone https://github.com/Saad18819/MiniMakerDAO.git
   cd MiniMakerDAO

2. **Install Dependencies**
   git submodule update --init --recursive

3. **Compile Contracts**
   forge build

---

## 🧪 Testing

Run the full test suite using Foundry:

# Run all tests
forge test

# Run tests with detailed stack traces
forge test -vvvv

# Check test coverage
forge coverage

---

## 💅 Code Formatting & Linting

To ensure the repository passes continuous integration checks, format all Solidity code using `forge fmt`:

# Check formatting
forge fmt --check

# Auto-format all Solidity files
forge fmt

---

## 📜 Deployment

1. Set up your `.env` file with your RPC URL and Private Key:
   SEPOLIA_RPC_URL=<YOUR_SEPOLIA_RPC_URL>
   PRIVATE_KEY=<YOUR_PRIVATE_KEY>
   ETHERSCAN_API_KEY=<YOUR_ETHERSCAN_API_KEY>

2. Run the deployment script:
   forge script script/DeployVEngine.s.sol:DeployVEngine --rpc-url $SEPOLIA_RPC_URL --broadcast --verify

---

## 🛡️ License

This project is licensed under the MIT License.
