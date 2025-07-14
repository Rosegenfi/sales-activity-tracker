import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get all team updates
router.get('/', authenticate, async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT tu.*, u.first_name, u.last_name 
      FROM team_updates tu
      LEFT JOIN users u ON tu.created_by = u.id
    `;
    
    const values = [];
    
    if (category) {
      query += ' WHERE tu.category = $1';
      values.push(category);
    }
    
    query += ' ORDER BY tu.created_at DESC';
    
    const result = await pool.query(query, values);

    const updates = result.rows.map(update => ({
      id: update.id,
      title: update.title,
      content: update.content,
      category: update.category,
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
});

// Get updates by category
router.get('/categories', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM team_updates
      GROUP BY category
      ORDER BY category
    `);

    const categories = result.rows.map(row => ({
      name: row.category,
      count: parseInt(row.count)
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
  body('category').isIn(['presentations', 'tickets', 'events', 'qc_updates'])
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, category, fileUrl, externalLink } = req.body;

    const result = await pool.query(
      `INSERT INTO team_updates (title, content, category, file_url, external_link, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, content || null, category, fileUrl || null, externalLink || null, req.user!.id]
    );

    const update = result.rows[0];

    res.status(201).json({
      id: update.id,
      title: update.title,
      content: update.content,
      category: update.category,
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
  body('category').optional().isIn(['presentations', 'tickets', 'events', 'qc_updates'])
], async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, fileUrl, externalLink } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
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