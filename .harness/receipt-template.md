# Receipt — <ID>: <title>

Date: YYYY-MM-DD · Status: done | blocked · Attempts: N · Verifier: ACCEPT | REJECT (n findings)

## Objective
<copied from the contract>

## Changed
- <area or file group> — <what changed> (commit <sha>)

## Verified
Every line cites its evidence. Nothing appears here that was not run on the final tree.

| Acceptance | Evidence | Result |
| --- | --- | --- |
| A1 <claim> | `.harness/last-verify.json` step `<name>` (fingerprint <short>) | pass |
| A2 <claim> | test `<name>` | pass |
| A3 <claim> | verifier report, finding none | pass |

## Not verified
- <what was not or could not be checked, and why> — or "Nothing: every acceptance line was checked."

## Decisions
- <decision> — see .harness/decisions.md D-NNN

## Risks
- <known risk or weak spot>

## Approval needed
- <push / deploy / migration to remote / dependency> — or "None."

## Harness notes
- <lessons recorded, harness changes proposed> — or "None."
