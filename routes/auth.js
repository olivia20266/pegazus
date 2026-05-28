// routes/auth.js
const express  = require('express');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { db }   = require('../data/db');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: 'Trop de tentatives' } });

function otp() { return Math.floor(100000 + Math.random() * 900000).toString(); }

// ── GET /login ────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.cookies?.token) return res.redirect('/wallet');
  res.sendFile('login.html', { root: './public' });
});

// ── GET /register ─────────────────────────────────────────────
router.get('/register', (req, res) => {
  res.sendFile('register.html', { root: './public' });
});

// ── POST /api/auth/register ───────────────────────────────────
router.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, birthDate,
            nationality, country, learningId, leverage } = req.body;

    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' });

    const exists = db.users.find(u => u.email === email.toLowerCase());
    if (exists) return res.status(409).json({ error: 'Email déjà utilisé' });

    const hash   = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    const user = {
      id: userId, firstName, lastName,
      email: email.toLowerCase(), phone: phone || '',
      passwordHash: hash, birthDate: birthDate || null,
      nationality: nationality || '', country: country || '',
      learningId: learningId || `LEARN-2024-${userId.slice(0,6).toUpperCase()}`,
      leverage: leverage || '1:50',
      role: 'user', kyc: 'pending', locked: false,
      loginAttempts: 0, twoFactorEnabled: true,
      createdAt: new Date().toISOString(), lastLoginAt: null,
    };

    const wallet = {
      id: uuidv4(), userId,
      balance: 0, equity: 0, margin: 0, freeMargin: 0,
      floatingPL: 0, learningBalance: 0, currency: 'USD',
      mt5Login: Math.floor(10000000 + Math.random()*89999999).toString(),
      mt5Server: 'ScalpBot-Live01',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    db.users.push(user);
    db.wallets.push(wallet);

    const token = generateToken(userId, user.role);
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*3600*1000, sameSite:'lax' });

    const { passwordHash: _, ...safe } = user;
    res.status(201).json({ message: 'Compte créé', user: safe, wallet, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email?.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });
  if (user.locked) return res.status(403).json({ error: 'Compte verrouillé' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    user.loginAttempts++;
    if (user.loginAttempts >= 5) user.locked = true;
    return res.status(401).json({ error: 'Identifiants incorrects', attemptsLeft: Math.max(0, 5 - user.loginAttempts) });
  }
  user.loginAttempts = 0;

  const code = otp();
  db.otp_codes = (db.otp_codes || []).filter(o => o.userId !== user.id);
  db.otp_codes.push({ userId: user.id, code, expiresAt: new Date(Date.now()+10*60*1000), used: false });
  console.log(`[2FA OTP] ${user.email} → ${code}`);

  res.json({ message: '2FA envoyé', userId: user.id,
    maskedPhone: user.phone ? `••••${user.phone.slice(-4)}` : null,
    devOtp: process.env.NODE_ENV !== 'production' ? code : undefined });
});

// ── POST /api/auth/verify-otp ─────────────────────────────────
router.post('/api/auth/verify-otp', (req, res) => {
  const { userId, otpCode } = req.body;
  const otp = (db.otp_codes||[]).find(o => o.userId === userId && o.code === otpCode && !o.used);
  if (!otp || new Date() > otp.expiresAt)
    return res.status(401).json({ error: 'Code invalide ou expiré' });
  otp.used = true;

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  user.lastLoginAt = new Date().toISOString();

  const token = generateToken(userId, user.role);
  res.cookie('token', token, { httpOnly: true, maxAge: 7*24*3600*1000, sameSite:'lax' });

  const { passwordHash: _, ...safe } = user;
  const wallet = db.wallets.find(w => w.userId === userId);
  res.json({ token, user: safe, wallet,
    redirect: user.role === 'admin' ? '/admin' : '/wallet' });
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Déconnecté' });
});

// ── GET /logout ───────────────────────────────────────────────
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = router;
