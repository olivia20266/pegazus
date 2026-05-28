// data/db.js — Base de données en mémoire (remplaçable par PostgreSQL/MongoDB)
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const db = {
  users: [],
  wallets: [],
  transactions: [],
  kyc_documents: [],
  otp_codes: [],
  audit_logs: [],
  robots: [],
  withdrawals: [],
};

// ─── Seed initial ─────────────────────────────────────────────
async function seed() {
  if (db.users.length > 0) return;

  const adminHash = await bcrypt.hash('Admin@2024', 12);
  const userHash  = await bcrypt.hash('User@1234', 12);

  const users = [
    { id:'u1', firstName:'Super',   lastName:'Admin',    email:'admin@scalpbot.com',   phone:'+33600000001', role:'admin',   kyc:'verified', country:'France',   nationality:'Française', leverage:'1:50',  locked:false, passwordHash: adminHash },
    { id:'u2', firstName:'Jean',    lastName:'Dupont',   email:'jean@gmail.com',        phone:'+33612345678', role:'user',    kyc:'verified', country:'France',   nationality:'Française', leverage:'1:50',  locked:false, passwordHash: userHash  },
    { id:'u3', firstName:'Ama',     lastName:'Kofi',     email:'ama@yahoo.com',         phone:'+24177001122', role:'user',    kyc:'pending',  country:'Gabon',    nationality:'Gabonaise', leverage:'1:100', locked:false, passwordHash: userHash  },
    { id:'u4', firstName:'Marie',   lastName:'Dubois',   email:'marie@outlook.com',     phone:'+32476543210', role:'user',    kyc:'verified', country:'Belgique', nationality:'Belge',     leverage:'1:200', locked:false, passwordHash: userHash  },
    { id:'u5', firstName:'Kwame',   lastName:'Asante',   email:'kwame@gmail.com',       phone:'+23350112233', role:'user',    kyc:'pending',  country:'Ghana',    nationality:'Autre',     leverage:'1:50',  locked:false, passwordHash: userHash  },
    { id:'u6', firstName:'Sophie',  lastName:'Lefebvre', email:'sophie@gmail.com',      phone:'+41791234567', role:'user',    kyc:'rejected', country:'Suisse',   nationality:'Autre',     leverage:'1:10',  locked:true,  passwordHash: userHash  },
    { id:'u7', firstName:'Omar',    lastName:'Ba',       email:'omar@orange.sn',        phone:'+22177889900', role:'user',    kyc:'pending',  country:'Sénégal',  nationality:'Sénégalaise',leverage:'1:100',locked:false, passwordHash: userHash  },
    { id:'u8', firstName:'Claire',  lastName:'Monet',    email:'claire@free.fr',        phone:'+33698765432', role:'user',    kyc:'verified', country:'France',   nationality:'Française', leverage:'1:50',  locked:false, passwordHash: userHash  },
    { id:'u9', firstName:'Eric',    lastName:'Nzamba',   email:'eric@gmail.com',        phone:'+24166778899', role:'user',    kyc:'pending',  country:'Gabon',    nationality:'Gabonaise', leverage:'1:50',  locked:false, passwordHash: userHash  },
  ];

  for (const u of users) {
    db.users.push({
      ...u,
      learningId:      `LEARN-2024-${u.id.toUpperCase()}`,
      loginAttempts:   0,
      createdAt:       new Date(Date.now() - Math.random()*30*86400000).toISOString(),
      lastLoginAt:     new Date(Date.now() - Math.random()*2*86400000).toISOString(),
      securityQuestion:'Nom de votre premier animal ?',
      securityAnswer:  '',
      twoFactorEnabled: true,
    });

    const balance       = u.role === 'admin' ? 0 : Math.floor(Math.random() * 8000 + 200);
    const margin        = Math.floor(balance * Math.random() * 0.15);
    const floatPL       = parseFloat(((Math.random() - 0.4) * balance * 0.06).toFixed(2));
    const learningBal   = Math.floor(Math.random() * 1200 + 100);

    db.wallets.push({
      id:             uuidv4(),
      userId:         u.id,
      balance,
      equity:         balance + floatPL,
      margin,
      freeMargin:     balance - margin,
      floatingPL:     floatPL,
      learningBalance: learningBal,
      currency:       'USD',
      mt5Login:       (10000000 + parseInt(u.id.slice(1)) * 1234567).toString(),
      mt5Server:      'ScalpBot-Live01',
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    });

    // Transactions seed
    if (u.role !== 'admin') {
      for (let i = 0; i < Math.floor(Math.random()*5+2); i++) {
        db.transactions.push({
          id:          uuidv4(),
          userId:      u.id,
          type:        i === 0 ? 'deposit' : ['deposit','deposit','withdrawal','adjustment'][Math.floor(Math.random()*4)],
          amount:      parseFloat((Math.random()*800+100).toFixed(2)) * (Math.random()>0.8?-1:1),
          source:      'learning_platform',
          status:      'completed',
          description: 'Dépôt depuis site de formation',
          createdAt:   new Date(Date.now() - (i*3+Math.random())*86400000).toISOString(),
          completedAt: new Date(Date.now() - (i*3)*86400000).toISOString(),
        });
      }

      // Robot
      if (u.kyc === 'verified') {
        db.robots.push({
          id:         uuidv4(),
          userId:     u.id,
          symbol:     ['EURUSD','GBPUSD','USDJPY','XAUUSD'][Math.floor(Math.random()*4)],
          timeframe:  'M1',
          status:     Math.random() > 0.35 ? 'active' : 'stopped',
          positions:  Math.floor(Math.random()*3),
          sessionPL:  parseFloat(((Math.random()-0.4)*150).toFixed(2)),
          drawdown:   parseFloat((Math.random()*3).toFixed(2)),
          startedAt:  new Date(Date.now() - Math.random()*8*3600000).toISOString(),
        });
      }
    }
  }

  // Audit logs seed
  db.audit_logs.push(
    { id:uuidv4(), adminId:'u1', action:'system.start',         targetId:null, details:{}, timestamp: new Date().toISOString() },
    { id:uuidv4(), adminId:'u1', action:'kyc.approve',          targetId:'u2', details:{}, timestamp: new Date(Date.now()-86400000).toISOString() },
    { id:uuidv4(), adminId:'u1', action:'wallet.adjust.credit', targetId:'u4', details:{amount:1000,reason:'bonus'}, timestamp: new Date(Date.now()-2*86400000).toISOString() },
  );

  // Withdrawals pending
  db.withdrawals.push(
    { id:uuidv4(), userId:'u2', user:'Jean Dupont',  amount:500,  destination:'learning_platform', iban:'—',                      status:'pending', createdAt: new Date(Date.now()-3600000).toISOString() },
    { id:uuidv4(), userId:'u4', user:'Marie Dubois', amount:2700, destination:'bank_wire',          iban:'FR76 3000 XXXX 1234',    status:'pending', createdAt: new Date(Date.now()-86400000).toISOString() },
    { id:uuidv4(), userId:'u8', user:'Claire Monet', amount:1200, destination:'learning_platform', iban:'—',                      status:'completed',createdAt: new Date(Date.now()-3*86400000).toISOString() },
  );

  console.log('✅ DB seeded:', db.users.length, 'users,', db.wallets.length, 'wallets');
}

module.exports = { db, seed };
