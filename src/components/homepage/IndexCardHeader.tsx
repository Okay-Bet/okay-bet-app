import React from 'react';
import { SPMCGroup } from '@/services/spmc/types';

interface IndexCardHeaderProps {
  group: SPMCGroup;
  indexPrice: number;
  priceColors: {
    bg: string;
    border: string;
    text: string;
    accent: string;
  };
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

/**
 * Header section of IndexCard showing title, description, and large price display
 */
export const IndexCardHeader: React.FC<IndexCardHeaderProps> = ({
  group,
  indexPrice,
  priceColors,
  isExpanded,
  onToggleExpand
}) => {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-xl font-bold text-gray-900">{group.title}</h3>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            group.group_type === 'index'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700'
          }`}>
            {group.group_type === 'index' ? 'INDEX' : 'PORTFOLIO'}
          </span>
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="ml-2 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Hide Chart
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Show Chart
                </>
              )}
            </button>
          )}
        </div>
        <p className="text-sm text-gray-900 line-clamp-2">{group.description}</p>
      </div>

      {/* Large Index Price Display */}
      <div className={`ml-6 px-6 py-4 ${priceColors.bg} rounded-xl border-2 ${priceColors.border} min-w-[140px]`}>
        <div className="text-center">
          <div className="text-xs font-medium text-gray-600 mb-1">Index Price</div>
          <div className={`text-4xl font-bold ${priceColors.text} tabular-nums`}>
            {(indexPrice * 100).toFixed(1)}¢
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Weighted Avg
          </div>
        </div>
      </div>
    </div>
  );
};
