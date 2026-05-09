-- =====================================================================
-- Bridge Progression — Slice 1b schema
-- =====================================================================
-- Run this in the Supabase SQL editor for project nwtfrlxgydbeuqfcftzn.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
--
-- Tables:
--   pilot_coins         — current balance, one row per pilot
--   pilot_achievements  — one row per (pilot, achievement key); idempotent
--   pilot_coin_log      — append-only audit trail of every coin change
--   pilot_decor         — owned + auto-placed decor (one row per slot)
--
-- Functions (called by apps via supabase-js .rpc()):
--   award_coins(pilot, amount, reason)
--   award_achievement(pilot, key, coin_amount, meta)  — idempotent
--   purchase_decor(pilot, slot_key, item_key, price)  — atomic check + buy
-- =====================================================================

-- ---------- TABLES ----------

CREATE TABLE IF NOT EXISTS pilot_coins (
  pilot_id   uuid PRIMARY KEY REFERENCES pilots(id) ON DELETE CASCADE,
  balance    integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pilot_achievements (
  pilot_id   uuid NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  key        text NOT NULL,
  meta       jsonb,
  earned_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pilot_id, key)
);

CREATE TABLE IF NOT EXISTS pilot_coin_log (
  id         bigserial PRIMARY KEY,
  pilot_id   uuid NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  amount     integer NOT NULL,
  reason     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pilot_coin_log_pilot_id_created_at_idx
  ON pilot_coin_log (pilot_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pilot_decor (
  pilot_id   uuid NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  slot_key   text NOT NULL,
  item_key   text NOT NULL,
  placed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pilot_id, slot_key)
);

-- ---------- ROW LEVEL SECURITY ----------
-- The pilots table uses the anon key; new tables follow the same pattern.
-- Anyone with the anon key can read/write — same trust model as pilots.
-- (Personal sandbox; no real PII; the only "leaderboard" is your own room.)

ALTER TABLE pilot_coins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_coin_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_decor        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilot_coins_anon_all        ON pilot_coins;
DROP POLICY IF EXISTS pilot_achievements_anon_all ON pilot_achievements;
DROP POLICY IF EXISTS pilot_coin_log_anon_all     ON pilot_coin_log;
DROP POLICY IF EXISTS pilot_decor_anon_all        ON pilot_decor;

CREATE POLICY pilot_coins_anon_all
  ON pilot_coins FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY pilot_achievements_anon_all
  ON pilot_achievements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY pilot_coin_log_anon_all
  ON pilot_coin_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY pilot_decor_anon_all
  ON pilot_decor FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ---------- FUNCTIONS ----------

-- award_coins: bumps balance + logs the change atomically.
-- Returns the new balance.
CREATE OR REPLACE FUNCTION award_coins(
  p_pilot_id uuid,
  p_amount   integer,
  p_reason   text
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance integer;
BEGIN
  INSERT INTO pilot_coins (pilot_id, balance, updated_at)
  VALUES (p_pilot_id, p_amount, now())
  ON CONFLICT (pilot_id) DO UPDATE
    SET balance    = pilot_coins.balance + EXCLUDED.balance,
        updated_at = now()
  RETURNING balance INTO new_balance;

  INSERT INTO pilot_coin_log (pilot_id, amount, reason)
  VALUES (p_pilot_id, p_amount, p_reason);

  RETURN new_balance;
END;
$$;

-- award_achievement: inserts the achievement row IF NEW, and grants coins
-- only on first insert. Returns true if newly awarded, false if already had it.
-- This is the idempotent "you can't earn the same trophy twice" guarantee.
CREATE OR REPLACE FUNCTION award_achievement(
  p_pilot_id uuid,
  p_key      text,
  p_amount   integer,
  p_reason   text,
  p_meta     jsonb DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  was_inserted boolean;
BEGIN
  INSERT INTO pilot_achievements (pilot_id, key, meta)
  VALUES (p_pilot_id, p_key, p_meta)
  ON CONFLICT (pilot_id, key) DO NOTHING;

  GET DIAGNOSTICS was_inserted = ROW_COUNT;
  -- ROW_COUNT returns 1 (truthy) when inserted, 0 when conflict
  IF was_inserted THEN
    PERFORM award_coins(p_pilot_id, p_amount, p_reason);
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- purchase_decor: atomically checks balance, deducts price, places item.
-- Returns the new balance, or -1 if insufficient funds, or -2 if already owned.
CREATE OR REPLACE FUNCTION purchase_decor(
  p_pilot_id uuid,
  p_slot_key text,
  p_item_key text,
  p_price    integer
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance integer;
  existing_item   text;
  new_balance     integer;
BEGIN
  -- Check if slot is already filled
  SELECT item_key INTO existing_item
  FROM pilot_decor
  WHERE pilot_id = p_pilot_id AND slot_key = p_slot_key;
  IF FOUND THEN
    RETURN -2;
  END IF;

  -- Check balance
  SELECT balance INTO current_balance
  FROM pilot_coins
  WHERE pilot_id = p_pilot_id;
  IF NOT FOUND OR current_balance < p_price THEN
    RETURN -1;
  END IF;

  -- Deduct + log + place atomically
  UPDATE pilot_coins
  SET balance = balance - p_price,
      updated_at = now()
  WHERE pilot_id = p_pilot_id
  RETURNING balance INTO new_balance;

  INSERT INTO pilot_coin_log (pilot_id, amount, reason)
  VALUES (p_pilot_id, -p_price, 'purchase:' || p_item_key);

  INSERT INTO pilot_decor (pilot_id, slot_key, item_key)
  VALUES (p_pilot_id, p_slot_key, p_item_key);

  RETURN new_balance;
END;
$$;

-- =====================================================================
-- Done. Verify with:
--   SELECT * FROM pilot_coins LIMIT 5;
--   SELECT * FROM pilot_achievements LIMIT 5;
--   SELECT * FROM pilot_decor LIMIT 5;
-- =====================================================================
