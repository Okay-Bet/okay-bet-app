"use client";

import React from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsDashboard } from '@/components/Analytics/analyticsData';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

const AnalyticsPage: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <AnalyticsDashboard />
      </div>
    </QueryClientProvider>
  );
};

export default AnalyticsPage;