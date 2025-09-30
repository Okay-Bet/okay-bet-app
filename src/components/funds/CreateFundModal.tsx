import React, { useState, useContext, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { WalletContext } from '@/app/context/WalletContext';
import { FundFactoryService } from '@/services/funds/fundFactory.service';
import { groupFundIntegrationService } from '@/services/funds/groupFundIntegration.service';
import { SPMCGroup } from '@/services/spmc/types';
import { 
  CreateFundParams,
  usdcToWei,
  percentageToBasisPoints,
  MIN_INVESTMENT_USDC,
  MIN_TARGET_RAISE_USDC,
  MAX_ENTRY_FEE_BP,
  MAX_CARRIED_INTEREST_BP,
  basisPointsToPercentage
} from '@/services/funds/types';

interface CreateFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (fundAddress: string) => void;
  groupId?: string;
  groupName?: string;
  group?: SPMCGroup;
  defaultAgentWallet?: string;
}

export const CreateFundModal: React.FC<CreateFundModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  groupId,
  groupName,
  group,
  defaultAgentWallet
}) => {
  // Try to use wallet context if available
  const walletContext = useContext(WalletContext);
  const { login } = usePrivy();
  const walletClient = walletContext?.walletClient || null;
  const chainId = walletContext?.chainId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedParams, setSuggestedParams] = useState<{
    targetRaise: number;
    tradingDays: number;
    totalLiquidity: number;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    fundName: group?.title || groupName || '',
    agentWallet: defaultAgentWallet || '',
    targetRaise: '10000', // Default 10,000 USDC
    tradingDays: '7',
    entryFee: '1', // 1%
    carriedInterest: '20', // 20%
    minInvestment: '100', // 100 USDC
    depositDays: '7'
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Calculate suggested parameters when group changes
  useEffect(() => {
    if (group && isOpen) {
      groupFundIntegrationService.calculateSuggestedParameters(group).then(params => {
        setSuggestedParams({
          targetRaise: params.suggestedTargetRaise,
          tradingDays: params.suggestedTradingDays,
          totalLiquidity: params.totalMarketLiquidity,
        });
        
        // Update form with suggestions if user hasn't modified them
        setFormData(prev => ({
          ...prev,
          targetRaise: params.suggestedTargetRaise.toString(),
          tradingDays: params.suggestedTradingDays.toString(),
        }));
      });
    }
  }, [group, isOpen]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Fund Name
    if (!formData.fundName.trim()) {
      errors.fundName = 'Fund name is required';
    }

    // Agent Wallet
    if (!formData.agentWallet || !/^0x[a-fA-F0-9]{40}$/.test(formData.agentWallet)) {
      errors.agentWallet = 'Valid wallet address is required';
    }

    // Target Raise
    const targetRaise = parseFloat(formData.targetRaise);
    if (isNaN(targetRaise) || targetRaise < MIN_TARGET_RAISE_USDC) {
      errors.targetRaise = `Minimum target is ${MIN_TARGET_RAISE_USDC} USDC`;
    }

    // Minimum Investment
    const minInvestment = parseFloat(formData.minInvestment);
    if (isNaN(minInvestment) || minInvestment < MIN_INVESTMENT_USDC) {
      errors.minInvestment = `Minimum is ${MIN_INVESTMENT_USDC} USDC`;
    }

    // Trading Duration
    const tradingDays = parseInt(formData.tradingDays);
    if (isNaN(tradingDays) || tradingDays < 1 || tradingDays > 365) {
      errors.tradingDays = 'Must be between 1 and 365 days';
    }

    // Deposit Days
    const depositDays = parseInt(formData.depositDays);
    if (isNaN(depositDays) || depositDays < 1 || depositDays > 30) {
      errors.depositDays = 'Must be between 1 and 30 days';
    }

    // Entry Fee
    const entryFee = parseFloat(formData.entryFee);
    if (isNaN(entryFee) || entryFee < 0 || entryFee > basisPointsToPercentage(MAX_ENTRY_FEE_BP)) {
      errors.entryFee = `Maximum ${basisPointsToPercentage(MAX_ENTRY_FEE_BP)}%`;
    }

    // Carried Interest
    const carriedInterest = parseFloat(formData.carriedInterest);
    if (isNaN(carriedInterest) || carriedInterest < 0 || carriedInterest > basisPointsToPercentage(MAX_CARRIED_INTEREST_BP)) {
      errors.carriedInterest = `Maximum ${basisPointsToPercentage(MAX_CARRIED_INTEREST_BP)}%`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!walletClient) {
      setError('Please connect your wallet');
      return;
    }

    // Check if on correct chain (Polygon Amoy)
    if (chainId !== 80002) {
      // Don't set error since we already show a warning
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const factoryService = new FundFactoryService();
      
      // Check if agent is whitelisted
      const isWhitelisted = await factoryService.isAgentWhitelisted(formData.agentWallet as `0x${string}`);
      if (!isWhitelisted) {
        setError('Agent wallet is not whitelisted. Please contact admin.');
        return;
      }

      // Prepare parameters
      const params: CreateFundParams = {
        fundName: formData.fundName,
        agentWallet: formData.agentWallet,
        targetRaise: usdcToWei(parseFloat(formData.targetRaise)),
        tradingDuration: parseInt(formData.tradingDays) * 86400, // Convert days to seconds
        entryFee: percentageToBasisPoints(parseFloat(formData.entryFee)),
        carriedInterest: percentageToBasisPoints(parseFloat(formData.carriedInterest)),
        minInvestment: usdcToWei(parseFloat(formData.minInvestment)),
        depositDeadline: Math.floor(Date.now() / 1000) + (parseInt(formData.depositDays) * 86400)
      };

      // Create fund
      const { hash, fundAddress } = await factoryService.createFund(params, walletClient);
      
      console.log('Fund created successfully!', { hash, fundAddress });
      
      // Link fund to group if group is provided
      if (fundAddress && groupId) {
        try {
          await groupFundIntegrationService.linkFundToGroup(
            groupId,
            fundAddress,
            {
              txHash: hash,
              factoryAddress: process.env.NEXT_PUBLIC_FUND_FACTORY_ADDRESS || '0x5eA0B0b61A99c1AbAB3235fd1c358dEaFe426900',
              chainId: 80002, // Polygon Amoy
              params: params,
            }
          );
          console.log('Fund linked to group successfully');
        } catch (linkError) {
          console.error('Error linking fund to group:', linkError);
          // Don't fail the whole operation if linking fails
        }
      }
      
      if (fundAddress && onSuccess) {
        onSuccess(fundAddress);
      }
      
      onClose();
    } catch (err: any) {
      console.error('Error creating fund:', err);
      setError(err.message || 'Failed to create fund');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900">Create Investment Fund</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 hover:bg-gray-100 rounded-full"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!walletContext && (
            <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              <p className="font-semibold">Wallet Connection Required</p>
              <p className="text-sm mt-1">Please connect your wallet to create an investment fund.</p>
              <button
                onClick={() => login()}
                className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          )}

          {walletContext && chainId !== 80002 && (
            <div className="mb-4 p-4 bg-orange-100 border border-orange-400 text-orange-700 rounded">
              <p className="font-semibold">Wrong Network</p>
              <p className="text-sm mt-1">
                Please switch your wallet to Polygon Amoy testnet (Chain ID: 80002) to deploy funds.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fund Name */}
            <div className="group relative">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Fund Name
                {group && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Set from group
                  </span>
                )}
                <div className="inline-block">
                  <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                    {group ? 'Fund name is automatically set from the group title and cannot be changed.' : 'Choose a descriptive name for your fund that investors will recognize. This will be displayed publicly.'}
                  </div>
                </div>
              </label>
              <input
                type="text"
                value={formData.fundName}
                onChange={(e) => !group && setFormData({ ...formData, fundName: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md text-black focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.fundName ? 'border-red-500' : 'border-gray-300'
                } ${group ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="My Investment Fund"
                disabled={loading || !!group}
                readOnly={!!group}
              />
              {validationErrors.fundName && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.fundName}</p>
              )}
            </div>

            {/* Agent Wallet */}
            <div className="group relative">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Agent Wallet Address
                <div className="inline-block">
                  <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                    The wallet address that will execute trades on behalf of the fund. This address must be whitelisted in the system.
                  </div>
                </div>
              </label>
              <input
                type="text"
                value={formData.agentWallet}
                onChange={(e) => setFormData({ ...formData, agentWallet: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md text-black focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.agentWallet ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0x..."
                disabled={loading}
              />
              {validationErrors.agentWallet && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.agentWallet}</p>
              )}
            </div>

            {/* Two columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Target Raise */}
              <div className="group relative">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Target Raise (USDC)
                  <div className="inline-block">
                    <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      Total amount of USDC to raise from investors. Minimum: $1,000 USDC.
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.targetRaise}
                  onChange={(e) => setFormData({ ...formData, targetRaise: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md text-black focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.targetRaise ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min={MIN_TARGET_RAISE_USDC}
                  step="100"
                  disabled={loading}
                />
                {validationErrors.targetRaise && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.targetRaise}</p>
                )}
              </div>

              {/* Minimum Investment */}
              <div className="group relative">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Minimum Investment (USDC)
                  <div className="inline-block">
                    <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      Minimum amount each investor must contribute. Lower amounts attract more investors. Minimum: $5 USDC.
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.minInvestment}
                  onChange={(e) => setFormData({ ...formData, minInvestment: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md text-black focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.minInvestment ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min={MIN_INVESTMENT_USDC}
                  step="5"
                  disabled={loading}
                />
                {validationErrors.minInvestment && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.minInvestment}</p>
                )}
              </div>
            </div>

            {/* Duration fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Deposit Period */}
              <div className="group relative">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Deposit Period (days)
                  <div className="inline-block">
                    <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      How long investors have to deposit funds before trading begins. Range: 1-30 days.
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.depositDays}
                  onChange={(e) => setFormData({ ...formData, depositDays: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md text-black focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.depositDays ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="1"
                  max="30"
                  disabled={loading}
                />
                {validationErrors.depositDays && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.depositDays}</p>
                )}
              </div>

              {/* Trading Duration */}
              <div className="group relative">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Trading Duration (days)
                  <div className="inline-block">
                    <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      How long the agent has to trade before returning funds. Should align with market resolution dates. Range: 1-365 days.
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.tradingDays}
                  onChange={(e) => setFormData({ ...formData, tradingDays: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md text-black focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.tradingDays ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="1"
                  max="365"
                  disabled={loading}
                />
                {validationErrors.tradingDays && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.tradingDays}</p>
                )}
              </div>
            </div>

            {/* Fee fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Entry Fee */}
              <div className="group relative">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Entry Fee (%)
                  <div className="inline-block">
                    <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      One-time fee charged on deposits. Lower fees attract more investors. Maximum: 5%.
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.entryFee}
                  onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md text-black focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.entryFee ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="0"
                  max={basisPointsToPercentage(MAX_ENTRY_FEE_BP)}
                  step="0.1"
                  disabled={loading}
                />
                {validationErrors.entryFee && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.entryFee}</p>
                )}
              </div>

              {/* Carried Interest */}
              <div className="group relative">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  Carried Interest (%)
                  <div className="inline-block">
                    <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      Performance fee taken from profits only. Industry standard is 20%. Maximum: 50%.
                    </div>
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.carriedInterest}
                  onChange={(e) => setFormData({ ...formData, carriedInterest: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md text-black focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.carriedInterest ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="0"
                  max={basisPointsToPercentage(MAX_CARRIED_INTEREST_BP)}
                  step="1"
                  disabled={loading}
                />
                {validationErrors.carriedInterest && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.carriedInterest}</p>
                )}
              </div>
            </div>

            {/* Group Markets Display */}
            {group && group.markets && group.markets.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-4 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Markets in Portfolio ({group.market_count})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {group.markets.map((market, idx) => {
                    const totalWeight = group.markets.reduce((sum, m) => sum + (m.weight || 1), 0);
                    const allocation = ((market.weight || 1) / totalWeight * parseFloat(formData.targetRaise)).toFixed(0);
                    const percentage = ((market.weight || 1) / totalWeight * 100).toFixed(1);
                    
                    return (
                      <div key={idx} className="text-sm flex justify-between items-center">
                        <div className="flex-1">
                          <span className="text-gray-700">{market.market_title || market.market_id}</span>
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                            market.market_platform === 'polymarket' ? 'bg-purple-100 text-purple-700' :
                            market.market_platform === 'kalshi' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {market.market_platform}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-600">${allocation} ({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {suggestedParams && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <p className="text-xs text-blue-700">
                      Total Market Liquidity: ${(suggestedParams.totalLiquidity / 1000).toFixed(0)}K
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Fund Summary
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Investors can deposit for {formData.depositDays} days</li>
                <li>• Agent will trade funds for {formData.tradingDays} days</li>
                <li>• {formData.entryFee}% entry fee on deposits</li>
                <li>• {formData.carriedInterest}% performance fee on profits</li>
                <li>• Minimum investment: ${formData.minInvestment} USDC</li>
                {group && <li>• Portfolio: {group.market_count} markets across platforms</li>}
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                disabled={loading || !walletContext}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Creating Fund...
                  </span>
                ) : !walletContext ? 'Wallet Not Connected' : 'Create Fund'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};