// middleware/auth.js
const jwt = require('jsonwebtoken');
const { db } = require('../data/db');

const JWT_SECRET = process.env.JWT_SECRET || 'scalpbot_dev_secret_2024';

function authMiddleware(req, res, next) {
  // Chercher le token dans cookie ou Authorization header
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).json({ error: 'Non authentifié' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.users.find(u => u.id === payload.userId);
    if (!user || user.locked) {
      if (req.accepts('html')) return res.redirect('/login');
      return res.status(401).json({ error: 'Compte invalide ou verrouillé' });
    }
    req.user = user;
    next();
  } catch {
    if (req.accepts('html')) return res.redirect('/login');
    res.status(401).json({ error: 'Token invalide' });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      if (req.accepts('html')) return res.redirect('/wallet');
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    next();
  });
}

function generateToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authMiddleware, adminMiddleware, generateToken, JWT_SECRET };
