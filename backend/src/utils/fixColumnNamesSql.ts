export const fixColumnNamesSql = `
-- This migration ensures backward compatibility by adding column aliases
-- The original schema uses 'week_start' but some code expects 'week_start_date'

-- Check if columns already exist before adding
DO $$ 
BEGIN
  -- For weekly_commitments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weekly_commitments' 
    AND column_name = 'week_start_date'
  ) THEN
    ALTER TABLE weekly_commitments 
    RENAME COLUMN week_start TO week_start_date;
  END IF;

  -- For weekly_results  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'weekly_results' 
    AND column_name = 'week_start_date'
  ) THEN
    ALTER TABLE weekly_results
    RENAME COLUMN week_start TO week_start_date;
  END IF;
END $$;
`;