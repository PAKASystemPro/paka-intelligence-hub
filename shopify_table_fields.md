## Order Table
a comprehensive list of top-level fields for the Order object was compiled, along with their data types. The data types are mapped to common formats like string, int, date, boolean, object, and list for database integration. Note that some field names may vary slightly across documentation versions, and the user should verify exact names and types in the official documentation at [Order Object Documentation]([invalid url, do not cite]).

Below is the compiled list, organized alphabetically, with simplified data types:


Field Name	Data Type
additionalFees	list of objects
salesAgreements	list (connection)
resourceAlerts	list of objects
app	object
billingAddress	object
billingAddressMatchesShippingAddress	boolean
cancellation	object
canceledAt	date
cancelReason	string
canMarkAsPaid	boolean
canSendEmail	boolean
canCapturePayment	boolean
cartDiscountAmountSet	object
channelInformation	object
clientIp	string
closed	boolean
closedAt	date
customerOrderId	string
hasInventoryReservation	boolean
createdAt	date
currencyCode	string
currentCartDiscountAmountSet	object
currentShippingPriceSet	object
currentSubtotalLineItemsQuantity	int
currentSubtotalPriceSet	object
currentTaxLines	list of objects
currentTotalAdditionalFeesSet	object
currentTotalDiscountsSet	object
currentTotalDutiesSet	object
currentTotalPriceSet	object
currentTotalTaxSet	object
currentTotalWeight	int
customAttributes	list of objects
customer	object
customerAcceptsMarketing	boolean
customerJourneySummary	object
customerLocale	string
discountApplications	list (connection)
discountCode	string
discountCodes	list of strings
defaultAddress	object
displayFinancialStatus	string
displayFulfillmentStatus	string
disputes	list of objects
dutiesIncluded	boolean
hasBeenEdited	boolean
email	string
estimatedTaxes	boolean
events	list (connection)
hasFulfillableLineItems	boolean
fulfillmentOrders	list (connection)
fulfillments	list of objects
fulfillmentsCount	object
fullyPaid	boolean
hasTimelineComment	boolean
id	string
legacyResourceId	int
lineItems	list (connection)
localizedFields	list (connection)
merchantBusinessEntity	object
merchantEditable	boolean
merchantEditableErrors	list of strings
merchantOfRecordApp	object
metafield	object
metafields	list (connection)
name	string
netPaymentSet	object
nonFulfillableLineItems	list (connection)
note	string
originalTotalAdditionalFeesSet	object
originalTotalDutiesSet	object
originalTotalPriceSet	object
paymentCollectionDetails	object
paymentGatewayNames	list of strings
paymentTerms	object
phone	string
poNumber	string
presentmentCurrencyCode	string
processedAt	date
publication	object
purchasingEntity	object
refundable	boolean
refundDiscrepancySet	object
refunds	list of objects
referringSite	string
requiresShipping	boolean
restockable	boolean
retailLocation	object
returns	list (connection)
returnStatus	string
riskSummary	object
shippingAddress	object
shippingLine	object
shippingLines	list (connection)
shopifyProtectSummary	object
sourceIdentifier	string
sourceName	string
staffMember	object
statusUrl	string
subtotalLineItemsQuantity	int
subtotalPriceSet	object
suggestedRefund	object
tags	list of strings
taxesIncluded	boolean
taxExempt	boolean
taxLines	list of objects
test	boolean
totalUncapturedSet	object
totalCashRoundingAdjustment	object
totalDiscountSet	object
totalOutstandingSet	object
totalPriceSet	object
totalReceivedSet	object
totalRefundedSet	object
totalRefundedShippingSet	object
totalShippingPriceSet	object
totalTaxSet	object
totalTipSet	object
totalWeight	int
transactions	list of objects
transactionsCount	object
unpaid	boolean
updatedAt	date
This table includes 105 fields, but the actual number may be higher, as some fields might have been missed due to documentation cutoffs. The user should verify the complete list in the official documentation.

Data Type Mapping and Explanation
The data types are mapped as follows:

string: Includes String, ID, URL, and enums (e.g., CurrencyCode, OrderCancelReason), suitable for text fields in a database.
int: Includes Int and UnsignedInt64, for integer values like quantities or counts.
date: Includes DateTime, stored as ISO 8601 strings, for date and time fields.
boolean: Includes Boolean, for true/false values.
object: Includes complex types like MailingAddress, MoneyBag, and others, which contain nested fields and require further querying for full data.
list of strings: For fields like discountCodes, which are lists of scalar strings.
list of objects: For fields like additionalFees, which are lists of complex objects.
list (connection): For connections like lineItems, which are paginated lists, requiring cursor-based pagination for full data retrieval.


