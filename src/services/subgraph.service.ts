// services/subgraph.service.ts
import { ExtendedSubgraphResponse, Transfer } from "../components/types";

export class SubgraphService {
  private readonly subgraphUrl: string;

  constructor(subgraphUrl: string) {
    if (!subgraphUrl) {
      throw new Error("SUBGRAPH_URL is not defined");
    }
    this.subgraphUrl = subgraphUrl;
  }

  async fetchTransferHistory(address: string) {
    console.log(`Fetching transfer history for address: ${address}`);
    const query = {
      query: `query getTradeHistory {
        incomingTransfers: ConditionalTokens_TransferSingle(
          where: { to: {_eq: "${address}"} }
        ) {
          id
          from
          to
          value
          event_id
        }
        outgoingTransfers: ConditionalTokens_TransferSingle(
          where: { from: {_eq: "${address}"} }
        ) {
          id
          from
          to
          value
          event_id
        }
        buyTrades: FixedProductMarketMakerFactory_FPMMBuy(
          where: { buyer: {_eq: "${address}"} }
        ) {
          id
          outcomeIndex
          buyer
          investmentAmount
        }
        sellTrades: FixedProductMarketMakerFactory_FPMMSell(
          where: { seller: {_eq: "${address}"} }
        ) {
          id
          outcomeIndex
          seller
          returnAmount
        }
      }`
    };

    const response = await fetch(this.subgraphUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`Subgraph request failed: ${response.statusText}`);
    }

    const data = (await response.json()) as ExtendedSubgraphResponse;
    return this.processTransferData(data);
  }

  private processTransferData(data: ExtendedSubgraphResponse) {
    const balances = new Map<string, string>();

    // Process incoming transfers
    data.data.incomingTransfers.forEach((transfer) => {
      const currentBalance = BigInt(balances.get(transfer.id) || "0");
      balances.set(
        transfer.id,
        (currentBalance + BigInt(transfer.value)).toString()
      );
    });

    // Process outgoing transfers
    data.data.outgoingTransfers.forEach((transfer) => {
      const currentBalance = BigInt(balances.get(transfer.id) || "0");
      balances.set(
        transfer.id,
        (currentBalance - BigInt(transfer.value)).toString()
      );
    });

    return {
      transfers: [...data.data.incomingTransfers, ...data.data.outgoingTransfers],
      balances,
      buyTrades: data.data.buyTrades || [],
      sellTrades: data.data.sellTrades || [],
    };
  }

  async fetchMarketCreationData(marketAddresses: string[], conditionIds: string[]) {
    const validConditionIds = conditionIds.filter(Boolean);
    
    const query = {
      query: `
        query getParentCollectionIds($conditionIds: [String!]!) {
          ConditionalTokens_PositionSplit(
            where: { conditionId: {_in: $conditionIds} }
          ) {
            id
            conditionId
            parentCollectionId
          }
          ConditionalTokens_PayoutRedemption(
            where: { conditionId: {_in: $conditionIds} }
          ) {
            id
            conditionId
            parentCollectionId
          }
        }
      `,
      variables: { conditionIds: validConditionIds },
    };

    const response = await fetch(this.subgraphUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(query),
    });

    const data = await response.json();
    return this.processMarketCreationData(data);
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

    processEvents(data?.data?.ConditionalTokens_PositionSplit, "split");
    processEvents(data?.data?.ConditionalTokens_PayoutRedemption, "redemption");

    return finalParentCollectionIds;
  }
}
