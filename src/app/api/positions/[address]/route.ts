// app/api/positions/[address]/route.ts
import { NextResponse } from "next/server";
import {
  Transfer,
  Position,
  LimitlessMarket,
  ExtendedSubgraphResponse,
} from "../../../../components/types";

const SUBGRAPH_URL = process.env.SUBGRAPH_URL;
const LIMITLESS_API_URL = "https://api.limitless.exchange/markets";

async function fetchTransferHistory(address: string) {
  console.log(`Fetching transfer history for address: ${address}`);
  const query = {
    query: `query getTradeHistory {
        incomingTransfers: ConditionalTokens_TransferSingle(
          where: {
            to: {_eq: "${address}"}
          }
        ) {
          id
          from
          to
          value
          event_id
        }
        outgoingTransfers: ConditionalTokens_TransferSingle(
          where: {
            from: {_eq: "${address}"}
          }
        ) {
          id
          from
          to
          value
          event_id
        }
      }`,
  };

  if (!SUBGRAPH_URL) {
    throw new Error("SUBGRAPH_URL is not defined");
  }

  const response = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error(`Subgraph request failed: ${response.statusText}`);
  }

  const data = (await response.json()) as ExtendedSubgraphResponse;

  console.log(`Raw transfer data:`, {
    incomingTransfersCount: data.data.incomingTransfers.length,
    outgoingTransfersCount: data.data.outgoingTransfers.length,
  });

  // Calculate balances by token ID
  const balances = new Map<string, string>();

  // Add incoming transfers
  data.data.incomingTransfers.forEach((transfer) => {
    console.log(`Processing incoming transfer:`, {
      id: transfer.id,
      from: transfer.from,
      value: transfer.value,
    });
    const currentBalance = BigInt(balances.get(transfer.id) || "0");
    balances.set(
      transfer.id,
      (currentBalance + BigInt(transfer.value)).toString()
    );
  });

  // Subtract outgoing transfers
  data.data.outgoingTransfers.forEach((transfer) => {
    console.log(`Processing outgoing transfer:`, {
      id: transfer.id,
      to: transfer.to,
      value: transfer.value,
    });
    const currentBalance = BigInt(balances.get(transfer.id) || "0");
    balances.set(
      transfer.id,
      (currentBalance - BigInt(transfer.value)).toString()
    );
  });

  console.log(`Final balances:`, Object.fromEntries(balances));

  // Return all transfers (both incoming and outgoing)
  return {
    transfers: [...data.data.incomingTransfers, ...data.data.outgoingTransfers],
    balances,
  };
}

async function fetchMarketData(
  marketAddress: string
): Promise<LimitlessMarket | null> {
  console.log(`Fetching market data for address: ${marketAddress}`);
  if (marketAddress === "0x0000000000000000000000000000000000000000") {
    return null;
  }
  try {
    const response = await fetch(`${LIMITLESS_API_URL}/${marketAddress}`, {
      headers: {
        accept: "*/*",
      },
    });

    if (!response.ok) {
      console.error(
        "Limitless API error:",
        response.status,
        response.statusText
      );
      return null;
    }

    const data = await response.json();
    console.log(`Market data received for ${marketAddress}:`, {
      conditionId: data.conditionId,
      title: data.title,
      status: data.status,
    });
    return data;
  } catch (error) {
    console.error("Error fetching market data:", error);
    return null;
  }
}

