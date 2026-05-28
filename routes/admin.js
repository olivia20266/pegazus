// routes/admin.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../data/db');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

function logAudit(adminId, action, targetId, details={}) {
  db.audit_logs.unshift({ id:uuidv4(), adminId, action, targetId, details, ip: details.ip||'system', timestamp:new Date().toISOString() });
}

// ── GET /admin ─────────────────────────────────────────────────
router.get('/', adminMiddleware, (req, res) => {
  res.sendFile('admin.html', { root: './public' });
});

// ── GET /api/admin/stats ───────────────────────────────────────
router.get('/api/admin/stats', adminMiddleware, (req, res) => {
  const totalFunds    = db.wallets.reduce((s,w)=>s+w.balance,0);
  const pendingKYC    = db.users.filter(u=>u.kyc==='pending').length;
  const pendingWD     = db.withdrawals.filter(w=>w.status==='pending').length;
  const pendingWDAmt  = db.withdrawals.filter(w=>w.status==='pending').reduce((s,w)=>s+w.amount,0);
  const activeRobots  = db.robots.filter(r=>r.status==='active').length;

  res.json({
    users:       { total:db.users.filter(u=>u.role!=='admin').length, kyc_pending:pendingKYC, locked:db.users.filter(u=>u.locked).length },
    wallets:     { totalFunds: parseFloat(totalFunds.toFixed(2)), count:db.wallets.length },
    withdrawals: { pending:pendingWD, pendingAmount:parseFloat(pendingWDAmt.toFixed(2)) },
    robots:      { active:activeRobots, total:db.robots.length },
    recentLogs:  db.audit_logs.slice(0,8),
  });
});

// ── GET /api/admin/users ───────────────────────────────────────
router.get('/api/admin/users', adminMiddleware, (req, res) => {
  const users = db.users.filter(u=>u.role!=='admin').map(u => {
    const w = db.wallets.find(w=>w.userId===u.id)||{};
    const { passwordHash:_, ...safe } = u;
    return { ...safe, wallet:{ balance:w.balance||0, learningBalance:w.learningBalance||0, mt5Login:w.mt5Login||'—' } };
  });
  res.json({ users });
});

// ── GET /api/admin/wallets ─────────────────────────────────────
router.get('/api/admin/wallets', adminMiddleware, (req, res) => {
  const wallets = db.wallets.map(w => {
    const u = db.users.find(u=>u.id===w.userId)||{};
    return { ...w, userName:`${u.firstName||''} ${u.lastName||''}`.trim(), userEmail:u.email||'', kyc:u.kyc||'pending' };
  });
  res.json({ wallets });
});

// ── POST /api/admin/wallets/:userId/adjust ────────────────────
router.post('/api/admin/wallets/:userId/adjust', adminMiddleware, (req, res) => {
  const { userId } = req.params;
  const { type, amount, reason, note } = req.body;

  if (!['credit','debit'].includes(type))
    return res.status(400).json({ error: 'Type invalide' });
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Montant invalide' });
  if (!note || note.trim().length < 5) return res.status(400).json({ error: 'Note obligatoire (min 5 car.)' });

  const wallet = db.wallets.find(w=>w.userId===userId);
  if (!wallet) return res.status(404).json({ error: 'Wallet introuvable' });
  const user   = db.users.find(u=>u.id===userId);

  if (type==='debit' && amt>wallet.balance)
    return res.status(400).json({ error: 'Montant supérieur au solde disponible' });

  const prevBalance = wallet.balance;
  if (type==='credit') wallet.balance = parseFloat((wallet.balance+amt).toFixed(2));
  else                 wallet.balance = parseFloat((wallet.balance-amt).toFixed(2));
  wallet.freeMargin = parseFloat((wallet.balance-wallet.margin).toFixed(2));
  wallet.updatedAt  = new Date().toISOString();

  const tx = {
    id:uuidv4(), userId, type:'adjustment',
    amount: type==='credit' ? amt : -amt,
    source:`Admin — ${reason}`, adminNote:note, adminId:req.user.id,
    status:'completed', currency:'USD',
    description:`Ajustement admin (${type}) — ${reason}`,
    createdAt:new Date().toISOString(), completedAt:new Date().toISOString(),
  };
  db.transactions.push(tx);

  logAudit(req.user.id, `wallet.adjust.${type}`, userId, {
    amount:amt, reason, note,
    previousBalance:prevBalance, newBalance:wallet.balance,
    userName:`${user?.firstName} ${user?.lastName}`, ip: req.ip
  });

  res.json({
    message: `Solde ${type==='credit'?'crédité':'débité'} de $${amt}`,
    transaction:tx, wallet,
    delta: type==='credit'?+amt:-amt,
    previousBalance:prevBalance,
  });
});

