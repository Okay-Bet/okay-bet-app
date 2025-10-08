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
  const [filterPhase, setFilterPhase] = useState<FundPhase | 'all' | 'no-fund'>('all');
  const [groups, setGroups] = useState<SPMCGroup[]>([]);

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

  // Filter by fund phase or no-fund status
  const filteredItems = filterPhase === 'all'
    ? [...funds, ...groups.filter(g => {
        const metadata = g.metadata as GroupFundMetadata;
        return !metadata?.fund_deployment?.contract_address;
      }).map(g => ({ ...g, isGroup: true }))]
    : filterPhase === 'no-fund'
    ? groups.filter(g => {
        const metadata = g.metadata as GroupFundMetadata;
        return !metadata?.fund_deployment?.contract_address;
      }).map(g => ({ ...g, isGroup: true }))
    : funds.filter(f => f.currentPhase === filterPhase);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
        {/* Page Title and Filters */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Investment Funds</h1>
              <p className="text-gray-600">
                Browse and invest in managed prediction market funds
              </p>
            </div>
            <div className="flex items-center gap-4">
              {chainId !== 80002 && (
                <div className="text-sm text-orange-600 font-medium">
                  Switch to Polygon Amoy
                </div>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Create Fund
              </button>
            </div>
          </div>
          
          {/* Phase Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter by status:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterPhase('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  filterPhase === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterPhase('no-fund')}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  filterPhase === 'no-fund'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                No Fund
              </button>
              <button
                onClick={() => setFilterPhase(FundPhase.DEPOSIT)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  filterPhase === FundPhase.DEPOSIT
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Deposit
              </button>
              <button
                onClick={() => setFilterPhase(FundPhase.TRADING)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  filterPhase === FundPhase.TRADING
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Trading
              </button>
              <button
                onClick={() => setFilterPhase(FundPhase.REDEMPTION)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  filterPhase === FundPhase.REDEMPTION
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Redemption
              </button>
            </div>
          </div>
        </div>

        {/* Funds Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading funds...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filterPhase === 'all'
                ? 'No groups or funds found'
                : filterPhase === 'no-fund'
                ? 'No groups without funds'
                : `No funds in ${getPhaseName(filterPhase as FundPhase)} phase`}
            </h3>
            <p className="text-gray-600 mb-4">
              {filterPhase === 'all' || filterPhase === 'no-fund'
                ? 'Create a group to get started!'
                : 'Try selecting a different status filter'}
            </p>
            {(filterPhase === 'all' || filterPhase === 'no-fund') && (
              <button
                onClick={() => router.push('/groups?tab=create')}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Create Index
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item: any) =>
              item.isGroup ? (
                // Render group card for groups without funds
                <div key={item.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                        No Fund
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Markets:</span>
                      <span className="font-semibold text-gray-900">{item.market_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-semibold text-gray-900 capitalize">{item.group_type}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => router.push(`/groups`)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      Deploy Fund
                    </button>
                  </div>
                </div>
              ) : (
                // Render fund card for funds
                <FundCard
                  key={item.address}
                  fundAddress={item.address}
                  fundName={item.name}
                  manager={item.manager}
                  agent={item.agent}
                  targetRaise={item.targetRaise}
                  minInvestment={item.minInvestment}
                  entryFee={item.entryFee}
                  carriedInterest={item.carriedInterest}
                  onInvest={() => handleInvest(item)}
                  onRedeem={() => handleInvest(item)}
                  onViewDetails={() => handleViewDetails(item.address)}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Create Fund Modal */}
      <CreateFundModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(fundAddress) => {
          console.log('Fund created:', fundAddress);
          setShowCreateModal(false);
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