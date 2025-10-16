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
  indexNumber?: number;
}

/**
 * Header section of IndexCard showing title, description, and large price display
 */
export const IndexCardHeader: React.FC<IndexCardHeaderProps> = ({
  group,
  indexPrice,
  priceColors,
  isExpanded,
  onToggleExpand,
  indexNumber = 0
}) => {
  // Map telegram handles by index
  const telegramHandles = [
    '@nothing_happens_pm_bot',
    '@trumped_up_pm_bot',
    '@lib_out_pm_bot'
  ];

  const telegramHandle = telegramHandles[indexNumber] || '@okaybet_agent';
  const telegramUrl = `https://t.me/${telegramHandle.slice(1)}`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
      <div className="flex-1">
        {/* Telegram Handle */}
        <div className="mb-2">
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
            </svg>
            {telegramHandle}
          </a>
        </div>
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-2">
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
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="hidden sm:inline">Hide Chart</span>
                  <span className="sm:hidden">Hide</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="hidden sm:inline">Show Chart</span>
                  <span className="sm:hidden">Chart</span>
                </>
              )}
            </button>
          )}
        </div>
        <p className="text-sm text-gray-900 line-clamp-2">{group.description}</p>
      </div>

      {/* Large Index Price Display */}
      <div className={`w-full sm:w-auto px-6 py-4 ${priceColors.bg} rounded-xl border-2 ${priceColors.border} sm:min-w-[140px]`}>
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
