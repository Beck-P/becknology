/**
 * BridgeProgression — Shared coin/achievement reporting for any Becknology app.
 *
 * Drop this script into any app's HTML to participate in the bridge
 * progression system:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="/bridge/js/shared/progression.js"></script>
 *
 * Then, when the player does something rewardable:
 *
 *   BridgeProgression.awardCoins(15, 'asteroids_game', { score: 1240 });
 *   BridgeProgression.recordAchievement('first_light', 100, { game: 'asteroids' });
 *
 * Calls silently no-op if no pilot is in localStorage (someone visiting the
 * app directly without going through the bridge). The game still plays fine.
 *
 * Cross-window sync: when the player returns from an app to the bridge,
 * the bridge's HUD reads from Supabase to show the latest balance and pops
 * a "+N coins" indicator if the balance grew while away.
 */
(function (global) {

  var SUPABASE_URL = 'https://nwtfrlxgydbeuqfcftzn.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_mjJW8ba__7yjbwAAx81sXg_oMlDkrol';

  var PILOT_KEY = 'bridge_pilot';

  // ---- Supabase client (lazy — host app may already have one) ----
  var _client = null;
  function getClient() {
    if (_client) return _client;
    if (typeof supabase === 'undefined') return null;
    _client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _client;
  }

  // ---- Pilot lookup ----
  // The bridge stores the pilot's NAME in localStorage. We need the pilot's
  // ID for Supabase calls. Cache the resolved (name → id) lookup in memory.
  var _pilotCache = null;       // { id, name } once resolved
  var _pilotLookupPromise = null;

  function getPilotName() {
    try { return localStorage.getItem(PILOT_KEY); } catch (e) { return null; }
  }

  function resolvePilot() {
    if (_pilotCache) return Promise.resolve(_pilotCache);
    if (_pilotLookupPromise) return _pilotLookupPromise;

    var name = getPilotName();
    if (!name) return Promise.resolve(null);

    var client = getClient();
    if (!client) return Promise.resolve(null);

    _pilotLookupPromise = client.from('pilots')
      .select('id, name')
      .eq('name', name)
      .maybeSingle()
      .then(function (res) {
        if (res.error || !res.data) return null;
        _pilotCache = res.data;
        return _pilotCache;
      })
      .catch(function () { return null; });

    return _pilotLookupPromise;
  }

  // ---- Public API ----

  /** Returns { id, name } or null if not signed in. */
  function getPilot() {
    return resolvePilot();
  }

  /**
   * Award coins. Logged in pilot_coin_log + bumps pilot_coins.balance.
   * Returns the new balance, or null if no pilot / failure.
   */
  function awardCoins(amount, reason, opts) {
    if (!Number.isFinite(amount) || amount === 0) return Promise.resolve(null);
    if (!reason || typeof reason !== 'string') return Promise.resolve(null);
    return resolvePilot().then(function (pilot) {
      if (!pilot) return null;
      var client = getClient();
      if (!client) return null;
      return client.rpc('award_coins', {
        p_pilot_id: pilot.id,
        p_amount: Math.floor(amount),
        p_reason: reason
      }).then(function (res) {
        if (res.error) {
          console.warn('[progression] award_coins failed:', res.error);
          return null;
        }
        // Notify any same-tab listeners (the bridge HUD)
        emitCoinChange(res.data, amount, reason);
        return res.data;
      });
    });
  }

  /**
   * Record an achievement. Idempotent — calling twice for the same key
   * never double-awards. Returns true if newly awarded, false if already had.
   *
   * Pass coinAmount > 0 to grant coins on first earn (atomic).
   */
  function recordAchievement(key, coinAmount, meta) {
    if (!key || typeof key !== 'string') return Promise.resolve(false);
    return resolvePilot().then(function (pilot) {
      if (!pilot) return false;
      var client = getClient();
      if (!client) return false;
      return client.rpc('award_achievement', {
        p_pilot_id: pilot.id,
        p_key: key,
        p_amount: Math.floor(coinAmount || 0),
        p_reason: 'achievement:' + key,
        p_meta: meta || null
      }).then(function (res) {
        if (res.error) {
          console.warn('[progression] award_achievement failed:', res.error);
          return false;
        }
        var wasNew = !!res.data;
        if (wasNew && coinAmount > 0) {
          // The Postgres function awarded coins atomically; refresh the HUD.
          getBalance().then(function (balance) {
            emitCoinChange(balance, coinAmount, 'achievement:' + key);
          });
          emitTrophyEarned(key);
        }
        return wasNew;
      });
    });
  }

  /** Returns the pilot's current balance, or null. */
  function getBalance() {
    return resolvePilot().then(function (pilot) {
      if (!pilot) return null;
      var client = getClient();
      if (!client) return null;
      return client.from('pilot_coins')
        .select('balance')
        .eq('pilot_id', pilot.id)
        .maybeSingle()
        .then(function (res) {
          if (res.error || !res.data) return 0;
          return res.data.balance;
        });
    });
  }

  /** Returns the pilot's achievement keys as a Set, or empty set. */
  function getAchievements() {
    return resolvePilot().then(function (pilot) {
      if (!pilot) return new Set();
      var client = getClient();
      if (!client) return new Set();
      return client.from('pilot_achievements')
        .select('key')
        .eq('pilot_id', pilot.id)
        .then(function (res) {
          if (res.error || !res.data) return new Set();
          return new Set(res.data.map(function (r) { return r.key; }));
        });
    });
  }

  /** Returns map of slot_key → item_key for owned/placed decor. */
  function getDecor() {
    return resolvePilot().then(function (pilot) {
      if (!pilot) return {};
      var client = getClient();
      if (!client) return {};
      return client.from('pilot_decor')
        .select('slot_key, item_key')
        .eq('pilot_id', pilot.id)
        .then(function (res) {
          if (res.error || !res.data) return {};
          var out = {};
          for (var i = 0; i < res.data.length; i++) {
            out[res.data[i].slot_key] = res.data[i].item_key;
          }
          return out;
        });
    });
  }

  /**
   * Atomically attempt to buy a decor item. Returns:
   *   { ok: true, balance: <new balance> } on success
   *   { ok: false, reason: 'insufficient' | 'occupied' | 'error' }
   */
  function purchaseDecor(slotKey, itemKey, price) {
    return resolvePilot().then(function (pilot) {
      if (!pilot) return { ok: false, reason: 'no_pilot' };
      var client = getClient();
      if (!client) return { ok: false, reason: 'no_client' };
      return client.rpc('purchase_decor', {
        p_pilot_id: pilot.id,
        p_slot_key: slotKey,
        p_item_key: itemKey,
        p_price: Math.floor(price)
      }).then(function (res) {
        if (res.error) {
          console.warn('[progression] purchase_decor failed:', res.error);
          return { ok: false, reason: 'error' };
        }
        if (res.data === -1) return { ok: false, reason: 'insufficient' };
        if (res.data === -2) return { ok: false, reason: 'occupied' };
        emitCoinChange(res.data, -price, 'purchase:' + itemKey);
        return { ok: true, balance: res.data };
      });
    });
  }

  // ---- Same-tab pub/sub for the bridge HUD to listen on ----
  var _coinListeners = [];
  var _trophyListeners = [];

  function onCoinChange(fn) {
    _coinListeners.push(fn);
    return function unsubscribe() {
      var i = _coinListeners.indexOf(fn);
      if (i >= 0) _coinListeners.splice(i, 1);
    };
  }

  function onTrophyEarned(fn) {
    _trophyListeners.push(fn);
    return function unsubscribe() {
      var i = _trophyListeners.indexOf(fn);
      if (i >= 0) _trophyListeners.splice(i, 1);
    };
  }

  function emitCoinChange(newBalance, delta, reason) {
    for (var i = 0; i < _coinListeners.length; i++) {
      try { _coinListeners[i]({ balance: newBalance, delta: delta, reason: reason }); }
      catch (e) { console.warn('[progression] listener error:', e); }
    }
  }

  function emitTrophyEarned(key) {
    for (var i = 0; i < _trophyListeners.length; i++) {
      try { _trophyListeners[i]({ key: key }); }
      catch (e) { console.warn('[progression] trophy listener error:', e); }
    }
  }

  // ---- Milestone helpers ----
  // Award the "Cabinet Crusher" trophy iff all 5 played_* keys are present.
  // Idempotent — safe to call after every arcade-game gameOver.
  function maybeAwardCabinetCrusher() {
    var keys = ['played_asteroids', 'played_breakout', 'played_helicopter',
                'played_missile_command', 'played_space_invaders'];
    return getAchievements().then(function (set) {
      for (var i = 0; i < keys.length; i++) if (!set.has(keys[i])) return false;
      return recordAchievement('cabinet_crusher', 100, { source: 'arcade' });
    });
  }

  // Award the "Wayfarer" trophy iff visited all 4 hyperspace destinations.
  function maybeAwardWayfarer() {
    var keys = ['visited_arcadia', 'visited_lumar', 'visited_singularity', 'visited_enigma'];
    return getAchievements().then(function (set) {
      for (var i = 0; i < keys.length; i++) if (!set.has(keys[i])) return false;
      return recordAchievement('wayfarer', 75, { source: 'navigation' });
    });
  }

  // ---- Export ----
  global.BridgeProgression = {
    getPilot: getPilot,
    awardCoins: awardCoins,
    recordAchievement: recordAchievement,
    getBalance: getBalance,
    getAchievements: getAchievements,
    getDecor: getDecor,
    purchaseDecor: purchaseDecor,
    onCoinChange: onCoinChange,
    onTrophyEarned: onTrophyEarned,
    maybeAwardCabinetCrusher: maybeAwardCabinetCrusher,
    maybeAwardWayfarer: maybeAwardWayfarer
  };

})(typeof window !== 'undefined' ? window : this);
