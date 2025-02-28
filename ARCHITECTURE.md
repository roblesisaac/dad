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