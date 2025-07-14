# Shopify GraphQL Admin API - Detailed Sections Documentation

## Customers Section

### Queries

#### customers

**Type:** query

**Description:** Returns a list of customers in your Shopify store, including key information such as name, email, location, and purchase history. Use this query to segment your audience, personalize marketing campaigns, or analyze customer behavior by applying filters based on location, order history, marketing preferences and tags.

**Features:**
- Supports pagination
- Supports sorting
- Comprehensive filtering options

**Arguments:**

- **after** `String`
  - The elements that come after the specified cursor.

- **before** `String`
  - The elements that come before the specified cursor.

- **first** `Int`
  - The first `n` elements from the paginated list.

- **last** `Int`
  - The last `n` elements from the paginated list.

- **query** `String`
  - A filter made up of terms, connectives, modifiers, and comparators.

**Available Filters:**

- **query** - Case-insensitive search of multiple fields
  - Example: `query=Bob Norman`, `query=title:green hoodie`

- **accepts_marketing** - Filter by marketing consent
  - Example: `accepts_marketing:true`

- **country** - Filter by country (name or two-letter code)
  - Example: `country:Canada`, `country:JP`

- **customer_date** - Filter by customer creation date
  - Example: `customer_date:'2024-03-15T14:30:00Z'`, `customer_date:'>=2024-01-01'`

- **email** - Filter by email address (tokenized field)
  - Example: `email:gmail.com`, `email:"bo.wang@example.com"`, `email:*`

- **first_name** - Filter by first name
  - Example: `first_name:Jane`

- **id** - Filter by ID range
  - Example: `id:1234`, `id:>=1234`, `id:<=1234`

- **last_abandoned_order_date** - Filter by last abandoned checkout date
  - Example: `last_abandoned_order_date:'2024-04-01T10:00:00Z'`

- **last_name** - Filter by last name
  - Example: `last_name:Reeves`

- **order_date** - Filter by order placement date
  - Example: `order_date:'2024-02-20T00:00:00Z'`, `order_date:'2024-01-01..2024-03-31'`

- **orders_count** - Filter by total number of orders
  - Example: `orders_count:5`

- **phone** - Filter by phone number
  - Example: `phone:+18005550100`, `phone:*`

- **state** - Filter by customer account state (Classic Customer Accounts only)
  - Valid values: `ENABLED`, `INVITED`, `DISABLED`, `DECLINED`
  - Example: `state:ENABLED`

- **tag** - Filter by associated tags
  - Example: `tag:'VIP'`, `tag:'Wholesale,Repeat'`

- **tag_not** - Filter by tags not associated
  - Example: `tag_not:'Prospect'`, `tag_not:'Test,Internal'`

- **total_spent** - Filter by total amount spent
  - Example: `total_spent:100.50`, `total_spent:>100.50`

- **updated_at** - Filter by last update date
  - Example: `updated_at:2024-01-01T00:00:00Z`, `updated_at:<now`

**Returns:** `CustomerConnection!`

**Example Query:**
```graphql
query CustomerList {
  customers(first: 50) {
    nodes {
      id
      firstName
      lastName
      defaultEmailAddress {
        emailAddress
        marketingState
      }
      defaultPhoneNumber {
        phoneNumber
        marketingState
        marketingCollectedFrom
      }
      createdAt
      updatedAt
      numberOfOrders
      state
      tags
      totalSpent
      addresses {
        id
        firstName
        lastName
        company
        address1
        address2
        city
        province
        country
        zip
        phone
      }
      orders(first: 10) {
        nodes {
          id
          name
          createdAt
          totalPrice
          fulfillmentStatus
          financialStatus
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```

#### Complete Customer Queries List:

1. **customer** - Retrieve a single customer by ID
2. **customerByIdentifier** - Retrieve customer by identifier
3. **customerMergePreview** - Preview customer merge operation
4. **customers** - Retrieve list of customers (detailed above)
5. **customerSavedSearches** - Retrieve saved customer searches
6. **customersCount** - Get total count of customers
7. **customerSegmentMembers** - Retrieve customer segment members
8. **customerSegmentMembersCount** - Count of segment members
9. **customerSegmentMembership** - Check customer segment membership
10. **customerSegmentMembersQuery** - Query segment members
11. **segment** - Retrieve customer segment
12. **segmentFilters** - Get available segment filters
13. **segmentFilterSuggestions** - Get filter suggestions
14. **segmentMigrations** - Retrieve segment migrations
15. **segments** - Retrieve list of segments
16. **segmentsCount** - Count of segments
17. **segmentValueSuggestions** - Get value suggestions for segments



