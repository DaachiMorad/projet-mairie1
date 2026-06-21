const router = require('express').Router();
const db = require('../config/db');
const { auth, chefOnly } = require('../middleware/auth');
const { sendTestEmail, sendRecapEmail } = require('../services/mailer');

// POST /api/email/test
router.post('/test', auth, async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'Adresse email requise' });
  try {
    await sendTestEmail(to);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Échec envoi : ' + err.message });
  }
});

// POST /api/email/recap  — envoie un récap manuel
router.post('/recap', auth, chefOnly, async (req, res) => {
  const { to, period = 'week' } = req.body;
  if (!to) return res.status(400).json({ error: 'Adresse email requise' });

  const mId = req.user.municipalityId;
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;

  try {
    const [muniRows] = await db.query('SELECT name FROM municipalities WHERE id = ?', [mId]);
    const mairie = muniRows[0]?.name || 'Votre mairie';

    const [totalBinsRows] = await db.query(
      'SELECT COUNT(*) as cnt FROM bins WHERE municipalityId = ? AND status = "active"', [mId]
    );
    const [totalCollRows] = await db.query(
      `SELECT COUNT(*) as cnt FROM collections c JOIN bins b ON c.binId = b.id
       WHERE b.municipalityId = ? AND c.collectedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [mId, days]
    );
    const [byAgent] = await db.query(
      `SELECT u.firstName, u.lastName, COUNT(c.id) as count
       FROM collections c JOIN users u ON c.userId = u.id JOIN bins b ON c.binId = b.id
       WHERE b.municipalityId = ? AND c.collectedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY u.id ORDER BY count DESC`, [mId, days]
    );
    const [byType] = await db.query(
      `SELECT b.type, COUNT(c.id) as count FROM collections c JOIN bins b ON c.binId = b.id
       WHERE b.municipalityId = ? AND c.collectedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY b.type`, [mId, days]
    );
    const [remarks] = await db.query(
      `SELECT r.type, r.status, COUNT(*) as count FROM remarks r JOIN bins b ON r.binId = b.id
       WHERE b.municipalityId = ? AND r.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY r.type, r.status`, [mId, days]
    );

    const totalBins = totalBinsRows[0].cnt;
    const totalCollections = totalCollRows[0].cnt;
    const collectionRate = totalBins > 0 ? Math.min(Math.round((totalCollections / (totalBins * days)) * 100), 100) : 0;

    await sendRecapEmail(to, { mairie, period, totalCollections, totalBins, collectionRate, byAgent, byType, remarks });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Échec envoi : ' + err.message });
  }
});

module.exports = router;
