import { Suspense } from "react";
import { headers } from 'next/headers';
import Image from "next/image";
import Logo from "@/components/Logo/Logo";
import PredictionMarkets from "@/components/Markets/PredictionMarkets";
import Providers from "../components/Providers/Providers";

async function getInitialMarkets(page: number = 1, limit: number = 10) {
  try {
    // When using fetch in a Server Component, we need to use the full URL
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = headers().get('host') || 'localhost:3000';
    const url = new URL(`/api/grouped-markets`, `${protocol}://${host}`);
    
    // Add query parameters
    url.searchParams.set('page', page.toString());
    url.searchParams.set('limit', limit.toString());

    const res = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) throw new Error('Failed to fetch markets');
    return res.json();
  } catch (error) {
    console.error('Error fetching initial markets:', error);
    return null;
  }
}

export default async function Home({
  searchParams
}: {
  searchParams: { page?: string; limit?: string }
}) {
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 10;
  
  const initialData = await getInitialMarkets(page, limit);

  return (
    <main className="width-full flex-col items-center justify-center">
      <div className="py-6 text-center">
        <div className="m-3">
          <Logo />
        </div>

        <Suspense fallback={<div>Loading markets...</div>}>
          <Providers>
            <PredictionMarkets initialData={initialData} />
          </Providers>
        </Suspense>
      </div>
    </main>
  );
}