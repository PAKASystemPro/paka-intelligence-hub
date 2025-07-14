// sync-shopify-history.ts

// DEFINITIVE ARCHITECTURE: Fetches all data first, then generates four SQL files in dependency order.



import { GraphQLClient } from 'graphql-request';

import { config } from 'dotenv';

import { formatInTimeZone } from 'date-fns-tz';

import * as fs from 'fs';

import * as path from 'path';



// --- SETUP ---

config();

const { SHOPIFY_API_URL, SHOPIFY_ACCESS_TOKEN } = process.env;



if (!SHOPIFY_API_URL || !SHOPIFY_ACCESS_TOKEN) {

console.error('Missing Shopify environment variables.');

process.exit(1);

}



const shopifyClient = new GraphQLClient(SHOPIFY_API_URL, {

headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN },

});



// --- TYPE DEFINITIONS ---

interface ShopifyOrder {

id: string;

name: string;

customer: { id: string; email?: string | null; firstName?: string | null; lastName?: string | null; } | null;

totalPriceSet: { shopMoney: { amount: string } };

processedAt: string;

createdAt: string;

displayFinancialStatus: string | null;

lineItems: { edges: { node: { quantity: number; originalTotalSet: { shopMoney: { amount: string } }; variant: { product: { id: string; title: string } } | null } }[] };

}

interface ShopifyProduct { id: string; title: string; }

interface ShopifyCustomer { id: string; email?: string | null; firstName?: string | null; lastName?: string | null; }



// --- HELPER FUNCTIONS ---

function formatDateToUtc(dateString: string, isStartOfDay: boolean): string {

const hktZone = 'Asia/Hong_Kong';

const time = isStartOfDay ? 'T00:00:00' : 'T23:59:59';

const date = new Date(`${dateString}${time}`);

return formatInTimeZone(date, hktZone, "yyyy-MM-dd'T'HH:mm:ss'Z'");

}



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



async function fetchAllOrders(startDate: string, endDate: string): Promise<ShopifyOrder[]> {

const allOrders: ShopifyOrder[] = [];

const months: string[] = [];

let current = new Date(startDate);

const end = new Date(endDate);

while (current <= end) {

months.push(current.toISOString().substring(0, 7));

current.setMonth(current.getMonth() + 1);

}


console.log(`Generated ${months.length} months to process...`);



for (const month of months) {

let hasNextPage = true;

let cursor: string | null = null;

const monthStartDate = formatDateToUtc(`${month}-01`, true);

const lastDay = new Date(new Date(monthStartDate).getFullYear(), new Date(monthStartDate).getMonth() + 1, 0).getDate();

const monthEndDate = formatDateToUtc(`${month}-${lastDay}`, false);

const dateRangeQuery = `processed_at:>='${monthStartDate}' AND processed_at:<='${monthEndDate}'`;

console.log(`Fetching orders with query: ${dateRangeQuery}`);


while(hasNextPage) {

const query = `

query GetOrders($cursor: String) {

orders(first: 250, after: $cursor, query: "${dateRangeQuery}") {

edges {

node {

id, name, processedAt, createdAt, displayFinancialStatus,

totalPriceSet { shopMoney { amount } },

customer { id, email, firstName, lastName },

lineItems(first: 50) { edges { node { quantity, originalTotalSet { shopMoney { amount } }, variant { product { id, title } } } } }

}

cursor

}

pageInfo { hasNextPage, endCursor }

}

}`;


try {

console.log(`Fetching orders page with cursor: ${cursor || 'initial'}`);

const response = await retryOperation(() =>

shopifyClient.request<{ orders: any }>(query, { cursor })

);

const newOrders = response.orders?.edges.map((edge: any) => edge.node) || [];

if (newOrders.length > 0) {

allOrders.push(...newOrders);

console.log(`Fetched ${newOrders.length} orders for ${month} (total fetched so far: ${allOrders.length})`);

}

hasNextPage = response.orders?.pageInfo.hasNextPage || false;

cursor = response.orders?.pageInfo.endCursor || null;

await new Promise(resolve => setTimeout(resolve, 500));

} catch (error) {

console.error(`Error fetching orders for ${month}:`, error);

throw error;

}

}

}

return allOrders;

}