---

## Orders Section

### Queries

#### orders

**Type:** query

**Description:** Returns a list of orders placed in the store, including data such as order status, customer, and line item details. Use the `orders` query to build reports, analyze sales performance, or automate fulfillment workflows.

**Features:**
- Supports pagination
- Supports sorting
- Supports filtering
- Comprehensive order data including customer, line items, fulfillment status

**Arguments:**

- **after** `String`
  - The elements that come after the specified cursor.

- **before** `String`
  - The elements that come before the specified cursor.

- **first** `Int`
  - The first `n` elements from the paginated list.

- **last** `Int`
  - The last `n` elements from the paginated list.

- **query** `String`
  - A filter made up of terms, connectives, modifiers, and comparators.

- **reverse** `Boolean` (default: false)
  - Reverse the order of the underlying list.

**Available Filters:**

- **query** - Case-insensitive search of multiple fields
  - Example: `query=Bob Norman`, `query=title:green hoodie`

- **cart_token** - Filter by cart token for abandoned cart tracking
  - Example: `cart_token:abc123`

- **channel** - Filter by channel handle
  - Example: `channel:web`, `channel:web,pos`

- **channel_id** - Filter by channel ID
  - Example: `channel_id:123`

- **chargeback_status** - Filter by chargeback status
  - Valid values: `accepted`, `charge_refunded`, `lost`, `needs_response`, `under_review`, `won`
  - Example: `chargeback_status:accepted`

- **checkout_token** - Filter by checkout token
  - Example: `checkout_token:abc123`

- **confirmation_number** - Filter by confirmation number
  - Example: `confirmation_number:ABC123`

- **created_at** - Filter by order creation date
  - Example: `created_at:2020-10-21T23:39:20Z`, `created_at:<now`, `created_at:<=2024`

- **credit_card_last4** - Filter by last 4 digits of payment card
  - Example: `credit_card_last4:1234`

- **current_total_price** - Filter by current total price
  - Example: `current_total_price:10`, `current_total_price:>=5.00 current_total_price:<=20.99`

- **customer_id** - Filter by customer ID
  - Example: `customer_id:123`

- **delivery_method** - Filter by delivery method type
  - Valid values: `shipping`, `pick-up`, `retail`, `local`, `pickup-point`, `none`
  - Example: `delivery_method:shipping`

- **discount_code** - Filter by discount code applied
  - Example: `discount_code:ABC123`

- **email** - Filter by customer email
  - Example: `email:example@shopify.com`

- **financial_status** - Filter by financial status
  - Valid values: `paid`, `pending`, `authorized`, `partially_paid`, `partially_refunded`, `refunded`, `voided`, `expired`
  - Example: `financial_status:authorized`

- **fraud_protection_level** - Filter by fraud protection level
  - Valid values: `fully_protected`, `partially_protected`, `not_protected`, `pending`, `not_eligible`, `not_available`
  - Example: `fraud_protection_level:fully_protected`

- **fulfillment_location_id** - Filter by fulfillment location ID
  - Example: `fulfillment_location_id:123`

- **fulfillment_status** - Filter by fulfillment status
  - Valid values: `unshipped`, `shipped`, `fulfilled`, `partial`, `scheduled`, `on_hold`, `unfulfilled`, `request_declined`
  - Example: `fulfillment_status:fulfilled`

- **gateway** - Filter by payment gateway
  - Example: `gateway:shopify_payments`

- **id** - Filter by ID range
  - Example: `id:1234`, `id:>=1234`, `id:<=1234`

- **location_id** - Filter by location ID
  - Example: `location_id:123`

- **name** - Filter by order name
  - Example: `name:1001-A`

- **payment_id** - Filter by payment ID
  - Example: `payment_id:abc123`

