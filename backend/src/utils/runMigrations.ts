import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import pool from '../config/database';

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
    let migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Hash the default admin password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    migrationSQL = migrationSQL.replace('$2b$10$YourHashedPasswordHere', hashedPassword);
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();