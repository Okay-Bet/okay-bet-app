"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

const formatXAxis = (tickItem: string) => format(parseISO(tickItem), "MMM dd");

export const TotalBetsChart: React.FC<{
  data: { date: string; totalBets: number }[];
}> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" tickFormatter={formatXAxis} />
      <YAxis />
      <Tooltip
        labelFormatter={(label) => format(parseISO(label), "MMM dd, yyyy")}
      />
      <Legend />
      <Line
        type="monotone"
        dataKey="totalBets"
        stroke="#8884d8"
        name="Total Bets"
      />
    </LineChart>
  </ResponsiveContainer>
);

export const CumulativeUniqueBettorsChart: React.FC<{
  data: { date: string; uniqueBettors: number }[];
}> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" tickFormatter={formatXAxis} />
      <YAxis />
      <Tooltip
        labelFormatter={(label) => format(parseISO(label), "MMM dd, yyyy")}
      />
      <Legend />
      <Line
        type="monotone"
        dataKey="uniqueBettors"
        stroke="#82ca9d"
        name="Cumulative Unique Bettors"
      />
    </LineChart>
  </ResponsiveContainer>
);

export const CumulativeWagersChart: React.FC<{
  data: { date: string; totalWagered: string }[];
}> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" tickFormatter={formatXAxis} />
      <YAxis />
      <Tooltip
        labelFormatter={(label) => format(parseISO(label), "MMM dd, yyyy")}
        formatter={(value: string) => [
          (BigInt(value) / BigInt(1e18)).toString(),
          "ETH",
        ]}
      />
      <Legend />
      <Line
        type="monotone"
        dataKey="totalWagered"
        stroke="#ffc658"
        name="Cumulative Wagers (ETH)"
      />
    </LineChart>
  </ResponsiveContainer>
);
