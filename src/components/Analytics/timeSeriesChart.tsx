// components/Analytics/timeSeriesChart.tsx
// renders a cumulative graph that's always up and to the right

"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

const formatXAxis = (tickItem: string) => format(parseISO(tickItem), "MMM dd");

const formatUsd = (value: number) => {
  return isNaN(value) ? "N/A" : `$${value.toFixed(2)}`;
};

const commonChartProps = {
  width: "100%",
  height: 300,
  margin: { top: 10, right: 30, left: 0, bottom: 0 },
};

const commonAreaProps = {
  strokeWidth: 2,
  fillOpacity: 0.3,
};

const CustomTooltip = ({ active, payload, label, valueFormatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 p-4 rounded shadow-lg">
        <p className="text-red-700">
          {format(parseISO(label), "MMMM d, yyyy")}
        </p>
        <p className="text-orange-500 font-bold">{`${
          payload[0].name
        }: ${valueFormatter(payload[0].value)}`}</p>
      </div>
    );
  }
  return null;
};

export const TotalBetsChart: React.FC<{
  data: { date: string; totalBets: number }[];
}> = ({ data }) => (
  <ResponsiveContainer {...commonChartProps}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="#9CA3AF" />
      <YAxis stroke="#9CA3AF" />
      <Tooltip
        content={<CustomTooltip valueFormatter={(value: number) => value} />}
      />
      <Area
        type="monotone"
        dataKey="totalBets"
        stroke="#8B5CF6"
        fill="#8B5CF6"
        name="Total Bets"
        {...commonAreaProps}
      />
    </AreaChart>
  </ResponsiveContainer>
);

export const CumulativeUniqueBettorsChart: React.FC<{
  data: { date: string; uniqueBettors: number }[];
}> = ({ data }) => (
  <ResponsiveContainer {...commonChartProps}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="#9CA3AF" />
      <YAxis stroke="#9CA3AF" />
      <Tooltip
        content={<CustomTooltip valueFormatter={(value: number) => value} />}
      />
      <Area
        type="monotone"
        dataKey="uniqueBettors"
        stroke="#EC4899"
        fill="#EC4899"
        name="Unique Bettors"
        {...commonAreaProps}
      />
    </AreaChart>
  </ResponsiveContainer>
);

export const CumulativeWagersChart: React.FC<{
  data: { date: string; totalWageredUsd: number }[];
}> = ({ data }) => (
  <ResponsiveContainer {...commonChartProps}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="date" tickFormatter={formatXAxis} stroke="#9CA3AF" />
      <YAxis stroke="#9CA3AF" />
      <Tooltip content={<CustomTooltip valueFormatter={formatUsd} />} />
      <Area
        type="monotone"
        dataKey="totalWageredUsd"
        stroke="#10B981"
        fill="#10B981"
        name="Total Wagered (USD)"
        {...commonAreaProps}
      />
    </AreaChart>
  </ResponsiveContainer>
);
