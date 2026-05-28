// routes/wallet.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── GET /wallet ────────────────────────────────────────────────
router.get('/wallet', authMiddleware, (req, res) => {
  res.sendFile('wallet.html', { root: './public' });
});

// ── GET /api/wallet ────────────────────────────────────────────
router.get('/api/wallet', authMiddleware, (req, res) => {
  const wallet = db.wallets.find(w => w.userId === req.user.id);
  if (!wallet) return res.status(404).json({ error: 'Wallet introuvable' });

  // Fluctuation P&L temps réel simulée
  if (wallet.balance > 0) {
    wallet.floatingPL = parseFloat(((Math.random()-0.42)*wallet.balance*0.05).toFixed(2));
    wallet.equity     = parseFloat((wallet.balance + wallet.floatingPL).toFixed(2));
  }

  const txs = db.transactions
    .filter(t => t.userId === req.user.id)
    .sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))
    .slice(0,30);

  const robot = db.robots.find(r => r.userId === req.user.id) || null;
  const { passwordHash: _, ...safeUser } = req.user;
  res.json({ wallet, transactions: txs, robot, user: safeUser });
});

// ── POST /api/wallet/deposit/learning ─────────────────────────
router.post('/api/wallet/deposit/learning', authMiddleware, (req, res) => {
  const { amount } = req.body;
  const wallet = db.wallets.find(w => w.userId === req.user.id);
  if (!wallet) return res.status(404).json({ error: 'Wallet introuvable' });
  const amt = parseFloat(amount);
  if (!amt || amt < 50) return res.status(400).json({ error: 'Montant minimum : 50 USD' });
  if (amt > wallet.learningBalance) return res.status(400).json({ error: 'Solde formation insuffisant' });

  wallet.learningBalance = parseFloat((wallet.learningBalance - amt).toFixed(2));
  wallet.balance         = parseFloat((wallet.balance + amt).toFixed(2));
  wallet.freeMargin      = parseFloat((wallet.balance - wallet.margin).toFixed(2));
  wallet.updatedAt       = new Date().toISOString();

  const tx = {
    id: uuidv4(), userId: req.user.id,
    type: 'deposit', source: 'learning_platform',
    amount: amt, currency: 'USD', status: 'completed',
    description: 'Dépôt depuis site de formation',
    reference: `DEP-${Date.now()}`,
    createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
  };
  db.transactions.push(tx);
  logAudit(req.user.id, 'wallet.deposit.learning', req.user.id, { amount: amt });

  res.json({ message: 'Dépôt effectué', transaction: tx, wallet });
});

// ── POST /api/wallet/withdraw ─────────────────────────────────
router.post('/api/wallet/withdraw', authMiddleware, (req, res) => {
  const { amount, destination, otpCode } = req.body;
  const wallet = db.wallets.find(w => w.userId === req.user.id);
  if (!wallet) return res.status(404).json({ error: 'Wallet introuvable' });
  const amt = parseFloat(amount);
  if (!amt || amt < 20)          return res.status(400).json({ error: 'Montant minimum : 20 USD' });
  if (amt > wallet.freeMargin)   return res.status(400).json({ error: 'Solde disponible insuffisant' });

  // Vérification OTP
  const otp = (db.otp_codes||[]).find(o => o.userId===req.user.id && o.code===otpCode && !o.used);
  if (!otp || new Date()>otp.expiresAt) return res.status(401).json({ error: 'Code invalide' });
  otp.used = true;

  const status = destination === 'learning_platform' ? 'completed' : 'pending';
  if (destination === 'learning_platform') {
    wallet.learningBalance = parseFloat((wallet.learningBalance + amt).toFixed(2));
  }
  wallet.balance    = parseFloat((wallet.balance - amt).toFixed(2));
  wallet.freeMargin = parseFloat((wallet.balance - wallet.margin).toFixed(2));
  wallet.updatedAt  = new Date().toISOString();

  const wd = {
    id: uuidv4(), userId: req.user.id,
    user: `${req.user.firstName} ${req.user.lastName}`,
    amount, destination, iban: req.body.iban || '—',
    status, createdAt: new Date().toISOString(),
  };
  db.withdrawals.push(wd);

  const tx = {
    id: uuidv4(), userId: req.user.id,
    type: 'withdrawal', source: destination,
    amount: -amt, currency: 'USD', status,
    description: 'Retrait ' + (destination==='learning_platform'?'vers formation':'bancaire'),
    createdAt: new Date().toISOString(), completedAt: status==='completed'?new Date().toISOString():null,
  };
  db.transactions.push(tx);
  res.json({ message: 'Retrait initié', transaction: tx, wallet });
});

// ── POST /api/wallet/otp ───────────────────────────────────────
router.post('/api/wallet/otp', authMiddleware, (req, res) => {
  const code = Math.floor(100000+Math.random()*900000).toString();
  db.otp_codes = (db.otp_codes||[]).filter(o=>o.userId!==req.user.id);
  db.otp_codes.push({ userId:req.user.id, code, expiresAt:new Date(Date.now()+10*60*1000), used:false });
  console.log(`[WITHDRAW OTP] ${req.user.email} → ${code}`);
  res.json({ message:'Code envoyé', devOtp: process.env.NODE_ENV!=='production'?code:undefined });
});

// ── GET /api/user/me ───────────────────────────────────────────
router.get('/api/user/me', authMiddleware, (req, res) => {
  const { passwordHash: _, ...safe } = req.user;
  const wallet = db.wallets.find(w => w.userId === req.user.id);
  res.json({ user: safe, wallet });
});

// ── POST /api/kyc/submit ───────────────────────────────────────
router.post('/api/kyc/submit', authMiddleware, (req, res) => {
  const { documentType, documentNumber } = req.body;
  db.kyc_documents = (db.kyc_documents||[]).filter(k=>k.userId!==req.user.id);
  const kyc = {
    id:uuidv4(), userId:req.user.id, documentType, documentNumber,
    status:'pending', submittedAt:new Date().toISOString(),
  };
  db.kyc_documents.push(kyc);
  req.user.kyc = 'pending';
  res.json({ message:'KYC soumis', kyc });
});

function logAudit(adminId, action, targetId, details={}) {
  db.audit_logs.push({ id:uuidv4(), adminId, action, targetId, details, timestamp:new Date().toISOString() });
}

module.exports = router;
