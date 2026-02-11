## Problem
New users are not being redirected to the onboarding screen after logging in. This is likely because the check for existing groups/accounts in the dashboard initialization logic is incorrect for empty arrays.

## Plan
1.  Verify the return value of `fetchGroupsAndAccounts` in `useSelectGroup.js`.
2.  Update the condition in `useInit.js` to correctly handle empty arrays (e.g., check `.length`).
3.  Add proper redirection logic if the user has no connected accounts.

## Tasks
- [x] 1. Analyze `src/features/select-group/composables/useSelectGroup.js` to confirm return values.
- [x] 2. Update `src/features/dashboard/composables/useInit.js` to redirect to onboarding if groups/accounts are empty.
- [x] 3. Remove alert in `src/features/select-group/composables/useSelectGroup.js` to improve UX.
- [x] 4. Verify `src/features/onboarding/views/OnboardingView.vue` to ensure no redirect loops.
