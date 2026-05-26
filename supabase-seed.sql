-- ================================================================
--  PEGAZUS — Setup initial (SANS comptes démo)
--  Coller dans SQL Editor APRÈS supabase-schema.sql
-- ================================================================

-- Crée uniquement le compte Super Admin Pegazus
-- Les utilisateurs réels s'inscrivent via /register ou depuis Vertex

-- ── Compte Super Admin ───────────────────────────────────────────
-- L'admin se connecte via Supabase Auth
-- Mot de passe à définir dans Supabase → Authentication → Users → Invite user
-- OU via le dashboard Supabase → Add user

-- Insérer le profil admin (après avoir créé le user dans Supabase Auth)
-- Remplacer 'VOTRE-UUID-ADMIN' par l'UUID généré dans Authentication → Users

/*
  ÉTAPES :
  1. Aller dans Supabase → Authentication → Users → Add user
  2. Email : admin@pegazus.io  |  Password : choisir un mot de passe fort
  3. Copier l'UUID généré
  4. Remplacer VOTRE-UUID-ADMIN ci-dessous et exécuter
*/

-- INSERT INTO public.profiles (
--   id, first_name, last_name, role, kyc_status, status, leverage
-- ) VALUES (
--   'VOTRE-UUID-ADMIN',
--   'Admin', 'Pegazus',
--   'SUPERADMIN', 'VERIFIED', 'ACTIVE', '1:50'
-- );

-- INSERT INTO public.wallets (
--   user_id, balance, equity, margin, free_margin,
--   floating_pl, learning_balance, currency, mt5_login, mt5_server
-- ) VALUES (
--   'VOTRE-UUID-ADMIN',
--   0, 0, 0, 0, 0, 0, 'USD',
--   '00000001', 'Pegazus-Live01'
-- );

-- ── Vérification tables créées ───────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles','wallets','transactions',
    'kyc_documents','otp_codes','audit_logs','trades'
  )
ORDER BY table_name;

