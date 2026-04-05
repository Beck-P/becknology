import React, { useEffect, useState } from 'react';

function CardDraftPicker({ cards, keepCount, onSubmit, rankLabel, SUIT_SYMBOLS }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    setSelected([]);
  }, [cards, keepCount]);

  function toggleCard(index) {
    setSelected(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      if (prev.length >= keepCount) return prev;
      return [...prev, index];
    });
  }

  const canLock = selected.length === keepCount;

  return (
    <>
      <div className="pixel-font text-[9px] text-indigo-300 mb-3">{'\uD83C\uDCCF'} CHOOSE YOUR HAND — Pick {keepCount}</div>
      <div className="flex flex-wrap justify-center gap-2 mb-3">
        {cards.map((card, i) => {
          const isSelected = selected.includes(i);
          const red = card.suit === 'h' || card.suit === 'd';
          return (
            <button
              key={i}
              onClick={() => toggleCard(i)}
              className={`relative rounded-lg border-2 p-2 text-center transition ${
                isSelected
                  ? 'border-indigo-400 scale-110 shadow-lg shadow-indigo-500/30'
                  : 'border-slate-400 opacity-80'
              }`}
              style={{ minWidth: 48, minHeight: 64, background: '#ffffff' }}
            >
              <div className="font-extrabold" style={{ fontSize: 18, color: red ? '#dc2626' : '#000000' }}>
                {rankLabel(card.rank)}
              </div>
              <div style={{ fontSize: 16, color: red ? '#e11d48' : '#000000' }}>
                {SUIT_SYMBOLS[card.suit]}
              </div>
              {isSelected ? <div className="absolute -top-1 -right-1 bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">{'\u2713'}</div> : null}
            </button>
          );
        })}
      </div>
      <button
        disabled={!canLock}
        onClick={() => onSubmit([...selected].sort((a, b) => a - b))}
        className={`w-full py-3 rounded-xl font-bold text-sm transition ${
          canLock
            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg hover:scale-[1.02] active:scale-95'
            : 'bg-white/5 text-slate-600 cursor-not-allowed'
        }`}
      >
        {canLock ? '\uD83D\uDD12 LOCK IN' : `Select ${keepCount - selected.length} more`}
      </button>
    </>
  );
}

function CountdownTimer({ deadline }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  const [initialRemaining, setInitialRemaining] = useState(Math.max(1, Math.ceil((deadline - Date.now()) / 1000)));

  useEffect(function() {
    const startingRemaining = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
    setInitialRemaining(startingRemaining);
    setRemaining(startingRemaining);
    var interval = setInterval(function() {
      var r = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) clearInterval(interval);
    }, 250);
    return function() { clearInterval(interval); };
  }, [deadline]);

  const progressPct = Math.max(0, Math.min(100, (remaining / initialRemaining) * 100));

  return (
    <div className="mt-2">
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-100" style={{
          width: `${progressPct}%`,
          background: remaining > 5 ? "#22c55e" : remaining > 2 ? "#fbbf24" : "#ef4444"
        }} />
      </div>
      <div className="pixel-font text-[8px] text-slate-500 mt-1">{remaining}s</div>
    </div>
  );
}

