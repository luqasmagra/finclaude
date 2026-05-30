---
name: check-logs
description: Shows the latest Edge Function logs for the finanzas project. Usage: /check-logs
---

Fetch the latest Edge Function logs using mcp__supabase__get_logs with service "edge-function" on project aqkymmcfktldheqgckja.

Display results as a table with columns: function, timestamp, method, status, execution_time_ms.
If there are errors (status >= 400), highlight them and show the event_message.
