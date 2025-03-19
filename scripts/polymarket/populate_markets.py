import requests
import psycopg2
from datetime import datetime
import os
from dotenv import load_dotenv
import time
import json
from typing import List, Dict
from abc import ABC, abstractmethod 

# Load environment variables
load_dotenv()

# Constants
GAMMA_API_URL = "https://gamma-api.polymarket.com"
KALSHI_API_URL = "https://api.elections.kalshi.com/trade-api/v2"
BATCH_SIZE = 100
MIN_VOLUME = 1000  # Minimum volume to consider a market

class MarketAPI(ABC):  # Now this will work
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
        })

    @abstractmethod
    def fetch_markets(self) -> List[Dict]:
        pass


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

class KalshiAPI(MarketAPI):
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.elections.kalshi.com/trade-api/v2"
        self.session.headers.update({
            "accept": "application/json"
        })

    def get_market_details(self, ticker: str) -> Dict:
        """Fetch detailed information for a specific market."""
        try:
            url = f"{self.base_url}/markets/{ticker}"
            response = self.session.get(url)
            
            if response.status_code != 200:
                print(f"Error fetching market details for {ticker}: {response.text}")
                return None
            
            return response.json()
        except Exception as e:
            print(f"Error fetching market details for {ticker}: {e}")
            return None

    def fetch_markets(self) -> List[Dict]:
        """Fetch all active markets from Kalshi API with pagination."""
        all_markets = []
        cursor = None
        
        while True:
            try:
                params = {
                    'limit': 1000,  # Maximum allowed by API
                    'status': 'open,unopened',  # Only get active markets
                }
                
                if cursor:
                    params['cursor'] = cursor

                url = f"{self.base_url}/markets"
                print(f'Requesting Kalshi markets (cursor: {cursor})')
                
                response = self.session.get(url, params=params)
                
                if response.status_code != 200:
                    print(f"Error fetching markets list: {response.text}")
                    break

                data = response.json()
                markets = data.get('markets', [])
                cursor = data.get('cursor')  # Get next page cursor
                
                print(f"Fetched {len(markets)} markets in this batch")
                
                # Group markets by event_ticker to handle multiple markets for same event
                event_groups = {}
                for market in markets:
                    event_ticker = market['event_ticker']
                    if event_ticker not in event_groups:
                        event_groups[event_ticker] = []
                    event_groups[event_ticker].append(market)

                # Process each event group
                for event_ticker, event_markets in event_groups.items():
                    # Sort markets by volume/liquidity if available
                    sorted_markets = sorted(
                        event_markets,
                        key=lambda x: (float(x.get('volume', 0)) + float(x.get('liquidity', 0))),
                        reverse=True
                    )
                    
                    # Take the most liquid market from each event
                    primary_market = sorted_markets[0]
                    
                    # Get detailed market info
                    market_details = self.get_market_details(primary_market['ticker'])
                    if not market_details:
                        continue

                    market_data = {
                        'id': primary_market['ticker'],
                        'question': primary_market['title'],
                        'description': (
                            f"Rules: {primary_market.get('rules_primary', '')}\n"
                            f"Additional Info: {primary_market.get('rules_secondary', '')}"
                        ).strip(),
                        'endDate': primary_market.get('close_time'),
                        'volume': float(primary_market.get('volume', 0)),
                        'status': primary_market.get('status'),
                        'openInterest': float(primary_market.get('open_interest', 0)),
                        'liquidity': float(primary_market.get('liquidity', 0)),
                    }
                    
                    # Only include markets with sufficient activity
                    if (market_data['volume'] > MIN_VOLUME or 
                        market_data['openInterest'] > MIN_VOLUME or 
                        market_data['liquidity'] > MIN_VOLUME):
                        all_markets.append(market_data)
                        print(f"Added Kalshi market: {market_data['question']} "
                              f"(Volume: {market_data['volume']}, "
                              f"Open Interest: {market_data['openInterest']})")

                # If no cursor is returned, we've reached the last page
                if not cursor:
                    print("No more pages to fetch")
                    break
                
                # Add a small delay to avoid rate limiting
                time.sleep(1)

            except Exception as e:
                print(f"Error in fetch_markets: {e}")
                break

        print(f"Found {len(all_markets)} active Kalshi markets with sufficient volume")
        return all_markets

