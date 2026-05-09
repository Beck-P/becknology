-- =====================================================================
-- Bridge Progression — Slice 2 (Storage Locker)
-- =====================================================================
-- Already applied to project nwtfrlxgydbeuqfcftzn via Supabase MCP on
-- 2026-05-09. Kept here for source-of-truth + re-runnability.
--
-- Adds:
--   pilot_locker — items the pilot owns but doesn't have on display
--   purchase_decor (re-defined) — slot conflict now sends item to locker
--                                instead of failing; returns jsonb
--   store_decor   — move slotted item to locker (slot becomes empty)
--   place_decor   — pull item from locker into slot (atomic swap if
--                   the slot is occupied — existing item displaces back
--                   to locker)
-- =====================================================================

CREATE TABLE IF NOT EXISTS pilot_locker (
  pilot_id   uuid NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  item_key   text NOT NULL,
  stored_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pilot_id, item_key)
);

ALTER TABLE pilot_locker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilot_locker_anon_all ON pilot_locker;
CREATE POLICY pilot_locker_anon_all
  ON pilot_locker FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Drop old purchase_decor (return type changed from int to jsonb).
DROP FUNCTION IF EXISTS purchase_decor(uuid, text, text, integer);

CREATE OR REPLACE FUNCTION purchase_decor(
  p_pilot_id uuid,
  p_slot_key text,
  p_item_key text,
  p_price    integer
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance integer;
  existing_slot_item text;
  in_locker_already boolean;
  new_balance integer;
  destination text;
BEGIN
  -- Block duplicate purchases (item is in slot OR locker)
  SELECT TRUE INTO in_locker_already FROM pilot_locker
    WHERE pilot_id = p_pilot_id AND item_key = p_item_key LIMIT 1;
  IF in_locker_already THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_owned');
  END IF;
  IF EXISTS (SELECT 1 FROM pilot_decor
             WHERE pilot_id = p_pilot_id AND item_key = p_item_key) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_owned');
  END IF;

  -- Balance check
  SELECT balance INTO current_balance FROM pilot_coins WHERE pilot_id = p_pilot_id;
  IF NOT FOUND OR current_balance < p_price THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient');
  END IF;

  -- Determine destination
  SELECT item_key INTO existing_slot_item FROM pilot_decor
    WHERE pilot_id = p_pilot_id AND slot_key = p_slot_key;

  -- Deduct + log
  UPDATE pilot_coins SET balance = balance - p_price, updated_at = now()
    WHERE pilot_id = p_pilot_id RETURNING balance INTO new_balance;
  INSERT INTO pilot_coin_log (pilot_id, amount, reason)
    VALUES (p_pilot_id, -p_price, 'purchase:' || p_item_key);

  IF existing_slot_item IS NULL THEN
    INSERT INTO pilot_decor (pilot_id, slot_key, item_key)
      VALUES (p_pilot_id, p_slot_key, p_item_key);
    destination := 'slot';
  ELSE
    INSERT INTO pilot_locker (pilot_id, item_key) VALUES (p_pilot_id, p_item_key);
    destination := 'locker';
  END IF;

  RETURN jsonb_build_object('ok', true, 'balance', new_balance, 'destination', destination);
END;
$$;

CREATE OR REPLACE FUNCTION store_decor(
  p_pilot_id uuid,
  p_slot_key text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE moved_item text;
BEGIN
  SELECT item_key INTO moved_item FROM pilot_decor
    WHERE pilot_id = p_pilot_id AND slot_key = p_slot_key;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_slot');
  END IF;

  DELETE FROM pilot_decor WHERE pilot_id = p_pilot_id AND slot_key = p_slot_key;
  INSERT INTO pilot_locker (pilot_id, item_key) VALUES (p_pilot_id, moved_item)
    ON CONFLICT (pilot_id, item_key) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'item', moved_item);
END;
$$;

CREATE OR REPLACE FUNCTION place_decor(
  p_pilot_id uuid,
  p_item_key text,
  p_slot_key text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE existing_slot_item text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pilot_locker
                 WHERE pilot_id = p_pilot_id AND item_key = p_item_key) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_in_locker');
  END IF;

  DELETE FROM pilot_locker
    WHERE pilot_id = p_pilot_id AND item_key = p_item_key;

  SELECT item_key INTO existing_slot_item FROM pilot_decor
    WHERE pilot_id = p_pilot_id AND slot_key = p_slot_key;

  IF existing_slot_item IS NULL THEN
    INSERT INTO pilot_decor (pilot_id, slot_key, item_key)
      VALUES (p_pilot_id, p_slot_key, p_item_key);
    RETURN jsonb_build_object('ok', true, 'placed', p_item_key, 'displaced', NULL);
  ELSE
    UPDATE pilot_decor SET item_key = p_item_key, placed_at = now()
      WHERE pilot_id = p_pilot_id AND slot_key = p_slot_key;
    INSERT INTO pilot_locker (pilot_id, item_key) VALUES (p_pilot_id, existing_slot_item)
      ON CONFLICT (pilot_id, item_key) DO NOTHING;
    RETURN jsonb_build_object('ok', true, 'placed', p_item_key, 'displaced', existing_slot_item);
  END IF;
END;
$$;
