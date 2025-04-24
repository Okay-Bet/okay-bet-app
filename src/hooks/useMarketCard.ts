// import { useState } from "react";
// import { LimitlessMarket, MarketCardProps } from "@/components/types";
// import { useBetSlip } from "../app/context/BetSlipContext";
// import { useMarketPrices } from "./useMarketPrices";

// interface UseMarketCardReturn {
//   currentMarket: LimitlessMarket;
//   showDetails: boolean;
//   showMoneyline: boolean;
//   activeMarketIndex: number;
//   handleBetClick: (position: "YES" | "NO") => void;
//   setShowDetails: (show: boolean) => void;
//   setShowMoneyline: (show: boolean) => void;
//   setActiveMarketIndex: (index: number) => void;
//   pricesLoading: boolean;
// }

// export function useMarketCard({
//   eventId,
//   eventTitle,
//   markets,
// }: MarketCardProps): UseMarketCardReturn {
//   const [activeMarketIndex, setActiveMarketIndex] = useState(0);
//   const [showDetails, setShowDetails] = useState(false);
//   const [showMoneyline, setShowMoneyline] = useState(false);

//   const { addBet } = useBetSlip();
//   const currentMarket =
//     markets && markets.length > 0 ? markets[activeMarketIndex] : ({} as LimitlessMarket);

//   // Fetch realtime prices for the current market
//   const { prices: realtimePrices, loading: pricesLoading } =
//     useMarketPrices(currentMarket);

//   const handleBetClick = (position: "YES" | "NO") => {
//     if (!currentMarket) {
//       console.error("No market selected");
//       return;
//     }

//     // Debug log the current state
//     console.log("Processing bet for market:", {
//       market: currentMarket,
//       position,
//       realtimePrices,
//       staticPrices: currentMarket.prices,
//     });

//     // Determine which prices to use
//     const priceToUse =
//       position === "YES"
//         ? realtimePrices?.yes?.ask ?? currentMarket.prices.yes.ask
//         : realtimePrices?.no?.ask ?? currentMarket.prices.no.ask;

//     // Validate price exists and is in valid range
//     if (
//       typeof priceToUse !== "number" ||
//       isNaN(priceToUse) ||
//       priceToUse <= 0 ||
//       priceToUse > 1
//     ) {
//       console.error("Invalid price value:", priceToUse);
//       return;
//     }

//     console.log("Using validated price:", priceToUse);

//     const bet = {
//       marketId: currentMarket.id,
//       eventTitle,
//       marketQuestion: currentMarket.question,
//       position,
//       price: priceToUse,
//       tokenId: currentMarket.id,
//       provider: "LIMITLESS" as const,
//     };

//     // Debug log the final bet object
//     console.log("Submitting bet to BetSlip:", bet);
//     addBet(bet);
//   };

//   return {
//     currentMarket,
//     showDetails,
//     showMoneyline,
//     activeMarketIndex,
//     handleBetClick,
//     setShowDetails,
//     setShowMoneyline,
//     setActiveMarketIndex,
//     pricesLoading,
//   };
// }
