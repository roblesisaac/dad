# Transaction Sync Service

## Overview

The Transaction Sync Service implements a robust, fault-tolerant system for synchronizing financial transaction data from Plaid to the application database. This document details the architecture, workflow, and implementation considerations.

............................................................................................

## Key Features

- **Idempotent Processing**: Safely handles multiple sync attempts without duplicating data
- **Recovery Mechanism**: Automatically detects and recovers from sync failures
- **Multi-batch Support**: Handles large transaction sets across multiple sync operations
- **Cursor Management**: Maintains sync state with Plaid's cursor-based pagination
- **Change Detection**: Optimizes performance by skipping processing when no changes exist
- **Detailed Error Tracking**: Captures transaction-level errors for auditing and resolution
- **Selective Reversion**: Ability to revert to any previous successful sync session

............................................................................................

## Technical Architecture

The transaction sync process follows this workflow:

### 1. Sync Initialization

- **User Validation**: Validates user credentials and permissions
- **Lock Acquisition**: Implements a soft lock mechanism on the Plaid item to prevent concurrent syncs
- **Session Retrieval**: Locates the most recent sync session for the item
- **Legacy Migration**: Detects and migrates legacy syncData stored directly on items to the new session-based model

### 2. Recovery Assessment

- **Failure Detection**: Identifies potential sync failures through:
  - Item error status flags
     - Previous sync session error status
  - Transaction count mismatches from previous sync
- **Recovery Process**:
  - Identifies the last successful sync session to revert to
  - Removes transactions with syncTime timestamps newer than the reference sync
  - Sets item status to "complete" to release the lock
  - Creates a recovery-specific sync session for audit tracking
  - Updates the item to reference the recovery sync session
  - Returns a specialized recovery response object
  - **Process Termination**: Ends current processing to allow next sync operation to use reset cursor

### 3. Change Detection Optimization

- **Transaction Fetching**: Retrieves latest transactions from Plaid using appropriate cursor
- **Change Analysis**: Determines if any transactions were added, modified, or removed
- **Fast Path**: If no changes detected:
  - Updates lastNoChangesTime timestamp
  - Releases item lock
  - Returns a no-changes response with previous sync metadata
  - Skips remaining processing steps for improved performance

### 4. Sync Session Management

- **Session Creation**: Establishes a new sync session with complete cursor tracking:
  - `cursor`: Current cursor value being used for this operation
  - `previousCursor`: Cursor value from previous sync operation
  - `nextCursor`: Next cursor value for future operations (populated after Plaid API response)
  - `prevSuccessfulCursor`: Last known good cursor value for recovery operations
- **Batch Tracking**: Tracks multi-batch syncs with sequence numbers
- **Status Management**: Sets initial status to "in_progress"
- **Transaction Boundaries**: Records the sync timestamp for transaction boundary tracking

### 5. Transaction Processing

- **Parallel Execution**: Processes transaction operations concurrently:
  - Creates new transactions with proper metadata (including syncTime for recovery)
  - Updates modified transactions with current cursor and syncTime
  - Removes deleted transactions while maintaining referential integrity
- **Error Handling**: Captures transaction-level errors:
  - Records failed transactions with detailed error information
  - Maintains references to the original transaction data that failed
  - Associates errors with specific operation types (add/modify/remove)
  - Surfaces error details in sync session for troubleshooting
- **Count Validation**: Maintains separate expected and actual count records for each operation type
- **Transactional Safety**: Ensures database consistency across bulk operations

### 6. Session Finalization

- **Status Update**: Sets session status based on processing results:
  - "complete" when successful and counts match
  - "error" when counts don't match or other errors occur
- **Error Storage**: Saves detailed operation errors in the session record:
  - Failed transaction IDs
  - Error types and messages
  - Original transaction data for retries
- **Cursor Management**: Updates session with next cursor value from Plaid
- **History Linking**: Creates a linked list of sync sessions for audit trailing
- **Success Recording**: Updates prevSuccessfulCursor when operation completes without errors

### 7. Item State Management

- **Conditional Updates**: Only updates item cursor if no errors occurred
- **Status Transitions**:
  - "error" if transaction counts don't match expected values
  - "complete" when sync operations conclude successfully
- **Lock Release**: Returns item to available state for future operations

### 8. Response Generation

- **Result Compilation**: Builds comprehensive response with operation counts and metadata
- **Error Information**: Includes detailed error information and failed transaction references
- **Validation Information**: Includes expected vs. actual counts for verification
- **Error Handling**: Incorporates error information for failed operations
- **Multi-batch Support**: Provides continuation data for multi-batch sync operations

## Frontend Integration

The frontend application interacts with the sync service through these mechanisms:

### 1. Connected Banks View

- **Bank Dashboard**: Displays all connected Plaid items (banks) with status indicators:
  - Color-coded status badges (active, error, needs authentication)
  - Last sync timestamp and result summary
  - Visual indicators for items with sync errors
- **Per-Bank Controls**: Action buttons for each bank:
  - Sync transactions button
  - View sync history button
  - Institution details
- **Bank Details Modal**: Expanded view for each bank showing:
  - Connected accounts summary
  - Sync session history sorted by recency
  - Ability to expand session details to view errors and metadata
  - Option to revert to a specific sync session

### 2. Sync Orchestration

- **Individual Bank Sync**: Process for syncing a single bank:
  - Handles multi-batch processing via the hasMore flag
  - Terminates sync process if errors are detected
  - Provides detailed progress feedback and error reporting
  - Updates UI in real-time with sync status
