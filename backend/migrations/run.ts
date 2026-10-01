import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pool from '../src/config/database';

dotenv.config();

async function runMigrations() {
  try {
    console.log('Running migrations...');
    
    const migrationPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();
