# scripts/limitless/populate_limitless.py
from typing import List, Dict
import os
from dotenv import load_dotenv
from scripts.common.base import MarketAPI
from scripts.common.db import DatabaseUpdater
from datetime import datetime, timezone
import time

load_dotenv()

class LimitlessAPI(MarketAPI):
    def __init__(self):
        super().__init__()
        self.base_url = os.getenv('LIMITLESS_API_URL', 'http://157.245.87.57:8000/api/v1/limitless')
        
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
        """Fetch all markets from new Limitless API."""
        all_markets = []
        skipped_markets = []

        try:
            url = f"{self.base_url}/markets/list"
            print(f'Requesting Limitless markets from: {url}')
            
            response = self.session.get(url)
            
            if response.status_code != 200:
                print(f"Error fetching Limitless markets: {response.text}")
                return []

            response_data = response.json()
            markets_list = response_data.get('markets', [])
            
            print(f"Retrieved {len(markets_list)} markets from API")
            
            for market in markets_list:
                try:
                    # Format values properly
                    volume = float(market.get('contract_volume', 0))
                    open_interest = float(market.get('volume_24h', 0))  # Using 24h volume as open interest
                    
                    # Print raw market data for debugging
                    print(f"\nProcessing market:")
                    print(f"Title: {market.get('title')}")
                    print(f"Volume: {volume}")
                    print(f"24h Volume: {open_interest}")
                    print(f"Status: {market.get('status')}")
                    
                    # Format market data to match Prisma schema
                    market_data = {
                        'id': market.get('id'),  # String @id
                        'question': market.get('title'),  # String
                        'description': market.get('description'),  # String?
                        'endDate': self.parse_date(market.get('expiration_date')),  # DateTime?
                        'volume': volume,  # Float?
                        'openInterest': open_interest,  # Float?
                    }

                    # Only check for required fields
                    if market_data['id'] and market_data['question']:
                        all_markets.append(market_data)
                        print(f"Added market: {market_data['question']} "
                            f"(Volume: {market_data['volume']}, "
                            f"Open Interest: {market_data['openInterest']}, "
                            f"End Date: {market_data['endDate']})")
                    else:
                        skipped_reason = "Missing required fields (id or question)"
                        skipped_markets.append((market_data, skipped_reason))
                        print(f"Skipping market: {skipped_reason}")
                
                except Exception as e:
                    print(f"Error processing market: {e}")
                    print(f"Market data causing error: {market}")
                    continue

        except Exception as e:
            print(f"Error in fetch_markets: {e}")
            if hasattr(e, 'response') and e.response:
                print(f'Response content: {e.response.text}')
            return []

        print(f"\nSummary:")
        print(f"Markets added: {len(all_markets)}")
        print(f"Markets skipped: {len(skipped_markets)}")
        
        # Print skipped markets details
        if skipped_markets:
            print("\nSkipped markets details:")
            for market, reason in skipped_markets:
                print(f"Market: {market.get('question', 'N/A')} - Reason: {reason}")

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