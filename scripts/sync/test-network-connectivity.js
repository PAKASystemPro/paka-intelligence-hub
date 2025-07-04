/**
 * Test Basic Network Connectivity to Supabase Host
 * 
 * This script performs a simple fetch request to the Supabase URL to check for
 * basic network connectivity, bypassing the Supabase client library.
 */
require('dotenv').config({ path: '.env.local' });
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
console.log(`Loading environment from: ${envPath}`);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

console.log('Testing connectivity to:', supabaseUrl);

async function testConnectivity() {
  try {
    // We'll ping a non-sensitive, known endpoint like the auth endpoint.
    const testUrl = `${supabaseUrl}/auth/v1/health`;
    console.log(`Pinging URL: ${testUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log(`✅ Success! Received response.`);
    console.log(`   - Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('   - Response Body:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Connectivity test failed.');
    if (error.name === 'AbortError') {
        console.error('   - Reason: The request timed out after 15 seconds.');
    } else {
        console.error('   - Error:', error);
    }
  }
}

testConnectivity();
