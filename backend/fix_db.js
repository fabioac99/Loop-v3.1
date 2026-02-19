const { Client } = require('pg');
require('dotenv').config();

const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() => c.query(`
  DROP TABLE IF EXISTS notification_preferences CASCADE;
  CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    channels JSONB NOT NULL DEFAULT '["in_app"]',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  INSERT INTO notification_preferences (id, event_type, label, description, enabled, channels) VALUES
    (gen_random_uuid(), 'TICKET_CREATED', 'Ticket Created', 'When a new ticket is created in your department', true, '["in_app"]'),
    (gen_random_uuid(), 'TICKET_ASSIGNED', 'Ticket Assigned', 'When a ticket is assigned to you', true, '["in_app"]'),
    (gen_random_uuid(), 'STATUS_CHANGED', 'Status Changed', 'When a watched ticket changes status', true, '["in_app"]'),
    (gen_random_uuid(), 'NEW_MESSAGE', 'New Message', 'When someone replies on a watched ticket', true, '["in_app"]'),
    (gen_random_uuid(), 'TICKET_WATCHER_ADDED', 'Added as Watcher', 'When you are added as watcher/CC on a ticket', true, '["in_app"]'),
    (gen_random_uuid(), 'SLA_WARNING', 'SLA Warning', 'When a ticket is approaching SLA deadline', true, '["in_app"]'),
    (gen_random_uuid(), 'SLA_BREACH', 'SLA Breach', 'When a ticket has breached its SLA', true, '["in_app"]');
  ALTER TABLE tickets ADD COLUMN IF NOT EXISTS metadata JSONB;
`)).then(() => {
  console.log('Done!');
  c.end();
}).catch(e => {
  console.error(e);
  c.end();
});
