import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const subscription = await request.json();
  
  // Here you would typically remove the subscription from your database
  console.log('Removing subscription:', subscription);
  // Implement your logic to remove the subscription from your database

  return NextResponse.json({ status: 'success' }, { status: 200 });
}