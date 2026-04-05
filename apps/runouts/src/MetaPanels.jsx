import React, { useEffect, useState } from 'react';

export function JoinScreen({ roomCode, names, joinedPlayers, onJoinAsPlayer, onJoinAsSpectator, onLeave }) {
  const [inputName, setInputName] = useState('');
  const trimmed = inputName.trim();
  const nameTaken = trimmed && joinedPlayers[trimmed];
  const canJoin = trimmed.length >= 1 && !nameTaken;

  return (
    <div className="app-screen flex flex-col items-center justify-center bg-[#0a0a1a] text-white p-6">
      <div className="pixel-font text-[9px] text-slate-500 mb-2 uppercase tracking-widest">Join Room</div>
      <div className="pixel-font text-2xl text-cyan-300 mb-6" style={{ textShadow: '0 0 10px rgba(34,211,238,0.5)' }}>{roomCode}</div>

      <div className="pixel-font text-[9px] text-slate-400 mb-4">ENTER YOUR NAME</div>
      <div className="w-full max-w-xs space-y-3">
        <input
          value={inputName}
          onChange={function(e) { setInputName(e.target.value); }}
          onKeyDown={function(e) { if (e.key === 'Enter' && canJoin) onJoinAsPlayer(trimmed); }}
          className="w-full rounded-xl border border-indigo-500/30 bg-white/[0.06] px-4 py-3 font-mono text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-400 focus:shadow-[0_0_16px_rgba(99,102,241,0.2)]"
          placeholder="Your name..."
          autoFocus
        />
        {nameTaken ? <div className="pixel-font text-[8px] text-amber-400">▸ That name is taken</div> : null}
        <button
          disabled={!canJoin}
          onClick={function() { onJoinAsPlayer(trimmed); }}
          className={"w-full py-3 px-4 rounded-xl font-mono text-sm font-bold transition " + (
            canJoin
              ? "bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30"
              : "bg-white/5 text-slate-600 cursor-not-allowed"
          )}
        >
          JOIN GAME
        </button>
      </div>

      {Object.keys(joinedPlayers).length > 0 ? (
        <div className="mt-6 w-full max-w-xs">
          <div className="pixel-font text-[7px] text-slate-600 uppercase tracking-widest mb-2">Players in room</div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(joinedPlayers).map(function(name) {
              return <span key={name} className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 font-mono text-xs text-indigo-300">📱 {name}</span>;
            })}
          </div>
        </div>
      ) : null}

      <button
        onClick={onJoinAsSpectator}
        className="mt-6 font-mono text-sm text-slate-500 hover:text-slate-300 transition"
      >
        Just Watch 👀
      </button>

      <button
        onClick={onLeave}
        className="mt-3 font-mono text-xs text-slate-600 hover:text-slate-400 transition"
      >
        ← Leave room
      </button>
    </div>
  );
}

