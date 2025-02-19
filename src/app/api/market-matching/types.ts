export interface LimitlessMarket {
    address: string;
    title: string;
    description: string;
    volume: string;
    volumeFormatted: string;
    expirationDate: string;
    collateralToken: {
        address: string;
        symbol: string;
    };
}

export interface PolymarketMarket {
    condition_id: string;
    question: string;
    description?: string;
    volume: string;
    end_date_iso: string;
}

export interface DetailedComparison {
    limitlessMarket: {
        title: string;
        description: string;
        volume: string;
        address: string;
        collateralSymbol: string;
    };
    polyMarket: {
        question: string;
        description?: string;
        condition_id: string;
    };
    similarity: number;
}