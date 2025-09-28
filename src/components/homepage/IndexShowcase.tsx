import React from 'react';
import { SPMCGroup } from '@/services/spmc/types';
import { IndexCard } from './IndexCard';
import { MarketAllocation } from './IndexCard';

interface IndexShowcaseProps {
  groups: SPMCGroup[];
  loading?: boolean;
  onInvest?: (groupId: string, allocations: MarketAllocation[]) => void;
  onCreateIndex?: () => void;
}

export const IndexShowcase: React.FC<IndexShowcaseProps> = ({ 
  groups, 
  loading, 
  onInvest,
  onCreateIndex 
}) => {
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
            {groups.map((group) => (
              <IndexCard 
                key={group.id} 
                group={group} 
                onInvest={onInvest}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Market Indexes Yet
            </h3>
            <p className="text-gray-800 mb-6">
              Be the first to create a market index and start tracking grouped predictions.
            </p>
            {onCreateIndex && (
              <button
                onClick={onCreateIndex}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition font-medium"
              >
                Create Your First Index
              </button>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        {groups.length > 0 && onCreateIndex && (
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
        )}
      </div>
    </section>
  );
};