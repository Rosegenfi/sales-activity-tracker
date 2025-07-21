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
    
    console.log('Schema check complete!');
    
  } catch (error) {
    console.error('Failed to ensure correct schema:', error);
    // Don't throw - let the app continue even if this fails
  }
}