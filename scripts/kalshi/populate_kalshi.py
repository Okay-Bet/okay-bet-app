from typing import List, Dict
import time
from scripts.common.base import MarketAPI, MIN_VOLUME
from scripts.common.db import DatabaseUpdater

KALSHI_API_URL = "https://api.elections.kalshi.com/trade-api/v2"

class KalshiAPI(MarketAPI):
    def __init__(self):
        super().__init__()
        self.base_url = KALSHI_API_URL
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
                
                # Group markets by event_ticker
                event_groups = {}
                for market in markets:
                    event_ticker = market['event_ticker']
                    if event_ticker not in event_groups:
                        event_groups[event_ticker] = []
                    event_groups[event_ticker].append(market)

                # Process each event group
                for event_ticker, event_markets in event_groups.items():
                    # Sort markets by volume/liquidity
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

                if not cursor:
                    print("No more pages to fetch")
                    break
                
                time.sleep(1)  # Rate limiting

            except Exception as e:
                print(f"Error in fetch_markets: {e}")
                break

        print(f"Found {len(all_markets)} active Kalshi markets with sufficient volume")
        return all_markets

def main():
    try:
        print('Starting Kalshi database population...')
        api = KalshiAPI()
        markets = api.fetch_markets()
        
        db_updater = DatabaseUpdater()
        db_updater.update_markets(markets, "Kalshi")
        db_updater.close()
        
        print('\nKalshi database update completed successfully')
    except Exception as e:
        print(f'Script failed: {e}')
        raise

if __name__ == '__main__':
    main()