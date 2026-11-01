# Row-level security

> Part of the PT Platform spec. Section numbers (§) are shared across all docs/ files; CLAUDE.md maps each § to its file.

## 6. Row-level security

Enable RLS on **every** table. Write helper SQL functions (`security definer`, `stable`):

- `is_admin()` — current user's role is admin.
- `is_trainer_of(client uuid)` — an active/paused `trainer_clients` row links `auth.uid()` (trainer) to that client.

Policies:

| Data | Trainer | Client | Anonymous |
| --- | --- | --- | --- |
| Trainer-owned rows (`trainer_id` column) | Full CRUD where `trainer_id = auth.uid()` | — | — |
| Client data (logs, metrics, photos, habits, nutrition logs, form responses) | Read all for their clients; write coach fields (e.g. `coach_reply`) | Read and write their own rows (`client_id = auth.uid()`) | — |
| Client notes and files | Full CRUD on own | No access | — |
| Programs and their children | Full CRUD on own | Read only programs assigned to them via an active assignment | — |
| Exercises | Read global + own; CRUD own | Read global + their trainer's | — |
| Messages | Read/write in their conversations | Read/write in their conversation | — |
| Published products, public trainer profile (via a `public_trainer_profiles` view) | — | Read | Read |
| Orders, payments, entitlements | Read own trainer's | Read own | — |
| Payment status changes, ledger, payouts | Read own ledger/payouts | — | — |

- Payment status writes, fulfilment, ledger entries and payouts are done **only** by server code using the admin client, or by `security definer` functions.
- Admin: `is_admin()` grants read on everything and write where the admin UI needs it.
- Storage buckets: `progress-photos` and `client-files` private (path prefix `trainer_id/client_id/...`, policies mirror the tables, served via signed URLs); `exercise-media`, `storefront` and `avatars` public-read, owner-write.
- **RLS tests:** with two trainers and two clients seeded, prove that trainer A cannot read or write trainer B's clients, programs, logs, orders; that a client cannot read another client's data or any coach notes; and that anonymous users can only see published storefront data.
