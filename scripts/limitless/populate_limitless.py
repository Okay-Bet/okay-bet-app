# scripts/limitless/populate_limitless.py
from typing import List, Dict
import os
from dotenv import load_dotenv
from scripts.common.base import MarketAPI, MIN_VOLUME
from scripts.common.db import DatabaseUpdater
from datetime import datetime, timezone

load_dotenv()

class LimitlessAPI(MarketAPI):
    def __init__(self):
        super().__init__()
        self.base_url = os.getenv('LIMITLESS_API_URL', 'https://api.limitless.exchange')
        
    def parse_date(self, date_str: str) -> str:
        """Convert date string to ISO format."""
        if not date_str:
            return None
        try:
            # Parse the date and ensure it's in UTC
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.astimezone(timezone.utc).isoformat()
        except Exception as e:
            print(f"Error parsing date {date_str}: {e}")
            return None
        
    def fetch_markets(self) -> List[Dict]:
        """Fetch all active markets from Limitless API."""
        all_markets = []
        
        try:
            url = f"{self.base_url}/markets/active"
            print(f'Requesting Limitless markets from: {url}')
            
            response = self.session.get(url)
            
            if response.status_code != 200:
                print(f"Error fetching Limitless markets: {response.text}")
                return []

            markets_data = response.json()
            markets_list = markets_data.get('data', [])
            
            print(f"Retrieved {len(markets_list)} markets from API")
            
            for market in markets_list:
                try:
                    # Format values properly
                    volume = float(market.get('volumeFormatted', '0'))
                    open_interest = float(market.get('openInterestFormatted', '0'))
                    collateral_token = market.get('collateralToken', {}).get('address')
                    
                    # Only include USDC markets with sufficient activity
                    if ((volume > MIN_VOLUME or open_interest > MIN_VOLUME) and 
                        collateral_token and 
                        collateral_token.lower() == '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'.lower()):  # USDC on Base
                        
                        # Format market data to exactly match Prisma schema
                        market_data = {
                            'id': market.get('address'),  # String @id
                            'question': market.get('title'),  # String
                            'description': market.get('description'),  # String?
                            'endDate': self.parse_date(market.get('expirationDate')),  # DateTime?
                            'volume': volume,  # Float?
                            'openInterest': open_interest,  # Float?
                        }
                        
                        # Verify required fields are present and valid
                        if market_data['id'] and market_data['question']:
                            all_markets.append(market_data)
                            print(f"Added Limitless market: {market_data['question']} "
                                  f"(Volume: {market_data['volume']}, "
                                  f"Open Interest: {market_data['openInterest']}, "
                                  f"End Date: {market_data['endDate']})")
                        else:
                            print(f"Skipping market due to missing required fields: {market_data}")
                
                except Exception as e:
                    print(f"Error processing market: {e}")
                    print(f"Market data causing error: {market}")
                    continue

        except Exception as e:
            print(f"Error in fetch_markets: {e}")
            if hasattr(e, 'response') and e.response:
                print(f'Response content: {e.response.text}')

        print(f"Found {len(all_markets)} active Limitless markets with sufficient volume")
        return all_markets

def main():
    try:
        print('Starting Limitless database population...')
        api = LimitlessAPI()
        markets = api.fetch_markets()
        
        if markets:
            print(f"Attempting to update database with {len(markets)} markets")
            db_updater = DatabaseUpdater()
            # Enable debug mode in database updater
            print("Sample market data being sent to database:")
            print(markets[0] if markets else "No markets found")
            db_updater.update_markets(markets, "Limitless")
            db_updater.close()
            print('\nLimitless database update completed successfully')
        else:
            print('\nNo markets were fetched. Database update skipped.')
            
    except Exception as e:
        print(f'Script failed: {e}')
        raise

if __name__ == '__main__':
    main()