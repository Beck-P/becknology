/**
 * Wager mode — when Runouts is loaded inside the bridge's cabinet modal,
 * we wrap the game in a wager loop:
 *
 *   PRE-GAME  → player picks wager amount, mode category, and selection goal.
 *               wagerCoins() deducts from their balance. Names auto-populate
 *               (pilot + 3 fake AI competitors).
 *   GAME      → the existing Runouts gameplay runs unmodified.
 *   PAYOUT    → after playbackDone, the wager outcome is reckoned and
 *               coins are awarded (or not). Player can play again or close
 *               the modal.
 *
 * Detection: window.self !== window.top (iframe context). Direct nav to
 * /runouts stays as the normal app.
 *
 * Math (perfectly fair — no house edge):
 *   - Winner goal: 25% chance pilot is picked. Payout = 4× wager on win.
 *   - Loser  goal: 75% chance pilot is NOT picked. Payout = 1.333× wager.
 */
import React, { useMemo, useState, useEffect, useCallback } from 'react';

// ---- Fake pilot callsign pool ----
const FAKE_CALLSIGNS = [
  'VOID_RUNNER', 'PIXEL_BANDIT', 'ENIGMA_03', 'CRACKED_TELEMETRY',
  'NEBULA_FOX', 'HALO_DRIFT', 'CIPHER_KIN', 'STELLAR_ORACLE',
  'NULL_HARMONIC', 'COSMIC_GHOST', 'IRON_GULL', 'STATIC_TIDE',
  'KESTREL_07', 'BINARY_MOTH', 'GLITCH_PROPHET', 'MOON_CARGO',
  'PARALLAX_KID', 'SILICON_OAK', 'RIPTIDE_ECHO', 'NEON_VESPER',
];

