# Application Architecture

## Composables Structure

Our application follows a clear separation of concerns pattern with these composable types:

### API Composables
These handle only API calls and data fetching:
- `useTabsAPI.js`  
- `useRulesAPI.js`  
- `useGroupsAPI.js`  
- `useTransactions.js` (for transaction API calls)

### Business Logic Composables
These handle domain-specific business logic:
- `useGroupOperations.js` - Group-related operations  
- `useTabs.js` - Tab-related operations
- `useTabProcessing.js` - Processing tab data and rules
- `useRules.js` - Rule-related operations
- `useDashboardOperations.js` - Dashboard-specific operations

### State Management Composables
These manage application state:
- `useDashboardState.js` - Dashboard state management

### Utility Composables
These provide generic, reusable utility functions:
- `useUtils.js` - General utilities

## Dependency Flow

The architecture follows a clear dependency flow:

```
Components
    ↓
State Management
    ↓
Business Logic
    ↓
API Layer
```

## Key Principles

1. **Single Responsibility**: Each composable has a single responsibility.
2. **Clean Dependencies**: Higher-level composables depend on lower-level ones, not vice versa.
3. **Clear Separation**: API calls, business logic, and state management are separate.
4. **Reusability**: Utility functions are grouped together and reused across the application.
5. **Testability**: Each composable can be tested in isolation.

## Recommended Practices

1. Keep composables focused on a single area of functionality
2. Use descriptive naming for functions
3. Document complex functions with JSDoc comments
4. Avoid circular dependencies
5. Always delegate to the appropriate specialized composable 

# Plaid Transaction Sync Architecture

## Overview

This document provides a comprehensive explanation of the architecture and flow for the Plaid transaction synchronization process, specifically for the API endpoint `/plaid/sync/latest/transactions/:itemId`.

## System Components

1. **API Routes** (`api/routes/plaid.js`)
   - Entry point for transaction sync requests
   - Routes requests to appropriate controller methods

2. **Transaction Controller** (`api/controllers/plaid/transactionController.js`)
   - Handles HTTP request/response for transaction sync
   - Validates input parameters
   - Calls the appropriate service methods
   - Returns formatted responses to the client

3. **Transaction Sync Service** (`api/services/plaid/transactionSyncService.js`)
   - Core business logic for transaction synchronization
   - Manages the sync process flow
   - Handles initialization, batch processing, and error handling
   - Maintains sync state via item status updates

4. **Plaid Service** (`api/services/plaid/plaidService.js`)
   - Responsible for direct communication with Plaid API
   - Handles API authentication and requests
   - Provides methods to fetch transaction data from Plaid

5. **Item Service** (`api/services/plaid/itemService.js`)
   - Manages Plaid items (connections to financial institutions)
   - Handles item status updates
   - Provides access to item data and access tokens

6. **Transaction Model** (`api/models/plaidTransactions.js`)
   - Defines schema for transaction data
   - Handles data encryption/decryption for sensitive fields
   - Provides methods for CRUD operations on transactions

## Transaction Sync Flow

### 1. Request Initiation

1. Client makes an HTTP GET request to `/plaid/sync/latest/transactions/:itemId`
2. The request is routed to `transactionController.syncLatestTransactionsForItem`
3. The controller extracts the `itemId` from the request parameters and the authenticated user

### 2. Controller Processing

1. The controller fetches the item from the database using `itemService.getUserItems`
2. It verifies the item belongs to the authenticated user
3. Then calls `transactionSyncService.syncNextBatch` with the item and user data
4. Returns the result or handles any errors

### 3. Sync Service Processing

#### A. Initial Validation
1. `syncNextBatch` validates that user data is provided
2. It calls `_validateAndGetItem` to validate/retrieve the full item data
3. Examines the item's `syncData` to determine the current sync state

#### B. Sync Initialization (for new syncs)
If no cursor exists (first sync), `_initializeBatchSync` is called:

1. Initializes sync status to "in_progress"
2. Calls Plaid API via `plaidService.syncLatestTransactionsFromPlaid` with no cursor
3. Processes the initial batch data via `_processBatchData`
4. Updates the item's sync status with the latest cursor and completion status
5. Returns batch statistics

#### C. Batch Processing (for continuing syncs)
If a cursor exists, `_processBatchInternal` is called:

1. Validates the sync state (must be "in_progress" or "error")
2. Checks if the sync is stale (older than 24 hours) and restarts if needed
3. Updates sync status to "in_progress" (in case recovering from error)
4. Calls Plaid API via `plaidService.syncLatestTransactionsFromPlaid` with existing cursor
5. Processes the batch data via `_processBatchData`
6. Updates the item's sync status with the latest cursor and completion status
7. Returns batch statistics

#### D. Batch Data Processing
The `_processBatchData` method:

1. Sets up processing context with item and batch metadata
2. Processes added, modified, and removed transactions in parallel:
   - `_processAddedTransactions` for new transactions
   - `_processModifiedTransactions` for updated transactions
   - `_processRemovedTransactions` for deleted transactions
3. Returns counts of processed transactions by type

### 4. Transaction Processing

#### A. Added Transactions
1. Formats transaction data for storage
2. Adds sync metadata (syncVersion, batchNumber, etc.)
3. Saves transactions to the database using `plaidTransactions.batchCreate`

#### B. Modified Transactions
1. Fetches existing transactions from the database
2. Updates their fields with new data
3. Saves the updated transactions

#### C. Removed Transactions
1. Removes transactions from the database by their IDs

### 5. Plaid API Integration

The `plaidService.syncLatestTransactionsFromPlaid` method:

1. Constructs a request to Plaid's Transaction Sync API
2. Includes the cursor if provided (for pagination/continuation)
3. Sets options like including personal finance categories
4. Handles API responses and error cases

## Error Handling

The system implements robust error handling:

1. **Controller Level:**
   - Catches and formats errors for HTTP responses
   - Returns appropriate HTTP status codes

2. **Service Level:**
   - Uses custom error types for domain-specific errors
   - Updates item sync status to "error" with error details
   - Formats errors with context information
   - Implements retry mechanisms for transient failures

3. **Plaid API Level:**
   - Handles Plaid-specific error codes
   - Converts API errors to application-specific errors

## Data Model

### Transaction Data
- Includes standard Plaid transaction fields
- Adds additional metadata for sync tracking
- Uses encryption for sensitive financial data
- Maintains unique transaction IDs from Plaid
- Tracks sync version and batch information

### Sync State
Maintained on the item document with the following fields:
- `cursor`: The Plaid cursor for continuing syncs
- `status`: Current sync status ("in_progress", "complete", "error")
- `batchNumber`: Current batch number
- `syncVersion`: Timestamp-based version identifier for the sync
- `startedAt`: When the sync started
- `completedAt`: When the sync completed (if finished)
- `updatedAt`: Last update timestamp
- `lastSuccessfulCursor`: Last successful cursor (for recovery)
- `errorCode`/`errorMessage`: Error details (if in error state)

## Conclusion

The transaction sync architecture implements a robust, stateful process for synchronizing financial transaction data from Plaid. It handles the complexities of batch processing, error recovery, and data transformation in a modular, maintainable way.

The system efficiently processes large volumes of transaction data while maintaining proper error handling and state management, ensuring reliability and consistency in the financial data synchronization process. 