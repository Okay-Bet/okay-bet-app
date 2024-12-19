// app/api/delegated-sell/route.ts
import { NextResponse } from "next/server";

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL || "http://167.71.208.166:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Raw incoming order:", {
      ...body,
      rawAmount: body.amount,
      amountType: typeof body.amount,
    });

    // Calculate USDC desired from tokens and price
    const rawTokenAmount = Number(body.amount); // This is the raw token amount (e.g. 162970000)
    const tokenAmount = rawTokenAmount / 1_000_000; // Convert to human tokens (e.g. 162.97)
    const usdcDesired = tokenAmount * body.price; // Calculate USDC value
    const scaledUsdcAmount = Math.floor(usdcDesired * 1_000_000); // Scale back to server format

    const formattedBody = {
      user_address: body.user_address,
      token_id: body.token_id,
      side: "SELL",
      is_yes_token: body.is_yes_token,
      price: body.price,
      amount: scaledUsdcAmount, // Send USDC amount, not token amount
    };

    console.log("Sending formatted order to FastAPI:", {
      ...formattedBody,
      originalTokenAmount: rawTokenAmount,
      humanTokenAmount: tokenAmount,
      usdcDesired,
      scaledUsdcAmount,
    });

    const response = await fetch(`${FASTAPI_BASE_URL}/api/delegated-sell`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FastAPI error response:", {
        status: response.status,
        errorText,
        sentAmount: formattedBody.amount,
        rawAmount: body.amount,
        bodyString: JSON.stringify(formattedBody),
      });

      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(
          {
            error:
              errorData.detail ||
              errorData.error ||
              "Failed to submit sell order",
          },
          { status: response.status }
        );
      } catch {
        return NextResponse.json(
          { error: errorText || "Server error" },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    console.log("Successful response from FastAPI:", data);
    return NextResponse.json(data);
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
