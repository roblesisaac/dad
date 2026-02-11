# `apiAmptModel` Deep Study (`api/utils/amptModel`)

Last updated: 2026-02-09

## 1) Scope and Goal

This study analyzes the in-repo `apiAmptModel` implementation (the `AmptModel` factory in `api/utils/amptModel`) as an attempt to make Ampt Data usage feel closer to Mongoose models.

I reviewed:

- Core implementation:
  - `api/utils/amptModel/index.js`
  - `api/utils/amptModel/validate.js`
  - `api/utils/amptModel/labelsMap.js`
  - `api/utils/amptModel/errorCodes.js`
- Existing docs and tests:
  - `api/utils/amptModel/AmptModel.md`
  - `api/utils/amptModel/tests/*.test.js`
- Real app callsites and model definitions:
  - `api/models/*.js`
  - `api/services/plaid/*.js`
  - `api/controllers/*.js`
- External reference docs:
  - Ampt Data docs: <https://www.getampt.com/docs/data/>
  - Mongoose docs:
    - Models: <https://mongoosejs.com/docs/models.html>
    - Validation: <https://mongoosejs.com/docs/validation.html>
    - Middleware: <https://mongoosejs.com/docs/middleware.html>
    - Populate: <https://mongoosejs.com/docs/populate.html>

---

## 2) Executive Summary

`apiAmptModel` is a practical ODM-like layer that adds schema validation, labels, CRUD helpers, and dynamic collection partitioning on top of `@ampt/data`.

It succeeds at:

- reducing repetitive `data.get/data.set/data.getByLabel` boilerplate,
- centralizing data shape rules,
- supporting important query/index patterns via labels,
- providing a familiar model API (`save/find/findOne/update/erase`).

But it is not Mongoose-equivalent yet, and there are several correctness gaps:

- **Critical:** update flows can bypass setters (including encryption setters), which can lead to storing raw sensitive values.
- **Critical:** object filters use only the first labeled field; additional labeled fields are silently ignored.
- **Critical:** some update callsites use `{ _id }` object filters on dynamic collections and are incompatible with current filter semantics.
- **High:** docs and runtime behavior drift in several places (range queries, label object config requirements, default find behavior for dynamic collections).
- **High:** test coverage is strong for validator internals but weak for integration behavior under real Ampt runtime constraints.

---

## 3) What It Actually Implements

### 3.1 Model factory contract

`AmptModel(collectionNameConfig, schemaConfig, globalConfig)` returns:

- `save`
- `find`
- `findAll`
- `findOne`
- `update`
- `erase`
- `insertMany`
- `validate`
- `labelsMap`

Source: `api/utils/amptModel/index.js:288`.

### 3.2 Collection strategy

- Static collection: `'users'`
- Dynamic collection partitioning: `['plaidtransactions', 'userId']`

Dynamic `_id` construction format:

- `<collection>-<partitionValues>:<generatedId>`

Source: `api/utils/amptModel/index.js:60`, `api/utils/amptModel/index.js:74`.

### 3.3 Query/index strategy via labels

This design depends heavily on Ampt labels:

- Ampt Data queries by label key format: `collection:labelName_value`.
- Supports `>`, `>=`, `<`, `<=`, range pipes (`|`) per docs.

The abstraction maps schema `label1..label5` to label names and query construction.
Source: `api/utils/amptModel/labelsMap.js`.

### 3.4 Validator features

`validate.js` supports:

- type coercion/strict type checks
- required/default
- enum/min/max/minLength/maxLength
- `trim/lowercase/uppercase/proper`
- custom `validate`
- `set/get/computed`
- nested objects/arrays
- tracks `unique` fields and `ref` fields

Source: `api/utils/amptModel/validate.js`.

---

## 4) Mongoose-Likeness: Where It Matches vs Diverges

## 4.1 Similar feel

- Declarative schema objects with field-level constraints.
- Model-level statics (`find`, `findOne`, `save`, `update`, `erase`).
- Setters/getters/computed behavior roughly analogous to Mongoose transforms.
- Unique-like behavior by pre-checking before writes.

## 4.2 Major divergences

- No middleware lifecycle equivalent (`pre/post save/update/find`) like Mongoose middleware.
- No query builder chaining (`where`, `sort`, `select`, etc.) beyond Ampt options passthrough.
- No document instances or change tracking (`doc.save()` semantics).
- No transaction/session abstraction.
- No native atomic update operators (`$set`, `$inc`, etc.).
- Populate/reference behavior is very limited and only top-level.
- Unique is app-level duplicate check, not datastore-enforced indexing.

This is closer to a lightweight ODM utility than a Mongoose-like full ODM runtime.

---

## 5) Detailed Findings

Severity scale used:

- P0: security/data corruption likely
- P1: correctness/runtime breakage likely
- P2: reliability/performance/documentation risk

