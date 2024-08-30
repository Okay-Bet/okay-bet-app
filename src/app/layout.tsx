import type { Metadata } from "next";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { Analytics } from "@vercel/analytics/react";
import dynamic from 'next/dynamic';

const PushNotificationSubscriber = dynamic(
  () => import('../components/Notifications/PushNotificationSubscriber'),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Okay Bet",
  description: "P2P PvP Betting Platform",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-body bg-quaternary">
        <ThirdwebProvider>
          <PushNotificationSubscriber />
          {children}
          <Analytics />
        </ThirdwebProvider>
      </body>
    </html>
  );
}