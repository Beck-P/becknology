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

  // ---- Iframe-bridge (cabinet modal) integration ----
  // When this script is loaded inside an iframe whose parent is the bridge,
  // we postMessage coin/achievement events so the bridge HUD can update live
  // and the user can close the modal with Esc. Detection: window !== parent.
  var inIframe = (function () {
    try { return window.self !== window.top; } catch (e) { return true; }
  })();

  function postToParent(msg) {
    if (!inIframe) return;
    try { window.parent.postMessage(msg, '*'); } catch (e) { /* swallow */ }
  }

  // Esc closes the cabinet modal (parent decides). Don't preventDefault here —
  // games may want Esc for pause; the postMessage lets the parent override
  // if it wants to.
  if (inIframe) {
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        postToParent({ type: 'bridge-request-close', source: 'iframe-esc' });
      }
    });
    // Announce ourselves so the parent can size / focus appropriately.
    window.addEventListener('load', function () {
      postToParent({ type: 'bridge-iframe-ready' });
    });
  }

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
   *   { ok: true, balance, destination: 'slot'|'locker' } on success
   *   { ok: false, reason: 'insufficient'|'already_owned'|'no_pilot'|'no_client'|'error' }
   *
   * If the slot is empty, the item goes to the slot. If occupied, the item
   * goes to the locker (the player can swap from there later).
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
        var d = res.data || {};
        if (!d.ok) return { ok: false, reason: d.reason || 'error' };
        emitCoinChange(d.balance, -price, 'purchase:' + itemKey);
        emitLockerChange();
        return { ok: true, balance: d.balance, destination: d.destination };
      });
    });
  }

  /** Returns array of item_keys currently in the locker. */
  function getLocker() {
    return resolvePilot().then(function (pilot) {
      if (!pilot) return [];
      var client = getClient();
      if (!client) return [];
      return client.from('pilot_locker')
        .select('item_key, stored_at')
        .eq('pilot_id', pilot.id)
        .order('stored_at', { ascending: false })
        .then(function (res) {
          if (res.error || !res.data) return [];
          return res.data.map(function (r) { return r.item_key; });
        });
    });
  }

  /**
   * Move the item currently in the slot to the locker (slot becomes empty).
   * Returns { ok: true, item } on success or { ok: false, reason }.
   */
  function storeDecor(slotKey) {
    return resolvePilot().then(function (pilot) {
      if (!pilot) return { ok: false, reason: 'no_pilot' };
      var client = getClient();
      if (!client) return { ok: false, reason: 'no_client' };
      return client.rpc('store_decor', {
        p_pilot_id: pilot.id,
        p_slot_key: slotKey
      }).then(function (res) {
        if (res.error) {
          console.warn('[progression] store_decor failed:', res.error);
          return { ok: false, reason: 'error' };
        }
        var d = res.data || {};
        if (d.ok) emitLockerChange();
        return d;
      });
    });
  }

  /**
   * Atomically deduct coins for a wager. Refuses to go negative.
   * Returns { ok: true, balance } or { ok: false, reason }.
   */
  function wagerCoins(amount, gameKey) {
    return resolvePilot().then(function (pilot) {
      if (!pilot) return { ok: false, reason: 'no_pilot' };
      var client = getClient();
      if (!client) return { ok: false, reason: 'no_client' };
      return client.rpc('wager_coins', {
        p_pilot_id: pilot.id,
        p_amount: Math.floor(amount),
        p_game_key: gameKey
      }).then(function (res) {
        if (res.error) {
          console.warn('[progression] wager_coins failed:', res.error);
          return { ok: false, reason: 'error' };
        }
        var d = res.data || {};
        if (d.ok) emitCoinChange(d.balance, -amount, 'wager:' + gameKey);
        return d;
      });
    });
  }

  /**
   * Sell an item the pilot owns (whether on display or in locker).
   * Returns { ok: true, balance, origin } or { ok: false, reason }.
   */
  function sellItem(itemKey, sellPrice) {
    return resolvePilot().then(function (pilot) {
      if (!pilot) return { ok: false, reason: 'no_pilot' };
      var client = getClient();
      if (!client) return { ok: false, reason: 'no_client' };
      return client.rpc('sell_item', {
        p_pilot_id: pilot.id,
        p_item_key: itemKey,
        p_sell_price: Math.floor(sellPrice)
      }).then(function (res) {
        if (res.error) {
          console.warn('[progression] sell_item failed:', res.error);
          return { ok: false, reason: 'error' };
        }
        var d = res.data || {};
        if (d.ok) {
          emitCoinChange(d.balance, sellPrice, 'sell:' + itemKey);
          emitLockerChange();
        }
        return d;
      });
    });
  }

  /**
   * Move an item from the locker into the given slot. If the slot is occupied
   * the existing slot item swaps back to the locker (atomic).
   * Returns { ok: true, placed, displaced } or { ok: false, reason }.
   */
  function placeDecor(itemKey, slotKey) {
    return resolvePilot().then(function (pilot) {
      if (!pilot) return { ok: false, reason: 'no_pilot' };
      var client = getClient();
      if (!client) return { ok: false, reason: 'no_client' };
      return client.rpc('place_decor', {
        p_pilot_id: pilot.id,
        p_item_key: itemKey,
        p_slot_key: slotKey
      }).then(function (res) {
        if (res.error) {
          console.warn('[progression] place_decor failed:', res.error);
          return { ok: false, reason: 'error' };
        }
        var d = res.data || {};
        if (d.ok) emitLockerChange();
        return d;
      });
    });
  }

  // ---- Same-tab pub/sub for the bridge HUD/UI to listen on ----
  var _coinListeners = [];
  var _trophyListeners = [];
  var _lockerListeners = [];

  function onCoinChange(fn)    { _coinListeners.push(fn);    return function () { var i = _coinListeners.indexOf(fn);    if (i >= 0) _coinListeners.splice(i, 1); }; }
  function onTrophyEarned(fn)  { _trophyListeners.push(fn);  return function () { var i = _trophyListeners.indexOf(fn);  if (i >= 0) _trophyListeners.splice(i, 1); }; }
  function onLockerChange(fn)  { _lockerListeners.push(fn);  return function () { var i = _lockerListeners.indexOf(fn);  if (i >= 0) _lockerListeners.splice(i, 1); }; }

  function emitCoinChange(newBalance, delta, reason) {
    for (var i = 0; i < _coinListeners.length; i++) {
      try { _coinListeners[i]({ balance: newBalance, delta: delta, reason: reason }); }
      catch (e) { console.warn('[progression] listener error:', e); }
    }
    postToParent({ type: 'bridge-coins-changed', balance: newBalance, delta: delta, reason: reason });
  }

  function emitTrophyEarned(key) {
    for (var i = 0; i < _trophyListeners.length; i++) {
      try { _trophyListeners[i]({ key: key }); }
      catch (e) { console.warn('[progression] trophy listener error:', e); }
    }
    postToParent({ type: 'bridge-trophy-earned', key: key });
  }

  function emitLockerChange() {
    for (var i = 0; i < _lockerListeners.length; i++) {
      try { _lockerListeners[i](); }
      catch (e) { console.warn('[progression] locker listener error:', e); }
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
    getLocker: getLocker,
    purchaseDecor: purchaseDecor,
    sellItem: sellItem,
    wagerCoins: wagerCoins,
    storeDecor: storeDecor,
    placeDecor: placeDecor,
    onCoinChange: onCoinChange,
    onTrophyEarned: onTrophyEarned,
    onLockerChange: onLockerChange,
    maybeAwardCabinetCrusher: maybeAwardCabinetCrusher,
    maybeAwardWayfarer: maybeAwardWayfarer
  };

})(typeof window !== 'undefined' ? window : this);