### 5.1 P0: `update()` bypasses setters in common cases (encryption risk)

Why:

- `update()` calls `validate({ ...existingItem, ...updates })` **without** action `'set'`
  - `api/utils/amptModel/index.js:213`
- `set` rule only runs when `config.action === 'set'`
  - `api/utils/amptModel/validate.js:230`

Impact:

- Fields with `set` only can be written raw on update.
- Example: `plaidItems.accessToken` setter encrypts token:
  - `api/models/plaidItems.js:27`
- Existing item path in `savePlaidAccessData()` uses `.update(...)`:
  - `api/services/plaid/itemService.js:143`

If this path runs for an existing item, access tokens can be persisted without setter transformation.

### 5.2 P1: Object filters only honor the first labeled key; rest are ignored

Why:

- `labelsMap.getArgumentsForGetByLabel()` calls `getFirstLabeledKeyAndValue(filter)` and returns immediately.
  - `api/utils/amptModel/labelsMap.js:86`
  - `api/utils/amptModel/labelsMap.js:159`

Impact:

- Multi-field object filters behave as single-label queries.
- Hard to notice because no warning/error.
- Example in transaction query service:
  - `formattedQuery` may include both `account_id` and `accountdate`
  - only first labeled key applies
  - `api/services/plaid/transactionsCrudService.js:33`

### 5.3 P1: Incompatible update filter usage with `{ _id }` objects on dynamic collections

Why:

- Dynamic model collection IDs require partition props in object filter context (e.g., `userId`) to build schema id.
- Update callsites use object filter with only `_id`.

Evidence:

- `transactionCustomizations.update({ _id: existingCustomization._id }, ...)`
  - `api/services/plaid/transactionCustomizationService.js:51`
- `transactionCustomizations` collection config is dynamic by `userId`
  - `api/models/transactionCustomizations.js:40`

This mismatches current `buildSchema_Id(filter)` requirements and can throw/filter incorrectly.

### 5.4 P1: `find` string miss returns `{ items: [null] }` instead of empty result

Why:

- For missing string filter result:
  - `return { items: [null] }`
  - `api/utils/amptModel/index.js:139`

Impact:

- Consumers expecting arrays of objects may break.
- `findAll()` can propagate `[null]` for misses.

### 5.5 P1: `fetchRef()` fallback returns field name, not original value

Why:

- Non-string ref branch returns `ref` (field name) instead of `refKey`/value.
  - `api/utils/amptModel/index.js:128`

Impact:

- Corrupts output for ref fields not stored as string IDs.

### 5.6 P1: Query formatting bug likely in transaction account filter

Why:

- `formattedQuery.account_id = \`${query.account_id}:${query.account_id}*\``
  - `api/services/plaid/transactionsCrudService.js:37`

Given label format and stored label values, this double-prefix value appears malformed and likely over-restrictive/wrong.

### 5.7 P2: Dynamic model `find()` default filter is malformed

Why:

- Default `filter = `${collectionNameConfig}:*``
  - `api/utils/amptModel/index.js:134`
- For array config, this stringifies to comma-joined array (e.g., `plaiditems,userId:*`), not a valid collection prefix.

### 5.8 P2: Date handling and ID timestamp strategy are fragile

Why:

- Hard-coded Pacific offset (`-7`) in ID generation:
  - `api/utils/amptModel/index.js:25`
- Not DST-aware and detached from environment timezone.

Impact:

- Non-deterministic, seasonally wrong timestamps in keys and ordering assumptions.

### 5.9 P2: Type handling has edge-case mismatches (notably `Date`)

Why:

- Type check compares `typeof` value to type name.
  - `api/utils/amptModel/validate.js:318`
- `typeof new Date()` is `object`, type name is `date`, mismatch.
- Non-strict fallback calls constructor function directly (`Date(value)`), which returns string representations.
  - `api/utils/amptModel/validate.js:252`

Impact:

- `Date` fields can coerce unexpectedly or silently become strings.

### 5.10 P2: Global/local rule presence triggers rule execution even if value is `false`

Why:

- Rule loop checks key existence, not truthy config value.
  - `api/utils/amptModel/validate.js:107`

Impact:

- `{ lowercase: false }` still applies lowercase if key exists.

### 5.11 P2: Unique checks are app-level race-prone and label-dependent

Why:

- Duplicate check is read-then-write (`findOne` then `set`), not atomic.
  - `api/utils/amptModel/index.js:95`

Also, unique requires corresponding label:

- Throws if unique field not labeled.
  - `api/utils/amptModel/index.js:96`

Observed model drift:

- `category.name` is unique but unlabeled:
  - `api/models/category.js:7`
- `coupon.code` is unique but unlabeled:
  - `api/models/coupon.js:4`

These models will throw when saving unique fields.

### 5.12 P2: Partial relation support is weaker than expected

Why:

