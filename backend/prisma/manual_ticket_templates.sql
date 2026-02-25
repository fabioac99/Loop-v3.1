CREATE TABLE IF NOT EXISTS "ticket_templates" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "title" TEXT,
  "content" TEXT,
  "category_id" TEXT,
  "subtype_id" TEXT,
  "to_department_id" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "is_global" BOOLEAN NOT NULL DEFAULT false,
  "department_id" TEXT,
  "created_by_id" TEXT NOT NULL,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ticket_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE
);
