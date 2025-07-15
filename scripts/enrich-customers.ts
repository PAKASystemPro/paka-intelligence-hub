// enrich-customers.ts
//
// This script fetches all customers from Shopify API and generates SQL to update
// phone numbers in the production.customers table.

import { GraphQLClient } from 'graphql-request';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// --- SETUP ---
config({ path: path.resolve(__dirname, '../.env.function') });

// Get Shopify credentials from .env.function
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// Log environment variables for debugging (without showing the full token)
console.log('Environment variables loaded:');
console.log(`SHOPIFY_API_URL: ${SHOPIFY_API_URL ? '✓ Found' : '✗ Missing'}`);
console.log(`SHOPIFY_ACCESS_TOKEN: ${SHOPIFY_ACCESS_TOKEN ? '✓ Found' : '✗ Missing'} (first 4 chars: ${SHOPIFY_ACCESS_TOKEN?.substring(0, 4)}...)`);

if (!SHOPIFY_API_URL || !SHOPIFY_ACCESS_TOKEN) {
  console.error('Missing Shopify environment variables.');
  process.exit(1);
}

const shopifyClient = new GraphQLClient(SHOPIFY_API_URL, {
  headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN },
});

// --- TYPE DEFINITIONS ---
interface ShopifyCustomer {
  id: string;
  email?: string | null;
  phone?: string | null;
}

// --- HELPER FUNCTIONS ---
function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

async function retryOperation<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        const delay = 2000 * attempt;
        console.log(`Request failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// --- MAIN FUNCTIONS ---
async function fetchAllCustomers(): Promise<ShopifyCustomer[]> {
  const allCustomers: ShopifyCustomer[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let count = 0;

  console.log('Fetching customers from Shopify API...');

  while (hasNextPage) {
    try {
      const query = `
        query GetCustomers($cursor: String) {
          customers(first: 250, after: $cursor) {
            edges {
              node {
                id
                email
                phone
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const response: any = await retryOperation(() => 
        shopifyClient.request(query, { cursor })
      );

      const edges = response.customers?.edges || [];
      
      for (const edge of edges) {
        if (edge.node) {
          allCustomers.push({
            id: edge.node.id,
            email: edge.node.email,
            phone: edge.node.phone
          });
        }
      }

      count += edges.length;
      console.log(`Fetched ${count} customers so far...`);

      hasNextPage = response.customers?.pageInfo.hasNextPage || false;
      cursor = response.customers?.pageInfo.endCursor || null;

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  return allCustomers;
}

async function generatePhoneUpdateSql(customers: ShopifyCustomer[]): Promise<void> {
  console.log(`Generating SQL update statements for ${customers.length} customers...`);
  
  const sqlStatements: string[] = [];
  let updatesCount = 0;
  
  // Add header with timestamp and count
  sqlStatements.push(`-- Phone number update SQL generated on ${new Date().toISOString()}`);
  sqlStatements.push(`-- Total customers processed: ${customers.length}`);
  sqlStatements.push('');
  
  // Process each customer
  for (const customer of customers) {
    // Skip customers without phone numbers
    if (!customer.phone) continue;
    
    // Extract the numeric ID from the Shopify GraphQL ID
    const shopifyCustomerId = customer.id.replace('gid://shopify/Customer/', '');
    
    // Generate the UPDATE statement
    sqlStatements.push(
      `UPDATE production.customers SET phone = ${escapeSql(customer.phone)} WHERE shopify_customer_id = '${shopifyCustomerId}';`
    );
    
    updatesCount++;
  }
  
  // Add summary at the end
  sqlStatements.push('');
  sqlStatements.push(`-- Total updates: ${updatesCount}`);
  
  // Write to file
  const outputPath = path.join(process.cwd(), 'update_phones.sql');
  fs.writeFileSync(outputPath, sqlStatements.join('\n'));
  
  console.log(`SQL file generated at: ${outputPath}`);
  console.log(`Total updates: ${updatesCount}`);
}

// --- MAIN EXECUTION ---
async function main() {
  try {
    console.log('Starting customer phone enrichment process...');
    
    // Fetch all customers from Shopify
    const customers = await fetchAllCustomers();
    console.log(`Successfully fetched ${customers.length} customers from Shopify.`);
    
    // Generate SQL update statements
    await generatePhoneUpdateSql(customers);
    
    console.log('Customer phone enrichment process completed successfully.');
  } catch (error) {
    console.error('Error in customer phone enrichment process:', error);
    process.exit(1);
  }
}

// Execute the script
main();
