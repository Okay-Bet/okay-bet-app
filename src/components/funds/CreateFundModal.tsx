import React, { useState, useContext } from 'react';
import { WalletContext } from '@/app/context/WalletContext';
import { FundFactoryService } from '@/services/funds/fundFactory.service';
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
  defaultAgentWallet?: string;
}

export const CreateFundModal: React.FC<CreateFundModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  groupId,
  groupName,
  defaultAgentWallet
}) => {
  // Try to use wallet context if available
  const walletContext = useContext(WalletContext);
  const walletClient = walletContext?.walletClient || null;
  const address = walletContext?.address;
  const chainId = walletContext?.chainId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fundName: groupName || '',
    agentWallet: defaultAgentWallet || '',
    targetRaise: '10000', // Default 10,000 USDC
    tradingDays: '7',
    entryFee: '1', // 1%
    carriedInterest: '20', // 20%
    minInvestment: '100', // 100 USDC
    depositDays: '7'
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

    // Check if on correct chain
    if (chainId !== 80002) {
      setError('Please switch to Polygon Amoy testnet');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create Investment Fund</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              ✕
            </button>
          </div>

          {!walletContext && (
            <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              <p className="font-semibold">Wallet Connection Required</p>
              <p className="text-sm mt-1">Please connect your wallet to create an investment fund. This feature requires wallet integration to be enabled.</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fund Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fund Name
              </label>
              <input
                type="text"
                value={formData.fundName}
                onChange={(e) => setFormData({ ...formData, fundName: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.fundName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="My Investment Fund"
                disabled={loading}
              />
              {validationErrors.fundName && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.fundName}</p>
              )}
            </div>

            {/* Agent Wallet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Wallet Address
              </label>
              <input
                type="text"
                value={formData.agentWallet}
                onChange={(e) => setFormData({ ...formData, agentWallet: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Raise (USDC)
                </label>
                <input
                  type="number"
                  value={formData.targetRaise}
                  onChange={(e) => setFormData({ ...formData, targetRaise: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Investment (USDC)
                </label>
                <input
                  type="number"
                  value={formData.minInvestment}
                  onChange={(e) => setFormData({ ...formData, minInvestment: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deposit Period (days)
                </label>
                <input
                  type="number"
                  value={formData.depositDays}
                  onChange={(e) => setFormData({ ...formData, depositDays: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trading Duration (days)
                </label>
                <input
                  type="number"
                  value={formData.tradingDays}
                  onChange={(e) => setFormData({ ...formData, tradingDays: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Fee (%)
                </label>
                <input
                  type="number"
                  value={formData.entryFee}
                  onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carried Interest (%)
                </label>
                <input
                  type="number"
                  value={formData.carriedInterest}
                  onChange={(e) => setFormData({ ...formData, carriedInterest: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
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

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-medium text-gray-900 mb-2">Fund Summary</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Investors can deposit for {formData.depositDays} days</li>
                <li>• Agent will trade funds for {formData.tradingDays} days</li>
                <li>• {formData.entryFee}% entry fee on deposits</li>
                <li>• {formData.carriedInterest}% performance fee on profits</li>
                <li>• Minimum investment: ${formData.minInvestment} USDC</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={loading || !walletContext || chainId !== 80002}
              >
                {loading ? 'Creating...' : !walletContext ? 'Wallet Not Connected' : chainId !== 80002 ? 'Switch to Amoy' : 'Create Fund'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};