// src/pages/api/registerUsername/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    const { username, walletAddress } = await req.json();

    if (!username || !walletAddress) {
      return NextResponse.json({ error: 'Username and wallet address are required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO users (username, wallet_address)
      VALUES (${username}, ${walletAddress})
      RETURNING *
    `;

    return NextResponse.json({ message: 'Registration successful', user: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error during registration:', error); // Log any errors
    return NextResponse.json({ error: 'An error occurred during registration.' }, { status: 500 });
  }
}

