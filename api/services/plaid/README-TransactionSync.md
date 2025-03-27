# Transaction Sync Service

## Overview

The Transaction Sync Service implements a robust, fault-tolerant system for synchronizing financial transaction data from Plaid to the application database. It uses a sync session model to track progress and ensure data integrity.

## Key Features

- **Idempotent Processing**: Safely handles multiple sync attempts without duplicating data (via duplicate checks).
- **Recovery Mechanism**: Automatically detects sync failures (via count mismatches) and initiates a recovery process.
- **Cursor Management**: Maintains sync state with Plaid's cursor-based pagination via `syncSession` records.
- **Change Detection**: Optimizes performance by skipping processing when Plaid reports no transaction changes.
- **Item Locking**: Prevents concurrent sync operations on the same item using the item's `status` field.
- **Duplicate Handling**: Identifies and tracks duplicate transactions during the 'add' phase.
- **Legacy Migration**: Supports migrating from older item-based sync data to the new `syncSession` model.

## Technical Architecture

The transaction sync process follows this workflow:

### 1. Sync Initialization

- **Acquire Lock**: Sets the Plaid Item's `status` to `in_progress` to prevent concurrent syncs.
- **Get Current Sync Session**: Locates the current `syncSession` record using the `sync_id` stored on the Plaid Item.
- **Create Initial Session**: If no `syncSession` exists (or `sync_id` is missing), creates an initial one. Attempts to migrate legacy sync data from the item if present.
- **Recovery Assessment**: Checks if the current session's `isRecovery` flag is true, or if the `syncCounts` (expected vs. actual) from the *previous* operation (stored in the current session) do not match.

### 2. Normal Flow (No Recovery Needed)

- **Fetch Data from Plaid**: Retrieves latest transactions using the `cursor` from the current `syncSession`.
- **Check for Changes**: If Plaid reports no added, modified, or removed transactions:
    - Update the current session's `lastNoChangesTime`.
    - Set the current session `status` to `complete`.
    - Unlock the item (set item `status` to `complete`).
    - Return early.
- **Update Session with Expected Counts**: Records the transaction counts reported by Plaid (`added`, `modified`, `removed`) into the current session's `syncCounts.expected`.
- **Process Plaid Data**: Uses `transactionsCrudService` to save added, update modified, and delete removed transactions in the database. Records the `cursor` and `syncTime` on affected transactions.
- **Update Session with Actual Counts**: Records the actual counts of successfully processed transactions into the current session's `syncCounts.actual`. Handles skipped duplicates separately.

### 3. Recovery Flow (Recovery Needed)

- **Create Recovery Session**: If the current session isn't already marked `isRecovery`, creates a *new* `syncSession` record based on the failed session, marking it `isRecovery: true` and linking it via `recoverySession_id`. Updates the item's `sync_id` to point to this new recovery session.
- **Perform Reversion**: Calls `recoveryService.performReversion` which:
    - Finds and removes transactions added by sync operations *after* the point the recovery session is based on (using `syncTime`).
    - Updates the recovery session's `syncCounts` (expected and actual removed).
    - Calls the Resolution Phase logic using the recovery session.
- **Unlock Item**: Sets the Plaid Item's `status` based on the resolution outcome (`complete` or `error`).
- **Return Recovery Response**: Provides details about the recovery attempt.

### 4. Resolution Phase (Shared by Normal and Recovery Flows)

*(This logic resides primarily within `syncSessionService.resolveSession`)*

- **Counts Comparison**: Validates if `syncCounts.expected` matches `syncCounts.actual` in the session being resolved (either the normal session or the recovery session).
- **On Success (Counts Match)**:
    - Creates a *new* `syncSession` record to represent the state *for the next sync*, using the `nextCursor` provided by Plaid.
    - Updates the *current* session: sets `status` to `complete`, links `nextSession_id` to the new session.
    - Updates the Plaid Item: sets `sync_id` to the *new* session's ID, sets `status` to `complete`.
