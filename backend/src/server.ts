import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import pool from './config/database';
import { checkDatabaseStatus } from './utils/checkDatabase';

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

// Health check endpoint - moved before database connection
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Readiness check endpoint
app.get('/api/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', database: 'disconnected' });
  }
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
    }
  } catch (error) {
    console.error('Migration check failed:', error);
    throw error;
  }
}

// Start server
const startServer = async () => {
  try {
    console.log('Starting server...');
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DB_HOST: process.env.DB_HOST ? 'Set' : 'Not set',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set'
    });
    
    // Test database connection
    console.log('Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
    
    // Run migrations if needed
    await runMigrationsIfNeeded();
    
    // Check database status
    await checkDatabaseStatus();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on http://0.0.0.0:${PORT}`);
      console.log('Health check available at /api/health');
    });
    
    server.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();