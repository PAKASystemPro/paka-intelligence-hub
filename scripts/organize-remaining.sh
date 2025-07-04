#!/bin/bash
# Script to organize remaining scripts into appropriate directories

echo "Organizing remaining scripts..."

# Move core functionality scripts
mv /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/fetch-shopify-monthly-data.js /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/core/
mv /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/sync-all-months-and-check-cohort.js /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/core/

# Move maintenance scripts
mv /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/fix-constraint-issues.js /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/maintenance/
mv /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/rebuild-cohort-data.js /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/maintenance/

# Move utility scripts
mv /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/create-views.js /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/utils/

# Create a README file in each directory to explain its purpose
cat > /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/core/README.md << 'EOL'
# Core Scripts

This directory contains core functionality scripts for the Shopify data synchronization pipeline:

- `fetch-shopify-monthly-data.js` - Fetches monthly data from Shopify API
- `sync-all-months-and-check-cohort.js` - Synchronizes all months and validates cohort data
EOL

cat > /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/maintenance/README.md << 'EOL'
# Maintenance Scripts

This directory contains scripts for database and project maintenance:

- `apply-migrations.js` - Applies database migrations
- `fix-constraint-issues.js` - Fixes database constraint issues
- `rebuild-cohort-data.js` - Rebuilds cohort data from scratch
EOL

cat > /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/utils/README.md << 'EOL'
# Utility Scripts

This directory contains utility scripts:

- `create-views.js` - Creates database views for analytics
EOL

cat > /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/sql/README.md << 'EOL'
# SQL Scripts

This directory contains SQL scripts for database operations:

- `cleanup-database.sql` - Cleans up all data while preserving schema structure
EOL

echo "✅ Organization completed!"
echo "All scripts have been organized into appropriate directories."
