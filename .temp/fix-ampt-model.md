**Context**
- This plan targets `api/utils/amptModel` as a lightweight ODM layer over Ampt Data, with the goal of making behavior reliable and explicit rather than fully mirroring Mongoose.
- A core constraint from Ampt Data is that queries are label-scoped: one label index is queried per call (`getByLabel` / `get` with `label`), so true multi-field AND filtering is not native. Multi-criteria queries must use composite labels (concat keys) or app-side post-filtering.
- The highest-risk findings are correctness and data-safety issues: update paths that can bypass `set` transforms, silent dropping of extra labeled filter fields, `_id` object filter mismatches on dynamic collections, and inconsistent empty-result behavior.
- The phases below are ordered to reduce production risk first: define API contracts, fix P0/P1 behaviors, harden query/validation edges, remediate callsites, lock behavior with tests, then finalize docs/migration guidance.
- Completion criteria: no silent query ambiguity, setter/encryption behavior is consistent on create/update, callsites align with final contracts, and docs/tests reflect the real runtime model.

**Phase 1: API Contract Decisions**
1. [ ] Define `find(objectFilter)` contract: only one labeled field is queryable per Ampt call; multiple labeled fields are unsupported unless using a composite label.
2. [ ] Decide default behavior for multi-labeled filters: throw explicit error (recommended) vs optional `postFilter` mode.
3. [ ] Define update semantics: setters run on `update()` by default (recommended) and document any opt-out flag.
4. [ ] Define `_id` filter semantics: accept string `_id` directly and normalize `{ _id }` object filters.

**Phase 2: Core Correctness Fixes (P0/P1)**
1. [ ] Fix `update()` validation path so `set` handlers execute (prevents plaintext writes for encrypted fields).
2. [ ] Add multi-field filter guard: detect >1 labeled keys and throw a clear actionable error.
3. [ ] Add explicit composite-label guidance in error messages (e.g., “use `accountdate` concat label”).
4. [ ] Normalize `{ _id }` object filters to string `_id` before query path selection.
5. [ ] Change missing-string `find()` response from `{ items: [null] }` to `{ items: [] }`.
6. [ ] Fix `fetchRef()` fallback to return original value, not field name.
7. [ ] Fix dynamic model default `find()` filter generation for array collection configs.

**Phase 3: Query/Validation Hardening (P2)**
1. [ ] Fix label query value handling to safely coerce non-string values before operator checks.
2. [ ] Replace hard-coded Pacific offset ID time logic with deterministic UTC-safe generation.
3. [ ] Correct `Date` validation/coercion behavior (`instanceof Date`, strict vs non-strict paths).
4. [ ] Make rule execution respect explicit `false` flags (don’t run transform rules by key presence alone).
5. [ ] Rework/clarify uniqueness behavior: enforce labeled-unique precondition with better error and race-condition caveat.

**Phase 4: Callsite Remediation**
1. [ ] Update callsites using `update({ _id })` on dynamic models to pass `_id` string (or updated normalized API).
2. [ ] Fix malformed account query formatting in transaction query service.
3. [ ] Remove Mongo-style `modifiedCount` assumptions where `update()` returns a document.
4. [ ] Audit all `find/findAll/update/erase` callsites for multi-field object filter assumptions.
5. [ ] Fix schema mismatches where `unique: true` fields are not label-mapped (or remove unique).

**Phase 5: Test Coverage Expansion**
1. [ ] Add unit tests for all fixed regressions (setters on update, `_id` normalization, empty find results, ref fallback).
2. [ ] Add explicit tests for multi-field filter behavior (error path + allowed composite-label path).
3. [ ] Add tests for Date/type and transform-flag behavior.
4. [ ] Add deterministic tests for dynamic collection default querying.
5. [ ] Split integration tests into runtime-required vs mock-based; skip runtime-required tests when Ampt env is missing.

**Phase 6: Docs + Migration**
1. [ ] Update `/Users/isaacrobles/Documents/code/dad/api/utils/amptModel/AmptModel.md` to match actual supported query model (single-label query, composite-label strategy).
2. [ ] Add a “Mongoose differences” section (explicit non-goals and constraints).
3. [ ] Add migration notes for any breaking behavior changes (especially multi-field filter errors and update setter semantics).
4. [ ] Publish a short “query design guide” for label planning (single-field labels vs concat labels).
