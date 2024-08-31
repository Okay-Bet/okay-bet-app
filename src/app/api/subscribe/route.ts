import { NextResponse } from 'next/server';
import webpush from 'web-push';

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey!,
  vapidKeys.privateKey!
);

export async function POST(request: Request) {
  const subscription = await request.json();
  
  console.log('Received subscription:', subscription);

  const payload = JSON.stringify({
    title: 'Welcome to Okay Bet!',
    body: 'You have successfully subscribed to push notifications.',
  });

  try {
    console.log('Sending welcome notification...');
    const result = await webpush.sendNotification(subscription, payload);
    console.log('Welcome notification sent successfully', result);
    return NextResponse.json({ status: 'success' }, { status: 201 });
  } catch (error) {
    console.error('Error sending welcome notification:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to send welcome notification', error: error.toString() }, { status: 500 });
  }
}