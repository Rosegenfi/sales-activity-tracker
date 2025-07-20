import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get goals for a specific date
router.get('/date/:date', authenticate, async (req: AuthRequest, res) => {
  try {
    const { date } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM daily_goals WHERE user_id = $1 AND date = $2',
      [req.user!.id, date]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    const goal = result.rows[0];

    res.json({
      id: goal.id,
      date: goal.date,
      callsGoal: goal.calls_goal,
      emailsGoal: goal.emails_goal,
      meetingsGoal: goal.meetings_goal,
      callsAchieved: goal.calls_achieved,
      emailsAchieved: goal.emails_achieved,
      meetingsAchieved: goal.meetings_achieved
    });
  } catch (error) {
    console.error('Get daily goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update daily goal
router.post('/', [
  authenticate,
  body('date').isISO8601(),
  body('callsGoal').isInt({ min: 0 }),
  body('emailsGoal').isInt({ min: 0 }),
  body('meetingsGoal').isInt({ min: 0 })
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, callsGoal, emailsGoal, meetingsGoal } = req.body;

    const result = await pool.query(
      `INSERT INTO daily_goals (user_id, date, calls_goal, emails_goal, meetings_goal)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, date)
       DO UPDATE SET 
         calls_goal = $3,
         emails_goal = $4,
         meetings_goal = $5,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user!.id, date, callsGoal, emailsGoal, meetingsGoal]
    );

    const goal = result.rows[0];

    res.json({
      id: goal.id,
      date: goal.date,
      callsGoal: goal.calls_goal,
      emailsGoal: goal.emails_goal,
      meetingsGoal: goal.meetings_goal,
      callsAchieved: goal.calls_achieved,
      emailsAchieved: goal.emails_achieved,
      meetingsAchieved: goal.meetings_achieved
    });
  } catch (error) {
    console.error('Create/update daily goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update goal achievement status
router.patch('/achievement', [
  authenticate,
  body('date').isISO8601(),
  body('callsAchieved').optional().isBoolean(),
  body('emailsAchieved').optional().isBoolean(),
  body('meetingsAchieved').optional().isBoolean()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, callsAchieved, emailsAchieved, meetingsAchieved } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [req.user!.id, date];
    let paramCount = 2;

    if (callsAchieved !== undefined) {
      paramCount++;
      updates.push(`calls_achieved = $${paramCount}`);
      values.push(callsAchieved);
    }

    if (emailsAchieved !== undefined) {
      paramCount++;
      updates.push(`emails_achieved = $${paramCount}`);
      values.push(emailsAchieved);
    }

    if (meetingsAchieved !== undefined) {
      paramCount++;
      updates.push(`meetings_achieved = $${paramCount}`);
      values.push(meetingsAchieved);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No achievement updates provided' });
    }

    const query = `
      UPDATE daily_goals 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND date = $2
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Goal not found for this date' });
    }

    const goal = result.rows[0];

    res.json({
      id: goal.id,
      date: goal.date,
      callsGoal: goal.calls_goal,
      emailsGoal: goal.emails_goal,
      meetingsGoal: goal.meetings_goal,
      callsAchieved: goal.calls_achieved,
      emailsAchieved: goal.emails_achieved,
      meetingsAchieved: goal.meetings_achieved
    });
  } catch (error) {
    console.error('Update achievement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get goals for current week
router.get('/week/current', authenticate, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const result = await pool.query(
      `SELECT * FROM daily_goals 
       WHERE user_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date`,
      [req.user!.id, monday.toISOString().split('T')[0], friday.toISOString().split('T')[0]]
    );

    const goals = result.rows.map(goal => ({
      id: goal.id,
      date: goal.date,
      callsGoal: goal.calls_goal,
      emailsGoal: goal.emails_goal,
      meetingsGoal: goal.meetings_goal,
      callsAchieved: goal.calls_achieved,
      emailsAchieved: goal.emails_achieved,
      meetingsAchieved: goal.meetings_achieved
    }));

    res.json(goals);
  } catch (error) {
    console.error('Get week goals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get goals for specific user (Admin or self)
router.get('/user/:userId/date/:date', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId, date } = req.params;

    // Check permissions
    if (req.user!.id !== parseInt(userId) && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const result = await pool.query(
      'SELECT * FROM daily_goals WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    const goal = result.rows[0];

    res.json({
      id: goal.id,
      date: goal.date,
      callsGoal: goal.calls_goal,
      emailsGoal: goal.emails_goal,
      meetingsGoal: goal.meetings_goal,
      callsAchieved: goal.calls_achieved,
      emailsAchieved: goal.emails_achieved,
      meetingsAchieved: goal.meetings_achieved
    });
  } catch (error) {
    console.error('Get user goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;