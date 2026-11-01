# Data model

> Part of the PT Platform spec. Section numbers (§) are shared across all docs/ files; CLAUDE.md maps each § to its file.

## 5. Data model

Columns listed are the important ones; add sensible indexes (every FK, plus the lookups noted).

### Accounts
- **profiles**: `id` (= `auth.users.id`), `role`, `full_name`, `phone`, `avatar_path`, `unit_system` (`metric`|`imperial`), `timezone` default `'Asia/Beirut'`.
- **trainers**: `id` (= profiles.id), `slug` unique, `business_name`, `bio`, `certifications text[]`, `brand_color`, `logo_path`, `instagram_handle`, `default_currency`, `plan` (`free`|`pro`|`elite`), `storefront_published bool`, `payout_whish_phone`.
- **trainer_clients**: `trainer_id`, `client_id` (null until invite accepted), `invite_email`, `invite_token` unique, `status` (`lead`|`invited`|`active`|`paused`|`archived`), `source` (`invite`|`purchase`|`import`), `start_date`, `goals`, `injuries_notes`, `tags text[]`. Unique (`trainer_id`, `client_id`).
- **client_notes**: `trainer_id`, `client_id`, `body`. Trainer-only.
- **client_files**: `trainer_id`, `client_id`, `storage_path`, `file_name`. Trainer-only.

### Forms (intake and check-ins)
- **forms**: `trainer_id`, `kind` (`intake`|`checkin`), `title`, `questions jsonb` — array of `{ id, type: 'text'|'long_text'|'number'|'scale'|'choice'|'yes_no'|'photo'|'weight', label, required, options? }`, `is_default bool`.
- **checkin_schedules**: `trainer_id`, `client_id`, `form_id`, `weekday` (0–6), `active`.
- **form_responses**: `form_id`, `trainer_id`, `client_id`, `due_date`, `answers jsonb`, `submitted_at`, `coach_reply`, `reviewed_at`.

