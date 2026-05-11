-- =====================================================================
-- Bridge Progression — Wager Coins (Runouts wager mode)
-- =====================================================================
-- Already applied to project nwtfrlxgydbeuqfcftzn via Supabase MCP.
--
-- Atomically deducts coins for a wager. Refuses to go negative.
-- Returns jsonb { ok: true, balance } on success or
--                { ok: false, reason } on failure.
-- =====================================================================

CREATE OR REPLACE FUNCTION wager_coins(
  p_pilot_id  uuid,
  p_amount    integer,
  p_game_key  text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance integer;
  new_balance integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;

  SELECT balance INTO current_balance FROM pilot_coins
    WHERE pilot_id = p_pilot_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_balance');
  END IF;
  IF current_balance < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient', 'balance', current_balance);
  END IF;

  UPDATE pilot_coins
    SET balance = balance - p_amount, updated_at = now()
    WHERE pilot_id = p_pilot_id
    RETURNING balance INTO new_balance;

  INSERT INTO pilot_coin_log (pilot_id, amount, reason)
    VALUES (p_pilot_id, -p_amount, 'wager:' || p_game_key);

  RETURN jsonb_build_object('ok', true, 'balance', new_balance);
END;
$$;