function pickFakeRoster(count, exclude) {
  const pool = FAKE_CALLSIGNS.filter(n => n !== exclude);
  const out = [];
  while (out.length < count && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

// ---- Mode categories (matches Runouts' three lazy-loaded modules) ----
export const MODE_CATEGORIES = {
  auto: { label: 'RANDOM', desc: 'Any mode, anything goes', modes: null },
  classic: {
    label: 'CLASSIC',
    desc: 'Wheel, dice, marbles, cards',
    modes: ['wheel', 'dice', 'high-card', 'coin-flips', 'black-marble', 'slots', 'rng']
  },
  heavy: {
    label: 'HEAVY',
    desc: 'Rockets, bombs, plinko, mayhem',
    modes: ['rocket', 'bomb', 'plinko', 'battle-royale']
  },
  strategic: {
    label: 'STRATEGIC',
    desc: 'Poker, tournaments',
    modes: ['holdem', 'plo']
  }
};

function pickModeFromCategory(category) {
  const meta = MODE_CATEGORIES[category];
  if (!meta || !meta.modes || !meta.modes.length) return null;
  return meta.modes[Math.floor(Math.random() * meta.modes.length)];
}

// Payout multipliers (fair odds against 4 contestants total).
const PAYOUT = {
  winner: 4.0,   // 25% chance × 4 = 1 (break-even on average)
  loser:  1.333, // 75% chance × 1.333 ≈ 1
};

export function computePayout(amount, goal, won) {
  if (!won) return 0;
  return Math.floor(amount * (PAYOUT[goal] || 0));
}

// ---- Pre-game overlay ----
export function WagerPregame({ pilotName, balance, onPlay, onLeave }) {
  const [amount, setAmount] = useState(() => {
    try {
      const last = parseInt(localStorage.getItem('runouts_wager_last') || '0', 10);
      if (Number.isFinite(last) && last > 0) return Math.min(last, balance);
    } catch (e) {}
    return Math.min(25, balance);
  });
  const [category, setCategory] = useState('auto');
  const [goal, setGoal] = useState('winner');
  const [fakeNames, setFakeNames] = useState(() => pickFakeRoster(3, pilotName));

  const presets = [10, 25, 50, 100].filter(p => p <= balance);
  const enoughCoins = amount > 0 && amount <= balance;
  const projectedPayout = useMemo(
    () => Math.floor(amount * (PAYOUT[goal] || 0)),
    [amount, goal]
  );

  function reroll() { setFakeNames(pickFakeRoster(3, pilotName)); }

  function handlePlay() {
    if (!enoughCoins) return;
    try { localStorage.setItem('runouts_wager_last', String(amount)); } catch (e) {}
    onPlay({
      amount,
      category,
      goal,
      forcedModeId: pickModeFromCategory(category),
      pilotName,
      fakeNames,
    });
  }

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <div style={headerStyle}>
          <div style={{ fontSize: 11, letterSpacing: 5, color: 'rgba(120,144,232,0.7)' }}>RUNOUTS · CABINET</div>
          <div style={{ fontSize: 24, letterSpacing: 4, color: '#a5b4fc', marginTop: 6 }}>PLACE YOUR WAGER</div>
        </div>

        {/* Balance */}
        <Row label="BALANCE">
          <span style={{ color: '#ffe080', fontSize: 18, letterSpacing: 2 }}>🪙 {balance}</span>
        </Row>

        {/* Amount picker */}
        <Row label="WAGER">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {presets.map(p => (
              <button key={p}
                onClick={() => setAmount(p)}
                style={chipStyle(amount === p)}>
                {p}
              </button>
            ))}
            <input
              type="range"
              min={0}
              max={balance}
              step={1}
              value={amount}
              onChange={e => setAmount(parseInt(e.target.value, 10))}
              style={sliderStyle}
            />
            <input
              type="number"
              min={0}
              max={balance}
              value={amount}
              onChange={e => setAmount(Math.max(0, Math.min(balance, parseInt(e.target.value || '0', 10))))}
              style={numberStyle}
            />
          </div>
        </Row>

        {/* Category */}
        <Row label="MODE">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {Object.entries(MODE_CATEGORIES).map(([k, m]) => (
              <button key={k} onClick={() => setCategory(k)} style={catStyle(category === k)}>
                <div style={{ fontSize: 11, letterSpacing: 3 }}>{m.label}</div>
                <div style={{ fontSize: 8, opacity: 0.55, marginTop: 2 }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </Row>

        {/* Goal */}
        <Row label="TARGET">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button onClick={() => setGoal('winner')} style={catStyle(goal === 'winner')}>
              <div style={{ fontSize: 11, letterSpacing: 3 }}>PICK WINNER</div>
              <div style={{ fontSize: 9, marginTop: 2, color: '#80e088' }}>×{PAYOUT.winner.toFixed(2)} payout</div>
              <div style={{ fontSize: 8, opacity: 0.55, marginTop: 1 }}>25% odds · high reward</div>
            </button>
            <button onClick={() => setGoal('loser')} style={catStyle(goal === 'loser')}>
              <div style={{ fontSize: 11, letterSpacing: 3 }}>PICK LOSER</div>
              <div style={{ fontSize: 9, marginTop: 2, color: '#80e088' }}>×{PAYOUT.loser.toFixed(2)} payout</div>
              <div style={{ fontSize: 8, opacity: 0.55, marginTop: 1 }}>75% odds · safer</div>
            </button>
          </div>
        </Row>

        {/* Roster */}
        <Row label="ROSTER">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={rosterRowStyle(true)}>YOU · {pilotName.toUpperCase()}</div>
            {fakeNames.map(n => (
              <div key={n} style={rosterRowStyle(false)}>AI · {n}</div>
            ))}
            <button onClick={reroll} style={{ ...catStyle(false), padding: '4px 8px', fontSize: 9, marginTop: 4, opacity: 0.7 }}>
              ↺ REROLL COMPETITORS
            </button>
          </div>
        </Row>

        {/* Projected */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(120,144,232,0.2)', marginTop: 4,
                       display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                       fontSize: 11, letterSpacing: 3 }}>
          <span style={{ color: '#888' }}>IF YOU WIN</span>
          <span style={{ color: '#ffe080', fontSize: 16 }}>+ 🪙 {projectedPayout - amount} net (recoup {projectedPayout})</span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 18px 18px' }}>
          <button onClick={onLeave} style={cancelBtnStyle}>← LEAVE</button>
          <button onClick={handlePlay} disabled={!enoughCoins}
            style={playBtnStyle(enoughCoins)}>
            PLAY · WAGER 🪙 {amount}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Payout overlay (post-game reveal) ----
export function WagerPayout({ wager, selectedName, allNames, onPlayAgain, onLeave, balance }) {
  const won = isWin(wager, selectedName);
  const payout = computePayout(wager.amount, wager.goal, won);
  const netDelta = payout - wager.amount;
  const goalText = wager.goal === 'winner' ? 'PICK WINNER' : 'PICK LOSER';

  return (
    <div style={overlayStyle}>
      <div style={{ ...panelStyle, padding: 0 }}>
        <div style={{
          padding: '32px 24px 24px', textAlign: 'center',
          background: won
            ? 'radial-gradient(ellipse at center, rgba(120,224,136,0.18), rgba(20,30,46,0.95))'
            : 'radial-gradient(ellipse at center, rgba(232,72,153,0.15), rgba(20,30,46,0.95))',
          borderBottom: '1px solid rgba(120,144,232,0.25)'
        }}>
          <div style={{ fontSize: 11, letterSpacing: 5, color: 'rgba(120,144,232,0.7)' }}>
            {goalText} · WAGERED 🪙 {wager.amount}
          </div>
          <div style={{
            fontSize: 44, letterSpacing: 6, marginTop: 12,
            color: won ? '#80e088' : '#f472b6',
            textShadow: won ? '0 0 24px rgba(120,224,136,0.5)' : '0 0 24px rgba(232,72,153,0.5)'
          }}>
            {won ? 'YOU WON' : 'YOU LOST'}
          </div>
          <div style={{ marginTop: 12, fontSize: 16, color: '#e0e0e0' }}>
            {won ? <>+ 🪙 <b style={{ color: '#ffe080' }}>{payout}</b></>
                 : <>– 🪙 <b style={{ color: '#f472b6' }}>{wager.amount}</b></>}
            <span style={{ marginLeft: 12, opacity: 0.6, fontSize: 12 }}>
              ({netDelta >= 0 ? '+' : ''}{netDelta} net)
            </span>
          </div>
        </div>

        {/* Roster reveal */}
        <div style={{ padding: '14px 18px 0' }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: 'rgba(120,144,232,0.7)', marginBottom: 8 }}>FINAL ROSTER</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {allNames.map(n => {
              const isPilot = n === wager.pilotName;
              const wasPicked = n === selectedName;
              return (
                <div key={n} style={{
                  padding: '8px 12px',
                  background: wasPicked ? 'rgba(120,144,232,0.25)' : 'rgba(0,0,0,0.3)',
                  border: '1px solid ' + (wasPicked ? 'rgba(165,180,252,0.6)' : 'rgba(120,144,232,0.15)'),
                  borderRadius: 4,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 12, letterSpacing: 2,
                  color: isPilot ? '#80e0e8' : '#e0e0e0'
                }}>
                  <span>{isPilot ? 'YOU · ' : 'AI · '}{n.toUpperCase()}</span>
                  <span style={{ fontSize: 10, opacity: 0.75 }}>
                    {wasPicked
                      ? (wager.goal === 'winner' ? '★ WINNER' : '☓ LOSER')
                      : '· · ·'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Balance + buttons */}
        <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between',
                       alignItems: 'center', borderTop: '1px solid rgba(120,144,232,0.2)', marginTop: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: '#888' }}>
            BALANCE: <span style={{ color: '#ffe080' }}>🪙 {balance}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 18px' }}>
          <button onClick={onLeave} style={cancelBtnStyle}>← LEAVE</button>
          <button onClick={onPlayAgain} style={playBtnStyle(true)}>PLAY AGAIN</button>
        </div>
      </div>
    </div>
  );
}

function isWin(wager, selectedName) {
  if (selectedName == null) return false;
  const pilotPicked = selectedName === wager.pilotName;
  if (wager.goal === 'winner') return pilotPicked;
  if (wager.goal === 'loser') return !pilotPicked;
  return false;
}

// ---- Shared styles ----
const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 9990,
  background: 'rgba(4, 8, 14, 0.92)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: '"Courier New", Consolas, monospace',
  color: '#e0e0e0', padding: 16,
};
const panelStyle = {
  width: 'min(560px, 96vw)',
  maxHeight: '94vh', overflowY: 'auto',
  background: 'linear-gradient(180deg, rgba(20,30,46,0.96), rgba(10,18,28,0.96))',
  border: '1px solid rgba(120,144,232,0.5)',
  borderRadius: 8,
  boxShadow: '0 0 36px rgba(120,144,232,0.28), inset 0 0 18px rgba(120,144,232,0.06)',
};
const headerStyle = {
  padding: '18px 18px 8px',
  borderBottom: '1px solid rgba(120,144,232,0.25)',
};
function Row({ label, children }) {
  return (
    <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(120,144,232,0.12)' }}>
      <div style={{ fontSize: 10, letterSpacing: 4, color: 'rgba(120,144,232,0.7)', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
function chipStyle(active) {
  return {
    padding: '6px 12px',
    background: active ? 'rgba(165,180,252,0.22)' : 'transparent',
    border: '1px solid ' + (active ? 'rgba(165,180,252,0.8)' : 'rgba(120,144,232,0.3)'),
    color: active ? '#a5b4fc' : '#b0b0c0',
    fontFamily: 'inherit', fontSize: 12, letterSpacing: 2,
    borderRadius: 4, cursor: 'pointer',
  };
}
function catStyle(active) {
  return {
    padding: '8px 10px',
    background: active ? 'rgba(165,180,252,0.18)' : 'transparent',
    border: '1px solid ' + (active ? 'rgba(165,180,252,0.7)' : 'rgba(120,144,232,0.25)'),
    color: active ? '#fff' : '#b0b0c0',
    fontFamily: 'inherit', textAlign: 'center', borderRadius: 4, cursor: 'pointer',
    transition: 'all 0.12s',
  };
}
function rosterRowStyle(isPilot) {
  return {
    padding: '6px 10px',
    background: isPilot ? 'rgba(64,200,216,0.12)' : 'rgba(0,0,0,0.25)',
    border: '1px solid ' + (isPilot ? 'rgba(64,200,216,0.5)' : 'rgba(120,144,232,0.15)'),
    color: isPilot ? '#80e0e8' : '#b0b0c0',
    fontSize: 11, letterSpacing: 2, borderRadius: 4,
  };
}
const sliderStyle = {
  flex: 1, minWidth: 140, height: 22,
  accentColor: '#a5b4fc',
};
const numberStyle = {
  width: 80,
  padding: '6px 8px',
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(120,144,232,0.4)',
  color: '#ffe080',
  fontFamily: 'inherit', fontSize: 13, letterSpacing: 2,
  borderRadius: 4, textAlign: 'right',
};
const cancelBtnStyle = {
  padding: '10px 16px',
  background: 'transparent',
  border: '1px solid rgba(160,120,220,0.5)',
  color: 'rgba(220,200,255,0.85)',
  fontFamily: 'inherit', fontSize: 12, letterSpacing: 4,
  borderRadius: 4, cursor: 'pointer',
};
function playBtnStyle(enabled) {
  return {
    flex: 1,
    padding: '10px 16px',
    background: enabled ? 'rgba(165,180,252,0.18)' : 'rgba(80,80,90,0.18)',
    border: '1px solid ' + (enabled ? 'rgba(165,180,252,0.7)' : 'rgba(120,120,140,0.4)'),
    color: enabled ? '#a5b4fc' : '#666',
    fontFamily: 'inherit', fontSize: 12, letterSpacing: 4,
    borderRadius: 4, cursor: enabled ? 'pointer' : 'not-allowed',
  };
}
