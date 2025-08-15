import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/database';
import { getWeekStartDate, getPreviousWeekStartDate } from '../utils/dateHelpers';

const router = Router();

// Log an activity event and update rollups
router.post('/events', authenticate, async (req: AuthRequest, res) => {
  try {
    const { activityType, quantity = 1, durationSeconds, source, metadata, occurredAt } = req.body || {};

    const validTypes = ['call','email','meeting','social','other'];
    if (!validTypes.includes(activityType)) {
      return res.status(400).json({ message: 'Invalid activityType' });
    }

    const occurred_at = occurredAt ? new Date(occurredAt) : new Date();
    const activity_date = occurred_at.toISOString().split('T')[0];
    const week_start = getWeekStartDate(occurred_at);

    // Insert raw event
    const eventResult = await pool.query(
      `INSERT INTO activity_event (user_id, activity_type, quantity, duration_seconds, source, metadata, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [req.user!.id, activityType, quantity, durationSeconds || null, source || null, metadata || null, occurred_at]
    );

    // Upsert daily rollup
    await pool.query(
      `INSERT INTO activity_daily (user_id, activity_date, activity_type, total_quantity, total_duration_seconds)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, activity_date, activity_type)
       DO UPDATE SET 
         total_quantity = activity_daily.total_quantity + EXCLUDED.total_quantity,
         total_duration_seconds = COALESCE(activity_daily.total_duration_seconds,0) + COALESCE(EXCLUDED.total_duration_seconds,0)`,
      [req.user!.id, activity_date, activityType, quantity, durationSeconds || 0]
    );

    // Upsert weekly rollup
    await pool.query(
      `INSERT INTO activity_weekly (user_id, week_start, activity_type, total_quantity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, week_start, activity_type)
       DO UPDATE SET 
         total_quantity = activity_weekly.total_quantity + EXCLUDED.total_quantity`,
      [req.user!.id, week_start, activityType, quantity]
    );

    res.json({ id: eventResult.rows[0].id, success: true });
  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// AE summary: today and this week, plus WoW delta
router.get('/me/summary', authenticate, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisWeekStart = getWeekStartDate(now);
    const lastWeekStart = getPreviousWeekStartDate(now);
    const priorWeekStart = getPreviousWeekStartDate(new Date(new Date(lastWeekStart).getTime()));

    // Today counts by type
    const today = await pool.query(
      `SELECT activity_type, COALESCE(SUM(total_quantity),0) as total
       FROM activity_daily WHERE user_id = $1 AND activity_date = $2
       GROUP BY activity_type`,
      [req.user!.id, todayStr]
    );

    // This week totals by type
    const week = await pool.query(
      `SELECT activity_type, COALESCE(SUM(total_quantity),0) as total
       FROM activity_weekly WHERE user_id = $1 AND week_start = $2
       GROUP BY activity_type`,
      [req.user!.id, thisWeekStart]
    );

    // WoW delta last vs prior week
    const wow = await pool.query(
      `WITH w AS (
         SELECT activity_type,
                SUM(total_quantity) FILTER (WHERE week_start = $2) AS last_week,
                SUM(total_quantity) FILTER (WHERE week_start = $3) AS prior_week
         FROM activity_weekly
         WHERE user_id = $1 AND week_start IN ($2, $3)
         GROUP BY activity_type
       )
       SELECT activity_type,
              COALESCE(last_week,0) AS last,
              COALESCE(prior_week,0) AS prior,
              COALESCE(last_week,0) - COALESCE(prior_week,0) AS delta,
              CASE WHEN COALESCE(prior_week,0) = 0 THEN NULL
                   ELSE ROUND(100.0 * (COALESCE(last_week,0) - prior_week) / prior_week, 1)
              END AS pct
       FROM w`,
      [req.user!.id, lastWeekStart, priorWeekStart]
    );

    const mapRows = (rows: any[]) => rows.reduce((acc: any, r: any) => { acc[r.activity_type] = Number(r.total ?? r.last ?? 0); return acc; }, {});

    const wowObj: any = {};
    for (const r of wow.rows) {
      wowObj[r.activity_type] = { last: Number(r.last || 0), prior: Number(r.prior || 0), delta: Number(r.delta || 0), pct: r.pct !== null ? Number(r.pct) : null };
    }

    res.json({
      today: mapRows(today.rows),
      week: mapRows(week.rows),
      wow: wowObj
    });
  } catch (error) {
    console.error('AE summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin overview: by user, this week, with WoW%
router.get('/admin/overview', authenticate, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const thisWeekStart = getWeekStartDate(now);
    const lastWeekStart = getPreviousWeekStartDate(now);
    const priorWeekStart = getPreviousWeekStartDate(new Date(new Date(lastWeekStart).getTime()));

    const result = await pool.query(
      `WITH this_week AS (
         SELECT user_id, activity_type, SUM(total_quantity) AS qty
         FROM activity_weekly
         WHERE week_start = $1
         GROUP BY user_id, activity_type
       ),
       last_week AS (
         SELECT user_id, activity_type, SUM(total_quantity) AS qty
         FROM activity_weekly
         WHERE week_start = $2
         GROUP BY user_id, activity_type
       ),
       prior_week AS (
         SELECT user_id, activity_type, SUM(total_quantity) AS qty
         FROM activity_weekly
         WHERE week_start = $3
         GROUP BY user_id, activity_type
       ),
       combined AS (
         SELECT u.id AS user_id,
                u.first_name,
                u.last_name,
                coalesce(tw.qty,0) AS this_qty,
                coalesce(lw.qty,0) AS last_qty,
                coalesce(pw.qty,0) AS prior_qty,
                COALESCE(tw.activity_type, lw.activity_type, pw.activity_type) AS activity_type
         FROM users u
         LEFT JOIN this_week tw ON tw.user_id = u.id
         LEFT JOIN last_week lw ON lw.user_id = u.id AND (tw.activity_type IS NULL OR lw.activity_type = tw.activity_type)
         LEFT JOIN prior_week pw ON pw.user_id = u.id AND (
            (tw.activity_type IS NOT NULL AND pw.activity_type = tw.activity_type) OR
            (tw.activity_type IS NULL AND lw.activity_type IS NOT NULL AND pw.activity_type = lw.activity_type)
         )
         WHERE u.role = 'ae' AND u.is_active = true
       )
       SELECT user_id, first_name, last_name, activity_type,
              SUM(this_qty) AS this_week,
              SUM(last_qty) AS last_week,
              SUM(prior_qty) AS prior_week
       FROM combined
       GROUP BY user_id, first_name, last_name, activity_type
       ORDER BY last_name, first_name, activity_type`,
      [thisWeekStart, lastWeekStart, priorWeekStart]
    );

    // Group per user
    const byUser: any = {};
    for (const r of result.rows) {
      const uid = r.user_id;
      if (!byUser[uid]) byUser[uid] = { userId: uid, firstName: r.first_name, lastName: r.last_name, activities: {} };
      const prior = Number(r.prior_week || 0);
      const last = Number(r.last_week || 0);
      byUser[uid].activities[r.activity_type] = {
        thisWeek: Number(r.this_week || 0),
        lastWeek: last,
        wowPct: prior === 0 ? null : Number(((last - prior) / prior * 100).toFixed(1))
      };
    }

    res.json({ users: Object.values(byUser) });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin daily totals per user for a given date
router.get('/admin/daily', authenticate, authorize('admin'), async (req, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT u.id as user_id, u.first_name, u.last_name, d.activity_type, COALESCE(d.total_quantity,0) as qty
       FROM users u
       LEFT JOIN activity_daily d ON d.user_id = u.id AND d.activity_date = $1
       WHERE u.role = 'ae' AND u.is_active = true
       ORDER BY u.last_name, u.first_name`,
      [date]
    );

    const byUser: any = {};
    for (const r of result.rows) {
      const uid = r.user_id;
      if (!byUser[uid]) byUser[uid] = { userId: uid, firstName: r.first_name, lastName: r.last_name, activities: {} };
      if (r.activity_type) byUser[uid].activities[r.activity_type] = Number(r.qty || 0);
    }
    res.json({ date, users: Object.values(byUser) });
  } catch (error) {
    console.error('Admin daily error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin weekly totals per user for a given week start
router.get('/admin/weekly', authenticate, authorize('admin'), async (req, res) => {
  try {
    const weekStart = (req.query.weekStart as string) || getWeekStartDate(new Date());
    const result = await pool.query(
      `SELECT u.id as user_id, u.first_name, u.last_name, w.activity_type, COALESCE(w.total_quantity,0) as qty
       FROM users u
       LEFT JOIN activity_weekly w ON w.user_id = u.id AND w.week_start = $1
       WHERE u.role = 'ae' AND u.is_active = true
       ORDER BY u.last_name, u.first_name`,
      [weekStart]
    );

    const byUser: any = {};
    for (const r of result.rows) {
      const uid = r.user_id;
      if (!byUser[uid]) byUser[uid] = { userId: uid, firstName: r.first_name, lastName: r.last_name, activities: {} };
      if (r.activity_type) byUser[uid].activities[r.activity_type] = Number(r.qty || 0);
    }
    res.json({ weekStart, users: Object.values(byUser) });
  } catch (error) {
    console.error('Admin weekly error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;