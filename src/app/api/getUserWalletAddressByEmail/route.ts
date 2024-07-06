// /src/pages/api/getUserWalletAddressByEmail/route.ts
import { NextResponse } from 'next/server';

const THIRD_WEB_CLIENT_SECRET = process.env.SECRET_KEY;

export async function POST(request: Request) {
  const { email } = await request.json();
  
  console.log("Received request with email:", email);

  if (!email) {
    console.log("Missing required parameter: email");
    return NextResponse.json({ message: 'Missing required parameter: email' }, { status: 400 });
  }

  const url = new URL(
    "https://embedded-wallet.thirdweb.com/api/2023-11-30/embedded-wallet/user-details"
  );

  url.searchParams.set("queryBy", "email");
  url.searchParams.set("email", email);

  try {
    console.log("Fetching data from Thirdweb API with URL:", url.href);
    const response = await fetch(url.href, {
      headers: {
        Authorization: `Bearer ${THIRD_WEB_CLIENT_SECRET}`,
      },
    });

    if (!response.ok) {
      console.log(`Failed to fetch wallet metadata: ${response.statusText}`);
      throw new Error('Failed to fetch wallet metadata');
    }

    const data = await response.json();
    console.log("Fetched data successfully:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching wallet address by email:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
