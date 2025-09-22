import { Router, Response, RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

const ALLOWED_CATEGORIES = [
  'start_here',
  'cold_calling',
  'prospecting',
  'cos_qc_onboarding',
  'performance_accountability',
  'product_market',
  'training_development',
  'client_templates_proposals',
  'meetings_internal_comms',
  // Backward compatibility
  'presentations',
  'tickets',
  'events',
  'qc_updates',
];

// Get all team updates
router.get('/', authenticate as RequestHandler, (async (req, res) => {
  try {
    const { category, section, q } = req.query as { category?: string; section?: string; q?: string };
    
    let query = `
      SELECT tu.*, u.first_name, u.last_name 
      FROM team_updates tu
      LEFT JOIN users u ON tu.created_by = u.id
    `;
    
    const values: any[] = [];
    
    const where: string[] = [];
    if (category) {
      where.push(`tu.category = $${values.length + 1}`);
      values.push(category);
    }
    if (section) {
      where.push(`LOWER(tu.section) = LOWER($${values.length + 1})`);
      values.push(section);
    }
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      where.push(`(tu.title ILIKE $${values.length + 1} OR tu.content ILIKE $${values.length + 2})`);
      values.push(like, like);
    }
    if (where.length) {
      query += ' WHERE ' + where.join(' AND ');
    }
    
    query += ' ORDER BY tu.created_at DESC';
    
    const result = await pool.query(query, values);

    const updates = result.rows.map((update: any) => ({
      id: update.id,
      title: update.title,
      content: update.content,
      category: update.category,
      section: update.section,
      fileUrl: update.file_url,
      externalLink: update.external_link,
      createdBy: update.created_by ? {
        id: update.created_by,
        name: `${update.first_name} ${update.last_name}`
      } : null,
      createdAt: update.created_at,
      updatedAt: update.updated_at
    }));

    res.json(updates);
  } catch (error) {
    console.error('Get team updates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

// Get single update and record recent view
router.get('/:id', authenticate as RequestHandler, (async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT tu.*, u.first_name, u.last_name 
       FROM team_updates tu
       LEFT JOIN users u ON tu.created_by = u.id
       WHERE tu.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team update not found' });
    }

    // Upsert recent view for this user
    await pool.query(
      `INSERT INTO user_recent_update_views (user_id, update_id, viewed_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id, update_id) DO UPDATE SET viewed_at = EXCLUDED.viewed_at`,
      [req.user!.id, id]
    );

    const update = result.rows[0];
    res.json({
      id: update.id,
      title: update.title,
      content: update.content,
      category: update.category,
      section: update.section,
      fileUrl: update.file_url,
      externalLink: update.external_link,
      createdBy: update.created_by ? {
        id: update.created_by,
        name: `${update.first_name} ${update.last_name}`
      } : null,
      createdAt: update.created_at,
      updatedAt: update.updated_at
    });
  } catch (error) {
    console.error('Get team update by id error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

// Favorites: add
router.post('/:id/favorite', authenticate as RequestHandler, (async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query(
      `INSERT INTO user_favorite_updates (user_id, update_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, update_id) DO NOTHING`,
      [req.user!.id, id]
    );
    res.status(204).send();
  } catch (error) {
    console.error('Favorite add error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

// Favorites: remove
router.delete('/:id/favorite', authenticate as RequestHandler, (async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query(
      `DELETE FROM user_favorite_updates WHERE user_id = $1 AND update_id = $2`,
      [req.user!.id, id]
    );
    res.status(204).send();
  } catch (error) {
    console.error('Favorite remove error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

// Favorites: list for current user
router.get('/me/favorites', authenticate as RequestHandler, (async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT tu.*
       FROM user_favorite_updates f
       INNER JOIN team_updates tu ON tu.id = f.update_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows.map((update: any) => ({
      id: update.id,
      title: update.title,
      content: update.content,
      category: update.category,
      section: update.section,
      fileUrl: update.file_url,
      externalLink: update.external_link,
      createdAt: update.created_at,
      updatedAt: update.updated_at
    })));
  } catch (error) {
    console.error('Favorite list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

// Recents: list for current user
router.get('/me/recents', authenticate as RequestHandler, (async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT tu.*
       FROM user_recent_update_views v
       INNER JOIN team_updates tu ON tu.id = v.update_id
       WHERE v.user_id = $1
       ORDER BY v.viewed_at DESC
       LIMIT 20`,
      [req.user!.id]
    );
    res.json(result.rows.map((update: any) => ({
      id: update.id,
      title: update.title,
      content: update.content,
      category: update.category,
      section: update.section,
      fileUrl: update.file_url,
      externalLink: update.external_link,
      createdAt: update.created_at,
      updatedAt: update.updated_at
    })));
  } catch (error) {
    console.error('Recents list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}) as RequestHandler);

// Get updates by category
router.get('/categories', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM team_updates
      GROUP BY category
      ORDER BY category
    `);

    // Normalize to allowed categories set and include zeros for missing
    const countsMap: Record<string, number> = {};
    for (const row of result.rows as any[]) {
      const key = row.category || '';
      countsMap[key] = (parseInt(row.count) || 0);
    }

    const categories = ALLOWED_CATEGORIES.map((cat) => ({
      name: cat,
      count: countsMap[cat] || 0,
    }));

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create team update (Admin only)
router.post('/', [
  authenticate,
  authorize('admin'),
  body('title').notEmpty().trim(),
  body('category').isIn(ALLOWED_CATEGORIES),
  body('section').optional().isString().trim().isLength({ max: 100 }),
  body('externalLink').optional().isString().isLength({ max: 500 }),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, category, section, fileUrl, externalLink } = req.body;

    const result = await pool.query(
      `INSERT INTO team_updates (title, content, category, section, file_url, external_link, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, content || null, category, section || null, fileUrl || null, externalLink || null, req.user!.id]
    );

    const update = result.rows[0];

    res.status(201).json({
      id: update.id,
      title: update.title,
      content: update.content,
      category: update.category,
      section: update.section,
      fileUrl: update.file_url,
      externalLink: update.external_link,
      createdBy: {
        id: req.user!.id,
        name: req.user!.email
      },
      createdAt: update.created_at
    });
  } catch (error) {
    console.error('Create team update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update team update (Admin only)
router.put('/:id', [
  authenticate,
  authorize('admin'),
  body('title').optional().notEmpty().trim(),
  body('category').optional().isIn(ALLOWED_CATEGORIES),
  body('section').optional().isString().trim().isLength({ max: 100 }),
  body('externalLink').optional().isString().isLength({ max: 500 }),
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, category, section, fileUrl, externalLink } = req.body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      values.push(title);
    }

    if (content !== undefined) {
      paramCount++;
      updates.push(`content = $${paramCount}`);
      values.push(content);
    }

    if (category !== undefined) {
      paramCount++;
      updates.push(`category = $${paramCount}`);
      values.push(category);
    }

    if (section !== undefined) {
      paramCount++;
      updates.push(`section = $${paramCount}`);
      values.push(section);
    }

    if (fileUrl !== undefined) {
      paramCount++;
      updates.push(`file_url = $${paramCount}`);
      values.push(fileUrl);
    }

    if (externalLink !== undefined) {
      paramCount++;
      updates.push(`external_link = $${paramCount}`);
      values.push(externalLink);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    paramCount++;
    values.push(id);

    const query = `
      UPDATE team_updates 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team update not found' });
    }

    const update = result.rows[0];

    res.json({
      id: update.id,
      title: update.title,
      content: update.content,
      category: update.category,
      section: update.section,
      fileUrl: update.file_url,
      externalLink: update.external_link,
      updatedAt: update.updated_at
    });
  } catch (error) {
    console.error('Update team update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete team update (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM team_updates WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Team update not found' });
    }

    res.json({ message: 'Team update deleted successfully' });
  } catch (error) {
    console.error('Delete team update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;