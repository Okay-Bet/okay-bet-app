// components/Polymarket/MarketSearch.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Search, SortAsc, SortDesc } from 'lucide-react';
import debounce from 'lodash/debounce';

interface SearchParams {
  searchTerm: string;
  sortBy: 'volume' | 'liquidity';
  sortDirection: 'asc' | 'desc';
  endDateMin?: string;
  endDateMax?: string;
  volumeMin?: number;
  volumeMax?: number;
  liquidityMin?: number;
  liquidityMax?: number;
}

interface MarketSearchProps {
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
}

const MarketSearch: React.FC<MarketSearchProps> = ({ onSearch, isLoading }) => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    searchTerm: '',
    sortBy: 'liquidity',
    sortDirection: 'desc'
  });

  // We'll keep the debounced search for filter changes
  const debouncedSearch = useMemo(
    () => debounce((params: SearchParams) => {
      if (!params.searchTerm) {  // Only use debounced search when there's no search term
        onSearch(params);
      }
    }, 300),
    [onSearch]
  );

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newParams = {
      ...searchParams,
      searchTerm: e.target.value
    };
    setSearchParams(newParams);
    
    // If search term is cleared, trigger immediate search
    if (!e.target.value) {
      onSearch(newParams);
    }
  };

  // Handle explicit search button click
  const handleSearchClick = () => {
    onSearch(searchParams);
  };

  // Handle enter key in search input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  // Handle sort changes
  const handleSortChange = (sortBy: 'volume' | 'liquidity') => {
    const newParams = {
      ...searchParams,
      sortBy,
      sortDirection: 'desc'
    };
    setSearchParams(newParams);
    debouncedSearch(newParams);
  };

  const toggleSortDirection = () => {
    const newParams = {
      ...searchParams,
      sortDirection: searchParams.sortDirection === 'asc' ? 'desc' : 'asc'
    };
    setSearchParams(newParams);
    debouncedSearch(newParams);
  };

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return (
    <div className="w-full space-y-4 bg-background p-4 rounded-lg shadow-sm">
      {/* Search Input with Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search markets..."
            value={searchParams.searchTerm}
            onChange={handleSearchChange}
            onKeyPress={handleKeyPress}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isLoading}
          />
        </div>
        <button
          onClick={handleSearchClick}
          disabled={isLoading}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-500">Sort by:</span>
        <div className="flex items-center space-x-2">
          {['volume', 'liquidity'].map((option) => (
            <button
              key={option}
              onClick={() => handleSortChange(option as 'volume' | 'liquidity')}
              className={`px-3 py-1 rounded-md text-sm ${
                searchParams.sortBy === option
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={isLoading}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
          <button
            onClick={toggleSortDirection}
            className="p-1 rounded-md hover:bg-gray-100"
            disabled={isLoading}
          >
            {searchParams.sortDirection === 'asc' ? (
              <SortAsc size={20} className="text-gray-700" />
            ) : (
              <SortDesc size={20} className="text-gray-700" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketSearch;