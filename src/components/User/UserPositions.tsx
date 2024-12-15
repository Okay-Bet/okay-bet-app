// components/UserPositions.tsx
import { usePositions } from "@/hooks/usePositions";

export default function UserPositions() {
  const { positions, loading, error, isConnected, totalValue } = usePositions();

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Your Positions</h2>
        <p className="text-gray-500">Connect your wallet to view positions</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Your Positions</h2>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Your Positions</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Your Positions</h2>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Value</div>
          <div className="font-semibold">${(totalValue || 0).toFixed(2)}</div>
        </div>
      </div>

      {positions.length === 0 ? (
        <p className="text-gray-500">No positions found</p>
      ) : (
        <div className="space-y-4">
          {positions.map((position) => (
            <div
              key={position.token_id}
              className="border rounded p-4 bg-white"
            >
              <h3 className="font-medium mb-2">{position.market_question}</h3>
              <div className="space-y-2">
                {position.outcomes.map((outcome, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <span>{outcome}</span>
                    <div className="text-right">
                      <span className="font-medium">
                        {position.balances[index].toFixed(2)}
                      </span>
                      <span className="text-gray-500 ml-2">
                        @ ${position.prices[index].toFixed(3)}
                      </span>
                      {position.balances[index] > 0 && (
                        <span className="ml-2 text-gray-500">
                          ($
                          {(
                            position.balances[index] * position.prices[index]
                          ).toFixed(2)}
                          )
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Position Value</span>
                  <span className="font-medium">
                    $
                    {position.balances
                      .reduce(
                        (sum, balance, index) =>
                          sum + balance * position.prices[index],
                        0
                      )
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
