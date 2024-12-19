// app/api/delegated-sell/route.ts
import { NextResponse } from "next/server";

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL || "http://167.71.208.166:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Input is token amount
    const rawTokenAmount = Number(body.amount);
    const humanTokenAmount = rawTokenAmount / 1_000_000; // e.g., 11.863635 tokens
    const usdcDesired = humanTokenAmount * body.price; // e.g., 11.863635 * 0.425
    const scaledUsdcAmount = Math.floor(usdcDesired * 1_000_000); // Scale to USDC base units

    console.log("Processing sell order:", {
      rawTokenAmount,
      humanTokenAmount,
      price: body.price,
      usdcDesired,
      scaledUsdcAmount,
    });

    // First validate with token amount
    const validationBody = {
      user_address: body.user_address,
      token_id: body.token_id,
      side: "SELL",
      is_yes_token: body.is_yes_token,
      price: body.price,
      amount: body.amount, // Raw token amount
    };

    console.log("Sending validation request:", validationBody);
    const validationResponse = await fetch(
      `${FASTAPI_BASE_URL}/api/validate-sell`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationBody),
      }
    );

    if (!validationResponse.ok) {
      const errorText = await validationResponse.text();
      console.error("Validation failed:", errorText);
      return NextResponse.json(
        { error: "Order validation failed" },
        { status: validationResponse.status }
      );
    }

    const validationData = await validationResponse.json();
    console.log("Validation response data:", validationData);

    // Check if validation was successful
    // Check liquidity
    const hasLiquidity =
      validationData.market_info.available_liquidity > 0 ||
      (validationData.split_orders && validationData.split_orders.length > 0);

    if (validationData.valid && hasLiquidity) {
      console.log("Validation passed, proceeding with order", {
        liquidity: validationData.market_info.available_liquidity,
        bestBid: validationData.market_info.best_bid,
        requestedPrice: body.price,
      });
    } else {
      console.log("Validation failed:", {
        valid: validationData.valid,
        hasLiquidity,
        marketInfo: validationData.market_info,
        details: validationData,
      });

      let errorMessage = "Validation failed";
      if (!hasLiquidity) {
        errorMessage = `Insufficient liquidity at price ${body.price}. Best bid is ${validationData.market_info.best_bid}`;
      } else if (validationData.status === "dust_position") {
        errorMessage = `Position too small. Minimum size is ${validationData.dust_threshold} tokens`;
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: validationData,
        },
        { status: 400 }
      );
    }

    // If validation passed, execute sell with USDC amount
    const formattedBody = {
      user_address: body.user_address,
      token_id: body.token_id,
      side: "SELL",
      is_yes_token: body.is_yes_token,
      price: body.price,
      amount: scaledUsdcAmount, // Send expected USDC amount
    };

    console.log("Executing sell order:", {
      ...formattedBody,
      originalTokenAmount: rawTokenAmount,
      humanTokenAmount,
      usdcDesired,
      scaledUsdcAmount,
    });

    const sellResponse = await fetch(`${FASTAPI_BASE_URL}/api/delegated-sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formattedBody),
    });

    if (!sellResponse.ok) {
      const errorText = await sellResponse.text();
      console.error("Sell execution failed:", {
        status: sellResponse.status,
        errorText,
        sentAmount: formattedBody.amount,
        rawAmount: body.amount,
      });

      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(
          {
            error:
              errorData.detail ||
              errorData.error ||
              "Failed to execute sell order",
          },
          { status: sellResponse.status }
        );
      } catch {
        return NextResponse.json(
          { error: errorText || "Server error" },
          { status: sellResponse.status }
        );
      }
    }

    const data = await sellResponse.json();
    console.log("Successful sell execution:", data);

    return NextResponse.json({
      ...data,
      amounts: {
        tokens: humanTokenAmount,
        usdc: usdcDesired,
        scaledUsdc: scaledUsdcAmount,
      },
    });
  } catch (error) {
    console.error("NextJS route error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
