'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Common/Navbar';
import { FundCard } from '@/components/funds/FundCard';
import { CreateFundModal } from '@/components/funds/CreateFundModal';
import { InvestmentFlow } from '@/components/funds/InvestmentFlow';
import { FundFactoryService } from '@/services/funds/fundFactory.service';
import { InvestmentFundService } from '@/services/funds/investmentFund.service';
import { Fund, FundPhase, getPhaseName } from '@/services/funds/types';
import { WalletContext } from '@/app/context/WalletContext';
import { spmcClient } from '@/services/spmc/client';
import { SPMCGroup } from '@/services/spmc/types';
import { GroupFundMetadata } from '@/services/funds/groupFundIntegration.service';

export default function FundsPage() {
  const router = useRouter();
  // Try to use wallet context if available
  const walletContext = useContext(WalletContext);
  const address = walletContext?.address;
  const chainId = walletContext?.chainId;
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [showInvestFlow, setShowInvestFlow] = useState(false);
  const [viewMode, setViewMode] = useState<'active-funds' | 'deploy-new'>('active-funds');
  const [groups, setGroups] = useState<SPMCGroup[]>([]);
  const [selectedGroupForDeploy, setSelectedGroupForDeploy] = useState<SPMCGroup | null>(null);

  // Load all groups (which may or may not have deployed funds)
  const loadFunds = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load all groups from SPMC via API proxy
      const response = await fetch('/api/groups?limit=100');
      const data = await response.json();

      if (!response.ok || !data) {
        throw new Error('Failed to load groups');
      }

      // Filter to index and portfolio groups
      const filteredGroups = data.groups.filter(
        (group: SPMCGroup) => group.group_type === 'index' || group.group_type === 'portfolio'
      );
      setGroups(filteredGroups);

      const factoryService = new FundFactoryService();
      const fundService = new InvestmentFundService();

      // Extract fund addresses from groups that have deployed funds
      const groupsWithFunds = filteredGroups.filter((group: SPMCGroup) => {
        const metadata = group.metadata as GroupFundMetadata;
        return metadata?.fund_deployment?.contract_address;
      });

      // Load details for each deployed fund
      const fundsData = await Promise.all(
        groupsWithFunds.map(async (group: SPMCGroup) => {
          const metadata = group.metadata as GroupFundMetadata;
          const address = metadata.fund_deployment!.contract_address;
          try {
            // Get fund details from metadata
            const params = metadata.fund_deployment!.parameters;
            const details: Partial<Fund> = {
              address,
              name: group.title,
              manager: params.agent_wallet,
              agent: params.agent_wallet,
              targetRaise: BigInt(params.target_raise),
              minInvestment: BigInt(params.min_investment),
              entryFee: params.entry_fee,
              carriedInterest: params.carried_interest,
              depositDeadline: new Date(params.deposit_deadline * 1000),
              tradingDuration: params.trading_duration
            };

            // Get metrics directly from the fund contract
            const metrics = await fundService.getFundMetrics(address as `0x${string}`);

            return {
              ...details,
              address,
              currentPhase: metrics.currentPhase,
              totalDeposits: metrics.totalDeposits,
            } as Fund;
          } catch (err) {
            console.error(`Error loading fund ${address}:`, err);
            return null;
          }
        })
      );

      // Filter out any failed loads
      const validFunds = fundsData.filter(f => f !== null) as Fund[];
      setFunds(validFunds);
    } catch (err: any) {
      console.error('Error loading funds:', err);
      setError('Failed to load funds and groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFunds();
    // Refresh every 60 seconds
    const interval = setInterval(loadFunds, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleInvest = (fund: Fund) => {
    setSelectedFund(fund);
    setShowInvestFlow(true);
  };

  const handleViewDetails = (fundAddress: string) => {
    router.push(`/funds/${fundAddress}`);
  };

  // Separate active funds and groups without funds
  const activeFunds = funds;
  const groupsWithoutFunds = groups.filter(g => {
    const metadata = g.metadata as GroupFundMetadata;
    return !metadata?.fund_deployment?.contract_address;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
        {/* Page Title and View Tabs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Investment Funds</h1>
              <p className="text-gray-600">
                Deploy funds from groups and accept USDC investments
              </p>
            </div>
            {chainId !== 80002 && (
              <div className="text-sm text-orange-600 font-medium">
                Switch to Polygon Amoy to deploy
              </div>
            )}
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-4 border-b border-gray-200">
            <button
              onClick={() => setViewMode('active-funds')}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
                viewMode === 'active-funds'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Active Funds {activeFunds.length > 0 && `(${activeFunds.length})`}
            </button>
            <button
              onClick={() => setViewMode('deploy-new')}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
                viewMode === 'deploy-new'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Deploy New Fund {groupsWithoutFunds.length > 0 && `(${groupsWithoutFunds.length})`}
            </button>
          </div>
        </div>

        {/* Content based on view mode */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : viewMode === 'active-funds' ? (
          // Active Funds View
          activeFunds.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No active funds yet</h3>
              <p className="text-gray-600 mb-4">
                Deploy your first fund from a group to get started
              </p>
              <button
                onClick={() => setViewMode('deploy-new')}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Deploy New Fund
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeFunds.map((fund) => {
                // Find the source group for this fund
                const sourceGroup = groups.find(g => {
                  const metadata = g.metadata as GroupFundMetadata;
                  return metadata?.fund_deployment?.contract_address?.toLowerCase() === fund.address.toLowerCase();
                });

                return (
                  <FundCard
                    key={fund.address}
                    fundAddress={fund.address}
                    fundName={fund.name}
                    manager={fund.manager}
                    agent={fund.agent}
                    targetRaise={fund.targetRaise}
                    minInvestment={fund.minInvestment}
                    entryFee={fund.entryFee}
                    carriedInterest={fund.carriedInterest}
                    sourceGroupId={sourceGroup?.id}
                    sourceGroupName={sourceGroup?.title}
                    onInvest={() => handleInvest(fund)}
                    onRedeem={() => handleInvest(fund)}
                    onViewDetails={() => handleViewDetails(fund.address)}
                  />
                );
              })}
            </div>
          )
        ) : (
          // Deploy New Fund View
          groupsWithoutFunds.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No groups available for deployment</h3>
              <p className="text-gray-600 mb-4">
                {groups.length > 0
                  ? 'All your groups already have funds deployed'
                  : 'Create a group with markets first'}
              </p>
              <button
                onClick={() => router.push('/groups?tab=create')}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                {groups.length > 0 ? 'Create Another Group' : 'Create Group'}
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Select a group to deploy as an investment fund. Each group can have one fund.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupsWithoutFunds.map((group) => (
                  <div key={group.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:border-primary transition">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{group.title}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          group.group_type === 'index' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {group.group_type?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Markets:</span>
                        <span className="font-semibold text-gray-900">{group.market_count}</span>
                      </div>
                      {group.markets && group.markets.length > 0 && (
                        <div className="text-xs text-gray-500">
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.from(new Set(group.markets.map(m => m.market_platform))).map(platform => (
                              <span key={platform} className={`px-2 py-0.5 rounded ${
                                platform === 'polymarket' ? 'bg-purple-100 text-purple-600' :
                                platform === 'kalshi' ? 'bg-green-100 text-green-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {platform}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedGroupForDeploy(group);
                          setShowCreateModal(true);
                        }}
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
                      >
                        Deploy Fund
                      </button>
                      <button
                        onClick={() => router.push(`/groups`)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* Create Fund Modal */}
      <CreateFundModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedGroupForDeploy(null);
        }}
        groupId={selectedGroupForDeploy?.id}
        groupName={selectedGroupForDeploy?.title}
        group={selectedGroupForDeploy || undefined}
        onSuccess={(fundAddress) => {
          console.log('Fund created:', fundAddress);
          setShowCreateModal(false);
          setSelectedGroupForDeploy(null);
          setViewMode('active-funds'); // Switch to active funds view
          loadFunds(); // Refresh the list
        }}
      />

      {/* Investment Flow Modal */}
      {showInvestFlow && selectedFund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <InvestmentFlow
            fundAddress={selectedFund.address}
            fundName={selectedFund.name}
            minInvestment={selectedFund.minInvestment}
            entryFee={selectedFund.entryFee}
            onSuccess={(txHash) => {
              console.log('Investment successful:', txHash);
              setShowInvestFlow(false);
              setSelectedFund(null);
              loadFunds(); // Refresh to update metrics
            }}
            onCancel={() => {
              setShowInvestFlow(false);
              setSelectedFund(null);
            }}
          />
        </div>
      )}
    </div>
  );
}