-- =====================================================================
-- Bridge — Multiplayer: cloud saves and letters
-- =====================================================================
-- Run once in the Supabase SQL editor for project nwtfrlxgydbeuqfcftzn.
-- Until it's run, the game keeps each player's progress in their browser
-- only (js/cloud.js and js/mail.js do nothing without these tables).
--
-- Seeing each other in the world needs no tables: it runs on Supabase
-- Realtime (broadcast + presence on the `bridge-lobby` channel). If players
-- can't see each other, check Project Settings → Realtime: public channels
-- must be allowed ("Private channels only" off).
--
-- Adds:
--   pilot_saves — each pilot's whole game (every bridge_* key the browser
--                 keeps: journal, quests, fish, fleet, farm, homes, holm...)
--                 as one jsonb document, with a save counter (js/cloud.js).
--                 A partner reads it to visit your places, and writes to it
--                 when they tend your farm while you're away.
--   pilot_mail  — letters between pilots, with gifts attached (js/mail.js)
-- =====================================================================

CREATE TABLE IF NOT EXISTS pilot_saves (
  pilot_id   uuid PRIMARY KEY REFERENCES pilots(id) ON DELETE CASCADE,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  rev        bigint NOT NULL DEFAULT 0,
  device     text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pilot_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilot_saves_anon_all ON pilot_saves;
CREATE POLICY pilot_saves_anon_all
  ON pilot_saves FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS pilot_mail (
  id         bigserial PRIMARY KEY,
  from_pilot uuid REFERENCES pilots(id) ON DELETE CASCADE,
  to_pilot   uuid NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  from_name  text NOT NULL DEFAULT '',
  body       text NOT NULL DEFAULT '',
  items      jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{ "id": "bluefin", "count": 3 }]
  coins      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at  timestamptz
);

CREATE INDEX IF NOT EXISTS pilot_mail_to_idx ON pilot_mail (to_pilot, opened_at);

ALTER TABLE pilot_mail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilot_mail_anon_all ON pilot_mail;
CREATE POLICY pilot_mail_anon_all
  ON pilot_mail FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
