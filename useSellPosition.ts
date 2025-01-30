// ... existing code ...

const calculateSellParams = async (params: SellPositionParams) => {
    const contract = getMarketContract(params.token_id);
    // Change outcomeIndex to use 0 for yes tokens instead of 1
    const outcomeIndex = BigInt(params.is_yes_token ? 0 : 1);

    // Calculate initial sell amount based on our full balance
    const desiredTokensToSell = BigInt(params.amount);
    
    // Get the AMM's maximum allowed tokens for this trade first
    const maxOutcomeTokensToSell = desiredTokensToSell;  // Use full amount as max

    // Calculate return amount using the contract's calcSellAmount
    const sellAmountInCollateral = await readContract({
        contract,
        method: "calcSellAmount",
        params: [maxOutcomeTokensToSell, outcomeIndex],
    });

    console.log("Sell calculation results:", {
        desiredTokensToSell: {
            raw: desiredTokensToSell.toString(),
            type: "Total Tokens Available to Sell",
        },
        maxOutcomeTokensToSell: {
            raw: maxOutcomeTokensToSell.toString(),
            type: "AMM Maximum Allowed",
        },
        sellAmountInCollateral: {
            raw: sellAmountInCollateral.toString(),
            inUSDC: Number(sellAmountInCollateral) / 1e6,
            type: "Expected USDC Return",
        },
        outcomeIndex: outcomeIndex.toString(),
    });

    return {
        returnAmount: sellAmountInCollateral,
        outcomeIndex,
        maxOutcomeTokensToSell,
    };
};

// ... existing code ...

const sellPosition = async (params: SellPositionParams) => {
    if (!account?.address) {
        throw new Error("Wallet not connected");
    }

    setLoading(true);
    setError(null);

    try {
        await handleTokenApproval(params.token_id);

        const marketContract = getContract({
            client,
            chain: base,
            address: params.token_id,
            abi: MARKET_ABI,  // Make sure to include the ABI here
        });

        const calculatedParams = await calculateSellParams(params);

        console.log("Preparing transaction with BigInt params:", {
            returnAmount: calculatedParams.returnAmount.toString(),
            outcomeIndex: calculatedParams.outcomeIndex.toString(),
            maxOutcomeTokensToSell: calculatedParams.maxOutcomeTokensToSell.toString(),
        });

        const transaction = prepareContractCall({
            contract: marketContract,
            method: "sell",  // Simplified method name
            params: [
                calculatedParams.returnAmount,
                calculatedParams.outcomeIndex,
                calculatedParams.maxOutcomeTokensToSell,
            ],
        });

        // Add this before sendAndConfirmTx
        const txData = await transaction.data();
        console.log("Transaction data comparison:", {
            ourTxData: txData,
            params: {
                returnAmount: calculatedParams.returnAmount.toString(),
                outcomeIndex: calculatedParams.outcomeIndex.toString(),
                maxOutcomeTokensToSell: calculatedParams.maxOutcomeTokensToSell.toString(),
            }
        });

        const receipt = await sendAndConfirmTx(transaction);
        console.log("Transaction confirmed:", receipt?.transactionHash);

        return receipt;
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to sell position";
        setError(errorMessage);
        throw err;
    } finally {
        setLoading(false);
    }
};

// ... existing code ...
