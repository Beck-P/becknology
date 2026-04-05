/**
 * BridgeDB — Supabase client for pilot data.
 *
 * Same Supabase project as cipher-room.
 * Table: pilots (id, name, suit_color, created_at, last_seen)
 */
var BridgeDB = (function () {
  var SUPABASE_URL = 'https://nwtfrlxgydbeuqfcftzn.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_mjJW8ba__7yjbwAAx81sXg_oMlDkrol';

  var client = (typeof supabase !== 'undefined')
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  /** Create a new pilot. Returns { id, name, suit_color } or { error }. */
  async function createPilot(name, suitColor) {
    if (!client) return { error: 'DATABASE UNAVAILABLE' };
    try {
      var { data: existing } = await client
        .from('pilots')
        .select('id')
        .eq('name', name)
        .maybeSingle();

      if (existing) return { error: 'NAME ALREADY TAKEN — PICK ANOTHER' };

      var { data, error } = await client
        .from('pilots')
        .insert({ name: name, suit_color: suitColor })
        .select('id, name, suit_color')
        .single();

      if (error) throw error;
      return { id: data.id, name: data.name, suit_color: data.suit_color };
    } catch (e) {
      console.error('Pilot creation failed:', e);
      return { error: 'REGISTRATION FAILED — TRY AGAIN' };
    }
  }

  /** Look up an existing pilot by name. Returns { id, name, suit_color } or { error }. */
  async function lookupPilot(name) {
    if (!client) return { error: 'DATABASE UNAVAILABLE' };
    try {
      var { data, error } = await client
        .from('pilots')
        .select('id, name, suit_color')
        .eq('name', name)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { error: 'NO PILOT FOUND — CHECK YOUR NAME' };
      return { id: data.id, name: data.name, suit_color: data.suit_color };
    } catch (e) {
      console.error('Pilot lookup failed:', e);
      return { error: 'LOOKUP FAILED — TRY AGAIN' };
    }
  }

  /** Update last_seen timestamp. */
  async function updateLastSeen(pilotId) {
    if (!client) return;
    try {
      await client
        .from('pilots')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', pilotId);
    } catch (e) {
      console.error('Last seen update failed:', e);
    }
  }

  return {
    createPilot: createPilot,
    lookupPilot: lookupPilot,
    updateLastSeen: updateLastSeen
  };
})();
