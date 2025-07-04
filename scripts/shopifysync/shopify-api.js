/**
 * Shopify API functions for data fetching
 */
require('dotenv').config({ path: '.env.local' });
const { fetchShopifyGraphQL, ApiError } = require('./shopify-sync-utils');
const { BATCH_SIZE } = require('./shopify-sync-config');

/**
 * Fetch orders from Shopify for a specific year and month
 */
async function fetchMonthlyOrders(year, month) {
  console.log(`Fetching orders from Shopify API for ${year}-${month.toString().padStart(2, '0')}...`);
  
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  let endDate;
  
  // Calculate the last day of the month
  if (month === 12) {
    endDate = `${year + 1}-01-01`;
  } else {
    endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
  }
  
  let allOrders = [];
  let hasNextPage = true;
  let cursor = null;
  
  // Use configurable page size from config
  const pageSize = BATCH_SIZE;
  
  while (hasNextPage) {
    // GraphQL query for orders with pagination
    const query = `
      query getOrders($cursor: String, $pageSize: Int!) {
        orders(
          first: $pageSize,
          after: $cursor,
          query: "created_at:>='${startDate}' AND created_at:<'${endDate}'"
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              name
              createdAt
              processedAt
              displayFinancialStatus
              displayFulfillmentStatus
              tags
              totalPriceSet {
                shopMoney {
                  amount
                }
              }
              channel {
                name
                app {
                  title
                }
              }
              customer {
                id
                firstName
                lastName
                email
                phone
                createdAt
                numberOfOrders
                tags
                amountSpent {
                  amount
                  currencyCode
                }
              }
              lineItems(first: 50) {
                edges {
                  node {
                    id
                    name
                    quantity
                    originalTotalSet {
                      shopMoney {
                        amount
                      }
                    }
                    product {
                      id
                      productType
                    }
                    variant {
                      id
                      sku
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    const variables = {
      cursor,
      pageSize
    };
    
    try {
      const data = await fetchShopifyGraphQL(query, variables);
      
      if (!data || !data.orders || !data.orders.edges) {
        throw new Error('Invalid response from Shopify API');
      }
      
      // Extract and validate orders from response
      const orders = data.orders.edges.map(edge => {
        const node = edge.node;
        
        // Basic validation of required fields
        if (!node.id) {
          console.warn('Order missing ID, skipping');
          return null;
        }
        
        // Ensure consistent structure for nested fields
        if (!node.totalPriceSet || !node.totalPriceSet.shopMoney) {
          node.totalPriceSet = {
            shopMoney: { amount: 0 }
          };
        }
        
        // Ensure customer field is properly structured
        if (!node.customer) {
          node.customer = null;
        }
        
        return node;
      }).filter(Boolean); // Remove null entries
      
      allOrders = [...allOrders, ...orders];
      
      // Update pagination info
      hasNextPage = data.orders.pageInfo.hasNextPage;
      cursor = data.orders.pageInfo.endCursor;
      
      console.log(`Fetched ${orders.length} orders (total: ${allOrders.length})`);
      
      if (hasNextPage) {
        console.log('Fetching next page...');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }
  
  console.log(`Successfully fetched ${allOrders.length} orders for ${year}-${month.toString().padStart(2, '0')}`);
  
  // Final validation of fetched data
  if (allOrders.length === 0) {
    console.warn(`No orders found for ${year}-${month.toString().padStart(2, '0')}`);
  }
  
  // Map fields to ensure consistency
  return allOrders.map(order => ({
    ...order,
    // Use createdAt as primary date field, fall back to processedAt if needed
    processedAt: order.processedAt || order.createdAt,
    // Use name as order number, fall back to title if available
    name: order.name || order.title || `Order-${order.id.split('/').pop()}`,
    // Ensure line items is always an object with edges array
    lineItems: order.lineItems || { edges: [] }
  }));
}


/**
 * Fetch a specific customer by ID from Shopify
 * @param {string} customerId - Shopify customer ID
 * @returns {Promise<Object>} - Customer data
 */
async function fetchCustomerById(customerId) {
  try {
    const query = `
      query getCustomer($customerId: ID!) {
        customer(id: $customerId) {
          id
          firstName
          lastName
          email
          phone
          createdAt
          tags
          numberOfOrders
          amountSpent {
            amount
            currencyCode
          }
        }
      }
    `;
    
    // Convert numeric ID to Shopify GID format
    const gid = `gid://shopify/Customer/${customerId}`;
    
    const response = await fetchShopifyGraphQL(query, { customerId: gid });
    return response.customer;
  } catch (error) {
    console.error('Error fetching customer by ID:', error);
    return null;
  }
}
module.exports = {
  fetchMonthlyOrders,
  fetchCustomerById
};
