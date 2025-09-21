import { Router } from 'express';
import pool from '../config/database';
import { authenticate } from '../middleware/auth.middleware';
import { getPreviousWeekStartDate } from '../utils/dateHelpers';

const router = Router();

// Get leaderboard data for previous week
router.get('/', authenticate, async (req, res) => {
  try {
    const previousWeekStart = getPreviousWeekStartDate(new Date());

    // Get all AEs with their results and commitments for previous week
    const result = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        COALESCE(r.calls_actual, 0) as calls_actual,
        COALESCE(r.emails_actual, 0) as emails_actual,
        COALESCE(r.meetings_actual, 0) as meetings_actual,
        COALESCE(c.calls_target, 0) as calls_target,
        COALESCE(c.emails_target, 0) as emails_target,
        COALESCE(c.meetings_target, 0) as meetings_target,
        CASE 
          WHEN (COALESCE(c.calls_target, 0) + COALESCE(c.emails_target, 0) + COALESCE(c.meetings_target, 0)) > 0
          THEN ROUND(
            (
              LEAST(COALESCE(r.calls_actual, 0)::numeric / GREATEST(COALESCE(c.calls_target, 1), 1)::numeric * 100, 100) * 0.3333 +
              LEAST(COALESCE(r.emails_actual, 0)::numeric / GREATEST(COALESCE(c.emails_target, 1), 1)::numeric * 100, 100) * 0.3333 +
              LEAST(COALESCE(r.meetings_actual, 0)::numeric / GREATEST(COALESCE(c.meetings_target, 1), 1)::numeric * 100, 100) * 0.3333
            )
          )
          ELSE 0
        END as achievement_percentage
      FROM users u
      LEFT JOIN weekly_results r ON u.id = r.user_id AND r.week_start_date = $1
      LEFT JOIN weekly_commitments c ON u.id = c.user_id AND c.week_start_date = $1
      WHERE u.role = 'ae' AND u.is_active = true
      ORDER BY achievement_percentage DESC, u.last_name, u.first_name
    `, [previousWeekStart]);

    // Get top 3 callers
    const topCallersResult = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        r.calls_actual
      FROM users u
      INNER JOIN weekly_results r ON u.id = r.user_id
      WHERE u.role = 'ae' AND u.is_active = true AND r.week_start_date = $1
      ORDER BY r.calls_actual DESC, u.last_name, u.first_name
      LIMIT 3
    `, [previousWeekStart]);

    // Get top 3 meeting bookers
    const topMeetingBookersResult = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        r.meetings_actual
      FROM users u
      INNER JOIN weekly_results r ON u.id = r.user_id
      WHERE u.role = 'ae' AND u.is_active = true AND r.week_start_date = $1
      ORDER BY r.meetings_actual DESC, u.last_name, u.first_name
      LIMIT 3
    `, [previousWeekStart]);

    const leaderboard = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
      callsActual: row.calls_actual,
      emailsActual: row.emails_actual,
      meetingsActual: row.meetings_actual,
      callsTarget: row.calls_target,
      emailsTarget: row.emails_target,
      meetingsTarget: row.meetings_target,
      achievementPercentage: parseInt(row.achievement_percentage),
      hasData: row.calls_target > 0 || row.emails_target > 0 || row.meetings_target > 0
    }));

    const topCallers = topCallersResult.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
      callsActual: row.calls_actual
    }));

    const topMeetingBookers = topMeetingBookersResult.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
      meetingsActual: row.meetings_actual
    }));

    res.json({
      weekStartDate: previousWeekStart,
      leaderboard,
      topCallers,
      topMeetingBookers
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get performance summary for all AEs (Admin only)
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { weekStart } = req.query;
    const targetWeek = weekStart || getPreviousWeekStartDate(new Date());

    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_aes,
        COUNT(DISTINCT c.user_id) as aes_with_commitments,
        COUNT(DISTINCT r.user_id) as aes_with_results,
        COALESCE(SUM(c.calls_target), 0) as total_calls_target,
        COALESCE(SUM(r.calls_actual), 0) as total_calls_actual,
        COALESCE(SUM(c.emails_target), 0) as total_emails_target,
        COALESCE(SUM(r.emails_actual), 0) as total_emails_actual,
        COALESCE(SUM(c.meetings_target), 0) as total_meetings_target,
        COALESCE(SUM(r.meetings_actual), 0) as total_meetings_actual
      FROM users u
      LEFT JOIN weekly_commitments c ON u.id = c.user_id AND c.week_start_date = $1
      LEFT JOIN weekly_results r ON u.id = r.user_id AND r.week_start_date = $1
      WHERE u.role = 'ae' AND u.is_active = true
    `, [targetWeek]);

    const summary = result.rows[0];

    res.json({
      weekStartDate: targetWeek,
      totalAEs: parseInt(summary.total_aes),
      aesWithCommitments: parseInt(summary.aes_with_commitments),
      aesWithResults: parseInt(summary.aes_with_results),
      totals: {
        callsTarget: parseInt(summary.total_calls_target),
        callsActual: parseInt(summary.total_calls_actual),
        emailsTarget: parseInt(summary.total_emails_target),
        emailsActual: parseInt(summary.total_emails_actual),
        meetingsTarget: parseInt(summary.total_meetings_target),
        meetingsActual: parseInt(summary.total_meetings_actual)
      },
      percentages: {
        calls: summary.total_calls_target > 0 
          ? Math.round((summary.total_calls_actual / summary.total_calls_target) * 100) 
          : 0,
        emails: summary.total_emails_target > 0 
          ? Math.round((summary.total_emails_actual / summary.total_emails_target) * 100) 
          : 0,
        meetings: summary.total_meetings_target > 0 
          ? Math.round((summary.total_meetings_actual / summary.total_meetings_target) * 100) 
          : 0
      }
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get historical leaderboard data
router.get('/history', authenticate, async (req, res) => {
  try {
    const { weeks = 4 } = req.query;
    const weeksList: string[] = [];

    // Generate list starting from previous week, then week before, etc.
    // i = 1 => previous week; i = 2 => previous-previous; ...
    const count = parseInt(weeks as string);
    for (let i = 1; i <= count; i++) {
      const base = new Date();
      base.setDate(base.getDate() - ((i - 1) * 7));
      weeksList.push(getPreviousWeekStartDate(base));
    }

    const placeholders = weeksList.map((_, index) => `$${index + 1}`).join(',');
    
    const result = await pool.query(`
      SELECT 
        r.week_start_date,
        u.id,
        u.first_name,
        u.last_name,
        r.calls_actual,
        r.emails_actual,
        r.meetings_actual,
        c.calls_target,
        c.emails_target,
        c.meetings_target
      FROM weekly_results r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN weekly_commitments c ON r.user_id = c.user_id AND r.week_start_date = c.week_start_date
      WHERE r.week_start_date IN (${placeholders}) AND u.role = 'ae' AND u.is_active = true
      ORDER BY r.week_start_date DESC, u.last_name, u.first_name
    `, weeksList);

    // Group by week
    const history = weeksList.map(weekStart => {
      const weekData = result.rows.filter(row => row.week_start_date === weekStart);
      
      return {
        weekStartDate: weekStart,
        aes: weekData.map(row => ({
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          fullName: `${row.first_name} ${row.last_name}`,
          results: {
            calls: row.calls_actual,
            emails: row.emails_actual,
            meetings: row.meetings_actual
          },
          targets: {
            calls: row.calls_target || 0,
            emails: row.emails_target || 0,
            meetings: row.meetings_target || 0
          }
        }))
      };
    });

  // Get available weeks info (counts and range)
  router.get('/weeks-available', authenticate, async (req, res) => {
    try {
      const resultsAgg = await pool.query(`
        SELECT 
          COUNT(DISTINCT week_start_date)::int AS count,
          MIN(week_start_date) AS earliest,
          MAX(week_start_date) AS latest
        FROM weekly_results
      `);

      const commitmentsAgg = await pool.query(`
        SELECT 
          COUNT(DISTINCT week_start_date)::int AS count,
          MIN(week_start_date) AS earliest,
          MAX(week_start_date) AS latest
        FROM weekly_commitments
      `);

      const intersectionAgg = await pool.query(`
        SELECT COUNT(*)::int AS count FROM (
          SELECT DISTINCT r.week_start_date
          FROM weekly_results r
          INNER JOIN weekly_commitments c 
            ON c.week_start_date = r.week_start_date
        ) x
      `);

      res.json({
        resultsWeeks: resultsAgg.rows[0],
        commitmentsWeeks: commitmentsAgg.rows[0],
        bothWeeks: intersectionAgg.rows[0]
      });
    } catch (error) {
      console.error('Get weeks-available error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

    res.json(history);
  } catch (error) {
    console.error('Get leaderboard history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;