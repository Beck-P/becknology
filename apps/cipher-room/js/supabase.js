/**
 * Supabase integration for The Cipher Room.
 * Handles agent registration, score submission, and leaderboard.
 *
 * Supabase tables required:
 *   cipher_room_agents: id (uuid), codename (text, unique), created_at (timestamptz)
 *   cipher_room_scores: id (uuid), agent_id (uuid FK), date (date), puzzle_type (text),
 *                       time_seconds (int), created_at (timestamptz)
 */

const CipherSupabase = (function () {
  const SUPABASE_URL = 'https://nwtfrlxgydbeuqfcftzn.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_mjJW8ba__7yjbwAAx81sXg_oMlDkrol';

  const client = (typeof supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL')
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  /** Create a new agent. Returns { id, codename } or { error }. */
  async function createAgent(codename) {
    if (!client) return { error: 'SUPABASE UNAVAILABLE' };
    try {
      // Check if codename exists
      const { data: existing } = await client
        .from('cipher_room_agents')
        .select('id')
        .eq('codename', codename)
        .maybeSingle();

      if (existing) return { error: 'CODENAME ALREADY IN USE — PICK ANOTHER' };

      const { data, error } = await client
        .from('cipher_room_agents')
        .insert({ codename })
        .select('id, codename')
        .single();

      if (error) throw error;
      return { id: data.id, codename: data.codename };
    } catch (e) {
      console.error('Agent creation failed:', e);
      return { error: 'REGISTRATION FAILED — TRY AGAIN' };
    }
  }

  /** Look up an existing agent. Returns { id, codename } or { error }. */
  async function lookupAgent(codename) {
    if (!client) return { error: 'SUPABASE UNAVAILABLE' };
    try {
      const { data, error } = await client
        .from('cipher_room_agents')
        .select('id, codename')
        .eq('codename', codename)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { error: 'NO AGENT FOUND WITH THAT CODENAME' };
      return { id: data.id, codename: data.codename };
    } catch (e) {
      console.error('Agent lookup failed:', e);
      return { error: 'LOOKUP FAILED — TRY AGAIN' };
    }
  }

  /** Submit a score. */
  async function submitScore(dateStr, puzzleType, timeSeconds) {
    if (!client) return;
    const agent = typeof CipherStorage !== 'undefined' ? CipherStorage.getAgent() : null;
    if (!agent || !agent.id || agent.id.startsWith('local-')) return;

    try {
      // Check for duplicate
      const { data: existing } = await client
        .from('cipher_room_scores')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('date', dateStr)
        .eq('puzzle_type', puzzleType)
        .maybeSingle();

      if (existing) return; // Already submitted

      await client.from('cipher_room_scores').insert({
        agent_id: agent.id,
        date: dateStr,
        puzzle_type: puzzleType,
        time_seconds: timeSeconds,
      });
    } catch (e) {
      console.error('Score submission failed:', e);
    }
  }

  /** Load leaderboard and render into a container element. */
  async function loadLeaderboard(dateStr, puzzleType, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!client) {
      container.innerHTML = '<p style="font-size:10px;color:#333;">FIELD RANKINGS UNAVAILABLE</p>';
      return;
    }

    try {
      const { data, error } = await client
        .from('cipher_room_scores')
        .select('time_seconds, agent_id, cipher_room_agents(codename)')
        .eq('date', dateStr)
        .eq('puzzle_type', puzzleType)
        .order('time_seconds', { ascending: true })
        .limit(10);

      if (error) throw error;

      const agent = typeof CipherStorage !== 'undefined' ? CipherStorage.getAgent() : null;

      let html = '<h3>FIELD RANKINGS</h3>';
      if (!data || data.length === 0) {
        html += '<p style="font-size:10px;color:#333;">NO RANKINGS YET — YOU\'RE THE FIRST</p>';
      } else {
        data.forEach((entry, i) => {
          const codename = entry.cipher_room_agents?.codename || 'UNKNOWN';
          const isYou = agent && entry.agent_id === agent.id;
          const m = String(Math.floor(entry.time_seconds / 60)).padStart(2, '0');
          const s = String(entry.time_seconds % 60).padStart(2, '0');
          html += `<div class="leaderboard-entry${isYou ? ' you' : ''}">`;
          html += `<span class="rank">${i + 1}.</span>`;
          html += `<span class="name">${codename}${isYou ? ' (YOU)' : ''}</span>`;
          html += `<span class="entry-time">${m}:${s}</span>`;
          html += '</div>';
        });
      }

      container.innerHTML = html;
    } catch (e) {
      console.error('Leaderboard load failed:', e);
      container.innerHTML = '<p style="font-size:10px;color:#333;">RANKINGS UNAVAILABLE</p>';
    }
  }

  return { createAgent, lookupAgent, submitScore, loadLeaderboard };
})();
