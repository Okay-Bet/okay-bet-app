import os
from dotenv import load_dotenv
import psycopg2
from typing import List, Dict, Optional
import json
from dataclasses import dataclass
from datetime import datetime
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from scripts.common.base import MarketAPI, MIN_VOLUME
from scripts.common.db import DatabaseUpdater

# Load environment variables
load_dotenv()

@dataclass
class Market:
    id: str
    question: str
    description: str
    volume: float
    end_date: datetime
    platform: str
    liquidity: float = 0
    open_interest: float = 0

class MarketMatcher:
    def __init__(self):
        self.conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        self.vectorizer = TfidfVectorizer(stop_words='english')
        
    def fetch_active_markets(self, platform: str) -> List[Market]:
        """Fetch active markets for a given platform."""
        cur = self.conn.cursor()
        try:
            query = f"""
                SELECT id, question, description, volume, "endDate", 
                       {"openInterest, liquidity" if platform != "Polymarket" else "0, 0"}
                FROM "{platform}Market"
                WHERE "isActive" = TRUE
            """
            cur.execute(query)
            markets = []
            for row in cur.fetchall():
                markets.append(Market(
                    id=row[0],
                    question=row[1],
                    description=row[2] or '',
                    volume=float(row[3]),
                    end_date=row[4],
                    platform=platform,
                    open_interest=float(row[5]) if platform != "Polymarket" else 0,
                    liquidity=float(row[6]) if platform != "Polymarket" else 0
                ))
            return markets
        finally:
            cur.close()

    def calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate cosine similarity between two text strings."""
        try:
            # Combine texts for vectorization
            texts = [text1.lower(), text2.lower()]
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            
            # Calculate cosine similarity
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            return float(similarity)
        except Exception as e:
            print(f"Error calculating similarity: {e}")
            return 0.0

    def find_similar_markets(self, 
                           market: Market, 
                           other_markets: List[Market], 
                           similarity_threshold: float = 0.5) -> List[Dict]:
        """Find similar markets above the threshold."""
        similar_markets = []
        
        for other_market in other_markets:
            # Combine question and description for better matching
            text1 = f"{market.question} {market.description}"
            text2 = f"{other_market.question} {other_market.description}"
            
            similarity = self.calculate_similarity(text1, text2)
            
            if similarity >= similarity_threshold:
                similar_markets.append({
                    "market": other_market,
                    "similarity": similarity
                })
        
        # Sort by similarity score
        similar_markets.sort(key=lambda x: x["similarity"], reverse=True)
        return similar_markets

    def update_grouped_markets(self, 
                             limitless_market: Market, 
                             poly_matches: List[Dict], 
                             kalshi_matches: List[Dict]):
        """Update or insert grouped markets in the database."""
        cur = self.conn.cursor()
        try:
            # First, create the group
            cur.execute("""
                INSERT INTO "GroupedMarket" (
                    "limitlessId", "createdAt", "updatedAt"
                ) VALUES (%s, NOW(), NOW())
                RETURNING id
            """, (limitless_market.id,))
            group_id = cur.fetchone()[0]

            # Add Polymarket matches
            for match in poly_matches:
                cur.execute("""
                    INSERT INTO "GroupedMarket" (
                        "limitlessId", "polymarketId", "similarity",
                        "createdAt", "updatedAt"
                    ) VALUES (%s, %s, %s, NOW(), NOW())
                """, (
                    limitless_market.id,
                    match["market"].id,
                    match["similarity"]
                ))

            # Add Kalshi matches
            for match in kalshi_matches:
                cur.execute("""
                    INSERT INTO "GroupedMarket" (
                        "limitlessId", "kalshiId", "similarity",
                        "createdAt", "updatedAt"
                    ) VALUES (%s, %s, %s, NOW(), NOW())
                """, (
                    limitless_market.id,
                    match["market"].id,
                    match["similarity"]
                ))

            self.conn.commit()
            return group_id
        except Exception as e:
            self.conn.rollback()
            print(f"Error updating grouped markets: {e}")
            raise
        finally:
            cur.close()

    def process_markets(self, similarity_threshold: float = 0.5):
        """Main process to match markets across platforms."""
        try:
            # Fetch active markets from all platforms
            limitless_markets = self.fetch_active_markets("Limitless")
            polymarket_markets = self.fetch_active_markets("Polymarket")
            kalshi_markets = self.fetch_active_markets("Kalshi")

            print(f"Found {len(limitless_markets)} Limitless markets")
            print(f"Found {len(polymarket_markets)} Polymarket markets")
            print(f"Found {len(kalshi_markets)} Kalshi markets")

            # Clear existing grouped markets
            cur = self.conn.cursor()
            cur.execute('TRUNCATE TABLE "GroupedMarket" CASCADE')
            self.conn.commit()

            # Process each Limitless market
            for limitless_market in limitless_markets:
                print(f"\nProcessing Limitless market: {limitless_market.question}")

                # Find similar markets on both platforms
                poly_matches = self.find_similar_markets(
                    limitless_market, polymarket_markets, similarity_threshold
                )
                kalshi_matches = self.find_similar_markets(
                    limitless_market, kalshi_markets, similarity_threshold
                )

                if poly_matches or kalshi_matches:
                    print(f"Found {len(poly_matches)} Polymarket matches")
                    print(f"Found {len(kalshi_matches)} Kalshi matches")
                    
                    # Update database with matches
                    group_id = self.update_grouped_markets(
                        limitless_market, poly_matches, kalshi_matches
                    )
                    print(f"Created group with ID: {group_id}")

        except Exception as e:
            print(f"Error processing markets: {e}")
            raise
        finally:
            self.conn.close()

def main():
    matcher = MarketMatcher()
    matcher.process_markets(similarity_threshold=0.5)

if __name__ == "__main__":
    main()