async function generateSqlFiles(allOrders: ShopifyOrder[]) {

console.log('\n--- Generating SQL files from all fetched orders ---');


const outputDir = path.join(process.cwd(), 'sql_output');

if (fs.existsSync(outputDir)) {

fs.rmSync(outputDir, { recursive: true, force: true });

}

fs.mkdirSync(outputDir, { recursive: true });



// Extract unique entities

const uniqueProducts = new Map<string, ShopifyProduct>();

const uniqueCustomers = new Map<string, ShopifyCustomer>();

for (const order of allOrders) {

if (order.customer) uniqueCustomers.set(order.customer.id, order.customer);

for (const edge of order.lineItems.edges) {

if (edge.node.variant?.product) uniqueProducts.set(edge.node.variant.product.id, edge.node.variant.product);

}

}

console.log(`Found ${uniqueProducts.size} unique products and ${uniqueCustomers.size} unique customers.`);


// Helper function to write chunks of SQL statements

function writeChunkedSqlFiles(prefix: string, statements: string[], statementsPerChunk: number = 500) {

const totalChunks = Math.ceil(statements.length / statementsPerChunk);

console.log(`Splitting ${statements.length} statements into ${totalChunks} chunks for ${prefix}`);


for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {

const start = chunkIndex * statementsPerChunk;

const end = Math.min(start + statementsPerChunk, statements.length);

const chunkStatements = statements.slice(start, end);


const chunkFilePath = path.join(outputDir, `${prefix}_chunk_${chunkIndex + 1}.sql`);

const chunkSql = `SET search_path TO production;\n\n-- Chunk ${chunkIndex + 1}/${totalChunks} (${chunkStatements.length} statements) --\n\n${chunkStatements.join('\n')}\n`;


fs.writeFileSync(chunkFilePath, chunkSql);

}


console.log(`Successfully generated ${totalChunks} chunks for ${prefix}`);

return totalChunks;

}


// 1. Generate products SQL file (single file as it's small)

const productsFilePath = path.join(outputDir, '01_products.sql');

let productsSql = `SET search_path TO production;\n\n-- Inserting ${uniqueProducts.size} unique products --\n\n`;

const productInserts: string[] = [];


for (const p of uniqueProducts.values()) {

productInserts.push(`INSERT INTO production.products (shopify_product_id, title) VALUES ('${p.id.replace('gid://shopify/Product/', '')}', ${escapeSql(p.title)}) ON CONFLICT (shopify_product_id) DO NOTHING;`);

}


productsSql += productInserts.join('\n');

fs.writeFileSync(productsFilePath, productsSql);

console.log(`Successfully generated ${productsFilePath}`);


// 2. Generate customers SQL files (chunked)

const customerInserts: string[] = [];

for (const c of uniqueCustomers.values()) {

customerInserts.push(`INSERT INTO production.customers (shopify_customer_id, email, first_name, last_name) VALUES ('${c.id.replace('gid://shopify/Customer/', '')}', ${escapeSql(c.email)}, ${escapeSql(c.firstName)}, ${escapeSql(c.lastName)}) ON CONFLICT (shopify_customer_id) DO NOTHING;`);

}


const customerChunks = writeChunkedSqlFiles('02_customers', customerInserts);


// 3. Generate orders SQL files (chunked)

const ordersWithCustomers = allOrders.filter(o => o.customer);

const orderInserts: string[] = [];


for (const o of ordersWithCustomers) {

const shopifyOrderId = o.id.replace('gid://shopify/Order/', '');

const shopifyCustomerId = o.customer!.id.replace('gid://shopify/Customer/', '');

const orderNumber = o.name;

const totalPrice = parseFloat(o.totalPriceSet.shopMoney.amount);

const orderedAt = o.processedAt;

const createdAt = o.createdAt;

const financialStatus = o.displayFinancialStatus;


let orderSql = `INSERT INTO production.orders (shopify_order_id, customer_id, order_number, total_price, ordered_at, created_at, financial_status)\n`;

orderSql += `SELECT '${shopifyOrderId}', id, ${escapeSql(orderNumber)}, ${totalPrice}, '${orderedAt}', '${createdAt}', ${escapeSql(financialStatus)}\n`;

orderSql += `FROM production.customers\n`;

orderSql += `WHERE shopify_customer_id = '${shopifyCustomerId}'\n`;

orderSql += `ON CONFLICT (shopify_order_id) DO NOTHING;`;


orderInserts.push(orderSql);

}


const orderChunks = writeChunkedSqlFiles('03_orders', orderInserts);


// 4. Generate line items SQL files (chunked)

const lineItemInserts: string[] = [];

let totalLineItems = 0;


for (const o of ordersWithCustomers) {

const shopifyOrderId = o.id.replace('gid://shopify/Order/', '');


for (const edge of o.lineItems.edges) {

const item = edge.node;

const product = item.variant?.product;

if (!product) continue;

totalLineItems++;


const shopifyProductId = product.id.replace('gid://shopify/Product/', '');

const quantity = item.quantity;

const price = item.originalTotalSet ? parseFloat(item.originalTotalSet.shopMoney.amount) : 0;


let lineItemSql = `INSERT INTO production.order_line_items (order_id, product_id, quantity, price)\n`;

lineItemSql += `SELECT o.id, p.id, ${quantity}, ${price}\n`;

lineItemSql += `FROM production.orders o\n`;

lineItemSql += `JOIN production.products p ON p.shopify_product_id = '${shopifyProductId}'\n`;

lineItemSql += `WHERE o.shopify_order_id = '${shopifyOrderId}';`;


lineItemInserts.push(lineItemSql);

}

}


const lineItemChunks = writeChunkedSqlFiles('04_line_items', lineItemInserts);


console.log(`\nSummary of generated SQL files:\n`);

console.log(`- Products: 1 file with ${uniqueProducts.size} inserts`);

console.log(`- Customers: ${customerChunks} chunks with ${uniqueCustomers.size} total inserts`);

console.log(`- Orders: ${orderChunks} chunks with ${ordersWithCustomers.length} total inserts`);

console.log(`- Line Items: ${lineItemChunks} chunks with ${totalLineItems} total inserts`);

}



