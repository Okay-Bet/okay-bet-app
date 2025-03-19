from typing import List, Dict
import time
import json
import requests
from scripts.common.base import MarketAPI, MIN_VOLUME
from scripts.common.db import DatabaseUpdater

GAMMA_API_URL = "https://gamma-api.polymarket.com"
BATCH_SIZE = 100


class PolymarketAPI(MarketAPI):
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
    
def main():
    try:
        print('Starting Polymarket database population...')
        api = PolymarketAPI()
        markets = api.fetch_markets()
        
        db_updater = DatabaseUpdater()
        db_updater.update_markets(markets, "Polymarket")
        db_updater.close()
        
        print('\nPolymarket database update completed successfully')
    except Exception as e:
        print(f'Script failed: {e}')
        raise

if __name__ == '__main__':
    main()