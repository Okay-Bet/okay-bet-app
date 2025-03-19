# scripts/common/db.py
import psycopg2
import os
from typing import List, Dict
from dotenv import load_dotenv
import json
from datetime import datetime
import cuid

# Load environment variables
load_dotenv()

class DatabaseUpdater:
    def __init__(self):
        self.conn = psycopg2.connect(os.getenv('DATABASE_URL'))

    def format_date(self, date_value) -> datetime:
        """Safely format date values for database insertion."""
        if not date_value:
            return None
        if isinstance(date_value, datetime):
            return date_value
        if isinstance(date_value, str):
            try:
                return datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            except ValueError:
                print(f"Warning: Could not parse date {date_value}")
                return None
        return None

    def update_markets(self, markets: List[Dict], market_type: str):
        """Update the database with fetched markets."""
        if not markets:
            print(f"No {market_type} markets to update")
            return

        print(f'\nStarting {market_type} database update...')
        print(f'Total markets to process: {len(markets)}')
        cur = self.conn.cursor()

        success_count = 0
        error_count = 0

        try:
            # Mark all existing markets as inactive
            cur.execute(f"""
                UPDATE "{market_type}Market" 
                SET "isActive" = FALSE 
                WHERE "isActive" = TRUE
            """)
            print(f"Marked existing {market_type} markets as inactive")

            # Different handling based on market type
            if market_type == "Limitless":
                upsert_query = """
                    INSERT INTO "LimitlessMarket" (
                        "id", "question", "description", "endDate", "volume", 
                        "openInterest", "isActive", "lastChecked", "createdAt", "updatedAt"
                    ) 
                    VALUES (%s, %s, %s, %s, %s, %s, TRUE, NOW(), NOW(), NOW())
                    ON CONFLICT ("id") DO UPDATE 
                    SET 
                        "question" = EXCLUDED."question",
                        "description" = EXCLUDED."description",
                        "endDate" = EXCLUDED."endDate",
                        "volume" = EXCLUDED."volume",
                        "openInterest" = EXCLUDED."openInterest",
                        "isActive" = TRUE,
                        "lastChecked" = NOW(),
                        "updatedAt" = NOW()
                """
            elif market_type == "Kalshi":
                upsert_query = """
                    INSERT INTO "KalshiMarket" (
                        "id", "question", "description", "endDate", "volume",
                        "openInterest", "liquidity", "status",
                        "isActive", "lastChecked", "createdAt", "updatedAt"
                    ) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE, NOW(), NOW(), NOW())
                    ON CONFLICT ("id") DO UPDATE 
                    SET 
                        "question" = EXCLUDED."question",
                        "description" = EXCLUDED."description",
                        "endDate" = EXCLUDED."endDate",
                        "volume" = EXCLUDED."volume",
                        "openInterest" = EXCLUDED."openInterest",
                        "liquidity" = EXCLUDED."liquidity",
                        "status" = EXCLUDED."status",
                        "isActive" = TRUE,
                        "lastChecked" = NOW(),
                        "updatedAt" = NOW()
                """
            else:  # Polymarket
                upsert_query = """
                    INSERT INTO "PolymarketMarket" (
                        "id", "question", "description", "endDate", "volume",
                        "isActive", "lastChecked", "createdAt", "updatedAt"
                    ) 
                    VALUES (%s, %s, %s, %s, %s, TRUE, NOW(), NOW(), NOW())
                    ON CONFLICT ("id") DO UPDATE 
                    SET 
                        "question" = EXCLUDED."question",
                        "description" = EXCLUDED."description",
                        "endDate" = EXCLUDED."endDate",
                        "volume" = EXCLUDED."volume",
                        "isActive" = TRUE,
                        "lastChecked" = NOW(),
                        "updatedAt" = NOW()
                """

            for market in markets:
                try:
                    print(f"\nProcessing market:")
                    print(f"ID: {market.get('id')}")
                    print(f"Question: {market.get('question')[:100]}...")
                    print(f"Volume: {market.get('volume')}")
                    print(f"Open Interest: {market.get('openInterest')}")
                    # Format values based on market type
                    if market_type == "Limitless":
                        values = [
                            market['id'],
                            market['question'],
                            market.get('description'),
                            self.format_date(market.get('endDate')),
                            float(market.get('volume', 0)),
                            float(market.get('openInterest', 0))
                        ]
                    elif market_type == "Kalshi":
                        values = [
                            market['id'],
                            market['question'],
                            market.get('description'),
                            self.format_date(market.get('endDate')),
                            float(market.get('volume', 0)),
                            float(market.get('openInterest', 0)),
                            float(market.get('liquidity', 0)),
                            market.get('status')
                        ]
                    else:  # Polymarket
                        values = [
                            market['id'],
                            market['question'],
                            market.get('description'),
                            self.format_date(market.get('endDate')),
                            float(market.get('volume', 0))
                        ]

                    cur.execute(upsert_query, values)
                    print(f"Updated market: {market['question'][:100]}...")

                except Exception as e:
                    print(f"Error updating market {market.get('id')}: {e}")
                    print(f"Market data: {json.dumps(market, indent=2, default=str)}")
                    continue

            self.conn.commit()
            print(f'Successfully processed {len(markets)} {market_type} markets')

        except Exception as e:
            self.conn.rollback()
            print(f'Error updating {market_type} database: {e}')
            raise
        finally:
            cur.close()

    def get_database_connection(self):
        """Get the current database connection."""
        return self.conn

    def close(self):
        """Close the database connection."""
        if self.conn:
            self.conn.close()

