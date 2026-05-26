# ⚡ Pegazus — Plateforme de Trading
**Next.js 14 + Supabase (Auth + PostgreSQL + Storage)**

## Stack
| Couche | Tech |
|--------|------|
| Frontend | Next.js 14 App Router + React 18 |
| Backend | Next.js API Routes |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + OTP 2FA) |
| Sécurité DB | Row Level Security (RLS) |

---

## 1. Créer le projet Supabase
1. Aller sur **https://supabase.com** → New project
2. Copier votre **Project URL** et vos **clés** (Settings → API)
3. Remplir `.env.local` :
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 2. Créer les tables
Dans Supabase → **SQL Editor** → coller et exécuter `supabase-schema.sql`

## 3. Installer et lancer
```bash
npm install
npm run dev
# → http://localhost:3000
```

## 4. Seeder les données de démo
```bash
node seed.js
```

**Comptes créés :**
| Rôle | Email | Mot de passe |
|------|-------|-------------|
| 👑 Super Admin | admin@pegazus.com | Admin1234! |
| 👤 User KYC OK | jean@demo.com | Demo1234! |
| 👤 User pending | ama@demo.com | Demo1234! |

---

## Pages
| URL | Description | Accès |
|-----|-------------|-------|
| `/login` | Connexion + 2FA OTP | Public |
| `/register` | Inscription 3 étapes | Public |
| `/wallet` | Wallet, dépôt, retrait | Utilisateur |
| `/admin` | Dashboard admin complet | Admin |

## Routes API
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Login → génère OTP |
| POST | `/api/auth/otp` | Valider OTP 2FA |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/me` | Profil + wallet + tx |
| POST | `/api/wallet/deposit` | Dépôt |
| POST | `/api/wallet/withdraw` | Retrait (+ OTP) |
| POST | `/api/wallet/otp` | OTP retrait |
| GET | `/api/admin/stats` | Stats admin |
| GET | `/api/admin/users` | Liste users |
| POST | `/api/admin/users/[id]/adjust` | **Ajuster solde** |
| PATCH | `/api/admin/users/[id]/status` | Lock/unlock |
| PATCH | `/api/admin/kyc/[id]` | KYC approve/reject |
| PATCH | `/api/admin/withdrawals/[id]` | Valider retrait |

---

## Sécurité Supabase
- **RLS activé** sur toutes les tables
- Les utilisateurs ne voient que leurs propres données
- L'admin utilise `service_role_key` côté serveur uniquement (jamais exposée au client)
- Les OTP expirent après 10 minutes
- Comptes bloqués après 5 tentatives échouées

## Déploiement (Vercel)
```bash
# Variables d'env à configurer sur Vercel :
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=https://votre-domaine.vercel.app
```
