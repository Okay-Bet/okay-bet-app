import { NextRequest, NextResponse } from 'next/server';
import { spmcClient } from '@/services/spmc/client';
import { calculateIndexPrice, validateMarketsForPricing } from '@/services/spmc/indexPrices.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get('groupId');

    // If no groupId provided, return aggregated price across all active indexes
    if (!groupId) {
      return getAggregatedIndexPrice();
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

/**
 * Get aggregated price across all active index funds
 */
async function getAggregatedIndexPrice() {
  try {
    // Fetch all groups from SPMC
    const groupsResponse = await spmcClient.listGroups({
      limit: 100,
      group_type: 'index'
    });

    if (!groupsResponse.success || !groupsResponse.data) {
      return NextResponse.json({
        error: 'Failed to fetch groups from SPMC'
      }, { status: 500 });
    }

    const { groups } = groupsResponse.data;

    // Filter to only index type groups (regardless of fund deployment)
    const activeIndexes = groups.filter(group => group.group_type === 'index');

    if (activeIndexes.length === 0) {
      return NextResponse.json({
        averagePrice: null,
        indexes: [],
        count: 0,
        timestamp: new Date().toISOString(),
        message: 'No active indexes found'
      });
    }

    // Calculate price for each index
    const indexPrices = await Promise.all(
      activeIndexes.map(async (group) => {
        try {
          // Fetch full group details with markets
          const detailResponse = await spmcClient.getGroup(group.id);

          if (!detailResponse.success || !detailResponse.data) {
            return null;
          }

          const groupDetails = detailResponse.data;

          if (!groupDetails.markets || groupDetails.markets.length === 0) {
            return null;
          }

          // Calculate index price
          const priceData = await calculateIndexPrice(groupDetails.markets);

          if (priceData.currentPrice === null || priceData.currentPrice === 0) {
            return null;
          }

          return {
            groupId: group.id,
            title: group.title,
            price: priceData.currentPrice,
            marketCount: priceData.validMarketsCount
          };
        } catch (err) {
          console.error(`Error calculating price for group ${group.id}:`, err);
          return null;
        }
      })
    );

    // Filter out failed calculations
    const validIndexPrices = indexPrices.filter(p => p !== null) as Array<{
      groupId: string;
      title: string;
      price: number;
      marketCount: number;
    }>;

    if (validIndexPrices.length === 0) {
      return NextResponse.json({
        averagePrice: null,
        indexes: [],
        count: 0,
        timestamp: new Date().toISOString(),
        error: 'No valid index prices available'
      });
    }

    // Calculate simple average (equal weighting across indexes)
    const averagePrice = validIndexPrices.reduce((sum, idx) => sum + idx.price, 0) / validIndexPrices.length;

    return NextResponse.json({
      averagePrice,
      indexes: validIndexPrices,
      count: validIndexPrices.length,
      totalIndexes: activeIndexes.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching aggregated index price:', error);
    return NextResponse.json({
      error: 'Failed to fetch aggregated index price',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

