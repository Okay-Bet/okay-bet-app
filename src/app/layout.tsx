// layout.tsx
// wraps around the app content. Provides web3 context, analytics, and service worker registration.
// push notifications not functional yet.

import type { Metadata } from "next";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { Analytics } from "@vercel/analytics/react";
import dynamic from 'next/dynamic';
import ServiceWorkerRegistration from '../components/ServiceWorkerRegistration';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';


const PushNotificationSubscriber = dynamic(
  () => import('../components/Notifications/PushNotificationSubscriber'),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Okay Bet",
  description: "Bet Better",
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
          <ServiceWorkerRegistration />
          {children}
          <Analytics />
        </ThirdwebProvider>
      </body>
    </html>
  );
}