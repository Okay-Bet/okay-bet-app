from typing import List, Dict
import os
from dotenv import load_dotenv
from scripts.common.base import MarketAPI, MIN_VOLUME
from scripts.common.db import DatabaseUpdater

load_dotenv()

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

def main():
    try:
        print('Starting Limitless database population...')
        api = LimitlessAPI()
        markets = api.fetch_markets()
        
        db_updater = DatabaseUpdater()
        db_updater.update_markets(markets, "Limitless")
        db_updater.close()
        
        print('\nLimitless database update completed successfully')
    except Exception as e:
        print(f'Script failed: {e}')
        raise

if __name__ == '__main__':
    main()