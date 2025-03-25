# Transaction Sync Service

## Overview

The Transaction Sync Service implements a robust, fault-tolerant system for synchronizing financial transaction data from Plaid to the application database.

## Key Features

- **Idempotent Processing**: Safely handles multiple sync attempts without duplicating data
- **Recovery Mechanism**: Automatically detects and recovers from sync failures
- **Cursor Management**: Maintains sync state with Plaid's cursor-based pagination
- **Change Detection**: Optimizes performance by skipping processing when no changes exist
- **Selective Reversion**: Ability to revert to any previous successful sync session
- **Duplicate Handling**: Identifies and tracks duplicate transactions

## Technical Architecture

The transaction sync process follows this workflow:

### 1. Sync Initialization

- **Get Sync Session From Item**: Locates the most recent sync session for the item
- **Create Initial Sync**: If no sync session exists, creates an initial one (using legacy data if available)
- **Recovery Assessment**: Determines if recovery operations are needed

### 2. Normal Flow (No Recovery Needed)

- **Fetch Data from Plaid**: Retrieves latest transactions using appropriate cursor
- **Update Session with Expected Counts**: Records the expected transaction counts from Plaid
- **Process Plaid Data**: Handles added, modified, and removed transactions
- **Update Session with Actual Counts**: Records the actual transaction counts processed
- **Counts Comparison**: Validates that expected and actual counts match
- **Create New Sync Session**: Creates a session with cursor set to next_cursor if counts match

### 3. Recovery Flow

- **Clone Session**: Creates a copy of the session with isRecovery flag set to true
- **Find Transactions**: Identifies transactions created after the referenced sync point
- **Update Recovery Session**: Sets count of transactions expected to be removed
- **Remove Transactions**: Deletes transactions created after the reference sync
- **Counts Comparison**: Validates that expected and actual counts match
- **Create New Sync Session**: When counts match, creates session with cursor for next sync

### 4. Recovery Failed Flow

- **Create New Recovery Session**: If counts don't match, creates a new recovery session with session data

## Data Models

### Sync Session

- `cursor` (String): Current cursor value used in this sync session
- `nextCursor` (String): Cursor value returned by Plaid for next operation
- `prevSession_id` (String): ID of the previous sync session in the chain
- `syncTime` (Number): Unix timestamp of sync operation start
- `status` (String): Current session status ("in_progress", "complete", "error", "recovery")
- `syncCounts` (Object): Transaction processing counts
  - `expected` (Object): Expected counts from Plaid API
    - `added` (Number): Expected number of added transactions
    - `modified` (Number): Expected number of modified transactions
    - `removed` (Number): Expected number of removed transactions
  - `actual` (Object): Actual counts processed
    - `added` (Number): Actual number of added transactions
    - `modified` (Number): Actual number of modified transactions
    - `removed` (Number): Actual number of removed transactions
- `isRecovery` (Boolean): Whether this session is a recovery session

### Transaction Metadata

- `cursor` (String): Cursor value when transaction was created/modified
- `syncTime` (Number): Timestamp of sync operation that created/modified the transaction
- `itemId` (String): Associated Plaid item identifier
- `transaction_id` (String): Plaid's unique transaction identifier

## Testing Strategies

### 1. Normal Operation Path

- Verify complete transaction synchronization without errors
- Ensure proper cursor management across sync operations

### 2. Recovery Scenarios

- Force count mismatches to trigger recovery mechanisms
- Verify recovery workflow:
  - First operation performs recovery with session cloning
  - Proper removal of transactions created after reference sync
  - Validation of counts after recovery

### 3. Error Handling

- Test transaction processing failures
- Verify count validation works properly
- Test session reversion functionality

## Implementation Notes

- Use database transactions to ensure data consistency
- Store proper metadata with each transaction for recovery support
- Implement session reversion with clear confirmation workflow
- Use unified recovery flow to eliminate code duplication 