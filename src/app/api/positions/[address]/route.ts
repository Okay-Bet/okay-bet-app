// app/api/positions/[address]/route.ts
import { NextResponse } from "next/server";

const SUBGRAPH_URL = process.env.SUBGRAPH_URL;
const LIMITLESS_API_URL = "https://api.limitless.exchange/markets";

interface Transfer {
  id: string;
  from: string;
  to: string;
  value: string;
  event_id: string;
}

interface LimitlessMarket {
  address: string;
  conditionId: string;
  title: string;
  description: string;
  status: string;
  winningOutcomeIndex: number | null;
  openInterest: string;
  openInterestFormatted: string;
  volume: string;
  volumeFormatted: string;
  liquidity: string;
  liquidityFormatted: string;
  expirationTimestamp: number;
  collateralToken: {
    address: string;
    decimals: number;
    symbol: string;
  };
}

interface Position {
  condition_id: string;
  token_id: string;
  balance: number;
  current_balance: number; // Add this field
  outcome: number;
  status: string;
  expiration_timestamp: number;
  user_address: string;
  transaction_hash: string;
  is_winner?: boolean;
  market_data: {
    question: string;
    description: string;
    outcomes: string;
    volume: string;
    liquidity: string;
    status: string;
    winning_outcome?: number;
    collateral_token: {
      address: string;
      decimals: number;
      symbol: string;
    };
  };
}

interface ExtendedSubgraphResponse {
  data: {
    incomingTransfers: Transfer[];
    outgoingTransfers: Transfer[];
  };
}

async function fetchTransferHistory(address: string) {
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

  // Calculate balances by token ID
  const balances = new Map<string, string>();

  // Add incoming transfers
  data.data.incomingTransfers.forEach((transfer) => {
    const currentBalance = BigInt(balances.get(transfer.id) || "0");
    balances.set(
      transfer.id,
      (currentBalance + BigInt(transfer.value)).toString()
    );
  });

  // Subtract outgoing transfers
  data.data.outgoingTransfers.forEach((transfer) => {
    const currentBalance = BigInt(balances.get(transfer.id) || "0");
    balances.set(
      transfer.id,
      (currentBalance - BigInt(transfer.value)).toString()
    );
  });

  // Return all transfers (both incoming and outgoing)
  return {
    transfers: [...data.data.incomingTransfers, ...data.data.outgoingTransfers],
    balances,
  };
}

async function fetchMarketData(
  marketAddress: string
): Promise<LimitlessMarket | null> {
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

    return await response.json();
  } catch (error) {
    console.error("Error fetching market data:", error);
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;
    const userAddressLower = address.toLowerCase();

    const { transfers, balances } = await fetchTransferHistory(address);

    // Get unique market addresses to avoid duplicate fetches
    const uniqueMarketAddresses = new Set(
      transfers.map((transfer) => {
        // For incoming transfers, the 'from' address is the market
        // For outgoing transfers, the 'to' address is the market
        return transfer.to.toLowerCase() === userAddressLower
          ? transfer.from
          : transfer.to;
      })
    );

    // Fetch market data for unique addresses
    const marketDataMap = new Map();
    await Promise.all(
      Array.from(uniqueMarketAddresses).map(async (marketAddress) => {
        const data = await fetchMarketData(marketAddress);
        if (data) {
          marketDataMap.set(marketAddress.toLowerCase(), data);
        }
      })
    );

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
          token_id: transfer.id,
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
          },
        };

        if (
          marketData.status === "RESOLVED" &&
          marketData.winningOutcomeIndex !== null
        ) {
          position.is_winner =
            position.outcome === marketData.winningOutcomeIndex;
          position.market_data.winning_outcome = marketData.winningOutcomeIndex;
        }

        return position;
      })
      .filter(Boolean) as Position[];

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

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}
