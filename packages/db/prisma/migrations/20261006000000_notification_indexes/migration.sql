-- Keep each five-minute notification run bounded to the small set of due bookings.
CREATE INDEX IF NOT EXISTS "bookings_day_reminder_due_idx"
ON "bookings" ("starts_at")
WHERE "status" = 'confirmed' AND "reminder_day_sent_at" IS NULL;

CREATE INDEX IF NOT EXISTS "bookings_short_reminder_due_idx"
ON "bookings" ("starts_at")
WHERE "status" = 'confirmed' AND "reminder_30m_sent_at" IS NULL;

CREATE INDEX IF NOT EXISTS "bookings_review_due_idx"
ON "bookings" ("ends_at")
WHERE "status" = 'completed' AND "review_requested_at" IS NULL;
