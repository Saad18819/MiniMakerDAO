'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
} from 'wagmi';
import { parseEther, formatEther, erc20Abi } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import engineAbi from '../constants/abi.json';
import { ENGINE_ADDRESS, DEngine_ADDRESS } from '../constants/addresses';

const ZERO_BI = BigInt(0);
const WEI_UNIT = BigInt(10) ** BigInt(18);

const emptySubscribe = () => () => {};

export default function Dashboard() {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const { address, isConnected } = useAccount();

  // Active form tab: 'deposit-mint' | 'burn-redeem'
  const [activeTab, setActiveTab] = useState<'deposit-mint' | 'burn-redeem'>('deposit-mint');

  // Deposit & Mint Form State
  const [depositEthInput, setDepositEthInput] = useState('');
  const [mintDetInput, setMintDetInput] = useState('');

  // Burn & Redeem Form State
  const [burnDetInput, setBurnDetInput] = useState('');
  const [redeemEthInput, setRedeemEthInput] = useState('');

  // Client Form Error/Info Status
  const [formFeedback, setFormFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    hash?: string;
  } | null>(null);

  // 1. Read Native ETH Balance
  const { data: ethBalanceData, refetch: refetchEthBalance } = useBalance({
    address,
  });

  // 2. Read Collateral (ETH in Wei deposited in Vault)
  const {
    data: rawCollateral,
    refetch: refetchCollateral,
  } = useReadContract({
    address: ENGINE_ADDRESS,
    abi: engineAbi,
    functionName: 'collateral',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 5000,
    },
  });

  // 3. Read Debt (DET in Wei minted against Vault)
  const {
    data: rawDebt,
    refetch: refetchDebt,
  } = useReadContract({
    address: ENGINE_ADDRESS,
    abi: engineAbi,
    functionName: 'debt',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 5000,
    },
  });

  // 4. Read Contract Health Factor (bool from contract)
  const {
    data: rawHealthFactor,
    refetch: refetchHealthFactor,
  } = useReadContract({
    address: ENGINE_ADDRESS,
    abi: engineAbi,
    functionName: 'healthFactor',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 5000,
    },
  });

  // 5. Read dEngine Token Balance in User's Wallet (ERC20)
  const {
    data: rawTokenBalance,
    refetch: refetchTokenBalance,
  } = useReadContract({
    address: DEngine_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 5000,
    },
  });

  // 6. Read Oracle ETH Price in USD (18 decimals: e.g. 2500 * 1e18 = $2,500)
  const { data: rawEthPrice, refetch: refetchEthPrice } = useReadContract({
    address: ENGINE_ADDRESS,
    abi: engineAbi,
    functionName: 'ETHToUSD',
    query: {
      refetchInterval: 10000,
    },
  });

  // Typed parsed BigInts with zero fallbacks
  const collateralWei = useMemo(() => (rawCollateral ? BigInt(rawCollateral.toString()) : ZERO_BI), [rawCollateral]);
  const debtWei = useMemo(() => (rawDebt ? BigInt(rawDebt.toString()) : ZERO_BI), [rawDebt]);
  const tokenBalanceWei = useMemo(() => (rawTokenBalance ? BigInt(rawTokenBalance.toString()) : ZERO_BI), [rawTokenBalance]);
  const ethPriceWei = useMemo(() => (rawEthPrice ? BigInt(rawEthPrice.toString()) : ZERO_BI), [rawEthPrice]);
  const ethPriceUSD = useMemo(() => (ethPriceWei > ZERO_BI ? Number(formatEther(ethPriceWei)) : 0), [ethPriceWei]);

  // Compute Collateral in USD
  const collateralUSD = useMemo(() => {
    if (collateralWei === ZERO_BI || ethPriceWei === ZERO_BI) return 0;
    const val = (collateralWei * ethPriceWei) / WEI_UNIT;
    return Number(formatEther(val));
  }, [collateralWei, ethPriceWei]);

  // Compute Debt in USD (1 DET = $1 USD)
  const debtUSD = useMemo(() => {
    if (debtWei === ZERO_BI) return 0;
    return Number(formatEther(debtWei));
  }, [debtWei]);

  /**
   * getHealthFactor helper:
   * Returns:
   * - isHealthy: boolean (directly from contract or computed)
   * - ratio: number | null (e.g. 2.15x)
   * - label: string ('Safe' | 'Healthy' | 'At Risk' | 'Undercollateralized')
   * - colorClass: string for styling
   */
  const getHealthFactor = useCallback(() => {
    if (!address) {
      return { isHealthy: true, ratio: null, label: 'Not Connected', colorClass: 'text-zinc-500' };
    }
    if (debtWei === ZERO_BI) {
      return { isHealthy: true, ratio: Infinity, label: 'Optimal (No Debt)', colorClass: 'text-emerald-400' };
    }

    // Health condition: collateralInUSD >= 1.5 * debt
    // Health factor ratio = (collateralUSD) / (1.5 * debtUSD)
    // If ratio >= 1.0, vault is healthy (collateral >= 150% debt)
    if (debtUSD > 0) {
      const minRequiredCollateral = debtUSD * 1.5;
      const ratio = collateralUSD / minRequiredCollateral;

      let label = 'Healthy';
      let colorClass = 'text-emerald-400';

      if (ratio < 1.0) {
        label = 'Undercollateralized (Liquidatable)';
        colorClass = 'text-rose-400';
      } else if (ratio < 1.25) {
        label = 'High Risk';
        colorClass = 'text-amber-400';
      } else if (ratio < 1.5) {
        label = 'Moderate Risk';
        colorClass = 'text-yellow-400';
      }

      return {
        isHealthy: rawHealthFactor !== undefined ? Boolean(rawHealthFactor) : ratio >= 1.0,
        ratio,
        label,
        colorClass,
      };
    }

    return {
      isHealthy: Boolean(rawHealthFactor),
      ratio: null,
      label: rawHealthFactor ? 'Healthy' : 'Liquidatable',
      colorClass: rawHealthFactor ? 'text-emerald-400' : 'text-rose-400',
    };
  }, [address, debtWei, debtUSD, collateralUSD, rawHealthFactor]);

  const healthFactorInfo = useMemo(() => getHealthFactor(), [getHealthFactor]);

  // Liquidation Price calculation: ETH price at which collateral drops below 150% of debt
  const liquidationEthPrice = useMemo(() => {
    if (collateralWei === ZERO_BI || debtWei === ZERO_BI) return null;
    const colEth = Number(formatEther(collateralWei));
    const debtAmount = Number(formatEther(debtWei));
    // At liquidation: colEth * price = debtAmount * 1.5 => price = (debtAmount * 1.5) / colEth
    return (debtAmount * 1.5) / colEth;
  }, [collateralWei, debtWei]);

  // Max Safe Mint calculation based on current collateral and ETH price:
  // Max debt = (collateralUSD / 1.5) - currentDebt
  const maxSafeMintableDET = useMemo(() => {
    if (ethPriceUSD === 0) return 0;
    const maxDebtAllowed = collateralUSD / 1.5;
    const available = maxDebtAllowed - debtUSD;
    return available > 0 ? available : 0;
  }, [collateralUSD, debtUSD, ethPriceUSD]);

  // Max Safe Redeem calculation based on current debt and collateral:
  // Min collateral needed = debtUSD * 1.5
  // Max redeemable USD = collateralUSD - minCollateralNeeded
  const maxSafeRedeemableETH = useMemo(() => {
    if (ethPriceUSD === 0 || collateralWei === ZERO_BI) return 0;
    if (debtUSD === 0) return Number(formatEther(collateralWei));
    const minRequiredUSD = debtUSD * 1.5;
    const surplusUSD = collateralUSD - minRequiredUSD;
    if (surplusUSD <= 0) return 0;
    return surplusUSD / ethPriceUSD;
  }, [collateralUSD, debtUSD, ethPriceUSD, collateralWei]);

  // ---------------- Write Contracts (Wagmi v2) ----------------
  const {
    writeContract: writeDepositAndMint,
    data: depositHash,
    isPending: isDepositPending,
    error: depositError,
    reset: resetDeposit,
  } = useWriteContract();

  const {
    isLoading: isDepositConfirming,
    isSuccess: isDepositSuccess,
  } = useWaitForTransactionReceipt({ hash: depositHash });

  const {
    writeContract: writeDebtAndWithdraw,
    data: withdrawHash,
    isPending: isWithdrawPending,
    error: withdrawError,
    reset: resetWithdraw,
  } = useWriteContract();

  const {
    isLoading: isWithdrawConfirming,
    isSuccess: isWithdrawSuccess,
  } = useWaitForTransactionReceipt({ hash: withdrawHash });

  // Refetch all metrics upon successful transactions
  const refetchAll = useCallback(() => {
    refetchCollateral();
    refetchDebt();
    refetchHealthFactor();
    refetchTokenBalance();
    refetchEthBalance();
    refetchEthPrice();
  }, [
    refetchCollateral,
    refetchDebt,
    refetchHealthFactor,
    refetchTokenBalance,
    refetchEthBalance,
    refetchEthPrice,
  ]);

  // Derive active feedback for transactions and user actions
  const activeFeedback = useMemo(() => {
    if (isDepositSuccess) {
      return {
        type: 'success' as const,
        message: 'Deposit & Mint transaction confirmed on chain!',
        hash: depositHash,
      };
    }
    if (depositError) {
      return {
        type: 'error' as const,
        message: depositError.message.includes('SurpassingLimit')
          ? 'Transaction failed: Surpassing collateral limit (Health factor broken).'
          : depositError.message.slice(0, 140),
      };
    }
    if (isWithdrawSuccess) {
      return {
        type: 'success' as const,
        message: 'Burn & Redeem transaction confirmed on chain!',
        hash: withdrawHash,
      };
    }
    if (withdrawError) {
      return {
        type: 'error' as const,
        message: withdrawError.message.includes('HealthFactorBroken')
          ? 'Transaction failed: Health factor would be broken by this withdrawal.'
          : withdrawError.message.slice(0, 140),
      };
    }
    return formFeedback;
  }, [
    isDepositSuccess,
    depositHash,
    depositError,
    isWithdrawSuccess,
    withdrawHash,
    withdrawError,
    formFeedback,
  ]);

  // Refetch balances when a transaction is confirmed
  useEffect(() => {
    if (isDepositSuccess || isWithdrawSuccess) {
      refetchAll();
    }
  }, [isDepositSuccess, isWithdrawSuccess, refetchAll]);

  // Handle Form 1: Deposit & Mint
  const handleDepositAndMint = (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    const ethValue = depositEthInput.trim() || '0';
    const mintValue = mintDetInput.trim() || '0';

    if (parseFloat(ethValue) <= 0 && parseFloat(mintValue) <= 0) {
      setFormFeedback({
        type: 'error',
        message: 'Please specify an ETH collateral deposit amount or tokens to mint.',
      });
      return;
    }

    try {
      const parsedEth = parseEther(ethValue);
      const parsedMint = parseEther(mintValue);

      writeDepositAndMint({
        address: ENGINE_ADDRESS,
        abi: engineAbi,
        functionName: 'DepositAndMint',
        args: [parsedMint],
        value: parsedEth,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid input amounts.';
      setFormFeedback({
        type: 'error',
        message,
      });
    }
  };

  // Handle Form 2: Burn & Redeem
  const handleBurnAndRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    const burnValue = burnDetInput.trim() || '0';
    const redeemValue = redeemEthInput.trim() || '0';

    if (parseFloat(burnValue) <= 0 && parseFloat(redeemValue) <= 0) {
      setFormFeedback({
        type: 'error',
        message: 'Please specify DET tokens to burn or ETH collateral to redeem.',
      });
      return;
    }

    try {
      const parsedBurn = parseEther(burnValue);
      const parsedRedeem = parseEther(redeemValue);

      writeDebtAndWithdraw({
        address: ENGINE_ADDRESS,
        abi: engineAbi,
        functionName: 'DebtAndWithdraw',
        args: [parsedRedeem, parsedBurn],
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid input amounts.';
      setFormFeedback({
        type: 'error',
        message,
      });
    }
  };

  // Projected Health Factor for Form 1 (Deposit & Mint)
  const projectedDepositHealth = useMemo(() => {
    const addEth = parseFloat(depositEthInput) || 0;
    const addDebt = parseFloat(mintDetInput) || 0;
    if (addEth === 0 && addDebt === 0) return null;

    const newCollateralUSD = collateralUSD + addEth * ethPriceUSD;
    const newDebtUSD = debtUSD + addDebt;

    if (newDebtUSD <= 0) return { ratio: Infinity, safe: true };
    const ratio = newCollateralUSD / (newDebtUSD * 1.5);
    return { ratio, safe: ratio >= 1.0 };
  }, [depositEthInput, mintDetInput, collateralUSD, debtUSD, ethPriceUSD]);

  // Projected Health Factor for Form 2 (Burn & Redeem)
  const projectedWithdrawHealth = useMemo(() => {
    const subBurn = parseFloat(burnDetInput) || 0;
    const subEth = parseFloat(redeemEthInput) || 0;
    if (subBurn === 0 && subEth === 0) return null;

    const newCollateralUSD = Math.max(0, collateralUSD - subEth * ethPriceUSD);
    const newDebtUSD = Math.max(0, debtUSD - subBurn);

    if (newDebtUSD <= 0) return { ratio: Infinity, safe: true };
    const ratio = newCollateralUSD / (newDebtUSD * 1.5);
    return { ratio, safe: ratio >= 1.0 };
  }, [burnDetInput, redeemEthInput, collateralUSD, debtUSD, ethPriceUSD]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-500">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-zinc-200 animate-spin" />
          <span>Loading MiniMakerDAO Vaults...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800">
      {/* Top Navigation Bar - Clean, Borderless */}
      <header className="sticky top-0 z-30 w-full bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-inner">
              {/* Custom Clean Logo SVG */}
              <svg
                className="w-5 h-5 text-zinc-100"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-lg text-white">MiniMakerDAO</span>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400">
                  CDP Engine
                </span>
              </div>
              <p className="text-xs text-zinc-500">Collateralized Debt Position Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {ethPriceUSD > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/60 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-400">ETH:</span>
                <span className="font-mono font-medium text-zinc-200">
                  ${ethPriceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* User Alert Banner */}
        {activeFeedback && (
          <div
            className={`p-4 rounded-2xl flex items-start justify-between gap-4 transition-all ${
              activeFeedback.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-200'
                : activeFeedback.type === 'error'
                ? 'bg-rose-950/40 text-rose-200'
                : 'bg-zinc-900/80 text-zinc-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">
                {activeFeedback.type === 'success' ? '✓' : activeFeedback.type === 'error' ? '⚠' : 'ℹ'}
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium">{activeFeedback.message}</p>
                {activeFeedback.hash && (
                  <p className="text-xs font-mono opacity-80 break-all">
                    Tx: {activeFeedback.hash}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setFormFeedback(null);
                resetDeposit();
                resetWithdraw();
              }}
              className="text-xs opacity-60 hover:opacity-100 transition-opacity px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero Metrics Overview Bar - Borderless High-Contrast Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Health Factor (getHealthFactor) */}
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:bg-zinc-900/70 transition-all">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="uppercase tracking-wider font-medium">Health Factor</span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300">
                getHealthFactor
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold tracking-tight font-mono ${healthFactorInfo.colorClass}`}>
                  {healthFactorInfo.ratio === null
                    ? '--'
                    : healthFactorInfo.ratio === Infinity
                    ? '∞'
                    : `${healthFactorInfo.ratio.toFixed(2)}x`}
                </span>
                {healthFactorInfo.ratio !== null && healthFactorInfo.ratio !== Infinity && (
                  <span className="text-xs text-zinc-500 font-mono">
                    / 1.00x min
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    healthFactorInfo.isHealthy ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                />
                <span className={healthFactorInfo.colorClass}>{healthFactorInfo.label}</span>
              </div>
            </div>

            {/* Health Factor Progress Indicator */}
            <div className="w-full bg-zinc-950/80 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  healthFactorInfo.ratio === Infinity || (healthFactorInfo.ratio && healthFactorInfo.ratio >= 1.5)
                    ? 'bg-emerald-400'
                    : healthFactorInfo.ratio && healthFactorInfo.ratio >= 1.0
                    ? 'bg-yellow-400'
                    : 'bg-rose-500'
                }`}
                style={{
                  width: `${
                    healthFactorInfo.ratio === Infinity
                      ? 100
                      : healthFactorInfo.ratio
                      ? Math.min(100, Math.max(5, (healthFactorInfo.ratio / 2.5) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-[11px] text-zinc-500">Liquidation threshold at 150% collateral ratio</p>
          </div>

          {/* Card 2: Minted Token Balance (DET) */}
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:bg-zinc-900/70 transition-all">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="uppercase tracking-wider font-medium">Minted Balance</span>
              <span className="font-mono text-[11px] text-zinc-400">Wallet DET</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                  {address ? Number(formatEther(tokenBalanceWei)).toFixed(2) : '--'}
                </span>
                <span className="text-sm font-semibold text-zinc-400">DET</span>
              </div>
              <p className="text-xs text-zinc-500">
                Vault Debt:{' '}
                <span className="font-mono text-zinc-300">
                  {address ? Number(formatEther(debtWei)).toFixed(2) : '--'} DET
                </span>
              </p>
            </div>

            <div className="pt-1 text-[11px] text-zinc-500 flex justify-between">
              <span>Token Peg: $1.00 USD</span>
              <span className="font-mono text-zinc-400">${debtUSD.toFixed(2)} active</span>
            </div>
          </div>

          {/* Card 3: Deposited Collateral (ETH) */}
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:bg-zinc-900/70 transition-all">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="uppercase tracking-wider font-medium">Collateral Locked</span>
              <span className="font-mono text-[11px] text-zinc-400">ETH Vault</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                  {address ? Number(formatEther(collateralWei)).toFixed(4) : '--'}
                </span>
                <span className="text-sm font-semibold text-zinc-400">ETH</span>
              </div>
              <p className="text-xs text-zinc-500">
                Valuation:{' '}
                <span className="font-mono text-zinc-300">
                  ${collateralUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </p>
            </div>

            <div className="pt-1 text-[11px] text-zinc-500 flex justify-between">
              <span>Wallet ETH:</span>
              <span className="font-mono text-zinc-400">
                {ethBalanceData ? Number(ethBalanceData.formatted).toFixed(4) : '--'} ETH
              </span>
            </div>
          </div>

          {/* Card 4: Vault Risk & Liquidation Price */}
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:bg-zinc-900/70 transition-all">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="uppercase tracking-wider font-medium">Liquidation Price</span>
              <span className="font-mono text-[11px] text-zinc-400">Risk Radar</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-zinc-100 font-mono">
                  {liquidationEthPrice !== null
                    ? `$${liquidationEthPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '--'}
                </span>
                <span className="text-xs text-zinc-500">/ ETH</span>
              </div>
              <p className="text-xs text-zinc-500">
                Current Oracle:{' '}
                <span className="font-mono text-zinc-300">
                  ${ethPriceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </p>
            </div>

            <div className="pt-1 text-[11px] text-zinc-500 flex justify-between">
              <span>Safety Cushion:</span>
              <span className="font-mono text-emerald-400">
                {liquidationEthPrice && ethPriceUSD > 0
                  ? `${Math.max(0, ((ethPriceUSD - liquidationEthPrice) / ethPriceUSD) * 100).toFixed(1)}% drop buffer`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </section>

        {/* Main Content Area: Interactive Forms & Vault Management */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Interactive Forms */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl p-6 sm:p-8 space-y-6">
              {/* Form Tab Selector - Clean borderless pill design */}
              <div className="flex items-center p-1 bg-zinc-950/80 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('deposit-mint')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'deposit-mint'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Deposit ETH & Mint dEngine
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('burn-redeem')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'burn-redeem'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                    </svg>
                    Burn Tokens & Redeem ETH
                  </span>
                </button>
              </div>

              {/* Form 1: Deposit & Mint */}
              {activeTab === 'deposit-mint' && (
                <form onSubmit={handleDepositAndMint} className="space-y-6">
                  <div className="space-y-4">
                    {/* Input: ETH Collateral */}
                    <div className="bg-zinc-950/60 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <label htmlFor="depositEth" className="font-medium">
                          1. Deposit Collateral (ETH)
                        </label>
                        <div className="flex items-center gap-2">
                          <span>Wallet:</span>
                          <span className="font-mono text-zinc-300">
                            {ethBalanceData ? Number(ethBalanceData.formatted).toFixed(4) : '0.00'} ETH
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (ethBalanceData) {
                                const maxVal = Math.max(0, Number(ethBalanceData.formatted) - 0.005);
                                setDepositEthInput(maxVal.toFixed(4));
                              }
                            }}
                            className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          >
                            MAX
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          id="depositEth"
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.0"
                          value={depositEthInput}
                          onChange={(e) => setDepositEthInput(e.target.value)}
                          className="w-full bg-transparent text-2xl font-mono font-medium text-white placeholder:text-zinc-700 focus:outline-none"
                        />
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 text-sm font-semibold text-zinc-200">
                          <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                          ETH
                        </div>
                      </div>

                      {depositEthInput && ethPriceUSD > 0 && (
                        <p className="text-xs font-mono text-zinc-500">
                          ≈ ${(parseFloat(depositEthInput) * ethPriceUSD).toFixed(2)} USD
                        </p>
                      )}
                    </div>

                    {/* Input: dEngine to Mint */}
                    <div className="bg-zinc-950/60 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <label htmlFor="mintDet" className="font-medium">
                          2. Mint dEngine Tokens (DET)
                        </label>
                        <div className="flex items-center gap-2">
                          <span>Safe Capacity:</span>
                          <span className="font-mono text-zinc-300">
                            {maxSafeMintableDET.toFixed(2)} DET
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const addEth = parseFloat(depositEthInput) || 0;
                              const potentialCollateralUSD = collateralUSD + addEth * ethPriceUSD;
                              const maxDebt = potentialCollateralUSD / 1.5;
                              const safeMint = Math.max(0, maxDebt - debtUSD);
                              // 80% safe buffer
                              setMintDetInput((safeMint * 0.8).toFixed(2));
                            }}
                            className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          >
                            SAFE (80%)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const addEth = parseFloat(depositEthInput) || 0;
                              const potentialCollateralUSD = collateralUSD + addEth * ethPriceUSD;
                              const maxDebt = potentialCollateralUSD / 1.5;
                              const maxMint = Math.max(0, maxDebt - debtUSD);
                              setMintDetInput(maxMint.toFixed(2));
                            }}
                            className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          >
                            MAX (150%)
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          id="mintDet"
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.0"
                          value={mintDetInput}
                          onChange={(e) => setMintDetInput(e.target.value)}
                          className="w-full bg-transparent text-2xl font-mono font-medium text-white placeholder:text-zinc-700 focus:outline-none"
                        />
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 text-sm font-semibold text-zinc-200">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          DET
                        </div>
                      </div>

                      {mintDetInput && (
                        <p className="text-xs font-mono text-zinc-500">
                          ≈ ${parseFloat(mintDetInput).toFixed(2)} USD (1 DET = $1.00)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Real-time Projected Health Factor Preview */}
                  {projectedDepositHealth && (
                    <div className="p-4 rounded-2xl bg-zinc-950/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Projected Health Factor:</span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            projectedDepositHealth.safe ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {projectedDepositHealth.ratio === Infinity
                            ? '∞'
                            : `${projectedDepositHealth.ratio.toFixed(2)}x`}
                        </span>
                      </div>
                      {!projectedDepositHealth.safe && (
                        <p className="text-rose-400">
                          Warning: This mint amount exceeds the 150% collateral ratio requirement.
                          The transaction will revert on chain.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  {!isConnected ? (
                    <div className="pt-2">
                      <ConnectButton.Custom>
                        {({ openConnectModal }) => (
                          <button
                            type="button"
                            onClick={openConnectModal}
                            className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition-all shadow-md active:scale-[0.99]"
                          >
                            Connect Wallet to Deposit & Mint
                          </button>
                        )}
                      </ConnectButton.Custom>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={isDepositPending || isDepositConfirming}
                      className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-semibold text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isDepositPending ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                          <span>Confirming in Wallet...</span>
                        </>
                      ) : isDepositConfirming ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                          <span>Mining Deposit & Mint on chain...</span>
                        </>
                      ) : (
                        <span>Execute Deposit & Mint</span>
                      )}
                    </button>
                  )}
                </form>
              )}

              {/* Form 2: Burn & Redeem */}
              {activeTab === 'burn-redeem' && (
                <form onSubmit={handleBurnAndRedeem} className="space-y-6">
                  <div className="space-y-4">
                    {/* Input: dEngine tokens to Burn */}
                    <div className="bg-zinc-950/60 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <label htmlFor="burnDet" className="font-medium">
                          1. Burn dEngine Tokens (DET)
                        </label>
                        <div className="flex items-center gap-2">
                          <span>Wallet:</span>
                          <span className="font-mono text-zinc-300">
                            {Number(formatEther(tokenBalanceWei)).toFixed(2)} DET
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const debtNum = Number(formatEther(debtWei));
                              const balNum = Number(formatEther(tokenBalanceWei));
                              const burnMax = Math.min(debtNum, balNum);
                              setBurnDetInput(burnMax.toFixed(2));
                            }}
                            className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          >
                            MAX DEBT
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          id="burnDet"
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.0"
                          value={burnDetInput}
                          onChange={(e) => setBurnDetInput(e.target.value)}
                          className="w-full bg-transparent text-2xl font-mono font-medium text-white placeholder:text-zinc-700 focus:outline-none"
                        />
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 text-sm font-semibold text-zinc-200">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          DET
                        </div>
                      </div>

                      {burnDetInput && (
                        <p className="text-xs font-mono text-zinc-500">
                          Will repay ${parseFloat(burnDetInput).toFixed(2)} of vault debt
                        </p>
                      )}
                    </div>

                    {/* Input: ETH Collateral to Redeem */}
                    <div className="bg-zinc-950/60 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <label htmlFor="redeemEth" className="font-medium">
                          2. Redeem Collateral (ETH)
                        </label>
                        <div className="flex items-center gap-2">
                          <span>Max Safe Redeem:</span>
                          <span className="font-mono text-zinc-300">
                            {maxSafeRedeemableETH.toFixed(4)} ETH
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const burnVal = parseFloat(burnDetInput) || 0;
                              const resultingDebtUSD = Math.max(0, debtUSD - burnVal);
                              if (resultingDebtUSD === 0) {
                                setRedeemEthInput(Number(formatEther(collateralWei)).toFixed(4));
                              } else {
                                const requiredUSD = resultingDebtUSD * 1.5;
                                const surplusUSD = Math.max(0, collateralUSD - requiredUSD);
                                const safeEth = surplusUSD / ethPriceUSD;
                                setRedeemEthInput((safeEth * 0.95).toFixed(4));
                              }
                            }}
                            className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          >
                            SAFE REDEEM
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          id="redeemEth"
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.0"
                          value={redeemEthInput}
                          onChange={(e) => setRedeemEthInput(e.target.value)}
                          className="w-full bg-transparent text-2xl font-mono font-medium text-white placeholder:text-zinc-700 focus:outline-none"
                        />
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 text-sm font-semibold text-zinc-200">
                          <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                          ETH
                        </div>
                      </div>

                      {redeemEthInput && ethPriceUSD > 0 && (
                        <p className="text-xs font-mono text-zinc-500">
                          ≈ ${(parseFloat(redeemEthInput) * ethPriceUSD).toFixed(2)} USD
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Real-time Projected Health Factor Preview */}
                  {projectedWithdrawHealth && (
                    <div className="p-4 rounded-2xl bg-zinc-950/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Projected Health Factor after Redeem:</span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            projectedWithdrawHealth.safe ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {projectedWithdrawHealth.ratio === Infinity
                            ? '∞'
                            : `${projectedWithdrawHealth.ratio.toFixed(2)}x`}
                        </span>
                      </div>
                      {!projectedWithdrawHealth.safe && (
                        <p className="text-rose-400">
                          Warning: This redemption would drop collateral below the 150% threshold.
                          The transaction will revert on chain with HealthFactorBroken.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Submit Button */}
                  {!isConnected ? (
                    <div className="pt-2">
                      <ConnectButton.Custom>
                        {({ openConnectModal }) => (
                          <button
                            type="button"
                            onClick={openConnectModal}
                            className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition-all shadow-md active:scale-[0.99]"
                          >
                            Connect Wallet to Burn & Redeem
                          </button>
                        )}
                      </ConnectButton.Custom>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={isWithdrawPending || isWithdrawConfirming}
                      className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-semibold text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isWithdrawPending ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                          <span>Confirming in Wallet...</span>
                        </>
                      ) : isWithdrawConfirming ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                          <span>Mining Burn & Redeem on chain...</span>
                        </>
                      ) : (
                        <span>Execute Burn & Redeem</span>
                      )}
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Right Column (4 cols): Protocol Architecture & Vault Parameters */}
          <div className="lg:col-span-4 space-y-6">
            {/* Vault Parameters Box */}
            <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl p-6 space-y-5">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-300">
                Vault Parameters
              </h3>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-zinc-800/40">
                  <span className="text-zinc-400">Min. Collateral Ratio</span>
                  <span className="font-mono font-medium text-zinc-200">150.00%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800/40">
                  <span className="text-zinc-400">Liquidation Threshold</span>
                  <span className="font-mono font-medium text-rose-400">&lt; 1.00x HF</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800/40">
                  <span className="text-zinc-400">Liquidation Bonus</span>
                  <span className="font-mono font-medium text-emerald-400">10.00%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800/40">
                  <span className="text-zinc-400">Oracle Source</span>
                  <span className="font-mono text-zinc-300">Chainlink AggregatorV3</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-zinc-400">dEngine Token</span>
                  <span className="font-mono text-zinc-300">DET (18 Decimals)</span>
                </div>
              </div>
            </div>

            {/* Smart Contract Quick Reference */}
            <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl p-6 space-y-4 text-xs">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-300">
                Contract Addresses
              </h3>

              <div className="space-y-3 font-mono">
                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-500 uppercase">Vault Engine Contract</div>
                  <div className="p-2.5 rounded-xl bg-zinc-950/80 text-zinc-300 break-all select-all">
                    {ENGINE_ADDRESS}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-500 uppercase">dEngine Token Contract</div>
                  <div className="p-2.5 rounded-xl bg-zinc-950/80 text-zinc-300 break-all select-all">
                    {DEngine_ADDRESS}
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-zinc-500 leading-relaxed">
                Tokens are minted on demand when sufficient collateral is deposited. Burning tokens
                relieves vault debt and releases ETH collateral.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
