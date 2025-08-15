import pool from '../config/database';

export async function ensureCorrectSchema() {
  try {
    console.log('Checking and fixing database schema...');
    
    // First, check what columns actually exist
    const checkCommitments = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'weekly_commitments'
      AND column_name IN ('week_start', 'week_start_date')
    `);
    
    const checkResults = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'weekly_results'
      AND column_name IN ('week_start', 'week_start_date')
    `);
    
    console.log('Commitments columns:', checkCommitments.rows);
    console.log('Results columns:', checkResults.rows);
    
    // Fix commitments table if needed
    const hasCommitmentsOldColumn = checkCommitments.rows.some(r => r.column_name === 'week_start');
    const hasCommitmentsNewColumn = checkCommitments.rows.some(r => r.column_name === 'week_start_date');
    
    if (hasCommitmentsOldColumn && !hasCommitmentsNewColumn) {
      console.log('Renaming week_start to week_start_date in weekly_commitments...');
      await pool.query('ALTER TABLE weekly_commitments RENAME COLUMN week_start TO week_start_date');
      console.log('Commitments table fixed!');
    }
    
    // Fix results table if needed
    const hasResultsOldColumn = checkResults.rows.some(r => r.column_name === 'week_start');
    const hasResultsNewColumn = checkResults.rows.some(r => r.column_name === 'week_start_date');
    
    if (hasResultsOldColumn && !hasResultsNewColumn) {
      console.log('Renaming week_start to week_start_date in weekly_results...');
      await pool.query('ALTER TABLE weekly_results RENAME COLUMN week_start TO week_start_date');
      console.log('Results table fixed!');
    }

    // Ensure team_updates.section exists
    const checkSection = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'team_updates' AND column_name = 'section'
    `);

    if (checkSection.rows.length === 0) {
      console.log('Adding section column to team_updates...');
      await pool.query("ALTER TABLE team_updates ADD COLUMN section VARCHAR(100)");
      console.log('section column added to team_updates');
    }

    // Ensure activity tables exist (activity_event, activity_daily, activity_weekly)
    const checkActivityEvent = await pool.query(`
      SELECT to_regclass('public.activity_event') as exists;
    `);
    if (!checkActivityEvent.rows[0].exists) {
      console.log('Creating activity_event table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS activity_event (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          activity_type TEXT NOT NULL CHECK (activity_type IN ('call','email','meeting','social','other')),
          quantity INTEGER NOT NULL DEFAULT 1,
          duration_seconds INTEGER,
          source TEXT,
          metadata JSONB,
          occurred_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_event_user_time ON activity_event(user_id, occurred_at);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_event_type_time ON activity_event(activity_type, occurred_at);`);
      console.log('activity_event table created.');
    }

    const checkActivityDaily = await pool.query(`
      SELECT to_regclass('public.activity_daily') as exists;
    `);
    if (!checkActivityDaily.rows[0].exists) {
      console.log('Creating activity_daily table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS activity_daily (
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          activity_date DATE NOT NULL,
          activity_type TEXT NOT NULL CHECK (activity_type IN ('call','email','meeting','social','other')),
          total_quantity INTEGER NOT NULL DEFAULT 0,
          total_duration_seconds INTEGER,
          PRIMARY KEY (user_id, activity_date, activity_type)
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_daily_user_date ON activity_daily(user_id, activity_date);`);
      console.log('activity_daily table created.');
    }

    const checkActivityWeekly = await pool.query(`
      SELECT to_regclass('public.activity_weekly') as exists;
    `);
    if (!checkActivityWeekly.rows[0].exists) {
      console.log('Creating activity_weekly table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS activity_weekly (
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          week_start DATE NOT NULL,
          activity_type TEXT NOT NULL CHECK (activity_type IN ('call','email','meeting','social','other')),
          total_quantity INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (user_id, week_start, activity_type)
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_weekly_user_week ON activity_weekly(user_id, week_start);`);
      console.log('activity_weekly table created.');
    }
    
    console.log('Schema check complete!');
    
  } catch (error) {
    console.error('Failed to ensure correct schema:', error);
    // Don't throw - let the app continue even if this fails
  }
}