- Ref resolution is top-level in `validateItems()`.
  - `api/utils/amptModel/index.js:241`
- Nested refs inside arrays/objects are not collected into the parent `refs` flow.

Impact:

- Inconsistent populate-like behavior versus expectations from Mongoose-style refs.

### 5.13 P2: Documentation drift from implementation

Examples:

- `AmptModel.md` shows label object example without `name`, but implementation requires resolvable label name; object without `name` degrades to object-key coercion behavior.
  - docs: `api/utils/amptModel/AmptModel.md:109`
  - code: `api/utils/amptModel/labelsMap.js:113`
- Query examples imply broader range ergonomics; implementation appends wildcard for most non-comparison values and only handles first labeled field.

---

## 6) Runtime Usage Audit (How the App Uses It Today)

### 6.1 Mostly good patterns

- Dynamic collection partitioning by `userId` is used consistently in Plaid models:
  - `api/models/plaidItems.js`
  - `api/models/plaidAccounts.js`
  - `api/models/plaidTransactions.js`
  - `api/models/syncSession.js`
- Most `find` calls destructure `{ items }`, matching return shape.

### 6.2 Mongoose-assumption leakage

- Update result is treated like Mongo update metadata in some services:
  - checks `modifiedCount` after `.update(...)`
  - `api/services/plaid/itemService.js:112`
  - `api/services/plaid/itemService.js:238`

But `AmptModel.update()` returns the updated document, not update stats.

### 6.3 Known stale/broken areas outside core

- `api/models/index.js` imports `./users`, but there is no `api/models/users.js`.
  - `api/models/index.js:1`
- `api/models/tests/users.test.js` appears stale and currently not aligned with repo state.

---

## 7) Test Reality

Executed on 2026-02-09:

- `npx vitest run api/utils/amptModel/tests/validate.test.js`
  - pass: 64/64
- `npx vitest run api/utils/amptModel/tests/labels.test.js`
  - pass: 5/5
- `npx vitest run api/utils/amptModel/tests/amptModel.test.js`
  - fail: 14/19 in this environment due missing Ampt region/runtime config (`Region is missing`)

Interpretation:

- Validator and label utility logic is strongly unit-tested.
- Data-integration behavior is under-tested in isolated local runs unless the Ampt runtime context is present.
- Several commented-out label tests suggest previously intended coverage is currently disabled.
  - `api/utils/amptModel/tests/labels.test.js`

---

## 8) Fit Against Ampt Data Constraints

From Ampt Data docs:

- Queries are key/label-centric.
- Label format and operator/range syntax are specific.
- Data writes are merge-like (`set` semantics).

`apiAmptModel` is directionally aligned with this model and correctly embraces labels as first-class query strategy.

Where it overreaches:

- It attempts Mongoose-like ergonomics while underlying backend semantics are label-indexed and key-pattern-oriented.
- Without explicit “single label per query” constraints and better filter API design, it creates ambiguous behavior that feels Mongo-like but executes differently.

---

## 9) Recommendations (Prioritized)

## 9.1 Immediate (P0/P1 hardening)

1. Fix update setter behavior:
   - In `update()`, validate with action `'set'` for changed fields, or add explicit option `runSettersOnUpdate`.
   - Prevent plaintext writes for sensitive fields.
2. Make filter behavior explicit:
   - If object filter has multiple labeled keys, either:
     - throw clear error, or
     - support deterministic multi-label strategy.
3. Support `_id` object filters safely or reject with clear error:
   - normalize `{ _id }` to string path early.
4. Fix `fetchRef()` fallback (`return refKey` instead of `ref`).
5. Return empty arrays for misses (`[]`, not `[null]`).

## 9.2 Near term (API correctness)

1. Fix malformed account query formatter in `transactionsCrudService`.
2. Fix dynamic default `find()` filter generation for array collection configs.
3. Harden `createLabelValue()` for non-string values (coerce before `.includes`).
4. Clarify/normalize date type strategy (do not rely on `typeof` for `Date`).

## 9.3 Medium term (Mongoose-style clarity)

1. Decide explicit compatibility target:
   - “Mongoose-inspired helper” vs “Mongoose-like ODM”.
2. If ODM target:
   - add middleware hooks (`beforeSave`, `afterSave`, etc.),
   - provide update metadata options,
   - add stricter query API with validation.
3. Update docs to match real behavior and constraints exactly.
4. Add integration tests with mocked/stubbed `@ampt/data` or documented Ampt sandbox test setup.

---

## 10) Bottom Line

`apiAmptModel` is a solid foundation and already useful in production paths, but right now it is best characterized as:

- a **lightweight Ampt Data model helper** with schema and label utilities,
- **not yet a safe Mongoose-analog** without caveats.

The highest-value next work is not adding features first; it is tightening correctness around update/setter behavior, filter semantics, and documentation/runtime consistency.