class LimitlessAPI(MarketAPI):
    def __init__(self):
        super().__init__()
        self.base_url = os.getenv('LIMITLESS_API_URL', 'https://api.limitless.markets')
        
    def fetch_markets(self) -> List[Dict]:
        """Fetch all active markets from Limitless API."""
        all_markets = []
        
        try:
            # Fetch active markets
            url = f"{self.base_url}/v1/markets"
            print(f'Requesting Limitless markets from: {url}')
            
            response = self.session.get(url)
            
            if response.status_code != 200:
                print(f"Error fetching Limitless markets: {response.text}")
                return []

            markets_data = response.json()
            
            for market in markets_data.get('markets', []):
                # Extract relevant market data
                market_data = {
                    'id': market.get('id'),
                    'question': market.get('title'),
                    'description': market.get('description'),
                    'endDate': market.get('expirationTime'),
                    'volume': float(market.get('volume', 0)),
                    'openInterest': float(market.get('openInterest', 0)),
                }
                
                # Only include markets with sufficient activity
                if market_data['volume'] > MIN_VOLUME or market_data['openInterest'] > MIN_VOLUME:
                    all_markets.append(market_data)
                    print(f"Added Limitless market: {market_data['question']} "
                          f"(Volume: {market_data['volume']}, "
                          f"Open Interest: {market_data['openInterest']})")

        except Exception as e:
            print(f"Error in fetch_markets: {e}")
            if hasattr(e, 'response'):
                print(f'Response content: {e.response.text}')

        print(f"Found {len(all_markets)} active Limitless markets with sufficient volume")
        return all_markets

def get_database_connection():
    """Create a connection to the database using environment variables."""
    return psycopg2.connect(os.getenv('DATABASE_URL'))

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

            self.conn.commit()
            print(f'Processed {len(markets)} {market_type} markets')

        except Exception as e:
            self.conn.rollback()
            print(f'Error updating {market_type} database: {e}')
            raise
        finally:
            cur.close()

    def close(self):
        self.conn.close()

def main():
    """Main function to run the script."""
    try:
        print('Starting market database population script...')
        
        # Initialize APIs
        polymarket_api = PolymarketAPI()
        kalshi_api = KalshiAPI()
        limitless_api = LimitlessAPI()
        
        # Fetch markets from all sources
        print('\nFetching Polymarket markets...')
        polymarket_markets = polymarket_api.fetch_markets()
        print(f'Found {len(polymarket_markets)} valid active Polymarket markets')
        
        print('\nFetching Kalshi markets...')
        kalshi_markets = kalshi_api.fetch_markets()
        print(f'Found {len(kalshi_markets)} valid active Kalshi markets')
        
        print('\nFetching Limitless markets...')
        limitless_markets = limitless_api.fetch_markets()
        print(f'Found {len(limitless_markets)} valid active Limitless markets')
        
        # Update database
        db_updater = DatabaseUpdater()
        
        print('\nUpdating Polymarket database...')
        db_updater.update_markets(polymarket_markets, "Polymarket")
        
        print('\nUpdating Kalshi database...')
        db_updater.update_markets(kalshi_markets, "Kalshi")
        
        print('\nUpdating Limitless database...')
        db_updater.update_markets(limitless_markets, "Limitless")
        
        db_updater.close()
        print('\nDatabase updates completed successfully')

    except Exception as e:
        print(f'Script failed: {e}')
        raise

if __name__ == '__main__':
    main()