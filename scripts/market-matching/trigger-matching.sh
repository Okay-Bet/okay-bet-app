#!/bin/bash

echo "Starting market matching process..."
curl -X POST http://localhost:3000/api/market-matching \
  -H "Content-Type: application/json" \
  | json_pp

echo -e "\nMarket matching process completed"