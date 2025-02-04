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

    // Initialize services
    const subgraphService = new SubgraphService(SUBGRAPH_URL!);
    const limitlessService = new LimitlessService(LIMITLESS_API_URL);
    const positionService = new PositionService();

    // Fetch transfer history with position outcomes and redemptions
    const {
      transfers,
      balances,
      positionOutcomes,
      marketInfo,
      redeemedConditions,
    } = await subgraphService.fetchTransferHistory(address);


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
      uniqueMarketAddresses.map((addr) =>
        limitlessService.fetchMarketData(addr)
      )
    );

    const conditionIds = marketDataResponses
      .filter(
        (response): response is NonNullable<typeof response> =>
          response !== null &&
          response !== undefined &&
          typeof response.conditionId === "string"
      )
      .map((data) => data.conditionId.toLowerCase());

    const marketCreationData = await subgraphService.fetchMarketCreationData(
      uniqueMarketAddresses,
      conditionIds
    );

    marketDataResponses.forEach((data, index) => {
      if (data && uniqueMarketAddresses[index]) {
        marketDataMap.set(uniqueMarketAddresses[index].toLowerCase(), data);
      }
    });

    // Process positions with position outcomes and redemption data
    const completed_orders = positionService.processPositions(
      transfers,
      address,
      balances,
      marketDataMap,
      positionOutcomes,
      marketCreationData,
      redeemedConditions
    );

    // console.log("Transfer Data Debug:", {
    //   transfersCount: transfers.length,
    //   sampleTransfers: transfers.slice(0, 3),
    //   positionOutcomesMap: Object.fromEntries(positionOutcomes),
    //   balancesMap: Object.fromEntries(balances),
    //   marketInfoSize: marketInfo.size
    // });

    // Count redeemable positions
    const redeemablePositions = completed_orders.filter(
      (order) =>
        order.status.toUpperCase() === "RESOLVED" &&
        order.position_result === "won" &&
        !order.isRedeemed &&
        order.current_balance > 0
    ).length;

    return NextResponse.json(
      {
        pending_orders: [],
        completed_orders,
        redeemable_count: redeemablePositions,
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
