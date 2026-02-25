-- Report Configuration
CREATE TABLE IF NOT EXISTS "report_configs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "report_type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "delivery_email" BOOLEAN NOT NULL DEFAULT false,
  "delivery_app" BOOLEAN NOT NULL DEFAULT true,
  "schedule" TEXT,
  "recipients" TEXT[] DEFAULT '{}',
  "last_run_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "report_configs_report_type_key" UNIQUE ("report_type")
);

-- Report Snapshots (stored generated reports for in-app viewing)
CREATE TABLE IF NOT EXISTS "report_snapshots" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "report_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "html_content" TEXT NOT NULL,
  "data" JSONB,
  "generated_for" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "report_snapshots_type_date_idx" ON "report_snapshots" ("report_type", "created_at" DESC);

-- Seed default report configs
INSERT INTO "report_configs" ("id", "report_type", "name", "description", "is_enabled", "delivery_email", "delivery_app", "schedule", "recipients")
VALUES
  (gen_random_uuid()::text, 'daily_summary', 'Daily Summary', 'Daily overview of open tickets, overdue items, and new tickets from the last 24 hours', true, false, true, '0 8 * * 1-5', '{dept_heads,admins}'),
  (gen_random_uuid()::text, 'weekly_summary', 'Weekly Summary', 'Weekly performance report with resolution rates, SLA compliance, and top performers', true, false, true, '0 8 * * 1', '{dept_heads,admins}'),
  (gen_random_uuid()::text, 'sla_breach', 'SLA Breach Alert', 'Immediate notification when tickets breach their SLA deadline', true, false, true, NULL, '{dept_heads,admins}'),
  (gen_random_uuid()::text, 'overdue_alert', 'Overdue Tickets Alert', 'Daily list of all currently overdue tickets requiring attention', true, false, true, '0 9 * * 1-5', '{dept_heads,admins}'),
  (gen_random_uuid()::text, 'agent_performance', 'Agent Performance Report', 'Weekly breakdown of agent workload, resolution rates, and efficiency metrics', true, false, true, '0 9 * * 1', '{dept_heads,admins}')
ON CONFLICT ("report_type") DO NOTHING;
