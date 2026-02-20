const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  const sql = fs.readFileSync(
    path.join(__dirname, 'prisma/migrations/manual_admin_features.sql'),
    'utf-8'
  );

  try {
    await client.query(sql);
    console.log('Admin features migration completed successfully!');
    console.log('Tables created: permissions, user_permissions, custom_statuses, custom_priorities, ticket_forwards');
    console.log('Seeded: 11 permissions, 7 statuses, 4 priorities');
  } catch (err) {
    console.error('Migration error:', err.message);
  }

  await client.end();
}

run();
