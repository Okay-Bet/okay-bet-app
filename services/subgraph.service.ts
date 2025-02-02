export class SubgraphService {
  private readonly subgraphUrl: string;

  constructor(subgraphUrl: string) {
    if (!subgraphUrl) {
      throw new Error("SUBGRAPH_URL is not defined");
    }
    this.subgraphUrl = subgraphUrl;
  }

  async fetchTransferHistory(address: string) {
    console.log(`[SubgraphService] Fetching transfer history for address: ${address}`);
    // ... existing query code ...

    const data = (await response.json()) as ExtendedSubgraphResponse;
    
    // Detailed logging of raw trade data
    console.log('[SubgraphService] Raw buy trades:', 
      data.data.buyTrades?.map(trade => ({
        id: trade.id,
        outcomeIndex: trade.outcomeIndex,
        market: trade.id.split('_')[0],
        buyer: trade.buyer,
        amount: trade.investmentAmount
      }))
    );

    console.log('[SubgraphService] Raw sell trades:', 
      data.data.sellTrades?.map(trade => ({
        id: trade.id,
        outcomeIndex: trade.outcomeIndex,
        market: trade.id.split('_')[0],
        seller: trade.seller,
        amount: trade.returnAmount
      }))
    );

    const processedData = this.processTransferData(data);

    // Log processed data summary
    console.log('[SubgraphService] Processed data summary:', {
      totalTransfers: processedData.transfers.length,
      totalBuyTrades: processedData.buyTrades.length,
      totalSellTrades: processedData.sellTrades.length,
      uniqueMarkets: new Set([
        ...processedData.buyTrades.map(t => t.id.split('_')[0]),
        ...processedData.sellTrades.map(t => t.id.split('_')[0])
      ]).size
    });

    return processedData;
  }

  private processTransferData(data: ExtendedSubgraphResponse) {
    const balances = new Map<string, string>();

    // Log transfer processing
    console.log('[SubgraphService] Processing transfers:', {
      incomingCount: data.data.incomingTransfers.length,
      outgoingCount: data.data.outgoingTransfers.length
    });

    // Process incoming transfers
    data.data.incomingTransfers.forEach((transfer) => {
      const currentBalance = BigInt(balances.get(transfer.id) || "0");
      const newBalance = (currentBalance + BigInt(transfer.value)).toString();
      balances.set(transfer.id, newBalance);
      
      console.log('[SubgraphService] Processed incoming transfer:', {
        id: transfer.id,
        from: transfer.from,
        value: transfer.value,
        newBalance
      });
    });

    // Process outgoing transfers
    data.data.outgoingTransfers.forEach((transfer) => {
      const currentBalance = BigInt(balances.get(transfer.id) || "0");
      const newBalance = (currentBalance - BigInt(transfer.value)).toString();
      balances.set(transfer.id, newBalance);
      
      console.log('[SubgraphService] Processed outgoing transfer:', {
        id: transfer.id,
        to: transfer.to,
        value: transfer.value,
        newBalance
      });
    });

    // Create return data
    const returnData = {
      transfers: [...data.data.incomingTransfers, ...data.data.outgoingTransfers],
      balances,
      buyTrades: data.data.buyTrades || [],
      sellTrades: data.data.sellTrades || [],
    };

    // Final validation log
    console.log('[SubgraphService] Final validation:', {
      uniqueMarkets: new Set(returnData.transfers.map(t => t.from)).size,
      uniqueOutcomeIndexes: new Set([
        ...returnData.buyTrades.map(t => t.outcomeIndex),
        ...returnData.sellTrades.map(t => t.outcomeIndex)
      ])
    });

    return returnData;
  }
}
