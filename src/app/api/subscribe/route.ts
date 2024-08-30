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
  
  // Here you would typically store the subscription in your database
  console.log('Received subscription:', subscription);

  // Optional: Send a test notification
  const payload = JSON.stringify({
    title: 'Test Notification',
    body: 'This is a test push notification from Okay Bet',
  });

  try {
    await webpush.sendNotification(subscription, payload);
    console.log('Test notification sent successfully');
  } catch (error) {
    console.error('Error sending test notification:', error);
  }

  return NextResponse.json({ status: 'success' }, { status: 201 });
}