/**
 * Check if .env.local file exists and can be read
 */
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env.local');

console.log(`Checking if environment file exists at: ${envPath}`);

if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file exists');
  
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    console.log(`File contains ${lines.length} non-empty lines`);
    
    // Check for Supabase variables without showing values
    const hasSupabaseUrl = content.includes('NEXT_PUBLIC_SUPABASE_URL=');
    const hasServiceKey = content.includes('SUPABASE_SERVICE_ROLE_KEY=');
    
    console.log('Contains NEXT_PUBLIC_SUPABASE_URL:', hasSupabaseUrl ? 'Yes' : 'No');
    console.log('Contains SUPABASE_SERVICE_ROLE_KEY:', hasServiceKey ? 'Yes' : 'No');
    
    if (hasSupabaseUrl && hasServiceKey) {
      console.log('✅ Both required Supabase environment variables are present');
    } else {
      console.log('❌ Missing one or both required Supabase environment variables');
    }
    
  } catch (error) {
    console.error('❌ Error reading .env.local file:', error.message);
  }
} else {
  console.error('❌ .env.local file does not exist');
}
