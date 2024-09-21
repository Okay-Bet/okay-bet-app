// pages/api/analytics.js
import { ethers } from 'ethers';

const FACTORY_ADDRESS = '0x...';
const FACTORY_ABI = [...];

export default async function handler(req, res) {
  try {
    // Connect to the Base chain
    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
    const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

    // Fetch data from the blockchain
    const filter = factoryContract.filters.BetCreated();
    const events = await factoryContract.queryFilter(filter);

    const users = new Set();
    let totalVolume = ethers.BigNumber.from(0);

    const historicalData = events.map(event => {
      const { maker, taker, totalWager } = event.args;
      users.add(maker);
      users.add(taker);
      totalVolume = totalVolume.add(totalWager);

      return {
        timestamp: event.block.timestamp,
        betCount: events.length,
        userCount: users.size,
        volume: ethers.utils.formatEther(totalVolume)
      };
    });

    res.status(200).json({
      userCount: users.size,
      betCount: events.length,
      totalVolume: ethers.utils.formatEther(totalVolume),
      historicalData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}

// components/MetricCard.js
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const MetricCard = ({ title, value }) => (
  <Card>
    <CardHeader>{title}</CardHeader>
    <CardContent className="text-3xl font-bold">{value}</CardContent>
  </Card>
);

// components/BetsOverTimeChart.js
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const BetsOverTimeChart = ({ data }) => (
  <Card>
    <CardHeader>Bets Over Time</CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tickFormatter={(timestamp) => new Date(timestamp * 1000).toLocaleDateString()} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="betCount" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

// components/VolumeOverTimeChart.js
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const VolumeOverTimeChart = ({ data }) => (
  <Card>
    <CardHeader>Volume Over Time</CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tickFormatter={(timestamp) => new Date(timestamp * 1000).toLocaleDateString()} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="volume" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

// pages/analytics.js
import { useState, useEffect } from 'react';
import MetricCard from '../components/MetricCard';
import BetsOverTimeChart from '../components/BetsOverTimeChart';
import VolumeOverTimeChart from '../components/VolumeOverTimeChart';

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/analytics');
        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      }
    };

    fetchData();
  }, []);

  if (!analyticsData) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">OkayBet Analytics Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard title="Total Users" value={analyticsData.userCount} />
        <MetricCard title="Total Bets" value={analyticsData.betCount} />
        <MetricCard title="Total Volume" value={`${analyticsData.totalVolume} ETH`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BetsOverTimeChart data={analyticsData.historicalData} />
        <VolumeOverTimeChart data={analyticsData.historicalData} />
      </div>
    </div>
  );
}