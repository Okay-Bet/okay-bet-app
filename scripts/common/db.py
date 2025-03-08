import psycopg2
import os
from typing import List, Dict
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

class DatabaseUpdater:
    def __init__(self):
        self.conn = psycopg2.connect(os.getenv('DATABASE_URL'))

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

            # Prepare the insert/update query
            upsert_query = f"""
                INSERT INTO "{market_type}Market" (
                    "id", "question", "description", "endDate", "volume", 
                    "isActive", "lastChecked", "createdAt", "updatedAt"
                    {', "openInterest"' if market_type in ['Kalshi', 'Limitless'] else ''}
                    {', "liquidity"' if market_type == 'Kalshi' else ''}
                ) 
                VALUES (
                    %s, %s, %s, %s, %s, TRUE, NOW(), NOW(), NOW()
                    {', %s' if market_type in ['Kalshi', 'Limitless'] else ''}
                    {', %s' if market_type == 'Kalshi' else ''}
                )
                ON CONFLICT ("id") DO UPDATE 
                SET 
                    "question" = EXCLUDED."question",
                    "description" = EXCLUDED."description",
                    "endDate" = EXCLUDED."endDate",
                    "volume" = EXCLUDED."volume",
                    "isActive" = TRUE,
                    "lastChecked" = NOW(),
                    "updatedAt" = NOW()
                    {', "openInterest" = EXCLUDED."openInterest"' if market_type in ['Kalshi', 'Limitless'] else ''}
                    {', "liquidity" = EXCLUDED."liquidity"' if market_type == 'Kalshi' else ''}
            """

            for market in markets:
                try:
                    values = [
                        market['id'],
                        market['question'],
                        market.get('description'),
                        market['endDate'],
                        market['volume']
                    ]
                    
                    if market_type in ['Kalshi', 'Limitless']:
                        values.append(market.get('openInterest', 0))
                    
                    if market_type == 'Kalshi':
                        values.append(market.get('liquidity', 0))

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
