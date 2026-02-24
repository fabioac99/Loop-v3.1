-- Canned Responses
CREATE TABLE IF NOT EXISTS "canned_responses" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT,
  "shortcut" TEXT,
  "department_id" TEXT,
  "created_by_id" TEXT NOT NULL,
  "is_global" BOOLEAN NOT NULL DEFAULT false,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "canned_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "canned_responses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL,
  CONSTRAINT "canned_responses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Time Entries
CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "ticket_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "minutes" INTEGER NOT NULL,
  "description" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "time_entries_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE,
  CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "time_entries_ticket_id_idx" ON "time_entries" ("ticket_id");
CREATE INDEX IF NOT EXISTS "time_entries_user_id_idx" ON "time_entries" ("user_id");
CREATE INDEX IF NOT EXISTS "canned_responses_department_id_idx" ON "canned_responses" ("department_id");
