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
    calls_goal INTEGER NOT NULL DEFAULT 0,
    emails_goal INTEGER NOT NULL DEFAULT 0,
    meetings_goal INTEGER NOT NULL DEFAULT 0,
    calls_achieved BOOLEAN DEFAULT false,
    emails_achieved BOOLEAN DEFAULT false,
    meetings_achieved BOOLEAN DEFAULT false,
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

-- New: Create activity tables for event logging and rollups
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

CREATE INDEX IF NOT EXISTS idx_activity_event_user_time ON activity_event(user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_activity_event_type_time ON activity_event(activity_type, occurred_at);

CREATE TABLE IF NOT EXISTS activity_daily (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('call','email','meeting','social','other')),
    total_quantity INTEGER NOT NULL DEFAULT 0,
    total_duration_seconds INTEGER,
    PRIMARY KEY (user_id, activity_date, activity_type)
);

CREATE INDEX IF NOT EXISTS idx_activity_daily_user_date ON activity_daily(user_id, activity_date);

CREATE TABLE IF NOT EXISTS activity_weekly (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('call','email','meeting','social','other')),
    total_quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, week_start, activity_type)
);

CREATE INDEX IF NOT EXISTS idx_activity_weekly_user_week ON activity_weekly(user_id, week_start);

-- Create indexes for better performance
CREATE INDEX idx_weekly_commitments_user_week ON weekly_commitments(user_id, week_start_date);
CREATE INDEX idx_weekly_results_user_week ON weekly_results(user_id, week_start_date);
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