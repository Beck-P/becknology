/**
 * BridgeCrew — the people you've hired (crew blocks in assets/people.json).
 *
 * Hire someone from their conversation ("Join my crew?"); the wage is paid
 * up front in coins. Each hand brings a perk the rest of the game asks
 * about with has(perk): a navigator speeds the galleon at the helm, a
 * quartermaster gets better prices, a runner finds more when foraging, a
 * trader sends home a cut whenever you make port, an engineer keeps your
 * businesses running twice as long between collections. A crew block with
 * `after` (a quest id) answers with `notYet` until that quest is complete.
 * The journal lists them.
 */
var BridgeCrew = (function () {
  var KEY = 'bridge_crew';
  var hired = {};
  try { hired = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { hired = {}; }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(hired)); } catch (e) { /* private mode */ } }
  function isHired(id) { return !!hired[id]; }
  function has(perk) {
    if (typeof BridgePeople === 'undefined') return false;
    var all = BridgePeople.all();
    for (var id in hired) if (all[id] && all[id].crew && all[id].crew.perk === perk) return true;
    return false;
  }

  /** Pays the wage, then signs them on. Resolves {ok, reason}. */
  function hire(person) {
    if (!person.crew) return Promise.resolve({ ok: false, reason: 'not_for_hire' });
    if (hired[person.id]) return Promise.resolve({ ok: true });
    var pay = typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins
      ? BridgeProgression.wagerCoins(person.crew.wage, 'crew:' + person.id) : Promise.resolve({ ok: false, reason: 'offline' });
    return pay.then(function (res) {
      if (!res || !res.ok) return { ok: false, reason: (res && res.reason) || 'error' };
      hired[person.id] = { at: Date.now(), lastPay: Date.now() };
      save();
      return { ok: true };
    }).catch(function () { return { ok: false, reason: 'error' }; });
  }

  function list() {
    var all = typeof BridgePeople !== 'undefined' ? BridgePeople.all() : {};
    return Object.keys(hired).filter(function (id) { return all[id] && all[id].crew; }).map(function (id) {
      return { id: id, name: all[id].name, role: all[id].crew.role, perkText: all[id].crew.perkText };
    });
  }

  // the trader's cut, whenever you make port in Lumar
  function onArrive(worldId) {
    if (!/^lumar/.test(worldId || '') || !has('trader')) return;
    var all = BridgePeople.all();
    for (var id in hired) {
      var p = all[id];
      if (!p || !p.crew || p.crew.perk !== 'trader') continue;
      if (Date.now() - (hired[id].lastPay || 0) < 10 * 60000) continue;
      hired[id].lastPay = Date.now();
      save();
      var cut = 20 + Math.floor(Math.random() * 16);
      if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) {
        BridgeProgression.awardCoins(cut, 'crew:trade').then(function (bal) {
          if (bal !== null && bal !== undefined && typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) {
            BridgeQuests.toast('Crew', p.name + "'s lamp-oil run", '+' + cut + ' coins');
          }
        });
      }
    }
  }

  if (typeof BridgeState !== 'undefined') {
    BridgeState.onChange(function (s, prev, ctx) { if (s === 'world' && ctx && ctx.worldId) onArrive(ctx.worldId); });
  }

  return { has: has, hire: hire, isHired: isHired, list: list };
})();
