const { Client } = require('pg');
require('dotenv').config();
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => c.query("ALTER TYPE \"TicketStatus\" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'OPEN'"))
  .then(() => { console.log('DRAFT status added!'); c.end(); })
  .catch(e => { console.error(e); c.end(); });
