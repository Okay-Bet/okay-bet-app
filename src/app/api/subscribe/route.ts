// api/subscribe/route.ts
// Allows user to subscribe to push notifications. not functional yet.

import { NextResponse } from "next/server";
import webpush from "web-push";

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

webpush.setVapidDetails(
  "mailto:your-email@example.com",
  vapidKeys.publicKey!,
  vapidKeys.privateKey!
);

export async function POST(request: Request) {
  const subscription = await request.json();
  const payload = JSON.stringify({
    title: "Welcome to Okay Bet!",
    body: "You have successfully subscribed to push notifications.",
  });

  try {
    const result = await webpush.sendNotification(subscription, payload);
    return NextResponse.json({ status: "success" }, { status: 201 });
  } catch (error) {
    console.error("Error sending welcome notification:", error);

    let errorMessage = "Failed to send welcome notification";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        status: "error",
        message: "Failed to send welcome notification",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
