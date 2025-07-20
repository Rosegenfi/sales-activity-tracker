import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { getWeekStartDate } from '../utils/dateHelpers';

const router = Router();

// Get commitments for current week
router.get('/current', authenticate, async (req: AuthRequest, res) => {
  try {
    const weekStart = getWeekStartDate(new Date());
    
    const result = await pool.query(
      `SELECT * FROM weekly_commitments 
       WHERE user_id = $1 AND week_start_date = $2`,
      [req.user!.id, weekStart]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    const commitment = result.rows[0];

    res.json({
      id: commitment.id,
      weekStartDate: commitment.week_start_date,
      callsTarget: commitment.calls_target,
      emailsTarget: commitment.emails_target,
      meetingsTarget: commitment.meetings_target,
      dailyAverages: {
        calls: Math.ceil(commitment.calls_target / 5),
        emails: Math.ceil(commitment.emails_target / 5),
        meetings: Math.ceil(commitment.meetings_target / 5)
      }
    });
  } catch (error) {
    console.error('Get current commitments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update commitments for current week
router.post('/', [
  authenticate,
  body('callsTarget').isInt({ min: 0 }),
  body('emailsTarget').isInt({ min: 0 }),
  body('meetingsTarget').isInt({ min: 0 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { callsTarget, emailsTarget, meetingsTarget } = req.body;
    const weekStart = getWeekStartDate(new Date());

    const result = await pool.query(
      `INSERT INTO weekly_commitments (user_id, week_start_date, calls_target, emails_target, meetings_target)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, week_start_date)
       DO UPDATE SET 
         calls_target = $3,
         emails_target = $4,
         meetings_target = $5,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user!.id, weekStart, callsTarget, emailsTarget, meetingsTarget]
    );

    const commitment = result.rows[0];

    res.json({
      id: commitment.id,
      weekStartDate: commitment.week_start_date,
      callsTarget: commitment.calls_target,
      emailsTarget: commitment.emails_target,
      meetingsTarget: commitment.meetings_target,
      dailyAverages: {
        calls: Math.ceil(commitment.calls_target / 5),
        emails: Math.ceil(commitment.emails_target / 5),
        meetings: Math.ceil(commitment.meetings_target / 5)
      }
    });
  } catch (error) {
    console.error('Create/update commitments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get commitment history
router.get('/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const { limit = 12 } = req.query;

    const result = await pool.query(
      `SELECT * FROM weekly_commitments 
       WHERE user_id = $1 
       ORDER BY week_start_date DESC 
       LIMIT $2`,
      [req.user!.id, limit]
    );

    const commitments = result.rows.map(commitment => ({
      id: commitment.id,
      weekStartDate: commitment.week_start_date,
      callsTarget: commitment.calls_target,
      emailsTarget: commitment.emails_target,
      meetingsTarget: commitment.meetings_target
    }));

    res.json(commitments);
  } catch (error) {
    console.error('Get commitment history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get commitments for specific user and week (Admin or self)
router.get('/user/:userId/week/:weekStart', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId, weekStart } = req.params;

    // Check permissions
    if (req.user!.id !== parseInt(userId) && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const result = await pool.query(
      `SELECT * FROM weekly_commitments 
       WHERE user_id = $1 AND week_start_date = $2`,
      [userId, weekStart]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    const commitment = result.rows[0];

    res.json({
      id: commitment.id,
      weekStartDate: commitment.week_start_date,
      callsTarget: commitment.calls_target,
      emailsTarget: commitment.emails_target,
      meetingsTarget: commitment.meetings_target
    });
  } catch (error) {
    console.error('Get user week commitments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;