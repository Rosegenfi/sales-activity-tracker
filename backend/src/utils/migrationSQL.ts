export const initialSchemaSql = `
-- Create users table
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
);

-- Create weekly_commitments table
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
);

-- Create weekly_results table
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
);

-- Create daily_goals table
CREATE TABLE IF NOT EXISTS daily_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    calls_target INTEGER NOT NULL DEFAULT 0,
    emails_target INTEGER NOT NULL DEFAULT 0,
    meetings_target INTEGER NOT NULL DEFAULT 0,
    calls_actual INTEGER DEFAULT 0,
    emails_actual INTEGER DEFAULT 0,
    meetings_actual INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Create team_updates table
CREATE TABLE IF NOT EXISTS team_updates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_weekly_commitments_user_week ON weekly_commitments(user_id, week_start);
CREATE INDEX idx_weekly_results_user_week ON weekly_results(user_id, week_start);
CREATE INDEX idx_daily_goals_user_date ON daily_goals(user_id, date);
CREATE INDEX idx_team_updates_category ON team_updates(category);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password, first_name, last_name, role, is_active)
VALUES (
    'admin@salestracker.com',
    '$2b$10$YourHashedPasswordHere', -- This will be replaced with actual hash
    'Admin',
    'User',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;
`;