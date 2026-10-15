/**
 * Supabase integration for the cipher terminal: leaderboard identity, score
 * submission and the daily rankings.
 *
 * There is no separate sign-up any more: the codename is the Bridge pilot's
 * name (localStorage 'bridge_pilot'), and the matching cipher_room_agents row
 * is looked up — or created — on demand by ensureAgent().
 *
 * Supabase tables required:
 *   cipher_room_agents: id (uuid), codename (text, unique), created_at (timestamptz)
 *   cipher_room_scores: id (uuid), agent_id (uuid FK), date (date), puzzle_type (text),
 *                       time_seconds (int), created_at (timestamptz)
 *
 * Everything degrades quietly: with Supabase unreachable the game still plays,
 * it just doesn't rank.
 */

const CipherSupabase = (function () {
  const SUPABASE_URL = 'https://nwtfrlxgydbeuqfcftzn.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_mjJW8ba__7yjbwAAx81sXg_oMlDkrol';

  let client = null;
  try {
    client = (typeof supabase !== 'undefined') ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
  } catch (e) { client = null; }

  /** Create a new agent. Returns { id, codename } or { error }. */
  async function createAgent(codename) {
    if (!client) return { error: 'RELAY OFFLINE' };
    try {
      const { data, error } = await client
        .from('cipher_room_agents')
        .insert({ codename })
        .select('id, codename')
        .single();
      if (error) throw error;
      return { id: data.id, codename: data.codename };
    } catch (e) {
      console.warn('[cipher] agent creation failed:', e && e.message ? e.message : e);
      return { error: 'REGISTRATION FAILED' };
    }
  }

  /** Look up an existing agent. Returns { id, codename }, { missing: true } or { error }. */
  async function lookupAgent(codename) {
    if (!client) return { error: 'RELAY OFFLINE' };
    try {
      const { data, error } = await client
        .from('cipher_room_agents')
        .select('id, codename')
        .eq('codename', codename)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { missing: true };
      return { id: data.id, codename: data.codename };
    } catch (e) {
      console.warn('[cipher] agent lookup failed:', e && e.message ? e.message : e);
      return { error: 'LOOKUP FAILED' };
    }
  }

  function isRemote(agent) {
    return !!(agent && agent.id && !String(agent.id).startsWith('local-'));
  }

  let ensurePromise = null;

  /**
   * Make sure the stored agent matches the current codename and has a real
   * leaderboard id. Resolves to the agent ({ id, codename }) or null when there
   * is no codename. Offline, it stores a local agent and tries again next time.
   */
  function ensureAgent() {
    if (ensurePromise) return ensurePromise;
    ensurePromise = (async () => {
      const codename = CipherStorage.getCodename();
      if (!codename) return null;
      const stored = CipherStorage.getAgent();
      if (stored && stored.codename === codename && isRemote(stored)) return stored;

      let agent = null;
      const found = await lookupAgent(codename);
      if (found.id) agent = found;
      else if (found.missing) {
        const made = await createAgent(codename);
        if (made.id) agent = made;
        else {
          // Lost a race with another tab? Try the lookup once more.
          const again = await lookupAgent(codename);
          if (again.id) agent = again;
        }
      }
      if (!agent) agent = { id: 'local-' + Date.now(), codename };
      CipherStorage.setAgent(agent);
      return agent;
    })().finally(() => {
      // Let a later call retry if we only managed a local agent.
      const a = CipherStorage.getAgent();
      if (!isRemote(a)) ensurePromise = null;
    });
    return ensurePromise;
  }

  /** Submit a score (once per agent, day and puzzle type). */
  async function submitScore(dateStr, puzzleType, timeSeconds) {
    if (!client) return;
    const agent = await ensureAgent();
    if (!isRemote(agent)) return;

    try {
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
      console.warn('[cipher] score submission failed:', e && e.message ? e.message : e);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /** Load the day's rankings and render them into a container element. */
  async function loadLeaderboard(dateStr, puzzleType, containerId, submitted) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!client) {
      container.innerHTML = '<p class="muted-note">RELAY RANKINGS OFFLINE</p>';
      return;
    }
    container.innerHTML = '<p class="muted-note">QUERYING RELAY&hellip;</p>';

    try {
      if (submitted) await submitted; // our own time first, so we're on the board
      const { data, error } = await client
        .from('cipher_room_scores')
        .select('time_seconds, agent_id, cipher_room_agents(codename)')
        .eq('date', dateStr)
        .eq('puzzle_type', puzzleType)
        .order('time_seconds', { ascending: true })
        .limit(10);

      if (error) throw error;

      const agent = CipherStorage.getAgent();

      let html = '<h3>RELAY RANKINGS</h3>';
      if (!data || data.length === 0) {
        html += '<p class="muted-note">NO OTHER OPERATORS ON THE BOARD YET</p>';
      } else {
        data.forEach((entry, i) => {
          const codename = (entry.cipher_room_agents && entry.cipher_room_agents.codename) || 'UNKNOWN';
          const isYou = agent && entry.agent_id === agent.id;
          const m = String(Math.floor(entry.time_seconds / 60)).padStart(2, '0');
          const s = String(entry.time_seconds % 60).padStart(2, '0');
          html += `<div class="leaderboard-entry${isYou ? ' you' : ''}">`;
          html += `<span class="rank">${i + 1}.</span>`;
          html += `<span class="name">${escapeHtml(codename)}${isYou ? ' (YOU)' : ''}</span>`;
          html += `<span class="entry-time">${m}:${s}</span>`;
          html += '</div>';
        });
      }

      container.innerHTML = html;
    } catch (e) {
      console.warn('[cipher] leaderboard load failed:', e && e.message ? e.message : e);
      container.innerHTML = '<p class="muted-note">RELAY RANKINGS UNAVAILABLE</p>';
    }
  }

  return { ensureAgent, submitScore, loadLeaderboard, online: () => !!client };
})();
