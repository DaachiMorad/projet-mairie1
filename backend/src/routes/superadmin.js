const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const SUPER_SECRET = process.env.SUPER_ADMIN_SECRET || 'laronde_superadmin_2024';

function guard(req, res, next) {
  const secret = req.headers['x-super-secret'];
  if (secret !== SUPER_SECRET) return res.status(403).json({ error: 'Accès refusé' });
  next();
}

// GET /api/superadmin/stats
router.get('/stats', guard, async (req, res) => {
  try {
    const [[{ municipalities }]] = await db.query('SELECT COUNT(*) as municipalities FROM municipalities');
    const [[{ users }]] = await db.query('SELECT COUNT(*) as users FROM users');
    const [[{ bins }]] = await db.query('SELECT COUNT(*) as bins FROM bins WHERE status="active"');
    const [[{ collections }]] = await db.query('SELECT COUNT(*) as collections FROM collections WHERE DATE(collectedAt) = CURDATE()');
    res.json({ municipalities, users, bins, collectionsToday: collections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superadmin/municipalities
router.get('/municipalities', guard, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*,
        COUNT(DISTINCT u.id) as userCount,
        COUNT(DISTINCT b.id) as binCount
      FROM municipalities m
      LEFT JOIN users u ON u.municipalityId = m.id
      LEFT JOIN bins b ON b.municipalityId = m.id AND b.status = 'active'
      GROUP BY m.id
      ORDER BY m.createdAt DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/municipalities
router.post('/municipalities', guard, async (req, res) => {
  const { name, email, plan = 'basic' } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Nom et email requis' });
  try {
    const [exists] = await db.query('SELECT id FROM municipalities WHERE name = ?', [name]);
    if (exists.length > 0) return res.status(409).json({ error: 'Mairie déjà existante' });
    const id = uuidv4();
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    await db.query(
      'INSERT INTO municipalities (id, name, slug, email, plan) VALUES (?, ?, ?, ?, ?)',
      [id, name, slug, email, plan]
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/superadmin/municipalities/:id
router.patch('/municipalities/:id', guard, async (req, res) => {
  const { name, email, plan } = req.body;
  try {
    await db.query(
      'UPDATE municipalities SET name = COALESCE(?, name), email = COALESCE(?, email), plan = COALESCE(?, plan) WHERE id = ?',
      [name || null, email || null, plan || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/superadmin/municipalities/:id
router.delete('/municipalities/:id', guard, async (req, res) => {
  try {
    await db.query('DELETE FROM municipalities WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superadmin/users?municipalityId=xxx
router.get('/users', guard, async (req, res) => {
  try {
    const where = req.query.municipalityId ? 'WHERE u.municipalityId = ?' : '';
    const params = req.query.municipalityId ? [req.query.municipalityId] : [];
    const [rows] = await db.query(`
      SELECT u.id, u.email, u.firstName, u.lastName, u.role, u.sector, u.phone,
             u.isActive, u.lastLoginAt, u.createdAt,
             m.name as municipalityName
      FROM users u
      JOIN municipalities m ON u.municipalityId = m.id
      ${where}
      ORDER BY m.name, u.role, u.firstName
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/users
router.post('/users', guard, async (req, res) => {
  const { municipalityId, email, password, firstName, lastName, role = 'technicien', phone, sector } = req.body;
  if (!municipalityId || !email || !password || !firstName || !lastName)
    return res.status(400).json({ error: 'Champs requis manquants' });
  try {
    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length > 0) return res.status(409).json({ error: 'Email déjà utilisé' });
    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await db.query(
      'INSERT INTO users (id, municipalityId, email, passwordHash, firstName, lastName, role, phone, sector) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, municipalityId, email, hash, firstName, lastName, role, phone || null, sector || null]
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/superadmin/users/:id/password
router.patch('/users/:id/password', guard, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET passwordHash = ? WHERE id = ?', [hash, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/superadmin/users/:id
router.patch('/users/:id', guard, async (req, res) => {
  const { isActive, role, firstName, lastName, email, phone, sector } = req.body;
  try {
    await db.query(`
      UPDATE users SET
        isActive   = COALESCE(?, isActive),
        role       = COALESCE(?, role),
        firstName  = COALESCE(?, firstName),
        lastName   = COALESCE(?, lastName),
        email      = COALESCE(?, email),
        phone      = COALESCE(?, phone),
        sector     = COALESCE(?, sector)
      WHERE id = ?
    `, [
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      role || null, firstName || null, lastName || null,
      email || null, phone || null, sector || null,
      req.params.id
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/superadmin/users/:id
router.delete('/users/:id', guard, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
