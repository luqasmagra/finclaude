# Fix Code Review

Executes pending code review fixes.

## Context

This command is designed for the workflow:

1. **Claude** → performs code review with Sonnet → generates findings in `code-review/README.md`

## Usage

```
/fix-review
```

## Flow

1. Read `code-review/README.md` and extract the findings table
2. Identify findings with status "⏸️ Pending" or "⏸️ Tech debt"
3. Group pending findings by category:
   - Bugs → 01-bugs.md
   - Dead code → 02-dead-code.md
   - Quality → 03-quality.md
   - TypeScript → 04-typescript.md
   - Performance → 05-performance.md
   - Security → 06-security.md
4. Launch one general subagent per category with pending findings
5. Update the README marking each finding as ✅ Resolved
6. Report the summary of changes

## Constraints

- Only resolves findings with status "⏸️ Pending" or "⏸️ Tech debt"
- Does not modify already resolved findings (✅ Resolved)
- Uses parallel subagents for categories
- At the end, run `npm run build` to verify everything compiles
- If there are no pending findings, report "No pending findings"

## Output format

When finished, report:

- How many findings were resolved
- By category
- Whether the build was successful
- If there are remaining pending findings (and which ones)
