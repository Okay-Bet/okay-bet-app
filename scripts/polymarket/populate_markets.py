import requests
import psycopg2
from datetime import datetime
import os
from dotenv import load_dotenv
import time
import json
from typing import List, Dict

# Load environment variables
load_dotenv()

# Constants
GAMMA_API_URL = "https://gamma-api.polymarket.com"
BATCH_SIZE = 100
MIN_VOLUME = 1000  # Minimum volume to consider a market

class PolymarketAPI:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
        })

    def fetch_markets(self) -> List[Dict]:
        """Fetch all active markets from Polymarket API with pagination."""
        all_markets = []
        offset = 0
        
        while True:
            try:
                params = {
                    'limit': BATCH_SIZE,
                    'offset': offset,
                    'closed': 'false',
                    'archived': 'false',
                    'volume_num_min': str(MIN_VOLUME),
                    'ascending': 'false'
                }

                url = f"{GAMMA_API_URL}/markets"
                print(f'Requesting URL: {url} (offset: {offset})')
                print(f'With params: {json.dumps(params, indent=2)}')
                
                response = self.session.get(url, params=params)
                print(f'Response status code: {response.status_code}')
                
                if response.status_code != 200:
                    print(f'Error response: {response.text}')
                    break

                # The response is directly an array of markets
                markets = response.json()
                
                if not markets:  # No more markets to fetch
                    print(f'No more markets found at offset {offset}')
                    break

                for market in markets:
                    print(f"Checking market: {market.get('question', 'Unknown Market')}")
                    
                    market_data = {
                        'id': market.get('conditionId'),
                        'question': market['question'],
                        'description': market.get('resolutionSource'),
                        'endDate': market.get('endDate'),
                        'volume': float(market.get('liquidity', 0))
                    }
                    all_markets.append(market_data)
                    print(f"Added valid market: {market['question']} (Volume: {market_data['volume']})")

                if len(markets) < BATCH_SIZE:  # Last page
                    print(f'Last page reached at offset {offset}')
                    break

                offset += BATCH_SIZE
                print(f'Moving to next page, offset: {offset}')
                
                # Add a small delay to avoid rate limiting
                time.sleep(1)

            except Exception as e:
                print(f'Error fetching markets at offset {offset}: {e}')
                print(f'Exception details: {str(e)}')
                if hasattr(e, 'response'):
                    print(f'Response content: {e.response.text}')
                break

        print(f'Found {len(all_markets)} total valid markets')
        return all_markets


def get_database_connection():
    """Create a connection to the database using environment variables."""
    return psycopg2.connect(os.getenv('DATABASE_URL'))

def update_database(markets: List[Dict]):
    """Update the database with fetched markets."""
    if not markets:
        print("No markets to update")
        return

    print('Starting database update...')
    conn = get_database_connection()
    cur = conn.cursor()

    try:
        # Mark all existing markets as inactive
        cur.execute("""
            UPDATE "PolymarketMarket" 
            SET "isActive" = FALSE 
            WHERE "isActive" = TRUE
        """)

        # Prepare the insert/update query
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
            cur.execute(
                upsert_query,
                (
                    market['id'],
                    market['question'],
                    market.get('description'),
                    market['endDate'],
                    market['volume']
                )
            )

        conn.commit()
        print(f'Processed {len(markets)} markets')

    except Exception as e:
        conn.rollback()
        print(f'Error updating database: {e}')
        raise
    finally:
        cur.close()
        conn.close()

def main():
    """Main function to run the script."""
    try:
        print('Starting Polymarket database population script...')
        
        api = PolymarketAPI()
        markets = api.fetch_markets()
        print(f'Found {len(markets)} valid active markets')
        
        update_database(markets)
        print('Database update completed successfully')

    except Exception as e:
        print(f'Script failed: {e}')

if __name__ == '__main__':
    main()