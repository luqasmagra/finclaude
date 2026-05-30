# Fix Code Review Skill

Executes pending fixes from a code review.

## When to use

When the user wants to resolve pending findings from a code review after the analysis has been generated.

## Usage

```
fix-review
```

Or simply:

```
Resolve the pending code review findings
```

## Flow

1. Read `code-review/README.md` and extract the findings table
2. Identify findings with status "⏸️ Pending" or "⏸️ Tech debt"
3. Group by category
4. Launch parallel general subagents per category
5. Update the README marking each finding as ✅ Resolved
6. Run `npm run build` to verify

## Constraints

- Only resolves pending findings
- Does not modify already resolved ones
- Uses parallel subagents
- Reports summary at the end
