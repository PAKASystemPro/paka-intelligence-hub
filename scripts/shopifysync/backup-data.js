/**
 * Database backup script
 * Creates a JSON backup of tables in the production schema
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'production' }
});

// Tables to backup
const tables = ['customers', 'orders', 'order_line_items'];

async function backupTable(tableName) {
  console.log(`Backing up ${tableName}...`);
  
  // Get all data from the table
  const { data, error } = await supabase.from(tableName).select('*');
  
  if (error) {
    console.error(`Error backing up ${tableName}:`, error);
    return null;
  }
  
  console.log(`Retrieved ${data.length} rows from ${tableName}`);
  return data;
}

async function createBackup() {
  // Create backups directory if it doesn't exist
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  // Create timestamp for filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  
  const backup = {};
  
  // Backup each table
  for (const table of tables) {
    const data = await backupTable(table);
    if (data) {
      backup[table] = data;
    }
  }
  
  // Write backup to file
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  console.log(`Backup saved to ${backupFile}`);
}

createBackup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
