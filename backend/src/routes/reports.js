const router = require('express').Router();
const db = require('../config/db');
const { auth, chefOnly } = require('../middleware/auth');

// GET /api/reports/recap?period=week|month|quarter
router.get('/recap', auth, chefOnly, async (req, res) => {
  const { period = 'week' } = req.query;
  const mId = req.user.municipalityId;

  const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;

  try {
    const [totalBins] = await db.query(
      'SELECT COUNT(*) as cnt FROM bins WHERE municipalityId = ? AND status = "active"', [mId]
    );
    const [totalCollections] = await db.query(
      `SELECT COUNT(*) as cnt FROM collections c JOIN bins b ON c.binId = b.id
       WHERE b.municipalityId = ? AND c.collectedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [mId, days]
    );
    const [byAgent] = await db.query(
      `SELECT u.id, u.firstName, u.lastName, u.sector, COUNT(c.id) as count
       FROM collections c JOIN users u ON c.userId = u.id JOIN bins b ON c.binId = b.id
       WHERE b.municipalityId = ? AND c.collectedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY u.id ORDER BY count DESC`, [mId, days]
    );
    const [byType] = await db.query(
      `SELECT b.type, COUNT(c.id) as count FROM collections c JOIN bins b ON c.binId = b.id
       WHERE b.municipalityId = ? AND c.collectedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY b.type`, [mId, days]
    );
    const [dailyChart] = await db.query(
      `SELECT DATE(c.collectedAt) as day, COUNT(*) as count FROM collections c JOIN bins b ON c.binId = b.id
       WHERE b.municipalityId = ? AND c.collectedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(c.collectedAt) ORDER BY day`, [mId, days]
    );
    const [remarks] = await db.query(
      `SELECT r.type, r.status, COUNT(*) as count FROM remarks r JOIN bins b ON r.binId = b.id
       WHERE b.municipalityId = ? AND r.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY r.type, r.status`, [mId, days]
    );

    const total = totalBins[0].cnt;
    const collections = totalCollections[0].cnt;
    const collectionRate = total > 0 ? Math.round((collections / (total * days)) * 100) : 0;

    res.json({
      period,
      totalCollections: collections,
      totalBins: total,
      collectionRate: Math.min(collectionRate, 100),
      dailyChart,
      byAgent,
      byType,
      remarks,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/monthly  (PDF simple)
router.post('/monthly', auth, chefOnly, async (req, res) => {
  const { month, year } = req.body;
  const mId = req.user.municipalityId;

  try {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport-${year}-${month}.pdf`);
    doc.pipe(res);

    const [muni] = await db.query('SELECT name FROM municipalities WHERE id = ?', [mId]);
    const [stats] = await db.query(
      `SELECT COUNT(DISTINCT c.binId) as bins, COUNT(*) as collections
       FROM collections c JOIN bins b ON c.binId = b.id
       WHERE b.municipalityId = ? AND MONTH(c.collectedAt) = ? AND YEAR(c.collectedAt) = ?`,
      [mId, month, year]
    );
    const [byAgent] = await db.query(
      `SELECT u.firstName, u.lastName, COUNT(c.id) as count
       FROM collections c JOIN users u ON c.userId = u.id JOIN bins b ON c.binId = b.id
       WHERE b.municipalityId = ? AND MONTH(c.collectedAt) = ? AND YEAR(c.collectedAt) = ?
       GROUP BY u.id ORDER BY count DESC`,
      [mId, month, year]
    );

    const monthNames = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

    doc.fontSize(22).font('Helvetica-Bold').text('LaRonde — Rapport mensuel', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text(`${monthNames[month]} ${year}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Mairie : ${muni[0]?.name || 'N/A'}`);
    doc.moveDown();
    doc.fontSize(16).font('Helvetica-Bold').text('Résumé');
    doc.fontSize(12).font('Helvetica');
    doc.text(`Total collectes : ${stats[0].collections}`);
    doc.text(`Poubelles collectées : ${stats[0].bins}`);
    doc.moveDown();

    if (byAgent.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Performance par agent');
      doc.fontSize(12).font('Helvetica');
      byAgent.forEach(a => {
        doc.text(`• ${a.firstName} ${a.lastName} : ${a.count} collectes`);
      });
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
