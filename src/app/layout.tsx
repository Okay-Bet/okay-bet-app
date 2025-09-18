// layout.tsx
// wraps around the app content. Provides web3 context, analytics, and service worker registration.
// push notifications not functional yet.

import type { Metadata } from "next";
import "../styles/globals.css";
import Providers from "../components/Providers/Providers";
// import PrivyProvider from "../components/Providers/privyProvider"; // Disabled - not using wallet signin
import { Analytics } from "@vercel/analytics/react";
import dynamic from "next/dynamic";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";

const PushNotificationSubscriber = dynamic(
  () => import("../components/Notifications/PushNotificationSubscriber"),
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
      <body className="min-h-screen relative bg-white">
        {/* Base gradient with light theme */}
        <div className="fixed inset-0">
          {/* Main gradient background - light but dynamic */}
          <div className="absolute inset-0 bg-gradient-to-b from-white via-accent-gray-100 to-white" />

          {/* Dynamic accent stripes */}
          <div className="absolute inset-0">
            {/* Bold red accent stripe */}
            <div
              className="absolute top-0 right-0 w-[150%] h-[100vh] 
                           bg-gradient-to-b from-accent-red-500/10 via-accent-red-500/5 to-transparent 
                           rotate-[12deg] transform-gpu origin-top-left"
            />

            {/* Complementary cyan stripe */}
            <div
              className="absolute top-0 left-0 w-[150%] h-[100vh] 
                           bg-gradient-to-b from-electric-cyan/10 via-electric-cyan/5 to-transparent 
                           -rotate-[12deg] transform-gpu origin-top-right"
            />
          </div>

          {/* Sharp geometric patterns */}
          <div className="absolute inset-0">
            {/* Diagonal lines overlay */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                     linear-gradient(45deg, rgba(255, 49, 49, 0.03) 25%, transparent 25%),
                     linear-gradient(-45deg, rgba(0, 240, 255, 0.03) 25%, transparent 25%)
                   `,
                backgroundSize: "64px 64px",
                backgroundPosition: "0 0, 32px 0",
              }}
            />

            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                     linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px),
                     linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px)
                   `,
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          {/* Vignette effect for depth */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/5" />
        </div>

        {/* Content wrapper */}
        <div className="relative z-10">
          {/* <PrivyProvider> */}
            <Providers>
              <ServiceWorkerRegistration />
              {children}
              <Analytics />
            </Providers>
          {/* </PrivyProvider> */}
        </div>
      </body>
    </html>
  );
}
