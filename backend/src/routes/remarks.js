const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { auth, chefOnly } = require('../middleware/auth');
const { broadcast } = require('./sse');

// POST /api/remarks
router.post('/', auth, async (req, res) => {
  const { binId, type, description } = req.body;
  if (!binId || !type) return res.status(400).json({ error: 'binId et type requis' });

  try {
    const id = uuidv4();
    await db.query(
      'INSERT INTO remarks (id, binId, userId, type, description) VALUES (?, ?, ?, ?, ?)',
      [id, binId, req.user.id, type, description || null]
    );

    // Broadcast to chefs
    const [bins] = await db.query('SELECT address, municipalityId FROM bins WHERE id = ?', [binId]);
    if (bins[0]) {
      const [chefs] = await db.query(
        'SELECT id FROM users WHERE municipalityId = ? AND role = "chef"',
        [bins[0].municipalityId]
      );
      chefs.forEach(chef => broadcast(chef.id, 'remark', { binId, binAddress: bins[0].address, type }));
    }

    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/remarks
router.get('/', auth, chefOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, b.address as binAddress, CONCAT(u.firstName, ' ', u.lastName) as agentName
       FROM remarks r JOIN bins b ON r.binId = b.id JOIN users u ON r.userId = u.id
       WHERE b.municipalityId = ? ORDER BY r.createdAt DESC`,
      [req.user.municipalityId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/remarks/:id/resolve
router.put('/:id/resolve', auth, chefOnly, async (req, res) => {
  try {
    await db.query('UPDATE remarks SET status = "resolved" WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