export function PlayerActionBar({ pendingAction, onAction, playerName, rankLabel, SUIT_SYMBOLS }) {
  if (!pendingAction) return null;

  const isMyTurn = pendingAction.playerName === playerName;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-2 pb-2 sm:px-4" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <div className="pointer-events-auto mx-auto max-w-md rounded-[1.5rem] border border-indigo-500/30 bg-black/95 p-4 text-center shadow-2xl backdrop-blur">
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain pr-1" style={{ maxHeight: 'min(72dvh, 36rem)' }}>
        {pendingAction.action === 'pass_bomb' && isMyTurn ? (
          <>
            <div className="pixel-font text-[11px] text-red-400 mb-3 animate-pulse" style={{ textShadow: '0 0 10px rgba(239,68,68,0.5)' }}>
              PASS THE BOMB!
            </div>
            <div className="space-y-2">
              {(pendingAction.targets || []).map(target => (
                <button
                  key={target}
                  onClick={() => onAction({ action: 'pass_bomb', target })}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-base shadow-lg transition hover:scale-[1.02] active:scale-95"
                >
                  Throw to {target}
                </button>
              ))}
            </div>
          </>
        ) : pendingAction.action === 'pass_bomb' && !isMyTurn ? (
          <div className="pixel-font text-[9px] text-red-400">
            Bomb is with {pendingAction.playerName}... {(pendingAction.tickNumber || 0) + 1}/{pendingAction.totalTicks || '?'}
          </div>
        ) : pendingAction.action === 'draw' && isMyTurn ? (
          <>
            <div className="pixel-font text-[11px] text-purple-300 mb-3" style={{ textShadow: '0 0 10px rgba(168,85,247,0.5)' }}>
              {"\uD83D\uDD2E"} YOUR TURN {"\uD83D\uDD2E"}
            </div>
            <button
              onClick={() => onAction({ action: 'draw' })}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg shadow-lg shadow-purple-600/30 transition hover:scale-[1.02] active:scale-95"
              style={{ textShadow: '0 0 8px rgba(139,92,246,0.5)' }}
            >
              {"\uD83E\uDD1E"} DRAW FROM THE BAG
            </button>
          </>
        ) : pendingAction.action === 'draw' && !isMyTurn ? (
          <div className="pixel-font text-[9px] text-slate-500">
            Waiting for {pendingAction.playerName} to draw...
          </div>
        ) : pendingAction.action === 'eject' ? (
          (() => {
            const ejects = (typeof window !== 'undefined' && window.__interactiveRocketEjects) || {};
            const hasEjected = ejects[playerName];
            if (hasEjected) {
              return (
                <div className="pixel-font text-[9px] text-green-400">
                  🪂 LANDED SAFELY — {hasEjected.distance >= 1000000 ? (hasEjected.distance/1000000).toFixed(1) + 'M km' : Math.round(hasEjected.distance).toLocaleString() + ' km'}
                </div>
              );
            }
            return (
              <>
                <div className="pixel-font text-[9px] text-indigo-300 mb-2">🚀 YOUR ROCKET IS FLYING</div>
                <button
                  onClick={() => onAction({ action: 'eject' })}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-lg shadow-lg shadow-red-600/30 transition hover:scale-[1.02] active:scale-95"
                >
                  🪂 EJECT
                </button>
                <div className="pixel-font text-[8px] text-slate-600 mt-2">Tap to land safely at current distance</div>
              </>
            );
          })()
        ) : pendingAction.action === 'pick_stock' && isMyTurn ? (
          <>
            <div className="pixel-font text-[9px] text-emerald-300 mb-2">{"\uD83D\uDCC8"} YOUR PICK</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {(pendingAction.stockPool || []).filter(s => !pendingAction.taken[s.ticker]).map(s => (
                <button
                  key={s.ticker}
                  onClick={() => onAction({ action: 'pick_stock', ticker: s.ticker })}
                  className="w-full py-2.5 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-left transition hover:bg-emerald-500/25 active:scale-95"
                >
                  <span className="font-mono text-sm font-bold text-emerald-300">{s.ticker}</span>
                  <span className="ml-2 font-mono text-[10px] text-slate-500">{s.note}</span>
                </button>
              ))}
            </div>
          </>
        ) : pendingAction.action === 'pick_stock' && !isMyTurn ? (
          <div className="pixel-font text-[9px] text-slate-500">
            {pendingAction.playerName} is picking...
          </div>
        ) : pendingAction.action === 'sell' ? (
          (() => {
            const sellState = (typeof window !== 'undefined' && window.__stockSellState) || {};
            const hasSold = sellState[playerName];
            const myTicker = pendingAction.playerStocks?.[playerName];

            if (hasSold) {
              return (
                <div className="text-center">
                  <div className="pixel-font text-[9px] text-emerald-400 mb-1">SOLD {myTicker}</div>
                  <div className="font-mono text-lg font-bold text-white">${hasSold.price.toFixed(2)}</div>
                  <div className={`font-mono text-xs ${hasSold.percentChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {hasSold.percentChange >= 0 ? '+' : ''}{hasSold.percentChange.toFixed(1)}%
                  </div>
                </div>
              );
            }

            if (!myTicker) {
              return <div className="pixel-font text-[9px] text-slate-500">Watching the charts...</div>;
            }

            return (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="pixel-font text-[9px] text-emerald-300">{myTicker}</span>
                  <span className="font-mono text-xs text-slate-500">HOLDING</span>
                </div>
                <button
                  onClick={() => onAction({ action: 'sell', ticker: myTicker })}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-white font-bold text-base shadow-lg shadow-emerald-600/30 transition hover:scale-[1.02] active:scale-95"
                >
                  {"\uD83D\uDCB0"} SELL NOW
                </button>
              </>
            );
          })()
        ) : pendingAction.action === 'stop_number' && isMyTurn ? (
          <>
            <div className="pixel-font text-[9px] text-cyan-300 mb-2">#️⃣ YOUR NUMBER</div>
            <button onClick={() => onAction({ action: 'stop_number' })}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-bold text-lg shadow-lg transition hover:scale-[1.02] active:scale-95">
              STOP ✋
            </button>
          </>
        ) : pendingAction.action === 'stop_number' && !isMyTurn ? (
          <div className="pixel-font text-[9px] text-slate-500">Waiting for {pendingAction.playerName}...</div>
        ) : pendingAction.action === 'spin_wheel' && isMyTurn ? (
          <>
            <div className="pixel-font text-[9px] text-amber-300 mb-2">🎡 YOU'RE THE SPINNER</div>
            <button onClick={() => onAction({ action: 'spin_wheel' })}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-pink-500 text-white font-bold text-lg shadow-lg transition hover:scale-[1.02] active:scale-95">
              SPIN THE WHEEL 🎡
            </button>
          </>
        ) : pendingAction.action === 'spin_wheel' && !isMyTurn ? (
          <div className="pixel-font text-[9px] text-slate-500">{pendingAction.playerName} is spinning...</div>
        ) : pendingAction.action === 'pull_slots' && isMyTurn ? (
          <>
            <div className="pixel-font text-[9px] text-pink-300 mb-2">🎰 YOUR TURN</div>
            <button onClick={() => onAction({ action: 'pull_slots' })}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 text-white font-bold text-lg shadow-lg transition hover:scale-[1.02] active:scale-95">
              PULL THE LEVER 🎰
            </button>
          </>
        ) : pendingAction.action === 'pull_slots' && !isMyTurn ? (
          <div className="pixel-font text-[9px] text-slate-500">Waiting for {pendingAction.playerName}...</div>
        ) : pendingAction.action === 'flip_coin' && isMyTurn ? (
          <>
            <div className="pixel-font text-[9px] text-yellow-300 mb-2">🪙 YOUR FLIP</div>
            <button onClick={() => onAction({ action: 'flip_coin' })}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold text-lg shadow-lg transition hover:scale-[1.02] active:scale-95">
              FLIP 🪙
            </button>
          </>
        ) : pendingAction.action === 'flip_coin' && !isMyTurn ? (
          <div className="pixel-font text-[9px] text-slate-500">{pendingAction.playerName} is flipping...</div>
        ) : pendingAction.action === 'roll_dice' && isMyTurn ? (
          <>
            <div className="pixel-font text-[9px] text-amber-300 mb-2">{"\uD83C\uDFB2"} YOUR ROLL</div>
            <button onClick={() => onAction({ action: 'roll_dice' })}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 text-white font-bold text-lg shadow-lg transition hover:scale-[1.02] active:scale-95">
              ROLL DICE {"\uD83C\uDFB2"}
            </button>
          </>
        ) : pendingAction.action === 'roll_dice' && !isMyTurn ? (
          <div className="pixel-font text-[9px] text-slate-500">Waiting for {pendingAction.playerName} to roll...</div>
        ) : pendingAction.action === 'reroll_dice' && isMyTurn ? (
          <>
            <div className="pixel-font text-[9px] text-amber-300 mb-2">You rolled: {pendingAction.d1} + {pendingAction.d2} = {pendingAction.total}</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => onAction({ action: 'keep_dice' })}
                className="w-full sm:flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-lg transition active:scale-95">
                KEEP {"\u2713"}
              </button>
              <button onClick={() => onAction({ action: 'reroll_die', dieIndex: 0 })}
                className="w-full sm:flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold text-sm shadow-lg transition active:scale-95">
                Re-roll {pendingAction.d1}
              </button>
              <button onClick={() => onAction({ action: 'reroll_die', dieIndex: 1 })}
                className="w-full sm:flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold text-sm shadow-lg transition active:scale-95">
                Re-roll {pendingAction.d2}
              </button>
            </div>
          </>
        ) : pendingAction.action === 'reroll_dice' && !isMyTurn ? (
          <div className="pixel-font text-[9px] text-slate-500">{pendingAction.playerName} is deciding...</div>
        ) : pendingAction.action === 'pick_card_blind' ? (
          (() => {
            const myCards = pendingAction.hands?.[playerName];
            if (!myCards) return <div className="pixel-font text-[9px] text-slate-500">Waiting for others to pick...</div>;
            return (
              <>
                <div className="pixel-font text-[9px] text-indigo-300 mb-3">{"\uD83C\uDCCF"} PICK A CARD BLIND</div>
                <div className="flex justify-center gap-3 mb-2">
                  {[0, 1, 2].map(i => (
                    <button key={i} onClick={() => onAction({ action: 'pick_card_blind', cardIndex: i })}
                      className="w-16 h-20 rounded-lg border-2 border-indigo-400/50 bg-indigo-900/50 flex items-center justify-center text-3xl transition hover:bg-indigo-700/50 active:scale-90 hover:border-indigo-400">
                      {"\uD83C\uDCA0"}
                    </button>
                  ))}
                </div>
                <div className="pixel-font text-[7px] text-slate-600">Tap a card to pick it</div>
              </>
            );
          })()
        ) : pendingAction.action === 'drop_plinko' && isMyTurn ? (
          <>
            <div className="pixel-font text-[9px] text-cyan-300 mb-2">{"\uD83D\uDD34"} DROP YOUR BALL</div>
            <div className="flex flex-wrap justify-center gap-1.5 mb-1">
              {Array.from({ length: 13 }, (_, i) => (
                <button key={i} onClick={() => onAction({ action: 'drop_plinko', column: i })}
                  className="w-8 h-8 rounded-lg bg-cyan-600/30 border border-cyan-400/30 text-cyan-300 font-mono text-xs font-bold transition hover:bg-cyan-500/40 active:scale-90">
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="pixel-font text-[7px] text-slate-600">Pick a column (1-13)</div>
          </>
        ) : pendingAction.action === 'drop_plinko' && !isMyTurn ? (
          <div className="pixel-font text-[9px] text-slate-500">{pendingAction.playerName} is choosing a column...</div>
        ) : pendingAction.action === 'pick_lane' && isMyTurn ? (
          <>
            <div className="pixel-font text-[9px] text-green-300 mb-2">{"\uD83C\uDFC7"} PICK YOUR LANE</div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {(pendingAction.lanes || []).filter(l => !pendingAction.taken[l]).map(l => (
                <button key={l} onClick={() => onAction({ action: 'pick_lane', lane: l })}
                  className="w-full py-2.5 px-3 rounded-lg bg-green-500/15 border border-green-500/20 text-left transition hover:bg-green-500/25 active:scale-95">
                  <span className="font-bold text-sm text-green-300">{l}</span>
                </button>
              ))}
            </div>
          </>
        ) : pendingAction.action === 'pick_lane' && !isMyTurn ? (
          <div className="pixel-font text-[9px] text-slate-500">{pendingAction.playerName} is picking a lane...</div>
        ) : pendingAction.action === 'whip_horse' ? (
          (() => {
            const whips = pendingAction.whipsRemaining?.[playerName] || 0;
            if (whips <= 0) {
              return (
                <div className="text-center">
                  <div className="pixel-font text-[9px] text-slate-500">No whips remaining</div>
                  <div className="pixel-font text-[8px] text-slate-600 mt-1">Turn {pendingAction.turnNumber}/{pendingAction.totalTurns}</div>
                </div>
              );
            }
            return (
              <>
                <div className="pixel-font text-[9px] text-green-300 mb-2">{"\uD83C\uDFC7"} RACE — Turn {pendingAction.turnNumber}/{pendingAction.totalTurns}</div>
                <button onClick={() => onAction({ action: 'whip_horse' })}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-base shadow-lg transition hover:scale-[1.02] active:scale-95">
                  {"\uD83E\uDE7F"} WHIP! ({whips} left)
                </button>
                <div className="pixel-font text-[7px] text-slate-600 mt-1">Guarantee your horse advances this turn</div>
              </>
            );
          })()
        ) : pendingAction.action === 'shield' && isMyTurn ? (
          <>
            <div className="pixel-font text-[11px] text-red-400 mb-2 animate-pulse" style={{ textShadow: '0 0 10px rgba(239,68,68,0.5)' }}>
              {"\u26A0\uFE0F"} TARGETED! USE SHIELD?
            </div>
            <button onClick={() => onAction({ action: 'shield' })}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg shadow-lg shadow-blue-600/30 transition hover:scale-[1.02] active:scale-95 animate-pulse">
              {"\uD83D\uDEE1\uFE0F"} ACTIVATE SHIELD
            </button>
          </>
        ) : pendingAction.action === 'shield' && !isMyTurn ? (
          <div className="pixel-font text-[9px] text-red-400">{"\uD83D\uDD2B"} Targeting {pendingAction.playerName}...</div>
        ) : pendingAction.action === 'shield_unavailable' ? (
          <div className="pixel-font text-[9px] text-slate-500">{"\uD83D\uDD2B"} Firing at {pendingAction.playerName}... (shield used)</div>
        ) : pendingAction.action === 'move_direction' ? (
          (() => {
            const alive = pendingAction.aliveNames || [];
            const isAlive = alive.includes(playerName);
            const received = pendingAction.received || {};
            if (!isAlive) {
              return <div className="pixel-font text-[9px] text-slate-500">Eliminated — watching zone {pendingAction.phase}</div>;
            }
            if (received[playerName]) {
              return <div className="pixel-font text-[9px] text-emerald-400">Move locked in!</div>;
            }
            return (
              <>
                <div className="pixel-font text-[9px] text-orange-300 mb-2">{"\uD83D\uDFE2"} ZONE SHRINKING — Phase {pendingAction.phase}</div>
                <div className="grid grid-cols-3 gap-1.5 max-w-[160px] mx-auto">
                  <div />
                  <button onClick={() => onAction({ action: 'move_direction', direction: 'up' })}
                    className="py-2 rounded-lg bg-orange-500/20 border border-orange-400/30 text-orange-300 font-bold text-lg transition active:scale-90">{"\u2191"}</button>
                  <div />
                  <button onClick={() => onAction({ action: 'move_direction', direction: 'left' })}
                    className="py-2 rounded-lg bg-orange-500/20 border border-orange-400/30 text-orange-300 font-bold text-lg transition active:scale-90">{"\u2190"}</button>
                  <button onClick={() => onAction({ action: 'move_direction', direction: 'stay' })}
                    className="py-2 rounded-lg bg-slate-500/20 border border-slate-400/30 text-slate-300 font-bold text-xs transition active:scale-90">STAY</button>
                  <button onClick={() => onAction({ action: 'move_direction', direction: 'right' })}
                    className="py-2 rounded-lg bg-orange-500/20 border border-orange-400/30 text-orange-300 font-bold text-lg transition active:scale-90">{"\u2192"}</button>
                  <div />
                  <button onClick={() => onAction({ action: 'move_direction', direction: 'down' })}
                    className="py-2 rounded-lg bg-orange-500/20 border border-orange-400/30 text-orange-300 font-bold text-lg transition active:scale-90">{"\u2193"}</button>
                  <div />
                </div>
              </>
            );
          })()
        ) : pendingAction.action === 'choose_cards' ? (
          (() => {
            const myCards = pendingAction.hands?.[playerName];
            if (!myCards) return <div className="pixel-font text-[9px] text-slate-500">Waiting for others to draft...</div>;
            return <CardDraftPicker cards={myCards} keepCount={pendingAction.keepCount} onSubmit={(indices) => onAction({ action: 'choose_cards', indices })} rankLabel={rankLabel} SUIT_SYMBOLS={SUIT_SYMBOLS} />;
          })()
        ) : pendingAction.type === "waiting" ? (
          <div className="pixel-font text-[9px] text-indigo-400 animate-pulse">WAITING FOR YOUR TURN...</div>
        ) : (
          <div className="pixel-font text-[9px] text-amber-400">ACTION REQUIRED</div>
        )}
        {pendingAction.deadline && (isMyTurn || pendingAction.action === 'choose_cards' || pendingAction.action === 'pick_stock' || pendingAction.action === 'pick_card_blind' || pendingAction.action === 'move_direction') ? (
          <CountdownTimer deadline={pendingAction.deadline} />
        ) : null}
      </div>
    </div>
    </div>
  );
}
