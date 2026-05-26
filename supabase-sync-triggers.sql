-- ================================================================
--  PEGAZUS ↔ VERTEX MENTOR — Synchronisation bidirectionnelle
--  Coller dans SQL Editor APRÈS supabase-schema.sql
-- ================================================================

-- ── Extension HTTP pour appels sortants ──────────────────────────
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ── 1. TRIGGER : MAJ solde wallet → notifier Vertex ──────────────
CREATE OR REPLACE FUNCTION notify_vertex_balance_change()
RETURNS TRIGGER AS $$
DECLARE
  v_learning_id text;
  v_first_name  text;
  v_last_name   text;
BEGIN
  SELECT learning_id, first_name, last_name
  INTO v_learning_id, v_first_name, v_last_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF v_learning_id IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url     := 'https://vertex-mentor.com/api/pegazus/sync',
    headers := '{"Content-Type":"application/json","X-Pegazus-Key":"pegazus_api_k3y_vtx_2024"}'::jsonb,
    body    := jsonb_build_object(
      'event',            'wallet.updated',
      'pegazus_user_id',  NEW.user_id,
      'learning_id',      v_learning_id,
      'first_name',       v_first_name,
      'last_name',        v_last_name,
      'balance',          NEW.balance,
      'learning_balance', NEW.learning_balance,
      'delta_balance',    NEW.balance - OLD.balance,
      'delta_learning',   NEW.learning_balance - OLD.learning_balance,
      'timestamp',        now()
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_wallet_sync_to_vertex
  AFTER UPDATE ON public.wallets
  FOR EACH ROW
  WHEN (
    OLD.balance IS DISTINCT FROM NEW.balance OR
    OLD.learning_balance IS DISTINCT FROM NEW.learning_balance
  )
  EXECUTE FUNCTION notify_vertex_balance_change();

-- ── 2. TRIGGER : MAJ profil → notifier Vertex ────────────────────
CREATE OR REPLACE FUNCTION notify_vertex_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.learning_id IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url     := 'https://vertex-mentor.com/api/pegazus/sync',
    headers := '{"Content-Type":"application/json","X-Pegazus-Key":"pegazus_api_k3y_vtx_2024"}'::jsonb,
    body    := jsonb_build_object(
      'event',        'profile.updated',
      'learning_id',  NEW.learning_id,
      'kyc_status',   NEW.kyc_status,
      'status',       NEW.status,
      'role',         NEW.role,
      'timestamp',    now()
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_profile_sync_to_vertex
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.kyc_status IS DISTINCT FROM NEW.kyc_status OR
    OLD.status     IS DISTINCT FROM NEW.status OR
    OLD.role       IS DISTINCT FROM NEW.role
  )
  EXECUTE FUNCTION notify_vertex_profile_change();

-- ── 3. TRIGGER : Nouvelle transaction → notifier Vertex ──────────
CREATE OR REPLACE FUNCTION notify_vertex_new_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_learning_id text;
BEGIN
  SELECT learning_id INTO v_learning_id
  FROM public.profiles WHERE id = NEW.user_id;

  IF v_learning_id IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url     := 'https://vertex-mentor.com/api/pegazus/sync',
    headers := '{"Content-Type":"application/json","X-Pegazus-Key":"pegazus_api_k3y_vtx_2024"}'::jsonb,
    body    := jsonb_build_object(
      'event',        'transaction.created',
      'learning_id',  v_learning_id,
      'tx_id',        NEW.id,
      'type',         NEW.type,
      'amount',       NEW.amount,
      'status',       NEW.status,
      'description',  NEW.description,
      'timestamp',    now()
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_transaction_sync_to_vertex
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_vertex_new_transaction();

-- ── 4. VUE ADMIN UNIFIÉE ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.admin_unified_view AS
SELECT
  p.id                  AS pegazus_id,
  p.learning_id         AS vertex_id,
  p.first_name,
  p.last_name,
  p.country,
  p.role,
  p.kyc_status,
  p.status,
  p.created_at,
  w.balance             AS pegazus_balance,
  w.learning_balance    AS vertex_balance,
  w.equity,
  w.free_margin,
  w.mt5_login,
  COUNT(t.id)           AS total_transactions,
  COALESCE(SUM(CASE WHEN t.type='TRADE' AND t.amount>0 THEN t.amount ELSE 0 END),0) AS total_gains,
  COALESCE(SUM(CASE WHEN t.type='TRADE' AND t.amount<0 THEN t.amount ELSE 0 END),0) AS total_pertes
FROM public.profiles p
LEFT JOIN public.wallets w      ON w.user_id = p.id
LEFT JOIN public.transactions t ON t.user_id = p.id
GROUP BY p.id, p.learning_id, p.first_name, p.last_name,
         p.country, p.role, p.kyc_status, p.status, p.created_at,
         w.balance, w.learning_balance, w.equity, w.free_margin, w.mt5_login;

-- ── Vérification ─────────────────────────────────────────────────
SELECT 'Triggers créés avec succès ✅' AS statut;
