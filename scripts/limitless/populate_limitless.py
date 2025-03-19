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
        """Fetch all active markets from Limitless API with pagination."""
        all_markets = []
        skipped_markets = []
        page = 1
        BATCH_SIZE = 50

        while True:
            try:
                url = f"{self.base_url}/markets/active"
                params = {
                    'page': page,
                    'limit': BATCH_SIZE
                }
                print(f'Requesting Limitless markets from: {url} (Page: {page}, Limit: {BATCH_SIZE})')
                
                response = self.session.get(url, params=params)
                
                if response.status_code != 200:
                    print(f"Error fetching Limitless markets: {response.text}")
                    break

                markets_data = response.json()
                markets_list = markets_data.get('data', [])
                
                print(f"Retrieved {len(markets_list)} markets from API on page {page}")
                
                if not markets_list:  # No more markets to fetch
                    print(f'No more markets found on page {page}')
                    break
                
                for market in markets_list:
                    try:
                        # Format values properly
                        volume = float(market.get('volumeFormatted', '0'))
                        open_interest = float(market.get('openInterestFormatted', '0'))
                        collateral_token = market.get('collateralToken', {}).get('address')
                        
                        # Print raw market data for debugging
                        print(f"\nRaw market data:")
                        print(f"Title: {market.get('title')}")
                        print(f"Volume: {volume}")
                        print(f"Open Interest: {open_interest}")
                        print(f"Collateral Token: {collateral_token}")
                        
                        # Format market data to exactly match Prisma schema
                        market_data = {
                            'id': market.get('address'),  # String @id
                            'question': market.get('title'),  # String
                            'description': market.get('description'),  # String?
                            'endDate': self.parse_date(market.get('expirationDate')),  # DateTime?
                            'volume': volume,  # Float?
                            'openInterest': open_interest,  # Float?
                        }

                        # Only check for required fields, remove other filters
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

                # If we got fewer markets than the batch size, we're on the last page
                if len(markets_list) < BATCH_SIZE:
                    print(f'Last page reached (page {page})')
                    break
                    
                page += 1
                # Add a small delay to avoid rate limiting
                time.sleep(1)

            except Exception as e:
                print(f"Error in fetch_markets: {e}")
                if hasattr(e, 'response') and e.response:
                    print(f'Response content: {e.response.text}')
                break

        print(f"\nSummary:")
        print(f"Total pages fetched: {page}")
        print(f"Markets added: {len(all_markets)}")
        print(f"Markets skipped: {len(skipped_markets)}")
        
        # Print skipped markets details
        if skipped_markets:
            print("\nSkipped markets details:")
            for market, reason in skipped_markets:
                print(f"Market: {market.get('question', 'N/A')} - Reason: {reason}")

        return all_markets
    
    def parse_date(self, date_str: str) -> str:
        """Convert date string to ISO format."""
        if not date_str:
            return None
        try:
            # First try parsing as ISO format
            try:
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except ValueError:
                # If that fails, try parsing the "Month Day, Year" format
                dt = datetime.strptime(date_str, '%b %d, %Y')
            
            # Convert to UTC and return ISO format
            return dt.astimezone(timezone.utc).isoformat()
        except Exception as e:
            print(f"Error parsing date {date_str}: {e}")
            return None

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