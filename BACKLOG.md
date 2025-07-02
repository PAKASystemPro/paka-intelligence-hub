# Development Backlog

## Data Sync Issues

### May 2025 Order Sync Issue
- **Problem**: Only 314 out of 969 expected orders were inserted for May 2025
- **Impact**: Many line items have missing order references, resulting in partial line item insertion
- **Root Cause**: Likely related to foreign key constraint handling - we're skipping orders with existing line items
- **Potential Solutions**:
  - Improve the order and line item insertion logic to handle existing references better
  - Implement a more comprehensive approach to maintain referential integrity
  - Consider a careful deletion and re-insertion strategy that preserves data integrity
- **Priority**: Medium (cohort metrics are correct despite this issue)
- **Tagged for**: v0.2

### Line Item Mapping Improvement
- **Problem**: Many line items cannot be mapped to orders due to missing Shopify order IDs
- **Impact**: Partial line item insertion for both May and June 2025
- **Potential Solutions**:
  - Enhance verification and reconciliation logic
  - Add re-sync or backfill mechanisms for missing orders
- **Priority**: Medium
- **Tagged for**: v0.2

## Future Enhancements

### Performance Optimization
- Optimize batch sizes and retry intervals for database operations
- Add more comprehensive logging and error handling
- Consider implementing parallel processing for non-dependent operations
- **Priority**: Low
- **Tagged for**: v0.3
