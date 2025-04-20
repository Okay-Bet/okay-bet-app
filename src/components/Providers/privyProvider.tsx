// src/components/Providers/privyProvider.tsx
'use client';
import { PrivyProvider } from '@privy-io/react-auth';
import { Analytics } from "@vercel/analytics/react";
import ServiceWorkerRegistration from "../ServiceWorkerRegistration";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        embeddedWallets: {
          createOnLogin: "all-users",
        },
      }}
    >
      <ServiceWorkerRegistration />
      {children}
      <Analytics />
    </PrivyProvider>
  );
}