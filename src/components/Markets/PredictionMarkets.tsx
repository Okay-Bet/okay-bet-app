// components/Markets/PredictionMarkets.tsx
import { useGroupedMarkets } from '@/hooks/useGroupedMarkets';
import { GroupedMarketCard } from './GroupedMarketCard';

const PredictionMarkets = () => {
  const { 
    groupedMarkets, 
    loading, 
    error, 
    pagination,
    marketActions: { handlePageChange, handleItemsPerPageChange }
  } = useGroupedMarkets();

  if (loading) {
    return <div className="text-center py-4">Loading markets...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Items per page:</label>
          <select
            className="border rounded px-2 py-1"
            value={pagination.itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedMarkets.map((groupedMarket) => (
          <GroupedMarketCard 
            key={groupedMarket.id} 
            groupedMarket={groupedMarket} 
          />
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center space-x-2 mt-6">
        <button
          className={`px-4 py-2 rounded ${
            pagination.hasPreviousPage
              ? 'bg-gray-200 hover:bg-gray-300'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={!pagination.hasPreviousPage}
        >
          Previous
        </button>
        
        <span className="text-gray-600">
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
        
        <button
          className={`px-4 py-2 rounded ${
            pagination.hasNextPage
              ? 'bg-gray-200 hover:bg-gray-300'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={!pagination.hasNextPage}
        >
          Next
        </button>
      </div>

      <div className="text-center text-sm text-gray-500 mt-2">
        Total items: {pagination.totalItems}
      </div>
    </div>
  );
};

export default PredictionMarkets;