async function generateFinalEnrichmentSql() {

const outputDir = path.join(process.cwd(), 'sql_output');

const outputFilePath = path.join(outputDir, `05_update_aggregates.sql`);

let sqlContent = `-- This script should be run AFTER all previous sync files have been executed.\n\n`;

sqlContent += `SET search_path TO production;\n\n`;

sqlContent += `-- Update customer order counts and total spent --\n`;

sqlContent += `

UPDATE production.customers c

SET

orders_count = subquery.order_count,

total_spent = subquery.total_spent

FROM (

SELECT

o.customer_id,

COUNT(o.id) as order_count,

SUM(o.total_price) as total_spent

FROM production.orders o

WHERE o.customer_id IS NOT NULL

GROUP BY o.customer_id

) AS subquery

WHERE c.id = subquery.customer_id;

`;

sqlContent += `\n\n`;

fs.writeFileSync(outputFilePath, sqlContent);

console.log(`\nSuccessfully generated final enrichment script: ${outputFilePath}`);

}



// --- MAIN EXECUTION BLOCK ---

async function main() {

try {

console.log('Starting Shopify historical data sync...');

const args = process.argv.slice(2);

const startDate = args[0] || '2021-01-01';

const endDate = args[1] || new Date().toISOString().split('T')[0];



// PHASE 1: Fetch all data

const allOrders = await fetchAllOrders(startDate, endDate);


// PHASE 2: Generate all SQL files in dependency order

await generateSqlFiles(allOrders);


console.log('\n✅ All SQL files generated successfully.');

} catch (error) {

console.error('Sync script failed:', error);

process.exit(1);

}

}



main();