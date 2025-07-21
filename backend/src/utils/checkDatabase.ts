import pool from '../config/database';

export async function checkDatabaseStatus() {
  try {
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    console.log('Users table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Check if admin user exists
      const adminCheck = await pool.query(
        'SELECT email, role FROM users WHERE email = $1',
        ['admin@salestracker.com']
      );
      
      if (adminCheck.rows.length > 0) {
        console.log('Admin user found:', adminCheck.rows[0]);
      } else {
        console.log('Admin user NOT found - migrations may need to run');
      }
      
      // Count total users
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      console.log('Total users in database:', userCount.rows[0].count);
    }
  } catch (error) {
    console.error('Database check failed:', error);
  }
}