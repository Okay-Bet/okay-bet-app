import requests
from abc import ABC, abstractmethod
from typing import List, Dict

class MarketAPI(ABC):
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
        })

    @abstractmethod
    def fetch_markets(self) -> List[Dict]:
        pass

# Common constants
MIN_VOLUME = 100  # Minimum volume to consider a market