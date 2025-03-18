import { ExtendedSubgraphResponse, Transfer } from "../components/types";

export class SubgraphService {
  private readonly subgraphUrl: string;

  constructor(subgraphUrl: string) {
    if (!subgraphUrl) {
      throw new Error("SUBGRAPH_URL is not defined");
    }
    this.subgraphUrl = subgraphUrl;
  }

  async fetchTransferHistory(address: string): Promise<{
    transfers: Transfer[];
    balances: Map<string, string>;
    positionOutcomes: Map<string, number>;
    buyTrades: any[];
    sellTrades: any[];
    marketInfo: Map<string, { eventId: string; value: string }>;
    redeemedConditions: Set<string>;
  }> {
    const query = {
      query: `{
        incomingTransfers: ConditionalTokens_TransferSingle(
          where: { to: { _eq: "${address}" } }
        ) {
          id
          operator
          from
          to
          event_id
          value
        }
        outgoingTransfers: ConditionalTokens_TransferSingle(
          where: { from: { _eq: "${address}" } }
        ) {
          id
          operator
          from
          to
          event_id
          value
        }
        positionSplits: ConditionalTokens_PositionSplit(
          where: { stakeholder: { _eq: "${address}" } }
        ) {
          id
          conditionId
          partition
        }
        conditionPreparations: ConditionalTokens_ConditionPreparation {
          conditionId
          outcomeSlotCount
        }
        redemptions: ConditionalTokens_PayoutRedemption(
          where: { redeemer: { _eq: "${address}" } }
        ) {
          id
          redeemer
          collateralToken
          parentCollectionId
          conditionId
          indexSets
          payout
        }
        buyTrades: FixedProductMarketMakerFactory_FPMMBuy(
          where: { buyer: { _eq: "${address}" } }
        ) {
          id
          buyer
          investmentAmount
          feeAmount
          outcomeIndex
          outcomeTokensBought
        }
        sellTrades: FixedProductMarketMakerFactory_FPMMSell(
          where: { seller: { _eq: "${address}" } }
        ) {
          id
          seller
          returnAmount
          feeAmount
          outcomeIndex
          outcomeTokensSold
        }
      }`,
    };

    try {
      const response = await fetch(this.subgraphUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[SubgraphService] Error response:", errorText);
        throw new Error(`Subgraph request failed: ${response.statusText}`);
      }

      const rawData = await response.json();
      if (!rawData.data) {
        console.error("[SubgraphService] Invalid response structure:", rawData);
        throw new Error("Invalid response format from subgraph");
      }

      const data: ExtendedSubgraphResponse = {
        data: {
          incomingTransfers: rawData.data.incomingTransfers || [],
          outgoingTransfers: rawData.data.outgoingTransfers || [],
          buyTrades: rawData.data.buyTrades || [],
          sellTrades: rawData.data.sellTrades || [],
          redemptions: rawData.data.redemptions || [],
          trades: [],
          markets: [],
        },
      };

      return this.processTransferData(data);
    } catch (error) {
      console.error(
        "[SubgraphService] Error fetching transfer history:",
        error
      );
      throw error;
    }
  }

  private processTransferData(data: ExtendedSubgraphResponse) {
    const balances = new Map<string, string>();
    const positionOutcomes = new Map<string, number>();
    const marketInfo = new Map<string, { eventId: string; value: string }>();
    const redeemedConditions = new Set<string>();

    // Process incoming transfers
    data.data.incomingTransfers.forEach((transfer) => {
      const currentBalance = BigInt(balances.get(transfer.id) || "0");
      const newBalance = (currentBalance + BigInt(transfer.value)).toString();
      balances.set(transfer.id, newBalance);

      // Extract outcome from event_id (token ID)
      // The last bit of the token ID determines if it's a YES or NO position
      const tokenId = BigInt(transfer.event_id);
      const outcomeIndex = Number((tokenId >> 255n) & 1n);
      positionOutcomes.set(transfer.id, outcomeIndex);

      marketInfo.set(transfer.from, {
        eventId: transfer.event_id,
        value: transfer.value,
      });
    });

    // Process outgoing transfers
    data.data.outgoingTransfers.forEach((transfer) => {
      const currentBalance = BigInt(balances.get(transfer.id) || "0");
      const newBalance = (currentBalance - BigInt(transfer.value)).toString();
      balances.set(transfer.id, newBalance);

      // Extract outcome from event_id (token ID)
      const tokenId = BigInt(transfer.event_id);
      const outcomeIndex = Number((tokenId >> 255n) & 1n);
      positionOutcomes.set(transfer.id, outcomeIndex);
    });

    // Process redemptions
    if (data.data.redemptions) {
      data.data.redemptions.forEach((redemption: { conditionId: string }) => {
        redeemedConditions.add(redemption.conditionId.toLowerCase());
      });
    }

    return {
      transfers: [
        ...data.data.incomingTransfers,
        ...data.data.outgoingTransfers,
      ],
      balances,
      positionOutcomes,
      buyTrades: data.data.buyTrades || [],
      sellTrades: data.data.sellTrades || [],
      marketInfo,
      redeemedConditions,
    };
  }

