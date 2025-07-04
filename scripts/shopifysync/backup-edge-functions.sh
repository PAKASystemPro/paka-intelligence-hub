#!/bin/bash
# Script to backup Supabase Edge Functions

# Create a timestamp for the backup folder
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="./backups/edge-functions_$TIMESTAMP"

# Create the backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting Supabase Edge Functions backup..."
echo "Backup will be stored in: $BACKUP_DIR"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Get the Supabase project reference from .env.local if available
PROJECT_REF=""
if [ -f ".env.local" ]; then
    # Try to extract project reference from SUPABASE_URL
    SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
    if [[ $SUPABASE_URL =~ https://([^.]+) ]]; then
        PROJECT_REF="${BASH_REMATCH[1]}"
        echo "Found project reference: $PROJECT_REF"
    fi
fi

# If project reference wasn't found, ask for it
if [ -z "$PROJECT_REF" ]; then
    echo "Could not automatically determine Supabase project reference."
    echo "Please enter your Supabase project reference:"
    read -r PROJECT_REF
fi

# Create a directory for each function and download them individually
echo "Downloading Edge Functions from project: $PROJECT_REF"

# First, list all functions
echo "Listing available functions..."
FUNCTIONS=$(supabase functions list --project-ref "$PROJECT_REF" 2>/dev/null)

# Check if we got any functions
if [ $? -ne 0 ]; then
    echo "Failed to list functions. Make sure you're logged in."
    echo "Try running: supabase login"
    exit 1
fi

# Extract function names (this might need adjustment based on actual output format)
FUNCTION_NAMES=$(echo "$FUNCTIONS" | grep -v "^ID" | awk '{print $1}')

# If no functions found
if [ -z "$FUNCTION_NAMES" ]; then
    echo "No functions found in project $PROJECT_REF"
else
    # Download each function
    for func in $FUNCTION_NAMES; do
        echo "Downloading function: $func"
        mkdir -p "$BACKUP_DIR/$func"
        supabase functions download "$func" --project-ref "$PROJECT_REF" > "$BACKUP_DIR/$func/function.js" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully downloaded: $func"
        else
            echo "❌ Failed to download: $func"
        fi
    done
fi

# Check if the download was successful
if [ $? -eq 0 ]; then
    echo "✅ Edge Functions backup completed successfully!"
    echo "Backup location: $BACKUP_DIR"
    
    # Create a list of backed up functions
    echo "Creating function list..."
    ls -la "$BACKUP_DIR" > "$BACKUP_DIR/function_list.txt"
    
    echo "Functions backed up:"
    cat "$BACKUP_DIR/function_list.txt"
else
    echo "❌ Edge Functions backup failed."
    echo "Please make sure you have the correct project reference and are logged in to Supabase CLI."
    echo "Run 'supabase login' if you haven't authenticated yet."
fi