class MarketFetcher:
    def __init__(self):
        self.conn = psycopg2.connect(os.getenv('DATABASE_URL'))

    def fetch_active_markets(self, platform: str) -> List[Dict]:
        """Fetch active markets for a given platform."""
        cur = self.conn.cursor()
        try:
            if platform == "Limitless":
                query = """
                    SELECT id, question, description, volume, "endDate", 
                           "openInterest", 0 as liquidity
                    FROM "LimitlessMarket"
                    WHERE "isActive" = TRUE
                """
            elif platform == "Polymarket":
                query = """
                    SELECT id, question, description, volume, "endDate",
                           0 as "openInterest", 0 as liquidity
                    FROM "PolymarketMarket"
                    WHERE "isActive" = TRUE
                """
            elif platform == "Kalshi":
                query = """
                    SELECT id, question, description, volume, "endDate",
                           "openInterest", "liquidity"
                    FROM "KalshiMarket"
                    WHERE "isActive" = TRUE
                """
            else:
                raise ValueError(f"Unknown platform: {platform}")

            cur.execute(query)
            markets = []
            for row in cur.fetchall():
                markets.append({
                    "id": row[0],
                    "question": row[1],
                    "description": row[2] or '',
                    "volume": float(row[3] or 0),
                    "end_date": row[4],
                    "platform": platform,
                    "open_interest": float(row[5] or 0),
                    "liquidity": float(row[6] or 0)
                })
            return markets
        finally:
            cur.close()

    def update_grouped_markets(self, market_groups: List[Dict]):
        """Update the GroupedMarket table with new matches."""
        cur = self.conn.cursor()
        try:
            # Clear existing groups and their relationships
            cur.execute('TRUNCATE TABLE "GroupedMarket" CASCADE')
            
            for group in market_groups:
                # Create new group
                group_id = cuid.cuid()
                cur.execute("""
                    INSERT INTO "GroupedMarket" (id, "createdAt", "updatedAt")
                    VALUES (%s, NOW(), NOW())
                    RETURNING id
                """, (group_id,))
                
                # Process each market by platform
                for market in group["markets"]:
                    market_id = market["id"]
                    similarity = group["avg_similarity"]
                    
                    if market["platform"] == "Limitless":
                        cur.execute("""
                            INSERT INTO "LimitlessGroupedMarket" 
                            (id, "groupId", "marketId", similarity)
                            VALUES (%s, %s, %s, %s)
                        """, (cuid.cuid(), group_id, market_id, similarity))
                    
                    elif market["platform"] == "Polymarket":
                        cur.execute("""
                            INSERT INTO "PolymarketGroupedMarket"
                            (id, "groupId", "marketId", similarity)
                            VALUES (%s, %s, %s, %s)
                        """, (cuid.cuid(), group_id, market_id, similarity))
                    
                    elif market["platform"] == "Kalshi":
                        cur.execute("""
                            INSERT INTO "KalshiGroupedMarket"
                            (id, "groupId", "marketId", similarity)
                            VALUES (%s, %s, %s, %s)
                        """, (cuid.cuid(), group_id, market_id, similarity))

                self.conn.commit()
                
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cur.close()

    def close(self):
        """Close the database connection."""
        if self.conn:
            self.conn.close()