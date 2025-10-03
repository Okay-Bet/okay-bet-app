import React, { useState, useEffect, useContext } from 'react';
import { WalletContext } from '@/app/context/WalletContext';
import { InvestmentFundService } from '@/services/funds/investmentFund.service';
import { 
  FundPhase,
  weiToUsdc
} from '@/services/funds/types';
import { formatUnits } from 'viem';

interface WithdrawFlowProps {
  fundAddress: string;
  fundName: string;
  onSuccess?: (txHash: string) => void;
  onCancel?: () => void;
}

export const WithdrawFlow: React.FC<WithdrawFlowProps> = ({
  fundAddress,
  fundName,
  onSuccess,
  onCancel
}) => {
  const walletContext = useContext(WalletContext);
  const walletClient = walletContext?.walletClient || null;
  const address = walletContext?.address;
  const chainId = walletContext?.chainId;
  
  const [step, setStep] = useState<'confirm' | 'processing' | 'success'>('confirm');
  const [shares, setShares] = useState<bigint>(0n);
  const [expectedAssets, setExpectedAssets] = useState<bigint | null>(null);
  const [maxRedeem, setMaxRedeem] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [actualAssets, setActualAssets] = useState<bigint | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!address) return;
      
      try {
        const fundService = new InvestmentFundService();
        
        // Get user's share balance and max redeem
        const [shareBalance, maxRed] = await Promise.all([
          fundService.getShareBalance(fundAddress as `0x${string}`, address),
          fundService.getMaxRedeem(fundAddress as `0x${string}`, address)
        ]);
        
        setShares(shareBalance);
        setMaxRedeem(maxRed);

        // Preview expected USDC
        if (shareBalance > 0n) {
          const preview = await fundService.previewRedeem(
            fundAddress as `0x${string}`, 
            shareBalance
          );
          setExpectedAssets(preview);
        }
      } catch (err) {
        console.error('Error fetching withdrawal data:', err);
      }
    };

    fetchData();
  }, [address, fundAddress]);

  const handleWithdraw = async () => {
    if (!walletClient || !address) {
      setError('Please connect your wallet');
      return;
    }

    if (chainId !== 80002) {
      setError('Please switch to Polygon Amoy testnet');
      return;
    }

    if (shares === 0n) {
      setError('You have no shares to redeem');
      return;
    }

    if (maxRedeem === 0n) {
      setError('Withdrawals are not available yet');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStep('processing');

      const fundService = new InvestmentFundService();
      
      // Redeem all shares
      const { hash, assets } = await fundService.redeemAll(
        fundAddress as `0x${string}`,
        walletClient,
        address // receiver is the same as owner
      );

      setTxHash(hash);
      setActualAssets(assets || expectedAssets);
      setStep('success');
      
      if (onSuccess) {
        onSuccess(hash);
      }
    } catch (err: any) {
      console.error('Error withdrawing:', err);
      setError(err.message || 'Failed to withdraw');
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const renderConfirmStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Confirm Withdrawal</h3>
      
      <div className="bg-gray-50 p-4 rounded-md space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Fund:</span>
          <span className="font-medium">{fundName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Your Shares:</span>
          <span className="font-medium">{formatUnits(shares, 18)}</span>
        </div>
        {expectedAssets !== null && (
          <div className="flex justify-between">
            <span className="text-gray-600">Expected USDC:</span>
            <span className="font-medium">{weiToUsdc(expectedAssets).toFixed(2)} USDC</span>
          </div>
        )}
        <div className="border-t pt-3">
          <p className="text-sm text-gray-600">
            {maxRedeem === 0n 
              ? 'Withdrawals are not currently available'
              : 'You will redeem all your shares for USDC'
            }
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {maxRedeem === 0n && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
          <p className="text-sm text-yellow-800">
            The fund must be in the redemption phase before you can withdraw.
            Please check back later.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleWithdraw}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || chainId !== 80002 || shares === 0n || maxRedeem === 0n}
        >
          {loading ? 'Processing...' : 
           chainId !== 80002 ? 'Switch to Amoy' : 
           shares === 0n ? 'No Shares' :
           maxRedeem === 0n ? 'Not Available' :
           'Confirm Withdrawal'}
        </button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Processing Withdrawal</h3>
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
      <h3 className="text-lg font-semibold text-gray-900">Withdrawal Successful!</h3>
      <p className="text-gray-600">
        You have successfully withdrawn {actualAssets ? weiToUsdc(actualAssets).toFixed(2) : 'your'} USDC from {fundName}
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
            Please connect your wallet to withdraw from funds. This feature requires wallet integration to be enabled.
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
          {step === 'confirm' && renderConfirmStep()}
          {step === 'processing' && renderProcessingStep()}
          {step === 'success' && renderSuccessStep()}
        </>
      )}
    </div>
  );
};