/**
 * Cleanup script for 2025 data
 * This script removes all 2025 data from the database to start fresh
 */
require('dotenv').config({ path: '.env.local' });
const { initSupabaseClient, ApiError, DatabaseError } = require('./shopify-sync-utils');

async function cleanup2025Data() {
  console.log('=== CLEANING UP 2025 DATA ===');
  console.log('Starting cleanup at:', new Date().toISOString());
  
  try {
    const supabase = initSupabaseClient();
    
    // Step 1: Delete all line items for 2025 orders
    console.log('\n1. Deleting all line items for 2025 orders...');
    
    // First, identify all orders from 2025
    console.log('Fetching 2025 orders...');
    const { data: orderIds, error: orderIdsError } = await supabase
      .from('orders')
      .select('id, shopify_order_id')
      .or('processed_at.gte.2024-12-01,processed_at.lt.2025-03-01');
    
    if (orderIdsError) {
      console.error('Error fetching order IDs:', orderIdsError);
      return;
    }
    
    if (orderIds && orderIds.length > 0) {
      const ids = orderIds.map(order => order.id);
      console.log(`Found ${ids.length} orders from Dec 2024 - Feb 2025`);
      
      // Delete line items in batches
      const batchSize = 50;
      console.log(`Deleting line items in batches of ${batchSize}...`);
      
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { error: deleteError } = await supabase
          .from('order_line_items')
          .delete()
          .in('order_id', batch);
        
        if (deleteError) {
          console.error(`Error deleting line items batch ${Math.floor(i/batchSize) + 1}:`, deleteError);
        } else {
          console.log(`Deleted line items for orders batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ids.length/batchSize)}`);
        }
        
        // Small delay to prevent overloading the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Step 2: Now delete the orders themselves
      console.log('\n2. Deleting orders from Dec 2024 - Feb 2025...');
      
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { error: deleteOrdersError } = await supabase
          .from('orders')
          .delete()
          .in('id', batch);
        
        if (deleteOrdersError) {
          console.error(`Error deleting orders batch ${Math.floor(i/batchSize) + 1}:`, deleteOrdersError);
        } else {
          console.log(`Deleted orders batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ids.length/batchSize)}`);
        }
        
        // Small delay to prevent overloading the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else {
      console.log('No orders found for the target period');
    }
    
    // Step 3: Delete customers created in the target period
    // We'll only delete customers that don't have any remaining orders
    console.log('\n3. Identifying customers without orders...');
    
    const { data: customersToDelete, error: customersError } = await supabase
      .from('customers')
      .select('id')
      .or('created_at.gte.2024-12-01,created_at.lt.2025-03-01');
    
    if (customersError) {
      console.error('Error fetching customers:', customersError);
    } else if (customersToDelete && customersToDelete.length > 0) {
      console.log(`Found ${customersToDelete.length} customers created in target period`);
      
      // Check which customers have no orders left
      const customerIds = customersToDelete.map(c => c.id);
      const batchSize = 50;
      let deletedCount = 0;
      
      for (let i = 0; i < customerIds.length; i += batchSize) {
        const batch = customerIds.slice(i, i + batchSize);
        
        // For each customer in batch, check if they have any orders
        for (const customerId of batch) {
          const { data: orderCount, error: countError } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', customerId);
            
          if (countError) {
            console.error(`Error checking orders for customer ${customerId}:`, countError);
            continue;
          }
          
          // If no orders, delete the customer
          if (orderCount === 0) {
            const { error: deleteError } = await supabase
              .from('customers')
              .delete()
              .eq('id', customerId);
              
            if (deleteError) {
              console.error(`Error deleting customer ${customerId}:`, deleteError);
            } else {
              deletedCount++;
            }
          }
        }
        
        console.log(`Processed ${Math.min((i + batchSize), customerIds.length)}/${customerIds.length} customers, deleted ${deletedCount}`);
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`Deleted ${deletedCount} customers with no remaining orders`);
    } else {
      console.log('No customers found for the target period');
    }
    
    // Step 4: Delete sync status records for 2025
    console.log('\n4. Deleting sync status records for 2025...');
    try {
      // Try with production schema
      const { data: deleteSyncResult, error: deleteSyncError } = await supabase
        .from('sync_status')
        .delete()
        .like('month', '2025-%');
      
      if (deleteSyncError) {
        console.error('Error deleting sync status records:', deleteSyncError);
      } else {
        console.log('Sync status records deleted successfully');
      }
    } catch (err) {
      console.log('Sync status table might not exist or be in a different schema');
    }
    
    // Step 5: Refresh materialized views
    console.log('\n5. Refreshing materialized views...');
    try {
      // Try with public schema (default for rpc)
      const { data: refreshResult, error: refreshError } = await supabase
        .rpc('refresh_materialized_views');
      
      if (refreshError) {
        console.error('Error refreshing materialized views:', refreshError);
      } else {
        console.log('Materialized views refreshed successfully');
      }
    } catch (err) {
      console.log('Could not refresh materialized views, function might not exist');
    }
    
    console.log('\nCleanup completed at:', new Date().toISOString());
    console.log('The database is now ready for fresh 2025 data import');
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error (${error.code}): ${error.message}`);
      if (error.details) console.error('Details:', error.details);
    } else if (error instanceof DatabaseError) {
      console.error(`Database Error (${error.code}): ${error.message}`);
      if (error.originalError) console.error('Original error:', error.originalError);
    } else {
      console.error('Cleanup failed with error:', error);
    }
  }
}

// Run the cleanup
cleanup2025Data().catch(console.error);