async function fetchMarketCreationData(marketAddresses: string[]) {
  console.log(`Fetching market creation data for addresses:`, marketAddresses);

  // Get condition IDs from market data first
  const conditionIds = await Promise.all(
    marketAddresses.map(async (addr) => {
      const marketData = await fetchMarketData(addr);
      return marketData?.conditionId.toLowerCase();
    })
  );
  console.log(`Resolved condition IDs:`, conditionIds);

  const validConditionIds = conditionIds.filter(Boolean) as string[];

  const query = {
    query: `
      query getParentCollectionIds($conditionIds: [String!]!) {
        ConditionalTokens_PositionSplit(
          where: {
            conditionId: {_in: $conditionIds}
          }
        ) {
          id
          conditionId
          parentCollectionId
        }
        ConditionalTokens_PayoutRedemption(
          where: {
            conditionId: {_in: $conditionIds}
          }
        ) {
          id
          conditionId
          parentCollectionId
        }
      }
    `,
    variables: {
      conditionIds: validConditionIds,
    },
  };

  const response = await fetch(SUBGRAPH_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(query),
  });

  const data = await response.json();

  // Create a map of condition ID to parent collection ID
  const finalParentCollectionIds = new Map<string, string | null>();

  // Process PositionSplit events
  if (data?.data?.ConditionalTokens_PositionSplit) {
    data.data.ConditionalTokens_PositionSplit.forEach((split: any) => {
      const conditionId = split.conditionId.toLowerCase();
      const parentCollectionId = split.parentCollectionId;

      if (
        !finalParentCollectionIds.has(conditionId) ||
        finalParentCollectionIds.get(conditionId) ===
          "0x0000000000000000000000000000000000000000000000000000000000000000"
      ) {
        finalParentCollectionIds.set(conditionId, parentCollectionId);
      }
    });
  }

  // Process PayoutRedemption events
  if (data?.data?.ConditionalTokens_PayoutRedemption) {
    data.data.ConditionalTokens_PayoutRedemption.forEach((redemption: any) => {
      const conditionId = redemption.conditionId.toLowerCase();
      const parentCollectionId = redemption.parentCollectionId;

      if (
        !finalParentCollectionIds.has(conditionId) ||
        finalParentCollectionIds.get(conditionId) ===
          "0x0000000000000000000000000000000000000000000000000000000000000000"
      ) {
        finalParentCollectionIds.set(conditionId, parentCollectionId);
      }
    });
  }
  console.log(
    `Final parent collection IDs:`,
    Object.fromEntries(finalParentCollectionIds)
  );

  return finalParentCollectionIds;
}

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;
    console.log(`Processing GET request for address: ${address}`);

    const userAddressLower = address.toLowerCase();
    const { transfers, balances } = await fetchTransferHistory(address);
    console.log(`Total transfers found:`, transfers.length);

    // Get unique market addresses
    const uniqueMarketAddresses = Array.from(
      new Set(
        transfers.map((transfer) =>
          transfer.to.toLowerCase() === userAddressLower
            ? transfer.from
            : transfer.to
        )
      )
    );
    console.log(`Unique market addresses:`, uniqueMarketAddresses);

    // Create market data map
    const marketDataMap = new Map();

    // Fetch both market data and creation data in parallel
    const [marketDataResponses, marketCreationData] = await Promise.all([
      Promise.all(uniqueMarketAddresses.map((addr) => fetchMarketData(addr))),
      fetchMarketCreationData(uniqueMarketAddresses),
    ]);

    // Populate market data map
    marketDataResponses.forEach((data, index) => {
      if (data) {
        marketDataMap.set(uniqueMarketAddresses[index].toLowerCase(), data);
      }
    });
    console.log(`Market data responses received:`, {
      totalResponses: marketDataResponses.length,
      validResponses: marketDataResponses.filter(Boolean).length,
    });
    const completed_orders: Position[] = transfers
      .map((transfer) => {
        const isReceivedToken = transfer.to.toLowerCase() === userAddressLower;
        const marketAddress = (
          isReceivedToken ? transfer.from : transfer.to
        ).toLowerCase();
        const marketData = marketDataMap.get(marketAddress);

        if (!marketData) return null;

        const position: Position = {
          condition_id: marketData.conditionId,
          token_id: marketData.address,
          parent_collection_id:
            marketCreationData.get(marketData.conditionId.toLowerCase()) ??
            undefined,
          balance: Number(transfer.value),
          current_balance: Number(balances.get(transfer.id) || "0"),
          outcome: isReceivedToken ? 1 : 0,
          status: marketData.status.toLowerCase(),
          expiration_timestamp: marketData.expirationTimestamp,
          user_address: address,
          transaction_hash: transfer.id.split("_")[1],
          market_data: {
            question: marketData.title,
            description: marketData.description,
            outcomes: JSON.stringify(["No", "Yes"]),
            volume: marketData.volumeFormatted,
            liquidity: marketData.liquidityFormatted,
            status: marketData.status,
            collateral_token: marketData.collateralToken,
            contract: {
              address: marketData.address, // Using the market's address for the contract address
            },
          },
        };

        console.log(`Created position:`, {
          condition_id: position.condition_id,
          token_id: position.token_id,
          outcome: position.outcome,
          balance: position.balance,
          current_balance: position.current_balance,
        });
        return position;
      })
      .filter(Boolean) as Position[];

    console.log(`Final completed orders count:`, completed_orders.length);

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
