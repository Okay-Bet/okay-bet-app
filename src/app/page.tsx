import { Suspense } from "react";
import Image from "next/image";
import Logo from "@/components/Logo/Logo";
import PredictionMarkets from "@/components/Markets/PredictionMarkets";
import Providers from "../components/Providers/Providers";

export default async function Home() {
  return (
    <main className="width-full flex-col items-center justify-center">
      <div className="py-6 text-center">
        <div className="m-3">
          <Logo />
        </div>

        <Suspense fallback={<div>Loading markets...</div>}>
          <Providers>
            <PredictionMarkets />
          </Providers>
        </Suspense>
      </div>
    </main>
  );
}