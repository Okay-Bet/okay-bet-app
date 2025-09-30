'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { spmcClient } from '@/services/spmc/client';
import { SPMCGroup } from '@/services/spmc/types';
import { GroupFundMetadata, TradingInstruction } from '@/services/funds/groupFundIntegration.service';
import Logo from '@/components/Logo/Logo';

export default function TradingInstructionsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  
  const [group, setGroup] = useState<SPMCGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await spmcClient.getGroup(groupId);
      if (response.success && response.data) {
        setGroup(response.data);
      } else {
        setError('Failed to load group data');
      }
    } catch (err) {
      setError(`Error loading group: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error loading group:', err);
    } finally {
      setLoading(false);
    }
  };

  const metadata = group?.metadata as GroupFundMetadata;
  const fundDeployment = metadata?.fund_deployment;
  const tradingInstructions = metadata?.trading_instructions;

  const handlePrint = () => {
    window.print();
  };

  const copyToClipboard = () => {
    if (!tradingInstructions) return;
    
    const text = formatInstructionsAsText();
    navigator.clipboard.writeText(text).then(() => {
      alert('Trading instructions copied to clipboard!');
    });
  };

  const formatInstructionsAsText = () => {
    if (!tradingInstructions || !fundDeployment) return '';
    
    let text = `TRADING INSTRUCTIONS\n`;
    text += `${'='.repeat(50)}\n\n`;
    text += `Fund: ${group?.title}\n`;
    text += `Contract: ${fundDeployment.contract_address}\n`;
    text += `Total Capital: $${tradingInstructions.total_allocation.toLocaleString()} USDC\n`;
    text += `Agent: ${fundDeployment.parameters.agent_wallet}\n`;
    text += `Trading Duration: ${fundDeployment.parameters.trading_duration / 86400} days\n`;
    text += `Generated: ${new Date(tradingInstructions.generated_at).toLocaleString()}\n\n`;
    
    text += `MARKET ALLOCATIONS\n`;
    text += `${'-'.repeat(50)}\n\n`;
    
    tradingInstructions.markets.forEach((instruction, idx) => {
      text += `${idx + 1}. ${instruction.market_title || instruction.market_id}\n`;
      text += `   Platform: ${instruction.platform}\n`;
      text += `   Allocation: $${instruction.allocation_usdc} (${instruction.allocation_percentage}%)\n`;
      text += `   Position: ${instruction.outcome.toUpperCase()}\n`;
      if (instruction.market_url) {
        text += `   URL: ${instruction.market_url}\n`;
      }
      text += `\n`;
    });
    
    return text;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600">Loading trading instructions...</div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-red-600 mb-4">{error || 'Group not found'}</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!fundDeployment || !tradingInstructions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600 mb-4">No fund deployed for this group</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Hidden on print */}
      <div className="print:hidden bg-gray-900 text-white py-4">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center">
            <Logo />
            <span className="ml-4 text-xl font-semibold">Trading Instructions</span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Print
            </button>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Copy to Clipboard
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Fund Header */}
        <div className="border-b-2 border-gray-300 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{group.title}</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Contract Address:</span>
              <br />
              <span className="font-mono text-xs">{fundDeployment.contract_address}</span>
            </div>
            <div>
              <span className="font-semibold">Agent Wallet:</span>
              <br />
              <span className="font-mono text-xs">{fundDeployment.parameters.agent_wallet}</span>
            </div>
            <div>
              <span className="font-semibold">Total Capital:</span>
              <br />
              <span className="text-lg font-bold text-green-600">
                ${tradingInstructions.total_allocation.toLocaleString()} USDC
              </span>
            </div>
            <div>
              <span className="font-semibold">Trading Duration:</span>
              <br />
              <span>{fundDeployment.parameters.trading_duration / 86400} days</span>
            </div>
          </div>
        </div>

        {/* Trading Instructions */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Market Allocations</h2>
          <div className="space-y-4">
            {tradingInstructions.markets.map((instruction: TradingInstruction, idx: number) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {idx + 1}. {instruction.market_title || instruction.market_id}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        instruction.platform === 'polymarket' ? 'bg-purple-100 text-purple-700' :
                        instruction.platform === 'kalshi' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {instruction.platform.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        instruction.outcome === 'yes' ? 'bg-green-100 text-green-700' :
                        instruction.outcome === 'no' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {instruction.outcome.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      ${instruction.allocation_usdc.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {instruction.allocation_percentage}% of portfolio
                    </div>
                  </div>
                </div>
                
                {instruction.market_url && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <a 
                      href={instruction.market_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-mono break-all"
                    >
                      {instruction.market_url}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="font-bold text-lg mb-4">Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Total Markets:</span> {tradingInstructions.markets.length}
            </div>
            <div>
              <span className="font-semibold">Total Allocation:</span> ${tradingInstructions.total_allocation.toLocaleString()} USDC
            </div>
            <div>
              <span className="font-semibold">Entry Fee:</span> {fundDeployment.parameters.entry_fee / 100}%
            </div>
            <div>
              <span className="font-semibold">Carried Interest:</span> {fundDeployment.parameters.carried_interest / 100}%
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-gray-200 text-xs text-gray-500">
          <p>Generated on {new Date(tradingInstructions.generated_at).toLocaleString()}</p>
          <p className="mt-1">Fund Status: {fundDeployment.status.toUpperCase()}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            margin: 1in;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}