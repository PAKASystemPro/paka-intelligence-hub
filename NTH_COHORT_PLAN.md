# Nth Cohort Analysis Feature Plan

## Overview
This feature will extend the existing cohort analysis functionality to support tracking customers beyond their second order (nth orders). The current implementation only tracks first-time customers and their second orders, but we want to analyze the full customer journey through multiple repeat purchases.

## Database Changes

### Schema Updates
1. Create or modify views to track orders beyond the second purchase
2. Add functions to calculate retention for 3rd, 4th, and subsequent purchases
3. Ensure proper indexing for performance with larger datasets

### SQL Functions to Create/Modify
1. `get_nth_cohort_heatmap(n INTEGER)` - Get cohort data for the nth purchase
2. `get_customers_by_nth_order(cohort_month TEXT, n INTEGER)` - Get customers who made their nth order in a specific cohort

## Frontend Changes

### Components to Update
1. Modify `cohort-heatmap.jsx` to support displaying nth order cohorts
2. Add selector for choosing which order number to analyze (2nd, 3rd, 4th, etc.)
3. Update customer list dialog to show nth order details
4. Enhance data visualization to compare retention across different order numbers

### New Features
1. Add toggle between different cohort views (2nd order, 3rd order, etc.)
2. Implement comparison view to see retention drop-off between subsequent purchases
3. Add export functionality for nth cohort data

## API Changes
1. Update or create new API endpoints to fetch nth cohort data
2. Modify existing endpoints to accept order number parameter

## Implementation Steps
1. Update database schema and functions
2. Create API endpoints for nth cohort data
3. Modify frontend components to display nth cohort data
4. Add UI controls for selecting which order number to analyze
5. Implement comparison visualizations
6. Add comprehensive testing

## Testing Plan
1. Verify correct calculation of nth order retention percentages
2. Compare with reference data for validation
3. Test with various cohort sizes and time periods
4. Ensure performance with larger datasets

## Deployment Considerations
1. Database migrations for new functions and views
2. Backward compatibility with existing cohort analysis
3. Performance monitoring for more complex queries
