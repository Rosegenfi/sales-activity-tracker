import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import pool from './config/database';
import { checkDatabaseStatus } from './utils/checkDatabase';
import { ensureCorrectSchema } from './utils/ensureCorrectSchema';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import commitmentRoutes from './routes/commitment.routes';
import resultRoutes from './routes/result.routes';
import goalRoutes from './routes/goal.routes';
import teamUpdateRoutes from './routes/teamUpdate.routes';
import leaderboardRoutes from './routes/leaderboard.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/commitments', commitmentRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/team-updates', teamUpdateRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Function to run migrations
async function runMigrationsIfNeeded() {
  try {
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Database tables not found. Running migrations...');
      const { runMigrations } = await import('./utils/runMigrations');
      await runMigrations();
      console.log('Migrations completed!');
    } else {
      console.log('Database tables already exist');
      
      // Fix column names if needed for existing databases
      try {
        const { fixColumnNamesSql } = await import('./utils/fixColumnNamesSql');
        await pool.query(fixColumnNamesSql);
        console.log('Column names checked/fixed');
      } catch (error) {
        console.error('Failed to fix column names:', error);
      }
    }
  } catch (error) {
    console.error('Migration check failed:', error);
    throw error;
  }
}

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
    
    // Run migrations if needed
    await runMigrationsIfNeeded();
    
    // Ensure schema is correct (fix column names)
    await ensureCorrectSchema();
    
    // Check database status
    await checkDatabaseStatus();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();