- **On Failure (Counts Mismatch)**:
    - Creates a *new* `syncSession` marked `isRecovery: true`, based on the *current* (failed) session.
    - Updates the Plaid Item: sets `sync_id` to the *new recovery* session's ID, sets `status` to `in_progress` (ready for the next attempt which will trigger the Recovery Flow).
    - Updates the *current* (failed) session to link `nextSession_id` to the new recovery session.

### 5. Finalization (Both Flows)

- **Unlock Item**: Ensures the item's `status` is updated (typically `complete` on success/no-changes, `error` on unhandled exception, or left `in_progress` if resolution triggers recovery).
- **Return Response**: Builds and returns a response object detailing the sync results (counts, cursors, status, recovery info if applicable).

## Data Models

### Sync Session (`syncSession.js`)

- `userId` (String): ID of the user owning the session.
- `itemId` (String): Plaid Item ID.
- `cursor` (String): Cursor value *used* for the Plaid `/transactions/sync` call associated with this session's *creation* (or empty for initial sync).
- `nextCursor` (String): Cursor value returned by Plaid *after* processing this batch, to be used for the *next* sync. Stored when the session status becomes `complete`.
- `prevSession_id` (String): ID of the previous sync session in the chain.
- `nextSession_id` (String): ID of the next sync session created after this one completes or fails.
- `prevSuccessfulSession_id` (String): ID of the most recent successfully completed session before this one.
- `recoverySession_id` (String): If this is a recovery session, the ID of the session it's attempting to recover from.
- `syncTime` (Number): Unix timestamp when the sync operation *related to this session's data processing* started.
- `status` (String): Current session status (`in_progress`, `complete`, `error`). Note: Recovery state is tracked by `isRecovery`.
- `syncCounts` (Object): Transaction processing counts.
    - `expected` (Object): Counts reported by Plaid (`added`, `modified`, `removed`).
    - `actual` (Object): Counts successfully processed by the application (`added`, `modified`, `removed`).
- `isRecovery` (Boolean): True if this session represents a recovery attempt.
- `failedTransactions` (Object): Stores details of transactions that failed processing within this session's batch.
- `startTimestamp`, `endTimestamp`, `syncDuration`: Timestamps for performance monitoring.
- `transactionsSkipped` (Array): List of transactions skipped (e.g., duplicates).
- `plaidRequestId` (String): Plaid API request ID for traceability.
- `lastNoChangesTime` (Number): Timestamp if this session concluded a sync where Plaid reported no changes.

### Plaid Item (`plaidItems.js`)

- `itemId` (String): Plaid Item ID.
- `userId` (String): User ID.
- `accessToken` (String): Encrypted Plaid access token.
- `sync_id` (String): ID of the *current* or *most recent* `syncSession` associated with this item. Used as the entry point for the sync process.
- `status` (String): Overall status of the item, also used for locking (`in_progress`, `complete`, `error`, `queued`, '').
- `syncTag` (String): A tag potentially used for grouping or identification.
- `institutionId`, `institutionName`: Details about the linked financial institution.
- `syncData`: Legacy field, potentially still used or partially migrated.

### Transaction Metadata (Stored on Transaction Records)

- `cursor` (String): *Deprecated/Potentially Inaccurate*. The `syncSession`'s `syncTime` is the primary link.
- `syncTime` (Number): Timestamp of the sync operation (`syncSession.syncTime`) that created/modified the transaction. Used for recovery/reversion.
- `itemId` (String): Associated Plaid item identifier.
- `transaction_id` (String): Plaid's unique transaction identifier (used for matching updates/removals).

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

- Use database transactions (if supported by the underlying DB model like AmptModel) for atomicity when processing batches, although the current code processes adds/modifies/removes in separate batches.
- Ensure `syncTime` is accurately recorded on transactions for reliable recovery.
- Item locking via the `status` field is critical to prevent race conditions.
- The `resolveSession` logic is key to maintaining the integrity of the sync chain.