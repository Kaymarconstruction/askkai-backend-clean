#!/bin/bash

# Configuration
BACKEND_URL="https://askkai-backend-clean.onrender.com"
EMAIL="mark@kaymarconstruction.com"

echo -e "\nStarting Bowens Scraper..."
curl -s -X POST "$BACKEND_URL/scrape/bowens" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$EMAIL\"}" | jq

echo -e "\nScraping Completed!"
