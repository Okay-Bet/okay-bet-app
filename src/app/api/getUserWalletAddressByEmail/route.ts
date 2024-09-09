// /src/pages/api/getUserWalletAddressByEmail/route.ts
import { NextResponse } from 'next/server';

const THIRD_WEB_CLIENT_SECRET = process.env.SECRET_KEY;

export async function POST(request: Request) {
  const { email } = await request.json();
  

  if (!email) {
    return NextResponse.json({ message: 'Missing required parameter: email' }, { status: 400 });
  }

  const url = new URL(
    "https://embedded-wallet.thirdweb.com/api/2023-11-30/embedded-wallet/user-details"
  );

  url.searchParams.set("queryBy", "email");
  url.searchParams.set("email", email);

  try {
    const response = await fetch(url.href, {
      headers: {
        Authorization: `Bearer ${THIRD_WEB_CLIENT_SECRET}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch wallet metadata');
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return NextResponse.json({ walletAddress: data[0].walletAddress });
    }

    return NextResponse.json({ message: 'Wallet address not found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching wallet address by email:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
