import { useState, useEffect } from 'react';
import { Bet, LimitlessBet, OrderQuote, OrderBookResponse } from '../../components/types';

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://157.245.87.57:8000";

export const useQuote = (bet: Bet | null, amount: string) => {
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);

  const calculateQuoteFromOrderBook = (
    amount: number,
    position: "YES" | "NO",
    orderBookResponse: OrderBookResponse
  ): OrderQuote | null => {
    try {
      const orderBook = orderBookResponse.orderbook;
      const marketInfo = orderBookResponse.market_info;
      
      const orders = position === "YES" ? orderBook.asks : orderBook.bids;
      const price = position === "YES" ? marketInfo.best_ask_price : marketInfo.best_bid_price;
      
      const tokenAmount = amount / price;
      const estimatedTotal = amount;
      const priceImpact = Math.abs((orderBook.lastTradePrice - price) / orderBook.lastTradePrice);
      
      return {
        tokenAmount,
        estimatedTotal,
        priceImpact,
        averagePrice: price,
        potentialPayout: tokenAmount
      };
    } catch (error) {
      console.error("Error calculating quote:", error);
      return null;
    }
  };

  useEffect(() => {
    const getQuote = async () => {
      if (!bet || !amount || amount === "" || parseFloat(amount) <= 0 || bet.provider !== "LIMITLESS") {
        setQuote(null);
        setIsQuoting(false);
        return;
      }
  
      setIsQuoting(true);
      const limitlessBet = bet as LimitlessBet;
      
      try {
        const response = await fetch(
          `${FASTAPI_BASE_URL}/api/v1/limitless/orders/orderbook/${limitlessBet.marketSlug}`
        );
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const data: OrderBookResponse = await response.json();
        console.log("OrderBookResponse:", data);
        const quoteResult = calculateQuoteFromOrderBook(
          parseFloat(amount),
          limitlessBet.position,
          data
        );
        
        setQuote(quoteResult);
      } catch (error) {
        console.error("Error in quote calculation:", error);
        setQuote(null);
      } finally {
        setIsQuoting(false);
      }
    };
  
    getQuote();
  }, [amount, bet]);

  return {
    quote,
    isQuoting
  };
};