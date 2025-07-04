/**
 * Configuration file for Shopify data sync
 */

// Reference data for validation
const REFERENCE_DATA = {
  '2025-01': { orders: 575, customers: 510, newCustomers: 147, secondOrders: 65 },
  '2025-02': { orders: 590, customers: 542, newCustomers: 181, secondOrders: 76 },
  '2025-03': { orders: 766, customers: 664, newCustomers: 282, secondOrders: 139 },
  '2025-04': { orders: 863, customers: 783, newCustomers: 369, secondOrders: 141 },
  '2025-05': { orders: 969, customers: 853, newCustomers: 453, secondOrders: 157 },
  '2025-06': { orders: 1107, customers: 952, newCustomers: 526, secondOrders: 121 }
};

// Batch size for database operations
const BATCH_SIZE = 50;

// API request configuration
const API_CONFIG = {
  maxRetries: 5,
  initialBackoff: 2000, // ms
  maxBackoff: 30000, // ms
  timeout: 60000, // ms
};

// Database operation configuration
const DB_CONFIG = {
  maxRetries: 3,
  initialBackoff: 1000, // ms
  schema: 'production'
};

module.exports = {
  REFERENCE_DATA,
  BATCH_SIZE,
  API_CONFIG,
  DB_CONFIG
};