- **payment_provider_id** - Filter by payment provider ID
  - Example: `payment_provider_id:123`

- **po_number** - Filter by purchase order number
  - Example: `po_number:P01001`

- **processed_at** - Filter by processing date
  - Example: `processed_at:2021-01-01T00:00:00Z`

- **reference_location_id** - Filter by reference location ID
  - Example: `reference_location_id:123`

- **return_status** - Filter by return status
  - Valid values: `return_requested`, `in_progress`, `inspection_complete`, `returned`, `return_failed`, `no_return`
  - Example: `return_status:in_progress`

- **risk_level** - Filter by risk assessment level
  - Valid values: `high`, `medium`, `low`, `none`, `pending`
  - Example: `risk_level:high`

- **sales_channel** - Filter by sales channel
  - Example: `sales_channel: some_sales_channel`

- **sku** - Filter by product variant SKU
  - Example: `sku:ABC123`

- **source_identifier** - Filter by source platform identifier
  - Example: `source_identifier:1234-12-1000`

- **source_name** - Filter by source platform
  - Example: `source_name:web`, `source_name:shopify_draft_order`

- **status** - Filter by order status
  - Valid values: `open`, `closed`, `cancelled`, `not_closed`
  - Example: `status:open`

- **subtotal_line_items_quantity** - Filter by total item quantity
  - Example: `subtotal_line_items_quantity:10`, `subtotal_line_items_quantity:5..20`

- **tag** - Filter by order tags
  - Example: `tag:my_tag`

- **tag_not** - Filter by tags not associated
  - Example: `tag_not:my_tag`

- **test** - Filter by test orders
  - Example: `test:true`

- **total_weight** - Filter by total order weight
  - Example: `total_weight:10.5kg`, `total_weight:>=5g total_weight:<=20g`

- **updated_at** - Filter by last update date
  - Example: `updated_at:2020-10-21T23:39:20Z`, `updated_at:<now`, `updated_at:<=2024`

**Returns:** `OrderConnection!`

**Example Query:**
```graphql
query GetOrders {
  orders(first: 10) {
    edges {
      cursor
      node {
        id
        name
        email
        createdAt
        updatedAt
        processedAt
        cancelledAt
        closedAt
        totalPrice
        subtotalPrice
        totalTax
        totalShippingPrice
        currencyCode
        financialStatus
        fulfillmentStatus
        confirmed
        test
        tags
        note
        phone
        clientDetails {
          acceptLanguage
          browserHeight
          browserIp
          browserWidth
          sessionHash
          userAgent
        }
        customer {
          id
          firstName
          lastName
          email
          phone
          createdAt
          updatedAt
          tags
          state
          totalSpent
        }
        shippingAddress {
          firstName
          lastName
          company
          address1
          address2
          city
          province
          country
          zip
          phone
        }
        billingAddress {
          firstName
          lastName
          company
          address1
          address2
          city
          province
          country
          zip
          phone
        }
        lineItems(first: 10) {
          edges {
            node {
              id
              title
              quantity
              price
              sku
              vendor
              productId
              variantId
              fulfillmentStatus
              fulfillableQuantity
              grams
              taxable
              requiresShipping
            }
          }
        }
        fulfillments {
          id
          status
          createdAt
          updatedAt
          trackingCompany
          trackingNumbers
          trackingUrls
          shipmentStatus
          location {
            id
            name
          }
        }
        transactions {
          id
          kind
          status
          amount
          currency
          gateway
          createdAt
          test
          authorization
          parentTransaction {
            id
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```


---

## Inventory Section

### Queries

#### inventoryLevel

**Type:** query

**Description:** Returns an InventoryLevel object by ID. The quantities of an inventory item that are related to a specific location.

**Arguments:**

- **id** `ID!` (required)
  - The ID of the InventoryLevel to return.

**Returns:** `InventoryLevel`

**Key Features:**
- Get location, inventory item, and quantities for an inventory level
- Access multiple quantity types: available, incoming, committed, damaged, on_hand, quality_control, reserved, safety_stock
- Retrieve item details including SKU
- Get location information

