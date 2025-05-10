#!/bin/bash

# Navigate to the project directory (adjust this if needed)
cd /opt/render/project/src

# Run the Bowens scraper using Node.js
echo "Starting Bowens Scraper..."
node -e "require('./bowensScraper').scrapeBowens()"

echo "Bowens Scraper completed."
