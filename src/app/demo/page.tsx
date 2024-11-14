"use client";
import React from "react";
import PredictionMarkets from "@/components/Polymarket/PredictionMarkets";

export default function DemoPage() {
  return (
    <div>
      <PredictionMarkets
        searchParams={{
          limit: 50,
          active: true,
          liquidity_num_min: 1000,
        }}
      />
    </div>
  );
}
