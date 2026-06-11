const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { auth, chefOnly } = require('../middleware/auth');

// GET /api/bins
router.get('/', auth, async (req, res) => {
  try {
    let sql, params;
    if (req.user.role === 'chef') {
      sql = `SELECT b.*, CONCAT(u.firstName, ' ', u.lastName) as assignedAgentName
             FROM bins b LEFT JOIN users u ON b.assignedUserId = u.id
             WHERE b.municipalityId = ? AND b.status = 'active'
             ORDER BY b.address`;
      params = [req.user.municipalityId];
    } else {
      sql = `SELECT b.*, CONCAT(u.firstName, ' ', u.lastName) as assignedAgentName
             FROM bins b LEFT JOIN users u ON b.assignedUserId = u.id
             WHERE b.municipalityId = ? AND b.assignedUserId = ? AND b.status = 'active'
             ORDER BY b.address`;
      params = [req.user.municipalityId, req.user.id];
    }
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bins
router.post('/', auth, chefOnly, async (req, res) => {
  const { address, neighborhood, latitude, longitude, type, frequency, sector, assignedUserId, notes } = req.body;
  if (!address) return res.status(400).json({ error: 'Adresse requise' });

  try {
    const id = uuidv4();
    await db.query(
      'INSERT INTO bins (id, municipalityId, address, neighborhood, latitude, longitude, type, frequency, sector, assignedUserId, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.municipalityId, address, neighborhood || null, latitude || null, longitude || null,
       type || 'ordures', frequency || 'hebdomadaire', sector || null, assignedUserId || null, notes || null]
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bins/:id (archive)
router.delete('/:id', auth, chefOnly, async (req, res) => {
  try {
    await db.query(
      "UPDATE bins SET status = 'archived' WHERE id = ? AND municipalityId = ?",
      [req.params.id, req.user.municipalityId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