## Order Details
lineItems is a field within the Shopify GraphQL API's Order object, representing individual products and quantities in an order.
It’s a connection (paginated list) of LineItem objects, each with fields like id, title, quantity, and price.
Check Order Object Documentation and LineItem Documentation for details.
Line Items Field

Field Name	Data Type	Description
lineItems	list (connection)	List of LineItem objects in the order.
Key LineItem Fields

Field Name	Data Type	Description
id	string	Unique identifier for the line item.
title	string	Product or variant title.
quantity	int	Number of units ordered.
originalUnitPriceSet	object	Original price per unit (MoneyBag).
discountedUnitPriceSet	object	Discounted price per unit (MoneyBag).
totalDiscountSet	object	Total discount applied (MoneyBag).
variant	object	Product variant details (ProductVariant).
product	object	Product details (Product).
customAttributes	list of objects	Additional metadata for the line item.
fulfillmentStatus	string	Fulfillment status (e.g., FULFILLED, PENDING).
Notes
lineItems is nested within the Order object, requiring subfield queries for complete data (e.g., variant, product).


## Order Fulfilment
Key Points
Fulfillment status and details like tracking number are within the Shopify GraphQL API's Order object, primarily via fulfillments and fulfillmentOrders fields.
fulfillments is a list of Fulfillment objects containing tracking info (e.g., trackingNumber, trackingUrl).
fulfillmentOrders groups line items for fulfillment, with status details.
displayFulfillmentStatus provides a summary status (e.g., FULFILLED, PENDING).
Check Order Object Documentation, Fulfillment Documentation, and FulfillmentOrder Documentation.
Relevant Order Fields

Field Name	Data Type	Description
displayFulfillmentStatus	string	Summary status (e.g., FULFILLED, UNFULFILLED).
fulfillments	list of objects	List of Fulfillment objects with tracking info.
fulfillmentOrders	list (connection)	List of FulfillmentOrder objects for line items.
fulfillmentsCount	object	Total number of fulfillments.
Key Fulfillment Fields

Field Name	Data Type	Description
id	string	Unique identifier for the fulfillment.
status	string	Fulfillment status (e.g., SUCCESS, CANCELLED).
trackingInfo	list of objects	Tracking details (number, URL, company).
trackingNumber	string	Shipment tracking number.
trackingUrl	string	URL for tracking the shipment.
createdAt	date	Date fulfillment was created.
updatedAt	date	Date fulfillment was last updated.
Key FulfillmentOrder Fields

Field Name	Data Type	Description
id	string	Unique identifier for the fulfillment order.
status	string	Status (e.g., OPEN, IN_PROGRESS, CLOSED).
fulfillmentOrderLineItems	list (connection)	Line items assigned to this fulfillment.
createdAt	date	Date fulfillment order was created.
Notes
trackingInfo in Fulfillment contains number, url, and company for each tracking entry.
fulfillmentOrders links line items to fulfillment tasks, useful for partial fulfillments.



## Customer Table
Customer Field List with Data Types
Below is a table of key Customer object fields and their simplified data types for database integration:


Field Name	Data Type
acceptsMarketing	boolean
acceptsMarketingUpdatedAt	date
addresses	list (connection)
averageOrderAmount	object
averageOrderAmountV2	object
canDelete	boolean
createdAt	date
currency	string
defaultAddress	object
displayName	string
email	string
emailMarketingConsent	object
firstName	string
hasNote	boolean
hasTimelineComment	boolean
id	string
lastName	string
lastOrder	object
legacyResourceId	int
lifetimeDuration	string
locale	string
marketingOptInLevel	string
metafield	object
metafields	list (connection)
multipassIdentifier	string
note	string
numberOfOrders	int
orders	list (connection)
paymentMethods	list (connection)
phone	string
productSubscriberStatus	string
smsMarketingConsent	object
state	string
subscriptionContracts	list (connection)
tags	list of strings
taxExempt	boolean
taxExemptions	list of strings
totalSpent	object
totalSpentV2	object
updatedAt	date
validEmailAddress	boolean
verifiedEmail	boolean
Notes
Object fields (e.g., defaultAddress, orders) are complex types (e.g., MailingAddress, Order) requiring subfield queries.
List (connection) fields (e.g., addresses, orders) are paginated, needing cursor-based pagination.
Use GraphiQL Explorer to verify and explore field types interactively.