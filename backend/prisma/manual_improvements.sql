-- Add PAUSED to ticket status enum
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'PAUSED' AFTER 'WAITING_REPLY';

-- Per-user ticket archives
CREATE TABLE IF NOT EXISTS "ticket_archives" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "ticket_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_archives_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ticket_archives_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE,
  CONSTRAINT "ticket_archives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "ticket_archives_ticket_id_user_id_key" UNIQUE ("ticket_id", "user_id")
);

-- Pause reasons (admin-configurable)
CREATE TABLE IF NOT EXISTS "pause_reasons" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "label" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pause_reasons_pkey" PRIMARY KEY ("id")
);

-- Seed default pause reasons
INSERT INTO "pause_reasons" ("id", "label", "sort_order")
VALUES
  (gen_random_uuid()::text, 'Waiting for client information', 1),
  (gen_random_uuid()::text, 'Waiting for third-party response', 2),
  (gen_random_uuid()::text, 'Pending internal approval', 3),
  (gen_random_uuid()::text, 'On hold by management', 4),
  (gen_random_uuid()::text, 'Scheduled for later', 5),
  (gen_random_uuid()::text, 'Other', 6)
ON CONFLICT DO NOTHING;
