/**
 * Direct Environment Variables Check
 * 
 * This script directly loads the .env.local file and checks if the Supabase credentials are available.
 */
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Path to .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
console.log(`Loading environment from: ${envPath}`);

// Check if file exists and has content
if (fs.existsSync(envPath)) {
  const fileStats = fs.statSync(envPath);
  console.log(`File size: ${fileStats.size} bytes`);
  
  if (fileStats.size > 0) {
    // Read file content directly
    try {
      const fileContent = fs.readFileSync(envPath, 'utf8');
      console.log(`File content length: ${fileContent.length} characters`);
      console.log(`First 10 characters: ${fileContent.substring(0, 10)}...`);
      
      // Count lines
      const lines = fileContent.split('\n');
      console.log(`Number of lines: ${lines.length}`);
      console.log(`Non-empty lines: ${lines.filter(line => line.trim() !== '').length}`);
      
      // Load environment variables
      const result = dotenv.config({ path: envPath });
      
      if (result.error) {
        console.error('Error loading .env.local file:', result.error.message);
      } else {
        console.log('Environment variables loaded successfully');
        
        // Check for Supabase variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        console.log('NEXT_PUBLIC_SUPABASE_URL exists:', !!supabaseUrl);
        if (supabaseUrl) {
          console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl.substring(0, 10)}...`);
        }
        
        console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey);
        if (supabaseServiceKey) {
          console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey.substring(0, 10)}...`);
        }
      }
    } catch (error) {
      console.error('Error reading file:', error.message);
    }
  } else {
    console.log('File exists but is empty');
  }
} else {
  console.log('File does not exist');
}