// ── POST /api/admin/wallets/bulk-adjust ───────────────────────
router.post('/api/admin/wallets/bulk-adjust', adminMiddleware, (req, res) => {
  const { userIds, type, amount, reason, note } = req.body;
  if (!Array.isArray(userIds)||!userIds.length) return res.status(400).json({ error:'userIds requis' });
  if (userIds.length>100) return res.status(400).json({ error:'Maximum 100 utilisateurs' });
  const amt = parseFloat(amount);
  if (!amt||amt<=0) return res.status(400).json({ error:'Montant invalide' });
  if (!note||note.trim().length<5) return res.status(400).json({ error:'Note obligatoire' });

  let processed = 0;
  for (const uid of userIds) {
    const w = db.wallets.find(w=>w.userId===uid);
    if (!w) continue;
    if (type==='debit'&&amt>w.balance) continue;
    if (type==='credit') w.balance = parseFloat((w.balance+amt).toFixed(2));
    else                 w.balance = parseFloat((w.balance-amt).toFixed(2));
    w.freeMargin = parseFloat((w.balance-w.margin).toFixed(2));
    w.updatedAt  = new Date().toISOString();
    db.transactions.push({ id:uuidv4(), userId:uid, type:'adjustment', amount:type==='credit'?amt:-amt, source:`Admin — Bulk ${reason}`, adminNote:note, status:'completed', currency:'USD', createdAt:new Date().toISOString(), completedAt:new Date().toISOString() });
    processed++;
  }

  logAudit(req.user.id,'wallet.bulk_adjust',null,{count:processed,type,amount:amt,reason,note,ip:req.ip});
  res.json({ message:`Ajustement bulk : ${processed} wallets traités`, processed, type, amount:amt });
});

// ── GET /api/admin/kyc ─────────────────────────────────────────
router.get('/api/admin/kyc', adminMiddleware, (req, res) => {
  const list = db.users.filter(u=>u.role!=='admin').map(u=>({
    userId:u.id, name:`${u.firstName} ${u.lastName}`, email:u.email,
    country:u.country, kyc:u.kyc,
    doc:db.kyc_documents?.find(k=>k.userId===u.id)||null,
    createdAt:u.createdAt,
  }));
  res.json({ documents:list });
});

// ── POST /api/admin/kyc/:userId/approve ───────────────────────
router.post('/api/admin/kyc/:userId/approve', adminMiddleware, (req, res) => {
  const user = db.users.find(u=>u.id===req.params.userId);
  if (!user) return res.status(404).json({ error:'Utilisateur introuvable' });
  user.kyc = 'verified';
  user.kycVerifiedAt = new Date().toISOString();
  logAudit(req.user.id,'kyc.approve',user.id,{userName:`${user.firstName} ${user.lastName}`,ip:req.ip});
  res.json({ message:'KYC approuvé', userId:user.id });
});

// ── POST /api/admin/kyc/:userId/reject ────────────────────────
router.post('/api/admin/kyc/:userId/reject', adminMiddleware, (req, res) => {
  const { reason } = req.body;
  const user = db.users.find(u=>u.id===req.params.userId);
  if (!user) return res.status(404).json({ error:'Utilisateur introuvable' });
  if (!reason) return res.status(400).json({ error:'Motif obligatoire' });
  user.kyc = 'rejected';
  logAudit(req.user.id,'kyc.reject',user.id,{reason,userName:`${user.firstName} ${user.lastName}`,ip:req.ip});
  res.json({ message:'KYC rejeté', userId:user.id });
});

// ── GET /api/admin/withdrawals ─────────────────────────────────
router.get('/api/admin/withdrawals', adminMiddleware, (req, res) => {
  const list = db.withdrawals.map(w=>{
    const u = db.users.find(u=>u.id===w.userId)||{};
    return { ...w, userName:`${u.firstName||''} ${u.lastName||''}`, userEmail:u.email||'' };
  }).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  res.json({ withdrawals:list });
});

