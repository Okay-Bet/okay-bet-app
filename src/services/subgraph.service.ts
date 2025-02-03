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

    // Process redemptions first
    if (data.data.redemptions) {
      data.data.redemptions.forEach((redemption: { conditionId: string }) => {
        const conditionId = redemption.conditionId.toLowerCase();
        redeemedConditions.add(conditionId);
      });
    }

    // Process incoming transfers
    data.data.incomingTransfers.forEach((transfer) => {
      const currentBalance = BigInt(balances.get(transfer.id) || "0");
      const newBalance = (currentBalance + BigInt(transfer.value)).toString();
      balances.set(transfer.id, newBalance);

      const eventIdBN = BigInt(transfer.event_id);
      const outcomeIndex = Number(eventIdBN % 2n);
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

      const eventIdBN = BigInt(transfer.event_id);
      const outcomeIndex = Number(eventIdBN % 2n);
      positionOutcomes.set(transfer.id, outcomeIndex);

      marketInfo.set(transfer.to, {
        eventId: transfer.event_id,
        value: transfer.value,
      });
    });

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
        },
        body: JSON.stringify(query),
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
}
