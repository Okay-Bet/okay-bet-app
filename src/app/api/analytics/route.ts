// app/api/analytics/route.ts

import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import 


// Replace with your actual contract address and ABI
const FACTORY_ADDRESS = '0x50EB806Cbf052c4AD4D4862d36991769fBE397De';
const FACTORY_ABI = [
  // Add your contract ABI here
  "event BetCreated(address indexed betAddress, address indexed maker, address indexed taker, address judge, uint256 totalWager, uint256 wagerRatio, string conditions, uint256 expirationBlock, address wagerCurrency)"
] as const;

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

export async function GET() {
  try {
    // Fetch events from the last 30 days
    const currentBlock = await provider.getBlockNumber();
    const blocksPerDay = 86400 / 2; // Assuming 2-second block time on Base
    const fromBlock = currentBlock - (30 * blocksPerDay);

    const filter = factoryContract.filters.BetCreated();
    const events = await factoryContract.queryFilter(filter, fromBlock, 'latest');

    const users = new Set<string>();
    let totalVolume = ethers.getBigInt(0);
    const dailyData: Record<string, { betCount: number; volume: bigint }> = {};

    events.forEach(event => {
      const { maker, taker, totalWager } = event.args;
      const timestamp = new Date((event.block?.timestamp || 0) * 1000).toDateString();

      users.add(maker);
      users.add(taker);
      totalVolume += totalWager;

      if (!dailyData[timestamp]) {
        dailyData[timestamp] = { betCount: 0, volume: ethers.getBigInt(0) };
      }
      dailyData[timestamp].betCount += 1;
      dailyData[timestamp].volume += totalWager;
    });

    const historicalData = Object.entries(dailyData).map(([date, data]) => ({
      date,
      betCount: data.betCount,
      volume: parseFloat(ethers.formatEther(data.volume))
    }));

    return NextResponse.json({
      userCount: users.size,
      betCount: events.length,
      totalVolume: parseFloat(ethers.formatEther(totalVolume)),
      historicalData: historicalData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}