// app/api/positions/[address]/route.ts
import { NextResponse } from "next/server";
import { SubgraphService } from "../../../../services/subgraph.service";
import { LimitlessService } from "../../../../services/limitless.service";
import { PositionService } from "../../../../services/position.service";

const SUBGRAPH_URL = process.env.SUBGRAPH_URL;
const LIMITLESS_API_URL = "https://api.limitless.exchange/markets";

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;
    console.log(`Processing GET request for address: ${address}`);

    // Initialize services
    const subgraphService = new SubgraphService(SUBGRAPH_URL!);
    const limitlessService = new LimitlessService(LIMITLESS_API_URL);
    const positionService = new PositionService();

    // Fetch transfer history
    const { transfers, balances, buyTrades, sellTrades } =
      await subgraphService.fetchTransferHistory(address);

    // Process trades
    const tradesByMarket = new Map();
    [...buyTrades, ...sellTrades].forEach((trade: any) => {
      tradesByMarket.set(
        trade.id.split("_")[0].toLowerCase(),
        Number(trade.outcomeIndex)
      );
    });

    // Get unique market addresses
    const uniqueMarketAddresses = Array.from(
      new Set(
        transfers.map((transfer) =>
          transfer.to.toLowerCase() === address.toLowerCase()
            ? transfer.from
            : transfer.to
        )
      )
    );

    // Fetch market data and creation data
    const marketDataMap = new Map();
    const marketDataResponses = await Promise.all(
      uniqueMarketAddresses.map((addr) => limitlessService.fetchMarketData(addr))
    );

    const conditionIds = marketDataResponses
      .filter(Boolean)
      .map((data) => data?.conditionId.toLowerCase());

    const marketCreationData = await subgraphService.fetchMarketCreationData(
      uniqueMarketAddresses,
      conditionIds
    );

    // Populate market data map
    marketDataResponses.forEach((data, index) => {
      if (data) {
        marketDataMap.set(uniqueMarketAddresses[index].toLowerCase(), data);
      }
    });

    // Process positions
    const completed_orders = positionService.processPositions(
      transfers,
      address,
      balances,
      marketDataMap,
      tradesByMarket,
      marketCreationData
    );

    return NextResponse.json(
      {
        pending_orders: [],
        completed_orders,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}