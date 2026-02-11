# Plaid Item Connection Flow

This document explains what happens in this codebase when a user connects a Plaid item, and exactly what data is persisted.

## Scope

This covers the current runtime flow for:

- Creating a Plaid Link token
- Exchanging the Plaid public token
- Saving the Plaid item
- Running the initial transaction sync after connect

## End-to-End Flow

1. Frontend starts Link
- `connectBank()` calls `POST /api/plaid/connect/link`.
- Backend creates a link token via Plaid `linkTokenCreate` (transactions product, US, English, with a hashed `client_user_id`).

2. User completes Plaid Link
- Plaid returns a `public_token` to the frontend `onSuccess` callback.

3. Backend exchanges token and upserts item
- Frontend sends `publicToken` to `POST /api/plaid/exchange/token`.
- Backend exchanges `public_token` -> `access_token` + `item_id`.
- Backend upserts a record in `plaiditems` using `item_id` and encrypted access token.

4. Frontend triggers initial transaction sync
- After exchange succeeds, frontend calls `GET /api/plaid/sync/latest/transactions/:itemId` in a loop until `hasMore === false`.
- Each call processes one Plaid `transactionsSync` batch.

5. Backend processes transaction batches
- Locks item status (`in_progress`), fetches Plaid changes with the latest cursor, then processes:
  - `added` -> insert transactions
  - `modified` -> update transactions
  - `removed` -> delete transactions
- Persists a sync session record for each batch.
- Updates item status to `complete` or `error`, and stores the latest successful sync session id on the item (`sync_id`).

## What Is Stored (By Collection)

### 1) `plaiditems`

Created/updated when token exchange succeeds.

Key fields:
- `userId`: internal user id (`req.user._id`)
- `itemId`: Plaid `item_id` (unique)
- `accessToken`: encrypted at rest (details below)
- `status`: sync state (`in_progress`, `complete`, `error`, etc.)
- `sync_id`: pointer to latest successful sync session
- `syncData`: legacy sync structure (still on schema; new flow uses `syncsession`)
- Optional later updates: `institutionName`, `institutionId`

Notes:
- `public_token` is not stored.
- API responses scrub `accessToken` before returning items.

### 2) `syncsession`

Written during transaction sync (one record per sync batch).

Key fields:
- `userId`, `item_id`, `itemId`
- `status`
- `cursor` (used for this batch), `nextCursor` (returned by Plaid)
- `hasMore`, `batchNumber`, `syncTime`, `syncId`
- `syncCounts.expected` vs `syncCounts.actual`
- `error` and `failedTransactions` when processing fails
- Recovery metadata (`isRecovery`, `recoveryAttempts`, etc.) when needed

This is the primary source of sync history and cursor progression in the current implementation.

### 3) `plaidtransactions`

Written/updated/deleted during sync batch processing.

Stored data includes:
- Plaid transaction identity and metadata (`transaction_id`, `account_id`, `date`, `merchant_name`, categories, location, etc.)
- App sync metadata (`userId`, `itemId`, `cursor`, `syncTime`)
- App customization fields (`notes`, `recategorizeAs`, `tags`)

Encryption at rest:
- `amount` is encrypted at rest and decrypted on read via model getters.

### 4) `plaidaccounts` and `plaidgroups` (not part of initial connect path)

These are populated by a separate endpoint: `GET /api/plaid/sync/accounts/and/groups`.

- `plaidaccounts`: account profile/balance data for each Plaid account
- `plaidgroups`: app-level account grouping records

So: connecting an item + initial transaction sync does **not** automatically populate groups/accounts unless that sync endpoint is called.

## How Sensitive Data Is Protected

### Access token encryption (`plaiditems.accessToken`)

Access token is protected in two layers:

1. Encrypt with user-specific symmetric key (`user.encryptedKey` from Auth0 metadata).
2. Encrypt the result again with app-level encryption key/iv (`CRYPT_KEY`, `CRYPT_IV`).

At read time, backend decrypts both layers before calling Plaid.

### Other encrypted fields

- `plaidtransactions.amount` is encrypted at rest.
- In `plaidaccounts`, sensitive balance/name fields are encrypted at rest and decrypted on read.

## Practical Summary

When a Plaid item is connected:
- We persist an encrypted Plaid access token + item id in `plaiditems`.
- We immediately run transaction sync, which writes `syncsession` history and upserts/deletes `plaidtransactions`.
- Accounts/groups are synced separately on demand.
