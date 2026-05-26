// server.js — ScalpBot HF — Serveur principal
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const path         = require('path');
const { seed }     = require('./data/db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Sécurité ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Fichiers statiques ────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ────────────────────────────────────────────────────
const authRoutes   = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const adminRoutes  = require('./routes/admin');

app.use('/',       authRoutes);
app.use('/',       walletRoutes);
app.use('/admin',  adminRoutes);

// ── Redirections ──────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/login'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status:'ok', uptime: process.uptime() }));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.accepts('html')) return res.redirect('/login');
  res.status(404).json({ error: 'Route introuvable' });
});

// ── Démarrage ─────────────────────────────────────────────────
seed().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║   ⚡ ScalpBot HF — Serveur démarré    ║
╠═══════════════════════════════════════╣
║  URL : http://localhost:${PORT}           ║
║                                       ║
║  Comptes de test :                    ║
║  admin@scalpbot.com / Admin@2024      ║
║  jean@gmail.com    / User@1234        ║
╚═══════════════════════════════════════╝
    `);
  });
});
