import { Position, Transfer } from "../components/types";

export class PositionService {
  processPositions(
    transfers: Transfer[],
    userAddress: string,
    balances: Map<string, string>,
    marketDataMap: Map<string, any>,
    positionOutcomes: Map<string, number>, // Add this parameter
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

        // Get position outcome from the transfer
        const transferOutcome = positionOutcomes.get(transfer.id);
        console.log(`[PositionService] Processing transfer ${transfer.id}:`, {
          marketAddress,
          transferOutcome,
          marketStatus: marketData.status,
          winningOutcome: marketData.winningOutcomeIndex,
        });

        return {
          condition_id: marketData.conditionId,
          token_id: marketData.address,
          parent_collection_id:
            marketCreationData.get(marketData.conditionId.toLowerCase()) ??
            undefined,
          balance: Number(transfer.value),
          current_balance: Number(balances.get(transfer.id) || "0"),
          outcome: transferOutcome ?? 0, // Default to 0 if not found
          status: marketData.status.toLowerCase(),
          expiration_timestamp: marketData.expirationTimestamp,
          user_address: userAddress,
          transaction_hash: transfer.id.split("_")[1],
          winning_outcome:
            marketData.status.toLowerCase() === "resolved"
              ? marketData.winningOutcomeIndex
              : undefined,
          position_result:
            marketData.status.toLowerCase() === "resolved"
              ? transferOutcome === marketData.winningOutcomeIndex
                ? "won"
                : "lost"
              : undefined,
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
