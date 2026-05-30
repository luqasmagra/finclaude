---
name: model-updater
description: Audits Edge Functions for outdated Claude model IDs and reports what needs to change.
---

Check all files in supabase/functions/ for Claude model ID strings (format: claude-*).

Current reference models:
- Haiku: claude-haiku-4-5-20251001
- Sonnet: claude-sonnet-4-6
- Opus: claude-opus-4-8

For each model ID found, report:
- File and line
- Current value
- Status: OK / OUTDATED / DEPRECATED
- Recommended value (if applicable)

Group findings by severity: DEPRECATED → OUTDATED → OK.
