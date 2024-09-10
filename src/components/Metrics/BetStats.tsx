// components/BetStats.tsx
import React from "react";

interface BetStatsProps {
  stats: {
    betsWon: number;
    betsLost: number;
    betsDecided: number;
    betsCancelled: number;
    pnlEth: number;
    pnlUsd: number;
  };
}

const BetStats: React.FC<BetStatsProps> = ({ stats }) => {
  if (!stats) {
    return <div className="p-6 bg-secondary mb-6">Loading stats...</div>;
  }

  return (
    <div className="p-6 bg-secondary mb-6">
      <h4 className="text-2xl font-bold mb-4 text-font">Record</h4>
      <table className="w-full text-left text-font border-collapse">
        <tbody>
          <tr className="border-b">
            <th className="font-semibold py-2">Bets Won:</th>
            <td className="py-2">{stats.betsWon}</td>
          </tr>
          <tr className="border-b">
            <th className="font-semibold py-2">Bets Lost:</th>
            <td className="py-2">{stats.betsLost}</td>
          </tr>
          <tr className="border-b">
            <th className="font-semibold py-2">Bets Judged:</th>
            <td className="py-2">{stats.betsDecided}</td>
          </tr>
          <tr className="border-b">
            <th className="font-semibold py-2">Bets Cancelled:</th>
            <td className="py-2">{stats.betsCancelled}</td>
          </tr>
          <tr>
            <th className="font-semibold py-2">Profit and Loss:</th>
            <td
              className={`py-2 ${
                stats.pnlUsd > 0
                  ? "font-bold text-green-500"
                  : stats.pnlUsd < 0
                  ? "font-bold text-black"
                  : ""
              }`}
            >
              $ {stats.pnlUsd.toFixed(2)} ({stats.pnlEth.toFixed(4)} ETH)
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default BetStats;
