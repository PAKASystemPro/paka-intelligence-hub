/**
 * Utility functions for exporting data
 */

/**
 * Converts an array of objects to a CSV string
 * 
 * @param {Array} data - Array of objects to convert to CSV
 * @param {Array} headers - Array of header objects with title and key properties
 * @returns {string} CSV string
 */
export function convertToCSV(data, headers) {
  if (!data || !data.length || !headers || !headers.length) {
    return '';
  }

  // Create header row
  const headerRow = headers.map(header => `"${header.title}"`).join(',');
  
  // Create data rows
  const rows = data.map(item => {
    return headers.map(header => {
      // Handle null or undefined values
      const value = item[header.key] === null || item[header.key] === undefined 
        ? '' 
        : item[header.key];
      
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  // Combine header and rows
  return [headerRow, ...rows].join('\n');
}

/**
 * Downloads a CSV file with the provided data
 * 
 * @param {string} csvContent - CSV content as a string
 * @param {string} fileName - Name for the downloaded file
 */
export function downloadCSV(csvContent, fileName) {
  if (!csvContent) {
    console.error('No CSV content provided for download');
    return;
  }
  
  // Create a Blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link
  const link = document.createElement('a');
  
  // Check if browser supports download attribute
  if (navigator.msSaveBlob) {
    // For IE and Edge
    navigator.msSaveBlob(blob, fileName);
  } else {
    // For other browsers
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Format a date for inclusion in a filename
 * 
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export function formatDateForFilename(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * Export cohort customers to CSV
 * 
 * @param {Array} customers - Array of customer objects
 * @param {string} cohortMonth - Cohort month (YYYY-MM)
 * @param {string} productType - Product type filter
 */
export function exportCohortCustomers(customers, cohortMonth, productType = 'All') {
  if (!customers || !customers.length) {
    console.error('No customer data to export');
    return;
  }
  
  // Define CSV headers
  const headers = [
    { title: 'Customer ID', key: 'shopify_customer_id' },
    { title: 'Email', key: 'email' },
    { title: 'First Name', key: 'first_name' },
    { title: 'Last Name', key: 'last_name' },
    { title: 'Total Spent', key: 'total_spent' },
    { title: 'Orders Count', key: 'orders_count' },
    { title: 'Created At', key: 'created_at' },
    { title: 'Product Cohort', key: 'primary_product_cohort' }
  ];
  
  // Convert to CSV
  const csvContent = convertToCSV(customers, headers);
  
  // Generate filename
  const today = formatDateForFilename();
  const productSuffix = productType !== 'All' ? `_${productType}` : '';
  const fileName = `cohort_${cohortMonth}${productSuffix}_customers_${today}.csv`;
  
  // Download the CSV file
  downloadCSV(csvContent, fileName);
}
