import React, { useState, useEffect } from 'react';
import { SPMCGroup } from '@/services/spmc/types';
import { IndexCard } from './IndexCard';
import { MarketAllocation } from './IndexCard';
import { FundFactoryService } from '@/services/funds/fundFactory.service';

interface IndexShowcaseProps {
  groups: SPMCGroup[];
  loading?: boolean;
  onInvest?: (groupId: string, allocations: MarketAllocation[]) => void;
  onCreateIndex?: () => void;
  fundAddresses?: Record<string, string>; // Map of groupId to fundAddress
}

export const IndexShowcase: React.FC<IndexShowcaseProps> = ({ 
  groups, 
  loading, 
  onInvest,
  onCreateIndex,
  fundAddresses = {}
}) => {
  const [localFundAddresses, setLocalFundAddresses] = useState<Record<string, string>>(fundAddresses);
  const [loadingFunds, setLoadingFunds] = useState(true);

  // Load fund addresses for groups
  useEffect(() => {
    const loadFundAddresses = async () => {
      try {
        setLoadingFunds(true);
        const factoryService = new FundFactoryService();
        
        // Get all funds from factory
        const allFunds = await factoryService.getAllFunds();
        
        // For now, we'll use a simple mapping - in production you'd want to
        // store the group-fund relationship in your database
        const fundMap: Record<string, string> = {};
        
        // Example: Map known test fund to a specific group if needed
        // This is where you'd typically query your database for group-fund relationships
        
        setLocalFundAddresses({ ...fundAddresses, ...fundMap });
      } catch (error) {
        console.error('Error loading fund addresses:', error);
      } finally {
        setLoadingFunds(false);
      }
    };

    loadFundAddresses();
  }, [groups]);

  const handleRefreshFund = (groupId: string) => {
    // Trigger a refresh of fund data for this group
    // This could be more sophisticated in production
    console.log('Refreshing fund for group:', groupId);
  };
  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading market indexes...</p>
        </div>
      </div>
    );
  }

  return (
    <section id="index-showcase" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Index List - Full Width */}
        {groups.length > 0 ? (
          <div className="space-y-6">
            {groups.map((group, index) => (
              <IndexCard
                key={group.id}
                group={group}
                fundAddress={localFundAddresses[group.id] || null}
                onInvest={onInvest}
                onRefreshFund={() => handleRefreshFund(group.id)}
                indexNumber={index}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Active Funds Available
            </h3>
            <p className="text-gray-800 mb-6">
              There are currently no funds accepting investments. Check back soon or create your own!
            </p>
            {onCreateIndex && (
              <button
                onClick={onCreateIndex}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition font-medium"
              >
                Create Index & Launch Fund
              </button>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        {/* {groups.length > 0 && onCreateIndex && (
          <div className="mt-12 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 bg-primary/5 rounded-xl border border-primary/20">
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 mb-1">Can&apos;t find what you&apos;re looking for?</h3>
                <p className="text-sm text-gray-800">Create your own custom index with your preferred markets.</p>
              </div>
              <button
                onClick={onCreateIndex}
                className="px-6 py-3 bg-white border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition font-semibold whitespace-nowrap"
              >
                Create Custom Index
              </button>
            </div>
          </div>
        )} */}
      </div>
    </section>
  );
};