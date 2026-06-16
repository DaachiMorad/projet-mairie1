require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const binRoutes = require('./routes/bins');
const collectionRoutes = require('./routes/collections');
const remarkRoutes = require('./routes/remarks');
const reportRoutes = require('./routes/reports');
const sseRoutes = require('./routes/sse');
const superadminRoutes = require('./routes/superadmin');
const emailRoutes = require('./routes/email');

const app = express();

const ALLOWED_ORIGINS = [
  'https://projet-mairie1.vercel.app',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
    else cb(new Error('CORS non autorisé'));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-super-secret'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/bins', binRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/remarks', remarkRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sse', sseRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/email', emailRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`LaRonde backend running on port ${PORT}`);
  const db = require('./config/db');
  await db.init();
  startCronJobs(db);
});

function startCronJobs(db) {
  const cron = require('node-cron');
  const { sendRecapEmail, sendAlertEmail } = require('./services/mailer');

  async function sendRecapsToAll(period) {
    try {
      const days = period === 'week' ? 7 : 30;
      const [chefs] = await db.query(
        `SELECT u.email, u.municipalityId, m.name as mairie
         FROM users u JOIN municipalities m ON u.municipalityId = m.id
         WHERE u.role = 'chef' AND u.isActive = 1`
      );
      for (const chef of chefs) {
        const mId = chef.municipalityId;
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
        await sendRecapEmail(chef.email, { mairie: chef.mairie, period, totalCollections, totalBins, collectionRate, byAgent, byType, remarks });
      }
    } catch (err) {
      console.error('[CRON] Erreur envoi récap:', err.message);
    }
  }

  // Récap hebdomadaire — chaque lundi à 8h
  cron.schedule('0 8 * * 1', () => sendRecapsToAll('week'), { timezone: 'Europe/Paris' });

  // Récap mensuel — 1er de chaque mois à 8h
  cron.schedule('0 8 1 * *', () => sendRecapsToAll('month'), { timezone: 'Europe/Paris' });

  // Alerte fin de journée — chaque jour à 18h si >50% non collecté
  cron.schedule('0 18 * * *', async () => {
    try {
      const [chefs] = await db.query(
        `SELECT u.email, u.municipalityId, m.name as mairie
         FROM users u JOIN municipalities m ON u.municipalityId = m.id
         WHERE u.role = 'chef' AND u.isActive = 1`
      );
      for (const chef of chefs) {
        const mId = chef.municipalityId;
        const [total] = await db.query(
          'SELECT COUNT(*) as cnt FROM bins WHERE municipalityId = ? AND status = "active"', [mId]
        );
        const [collected] = await db.query(
          `SELECT COUNT(DISTINCT c.binId) as cnt FROM collections c JOIN bins b ON c.binId = b.id
           WHERE b.municipalityId = ? AND DATE(c.collectedAt) = CURDATE()`, [mId]
        );
        const t = total[0].cnt;
        const c = collected[0].cnt;
        if (t > 0 && (t - c) / t > 0.5) {
          await sendAlertEmail(
            chef.email,
            `⚠️ Alerte LaRonde — ${chef.mairie} : plus de 50% non collecté`,
            `Il est 18h et seulement <strong>${c}/${t}</strong> poubelles ont été collectées aujourd'hui (${Math.round((c/t)*100)}%).<br><br>Vérifiez l'avancement sur votre <a href="https://projet-mairie1.vercel.app/dashboard.html">tableau de bord</a>.`
          );
        }
      }
    } catch (err) {
      console.error('[CRON] Erreur alerte 18h:', err.message);
    }
  }, { timezone: 'Europe/Paris' });

  console.log('[CRON] Jobs email planifiés (lundi 8h, 1er du mois 8h, alerte 18h)');
}
