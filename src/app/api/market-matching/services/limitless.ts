import { ProgressTracker } from '../utils/progressTracker';
import { LimitlessMarket } from '../types';
import { extractKeywords } from '../services/matching';

const LIMITLESS_API_URL = "https://api.limitless.exchange";
const MIN_VOLUME = 0;

export async function fetchQualifyingLimitlessMarkets(progress: ProgressTracker) {
    progress.addUpdate("limitless", "Fetching Limitless markets...");
    
    const allMarkets = [];
    let page = 1;
    const limit = 10; 
    let hasMore = true;
    
    while (hasMore) {
        progress.addUpdate("limitless", `Fetching page ${page}...`);
        
        const response = await fetch(`${LIMITLESS_API_URL}/markets/active?page=${page}&limit=${limit}`);
        if (!response.ok) {
            throw new Error(`Limitless API error: ${response.status}`);
        }
        
        const data = await response.json();
        const markets = data.data;
        
        if (!markets || markets.length === 0) {
            hasMore = false;
            break;
        }

        // Filter markets for this page
        const qualifyingMarkets = markets.filter((market: LimitlessMarket) => {
            const volume = parseFloat(market.volumeFormatted);
            const isUSDC = market.collateralToken.symbol.toUpperCase() === 'USDC';
            const combinedText = `${market.title} ${market.description}`.toLowerCase();
            const isPriceMarket = combinedText.includes('$');
            
            const qualifies = isUSDC && volume >= MIN_VOLUME && !isPriceMarket;

            if (qualifies) {
                const keywords = extractKeywords(`${market.title} ${market.description}`);
                progress.addUpdate("limitless_market", "Found qualifying market", {
                    title: market.title,
                    volume: market.volumeFormatted,
                    keywords
                });
            }
            
            return qualifies;
        });

        allMarkets.push(...qualifyingMarkets);

        // Check if we should fetch more pages
        if (markets.length < limit) {
            hasMore = false;
        } else {
            page++;
            // Add delay between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    progress.addUpdate("limitless", "All markets fetched", {
        totalPages: page,
        totalQualifyingMarkets: allMarkets.length
    });

    return allMarkets;
}