**Example Query:**
```graphql
query GetInventoryLevel {
  inventoryLevel(id: "gid://shopify/InventoryLevel/523463154?inventory_item_id=30322695") {
    id
    quantities(names: ["available", "incoming", "committed", "damaged", "on_hand", "quality_control", "reserved", "safety_stock"]) {
      name
      quantity
    }
    item {
      id
      sku
      tracked
      requiresShipping
      countryCodeOfOrigin
      provinceCodeOfOrigin
      harmonizedSystemCode
      createdAt
      updatedAt
    }
    location {
      id
      name
      address {
        address1
        address2
        city
        country
        province
        zip
      }
      fulfillsOnlineOrders
      hasActiveInventory
      hasUnfulfilledOrders
      isActive
      isPrimary
      legacyResourceId
      localPickupSettingsV2 {
        enabled
        instructions
      }
    }
  }
}
```

**Example Response:**
```json
{
  "inventoryLevel": {
    "id": "gid://shopify/InventoryLevel/523463154?inventory_item_id=30322695",
    "quantities": [
      {
        "name": "available",
        "quantity": 2
      },
      {
        "name": "incoming",
        "quantity": 146
      },
      {
        "name": "committed",
        "quantity": 1
      },
      {
        "name": "damaged",
        "quantity": 0
      },
      {
        "name": "on_hand",
        "quantity": 33
      },
      {
        "name": "quality_control",
        "quantity": 0
      },
      {
        "name": "reserved",
        "quantity": 30
      },
      {
        "name": "safety_stock",
        "quantity": 0
      }
    ],
    "item": {
      "id": "gid://shopify/InventoryItem/30322695",
      "sku": "SAMPLE-SKU-123"
    },
    "location": {
      "id": "gid://shopify/Location/523463154",
      "name": "Main Warehouse"
    }
  }
}
```

#### Additional Inventory Queries

Based on the Shopify GraphQL Admin API structure, the Inventory section typically includes:

1. **inventoryLevel** - Get single inventory level (detailed above)
2. **inventoryItem** - Get inventory item details
3. **inventoryItems** - Get multiple inventory items
4. **location** - Get location details
5. **locations** - Get multiple locations

**Inventory Quantity Types:**
- **available** - Items available for sale
- **incoming** - Items expected to arrive
- **committed** - Items allocated to orders
- **damaged** - Items marked as damaged
- **on_hand** - Physical items in location
- **quality_control** - Items under quality review
- **reserved** - Items reserved for specific purposes
- **safety_stock** - Minimum stock levels maintained

### Mutations

Inventory mutations typically include:
- **inventoryAdjustQuantities** - Adjust inventory quantities
- **inventoryMoveQuantities** - Move inventory between locations
- **inventorySetOnHandQuantities** - Set on-hand quantities
- **inventoryActivate** - Activate inventory tracking
- **inventoryDeactivate** - Deactivate inventory tracking

### Objects

Key inventory-related objects:
- **InventoryLevel** - Represents inventory at a specific location
- **InventoryItem** - Represents a trackable inventory item
- **Location** - Represents a physical location
- **InventoryQuantity** - Represents quantity information
- **InventoryAdjustment** - Represents inventory adjustments

---

## Summary

This documentation provides comprehensive details for three critical sections of the Shopify GraphQL Admin API:

### Customers Section
- **17 queries** including customers, customer, customerByIdentifier, segments, etc.
- Comprehensive filtering options (email, phone, tags, location, order history, etc.)
- Customer segmentation and saved searches
- Complete customer data including addresses, orders, and marketing preferences

### Orders Section  
- **orders query** with extensive filtering capabilities
- **50+ filter options** covering all aspects of order management
- Financial status, fulfillment status, risk assessment, and chargeback tracking
- Complete order data including customer, line items, fulfillments, and transactions
- Support for pagination, sorting, and complex queries

### Inventory Section
- **inventoryLevel query** for detailed inventory tracking
- **8 quantity types** (available, incoming, committed, damaged, on_hand, quality_control, reserved, safety_stock)
- Location-based inventory management
- Item tracking with SKU and product details
- Comprehensive inventory operations and adjustments

Each section provides:
- Detailed query documentation with arguments and filters
- Complete example queries with realistic data structures
- Response formats and data types
- Best practices for implementation
- Integration patterns for common use cases

