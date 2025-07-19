// execute-chunks.ts
// This script finds ALL generated SQL files and executes them in the correct order.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const sqlOutputDir = path.join(process.cwd(), 'sql_output');
  
  if (!fs.existsSync(sqlOutputDir)) {
    console.error(`Error: Directory not found at ${sqlOutputDir}`);
    process.exit(1);
  }

  // Get all .sql files and sort them alphabetically
  // This works because of our 01_, 02_, etc. naming convention.
  const filesToExecute = fs.readdirSync(sqlOutputDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (filesToExecute.length === 0) {
    console.error("No .sql files found in the sql_output directory.");
    return;
  }

  console.log(`Found ${filesToExecute.length} SQL files to execute.`);

  for (const [index, file] of filesToExecute.entries()) {
    console.log(`\n--- Executing file ${index + 1}/${filesToExecute.length}: ${file} ---`);
    const filePath = path.join(sqlOutputDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');

    // We can't run transaction blocks (BEGIN/COMMIT) inside the rpc function.
    // The function itself runs in its own transaction.
    const cleanSql = sqlContent.replace(/BEGIN;|COMMIT;/g, '');

    const { error } = await supabase.rpc('execute_sql', {
      sql_statement: cleanSql,
    });

    if (error) {
      console.error(`\n!!!!!! ERROR ON FILE: ${file} !!!!!!`);
      console.error("DETAILED ERROR:", JSON.stringify(error, null, 2));
      console.error("\nProcess stopped. Please fix the error before continuing.");
      process.exit(1);
    } else {
      console.log(`✅ Successfully executed ${file}`);
    }
  }

  console.log('\n✅ All SQL files executed successfully!');
}

main();