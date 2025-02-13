import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import stringSimilarity from "string-similarity";

const prisma = new PrismaClient();
const LIMITLESS_API_URL = "https://api.limitless.exchange";
const GAMMA_API_URL = "https://gamma-api.polymarket.com";
const SIMILARITY_THRESHOLD = 0.8;
const MIN_VOLUME = 0;
const DEBUG_TOP_SIMILARITIES = 5;

interface LimitlessMarket {
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

interface PolymarketMarket {
  condition_id: string;
  question: string;
  description?: string;
  volume: string;
  end_date_iso: string;
}

interface DetailedComparison {
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

interface ProgressUpdate {
  stage: string;
  message: string;
  data?: any;
  timestamp: string;
}

class ProgressTracker {
  updates: ProgressUpdate[] = [];

  addUpdate(stage: string, message: string, data?: any) {
    const update = {
      stage,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    this.updates.push(update);
    console.log(`[${stage}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
    return update;
  }

  getUpdates() {
    return this.updates;
  }
}

function extractKeywords(text: string): string[] {
  // First clean the text of any HTML/markup
  const cleanedText = text
    .replace(/<[^>]*>/g, '')           // Remove HTML tags
    .replace(/https?:\/\/\S+/g, '')    // Remove URLs
    .replace(/[^\w\s-]/g, ' ')         // Replace punctuation with space
    .toLowerCase()
    .replace(/\s+/g, ' ')              // Normalize whitespace
    .trim();

  // Split into words
  const words = cleanedText.split(' ');

  // Filter out common words and short words
  const stopWords = new Set([
    'will', 'what', 'when', 'where', 'who', 'how', 'the', 'be', 'to', 'of', 'and',
    'a', 'in', 'that', 'have', 'it', 'for', 'not', 'on', 'with', 'as', 'at', 'by',
    'from', 'or', 'an', 'if', 'between', 'during', 'through', 'after', 'before',
    'yes', 'no', 'maybe', 'resolved', 'resolves', 'resolve', 'market', 'markets',
    'post', 'posts', 'posted', 'make', 'makes', 'made'
  ]);

  // Get unique meaningful words
  const uniqueWords = new Set(
    words.filter(word => 
      word.length > 2 && 
      !stopWords.has(word) && 
      !word.match(/^\d+$/)
    )
  );

  // Prioritize certain keywords if they exist
  const priorityKeywords = ['trump', 'biden', 'elon', 'musk', 'tweet', 'twitter'];
  const keywords = Array.from(uniqueWords)
    .filter(word => {
      // Keep numbers if they're part of a word (e.g., "2024")
      if (word.match(/\d{4}/)) return true;
      return !word.match(/\d/);
    })
    .sort((a, b) => {
      const aIsPriority = priorityKeywords.includes(a);
      const bIsPriority = priorityKeywords.includes(b);
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return 0;
    });

  // Return only the top 3 keywords
  return keywords.slice(0, 3);
}

async function fetchQualifyingLimitlessMarkets(progress: ProgressTracker) {
    progress.addUpdate("limitless", "Fetching Limitless markets...");
    
    const response = await fetch(`${LIMITLESS_API_URL}/markets/active`);
    if (!response.ok) {
      throw new Error(`Limitless API error: ${response.status}`);
    }
    const data = await response.json();
    
    // Filter markets
    const qualifyingMarkets = data.data.filter((market: LimitlessMarket) => {
      const volume = parseFloat(market.volumeFormatted);
      const isUSDC = market.collateralToken.symbol.toUpperCase() === 'USDC';
      const combinedText = `${market.title} ${market.description}`.toLowerCase();
      console.log("Combined Text:", combinedText);
      
      // Filter out markets with '$' and price-related terms
      const isPriceMarket = combinedText.includes('$');
                        //    combinedText.includes('price') ||
                        //    combinedText.includes('above') ||
                        //    combinedText.includes('below');
      
      const qualifies = isUSDC && volume >= MIN_VOLUME && !isPriceMarket;
  
      if (qualifies) {
        const keywords = extractKeywords(`${market.title} ${market.description}`);
        console.log("\nQualifying Limitless Market:");
        console.log(`Title: ${market.title}`);
        console.log(`Volume: $${market.volumeFormatted}`);
        console.log(`Keywords: ${keywords.join(', ')}`);
        console.log("-".repeat(80));
      }
      
      return qualifies;
    });
  
    progress.addUpdate("limitless", "Qualifying markets found", {
      totalMarkets: data.data.length,
      qualifyingMarkets: qualifyingMarkets.length,
      volumeThreshold: MIN_VOLUME,
      markets: qualifyingMarkets.map(m => ({
        title: m.title,
        volume: m.volumeFormatted,
        token: m.collateralToken.symbol,
        address: m.address,
        keywords: extractKeywords(`${m.title} ${m.description}`)
      }))
    });
  
    return qualifyingMarkets;
  }
  
  async function fetchPolymarketMarkets(limitlessMarkets: LimitlessMarket[], progress: ProgressTracker) {
    progress.addUpdate("polymarket", "Starting Polymarket search based on Limitless markets...");
    
    const allMarkets = new Set<string>();
    
    for (const limitlessMarket of limitlessMarkets) {
      const keywords = extractKeywords(`${limitlessMarket.title} ${limitlessMarket.description}`);
      
      if (keywords.length > 0) {
        progress.addUpdate("polymarket_search", `Searching for: ${keywords.join(' ')}`);
        
        // Try with all keywords first
        const fullSearchUrl = `${GAMMA_API_URL}/search?q=${encodeURIComponent(keywords.join(' '))}&type=markets&limit=100`;
        let response = await fetch(fullSearchUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (data.markets) {
            data.markets.forEach((market: any) => {
              allMarkets.add(JSON.stringify(market));
            });
          }
        }
  
        // If we got less than 5 results, try with just the first two keywords
        if (keywords.length > 1 && allMarkets.size < 5) {
          const reducedSearchUrl = `${GAMMA_API_URL}/search?q=${encodeURIComponent(keywords.slice(0, 2).join(' '))}&type=markets&limit=100`;
          response = await fetch(reducedSearchUrl);
          
          if (response.ok) {
            const data = await response.json();
            if (data.markets) {
              data.markets.forEach((market: any) => {
                allMarkets.add(JSON.stringify(market));
              });
            }
          }
        }
        
        // Add delay between searches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  
    // Convert Set back to array and parse JSON
    const uniqueMarkets = Array.from(allMarkets).map(m => JSON.parse(m as string));
    
    progress.addUpdate("polymarket", "Markets retrieved", {
      totalMarketsFound: uniqueMarkets.length,
      sampleMarkets: uniqueMarkets.slice(0, 5).map(m => ({
        question: m.question,
        condition_id: m.condition_id
      }))
    });
  
    return uniqueMarkets;
  }
  
  function calculateSimilarity(limitlessMarket: LimitlessMarket, polyMarket: PolymarketMarket) {
    const cleanText = (text: string) => {
      return text
        .toLowerCase()
        // Standardize number ranges
        .replace(/(\d+)\s*-\s*(\d+)/g, '$1to$2')
        // Remove common words
        .replace(/will|what|how|many|the|a|an|be|to|in|on|at|of|for|by/g, '')
        .replace(/\?/g, '')     // Remove question marks
        .replace(/[^\w\s]/g, '') // Remove other punctuation
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
    };
  
    const limitlessText = cleanText(`${limitlessMarket.title} ${limitlessMarket.description}`);
    const polyText = cleanText(`${polyMarket.question} ${polyMarket.description || ''}`);
    
    const similarity = stringSimilarity.compareTwoStrings(limitlessText, polyText);
    
    if (similarity > 0.5) {
      console.log("\nPotential Match Found:");
      console.log(`Similarity Score: ${(similarity * 100).toFixed(1)}%`);
      console.log(`Limitless: ${limitlessMarket.title}`);
      console.log(`Polymarket: ${polyMarket.question}`);
      console.log(`Limitless Volume: ${limitlessMarket.volumeFormatted} USDC`);
      console.log(`Cleaned Limitless: ${limitlessText}`);
      console.log(`Cleaned Poly: ${polyText}`);
      console.log("-".repeat(80));
    }
    
    return similarity;
  }

  export async function POST(request: Request) {
    const progress = new ProgressTracker();
    const matches: any[] = [];
    const topSimilarities: DetailedComparison[] = [];
  
    try {
      const { searchParams } = new URL(request.url);
      const threshold = parseFloat(searchParams.get('threshold') || SIMILARITY_THRESHOLD.toString());
  
      progress.addUpdate("start", `Starting market matching process with threshold ${threshold}`);
  
      // First get Limitless markets
      const limitlessMarkets = await fetchQualifyingLimitlessMarkets(progress);
      
      if (limitlessMarkets.length === 0) {
        progress.addUpdate("warning", "No qualifying Limitless markets found");
        return NextResponse.json({
          success: true,
          progress: progress.getUpdates(),
          matches: [],
          totalMatches: 0,
          stats: {
            limitlessMarkets: 0,
            polymarketMarkets: 0,
            totalComparisons: 0,
            similarityThreshold: threshold
          }
        });
      }
  
      // Then fetch Polymarket markets based on Limitless keywords
      const polymarketMarkets = await fetchPolymarketMarkets(limitlessMarkets, progress);
      
      if (polymarketMarkets.length === 0) {
        progress.addUpdate("warning", "No matching Polymarket markets found");
        return NextResponse.json({
          success: true,
          progress: progress.getUpdates(),
          matches: [],
          totalMatches: 0,
          stats: {
            limitlessMarkets: limitlessMarkets.length,
            polymarketMarkets: 0,
            totalComparisons: 0,
            similarityThreshold: threshold
          },
          qualifyingLimitlessMarkets: limitlessMarkets.map(m => ({
            title: m.title,
            volume: m.volumeFormatted,
            keywords: extractKeywords(`${m.title} ${m.description}`)
          }))
        });
      }
  
      progress.addUpdate("matching", "Starting similarity comparison", {
        limitlessMarketsCount: limitlessMarkets.length,
        polymarketsCount: polymarketMarkets.length,
        threshold: threshold
      });
  
      let comparisonCount = 0;
      const totalComparisons = limitlessMarkets.length * polymarketMarkets.length;
      
      for (const limitlessMarket of limitlessMarkets) {
        const marketComparisons: DetailedComparison[] = [];
  
        for (const polyMarket of polymarketMarkets) {
          comparisonCount++;
          const similarity = calculateSimilarity(limitlessMarket, polyMarket);
          
          marketComparisons.push({
            limitlessMarket: {
              title: limitlessMarket.title,
              description: limitlessMarket.description,
              volume: limitlessMarket.volumeFormatted,
              address: limitlessMarket.address,
              collateralSymbol: limitlessMarket.collateralToken.symbol
            },
            polyMarket: {
              question: polyMarket.question,
              description: polyMarket.description,
              condition_id: polyMarket.condition_id
            },
            similarity
          });
  
          if (similarity >= threshold) {
            progress.addUpdate("match_found", "Found matching markets", {
              limitlessTitle: limitlessMarket.title,
              polymarketTitle: polyMarket.question,
              similarity,
              limitlessVolume: limitlessMarket.volumeFormatted,
              keywords: extractKeywords(`${limitlessMarket.title} ${limitlessMarket.description}`)
            });
  
            const groupedMarket = await prisma.groupedMarket.create({
              data: {
                title: limitlessMarket.title,
                description: limitlessMarket.description,
                limitlessId: limitlessMarket.address,
                polymarketId: polyMarket.condition_id,
                similarity: similarity,
                endDate: new Date(limitlessMarket.expirationDate)
              }
            });
            
            matches.push(groupedMarket);
          }
  
          if (comparisonCount % 100 === 0) {
            progress.addUpdate("progress", "Comparison progress", {
              completed: comparisonCount,
              total: totalComparisons,
              percentComplete: ((comparisonCount / totalComparisons) * 100).toFixed(1)
            });
          }
        }
  
        // Get top matches for this market
        const bestComparisons = marketComparisons
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, DEBUG_TOP_SIMILARITIES);
        
        progress.addUpdate("market_analysis", `Top matches for Limitless market: ${limitlessMarket.title}`, {
          marketDetails: {
            title: limitlessMarket.title,
            volume: limitlessMarket.volumeFormatted,
            keywords: extractKeywords(`${limitlessMarket.title} ${limitlessMarket.description}`)
          },
          topMatches: bestComparisons.map(match => ({
            polymarketTitle: match.polyMarket.question,
            similarity: match.similarity
          }))
        });
  
        topSimilarities.push(...bestComparisons);
      }
  
      // Final summary
      progress.addUpdate("complete", "Market matching process complete", {
        totalMatches: matches.length,
        similarityThreshold: threshold,
        qualifyingMarketsCount: limitlessMarkets.length,
        topSimilarities: topSimilarities
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, DEBUG_TOP_SIMILARITIES * limitlessMarkets.length)
      });
  
      return NextResponse.json({
        success: true,
        progress: progress.getUpdates(),
        matches,
        totalMatches: matches.length,
        stats: {
          limitlessMarkets: limitlessMarkets.length,
          polymarketMarkets: polymarketMarkets.length,
          totalComparisons: comparisonCount,
          similarityThreshold: threshold
        },
        qualifyingLimitlessMarkets: limitlessMarkets.map(m => ({
          title: m.title,
          volume: m.volumeFormatted,
          keywords: extractKeywords(`${m.title} ${m.description}`)
        })),
        topSimilarities: topSimilarities
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, DEBUG_TOP_SIMILARITIES * limitlessMarkets.length)
      });
  
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Internal server error";
      progress.addUpdate("error", errorMessage);
      
      console.error("Market matching error:", error);
      return NextResponse.json(
        {
          error: errorMessage,
          progress: progress.getUpdates(),
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  }