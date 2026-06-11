const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { auth, chefOnly } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  try {
    const [rows] = await db.query(
      `SELECT u.*, m.name as municipalityName, m.slug as municipalitySlug
       FROM users u JOIN municipalities m ON u.municipalityId = m.id
       WHERE u.email = ? AND u.isActive = 1`,
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' });

    await db.query('UPDATE users SET lastLoginAt = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, role: user.role, municipalityId: user.municipalityId },
      process.env.JWT_SECRET || 'secret_laronde',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        sector: user.sector,
        municipalityId: user.municipalityId,
        municipalityName: user.municipalityName,
        municipalitySlug: user.municipalitySlug,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/agents
router.get('/agents', auth, chefOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, email, firstName, lastName, sector, phone, isActive, lastLoginAt FROM users WHERE municipalityId = ? AND role = "technicien" ORDER BY firstName',
      [req.user.municipalityId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/agents
router.post('/agents', auth, chefOnly, async (req, res) => {
  const { email, password, firstName, lastName, phone, sector } = req.body;
  if (!email || !password || !firstName || !lastName)
    return res.status(400).json({ error: 'Champs requis manquants' });

  try {
    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length > 0) return res.status(409).json({ error: 'Email déjà utilisé' });

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await db.query(
      'INSERT INTO users (id, municipalityId, email, passwordHash, firstName, lastName, role, phone, sector) VALUES (?, ?, ?, ?, ?, ?, "technicien", ?, ?)',
      [id, req.user.municipalityId, email, hash, firstName, lastName, phone || null, sector || null]
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/agents/:id
router.put('/agents/:id', auth, chefOnly, async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET isActive = ? WHERE id = ? AND municipalityId = ?',
      [req.body.isActive ? 1 : 0, req.params.id, req.user.municipalityId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { municipalityName, firstName, lastName, email, password } = req.body;
  if (!municipalityName || !firstName || !lastName || !email || !password)
    return res.status(400).json({ error: 'Champs requis manquants' });
  try {
    const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length > 0) return res.status(409).json({ error: 'Email déjà utilisé' });
    const { v4: uuidv4 } = require('uuid');
    const bcrypt = require('bcryptjs');
    const mId = uuidv4();
    const uId = uuidv4();
    await db.query('INSERT INTO municipalities (id, name, slug, email) VALUES (?, ?, ?, ?)',
      [mId, municipalityName, municipalityName.toLowerCase().replace(/\s+/g,'-'), email]);
    const hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (id, municipalityId, email, passwordHash, firstName, lastName, role) VALUES (?, ?, ?, ?, ?, ?, "chef")',
      [uId, mId, email, hash, firstName, lastName]);
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: uId, role: 'chef', municipalityId: mId }, process.env.JWT_SECRET || 'secret_laronde', { expiresIn: '30d' });
    res.status(201).json({ token, user: { id: uId, email, firstName, lastName, role: 'chef', municipalityId: mId, municipalityName } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
