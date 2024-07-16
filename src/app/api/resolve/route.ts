// src/app/api/resolve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const walletAddress = searchParams.get('walletAddress');

  try {
    if (username) {
      // Resolve username to wallet address
      const result = await sql`
        SELECT wallet_address 
        FROM users 
        WHERE username = ${username};
      `;
      if (result.rows.length > 0) {
        return NextResponse.json({ walletAddress: result.rows[0].wallet_address }, { status: 200 });
      } else {
        return NextResponse.json({ message: 'Username not found' }, { status: 404 });
      }
    } else if (walletAddress) {
      // Resolve wallet address to username
      const result = await sql`
        SELECT username 
        FROM users 
        WHERE wallet_address = ${walletAddress};
      `;
      if (result.rows.length > 0) {
        return NextResponse.json({ username: result.rows[0].username }, { status: 200 });
      } else {
        return NextResponse.json({ message: 'Wallet address not found' }, { status: 404 });
      }
    } else {
      return NextResponse.json({ message: 'Missing query parameter' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
