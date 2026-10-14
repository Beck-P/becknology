-- =====================================================================
-- Bridge — Character bonds (AI conversations)
-- =====================================================================
-- NOT YET APPLIED. Run once in the Supabase SQL editor for project
-- nwtfrlxgydbeuqfcftzn. Until then the game keeps bonds in the browser
-- only (js/talk.js falls back to localStorage when the table is missing).
--
-- Adds:
--   pilot_bonds — how each character feels about each pilot and what they
--                 remember: { feeling, mood, memories[], summary, met,
--                 last, talks, news[] } as one jsonb document per pair
-- =====================================================================

CREATE TABLE IF NOT EXISTS pilot_bonds (
  pilot_id   uuid NOT NULL REFERENCES pilots(id) ON DELETE CASCADE,
  person_id  text NOT NULL,
  bond       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pilot_id, person_id)
);

ALTER TABLE pilot_bonds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilot_bonds_anon_all ON pilot_bonds;
CREATE POLICY pilot_bonds_anon_all
  ON pilot_bonds FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
