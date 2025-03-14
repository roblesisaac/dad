# Transaction Sync Service

## Overview

This document describes the implementation of the Plaid transaction sync services.

## Architecture

The transaction sync process follows this updated workflow:

1. **Sync Initialization**
   - Validate user data
   - Acquire sync lock on Plaid item
   - Find most recent sync session for the item

2. **Recovery Assessment & Processing**
   - Determine if recovery is needed based on:
     - Item error status
     - Previous sync session error status
     - Count mismatch in previous sync
   - If recovery is needed:
     - Remove transactions with syncTime equal to or newer than the problematic sync
     - Update item with previous successful cursor and set status to "complete"
     - Create a recovery sync session
     - Return a recovery-specific response to the client
     - **END PROCESSING** - Next sync will use reset cursor from recovery sync session

3. **Transaction Fetching** (if no recovery needed)
   - Fetch latest transactions from Plaid using current cursor
   - Check for changes (any added, modified, or removed transactions)
   - If no changes, update lastNoChangesTime and return early

4. **Sync Session Creation**
   - Create a new sync session with proper cursor tracking:
     - `cursor`: Current cursor being used
     - `previousCursor`: Previous cursor value (if any)
     - `nextCursor`: Will be set after processing
     - `prevSuccessfulCursor`: Last known stable cursor point
   - Set status to "in_progress"

5. **Transaction Processing**
   - Process transactions in parallel:
     - Add new transactions (with syncTime for potential future recovery)
     - Update modified transactions
     - Remove deleted transactions
   - Track expected vs actual counts for validation

6. **Sync Session Update**
   - Update sync session with processing results
   - Set status to "complete" if successful (no errors and counts match)
   - Set status to "error" if counts don't match
   - Update prevSuccessfulCursor if sync was successful
   - Update nextCursor to the cursor returned by Plaid
   - Link to previous sync session

7. **Item Update**
   - Only update item with new cursor if no errors
   - Set status based on processing resultsp
   - Release the sync lock

8. **Post-processing**
   - Build and return response with sync results
   - Handle any errors during the process

## Frontend Integration

The frontend integration has been enhanced to handle the new recovery workflow:

1. **Recovery Detection**
   - Frontend code detects when a sync returns a recovery response
   - Tracks consecutive recoveries per item
   - Provides visual feedback when recovery is performed

2. **Recovery Limit Enforcement**
   - After 3 consecutive recoveries for the same item, an error is thrown
   - This prevents infinite recovery loops
   - Requires manual intervention for persistent issues

3. **Sync Continuation**
   - After recovery, a new sync operation is automatically initiated
   - This ensures transactions removed during recovery are properly re-synced

## Data Structure

The implementation leverages existing fields with these semantics:

- `cursor`: The cursor value used in this sync session
- `previousCursor`: The cursor used in the previous sync session
- `nextCursor`: The next_cursor returned from plaid to use in the next sync session
- `prevSuccessfulCursor`: The last known successful sync
- `syncTime`: Timestamp for recovery operations and ordering sessions
- `recoveryAttempts`: Number of recovery attempts
- `recoveryStatus`: Status of the last recovery attempt

## Testing Considerations

When testing the implementation, consider the following scenarios:

1. **Normal Sync**: Verify that transactions are synced correctly without errors
2. **Multi-batch Sync**: Test with large transaction sets that require multiple batches
3. **Recovery**: Force a count mismatch and verify the two-phase recovery works:
   - First operation should perform recovery and return
   - Second operation should sync with the reset cursor
4. **Consecutive Recoveries**: Verify that after 3 consecutive recoveries, an error is thrown
5. **Cursor Tracking**: Verify that all cursor values are properly tracked and updated

## Monitoring

Monitor these metrics:

1. **Recovery Rate**: How often recovery is needed
2. **Sync Success Rate**: Percentage of syncs completing without errors
3. **Transaction Counts**: Expected vs. actual counts for added/modified/removed transactions
4. **Sync Duration**: Time taken for complete sync process
5. **Consecutive Recoveries**: Track items requiring multiple consecutive recoveries 