-- =====================================================================
-- Bridge Progression — Slice 3 (Selling)
-- =====================================================================
-- Already applied to project nwtfrlxgydbeuqfcftzn via Supabase MCP.
-- Adds sell_item: turns any owned item (slot or locker) into coins.
-- =====================================================================

CREATE OR REPLACE FUNCTION sell_item(
  p_pilot_id    uuid,
  p_item_key    text,
  p_sell_price  integer
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  in_locker_row boolean;
  slot_row text;
  new_balance integer;
  origin text;
BEGIN
  SELECT TRUE INTO in_locker_row FROM pilot_locker
    WHERE pilot_id = p_pilot_id AND item_key = p_item_key LIMIT 1;
  IF in_locker_row THEN
    DELETE FROM pilot_locker
      WHERE pilot_id = p_pilot_id AND item_key = p_item_key;
    origin := 'locker';
  ELSE
    SELECT slot_key INTO slot_row FROM pilot_decor
      WHERE pilot_id = p_pilot_id AND item_key = p_item_key LIMIT 1;
    IF slot_row IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'not_owned');
    END IF;
    DELETE FROM pilot_decor
      WHERE pilot_id = p_pilot_id AND slot_key = slot_row;
    origin := 'slot:' || slot_row;
  END IF;

  IF p_sell_price > 0 THEN
    new_balance := award_coins(p_pilot_id, p_sell_price, 'sell:' || p_item_key);
  ELSE
    SELECT balance INTO new_balance FROM pilot_coins WHERE pilot_id = p_pilot_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'balance', new_balance, 'origin', origin);
END;
$$;
