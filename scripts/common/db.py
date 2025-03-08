# scripts/common/db.py
import psycopg2
import os
from typing import List, Dict
from dotenv import load_dotenv
import json
from datetime import datetime

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

        print(f'Starting {market_type} database update...')
        cur = self.conn.cursor()

        try:
            # Mark all existing markets as inactive
            cur.execute(f"""
                UPDATE "{market_type}Market" 
                SET "isActive" = FALSE 
                WHERE "isActive" = TRUE
            """)

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