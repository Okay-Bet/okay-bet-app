import { Position, Transfer } from "../components/types";

export class PositionService {
  processPositions(
    transfers: Transfer[],
    userAddress: string,
    balances: Map<string, string>,
    marketDataMap: Map<string, any>,
    positionOutcomes: Map<string, number>,
    marketCreationData: Map<string, string | null>,
    redeemedConditions: Set<string>
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

        const outcome = positionOutcomes.get(transfer.id) ?? 0;
        const isRedeemed = redeemedConditions.has(
          marketData.conditionId.toLowerCase()
        );

        // Get winning outcome and determine if position won
        const winning_outcome =
          marketData.status.toUpperCase() === "RESOLVED"
            ? marketData.winningOutcomeIndex
            : undefined;

        const position_result =
          marketData.status.toUpperCase() === "RESOLVED"
            ? outcome === winning_outcome
              ? "won"
              : "lost"
            : undefined;


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
          isRedeemed,
          winning_outcome,
          position_result,
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