  async fetchMarketCreationData(
    marketAddresses: string[],
    conditionIds: string[]
  ) {
    const validConditionIds = conditionIds.filter(Boolean);

    const query = {
      query: `{
        positionSplits: ConditionalTokens_PositionSplit(
          where: { conditionId: { _in: ${JSON.stringify(validConditionIds)} } }
        ) {
          id
          conditionId
          parentCollectionId
        }
        payoutRedemptions: ConditionalTokens_PayoutRedemption(
          where: { conditionId: { _in: ${JSON.stringify(validConditionIds)} } }
        ) {
          id
          conditionId
          parentCollectionId
        }
      }`,
    };

    try {
      const response = await fetch(this.subgraphUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        body: JSON.stringify(query),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Market creation data request failed: ${response.statusText}`
        );
      }

      const data = await response.json();

      return this.processMarketCreationData(data);
    } catch (error) {
      console.error(
        "[SubgraphService] Error fetching market creation data:",
        error
      );
      throw error;
    }
  }

  private processMarketCreationData(data: any) {
    const finalParentCollectionIds = new Map<string, string | null>();

    const processEvents = (events: any[], type: string) => {
      events?.forEach((event: any) => {
        const conditionId = event.conditionId.toLowerCase();
        if (
          !finalParentCollectionIds.has(conditionId) ||
          finalParentCollectionIds.get(conditionId) ===
            "0x0000000000000000000000000000000000000000000000000000000000000000"
        ) {
          finalParentCollectionIds.set(conditionId, event.parentCollectionId);
        }
      });
    };

    processEvents(data?.data?.positionSplits, "split");
    processEvents(data?.data?.payoutRedemptions, "redemption");

    return finalParentCollectionIds;
  }

  // src/services/subgraph.service.ts

  async fetchMarketPrices(
    marketAddresses: string[]
  ): Promise<Map<string, number[]>> {
    console.log(
      "[SubgraphService] Fetching prices for markets:",
      marketAddresses
    );

    const query = {
      query: `{
      buys: FixedProductMarketMakerFactory_FPMMBuy(
        where: { buyer: { _in: ${JSON.stringify(marketAddresses)} } }
      ) {
        id
        buyer
        investmentAmount
        outcomeTokensBought
        outcomeIndex
      }
      sells: FixedProductMarketMakerFactory_FPMMSell(
        where: { seller: { _in: ${JSON.stringify(marketAddresses)} } }
      ) {
        id
        seller
        returnAmount
        outcomeTokensSold
        outcomeIndex
      }
    }`,
    };

    try {
      const response = await fetch(this.subgraphUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        throw new Error(`Market prices request failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        console.error("[SubgraphService] GraphQL errors:", data.errors);
        throw new Error("GraphQL query failed");
      }

      console.log("[SubgraphService] Raw trade data:", data);

      // Process the trades to calculate prices
      const marketPrices = new Map<string, number[]>();

      marketAddresses.forEach((market) => {
        // Initialize prices array for this market
        const prices = [0, 0]; // [NO, YES] prices

        if (data.data) {
          const marketBuys = (data.data.buys || []).filter(
            (trade: any) => trade.buyer.toLowerCase() === market.toLowerCase()
          );
          const marketSells = (data.data.sells || []).filter(
            (trade: any) => trade.seller.toLowerCase() === market.toLowerCase()
          );

          console.log(`[SubgraphService] Market ${market} trades:`, {
            buys: marketBuys.length,
            sells: marketSells.length,
          });

          if (marketBuys.length > 0) {
            // Sort by ID to get the most recent trade
            const latestBuy = marketBuys.sort((a: any, b: any) =>
              b.id.localeCompare(a.id)
            )[0];
            const price =
              Number(latestBuy.investmentAmount) /
              Number(latestBuy.outcomeTokensBought);
            prices[Number(latestBuy.outcomeIndex)] = price;
          }

          if (marketSells.length > 0) {
            // Sort by ID to get the most recent trade
            const latestSell = marketSells.sort((a: any, b: any) =>
              b.id.localeCompare(a.id)
            )[0];
            const price =
              Number(latestSell.returnAmount) /
              Number(latestSell.outcomeTokensSold);
            prices[Number(latestSell.outcomeIndex)] = price;
          }
        }

        console.log(
          `[SubgraphService] Calculated prices for market ${market}:`,
          prices
        );
        marketPrices.set(market, prices);
      });

      return marketPrices;
    } catch (error) {
      console.error("[SubgraphService] Error fetching market prices:", error);
      throw error;
    }
  }
}
