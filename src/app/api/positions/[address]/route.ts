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

interface SubgraphResponse {
  data: {
    singleTransfers: Transfer[];
  };
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
  // Core trade data
  condition_id: string;
  token_id: string;
  balance: number;
  outcome: number; // 0 for No, 1 for Yes
  is_winner?: boolean; // For resolved markets

  // Market status
  status: string;
  expiration_timestamp: number;

  // User info
  user_address: string;
  transaction_hash: string;

  // Market data
  market_data: {
    question: string;
    description: string;
    outcomes: string; // JSON stringified ['No', 'Yes']
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

async function fetchTransferHistory(address: string): Promise<Transfer[]> {
  const query = {
    query: `query getTradeHistory {
      singleTransfers: ConditionalTokens_TransferSingle(
        where: {
          _or: [
            {from: {_eq: "${address}"}},
            {to: {_eq: "${address}"}}
          ]
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

  const data = (await response.json()) as SubgraphResponse;
  return data.data.singleTransfers;
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

    const transfers = await fetchTransferHistory(address);
    const marketPromises = transfers.map((transfer) => {
      const marketAddress =
        transfer.from.toLowerCase() === userAddressLower
          ? transfer.to
          : transfer.from;
      return fetchMarketData(marketAddress);
    });

    const marketDataResults = await Promise.all(marketPromises);

    const completed_orders: Position[] = transfers
      .map((transfer, index) => {
        const marketData = marketDataResults[index];
        const isReceivedToken = transfer.to.toLowerCase() === userAddressLower;

        if (!marketData) return null;

        const position: Position = {
          condition_id: marketData.conditionId,
          token_id: transfer.id,
          balance: Number(transfer.value),
          outcome: isReceivedToken ? 1 : 0,
          status: marketData.status.toLowerCase(),
          expiration_timestamp: marketData.expirationTimestamp,
          user_address: address,
          transaction_hash: transfer.id.split("_")[1], // Assuming format includes tx hash

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

        // Add resolved market specific data
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
