import type { Metadata } from "next";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "Okay Bet",
  description:
    "Make onchain bets with your friends. Connect your wallet to get started.",
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
          {children}
          <Analytics />
        </ThirdwebProvider>
      </body>
    </html>
  );
}
