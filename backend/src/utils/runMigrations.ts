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
    
    // Log the admin user creation for verification
    const result = await pool.query('SELECT email FROM users WHERE email = $1', ['admin@salestracker.com']);
    if (result.rows.length > 0) {
      console.log('Admin user created successfully:', result.rows[0].email);
    }
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();