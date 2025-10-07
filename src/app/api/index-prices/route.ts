import { NextRequest, NextResponse } from 'next/server';
import { spmcClient } from '@/services/spmc/client';
import { calculateIndexPrice, validateMarketsForPricing } from '@/services/spmc/indexPrices.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    // Fetch group details from SPMC
    const groupResponse = await spmcClient.getGroup(groupId);

    if (!groupResponse.success || !groupResponse.data) {
      return NextResponse.json(
        { error: 'Failed to fetch group details' },
        { status: 500 }
      );
    }

    const group = groupResponse.data;

    if (!group.markets || group.markets.length === 0) {
      return NextResponse.json({
        groupId,
        groupTitle: group.title,
        currentPrice: null,
        markets: [],
        validMarketsCount: 0,
        totalMarketsCount: 0,
        timestamp: new Date().toISOString(),
        error: 'No markets found in group'
      }, { status: 404 });
    }

    // Validate markets before processing
    const validation = validateMarketsForPricing(group.markets);
    if (!validation.valid) {
      return NextResponse.json({
        groupId,
        groupTitle: group.title,
        currentPrice: null,
        markets: [],
        validMarketsCount: 0,
        totalMarketsCount: group.markets.length,
        timestamp: new Date().toISOString(),
        error: 'Invalid market data',
        validationErrors: validation.errors
      }, { status: 400 });
    }

    // Calculate index price using SPMC batch pricing
    const indexPriceData = await calculateIndexPrice(group.markets);

    // Format response
    return NextResponse.json({
      groupId,
      groupTitle: group.title,
      currentPrice: indexPriceData.currentPrice,
      markets: indexPriceData.markets.map(m => ({
        id: m.id,
        platform: m.platform,
        weight: m.weight,
        outcome: m.outcome,
        currentPrice: m.currentPrice,
        bid: m.bid,
        ask: m.ask,
        last: m.last,
        mid: m.mid
      })),
      validMarketsCount: indexPriceData.validMarketsCount,
      totalMarketsCount: indexPriceData.totalMarketsCount,
      totalWeight: indexPriceData.totalWeight,
      timestamp: indexPriceData.timestamp,
      // Include warning if not all markets have prices
      warning: indexPriceData.validMarketsCount < indexPriceData.totalMarketsCount
        ? `Only ${indexPriceData.validMarketsCount} of ${indexPriceData.totalMarketsCount} markets have valid prices`
        : undefined
    });

  } catch (error) {
    console.error('Error fetching index prices:', error);
    return NextResponse.json({
      error: 'Failed to fetch index prices',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

