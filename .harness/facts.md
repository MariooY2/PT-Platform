# Facts

Stable things that are true about this environment. Delete an entry when it stops being true.
Format: `- <fact> (source, date)`.

- The owner develops on Windows; hooks and scripts are Node so they need neither bash nor jq. (setup, 2026-11-01)
- Keep the project out of `C:\Program Files (x86)\`: it is write-protected and its parentheses break unquoted shell paths. Use something like `C:\dev\pt-platform`. (setup, 2026-11-01)
- Local Supabase requires Docker Desktop to be running. (setup, 2026-11-01)
- `create-next-app` refuses a non-empty folder; scaffold into `./_scaffold` and move files up. (setup, 2026-11-01)
- Whish has no public developer portal; endpoint details come from Whish's business team. Community SDKs (`whish-pay` on npm, `laravel-whish-pay`) list sandbox base `https://lb.sandbox.whish.money/itel-service/api` — unverified. (research, 2026-11-01)
- Whish's known API surface has no recurring billing or refund call; renewals are invoices. (research, 2026-11-01)
