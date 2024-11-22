// components/Polymarket/LoadingState.tsx
// accessory component to show user the polymarket data is loading

import React from 'react';

export const LoadingState = () => (
  <div className="p-6 bg-secondary text-font mb-6">
    <div className="flex justify-center items-center h-40">
      <div className="animate-pulse text-font">Loading market data...</div>
    </div>
  </div>
);

export const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-6 bg-secondary text-font mb-6 border border-red-500">
    <div className="flex items-center gap-2 text-font">
      <span>{message}</span>
    </div>
  </div>
);