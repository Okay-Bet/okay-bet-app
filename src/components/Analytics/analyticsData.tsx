'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AnalyticsData {
  userCount: number;
  betCount: number;
  totalVolume: number;
  historicalData: Array<{
    date: string;
    betCount: number;
    volume: number;
  }>;
}

const MetricCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <div className="bg-white shadow rounded-lg p-4">
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

const AnalyticsPage: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        const data: AnalyticsData = await response.json();
        setAnalyticsData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!analyticsData) return null;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">OkayBet Analytics Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard title="Total Users" value={analyticsData.userCount} />
        <MetricCard title="Total Bets" value={analyticsData.betCount} />
        <MetricCard title="Total Volume" value={`${analyticsData.totalVolume.toFixed(2)} ETH`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Bets Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="betCount" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Volume Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="volume" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;