import type { Metadata } from "next";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";

export const metadata: Metadata = {
  title: "Okay Bet",
  description: "Make onchain bets with your friends. Connect your wallet to get started.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-body bg-geometric-circle from-primary to-quaternary">
        <ThirdwebProvider>{children}</ThirdwebProvider>
      </body>
    </html>
  );
}