### Training
- **exercises**: `trainer_id` (null = global library), `name`, `primary_muscle`, `secondary_muscles text[]`, `equipment`, `category` (`strength`|`cardio`|`mobility`|`plyometric`|`other`), `video_url`, `instructions`, `is_archived`.
- **programs**: `trainer_id`, `title`, `description`, `weeks int`, `is_template bool`, `client_id` (set on a client's personal copy), `source_program_id` (template it was copied from), `status` (`draft`|`published`).
- **program_workouts**: `program_id`, `week`, `day`, `title`, `notes`, `position`.
- **workout_exercises**: `program_workout_id`, `exercise_id`, `position`, `group_label` (e.g. `A1`, `A2` for supersets), `rest_seconds`, `tempo`, `notes`.
- **prescribed_sets**: `workout_exercise_id`, `set_number`, `set_type` (`warmup`|`working`|`drop`|`amrap`), `reps_min`, `reps_max`, `weight_kg`, `percent_1rm`, `rpe`, `rir`, `duration_sec`, `distance_m`.
- **program_assignments**: `trainer_id`, `client_id`, `program_id` (the client's copy), `start_date`, `status` (`active`|`completed`|`cancelled`), `entitlement_id` (if bought).
- Assigning a template **deep-copies** it into a client-specific program so per-client edits never touch the template.

### Logging and progress
- **workout_logs**: `trainer_id`, `client_id`, `assignment_id`, `program_workout_id`, `scheduled_date`, `started_at`, `completed_at`, `status` (`in_progress`|`completed`|`partial`|`skipped`), `session_rpe`, `client_notes`, `client_generated_id uuid unique` (offline idempotency).
- **set_logs**: `workout_log_id`, `workout_exercise_id`, `exercise_id`, `set_number`, `reps`, `weight_kg`, `rpe`, `duration_sec`, `distance_m`, `completed bool`, `client_generated_id uuid unique`.
- **personal_records**: `client_id`, `exercise_id`, `type` (`max_weight`|`e1rm`|`max_reps`), `value`, `set_log_id`, `achieved_at`. Maintained by a trigger or server code on set log insert. e1RM uses the Epley formula.
- **body_metrics**: `trainer_id`, `client_id`, `measured_on date`, `weight_kg`, `body_fat_pct`, `waist_cm`, `hips_cm`, `chest_cm`, `arm_cm`, `thigh_cm`, `notes`.
- **progress_photos**: `trainer_id`, `client_id`, `taken_on`, `pose` (`front`|`side`|`back`), `storage_path`, `public_consent bool default false`.
- **habits**: `trainer_id`, `client_id`, `name`, `target_value`, `unit`, `active`. **habit_logs**: `habit_id`, `client_id`, `log_date`, `value`; unique (`habit_id`, `log_date`).
- **nutrition_targets**: `trainer_id`, `client_id`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `effective_from`.
- **nutrition_logs**: `trainer_id`, `client_id`, `log_date`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `notes`; unique (`client_id`, `log_date`).

### Messaging
- **conversations**: `trainer_id`, `client_id`, `last_message_at`; unique (`trainer_id`, `client_id`).
- **messages**: `conversation_id`, `sender_id`, `body`, `attachment_path`, `attachment_type` (`image`|`audio`|`file`), `read_at`. Realtime enabled.

### Commerce and payments
- **products**: `trainer_id`, `type` (`program`|`coaching`|`session_pack`), `title`, `slug`, `description`, `cover_path`, `price`, `currency`, `billing_interval` (`one_time`|`month`), `program_id` (template copied on purchase), `sessions_count`, `includes_chat`, `includes_checkins`, `is_published`. Unique (`trainer_id`, `slug`).
- **coupons**: `trainer_id`, `code`, `percent_off` or `amount_off`, `max_redemptions`, `redeemed_count`, `expires_at`, `product_ids uuid[]`. Unique (`trainer_id`, `code`).
- **orders**: `trainer_id`, `buyer_id`, `product_id`, `coupon_id`, `kind` (`purchase`|`renewal`), `invoice_id`, `subtotal`, `discount`, `total`, `currency`, `status` (`pending`|`paid`|`failed`|`cancelled`|`refunded`|`needs_review`), `payment_method` (`whish`|`manual`), `paid_at`.
- **payments**: `order_id`, `provider` (`whish`|`mock`|`manual`), `external_id bigint unique`, `collect_url`, `amount`, `currency`, `status` (`created`|`pending`|`success`|`failed`), `provider_fee`, `verified_at`, `manual_method` (`cash`|`whish_transfer`|`omt`|`bank`|`other`), `manual_note`, `recorded_by`.
- **payment_events**: `payment_id`, `type` (`create_request`|`create_response`|`callback_success`|`callback_failure`|`status_check`|`reconcile`|`error`), `payload jsonb`. Append-only.
- **entitlements**: `trainer_id`, `client_id`, `product_id`, `order_id`, `type`, `starts_at`, `ends_at`, `status` (`active`|`expired`|`revoked`), `sessions_remaining`.
- **coaching_subscriptions**: `trainer_id`, `client_id`, `product_id`, `price`, `currency`, `current_period_start`, `current_period_end`, `status` (`active`|`past_due`|`paused`|`cancelled`), `grace_days int default 3`.
- **invoices**: `trainer_id`, `client_id`, `coaching_subscription_id`, `amount`, `currency`, `due_date`, `status` (`open`|`paid`|`void`).
- **ledger_entries** (money owed to trainers when the platform is the merchant): `trainer_id`, `order_id`, `payout_id`, `type` (`sale`|`platform_fee`|`provider_fee`|`refund`|`payout`), `amount` (signed), `currency`. A trainer's balance = sum of their entries per currency.
- **payouts**: `trainer_id`, `amount`, `currency`, `method`, `reference`, `status` (`pending`|`sent`), `sent_at`, `created_by`.
- **platform_settings**: single row: `commission_percent_by_plan jsonb`, `default_grace_days`.

### In-person (Phase 3)
- Session packs are `entitlements` with `sessions_remaining`.
- **sessions**: `trainer_id`, `client_id`, `entitlement_id`, `scheduled_at`, `status` (`scheduled`|`attended`|`no_show`|`cancelled`), `notes`. `attended` (and optionally `no_show`) decrements `sessions_remaining`.

### Notifications (Phase 3)
- **notifications**: `user_id`, `type`, `payload jsonb`, `read_at`.
- **push_subscriptions**: `user_id`, `endpoint`, `keys jsonb`.
