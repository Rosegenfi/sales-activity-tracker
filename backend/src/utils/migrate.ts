import pool from '../config/database';

const createTables = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'ae',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create weekly_commitments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS weekly_commitments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        week_start_date DATE NOT NULL,
        calls_target INTEGER NOT NULL DEFAULT 0,
        emails_target INTEGER NOT NULL DEFAULT 0,
        meetings_target INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, week_start_date)
      )
    `);

    // Create weekly_results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS weekly_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        week_start_date DATE NOT NULL,
        calls_actual INTEGER NOT NULL DEFAULT 0,
        emails_actual INTEGER NOT NULL DEFAULT 0,
        meetings_actual INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, week_start_date)
      )
    `);

    // Create daily_goals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        calls_goal INTEGER NOT NULL DEFAULT 0,
        emails_goal INTEGER NOT NULL DEFAULT 0,
        meetings_goal INTEGER NOT NULL DEFAULT 0,
        calls_achieved BOOLEAN DEFAULT false,
        emails_achieved BOOLEAN DEFAULT false,
        meetings_achieved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `);

    // Create team_updates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_updates (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        category VARCHAR(50) NOT NULL,
        file_url VARCHAR(500),
        external_link VARCHAR(500),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_weekly_commitments_user_date ON weekly_commitments(user_id, week_start_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_weekly_results_user_date ON weekly_results(user_id, week_start_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_goals_user_date ON daily_goals(user_id, date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_team_updates_category ON team_updates(category)`);

    // Create update_updated_at_column function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at
    const tables = ['users', 'weekly_commitments', 'weekly_results', 'daily_goals', 'team_updates'];
    for (const table of tables) {
      await pool.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    console.log('All tables created successfully!');
    
    // Create default admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await pool.query(`
      INSERT INTO users (email, password, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@salestracker.com', hashedPassword, 'Admin', 'User', 'admin']);
    
    console.log('Default admin user created (email: admin@salestracker.com, password: admin123)');
    
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run migration
createTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });