'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Logo from '@/components/Logo/Logo';
import { InvestmentFlow } from '@/components/funds/InvestmentFlow';
import { FundFactoryService } from '@/services/funds/fundFactory.service';
import { InvestmentFundService } from '@/services/funds/investmentFund.service';
import { INVESTMENT_FUND_ABI } from '@/constants/investmentFundABI';
import { 
  Fund, 
  FundPhase, 
  FundMetrics,
  UserPosition,
  getPhaseName, 
  getPhaseColor,
  weiToUsdc,
  basisPointsToPercentage 
} from '@/services/funds/types';
import { WalletContext } from '@/app/context/WalletContext';
import type { Address } from 'viem';

export default function FundDetailPage() {
  const router = useRouter();
  const params = useParams();
  const fundAddress = params.address as string;
  
  // Try to use wallet context if available
  const walletContext = useContext(WalletContext);
  const address = walletContext?.address;
  const chainId = walletContext?.chainId;
  
  const [fund, setFund] = useState<Fund | null>(null);
  const [metrics, setMetrics] = useState<FundMetrics | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvestFlow, setShowInvestFlow] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'investors'>('overview');

  // Load fund details
  const loadFundDetails = async () => {
    if (!fundAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fundService = new InvestmentFundService();
      
      // First, try to read directly from the fund contract
      
      // Get basic fund data directly from the contract
      const [
        name,
        targetRaise,
        minInvestment,
        entryFee,
        carriedInterest,
        fundManager,
        agentWallet,
        depositDeadline,
        usdc
      ] = await Promise.all([
        fundService.publicClient.readContract({
          address: fundAddress as Address,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'name'
        }),
        fundService.publicClient.readContract({
          address: fundAddress as Address,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'targetRaise'
        }),
        fundService.publicClient.readContract({
          address: fundAddress as Address,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'minInvestment'
        }),
        fundService.publicClient.readContract({
          address: fundAddress as Address,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'entryFee'
        }),
        fundService.publicClient.readContract({
          address: fundAddress as Address,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'carriedInterest'
        }),
        fundService.publicClient.readContract({
          address: fundAddress as Address,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'fundManager'
        }),
        fundService.publicClient.readContract({
          address: fundAddress as Address,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'agentWallet'
        }),
        fundService.publicClient.readContract({
          address: fundAddress as Address,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'depositDeadline'
        }),
        fundService.publicClient.readContract({
          address: fundAddress as Address,
          abi: INVESTMENT_FUND_ABI,
          functionName: 'usdc'
        })
      ]);
      
      // Get metrics
      const fundMetrics = await fundService.getFundMetrics(fundAddress as `0x${string}`);
      
      // Get user position if wallet connected
      let position: UserPosition | null = null;
      if (address) {
        try {
          position = await fundService.getUserPosition(fundAddress as `0x${string}`, address);
        } catch (err) {
          console.log('Could not get user position:', err);
        }
      }
      
      const fundDetails: Fund = {
        address: fundAddress,
        name: name as string,
        manager: fundManager as string,
        agent: agentWallet as string,
        targetRaise: targetRaise as bigint,
        minInvestment: minInvestment as bigint,
        entryFee: Number(entryFee),
        carriedInterest: Number(carriedInterest),
        depositDeadline: new Date(Number(depositDeadline) * 1000),
        currentPhase: fundMetrics.currentPhase,
        totalDeposits: fundMetrics.totalDeposits,
        tradingDuration: 2 * 24 * 60 * 60
      };
      
      setFund(fundDetails);
      setMetrics(fundMetrics);
      setUserPosition(position);
    } catch (err: any) {
      console.error('Error loading fund details:', err);
      setError(`Failed to load fund details: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFundDetails();
    // Refresh every 30 seconds
    const interval = setInterval(loadFundDetails, 30000);
    return () => clearInterval(interval);
  }, [fundAddress, address]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Logo />
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Loading fund details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !fund || !metrics) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Logo />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error || 'Fund not found'}
          </div>
          <button
            onClick={() => router.push('/funds')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Funds
          </button>
        </div>
      </div>
    );
  }

  const canInvest = metrics.currentPhase === FundPhase.DEPOSIT;
  const canRedeem = metrics.currentPhase === FundPhase.REDEMPTION;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo />
              <button
                onClick={() => router.push('/funds')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Funds
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fund Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{fund.name}</h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span>Manager: {formatAddress(fund.manager)}</span>
                <span>•</span>
                <span>Agent: {formatAddress(fund.agent)}</span>
                <span>•</span>
                <a
                  href={`https://amoy.polygonscan.com/address/${fundAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View on Explorer →
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${getPhaseColor(metrics.currentPhase)}`}>
                {getPhaseName(metrics.currentPhase)}
              </div>
              {canInvest && (
                <button
                  onClick={() => setShowInvestFlow(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Invest
                </button>
              )}
              {canRedeem && userPosition && userPosition.shares > 0n && (
                <button
                  onClick={() => setShowInvestFlow(true)}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Redeem
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-3 font-medium ${
                      activeTab === 'overview' 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('performance')}
                    className={`px-6 py-3 font-medium ${
                      activeTab === 'performance' 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Performance
                  </button>
                  <button
                    onClick={() => setActiveTab('investors')}
                    className={`px-6 py-3 font-medium ${
                      activeTab === 'investors' 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Investors
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Fund Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Target Raise:</span>
                          <p className="font-medium">${weiToUsdc(fund.targetRaise).toLocaleString()} USDC</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Minimum Investment:</span>
                          <p className="font-medium">${weiToUsdc(fund.minInvestment)} USDC</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Entry Fee:</span>
                          <p className="font-medium">{basisPointsToPercentage(fund.entryFee)}%</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Carried Interest:</span>
                          <p className="font-medium">{basisPointsToPercentage(fund.carriedInterest)}%</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Timeline</h3>
                      <div className="space-y-2 text-sm">
                        {metrics.currentPhase === FundPhase.DEPOSIT && (
                          <div>
                            <span className="text-gray-600">Deposit Deadline:</span>
                            <p className="font-medium">{formatDate(metrics.depositDeadline)}</p>
                          </div>
                        )}
                        {metrics.tradingEndTime && (
                          <div>
                            <span className="text-gray-600">Trading Ends:</span>
                            <p className="font-medium">{formatDate(metrics.tradingEndTime)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'performance' && (
                  <div className="space-y-4">
                    <div className="text-center py-8 text-gray-500">
                      Performance metrics will be available once trading begins
                    </div>
                  </div>
                )}

                {activeTab === 'investors' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Investor Statistics</h3>
                      <div className="text-sm text-gray-600">
                        <p>Total Share Supply: {weiToUsdc(metrics.totalSupply).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Actions */}
          <div className="space-y-6">
            {/* Progress Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Fund Progress</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Raised</span>
                    <span className="font-medium">
                      ${weiToUsdc(metrics.totalDeposits).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(metrics.progressPercentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {metrics.progressPercentage.toFixed(1)}% of ${weiToUsdc(fund.targetRaise).toLocaleString()} target
                  </div>
                </div>
              </div>
            </div>

            {/* User Position Card */}
            {userPosition && userPosition.shares > 0n && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Position</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shares:</span>
                    <span className="font-medium">{weiToUsdc(userPosition.shares).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invested:</span>
                    <span className="font-medium">${weiToUsdc(userPosition.depositAmount).toLocaleString()}</span>
                  </div>
                  {userPosition.currentValue && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Value:</span>
                      <span className="font-medium">${weiToUsdc(userPosition.currentValue).toLocaleString()}</span>
                    </div>
                  )}
                  {userPosition.profit && userPosition.profit > 0n && (
                    <div className="flex justify-between text-green-600">
                      <span>Profit:</span>
                      <span className="font-medium">+${weiToUsdc(userPosition.profit).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                {canInvest ? 'Ready to Invest?' : canRedeem ? 'Ready to Redeem?' : 'Fund in Progress'}
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                {canInvest 
                  ? 'Join this fund before the deposit deadline'
                  : canRedeem 
                  ? 'Redeem your shares for returns'
                  : 'This fund is currently in the trading phase'}
              </p>
              {(canInvest || canRedeem) && (
                <button
                  onClick={() => setShowInvestFlow(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {canInvest ? 'Invest Now' : 'Redeem Shares'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Flow Modal */}
      {showInvestFlow && fund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <InvestmentFlow
            fundAddress={fund.address}
            fundName={fund.name}
            minInvestment={fund.minInvestment}
            entryFee={fund.entryFee}
            onSuccess={(txHash) => {
              console.log('Transaction successful:', txHash);
              setShowInvestFlow(false);
              loadFundDetails(); // Refresh
            }}
            onCancel={() => setShowInvestFlow(false)}
          />
        </div>
      )}
    </div>
  );
}