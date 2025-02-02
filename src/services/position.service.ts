// services/position.service.ts
import { Position, Transfer } from "../components/types";

export class PositionService {
  processPositions(
    transfers: Transfer[],
    userAddress: string,
    balances: Map<string, string>,
    marketDataMap: Map<string, any>,
    tradesByMarket: Map<string, number>,
    marketCreationData: Map<string, string | null>
  ): Position[] {
    const userAddressLower = userAddress.toLowerCase();

    return transfers
      .map((transfer) => {
        const isReceivedToken = transfer.to.toLowerCase() === userAddressLower;
        const marketAddress = (
          isReceivedToken ? transfer.from : transfer.to
        ).toLowerCase();
        const marketData = marketDataMap.get(marketAddress);

        if (!marketData) return null;

        const outcome =
          tradesByMarket.get(marketAddress) ??
          (transfer.event_id % 2 === 0 ? 0 : 1);

        return {
          condition_id: marketData.conditionId,
          token_id: marketData.address,
          parent_collection_id:
            marketCreationData.get(marketData.conditionId.toLowerCase()) ??
            undefined,
          balance: Number(transfer.value),
          current_balance: Number(balances.get(transfer.id) || "0"),
          outcome,
          status: marketData.status.toLowerCase(),
          expiration_timestamp: marketData.expirationTimestamp,
          user_address: userAddress,
          transaction_hash: transfer.id.split("_")[1],
          market_data: {
            question: marketData.title,
            description: marketData.description,
            outcomes: JSON.stringify(["No", "Yes"]),
            volume: marketData.volumeFormatted,
            liquidity: marketData.liquidityFormatted,
            status: marketData.status,
            collateral_token: marketData.collateralToken,
            contract: {
              address: marketData.address,
            },
          },
        };
      })
      .filter(Boolean) as Position[];
  }
}
