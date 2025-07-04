/**
 * Cohort Analysis Utility Functions
 * 
 * These functions help transform raw customer and order data into the format
 * needed for cohort analysis visualizations.
 */

/**
 * Calculates the monthly breakdown of second orders for each cohort
 * 
 * @param {Object} cohortData - Raw cohort data with newCustomers and secondOrders counts
 * @param {Array} orders - Array of order objects with customer_id and processed_at
 * @returns {Object} Enhanced cohort data with m0-m11 percentages
 */
export function calculateMonthlyBreakdown(cohortData, orders) {
  // Create a deep copy of the input data to avoid mutations
  const result = JSON.parse(JSON.stringify(cohortData));
  
  // Initialize m0-m11 fields for each month
  Object.keys(result).forEach(month => {
    for (let i = 0; i <= 11; i++) {
      result[month][`m${i}`] = 0;
    }
  });
  
  // Map customers to their first order date
  const customerFirstOrderDate = {};
  orders.forEach(order => {
    if (!order.customer_id || !order.processed_at) return;
    
    const orderDate = new Date(order.processed_at);
    if (!customerFirstOrderDate[order.customer_id] || 
        orderDate < customerFirstOrderDate[order.customer_id]) {
      customerFirstOrderDate[order.customer_id] = orderDate;
    }
  });
  
  // Map customers to their second order date
  const customerSecondOrderDate = {};
  const processedCustomers = new Set();
  
  // Sort orders by date to ensure we process them chronologically
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(a.processed_at) - new Date(b.processed_at)
  );
  
  // Find second orders for each customer
  sortedOrders.forEach(order => {
    if (!order.customer_id || !order.processed_at) return;
    
    const customerId = order.customer_id;
    const orderDate = new Date(order.processed_at);
    const firstOrderDate = customerFirstOrderDate[customerId];
    
    // Skip if this is the first order or we've already found the second order
    if (!firstOrderDate || orderDate <= firstOrderDate || processedCustomers.has(customerId)) return;
    
    // This is the second order
    customerSecondOrderDate[customerId] = orderDate;
    processedCustomers.add(customerId);
  });
  
  // Calculate the month difference between first and second order
  Object.keys(customerFirstOrderDate).forEach(customerId => {
    const firstOrderDate = customerFirstOrderDate[customerId];
    const secondOrderDate = customerSecondOrderDate[customerId];
    
    if (!secondOrderDate) return; // Skip if no second order
    
    // Format first order month as YYYY-MM
    const firstOrderMonth = `${firstOrderDate.getFullYear()}-${String(firstOrderDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Skip if this cohort is not in our data
    if (!result[firstOrderMonth]) return;
    
    // Calculate months between first and second order
    const monthDiff = (secondOrderDate.getFullYear() - firstOrderDate.getFullYear()) * 12 + 
                      (secondOrderDate.getMonth() - firstOrderDate.getMonth());
    
    // Increment the appropriate m0-m11 counter if within range
    if (monthDiff >= 0 && monthDiff <= 11) {
      result[firstOrderMonth][`m${monthDiff}`]++;
    }
  });
  
  // Convert counts to percentages based on newCustomers
  Object.keys(result).forEach(month => {
    const newCustomers = result[month].newCustomers;
    if (newCustomers > 0) {
      for (let i = 0; i <= 11; i++) {
        // Convert to percentage with 1 decimal place
        result[month][`m${i}`] = parseFloat(((result[month][`m${i}`] / newCustomers) * 100).toFixed(1));
      }
    }
  });
  
  return result;
}

/**
 * Generates color codes for heatmap cells based on retention percentage
 * 
 * @param {number} percentage - Retention percentage value
 * @returns {string} CSS color class name
 */
export function getRetentionColorClass(percentage) {
  if (percentage === 0) return 'bg-gray-100';
  if (percentage < 5) return 'bg-blue-100';
  if (percentage < 10) return 'bg-blue-200';
  if (percentage < 15) return 'bg-blue-300';
  if (percentage < 20) return 'bg-blue-400';
  if (percentage < 25) return 'bg-blue-500';
  if (percentage < 30) return 'bg-blue-600';
  if (percentage < 35) return 'bg-blue-700';
  if (percentage < 40) return 'bg-blue-800';
  return 'bg-blue-900';
}

/**
 * Formats cohort data for the heatmap visualization
 * 
 * @param {Object} cohortData - Raw cohort data from API
 * @returns {Object} Formatted data for the heatmap component
 */
export function formatCohortDataForHeatmap(cohortData) {
  // Add any additional formatting needed for the heatmap component
  return cohortData;
}

/**
 * Calculates the total retention rate for a cohort
 * 
 * @param {Object} cohortMonth - Cohort month data with newCustomers and secondOrders
 * @returns {number} Retention rate percentage
 */
export function calculateRetentionRate(cohortMonth) {
  if (!cohortMonth || !cohortMonth.newCustomers || cohortMonth.newCustomers === 0) {
    return 0;
  }
  
  return parseFloat(((cohortMonth.secondOrders / cohortMonth.newCustomers) * 100).toFixed(1));
}

/**
 * Calculates the retention rate for nth order customers
 * 
 * @param {Object} cohortMonth - Cohort month data with previousOrderCustomers and nthOrders
 * @returns {number} Nth order retention rate percentage
 */
export function calculateNthOrderRetentionRate(cohortMonth) {
  if (!cohortMonth || !cohortMonth.previousOrderCustomers || cohortMonth.previousOrderCustomers === 0) {
    return 0;
  }
  
  return parseFloat(((cohortMonth.nthOrders / cohortMonth.previousOrderCustomers) * 100).toFixed(1));
}

/**
 * Validates that the sum of m0-m11 percentages equals the total second order percentage
 * 
 * @param {Object} cohortMonth - Cohort month data with m0-m11 values
 * @returns {boolean} True if the validation passes
 */
export function validateMonthlyBreakdown(cohortMonth) {
  if (!cohortMonth || !cohortMonth.newCustomers || cohortMonth.newCustomers === 0) {
    return false;
  }
  
  const totalSecondOrderPercentage = calculateRetentionRate(cohortMonth);
  
  let sumOfMonthlyPercentages = 0;
  for (let i = 0; i <= 11; i++) {
    sumOfMonthlyPercentages += cohortMonth[`m${i}`] || 0;
  }
  
  // Allow for small floating point differences (0.1%)
  return Math.abs(sumOfMonthlyPercentages - totalSecondOrderPercentage) < 0.2;
}
