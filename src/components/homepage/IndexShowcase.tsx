import React, { useState } from 'react';
import { SPMCGroup } from '@/services/spmc/types';
import { IndexCard } from './IndexCard';
import { MarketAllocation } from './InvestmentCalculator';

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
  const [filter, setFilter] = useState<'all' | 'index' | 'portfolio'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'markets' | 'value' | 'recent'>('recent');

  // Filter groups
  const filteredGroups = groups.filter(group => {
    if (filter === 'all') return true;
    return group.group_type === filter;
  });

  // Sort groups
  const sortedGroups = [...filteredGroups].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'markets':
        return (b.market_count || 0) - (a.market_count || 0);
      case 'value':
        const aValue = a.markets?.reduce((sum, m) => sum + (m.market_current_price || 0) * (m.weight || 1), 0) || 0;
        const bValue = b.markets?.reduce((sum, m) => sum + (m.market_current_price || 0) * (m.weight || 1), 0) || 0;
        return bValue - aValue;
      case 'recent':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
  });

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
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Explore Market Indexes
          </h2>
          <p className="text-lg text-gray-800 max-w-2xl mx-auto">
            Discover expertly curated collections of prediction markets. 
            Invest in themes and trends with diversified exposure.
          </p>
        </div>

        {/* Filters and Controls */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'all' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({groups.length})
              </button>
              <button
                onClick={() => setFilter('index')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'index' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Indexes ({groups.filter(g => g.group_type === 'index').length})
              </button>
              <button
                onClick={() => setFilter('portfolio')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'portfolio' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Portfolios ({groups.filter(g => g.group_type === 'portfolio').length})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="recent">Recently Updated</option>
                <option value="name">Name (A-Z)</option>
                <option value="markets">Market Count</option>
                <option value="value">Total Value</option>
              </select>
            </div>
          </div>
        </div>

        {/* Index Grid */}
        {sortedGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedGroups.map((group) => (
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
              {filter === 'all' ? 'No Market Indexes Yet' : `No ${filter === 'index' ? 'Indexes' : 'Portfolios'} Found`}
            </h3>
            <p className="text-gray-800 mb-6">
              {filter === 'all' 
                ? 'Be the first to create a market index and start tracking grouped predictions.'
                : `Try adjusting your filters or create the first ${filter}.`}
            </p>
            {onCreateIndex && (
              <button
                onClick={onCreateIndex}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition font-medium"
              >
                Create Your First {filter === 'portfolio' ? 'Portfolio' : 'Index'}
              </button>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        {sortedGroups.length > 0 && onCreateIndex && (
          <div className="mt-12 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 bg-primary/5 rounded-xl border border-primary/20">
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 mb-1">Can't find what you're looking for?</h3>
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