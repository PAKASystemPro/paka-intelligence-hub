# Klaviyo API Documentation

## API Overview

Klaviyo provides a comprehensive API platform for building custom integrations with their multi-channel messaging, commerce, and automation platform. The API enables developers to streamline customer engagement and automate workflows across various channels.

**Base API URL:** `https://a.klaviyo.com`

### Quick Start Resources
- **YouTube Tutorial Playlist:** [Klaviyo's API tutorial playlist on YouTube](https://www.youtube.com/playlist?list=PLHkNfHgtxcUanrkMnKPdkRzuWU7MGv_xM)
- **Get Started Guide:** For new developers to set up accounts and obtain credentials
- **SDKs:** New SDKs available for various programming languages
- **Postman Workspace:** API collection for testing and development
- **OpenAPI Spec:** Available at https://github.com/klaviyo/openapi

## Authentication Methods

### 1. Private Key Authentication (Server-side `/api` endpoints)
**Usage:** Server-side API calls with full functionality
**Header:** `Authorization: Klaviyo-API-Key your-private-api-key`
**Features:**
- API key scopes support (Read-only, Full, Custom)
- Full access to all API functionality
- Error: `400` for invalid or missing API key

### 2. OAuth Authentication
**Usage:** Recommended for tech partner integrations
**Benefits:**
- Enhanced security
- Better usability
- Improved rate limits
- Suitable for third-party applications

### 3. Public Key Authentication (Client-side `/client` endpoints)
**Usage:** Client-side environments only
**Method:** Query parameter `company_id=COMPANY_ID`
**Key:** 6-character company ID (site ID)
**Limitations:** 
- Object creation only for specific types
- No sensitive response data
- Limited functionality for security

**Example:**
```bash
curl --request POST \
  --url 'https://a.klaviyo.com/client/events/?company_id=COMPANY_ID' \
  --header 'Content-Type: application/json' \
  --data '{DATA}'
```

## API Scopes

Klaviyo supports API scopes to restrict third-party access:

| Scope | Description |
|-------|-------------|
| **Read-only** | View data only |
| **Full** | Create, delete, modify (default) |
| **Custom** | Granular access control |

**Important Notes:**
- Cannot add scope to existing private key
- Cannot edit private API key after creation
- Must delete and recreate key to change scope

## API Features

### JSON:API Support

#### Relationships
- Powerful `relationships` object for modeling resource relationships
- Efficient querying of related resources
- Eliminates redundant queries

#### Filtering
- Uses `?filter` query parameter
- JSON:API general filtering syntax
- Endpoint-specific operator and field support

#### Sorting
- Uses `?sort` query parameter
- Ascending: `GET /api/events/?sort=datetime`
- Descending: `GET /api/events/?sort=-datetime`

#### Sparse Fieldsets
- Select specific fields: `?fields[TYPE]=field1,field2`
- Works with included resources
- Examples:
  - `GET /api/events?fields[event]=metric_id,profile_id`
  - `GET /api/events?fields[profile]=first_name,email&include=profile`

#### Pagination
- Cursor-based pagination: `?page[cursor]`
- Response includes navigation links:
```json
{
  "data": [...],
  "links": {
    "next": "https://a.klaviyo.com/api/profiles/?page%5Bcursor%5D=bmV4dDo6aWQ6Ok43dW1iVw",
    "prev": null,
    "self": "https://a.klaviyo.com/api/profiles"
  }
}
```

## Rate Limiting

- **Algorithm:** Fixed-window rate limiting
- **Windows:** Burst (short) and steady (long)
- **Scope:** Per-account basis
- **Error:** HTTP 429 when limits reached
- **Documentation:** Each endpoint lists specific burst and steady limits

## Data Formats

### Datetime Format
- **Standard:** ISO 8601 RFC 3339
- **Example:** `2023-01-16T23:20:50.52Z`
- **Usage:** All URLs, requests, and response bodies

## API Versioning

- Current version: **v2025-04-15**
- Versioning and deprecation policy available
- Status codes and error handling guide provided

---

# API Reference Categories


## Flows API (Beta)

**Base URL:** `https://a.klaviyo.com/api/flow-actions/`

**Note:** This endpoint is in beta and subject to change. A beta revision header (2025-04-15.pre) is required to use beta APIs. Beta APIs are not intended for production use.

### Available Endpoints

#### 1. Get Flow Action
- **Method:** GET
- **Endpoint:** `/api/flow-actions/{id}`
- **Description:** Get a flow action from a flow with the given flow action ID
- **Rate Limits:** 
  - Burst: 3/s
  - Steady: 60/m
- **Scopes:** `flows:read`
- **Path Parameters:**
  - `id` (string, required): Flow action ID
- **Query Parameters:**
  - `fields[flow-action]` (array of strings): Sparse fieldsets for flow-action
  - `fields[flow-message]` (array of strings): Sparse fieldsets for flow-message
  - `fields[flow]` (array of strings): Sparse fieldsets for flow
  - `include` (array of strings): Include related resources
- **Headers:**
  - `Authorization: Klaviyo-API-Key your-private-api-key`
  - `revision: 2025-04-15.pre` (required for beta)
  - `accept: application/vnd.api+json`

**Example Request:**
```bash
curl --request GET \
     --url https://a.klaviyo.com/api/flow-actions/id \
     --header 'Authorization: Klaviyo-API-Key your-private-api-key' \
     --header 'accept: application/vnd.api+json' \
     --header 'revision: 2025-04-15.pre'
```

**Response Structure:**
```json
{
  "data": {
    "type": "flow-action",
    "id": "string",
    "attributes": {
      "created": "2022-11-08T00:00:00+00:00",
      "updated": "2022-11-08T00:00:00+00:00",
      "definition": {
        "id": "123",
        "temporary_id": "action-1",
        "type": "back-in-stock-delay",
        "links": {
          "next": "string"
        }
      }
    },
    "relationships": {
      "flow": {
        "data": {
          "type": "flow",
          "id": "string"
        }
      },
      "flow-messages": {
        "data": [
          {
            "type": "flow-message",
            "id": "string"
          }
        ]
      }
    }
  }
}
```

#### 2. Update Flow Action
- **Method:** PATCH
- **Endpoint:** `/api/flow-actions/{id}`

#### 3. Get Flow Message
- **Method:** GET
- **Endpoint:** `/api/flow-messages/{id}`

#### 4. Get Actions for Flow
- **Method:** GET
- **Endpoint:** `/api/flows/{id}/flow-actions/`

#### 5. Get Messages For Flow Action
- **Method:** GET
- **Endpoint:** `/api/flow-actions/{id}/flow-messages/`

#### 6. Get Action for Flow Message
- **Method:** GET
- **Endpoint:** `/api/flow-messages/{id}/flow-action/`

#### 7. Get Action ID for Flow Message
- **Method:** GET
- **Endpoint:** `/api/flow-messages/{id}/flow-action/`

---


## Accounts API

**Base URL:** `https://a.klaviyo.com/api/accounts`

### Available Endpoints

#### 1. Get Accounts
- **Method:** GET
- **Endpoint:** `/api/accounts`
- **Description:** Retrieve account(s) associated with a private API key. Returns 1 account object within the array.
- **Use Cases:** 
  - Retrieve account-specific data (contact information, timezone, currency, Public API key, etc.)
  - Test if a Private API Key belongs to the correct account
- **Rate Limits:**
  - Burst: 1/s
  - Steady: 15/m
- **Scopes:** `accounts:read`
- **Query Parameters:**
  - `fields[account]` (array of strings): Sparse fieldsets for account data
- **Headers:**
  - `Authorization: Klaviyo-API-Key your-private-api-key`
  - `revision: 2025-04-15` (required, defaults to current version)
  - `accept: application/vnd.api+json`

**Example Request:**
```bash
curl --request GET \
     --url https://a.klaviyo.com/api/accounts \
     --header 'Authorization: Klaviyo-API-Key your-private-api-key' \
     --header 'accept: application/vnd.api+json' \
     --header 'revision: 2025-04-15'
```

**Response Structure:**
```json
{
  "data": [
    {
      "type": "account",
      "id": "string",
      "attributes": {
        "test_account": true,
        "contact_information": {
          "default_sender_name": "Klaviyo Demo",
          "default_sender_email": "contact@klaviyo-demo.com",
          "website_url": "https://www.klaviyo.com",
          "organization_name": "Klaviyo Demo",
          "street_address": {
            "address1": "125 Summer Street",
            "address2": "5th Floor",
            "city": "Boston",
            "region": "MA",
            "country": "US",
            "zip": "04323"
          }
        },
        "industry": "Software / SaaS",
        "timezone": "US/Eastern",
        "preferred_currency": "USD",
        "public_api_key": "AbC123",
        "locale": "en-US"
      }
    }
  ]
}
```

#### 2. Get Account
- **Method:** GET
- **Endpoint:** `/api/accounts/{id}`
- **Description:** Retrieve a specific account by ID

---

## Messages API

**Base URL:** `https://a.klaviyo.com/api/campaign-messages`

### Available Endpoints

#### Campaign Message Management
1. **Get Campaign Message** (GET) - `/api/campaign-messages/{id}`
2. **Update Campaign Message** (PATCH) - `/api/campaign-messages/{id}`
3. **Assign Template to Campaign Message** (POST) - `/api/campaign-messages/{id}/relationships/template`

#### Campaign Message Relationships
4. **Get Campaign for Campaign Message** (GET) - `/api/campaign-messages/{id}/campaign`
5. **Get Campaign ID for Campaign Message** (GET) - `/api/campaign-messages/{id}/relationships/campaign`
6. **Get Template for Campaign Message** (GET) - `/api/campaign-messages/{id}/template`
7. **Get Template ID for Campaign Message** (GET) - `/api/campaign-messages/{id}/relationships/template`

#### Campaign Message Images
8. **Get Image for Campaign Message** (GET) - `/api/campaign-messages/{id}/image`
9. **Get Image ID for Campaign Message** (GET) - `/api/campaign-messages/{id}/relationships/image`
10. **Update Image for Campaign Message** (PATCH) - `/api/campaign-messages/{id}/relationships/image`

---

## Campaigns API

**Base URL:** `https://a.klaviyo.com/api/campaigns`

### Available Endpoints
- Campaign creation and management
- Campaign scheduling and sending
- Campaign analytics and reporting
- Campaign template management

---

## Jobs API

**Base URL:** `https://a.klaviyo.com/api/jobs`

### Available Endpoints
- Job status monitoring
- Bulk operation tracking
- Asynchronous task management

---

## Catalogs API

**Base URL:** `https://a.klaviyo.com/api/catalogs`

The Catalogs API provides comprehensive e-commerce functionality for managing product catalogs, inventory, and customer interactions.

### API Categories

#### 1. Variants API
- **Purpose:** Manage product variants (size, color, style variations)
- **Endpoints:** Product variant CRUD operations
- **Use Cases:** Inventory management, product catalog updates

#### 2. Back In Stock API
- **Purpose:** Manage back-in-stock notifications and subscriptions
- **Endpoints:** Subscription management, notification triggers
- **Use Cases:** Customer retention, inventory alerts

#### 3. Items API
- **Purpose:** Manage catalog items and product information
- **Endpoints:** Product CRUD operations, catalog management
- **Use Cases:** Product catalog maintenance, inventory tracking

---

## Custom Objects API (Beta)

**Base URL:** `https://a.klaviyo.com/api/custom-objects`

### Available Endpoints
- Custom object schema definition
- Custom object record management
- Custom object relationships
- Custom object querying and filtering

**Note:** Custom Objects API is in beta and subject to change.

---

## API Documentation Summary

### Complete API Structure

**Core APIs:**
- **Flows API** (Beta) - 7 endpoints for flow automation management
- **Accounts API** - 2 endpoints for account information retrieval
- **Messages API** - 10+ endpoints for campaign message management
- **Campaigns API** - Campaign lifecycle management
- **Jobs API** - Asynchronous operation tracking
- **Catalogs API** - E-commerce catalog management (3 sub-categories)
- **Custom Objects API** (Beta) - Extensible data management

### Authentication Methods
1. **Private Key Authentication** - Server-side APIs with full functionality
2. **OAuth Authentication** - Recommended for partner integrations
3. **Public Key Authentication** - Client-side APIs with limited functionality

### API Features
- **JSON:API Compliance** - Standardized request/response format
- **Rate Limiting** - Burst and steady rate limits per endpoint
- **Sparse Fieldsets** - Selective field retrieval for optimization
- **Cursor-based Pagination** - Efficient data navigation
- **Relationship Management** - Resource relationship modeling
- **Filtering and Sorting** - Advanced query capabilities

### Regional Support
- **Current Version:** v2025-04-15
- **Base URL:** https://a.klaviyo.com
- **Revision Header:** Required for all requests
- **Datetime Format:** ISO 8601 RFC 3339

### Development Resources
- **OpenAPI Specification:** Available on GitHub
- **Postman Collections:** Ready-to-use API collections
- **SDKs:** Multiple programming language support
- **YouTube Tutorials:** Video walkthroughs for popular endpoints
- **Documentation:** Comprehensive guides and examples

This documentation provides a complete reference for integrating with Klaviyo's multi-channel marketing automation platform, covering email marketing, SMS, customer segmentation, flow automation, and e-commerce catalog management.

