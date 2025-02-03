// app/api/across-quote/route.ts
import { NextResponse } from "next/server";

interface AcrossQuoteRequest {
  originChainId: number;
  destinationChainId: number;
  inputToken: `0x${string}`;
  outputToken: `0x${string}`;
  amount: string;
  recipient: `0x${string}`;
  message?: string;
}

interface AcrossQuoteResponse {
  totalRelayFee: {
    pct: string;
    total: string;
  };
  relayerCapitalFee: {
    pct: string;
    total: string;
  };
  relayerGasFee: {
    pct: string;
    total: string;
  };
  lpFee: {
    pct: string;
    total: string;
  };
  timestamp: string;
  isAmountTooLow: boolean;
  quoteBlock: string;
  spokePoolAddress: string;
  exclusiveRelayer: string;
  exclusivityDeadline: string;
  expectedFillTimeSec: string;
  fillDeadline: string;
  limits: {
    minDeposit: number;
    maxDeposit: number;
    maxDepositInstant: number;
    maxDepositShortDelay: number;
    recommendedDepositInstant: number;
  };
}

export async function POST(request: Request) {
  try {
    const requestData = await request.json();

    // Ensure proper formatting of numeric values
    const amount = requestData.inputAmount;

    // Format chain IDs as integers
    const originChainId = parseInt(requestData.originChainId);
    const destinationChainId = parseInt(requestData.destinationChainId);

    // Build the query parameters
    const params = new URLSearchParams({
      originChainId: originChainId.toString(),
      destinationChainId: destinationChainId.toString(),
      inputToken: requestData.inputToken,
      outputToken: requestData.outputToken,
      amount: amount,
      recipient: requestData.recipient,
    });

    // Only add message if it exists and is properly formatted
    if (requestData.message && requestData.message.startsWith("0x")) {
      params.append("message", requestData.message);
    }

    const apiUrl = new URL("https://app.across.to/api/suggested-fees");
    apiUrl.search = params.toString();


    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Across API error:", {
        status: response.status,
        data: responseData,
        requestParams: Object.fromEntries(params.entries()),
      });
      return NextResponse.json(responseData, { status: response.status });
    }

    const data: AcrossQuoteResponse = responseData;

    // Transform the response to match frontend expectations
    const transformedResponse = {
      inputToken: requestData.inputToken,
      outputToken: requestData.outputToken,
      inputAmount: amount,
      outputAmount: (
        BigInt(amount) - BigInt(data.totalRelayFee.total)
      ).toString(),
      relayerFeePct: data.totalRelayFee.pct,
      timestamp: parseInt(data.timestamp),
      destinationChainId,
      originChainId,
      recipient: requestData.recipient,
      message: requestData.message,
      fillDeadline: data.fillDeadline,
      exclusiveRelayer: data.exclusiveRelayer,
      exclusivityDeadline: data.exclusivityDeadline,
    };

    return NextResponse.json(transformedResponse);
  } catch (error) {
    console.error("Error in quote API:", error);
    return NextResponse.json(
      {
        type: "InternalError",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
