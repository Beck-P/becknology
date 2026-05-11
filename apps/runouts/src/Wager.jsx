/**
 * Wager mode — when Runouts loads inside the bridge's cabinet modal,
 * the player picks a wager amount and competes against 3 fake AI pilots
 * using the normal Runouts mode/tournament selector.
 *
 * Components:
 *   WagerSetupBar  — slim wager-amount bar (chips, slider, numeric) +
 *                    live projected payout. Sits inside the existing
 *                    Runouts pre-game UI.
 *   WagerRoster    — read-only roster display replacing the name editor:
 *                    pilot highlighted as YOU, 3 AI competitors below.
 *   WagerPayout    — post-game overlay (won/lost reveal + roster + balance)
 *
 * Payout math (perfectly fair against a 4-contestant runout):
 *   winner goal: 25% chance × 4×  = EV 1.0
 *   loser  goal: 75% chance × 1.333× ≈ EV 1.0
 */
import React, { useMemo } from 'react';

// Payout multipliers (fair odds against 4 contestants total).
const PAYOUT = {
  winner: 4.0,
  loser:  1.333,
};

export function computePayout(amount, goal, won) {
  if (!won) return 0;
  return Math.floor(amount * (PAYOUT[goal] || 0));
}

export function wagerProjectedPayout(amount, goal) {
  return Math.floor(amount * (PAYOUT[goal] || 0));
}

// ---- Slim wager amount bar (inline in the existing setup UI) ----
export function WagerSetupBar({ balance, amount, onAmountChange, selectionGoal }) {
  const presets = [10, 25, 50, 100].filter(p => p <= balance);
  const projectedPayout = wagerProjectedPayout(amount, selectionGoal);
  const projectedNet = projectedPayout - amount;

  const safeBalance = Math.max(0, balance || 0);
  const clamp = (v) => Math.max(0, Math.min(safeBalance, Math.floor(v || 0)));

  return (
    <div style={{
      marginBottom: 16,
      padding: '14px 16px',
      background: 'linear-gradient(180deg, rgba(165,180,252,0.10), rgba(99,102,241,0.04))',
      border: '1px solid rgba(165,180,252,0.35)',
      borderRadius: 8,
      boxShadow: '0 0 18px rgba(99,102,241,0.18)',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
    }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 9, letterSpacing: 4, color: '#a5b4fc', textTransform: 'uppercase' }}>▶ Wager</div>
        <div style={{ fontSize: 10, color: '#ffe080', letterSpacing: 2 }}>BALANCE 🪙 {safeBalance}</div>
      </div>

      {/* chip presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {presets.map(p => (
          <button key={p}
            type="button"
            onClick={() => onAmountChange(p)}
            style={chipStyle(amount === p)}>
            🪙 {p}
          </button>
        ))}
      </div>

      {/* slider + number */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="range"
          min={0}
          max={safeBalance}
          step={1}
          value={amount}
          onChange={(e) => onAmountChange(clamp(parseInt(e.target.value, 10)))}
          style={{ flex: 1, accentColor: '#a5b4fc' }}
        />
        <input
          type="number"
          min={0}
          max={safeBalance}
          value={amount}
          onChange={(e) => onAmountChange(clamp(parseInt(e.target.value || '0', 10)))}
          style={{
            width: 78,
            padding: '6px 8px',
            background: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(165,180,252,0.4)',
            color: '#ffe080',
            fontFamily: 'inherit',
            fontSize: 11,
            letterSpacing: 1,
            borderRadius: 4,
            textAlign: 'right',
          }}
        />
      </div>

      {/* projection */}
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                     fontSize: 9, letterSpacing: 2, color: '#888', textTransform: 'uppercase' }}>
        <span>If you win ({selectionGoal === 'winner' ? '×4 · 25% odds' : '×1.33 · 75% odds'})</span>
        <span style={{ color: amount > 0 ? '#80e088' : '#666' }}>
          recoup 🪙 {projectedPayout} <span style={{ opacity: 0.65 }}>({projectedNet >= 0 ? '+' : ''}{projectedNet} net)</span>
        </span>
      </div>
    </div>
  );
}

// ---- Roster display (replaces the name editor in wager mode) ----
export function WagerRoster({ pilotName, names }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8,
      fontFamily: '"Courier New", monospace',
    }}>
      {names.map((n, i) => {
        const isPilot = n === pilotName;
        return (
          <div key={n + ':' + i} style={{
            padding: '10px 12px',
            background: isPilot ? 'rgba(64, 200, 216, 0.16)' : 'rgba(0,0,0,0.35)',
            border: '1px solid ' + (isPilot ? 'rgba(64, 200, 216, 0.55)' : 'rgba(120,144,232,0.25)'),
            color: isPilot ? '#80e0e8' : '#b0b0c0',
            borderRadius: 4,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 11, letterSpacing: 2,
          }}>
            <span>{isPilot ? 'YOU' : 'AI'} · {n.toUpperCase()}</span>
            <span style={{ fontSize: 9, opacity: 0.55 }}>P{i + 1}</span>
          </div>
        );
      })}
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

        <div style={{ padding: '14px 18px 0' }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: 'rgba(120,144,232,0.7)', marginBottom: 8 }}>FINAL ROSTER</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(allNames || []).map(n => {
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
                  <span>{isPilot ? 'YOU · ' : 'AI · '}{(n || '').toUpperCase()}</span>
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
function chipStyle(active) {
  return {
    padding: '6px 12px',
    background: active ? 'rgba(165,180,252,0.22)' : 'transparent',
    border: '1px solid ' + (active ? 'rgba(165,180,252,0.8)' : 'rgba(120,144,232,0.3)'),
    color: active ? '#a5b4fc' : '#b0b0c0',
    fontFamily: 'inherit', fontSize: 10, letterSpacing: 2,
    borderRadius: 4, cursor: 'pointer',
  };
}
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
