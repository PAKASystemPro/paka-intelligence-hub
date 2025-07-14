// scripts/execute-sql.ts
// FINAL DEFINITIVE SCRIPT: Automatically executes all generated SQL files in order.

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: path.resolve(process.cwd(), '.env.local') });

const dbUrl = process.env.SUPABASE_DB_URL; 

if (!dbUrl) {
    throw new Error("SUPABASE_DB_URL not found in .env.local. Please add it from your Supabase project settings.");
}

function main() {
    const sqlOutputDir = path.join(process.cwd(), 'sql_output');
    if (!fs.existsSync(sqlOutputDir)) {
        console.error("Error: sql_output directory not found. Please run 'npm run db:generate-sql' first.");
        process.exit(1);
    }

    const filesToExecute = fs.readdirSync(sqlOutputDir).filter(f => f.endsWith('.sql')).sort();

    if (filesToExecute.length === 0) {
        console.log("No .sql files found to execute.");
        return;
    }

    console.log(`Found ${filesToExecute.length} SQL files to execute...`);

    for (const file of filesToExecute) {
        console.log(`\n--- Executing ${file} ---`);
        const filePath = path.join(sqlOutputDir, file);
        try {
            execSync(`psql "${dbUrl}" -f "${filePath}"`, { stdio: 'inherit' });
            console.log(`✅ Successfully executed ${file}`);
        } catch (error) {
            console.error(`\n!!!!!! ERROR ON FILE: ${file} !!!!!!`);
            process.exit(1);
        }
    }
    console.log("\n✅ All SQL files executed successfully! Your database is ready.");
}

main();
