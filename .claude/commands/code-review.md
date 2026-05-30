# Code Review

Perform a comprehensive project review looking for:

## 1. Dead Code

- Unused components, functions, variables, and imports
- Deployed Edge Functions not used from the frontend
- Unused Tailwind styles or unreferenced custom CSS
- Commented-out code
- Legacy files (e.g., `index.html` in root)

## 2. Quality and Simplification

- Duplicated logic that can be extracted into hooks or utils
- Components that are too long (>200 lines) and should be split
- Functions that are too long (>50 lines) and should be split
- Inconsistent or missing error handling
- Magic strings/numbers that should be constants
- Excessive props drilling that can be resolved with Context
- Inconsistent state management

## 3. Security

- Sensitive data exposed in frontend (API keys, tokens)
- Unsanitized inputs
- `dangerouslySetInnerHTML` without validation
- Overly permissive CORS in Edge Functions for production

## 4. Performance

- Unnecessary DB calls or calls that can be combined
- Unnecessary re-renders (missing React.memo, useMemo, useCallback)
- Fetches without loading states or error handling
- Unoptimized images
- Excessive bundle size (unnecessary imports)

## 5. TypeScript

- `any` types that should be specific
- Missing interfaces or types
- Unnecessary type assertions (`as`)
- Props without explicit types

## Output Format

For each issue found:

- **File and line** where it is
- **What the problem is**
- **How to fix it** (with code if applicable)

Prioritize by impact: critical > important > suggestion.