- **Error Visualization**: Displays sync errors in an accessible format:
  - Transaction-level error details
  - Summary of failed operations by type
  - Option to retry failed operations
- **Session Reversion**: Interface for reverting to previous sync sessions:
  - Confirmation dialog with session details
  - Clear indication of data impact (transactions to be removed)
  - Success/failure feedback after reversion

### 3. Recovery Handling

- **Detection Logic**: Identifies recovery responses through response payload structure
- **Recovery Tracking**: Maintains a counter of consecutive recovery operations per item
- **User Feedback**: Provides appropriate visual indicators during recovery operations
- **Session Navigation**: Allows users to browse historical sync sessions and their outcomes

### 4. Safety Mechanisms

- **Recovery Limits**: Enforces a maximum of 3 consecutive recovery attempts before requiring manual intervention
- **Error Escalation**: Surfaces persistent recovery failures to application administrators
- **Circuit Breaking**: Prevents excessive API calls during problematic sync states

## Data Models

The system uses these key data structures with specific semantics:

### Sync Session

- `cursor` (String): Current cursor value used in this sync session
- `previousCursor` (String): Cursor value from previous sync session
- `nextCursor` (String): Cursor value returned by Plaid for next operation
- `prevSuccessfulSession_id` (String): ID of last known good sync session for recovery
- `syncTime` (Number): Unix timestamp of sync operation start
- `batchNumber` (Number): Sequence number for multi-batch operations
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
- `error` (Object): Error information if sync failed
  - `code` (String): Error code
  - `message` (String): Error message
  - `timestamp` (String): Error timestamp
- `failedTransactions` (Object): Detailed information about transaction processing failures
  - `added` (Array): Failed add operations with transaction data and errors
  - `modified` (Array): Failed modify operations with transaction data and errors
  - `removed` (Array): Failed remove operations with transaction IDs and errors
- `recoveryAttempts` (Number): Number of recovery attempts
- `recoveryStatus` (String): Status of recovery operations
- `recoveryDetails` (Object): Details about recovery operations
  - `transactionsRemoved` (Number): Number of transactions removed during recovery
  - `previousBatchNumber` (Number): Batch number of the failed sync
  - `previousSyncId` (String): Sync ID of the failed sync
  - `recoveryTimestamp` (Number): Timestamp of recovery operation
- `lastNoChangesTime` (Number): Timestamp of last no-changes sync
- `isRecovery` (Boolean): Whether this session is a recovery session
- `isLegacy` (Boolean): Whether this session was migrated from legacy format

### Transaction Metadata

- `cursor` (String): Cursor value when transaction was created/modified
- `syncTime` (Number): Timestamp of sync operation that created/modified the transaction
- `itemId` (String): Associated Plaid item identifier
- `transaction_id` (String): Plaid's unique transaction identifier

## Testing Strategies

Comprehensive testing should cover these scenarios:

### 1. Normal Operation Path

- Verify complete transaction synchronization without errors
- Ensure proper cursor management across sync operations
- Validate transaction data integrity after sync

### 2. Multi-batch Processing

- Test with large transaction sets requiring multiple sync operations
- Verify batch number sequencing and continuation logic
- Ensure complete data capture across batch boundaries

### 3. Optimization Paths

- Test when Plaid returns no transaction changes
- Verify fast-path execution and performance optimization
- Validate lastNoChangesTime tracking

### 4. Data Migration

- Test migration of legacy syncData stored directly on item objects
- Verify creation of appropriate sync sessions during migration
- Validate cursor preservation during migration process

### 5. Recovery Scenarios

- Force count mismatches to trigger recovery mechanisms
- Verify two-phase recovery workflow:
  - First operation performs recovery and returns
  - Second operation resyncs with reset cursor
- Test full transaction recovery after intentional corruption

### 6. Error Handling

- Test transaction processing failures in each operation type (add/modify/remove)
- Validate error storage in sync session
- Verify frontend error visualization and reporting
- Test session reversion functionality from the UI

### 7. Edge Cases

- Test consecutive recovery attempts with limit enforcement
- Verify cursor tracking across complex failure scenarios
- Test concurrent sync attempts and lock mechanisms

## Operational Monitoring

Monitor these key metrics for system health:

### 1. System Health Indicators

- **Recovery Rate**: Percentage of sync operations requiring recovery
- **Sync Success Rate**: Percentage of syncs completing without errors
- **No Changes Rate**: Frequency of syncs resulting in no transaction changes

### 2. Performance Metrics

- **Sync Duration**: Time taken for complete sync process
- **Transaction Processing Rate**: Transactions processed per second
- **API Latency**: Response time for Plaid API requests

### 3. Data Quality Metrics

- **Transaction Counts**: Expected vs. actual counts for each operation type
- **Consecutive Recoveries**: Items requiring multiple recovery attempts
- **Orphaned Transactions**: Transactions without proper parent references
- **Error Frequency**: Rate of transaction processing errors by type

### 4. Resource Utilization

- **Database Operations**: Volume of database operations during sync
- **API Rate Limits**: Plaid API usage relative to rate limits
- **Memory Usage**: Memory consumption during large transaction syncs

## Implementation Notes

- Use database transactions when possible to ensure data consistency
- Implement appropriate timeout handling for long-running operations
- Consider rate limiting strategies for high-volume accounts
- Use exponential backoff for retrying failed operations
- Store detailed error information with failed transactions for diagnostics
- Implement reversion confirmation to prevent accidental data loss 