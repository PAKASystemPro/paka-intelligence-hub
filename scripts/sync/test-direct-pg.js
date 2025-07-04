/**
 * Test Direct PostgreSQL Connection
 * 
 * This script tests a direct connection to the Supabase PostgreSQL database
 * using the pg module instead of the Supabase client.
 */
require('dotenv').config({ path: '.env.local' });

// Check if pg module is installed
try {
  require('pg');
} catch (error) {
  console.error('pg module not installed. Installing...');
  console.error('Please run: npm install pg');
  process.exit(1);
}

const { Pool } = require('pg');

// Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key exists:', !!supabaseServiceKey);

// Extract the host from the Supabase URL
const supabaseHost = supabaseUrl.replace('https://', '');

// Create a PostgreSQL connection pool
const pool = new Pool({
  host: supabaseHost,
  port: 5432, // Default PostgreSQL port
  user: 'postgres', // Default Supabase user
  password: supabaseServiceKey,
  database: 'postgres', // Default database name
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  }
});

async function testPgConnection() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL database!');
    
    // Test query to check if production schema exists
    console.log('\nChecking if production schema exists...');
    const schemaResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'production'
      ) AS schema_exists;
    `);
    
    const schemaExists = schemaResult.rows[0].schema_exists;
    console.log('Production schema exists:', schemaExists);
    
    if (schemaExists) {
      // Check tables in production schema
      console.log('\nChecking tables in production schema...');
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'production'
        ORDER BY table_name;
      `);
      
      console.log('Tables in production schema:');
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
      
      // Count rows in customers table
      console.log('\nCounting rows in production.customers table...');
      const customersResult = await client.query(`
        SELECT COUNT(*) FROM production.customers;
      `);
      
      console.log('Customers count:', customersResult.rows[0].count);
      
      // Count rows in orders table
      console.log('\nCounting rows in production.orders table...');
      const ordersResult = await client.query(`
        SELECT COUNT(*) FROM production.orders;
      `);
      
      console.log('Orders count:', ordersResult.rows[0].count);
      
      // Count rows in order_line_items table
      console.log('\nCounting rows in production.order_line_items table...');
      const lineItemsResult = await client.query(`
        SELECT COUNT(*) FROM production.order_line_items;
      `);
      
      console.log('Line items count:', lineItemsResult.rows[0].count);
    }
    
    // Check public functions
    console.log('\nChecking functions in public schema...');
    const functionsResult = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      ORDER BY routine_name;
    `);
    
    console.log('Functions in public schema:');
    functionsResult.rows.forEach(row => {
      console.log(`- ${row.routine_name} (${row.routine_type})`);
    });
    
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testPgConnection().catch(console.error);
