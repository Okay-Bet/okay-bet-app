import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { SPMCHistoryDataPoint } from '@/services/spmc/types';
import { formatTime } from '@/utils/formatting';

interface IndexPriceChartProps {
  history: SPMCHistoryDataPoint[];
  timeRange: '1d' | '1w' | 'max';
  setTimeRange: (range: '1d' | '1w' | 'max') => void;
  loading: boolean;
}

/**
 * Price history chart component with time range selector
 */
export const IndexPriceChart: React.FC<IndexPriceChartProps> = ({
  history,
  timeRange,
  setTimeRange,
  loading
}) => {
  // Simple Moving Average (SMA) filter to smooth data
  const applySMA = (data: typeof history, period: number = 3) => {
    if (data.length < period) return data;

    const smoothed = data.map((point, idx) => {
      // For first few points, use available data
      const start = Math.max(0, idx - Math.floor(period / 2));
      const end = Math.min(data.length, idx + Math.ceil(period / 2));
      const window = data.slice(start, end);

      const avgPrice = window.reduce((sum, p) => sum + p.p, 0) / window.length;

      return {
        t: point.t,
        p: avgPrice
      };
    });

    return smoothed;
  };

  // Apply SMA filter to smooth lumpy data
  const smoothedHistory = applySMA(history, 5);

  // Calculate price change in cents
  const priceChange = history.length >= 2
    ? (history[history.length - 1].p - history[0].p) * 100
    : 0;

  // Determine chart color based on trend
  const chartColor = priceChange >= 0 ? '#10b981' : '#ef4444'; // green-500 : red-500

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white px-3 py-2 border border-gray-200 rounded-lg shadow-lg">
          <div className="text-xs text-gray-600 mb-1">
            {new Date(data.time * 1000).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </div>
          <div className="text-sm font-bold text-gray-900">
            {data.price.toFixed(1)}¢
          </div>
          <div className="text-xs text-gray-500">
            Index Price
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-gray-700">Price History</div>
          <div className="text-xs text-gray-500 mt-1">
            {timeRange === '1d' ? '24 hours' : timeRange === '1w' ? '7 days' : 'All time'}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
          {(['1d', '1w', 'max'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                timeRange === range
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range === '1d' ? '24H' : range === '1w' ? '7D' : 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={smoothedHistory.map(point => ({
              time: point.t,
              price: point.p * 100
            }))}
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="time"
              tickFormatter={(timestamp) => formatTime(timestamp, timeRange)}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              minTickGap={50}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickFormatter={(value) => `${value}¢`}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke={chartColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: chartColor }}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