// ── POST /api/admin/withdrawals/:id/approve ───────────────────
router.post('/api/admin/withdrawals/:id/approve', adminMiddleware, (req, res) => {
  const wd = db.withdrawals.find(w=>w.id===req.params.id);
  if (!wd) return res.status(404).json({ error:'Retrait introuvable' });
  if (wd.status!=='pending') return res.status(400).json({ error:'Retrait déjà traité' });
  wd.status='completed'; wd.processedAt=new Date().toISOString(); wd.processedBy=req.user.id;
  // Mise à jour transaction
  const tx=db.transactions.find(t=>t.type==='withdrawal'&&t.userId===wd.userId&&t.status==='pending');
  if(tx) { tx.status='completed'; tx.completedAt=new Date().toISOString(); }
  logAudit(req.user.id,'withdrawal.approve',wd.userId,{amount:wd.amount,ip:req.ip});
  res.json({ message:'Retrait validé', withdrawal:wd });
});

// ── POST /api/admin/withdrawals/:id/reject ────────────────────
router.post('/api/admin/withdrawals/:id/reject', adminMiddleware, (req, res) => {
  const { reason } = req.body;
  const wd = db.withdrawals.find(w=>w.id===req.params.id);
  if (!wd) return res.status(404).json({ error:'Retrait introuvable' });
  if (wd.status!=='pending') return res.status(400).json({ error:'Retrait déjà traité' });

  // Recréditer le wallet
  const wallet=db.wallets.find(w=>w.userId===wd.userId);
  if(wallet){ wallet.balance=parseFloat((wallet.balance+wd.amount).toFixed(2)); wallet.freeMargin=parseFloat((wallet.balance-wallet.margin).toFixed(2)); }
  wd.status='rejected'; wd.rejectedAt=new Date().toISOString(); wd.rejectionReason=reason;
  logAudit(req.user.id,'withdrawal.reject',wd.userId,{amount:wd.amount,reason,ip:req.ip});
  res.json({ message:'Retrait rejeté et solde recrédité', withdrawal:wd });
});

// ── PATCH /api/admin/users/:userId/status ─────────────────────
router.patch('/api/admin/users/:userId/status', adminMiddleware, (req, res) => {
  const { status } = req.body;
  const user=db.users.find(u=>u.id===req.params.userId);
  if (!user) return res.status(404).json({ error:'Utilisateur introuvable' });
  if (!['active','locked','suspended'].includes(status)) return res.status(400).json({ error:'Statut invalide' });
  user.locked = status==='locked'||status==='suspended';
  logAudit(req.user.id,`user.status.${status}`,user.id,{ip:req.ip});
  res.json({ message:`Compte ${status}`, userId:user.id, locked:user.locked });
});

// ── GET /api/admin/robots ──────────────────────────────────────
router.get('/api/admin/robots', adminMiddleware, (req, res) => {
  // Mettre à jour les données robots
  db.robots.forEach(r=>{
    if(r.status==='active'){
      r.sessionPL  = parseFloat((r.sessionPL+(Math.random()-0.42)*12).toFixed(2));
      r.drawdown   = parseFloat(Math.max(0,Math.min(5,r.drawdown+(Math.random()-0.5)*0.2)).toFixed(2));
      r.positions  = Math.floor(Math.random()*3);
    }
  });
  const list=db.robots.map(r=>{
    const u=db.users.find(u=>u.id===r.userId)||{};
    return { ...r, userName:`${u.firstName||''} ${u.lastName||''}` };
  });
  res.json({ robots:list });
});

// ── POST /api/admin/robots/:userId/stop ───────────────────────
router.post('/api/admin/robots/:userId/stop', adminMiddleware, (req, res) => {
  const robot=db.robots.find(r=>r.userId===req.params.userId);
  if(robot) robot.status='stopped';
  logAudit(req.user.id,'robot.emergency_stop',req.params.userId,{ip:req.ip});
  res.json({ message:'Robot arrêté' });
});

// ── GET /api/admin/audit ───────────────────────────────────────
router.get('/api/admin/audit', adminMiddleware, (req, res) => {
  const logs=db.audit_logs.slice(0,100).map(l=>{
    const admin=db.users.find(u=>u.id===l.adminId);
    const target=db.users.find(u=>u.id===l.targetId);
    return { ...l,
      adminName: admin?`${admin.firstName} ${admin.lastName}`:'Système',
      targetName: target?`${target.firstName} ${target.lastName}`:l.targetId||'—',
    };
  });
  res.json({ logs });
});

// ── GET /api/admin/transactions ────────────────────────────────
router.get('/api/admin/transactions', adminMiddleware, (req, res) => {
  const txs = db.transactions.map(t=>{
    const u=db.users.find(u=>u.id===t.userId)||{};
    return { ...t, userName:`${u.firstName||''} ${u.lastName||''}` };
  }).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,100);
  res.json({ transactions:txs });
});

module.exports = router;
