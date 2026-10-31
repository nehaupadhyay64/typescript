import { migrate, pool } from '../src/db.js';
await migrate(); await pool.end(); console.log('Database migrated');