export function VoteGrid({ votes, deadline, onVote, playerName, MODE_META }) {
  const [timeLeft, setTimeLeft] = useState(() => deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0);
  const [initialTimeLeft, setInitialTimeLeft] = useState(() => deadline ? Math.max(1, Math.ceil((deadline - Date.now()) / 1000)) : 1);

  useEffect(() => {
    if (!deadline) return;
    const startingRemaining = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
    setInitialTimeLeft(startingRemaining);
    setTimeLeft(startingRemaining);
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 250);
    return () => clearInterval(interval);
  }, [deadline]);

  const hasVoted = playerName && votes[playerName];
  const progressPct = Math.max(0, Math.min(100, (timeLeft / initialTimeLeft) * 100));

  // Count votes per mode
  const voteCounts = {};
  Object.values(votes).forEach(id => { voteCounts[id] = (voteCounts[id] || 0) + 1; });

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-[#0a0a1a] p-5">
      <div className="text-center mb-4">
        <div className="pixel-font text-[11px] text-indigo-300" style={{ textShadow: '0 0 10px rgba(99,102,241,0.5)' }}>
          {"\uD83D\uDDF3\uFE0F"} VOTE FOR NEXT GAME
        </div>
        <div className="pixel-font text-[8px] text-slate-500 mt-1">{timeLeft}s remaining</div>
        <div className="mx-auto mt-2 h-1 w-32 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all duration-100" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
        {/* Random option */}
        <button
          onClick={() => onVote({ action: 'vote_game', modeId: 'random' })}
          className={`relative p-3 rounded-xl text-center transition ${
            hasVoted === 'random' ? 'bg-indigo-500/30 border-2 border-indigo-400 ring-1 ring-indigo-400/50' :
            'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-indigo-500/30'
          }`}
        >
          <div className="text-2xl mb-1">{"\uD83C\uDFB2"}</div>
          <div className="pixel-font text-[7px] text-indigo-300">RANDOM</div>
          {voteCounts['random'] ? <div className="absolute top-1 right-1 bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center pixel-font text-[6px]">{voteCounts['random']}</div> : null}
        </button>

        {MODE_META.map(mode => (
          <button
            key={mode.id}
            onClick={() => onVote({ action: 'vote_game', modeId: mode.id })}
            className={`relative p-3 rounded-xl text-center transition ${
              hasVoted === mode.id ? 'bg-indigo-500/30 border-2 border-indigo-400 ring-1 ring-indigo-400/50' :
              'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-indigo-500/30'
            }`}
          >
            <div className="text-2xl mb-1">{mode.icon}</div>
            <div className="pixel-font text-[7px] text-white leading-tight">{mode.name}</div>
            {voteCounts[mode.id] ? <div className="absolute top-1 right-1 bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center pixel-font text-[6px]">{voteCounts[mode.id]}</div> : null}
          </button>
        ))}
      </div>

      {/* Who voted for what */}
      {Object.keys(votes).length > 0 ? (
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(votes).map(([name, modeId]) => {
            const mode = MODE_META.find(m => m.id === modeId);
            return (
              <div key={name} className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <span className="font-mono text-[10px] text-white">{name}</span>
                <span className="ml-1.5 text-[10px]">{modeId === 'random' ? '\uD83C\uDFB2' : mode?.icon}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SeriesScoreboard({ scores, history, round, totalRounds, selectionGoal }) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const isLoserMode = selectionGoal === 'loser';

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-[#0d0d24] p-6">
      <div className="text-center mb-4">
        <div className="pixel-font text-[11px] text-indigo-300" style={{ textShadow: '0 0 10px rgba(99,102,241,0.5)' }}>
          {"\uD83C\uDFC6"} SERIES SCOREBOARD
        </div>
        <div className="pixel-font text-[8px] text-slate-500 mt-1">
          Round {round} of {totalRounds} {"\u2022"} {isLoserMode ? 'Most losses loses' : 'Most wins wins'}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {sorted.map(([name, score], i) => (
          <div key={name} className="flex items-center justify-between px-4 py-2 rounded-xl" style={{
            background: i === 0 ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)',
            border: i === 0 ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.05)',
          }}>
            <div className="flex items-center gap-3">
              <span className="pixel-font text-[10px]" style={{ color: i === 0 ? '#fbbf24' : '#94a3b8' }}>
                #{i + 1}
              </span>
              <span className="font-mono text-sm font-bold text-white">{name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: score }, (_, j) => (
                  <div key={j} className="w-1.5 h-4 rounded-sm" style={{ background: isLoserMode ? '#ef4444' : '#fbbf24' }} />
                ))}
                {Array.from({ length: Math.max(0, totalRounds - score) }, (_, j) => (
                  <div key={`e-${j}`} className="w-1.5 h-4 rounded-sm bg-white/10" />
                ))}
              </div>
              <span className="pixel-font text-[10px] text-white">{score}</span>
            </div>
          </div>
        ))}
      </div>

      {history.length > 0 ? (
        <>
          <div className="pixel-font text-[7px] text-slate-600 uppercase tracking-widest mb-2">Round History</div>
          <div className="flex flex-wrap gap-2">
            {history.map((h, i) => (
              <div key={i} className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="pixel-font text-[7px] text-slate-500">R{h.round}</span>
                <span className="font-mono text-[9px] text-white ml-1">{h.selectedName}</span>
                <span className="font-mono text-[8px] text-slate-600 ml-1">({h.modeName})</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function SeriesResult({ scores, history, totalRounds, selectionGoal }) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const champion = sorted[0];
  const isLoserMode = selectionGoal === 'loser';

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-[#1a1033] to-[#0d0d24] p-8 text-center">
      <div className="pixel-font text-[9px] text-slate-500 uppercase tracking-widest mb-2">Series Complete</div>
      <div className="pixel-font text-2xl mb-4" style={{
        color: isLoserMode ? '#f87171' : '#fbbf24',
        textShadow: isLoserMode ? '0 0 20px rgba(248,113,113,0.5)' : '0 0 20px rgba(251,191,36,0.5)',
      }}>
        {isLoserMode ? '\uD83D\uDC80 ULTIMATE LOSER \uD83D\uDC80' : '\uD83D\uDC51 SERIES CHAMPION \uD83D\uDC51'}
      </div>
      <div className="pixel-font text-xl text-white mb-6" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
        {champion[0]}
      </div>
      <div className="pixel-font text-[9px] text-slate-400 mb-6">
        {champion[1]} {isLoserMode ? 'losses' : 'wins'} in {history.length} round{history.length !== 1 ? 's' : ''}
      </div>

      <div className="space-y-1.5 mb-4">
        {sorted.map(([name, score], i) => (
          <div key={name} className="flex items-center justify-between px-4 py-1.5 rounded-lg" style={{
            background: i === 0 ? (isLoserMode ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)') : 'rgba(255,255,255,0.03)',
            border: i === 0 ? (isLoserMode ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(251,191,36,0.3)') : '1px solid rgba(255,255,255,0.05)',
          }}>
            <span className="font-mono text-sm font-bold text-white">{name}</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: score }, (_, j) => (
                  <div key={j} className="w-1.5 h-4 rounded-sm" style={{ background: isLoserMode ? '#ef4444' : '#fbbf24' }} />
                ))}
              </div>
              <span className="pixel-font text-[10px] text-white">{score}</span>
            </div>
          </div>
        ))}
      </div>

      {history.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {history.map((h, i) => (
            <div key={i} className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="pixel-font text-[7px] text-slate-500">R{h.round}</span>
              <span className="font-mono text-[9px] text-white ml-1">{h.selectedName}</span>
              <span className="font-mono text-[8px] text-slate-600 ml-1">({h.modeName})</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

