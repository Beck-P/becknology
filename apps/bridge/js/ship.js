/**
 * BridgeShip — the two ships: the mothership (bridge, quarters, hangar) that
 * jumps between systems, and the shuttle that flies down to a world.
 *
 *   jump (star map) → hyperspace → arrive in orbit on the bridge → "take the
 *   shuttle down" → lift off the hangar pad → cutscene down → touch down on
 *   the world's pad (or the world's door if it has no pad yet)
 *
 *   "Return to ship" anywhere off the ship → lift off the pad (if the world
 *   has one) → cutscene up → settle on the hangar pad
 *
 * A world with a landing pad has  "shuttle": { "spawn": [x, y] }  in its JSON
 * and the parked shuttle as a scene decor layer (slot "shuttle", key
 * "parked" — scenekit `with k.variant('shuttle', 'parked')`). While it flies,
 * the layer is switched off and its image is drawn lifted, with thrust, a
 * shadow and dust, by drawWorld (called from world.js every frame).
 */
var BridgeShip = (function () {
  var SHIP = { bridge: 1, quarters: 1, hangar: 1, gameroom: 1 };
  var LANDING = { lumar: 'lumar', arcadia: 'arcadia-skypad', enigma: 'enigma-dock', singularity: 'singularity', verdance: 'verdance-village', hoarfell: 'hoarfell', sylvara: 'sylvara' };   // Verdance: Brambleford's green, the farm's up the lane
  var HANGAR_SPAWN = { x: 8, y: 9 };
  var anim = null;      // the shuttle in the air in this world
  var busy = false;

  function isShipWorld(id) { return !!SHIP[id]; }

  function locationOf(id) {
    if (!id) return null;
    if (/^lumar/.test(id)) return 'lumar';
    if (/^(arcadia|cyber-noodle|chrome-clinic|junk-pawn|tech-repair)/.test(id)) return 'arcadia';
    if (/^enigma/.test(id)) return 'enigma';
    if (id === 'singularity') return 'singularity';
    if (/^verdance/.test(id)) return 'verdance';
    if (/^hoarfell/.test(id)) return 'hoarfell';
    if (/^sylvara/.test(id)) return 'sylvara';
    return null;
  }

  function bayText() {
    var loc = BridgeOrbit.getLocation();
    var lines = {
      'deep-space': 'BEYOND THE FIELD:\\nNOTHING BUT STARS.\\n\\nJUMP SOMEWHERE FROM THE\\nSTAR MAP ON THE BRIDGE.',
      lumar: 'BEYOND THE FIELD: LUMAR.\\n\\nGREEN SEAS UNDER CLOUD,\\nISLANDS LIKE SCATTERED SALT.\\nTHE SHUTTLE IS FUELLED.',
      arcadia: 'BEYOND THE FIELD: ARCADIA.\\n\\nTHE NIGHT SIDE GLITTERS\\nEDGE TO EDGE WITH CITY.\\nTHE SHUTTLE IS FUELLED.',
      enigma: 'BEYOND THE FIELD:\\nENIGMA STATION, DARK,\\nTURNING SLOWLY BY ITS\\nRINGED GIANT.',
      singularity: 'BEYOND THE FIELD:\\nTHE SINGULARITY.\\n\\nLIGHT BENDS ROUND IT\\nLIKE WATER ROUND A STONE.',
      verdance: 'BEYOND THE FIELD: VERDANCE.\\n\\nGREEN COUNTRY UNDER\\nTWO SMALL MOONS.\\nTHE SHUTTLE IS FUELLED.',
      hoarfell: 'BEYOND THE FIELD: HOARFELL.\\n\\nWHITE TO THE POLES,\\nONE PEAK HIGHER THAN THE REST.\\nTHE SHUTTLE IS FUELLED.',
      sylvara: 'BEYOND THE FIELD: SYLVARA.\\n\\nONE FOREST, POLE TO POLE.\\nGOLD LIGHTS IN THE OLD WOOD.\\nTHE SHUTTLE IS FUELLED.'
    };
    return lines[BridgeOrbit.getLocation()] || lines['deep-space'];
  }

  // ---- in-world flight ---------------------------------------------------------------------
  function sceneId() {
    var w = BridgeWorld.getWorld();
    return w && w.scene && w.scene.id;
  }

  function setParked(on) {
    var id = sceneId();
    if (!id || typeof BridgeScene === 'undefined') return;
    var map = {};
    var cur = BridgeScene.getLayers(id);
    for (var k in cur) map[k] = cur[k];
    map.shuttle = on ? 'parked' : null;
    BridgeScene.setLayers(id, map);
  }

  function fly(kind, dur, height) {
    var id = sceneId();
    var L = id && BridgeScene.layerImage(id, 'shuttle', 'parked');
    if (!L) return Promise.resolve();
    return new Promise(function (resolve) {
      setParked(false);
      anim = { kind: kind, start: performance.now(), dur: dur, height: height, L: L, resolve: resolve, dust: [] };
    });
  }

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  // between lifting off one pad and coming down on the next: a short fade to black
  function fade(dark, ms) {
    var el = document.getElementById('ship-fade');
    if (!el) { el = document.createElement('div'); el.id = 'ship-fade'; document.body.appendChild(el); }
    el.style.transitionDuration = ms + 'ms';
    requestAnimationFrame(function () { el.classList.toggle('dark', dark); });
    return new Promise(function (r) { setTimeout(r, ms + 40); });
  }
  function sound(name) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(name); }

  function drawWorld(ctx, world, offX, offY, ts, now) {
    if (!anim) return;
    var t = Math.min(1, (performance.now() - anim.start) / anim.dur);
    var a = anim.kind === 'lift' ? t * t * t : 1 - ease(t);      // 0 on the pad, 1 up high
    var alt = Math.round(a * anim.height);
    var L = anim.L, b = L.box, m = L.meta;
    var x = Math.round(offX - m.originX + b.x), y = Math.round(offY - m.originY + b.y);
    var gx = x + b.w * 0.5, gy = y + b.h * 0.8;           // where it sits on the ground
    var near = 1 - a;
    // shadow on the ground, smaller and fainter the higher it is
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + (0.35 * near).toFixed(2) + ')';
    ctx.beginPath();
    ctx.ellipse(gx, gy, b.w * (0.3 + 0.15 * near), b.h * (0.1 + 0.05 * near), 0, 0, Math.PI * 2);
    ctx.fill();
    // thrust washing the ground, and dust kicked up while it's low
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, b.w * 0.55);
    g.addColorStop(0, 'rgba(140,220,255,' + (0.45 * near).toFixed(2) + ')');
    g.addColorStop(1, 'rgba(80,160,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx - b.w, gy - b.w * 0.6, b.w * 2, b.w * 1.2);
    ctx.restore();
    if (near > 0.3 && Math.random() < 0.8) {
      anim.dust.push({ x: gx + (Math.random() - 0.5) * b.w * 0.4, y: gy, vx: (Math.random() - 0.5) * 3.2, vy: -Math.random() * 0.6, life: 1 });
    }
    // each world touches down its own way: sand on Lumar's beach, grass flattening on Verdance, the pad's
    // ring pulsing on an Arcadia rooftop, echoes of the skiff at the Singularity
    var style = (world && world.tileset) || '';
    if (style === 'arcadia' && near > 0.1) {
      var pulse = (performance.now() / 600) % 1;
      ctx.save();
      ctx.strokeStyle = 'rgba(92,200,208,' + (0.6 * (1 - pulse) * near).toFixed(2) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(gx, gy, b.w * (0.3 + pulse * 0.5), b.h * (0.12 + pulse * 0.2), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (style === 'enigma' && world.dock && world.dock.clamps && near > 0.35) {
      // the cradle's clamps reach for the hull with magnetic tethers as it settles
      var ts2 = ts || 32, hy = y - alt + b.h * 0.6;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      world.dock.clamps.forEach(function (c, i) {
        var cx = offX + c[0] * ts2, cy = offY + c[1] * ts2;
        var tx = gx + (c[0] * ts2 + offX < gx ? -1 : 1) * b.w * 0.3, ty = hy;
        var fl = 0.5 + 0.5 * Math.sin(now / 40 + i * 2);
        ctx.strokeStyle = 'rgba(120,230,255,' + (0.55 * (near - 0.35) / 0.65 * fl + 0.1).toFixed(2) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(cx), Math.round(cy));
        var mx = (cx + tx) / 2 + Math.sin(now / 30 + i) * 3, my = (cy + ty) / 2 + Math.cos(now / 26 + i) * 3;
        ctx.quadraticCurveTo(mx, my, Math.round(tx), Math.round(ty));
        ctx.stroke();
        ctx.fillStyle = 'rgba(200,250,255,' + (0.7 * fl).toFixed(2) + ')';
        ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3);
      });
      ctx.restore();
    }
    if (style === 'singularity' && alt > 4) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var e = 1; e <= 3; e++) {
        ctx.globalAlpha = 0.18 / e;
        ctx.drawImage(L.canvas, x + e * 2, y - alt - e * 9 * (anim.kind === 'land' ? 1 : -1));
      }
      ctx.restore();
    }
    ctx.fillStyle = style === 'lumar' ? 'rgba(220,200,160,0.6)' : style === 'singularity' ? 'rgba(180,150,240,0.5)' :
      style === 'verdance' ? 'rgba(150,200,90,0.6)' : style === 'hoarfell' ? 'rgba(250,252,255,0.85)' : style === 'sylvara' ? 'rgba(170,220,150,0.6)' :
      style === 'enigma' ? 'rgba(160,230,255,0.7)' : 'rgba(200,190,170,0.5)';
    for (var i = anim.dust.length - 1; i >= 0; i--) {
      var d = anim.dust[i];
      d.x += d.vx; d.y += d.vy; d.life -= 0.03;
      if (d.life <= 0) { anim.dust.splice(i, 1); continue; }
      ctx.globalAlpha = d.life * 0.6;
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 2);
    }
    ctx.globalAlpha = 1;
    // the shuttle, and the downward glow of its lift jets under it
    var bob = alt > 2 ? Math.round(Math.sin(now / 160) * 1) : 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var jx = x + b.w * 0.42, jy = y + b.h * 0.72 - alt;
    var jg = ctx.createRadialGradient(jx, jy, 0, jx, jy + 10, 22);
    jg.addColorStop(0, 'rgba(220,245,255,0.85)');
    jg.addColorStop(0.4, 'rgba(110,200,255,0.45)');
    jg.addColorStop(1, 'rgba(60,120,255,0)');
    ctx.fillStyle = jg;
    ctx.fillRect(jx - 24, jy - 8, 48, 44);
    ctx.restore();
    ctx.drawImage(L.canvas, x, y - alt + bob);
    if (t >= 1) {
      var done = anim.resolve, kind = anim.kind;
      anim = null;
      if (kind === 'land') setParked(true);
      done();
    }
  }

  // ---- the flows ---------------------------------------------------------------------------
  function lockControls(on) {
    if (typeof BridgeControls === 'undefined') return;
    if (on) BridgeControls.disable(); else BridgeControls.enable();
  }

  function board() {
    var id = BridgeWorld.getWorldId();
    if (isShipWorld(id)) launch();
    else returnToShip();
  }

  /** From the mothership down to the world it's parked over. */
  function launch() {
    if (busy) return;
    var loc = BridgeOrbit.getLocation();
    var dest = LANDING[loc];
    if (!dest) {
      BridgeInteractions.say('SHUTTLE', 'NOTHING BELOW BUT STARS.\\n\\nJUMP SOMEWHERE FROM THE\\nSTAR MAP ON THE BRIDGE FIRST.');
      return;
    }
    busy = true;
    lockControls(true);
    BridgeCharacter.setHidden(true);
    sound('lift');
    fly('lift', 1500, 90).then(function () {
      return fade(true, 450);
    }).then(function () {
      arrive(dest);
    });
  }

  function arrive(dest) {
    BridgeWorld.load(dest, function (w) {
      var pad = w.shuttle;
      BridgeState.transition('world', { worldId: dest, spawn: pad ? { x: pad.spawn[0], y: pad.spawn[1] } : null });
      if (pad) {
        BridgeCharacter.setHidden(true);
        lockControls(true);
        fade(false, 450);
        sound('land');
        fly('land', 2400, 150).then(function () {
          BridgeCharacter.setHidden(false);
          lockControls(false);
          busy = false;
        });
      } else {
        fade(false, 450);
        busy = false;
      }
    });
  }

  /** From anywhere off the ship, back up to the hangar. */
  function returnToShip() {
    if (busy) return;
    busy = true;
    var id = BridgeWorld.getWorldId();
    var loc = locationOf(id) || BridgeOrbit.getLocation();
    if (LANDING[loc]) BridgeOrbit.setLocation(loc);
    var w = BridgeWorld.getWorld();
    lockControls(true);
    BridgeCharacter.setHidden(true);
    BridgeState.clearWorldPos();
    if (w && w.shuttle) sound('lift');
    var first = (w && w.shuttle) ? fly('lift', 1800, 170) : Promise.resolve();
    first.then(function () {
      return fade(true, 450);
    }).then(function () {
      BridgeWorld.load('hangar', function () {
        BridgeState.transition('world', { worldId: 'hangar', spawn: HANGAR_SPAWN });
        BridgeCharacter.setHidden(true);
        lockControls(true);
        fade(false, 450);
        sound('land');
        fly('land', 1400, 60).then(function () {
          BridgeCharacter.setHidden(false);
          BridgeCharacter.setFacing('down');
          lockControls(false);
          busy = false;
        });
      });
    });
  }

  // ---- arriving in orbit after a jump ----------------------------------------------------------
  /** Straight down after a jump: the screen is dark from the cutscene; touch down on the world's pad. */
  function descend(world) {
    BridgeOrbit.setLocation(world.id);
    var dest = LANDING[BridgeOrbit.getLocation()];
    if (!dest || busy) return arriveInOrbit(world);
    busy = true;
    lockControls(true);
    fade(true, 0).then(function () { arrive(dest); });
  }

  function arriveInOrbit(dest) {
    BridgeOrbit.setLocation(dest.id);
    var loc = BridgeOrbit.getLocation();
    BridgeWorld.load('bridge', function () {
      BridgeState.transition('world', { worldId: 'bridge', spawn: { x: 10, y: 10 } });
      showArrival(loc);
    });
  }

  function showArrival(loc) {
    var old = document.getElementById('arrival-card');
    if (old) old.remove();
    var card = document.createElement('div');
    card.id = 'arrival-card';
    card.className = 'arrival-card';
    card.innerHTML =
      '<div class="arrival-kicker">In orbit</div>' +
      '<div class="arrival-place">' + BridgeOrbit.placeName(loc) + '</div>' +
      '<div class="arrival-actions">' +
        '<button class="arrival-go" id="arrival-go"><span class="ip-key">E</span> Take the shuttle down</button>' +
        '<button class="arrival-stay" id="arrival-stay">Stay aboard</button>' +
      '</div>';
    document.body.appendChild(card);
    requestAnimationFrame(function () { card.classList.add('visible'); });
    function close() {
      document.removeEventListener('keydown', onKey, true);
      card.classList.remove('visible');
      setTimeout(function () { card.remove(); }, 250);
    }
    function go() { close(); launch(); }
    function onKey(e) {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    }
    document.addEventListener('keydown', onKey, true);
    card.querySelector('#arrival-go').addEventListener('click', go);
    card.querySelector('#arrival-stay').addEventListener('click', close);
  }

  return { isShipWorld: isShipWorld, locationOf: locationOf, board: board, launch: launch, returnToShip: returnToShip,
           arriveInOrbit: arriveInOrbit, descend: descend, drawWorld: drawWorld, bayText: bayText, isBusy: function () { return busy; } };
})();
