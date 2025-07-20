import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { getPreviousWeekStartDate } from '../utils/dateHelpers';

const router = Router();

// Get results for previous week
router.get('/previous', authenticate, async (req: AuthRequest, res) => {
  try {
    const previousWeekStart = getPreviousWeekStartDate(new Date());
    
    const result = await pool.query(
      `SELECT r.*, c.calls_target, c.emails_target, c.meetings_target
       FROM weekly_results r
       LEFT JOIN weekly_commitments c ON c.user_id = r.user_id AND c.week_start_date = r.week_start_date
       WHERE r.user_id = $1 AND r.week_start_date = $2`,
      [req.user!.id, previousWeekStart]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    const data = result.rows[0];

    res.json({
      id: data.id,
      weekStartDate: data.week_start_date,
      callsActual: data.calls_actual,
      emailsActual: data.emails_actual,
      meetingsActual: data.meetings_actual,
      callsTarget: data.calls_target || 0,
      emailsTarget: data.emails_target || 0,
      meetingsTarget: data.meetings_target || 0,
      percentages: {
        calls: data.calls_target ? Math.round((data.calls_actual / data.calls_target) * 100) : 0,
        emails: data.emails_target ? Math.round((data.emails_actual / data.emails_target) * 100) : 0,
        meetings: data.meetings_target ? Math.round((data.meetings_actual / data.meetings_target) * 100) : 0,
        overall: data.calls_target || data.emails_target || data.meetings_target
          ? Math.round(((data.calls_actual + data.emails_actual + data.meetings_actual) / 
              (data.calls_target + data.emails_target + data.meetings_target)) * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('Get previous results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update results for previous week
router.post('/', [
  authenticate,
  body('callsActual').isInt({ min: 0 }),
  body('emailsActual').isInt({ min: 0 }),
  body('meetingsActual').isInt({ min: 0 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { callsActual, emailsActual, meetingsActual } = req.body;
    const previousWeekStart = getPreviousWeekStartDate(new Date());

    const result = await pool.query(
      `INSERT INTO weekly_results (user_id, week_start_date, calls_actual, emails_actual, meetings_actual)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, week_start_date)
       DO UPDATE SET 
         calls_actual = $3,
         emails_actual = $4,
         meetings_actual = $5,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user!.id, previousWeekStart, callsActual, emailsActual, meetingsActual]
    );

    const data = result.rows[0];

    // Get commitments for percentage calculation
    const commitmentResult = await pool.query(
      'SELECT calls_target, emails_target, meetings_target FROM weekly_commitments WHERE user_id = $1 AND week_start_date = $2',
      [req.user!.id, previousWeekStart]
    );

    const commitments = commitmentResult.rows[0] || { calls_target: 0, emails_target: 0, meetings_target: 0 };

    res.json({
      id: data.id,
      weekStartDate: data.week_start_date,
      callsActual: data.calls_actual,
      emailsActual: data.emails_actual,
      meetingsActual: data.meetings_actual,
      percentages: {
        calls: commitments.calls_target ? Math.round((data.calls_actual / commitments.calls_target) * 100) : 0,
        emails: commitments.emails_target ? Math.round((data.emails_actual / commitments.emails_target) * 100) : 0,
        meetings: commitments.meetings_target ? Math.round((data.meetings_actual / commitments.meetings_target) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Create/update results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get result history with commitments
router.get('/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const { limit = 12 } = req.query;

    const result = await pool.query(
      `SELECT r.*, c.calls_target, c.emails_target, c.meetings_target
       FROM weekly_results r
       LEFT JOIN weekly_commitments c ON c.user_id = r.user_id AND c.week_start_date = r.week_start_date
       WHERE r.user_id = $1 
       ORDER BY r.week_start_date DESC 
       LIMIT $2`,
      [req.user!.id, limit]
    );

    const results = result.rows.map(row => ({
      id: row.id,
      weekStartDate: row.week_start_date,
      callsActual: row.calls_actual,
      emailsActual: row.emails_actual,
      meetingsActual: row.meetings_actual,
      callsTarget: row.calls_target || 0,
      emailsTarget: row.emails_target || 0,
      meetingsTarget: row.meetings_target || 0,
      percentages: {
        calls: row.calls_target ? Math.round((row.calls_actual / row.calls_target) * 100) : 0,
        emails: row.emails_target ? Math.round((row.emails_actual / row.emails_target) * 100) : 0,
        meetings: row.meetings_target ? Math.round((row.meetings_actual / row.meetings_target) * 100) : 0
      }
    }));

    res.json(results);
  } catch (error) {
    console.error('Get result history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;