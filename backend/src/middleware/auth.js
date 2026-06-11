const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token manquant' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret_laronde');
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

function chefOnly(req, res, next) {
  if (req.user.role !== 'chef') return res.status(403).json({ error: 'Accès refusé' });
  next();
}

module.exports = { auth, chefOnly };
