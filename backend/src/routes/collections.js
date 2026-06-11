const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { auth, chefOnly } = require('../middleware/auth');
const { broadcast } = require('./sse');

// POST /api/collections
router.post('/', auth, async (req, res) => {
  const { binId, gpsLatitude, gpsLongitude, gpsAccuracy } = req.body;
  if (!binId) return res.status(400).json({ error: 'binId requis' });

  try {
    // Vérifier que la poubelle appartient à la mairie
    const [bins] = await db.query(
      'SELECT b.*, CONCAT(u.firstName, " ", u.lastName) as agentName FROM bins b LEFT JOIN users u ON u.id = ? WHERE b.id = ? AND b.municipalityId = ? AND b.status = "active"',
      [req.user.id, binId, req.user.municipalityId]
    );
    if (!bins[0]) return res.status(404).json({ error: 'Poubelle introuvable' });

    // Vérifier pas déjà collectée aujourd'hui
    const [already] = await db.query(
      'SELECT id FROM collections WHERE binId = ? AND DATE(collectedAt) = CURDATE()',
      [binId]
    );
    if (already.length > 0) return res.status(409).json({ error: 'Déjà collectée aujourd\'hui' });

    const id = uuidv4();
    await db.query(
      'INSERT INTO collections (id, binId, userId, gpsLatitude, gpsLongitude, gpsAccuracy) VALUES (?, ?, ?, ?, ?, ?)',
      [id, binId, req.user.id, gpsLatitude || null, gpsLongitude || null, gpsAccuracy || null]
    );

    // Broadcast SSE
    const [users] = await db.query(
      'SELECT id FROM users WHERE municipalityId = ? AND role = "chef"',
      [req.user.municipalityId]
    );
    const [u] = await db.query('SELECT firstName, lastName FROM users WHERE id = ?', [req.user.id]);
    const agentName = u[0] ? `${u[0].firstName} ${u[0].lastName}` : '';
    users.forEach(chef => broadcast(chef.id, 'collection', {
      binId, binAddress: bins[0].address, agentName, collectedAt: new Date()
    }));

    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/collections/stats/dashboard
router.get('/stats/dashboard', auth, chefOnly, async (req, res) => {
  try {
    const mId = req.user.municipalityId;

    const [totalRows] = await db.query(
      'SELECT COUNT(*) as total FROM bins WHERE municipalityId = ? AND status = "active"', [mId]
    );
    const [collectedRows] = await db.query(
      `SELECT COUNT(DISTINCT c.binId) as collected FROM collections c
       JOIN bins b ON c.binId = b.id
       WHERE b.municipalityId = ? AND DATE(c.collectedAt) = CURDATE()`, [mId]
    );
    const [remarksRows] = await db.query(
      `SELECT COUNT(*) as cnt FROM remarks r JOIN bins b ON r.binId = b.id
       WHERE b.municipalityId = ? AND r.status = "open"`, [mId]
    );
    const [recent] = await db.query(
      `SELECT c.id, b.address as binAddress, CONCAT(u.firstName, ' ', u.lastName) as agentName, c.collectedAt
       FROM collections c
       JOIN bins b ON c.binId = b.id
       JOIN users u ON c.userId = u.id
       WHERE b.municipalityId = ? AND DATE(c.collectedAt) = CURDATE()
       ORDER BY c.collectedAt DESC LIMIT 10`, [mId]
    );

    const total = totalRows[0].total;
    const collected = collectedRows[0].collected;
    const remaining = total - collected;
    const progressPercent = total > 0 ? Math.round((collected / total) * 100) : 0;

    res.json({
      today: { total, collected, remaining, progressPercent },
      openRemarks: remarksRows[0].cnt,
      recentCollections: recent,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/collections/stats/agents
router.get('/stats/agents', auth, chefOnly, async (req, res) => {
  try {
    const mId = req.user.municipalityId;
    const [agents] = await db.query(
      'SELECT id, firstName, lastName, sector, isActive, lastLoginAt FROM users WHERE municipalityId = ? AND role = "technicien" ORDER BY firstName',
      [mId]
    );

    const result = await Promise.all(agents.map(async (agent) => {
      const [bins] = await db.query(
        `SELECT b.id, b.address, b.neighborhood, b.type,
           EXISTS(SELECT 1 FROM collections c WHERE c.binId = b.id AND DATE(c.collectedAt) = CURDATE()) as collectedToday
         FROM bins b WHERE b.assignedUserId = ? AND b.status = "active"`,
        [agent.id]
      );
      const [lastAct] = await db.query(
        `SELECT c.collectedAt, b.address FROM collections c JOIN bins b ON c.binId = b.id
         WHERE c.userId = ? ORDER BY c.collectedAt DESC LIMIT 1`, [agent.id]
      );

      const collected = bins.filter(b => b.collectedToday).length;
      const total = bins.length;
      return {
        ...agent,
        bins,
        total,
        collected,
        remaining: total - collected,
        progressPercent: total > 0 ? Math.round((collected / total) * 100) : 0,
        lastActivityAt: lastAct[0]?.collectedAt || null,
        lastActivityAddress: lastAct[0]?.address || null,
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/collections/stats/map  (pour l'agent — sa tournée du jour)
router.get('/stats/map', auth, async (req, res) => {
  try {
    let sql, params;
    if (req.user.role === 'chef') {
      sql = `SELECT b.id, b.address, b.neighborhood, b.type, b.latitude, b.longitude,
               EXISTS(SELECT 1 FROM collections c WHERE c.binId = b.id AND DATE(c.collectedAt) = CURDATE()) as collectedToday,
               (SELECT c2.collectedAt FROM collections c2 WHERE c2.binId = b.id AND DATE(c2.collectedAt) = CURDATE() LIMIT 1) as collectedAt,
               NULL as collectedBy
             FROM bins b WHERE b.municipalityId = ? AND b.status = "active" ORDER BY b.address`;
      params = [req.user.municipalityId];
    } else {
      sql = `SELECT b.id, b.address, b.neighborhood, b.type, b.latitude, b.longitude,
               EXISTS(SELECT 1 FROM collections c WHERE c.binId = b.id AND DATE(c.collectedAt) = CURDATE()) as collectedToday,
               (SELECT c2.collectedAt FROM collections c2 WHERE c2.binId = b.id AND DATE(c2.collectedAt) = CURDATE() LIMIT 1) as collectedAt,
               NULL as collectedBy
             FROM bins b WHERE b.municipalityId = ? AND b.assignedUserId = ? AND b.status = "active" ORDER BY b.address`;
      params = [req.user.municipalityId, req.user.id];
    }
    const [rows] = await db.query(sql, params);
    res.json(rows.map(r => ({ ...r, collectedToday: !!r.collectedToday })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
