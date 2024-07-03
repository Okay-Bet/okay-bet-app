import { NextResponse } from 'next/server';

const THIRD_WEB_CLIENT_SECRET = process.env.SECRET_KEY;

export async function POST(request: Request) {
  const { queryBy, value } = await request.json();

  if (!queryBy || !value) {
    return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
  }

  const url = new URL(
    "https://embedded-wallet.thirdweb.com/api/2023-11-30/embedded-wallet/user-details"
  );

  url.searchParams.set("queryBy", queryBy);
  url.searchParams.set(queryBy, value);

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
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}