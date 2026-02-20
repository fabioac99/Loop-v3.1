-- Custom permissions table (role-based access)
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'general',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User permissions junction table
CREATE TABLE IF NOT EXISTS "user_permissions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "permission_name" TEXT NOT NULL REFERENCES "permissions"("name") ON DELETE CASCADE,
  "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("user_id", "permission_name")
);

-- Configurable statuses
CREATE TABLE IF NOT EXISTS "custom_statuses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#6366f1',
  "sort_order" INT NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_closed_state" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Configurable priorities  
CREATE TABLE IF NOT EXISTS "custom_priorities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#6366f1',
  "sort_order" INT NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sla_response_hours" INT NOT NULL DEFAULT 24,
  "sla_resolution_hours" INT NOT NULL DEFAULT 72,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ticket forwards
CREATE TABLE IF NOT EXISTS "ticket_forwards" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" TEXT NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
  "from_user_id" TEXT NOT NULL REFERENCES "users"("id"),
  "to_user_id" TEXT NOT NULL REFERENCES "users"("id"),
  "message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default permissions
INSERT INTO "permissions" ("name", "label", "description", "category") VALUES
  ('admin.access', 'Access Admin Panel', 'Access the administration panel', 'admin'),
  ('tickets.delete', 'Delete Tickets', 'Permanently delete tickets', 'tickets'),
  ('tickets.delete_any', 'Delete Any Ticket', 'Delete tickets created by any user', 'tickets'),
  ('tickets.manage_all', 'Manage All Tickets', 'View and manage all tickets across departments', 'tickets'),
  ('tickets.forward', 'Forward Tickets', 'Forward tickets to other users', 'tickets'),
  ('departments.manage', 'Manage Departments', 'Create, edit, and delete departments', 'departments'),
  ('users.manage', 'Manage Users', 'Create, edit, and deactivate users', 'users'),
  ('settings.manage', 'Manage Settings', 'Change system settings and branding', 'settings'),
  ('forms.manage', 'Manage Forms', 'Create and edit form schemas', 'forms'),
  ('analytics.view', 'View Analytics', 'Access analytics and reporting', 'analytics'),
  ('audit.view', 'View Audit Log', 'Access the audit log', 'audit')
ON CONFLICT ("name") DO NOTHING;

-- Seed default statuses
INSERT INTO "custom_statuses" ("name", "label", "color", "sort_order", "is_closed_state") VALUES
  ('DRAFT', 'Draft', '#71717a', 0, false),
  ('OPEN', 'Open', '#3b82f6', 1, false),
  ('IN_PROGRESS', 'In Progress', '#f59e0b', 2, false),
  ('WAITING_REPLY', 'Waiting Reply', '#a855f7', 3, false),
  ('APPROVED', 'Approved', '#10b981', 4, false),
  ('REJECTED', 'Rejected', '#ef4444', 5, true),
  ('CLOSED', 'Closed', '#71717a', 6, true)
ON CONFLICT ("name") DO NOTHING;

-- Seed default priorities
INSERT INTO "custom_priorities" ("name", "label", "color", "sort_order", "sla_response_hours", "sla_resolution_hours") VALUES
  ('LOW', 'Low', '#71717a', 0, 48, 168),
  ('NORMAL', 'Normal', '#3b82f6', 1, 24, 72),
  ('HIGH', 'High', '#f59e0b', 2, 8, 24),
  ('URGENT', 'Urgent', '#ef4444', 3, 2, 8)
ON CONFLICT ("name") DO NOTHING;
