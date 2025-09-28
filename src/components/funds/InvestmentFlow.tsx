import React, { useState, useEffect, useContext } from 'react';
import { WalletContext } from '@/app/context/WalletContext';
import { InvestmentFundService } from '@/services/funds/investmentFund.service';
import { 
  FundPhase,
  weiToUsdc,
  usdcToWei,
  MIN_INVESTMENT_USDC,
  basisPointsToPercentage
} from '@/services/funds/types';

interface InvestmentFlowProps {
  fundAddress: string;
  fundName: string;
  minInvestment: bigint;
  entryFee: number;
  onSuccess?: (txHash: string) => void;
  onCancel?: () => void;
}

export const InvestmentFlow: React.FC<InvestmentFlowProps> = ({
  fundAddress,
  fundName,
  minInvestment,
  entryFee,
  onSuccess,
  onCancel
}) => {
  // Try to use wallet context if available
  const walletContext = useContext(WalletContext);
  const walletClient = walletContext?.walletClient || null;
  const address = walletContext?.address;
  const chainId = walletContext?.chainId;
  const [step, setStep] = useState<'amount' | 'confirm' | 'processing' | 'success'>('amount');
  const [amount, setAmount] = useState('');
  const [usdcBalance, setUsdcBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) return;
      
      try {
        const fundService = new InvestmentFundService();
        const balance = await fundService.getUsdcBalance(address);
        setUsdcBalance(balance);
      } catch (err) {
        console.error('Error fetching USDC balance:', err);
      }
    };

    fetchBalance();
  }, [address]);

  const validateAmount = (): boolean => {
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    const minUsdcAmount = weiToUsdc(minInvestment);
    if (amountNum < minUsdcAmount) {
      setError(`Minimum investment is ${minUsdcAmount} USDC`);
      return false;
    }

    const amountWei = usdcToWei(amountNum);
    if (amountWei > usdcBalance) {
      setError(`Insufficient balance. You have ${weiToUsdc(usdcBalance).toFixed(2)} USDC`);
      return false;
    }

    return true;
  };

  const handleAmountSubmit = () => {
    if (!validateAmount()) return;
    setError(null);
    setStep('confirm');
  };

  const handleInvest = async () => {
    if (!walletClient || !address) {
      setError('Please connect your wallet');
      return;
    }

    if (chainId !== 80002) {
      setError('Please switch to Polygon Amoy testnet');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStep('processing');

      const fundService = new InvestmentFundService();
      const amountNum = parseFloat(amount);
      
      // Check fund phase
      const phase = await fundService.getCurrentPhase(fundAddress as `0x${string}`);
      if (phase !== FundPhase.DEPOSIT) {
        setError('Fund is not accepting deposits');
        setStep('amount');
        return;
      }

      // Make deposit
      const { hash, shares } = await fundService.deposit(
        fundAddress as `0x${string}`,
        amountNum,
        walletClient
      );

      setTxHash(hash);
      setStep('success');
      
      if (onSuccess) {
        onSuccess(hash);
      }
    } catch (err: any) {
      console.error('Error investing:', err);
      setError(err.message || 'Failed to invest');
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const calculateFees = () => {
    const amountNum = parseFloat(amount) || 0;
    const feeAmount = (amountNum * entryFee) / 10000;
    const netAmount = amountNum - feeAmount;
    return { feeAmount, netAmount };
  };

  const renderAmountStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Investment Amount</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Amount (USDC)
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
            min={weiToUsdc(minInvestment)}
            step="0.01"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            USDC
          </span>
        </div>
        <div className="mt-1 text-sm text-gray-500">
          Balance: {weiToUsdc(usdcBalance).toFixed(2)} USDC
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="text-sm text-gray-600">
        <p>• Minimum investment: {weiToUsdc(minInvestment)} USDC</p>
        <p>• Entry fee: {basisPointsToPercentage(entryFee)}%</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleAmountSubmit}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderConfirmStep = () => {
    const { feeAmount, netAmount } = calculateFees();

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Confirm Investment</h3>
        
        <div className="bg-gray-50 p-4 rounded-md space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Fund:</span>
            <span className="font-medium">{fundName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Investment Amount:</span>
            <span className="font-medium">{amount} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Entry Fee ({basisPointsToPercentage(entryFee)}%):</span>
            <span className="font-medium">-{feeAmount.toFixed(2)} USDC</span>
          </div>
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Net Investment:</span>
            <span>{netAmount.toFixed(2)} USDC</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
          <p className="text-sm text-yellow-800">
            By investing, you agree to lock your funds until the redemption phase.
            The agent will trade your funds, and profits/losses will be distributed proportionally.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep('amount')}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Back
          </button>
          <button
            onClick={handleInvest}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={loading || chainId !== 80002}
          >
            {loading ? 'Processing...' : chainId !== 80002 ? 'Switch to Amoy' : 'Confirm Investment'}
          </button>
        </div>
      </div>
    );
  };

  const renderProcessingStep = () => (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Processing Investment</h3>
      <p className="text-gray-600">Please confirm the transaction in your wallet</p>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Investment Successful!</h3>
      <p className="text-gray-600">
        You have successfully invested {amount} USDC into {fundName}
      </p>
      {txHash && (
        <a
          href={`https://amoy.polygonscan.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm"
        >
          View Transaction →
        </a>
      )}
      <button
        onClick={onCancel}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Done
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
      {!walletContext ? (
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full">
            <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Wallet Connection Required</h3>
          <p className="text-gray-600">
            Please connect your wallet to invest in funds. This feature requires wallet integration to be enabled.
          </p>
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          {step === 'amount' && renderAmountStep()}
          {step === 'confirm' && renderConfirmStep()}
          {step === 'processing' && renderProcessingStep()}
          {step === 'success' && renderSuccessStep()}
        </>
      )}
    </div>
  );
};