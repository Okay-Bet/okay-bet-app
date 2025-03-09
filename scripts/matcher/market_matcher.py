# scripts/matcher/market_matcher.py
from typing import List, Dict, Tuple
from dataclasses import dataclass
from datetime import datetime
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import Levenshtein
from collections import defaultdict
from scripts.common.db import MarketFetcher

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

    @classmethod
    def from_dict(cls, data: Dict) -> 'Market':
        return cls(
            id=data['id'],
            question=data['question'],
            description=data.get('description', ''),
            volume=float(data.get('volume', 0)),
            end_date=data['end_date'],
            platform=data['platform'],
            liquidity=float(data.get('liquidity', 0)),
            open_interest=float(data.get('open_interest', 0))
        )

class MarketMatcher:
    def __init__(self):
        self.db = MarketFetcher()
        self.vectorizer = TfidfVectorizer(stop_words='english')

    def preprocess_text(self, text: str) -> str:
        """Basic text preprocessing."""
        text = text.lower()
        text = text.replace('?', '')
        return ' '.join(text.split())  # Normalize whitespace

    def get_initial_matches(self,
                          source_markets: List[Dict],
                          target_markets: List[Dict],
                          threshold: float = 0.7) -> List[Tuple[Market, Market, float]]:
        """First layer: Basic string similarity matching."""
        matches = []

        # Convert dictionaries to Market objects
        source_market_objects = [Market.from_dict(m) for m in source_markets]
        target_market_objects = [Market.from_dict(m) for m in target_markets]
        
        # Preprocess all questions
        source_questions = [self.preprocess_text(m.question) for m in source_market_objects]
        target_questions = [self.preprocess_text(m.question) for m in target_market_objects]
        
        # Convert to TF-IDF vectors
        all_questions = source_questions + target_questions
        tfidf_matrix = self.vectorizer.fit_transform(all_questions)
        
        # Calculate similarity between source and target markets
        source_vectors = tfidf_matrix[:len(source_markets)]
        target_vectors = tfidf_matrix[len(source_markets):]
        
        # Calculate similarity matrix
        similarity_matrix = cosine_similarity(source_vectors, target_vectors)
        
        # Find matches above threshold
        for i, source_market in enumerate(source_market_objects):
            for j, target_market in enumerate(target_market_objects):
                similarity = similarity_matrix[i, j]
                if similarity >= threshold:
                    matches.append((source_market, target_market, similarity))
        
        return matches

    def filter_by_date(self,
                      matches: List[Tuple[Market, Market, float]],
                      max_days_diff: int = 5) -> List[Tuple[Market, Market, float]]:
        """Second layer: Filter matches by end date proximity."""
        filtered_matches = []
        
        for source_market, target_market, similarity in matches:
            if not source_market.end_date or not target_market.end_date:
                continue
                
            days_diff = abs((source_market.end_date - target_market.end_date).days)
            if days_diff <= max_days_diff:
                filtered_matches.append((source_market, target_market, similarity))
                
        return filtered_matches

    def group_markets(self,
                     matches: List[Tuple[Market, Market, float]],
                     min_similarity: float = 0.7) -> List[Dict]:
        """Create market groups from matches."""
        market_groups = defaultdict(list)
        processed_markets = set()
        
        for source_market, target_market, similarity in matches:
            if similarity < min_similarity:
                continue
                
            # Create or add to group
            group_key = None
            
            # Check if either market is already in a group
            for key in market_groups:
                if source_market.id in [m.id for m in market_groups[key]] or \
                   target_market.id in [m.id for m in market_groups[key]]:
                    group_key = key
                    break
            
            if group_key is None:
                group_key = f"group_{len(market_groups)}"
            
            # Add both markets if not already in group
            if source_market.id not in [m.id for m in market_groups[group_key]]:
                market_groups[group_key].append(source_market)
            if target_market.id not in [m.id for m in market_groups[group_key]]:
                market_groups[group_key].append(target_market)
                
            processed_markets.add(source_market.id)
            processed_markets.add(target_market.id)
        
        # Convert to list of groups
        return [
            {
                "markets": [
                    {
                        "id": m.id,
                        "question": m.question,
                        "description": m.description,
                        "volume": m.volume,
                        "end_date": m.end_date,
                        "platform": m.platform,
                        "liquidity": m.liquidity,
                        "open_interest": m.open_interest
                    } for m in markets
                ],
                "platform_count": len(set(m.platform for m in markets)),
                "avg_similarity": min_similarity
            }
            for markets in market_groups.values()
        ]

    def process_markets(self, similarity_threshold: float = 0.7, date_threshold: int = 5):
        """Main processing function."""
        try:
            # Fetch markets using MarketFetcher
            limitless_markets = self.db.fetch_active_markets("Limitless")
            poly_markets = self.db.fetch_active_markets("Polymarket")
            kalshi_markets = self.db.fetch_active_markets("Kalshi")

            print(f"Processing {len(limitless_markets)} Limitless markets...")
            print(f"Found {len(poly_markets)} Polymarket markets")
            print(f"Found {len(kalshi_markets)} Kalshi markets")
            
            # Get initial matches for each platform pair
            limitless_poly_matches = self.get_initial_matches(
                limitless_markets,
                poly_markets,
                similarity_threshold
            )
            limitless_kalshi_matches = self.get_initial_matches(
                limitless_markets,
                kalshi_markets,
                similarity_threshold
            )
            
            print(f"Found {len(limitless_poly_matches)} initial Poly matches")
            print(f"Found {len(limitless_kalshi_matches)} initial Kalshi matches")
            
            # Filter by date
            limitless_poly_matches = self.filter_by_date(
                limitless_poly_matches,
                date_threshold
            )
            limitless_kalshi_matches = self.filter_by_date(
                limitless_kalshi_matches,
                date_threshold
            )
            
            print(f"After date filtering: {len(limitless_poly_matches)} Poly matches")
            print(f"After date filtering: {len(limitless_kalshi_matches)} Kalshi matches")
            
            # Combine all matches
            all_matches = limitless_poly_matches + limitless_kalshi_matches
            
            # Group markets
            market_groups = self.group_markets(all_matches, similarity_threshold)
            
            print(f"Created {len(market_groups)} market groups")

            # Validate groups before database update
            valid_groups = []
            for group in market_groups:
                # Ensure each group has at least one Limitless market and one other market
                has_limitless = any(m["platform"] == "Limitless" for m in group["markets"])
                has_other = any(m["platform"] != "Limitless" for m in group["markets"])
                
                if has_limitless and has_other:
                    valid_groups.append(group)
                else:
                    print(f"Skipping invalid group: {[m['platform'] for m in group['markets']]}")

            print(f"Found {len(valid_groups)} valid groups after validation")

            # Update database with valid groups
            if valid_groups:
                try:
                    self.db.update_grouped_markets(valid_groups)
                    print("Successfully updated grouped markets in database")
                except Exception as e:
                    print(f"Error updating grouped markets: {e}")
                    raise
            else:
                print("No valid groups found to update")

        except Exception as e:
            print(f"Error in process_markets: {e}")
            raise
        finally:
            self.db.close()

def main():
    matcher = MarketMatcher()
    matcher.process_markets(similarity_threshold=0.7)

if __name__ == "__main__":
    main()