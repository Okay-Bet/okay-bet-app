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
  const [filterPhase, setFilterPhase] = useState<FundPhase | 'all'>('all');

  // Load all funds
  const loadFunds = async () => {
    setLoading(true);
    setError(null);
    try {
      const factoryService = new FundFactoryService();
      const fundService = new InvestmentFundService();
      
      // Include the known test fund address
      const TEST_FUND_ADDRESS = '0x8A136572B7b72AE8582cc49FEB231c4850FE8cD0';
      
      // Get all fund addresses from factory
      let fundAddresses: string[] = [];
      try {
        fundAddresses = await factoryService.getAllFunds();
      } catch (err) {
        // Could not fetch funds from factory, will include test fund
      }
      
      // Ensure test fund is included
      if (!fundAddresses.includes(TEST_FUND_ADDRESS)) {
        fundAddresses.push(TEST_FUND_ADDRESS);
      }
      
      // Load details for each fund
      const fundsData = await Promise.all(
        fundAddresses.map(async (address) => {
          try {
            // Try to get details from factory first
            let details: Partial<Fund> = {};
            try {
              details = await factoryService.getFundDetails(address as `0x${string}`);
            } catch (err) {
              // Could not get details from factory, using defaults
              // Use defaults for the test fund
              if (address === TEST_FUND_ADDRESS) {
                details = {
                  address,
                  name: 'Low Min Test Fund',
                  manager: '0x33937d1634c1C0606D2A99599BD989424BA0B053',
                  agent: '0x33937d1634c1C0606D2A99599BD989424BA0B053',
                  targetRaise: BigInt(1000 * 10 ** 6), // 1000 USDC
                  minInvestment: BigInt(5 * 10 ** 6), // 5 USDC
                  entryFee: 100, // 1%
                  carriedInterest: 1500, // 15%
                  depositDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                };
              }
            }
            
            // Get metrics directly from the fund contract
            const metrics = await fundService.getFundMetrics(address as `0x${string}`);
            
            return {
              ...details,
              address,
              currentPhase: metrics.currentPhase,
              totalDeposits: metrics.totalDeposits,
              tradingDuration: 2 * 24 * 60 * 60 // 2 days default
            } as Fund;
          } catch (err) {
            console.error(`Error loading fund ${address}:`, err);
            // Return a basic fund object even if loading fails
            if (address === TEST_FUND_ADDRESS) {
              return {
                address,
                name: 'Low Min Test Fund',
                manager: '0x33937d1634c1C0606D2A99599BD989424BA0B053',
                agent: '0x33937d1634c1C0606D2A99599BD989424BA0B053',
                targetRaise: BigInt(1000 * 10 ** 6),
                minInvestment: BigInt(5 * 10 ** 6),
                entryFee: 100,
                carriedInterest: 1500,
                depositDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                currentPhase: FundPhase.DEPOSIT,
                totalDeposits: BigInt(0),
                tradingDuration: 2 * 24 * 60 * 60
              } as Fund;
            }
            return null;
          }
        })
      );
      
      // Filter out any failed loads (except test fund)
      const validFunds = fundsData.filter(f => f !== null) as Fund[];
      setFunds(validFunds);
    } catch (err: any) {
      console.error('Error loading funds:', err);
      setError('Failed to load funds. You can still view the test fund below.');
      // Add the test fund as fallback
      setFunds([{
        address: '0x8A136572B7b72AE8582cc49FEB231c4850FE8cD0',
        name: 'Low Min Test Fund',
        manager: '0x33937d1634c1C0606D2A99599BD989424BA0B053',
        agent: '0x33937d1634c1C0606D2A99599BD989424BA0B053',
        targetRaise: BigInt(1000 * 10 ** 6),
        minInvestment: BigInt(5 * 10 ** 6),
        entryFee: 100,
        carriedInterest: 1500,
        depositDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        currentPhase: FundPhase.DEPOSIT,
        totalDeposits: BigInt(0),
        tradingDuration: 2 * 24 * 60 * 60
      }]);
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

  const filteredFunds = filterPhase === 'all' 
    ? funds 
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
            <span className="text-sm font-medium text-gray-700">Filter by phase:</span>
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
        ) : filteredFunds.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filterPhase === 'all' ? 'No funds found' : `No funds in ${getPhaseName(filterPhase as FundPhase)} phase`}
            </h3>
            <p className="text-gray-600 mb-4">
              {filterPhase === 'all' 
                ? 'Be the first to create an investment fund!' 
                : 'Try selecting a different phase filter'}
            </p>
            {filterPhase === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                Create First Fund
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFunds.map((fund) => (
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
                onInvest={() => handleInvest(fund)}
                onRedeem={() => handleInvest(fund)} // Use same flow for redemption
                onViewDetails={() => handleViewDetails(fund.address)}
              />
            ))}
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