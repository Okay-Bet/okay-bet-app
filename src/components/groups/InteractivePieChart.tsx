'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';

interface MarketRatio {
  market_id: string;
  market_title: string;
  ratio: number;
  color?: string;
}

interface InteractivePieChartProps {
  markets: MarketRatio[];
  onRatioChange: (marketId: string, newRatio: number) => void;
  height?: number;
}

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green  
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <text 
        x={cx} 
        y={cy - 10} 
        textAnchor="middle" 
        fill="#333" 
        className="text-lg font-bold"
      >
        {payload.number}
      </text>
      <text 
        x={cx} 
        y={cy + 10} 
        textAnchor="middle" 
        fill="#666" 
        className="text-xs"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
      <text 
        x={cx} 
        y={cy + 25} 
        textAnchor="middle" 
        fill="#999" 
        className="text-xs"
      >
        {`Ratio: ${payload.value.toFixed(3)}`}
      </text>
    </g>
  );
};

export function InteractivePieChart({ markets, onRatioChange, height = 400 }: InteractivePieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempRatio, setTempRatio] = useState<string>('');

  // Prepare data for the pie chart
  const chartData = markets.map((market, index) => ({
    name: market.market_title,
    number: index + 1,  // Market number for display
    value: market.ratio,
    market_id: market.market_id,
    color: market.color || COLORS[index % COLORS.length],
  }));

  const totalRatio = markets.reduce((sum, m) => sum + m.ratio, 0);
  const isValidTotal = Math.abs(totalRatio - 1) < 0.001; // Allow for small floating point errors

  const handlePieClick = (data: any, index: number) => {
    setEditingIndex(index);
    setTempRatio(data.value.toFixed(3));
  };

  const handleRatioSubmit = (index: number) => {
    const newRatio = parseFloat(tempRatio);
    if (!isNaN(newRatio) && newRatio >= 0 && newRatio <= 1) {
      const market = markets[index];
      onRatioChange(market.market_id, newRatio);
    }
    setEditingIndex(null);
    setTempRatio('');
  };

  const distributeEvenly = () => {
    const evenRatio = 1 / markets.length;
    markets.forEach(market => {
      onRatioChange(market.market_id, evenRatio);
    });
  };

  const normalizeRatios = () => {
    if (totalRatio === 0) {
      distributeEvenly();
      return;
    }
    markets.forEach(market => {
      onRatioChange(market.market_id, market.ratio / totalRatio);
    });
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-gray-800">Market Ratios</h3>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isValidTotal 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            Total: {totalRatio.toFixed(3)} {isValidTotal ? '✓' : '(must = 1.000)'}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={distributeEvenly}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
          >
            Distribute Evenly
          </button>
          {!isValidTotal && (
            <button
              onClick={normalizeRatios}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
            >
              Normalize to 1.0
            </button>
          )}
        </div>
      </div>

      {markets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={handlePieClick}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                  labelFormatter={(label: any) => `Market ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    maxWidth: '250px'
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: data.color }}>
                              {data.number}
                            </span>
                            <span className="text-xs font-semibold text-gray-900">Market {data.number}</span>
                          </div>
                          <div className="text-xs text-gray-700 mb-1 break-words">{data.name}</div>
                          <div className="text-xs font-medium text-gray-900">
                            Ratio: {data.value.toFixed(3)} ({(data.value * 100).toFixed(1)}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-600 mb-2">
              Adjust market ratios:
            </div>
            {markets.map((market, index) => (
              <div 
                key={market.market_id} 
                className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200"
              >
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                  {index + 1}
                </span>
                <div className="flex items-center gap-2 flex-1">
                  {editingIndex === index ? (
                    <>
                      <input
                        type="number"
                        value={tempRatio}
                        onChange={(e) => setTempRatio(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleRatioSubmit(index);
                          }
                        }}
                        className="w-20 px-2 py-1 text-xs border border-blue-300 rounded text-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="0"
                        max="1"
                        step="0.001"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRatioSubmit(index)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setEditingIndex(null);
                          setTempRatio('');
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        value={market.ratio.toFixed(3)}
                        onChange={(e) => {
                          const newRatio = parseFloat(e.target.value);
                          if (!isNaN(newRatio) && newRatio >= 0 && newRatio <= 1) {
                            onRatioChange(market.market_id, newRatio);
                          }
                        }}
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded text-black font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                        min="0"
                        max="1"
                        step="0.001"
                      />
                      <span className="text-xs text-gray-700 font-medium">
                        ({(market.ratio * 100).toFixed(1)}%)
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No markets selected. Add markets to see the ratio distribution.</p>
        </div>
      )}
    </div>
  );
}