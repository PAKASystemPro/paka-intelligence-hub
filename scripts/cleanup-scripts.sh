#!/bin/bash
# Script to clean up outdated and archive scripts

echo "Starting script cleanup..."

# Remove the entire archive directory
echo "Removing archive directory..."
rm -rf /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/archive

# Remove outdated test and development scripts
echo "Removing outdated scripts..."

# Test scripts
rm -f /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/check-cohort-data.js
rm -f /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/check-db-objects.js
rm -f /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/clean-all-test-data.js
rm -f /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/clear-test-data.sql
rm -f /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/production-schema-test-fixed.js
rm -f /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/production-schema-test.js
rm -f /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/validate-cohort-data.js

# Old helper function scripts
rm -f /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/create-additional-helpers.sql
rm -f /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/create-helper-functions.sql
rm -f /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/create-insert-functions.sql
rm -f /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/create-test-customers-function.sql
rm -f /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/create_count_line_items_function.sql

# Create a new organized structure
echo "Creating organized script directories..."
mkdir -p /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/core
mkdir -p /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/utils
mkdir -p /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/maintenance
mkdir -p /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/sql

# Move important scripts to appropriate directories
echo "Organizing remaining scripts..."
mv /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/cleanup-database.sql /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/sql/
mv /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/apply-migrations.js /Users/tonycheung/Documents/Windsurf/paka-intelligence-hub/scripts/maintenance/

echo "✅ Script cleanup completed!"
echo "Removed archive directory and outdated scripts."
echo "Created organized directory structure for scripts."
