// app/api/validate-order/route.ts
import { NextResponse } from "next/server";

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || "http://167.71.208.166:8000";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("Validating order:", body);

        // Validate required fields
        const requiredFields = [
            "user_address",
            "token_id",
            "price",
            "amount",
            "side",
            "is_yes_token",
        ];
        
        for (const field of requiredFields) {
            if (!(field in body)) {
                console.error(`Missing required field: ${field}`);
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Forward validation request to FastAPI
        const response = await fetch(`${FASTAPI_BASE_URL}/api/validate-order`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("FastAPI validation error:", errorText);
            try {
                const errorData = JSON.parse(errorText);
                return NextResponse.json(
                    { error: errorData.detail || "Failed to validate order" },
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
        return NextResponse.json(data);
    } catch (error) {
        console.error("NextJS validation error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 }
        );
    }
}