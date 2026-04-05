import React, { useDeferredValue, useMemo, useState } from 'react';

function computeStats(games) {
  const playerMap = {};
  const nameDisplay = {};
  const pairMap = {};

  function getPlayer(name) {
    const key = name.toLowerCase();
    if (!playerMap[key]) {
      playerMap[key] = {
        games: 0,
        wins: 0,
        losses: 0,
        currentStreak: 0,
        longestWinStreak: 0,
        longestLossStreak: 0,
        lastPlayed: null,
        perMode: {},
      };
    }
    nameDisplay[key] = name;
    return playerMap[key];
  }

  for (const game of games) {
    const players = game.all_players || [];
    const selectedKey = (game.selected_player || '').toLowerCase();
    const goal = game.selection_goal;
    const playedAt = game.played_at || game.created_at || null;
    const playerKeys = players.map((player) => player.name.toLowerCase());

    for (const player of players) {
      const key = player.name.toLowerCase();
      const stats = getPlayer(player.name);
      stats.games++;
      if (playedAt) stats.lastPlayed = playedAt;

      const isSelected = key === selectedKey;
      const won = (goal === 'winner' && isSelected) || (goal === 'loser' && !isSelected);

      if (won) {
        stats.wins++;
        stats.currentStreak = stats.currentStreak > 0 ? stats.currentStreak + 1 : 1;
        if (stats.currentStreak > stats.longestWinStreak) stats.longestWinStreak = stats.currentStreak;
      } else {
        stats.losses++;
        stats.currentStreak = stats.currentStreak < 0 ? stats.currentStreak - 1 : -1;
        if (Math.abs(stats.currentStreak) > stats.longestLossStreak) stats.longestLossStreak = Math.abs(stats.currentStreak);
      }

      const modeId = game.mode_id || 'unknown';
      if (!stats.perMode[modeId]) {
        stats.perMode[modeId] = { games: 0, wins: 0, modeName: game.mode_name || modeId };
      }
      stats.perMode[modeId].games++;
      if (won) stats.perMode[modeId].wins++;
    }

    for (let i = 0; i < playerKeys.length; i += 1) {
      for (let j = i + 1; j < playerKeys.length; j += 1) {
        const sorted = [playerKeys[i], playerKeys[j]].sort();
        const pairKey = sorted.join('|');
        if (!pairMap[pairKey]) {
          pairMap[pairKey] = { p1: sorted[0], p2: sorted[1], p1Selected: 0, p2Selected: 0, totalGames: 0 };
        }
        pairMap[pairKey].totalGames++;
        if (selectedKey === sorted[0]) pairMap[pairKey].p1Selected++;
        if (selectedKey === sorted[1]) pairMap[pairKey].p2Selected++;
      }
    }
  }

  const playerList = Object.keys(playerMap).map((key) => {
    const stats = playerMap[key];
    const winPct = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;
    let favMode = null;
    let favModeGames = 0;

    for (const modeStats of Object.values(stats.perMode)) {
      if (modeStats.games > favModeGames) {
        favModeGames = modeStats.games;
        favMode = modeStats.modeName;
      }
    }

    return {
      name: nameDisplay[key],
      games: stats.games,
      wins: stats.wins,
      losses: stats.losses,
      winPct,
      currentStreak: stats.currentStreak,
      longestWinStreak: stats.longestWinStreak,
      longestLossStreak: stats.longestLossStreak,
      lastPlayed: stats.lastPlayed,
      perMode: stats.perMode,
      favMode,
    };
  });

  playerList.sort((a, b) => {
    const aQualified = a.games >= 3 ? 1 : 0;
    const bQualified = b.games >= 3 ? 1 : 0;
    if (aQualified !== bQualified) return bQualified - aQualified;
    if (a.winPct !== b.winPct) return b.winPct - a.winPct;
    return b.games - a.games;
  });

  const rivalries = Object.values(pairMap)
    .filter((rivalry) => rivalry.totalGames >= 3)
    .map((rivalry) => ({
      player1: nameDisplay[rivalry.p1] || rivalry.p1,
      player2: nameDisplay[rivalry.p2] || rivalry.p2,
      p1Selected: rivalry.p1Selected,
      p2Selected: rivalry.p2Selected,
      totalGames: rivalry.totalGames,
    }))
    .sort((a, b) => b.totalGames - a.totalGames);

  const qualified = playerList.filter((player) => player.games >= 5);
  const qualifiedThree = playerList.filter((player) => player.games >= 3);

  const mostAccurate = qualified.length ? qualified.reduce((best, player) => (player.winPct > best.winPct ? player : best)) : null;
  const cursed = qualified.length ? qualified.reduce((worst, player) => (player.winPct < worst.winPct ? player : worst)) : null;
  const onFire = qualifiedThree.length ? qualifiedThree.reduce((best, player) => (player.currentStreak > best.currentStreak ? player : best)) : null;
  const downBad = qualifiedThree.length ? qualifiedThree.reduce((worst, player) => (player.currentStreak < worst.currentStreak ? player : worst)) : null;
  const mostGames = playerList.length ? playerList.reduce((best, player) => (player.games > best.games ? player : best)) : null;

  let luckiestMode = null;
  let unluckiestMode = null;
  for (const player of playerList) {
    for (const modeStats of Object.values(player.perMode)) {
      if (modeStats.games < 3) continue;
      const pct = Math.round((modeStats.wins / modeStats.games) * 100);
      if (!luckiestMode || pct > luckiestMode.pct) {
        luckiestMode = { name: player.name, modeName: modeStats.modeName, pct, wins: modeStats.wins, games: modeStats.games };
      }
      if (!unluckiestMode || pct < unluckiestMode.pct) {
        unluckiestMode = { name: player.name, modeName: modeStats.modeName, pct, wins: modeStats.wins, games: modeStats.games };
      }
    }
  }

  return {
    players: playerList,
    rivalries,
    awards: {
      mostAccurate: mostAccurate ? { name: mostAccurate.name, stat: `${mostAccurate.winPct}% (${mostAccurate.wins}-${mostAccurate.losses})` } : null,
      cursed: cursed ? { name: cursed.name, stat: `${cursed.winPct}% (${cursed.wins}-${cursed.losses})` } : null,
      onFire: onFire && onFire.currentStreak > 0 ? { name: onFire.name, stat: `W${onFire.currentStreak}` } : null,
      downBad: downBad && downBad.currentStreak < 0 ? { name: downBad.name, stat: `L${Math.abs(downBad.currentStreak)}` } : null,
      mostGames: mostGames ? { name: mostGames.name, stat: `${mostGames.games} games` } : null,
      luckiestMode,
      unluckiestMode,
      biggestRivalry: rivalries[0] || null,
    },
  };
}

export default function Leaderboard({ games, loading, error }) {
  const [expanded, setExpanded] = useState(false);
  const [sortCol, setSortCol] = useState('winPct');
  const [sortDir, setSortDir] = useState('desc');
  const deferredGames = useDeferredValue(games);
  const stats = useMemo(() => computeStats(deferredGames || []), [deferredGames]);

  function handleSort(column) {
    if (sortCol === column) setSortDir((direction) => (direction === 'desc' ? 'asc' : 'desc'));
    else {
      setSortCol(column);
      setSortDir('desc');
    }
  }

  const sortedPlayers = useMemo(() => {
    if (!stats.players) return [];
    const list = [...stats.players];
    list.sort((a, b) => {
      let av = a[sortCol];
      let bv = b[sortCol];
      if (sortCol === 'name') {
        av = av.toLowerCase();
        bv = bv.toLowerCase();
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (sortCol === 'lastPlayed') {
        av = av || '';
        bv = bv || '';
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [stats, sortCol, sortDir]);

  const top5 = useMemo(() => stats.players.filter((player) => player.games >= 3).slice(0, 5), [stats]);

  function streakDisplay(streak) {
    if (streak === 0) return <span className="text-slate-600">-</span>;
    if (streak > 0) return <span className="text-emerald-400">W{streak}{streak >= 3 ? ' 🔥' : ''}</span>;
    return <span className="text-red-400">L{Math.abs(streak)}{Math.abs(streak) >= 3 ? ' 💀' : ''}</span>;
  }

  function modeWinColor(pct) {
    if (pct > 60) return 'text-emerald-400';
    if (pct >= 40) return 'text-yellow-400';
    return 'text-red-400';
  }

  function sortArrow(column) {
    if (sortCol !== column) return '';
    return sortDir === 'desc' ? ' ▼' : ' ▲';
  }

  if (loading) {
    return (
      <div className="mb-6 pt-2">
        <div className="pixel-divider mb-5" />
        <div className="pixel-font text-[8px] text-slate-500 text-center py-4">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 pt-2">
        <div className="pixel-divider mb-5" />
        <div className="pixel-font text-[8px] text-rose-400 text-center py-4">Failed to load leaderboard</div>
      </div>
    );
  }

  if (!stats.players.length) {
    return (
      <div className="mb-6 pt-2">
        <div className="pixel-divider mb-5" />
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="pixel-font text-[9px] uppercase tracking-widest text-indigo-400">Leaderboard</span>
        </div>
        <div className="pixel-font text-[8px] text-slate-500 text-center py-4">No data yet — play a game!</div>
      </div>
    );
  }

  const { rivalries = [], awards = {} } = stats;

  return (
    <div className="mb-6 pt-2">
      <div className="pixel-divider mb-5" />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="pixel-font text-[9px] uppercase tracking-widest text-indigo-400">Leaderboard</span>
        </div>
        <button onClick={() => setExpanded((value) => !value)} className="pixel-font text-[7px] text-slate-500 hover:text-indigo-400 transition">
          {expanded ? 'COLLAPSE' : 'EXPAND'}
        </button>
      </div>

      {!expanded ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
            <thead>
              <tr>
                <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 pl-2 w-8">#</th>
                <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2">Player</th>
                <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 text-center">W-L</th>
                <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 text-center">Win%</th>
                <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 text-center">Streak</th>
              </tr>
            </thead>
            <tbody>
              {top5.map((player, index) => (
                <tr
                  key={player.name}
                  className="transition-colors"
                  style={index === 0
                    ? {
                        background: 'rgba(251,191,36,0.06)',
                        borderLeft: '2px solid #fbbf24',
                        boxShadow: 'inset 0 0 12px rgba(251,191,36,0.08)',
                      }
                    : { background: 'rgba(255,255,255,0.02)' }}
                >
                  <td className="py-2 pl-2 pixel-font text-[9px] text-slate-500" style={index === 0 ? { color: '#fbbf24' } : {}}>{index + 1}</td>
                  <td className="py-2 pixel-font text-[9px] text-white" style={index === 0 ? { color: '#fbbf24' } : {}}>{player.name}</td>
                  <td className="py-2 text-center font-mono text-[10px] text-slate-400">{player.wins}-{player.losses}</td>
                  <td className="py-2 text-center font-mono text-[10px] text-slate-300">{player.winPct}%</td>
                  <td className="py-2 text-center font-mono text-[10px]">{streakDisplay(player.currentStreak)}</td>
                </tr>
              ))}
              {top5.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pixel-font text-[8px] text-slate-600 text-center py-3">Need 3+ games to qualify</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
              <thead>
                <tr>
                  <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 pl-2 w-8 cursor-pointer hover:text-indigo-400" onClick={() => handleSort('winPct')}>#</th>
                  <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 cursor-pointer hover:text-indigo-400" onClick={() => handleSort('name')}>Player{sortArrow('name')}</th>
                  <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 text-center cursor-pointer hover:text-indigo-400" onClick={() => handleSort('games')}>Games{sortArrow('games')}</th>
                  <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 text-center cursor-pointer hover:text-indigo-400" onClick={() => handleSort('wins')}>W-L{sortArrow('wins')}</th>
                  <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 text-center cursor-pointer hover:text-indigo-400" onClick={() => handleSort('winPct')}>Win%{sortArrow('winPct')}</th>
                  <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 text-center cursor-pointer hover:text-indigo-400" onClick={() => handleSort('longestWinStreak')}>Best{sortArrow('longestWinStreak')}</th>
                  <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 text-center cursor-pointer hover:text-indigo-400" onClick={() => handleSort('longestLossStreak')}>Worst{sortArrow('longestLossStreak')}</th>
                  <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 text-center">Streak</th>
                  <th className="pixel-font text-[6px] uppercase tracking-widest text-slate-600 pb-2 text-center hidden sm:table-cell">Fav Mode</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, index) => {
                  const dimmed = player.games < 3;
                  const isFirst = index === 0 && !dimmed;
                  const modeEntries = Object.entries(player.perMode);
                  return (
                    <React.Fragment key={player.name}>
                      <tr
                        className="transition-colors"
                        style={isFirst
                          ? {
                              background: 'rgba(251,191,36,0.06)',
                              borderLeft: '2px solid #fbbf24',
                              boxShadow: 'inset 0 0 12px rgba(251,191,36,0.08)',
                            }
                          : { background: 'rgba(255,255,255,0.02)' }}
                      >
                        <td className={`py-2 pl-2 pixel-font text-[9px] ${dimmed ? 'text-slate-700' : 'text-slate-500'}`} style={isFirst ? { color: '#fbbf24' } : {}}>{index + 1}</td>
                        <td className={`py-2 pixel-font text-[9px] ${dimmed ? 'text-slate-600 italic' : 'text-white'}`} style={isFirst ? { color: '#fbbf24' } : {}}>{player.name}</td>
                        <td className={`py-2 text-center font-mono text-[10px] ${dimmed ? 'text-slate-700' : 'text-slate-400'}`}>{player.games}</td>
                        <td className={`py-2 text-center font-mono text-[10px] ${dimmed ? 'text-slate-700' : 'text-slate-400'}`}>{player.wins}-{player.losses}</td>
                        <td className={`py-2 text-center font-mono text-[10px] ${dimmed ? 'text-slate-700' : 'text-slate-300'}`}>{player.winPct}%</td>
                        <td className={`py-2 text-center font-mono text-[10px] ${dimmed ? 'text-slate-700' : 'text-emerald-400'}`}>{player.longestWinStreak > 0 ? `W${player.longestWinStreak}` : '-'}</td>
                        <td className={`py-2 text-center font-mono text-[10px] ${dimmed ? 'text-slate-700' : 'text-red-400'}`}>{player.longestLossStreak > 0 ? `L${player.longestLossStreak}` : '-'}</td>
                        <td className="py-2 text-center font-mono text-[10px]">{streakDisplay(player.currentStreak)}</td>
                        <td className={`py-2 text-center pixel-font text-[7px] hidden sm:table-cell ${dimmed ? 'text-slate-700' : 'text-slate-500'}`}>{player.favMode || '-'}</td>
                      </tr>
                      {modeEntries.length > 0 ? (
                        <tr style={{ background: 'transparent' }}>
                          <td />
                          <td colSpan={8} className="pb-2 pt-0">
                            <div className="flex flex-wrap gap-x-3 gap-y-1 pl-1">
                              {modeEntries.map(([modeId, modeStats]) => {
                                const pct = modeStats.games > 0 ? Math.round((modeStats.wins / modeStats.games) * 100) : 0;
                                return (
                                  <span key={modeId} className={`font-mono text-[9px] ${modeWinColor(pct)}`}>
                                    {modeStats.modeName} {modeStats.wins}-{modeStats.games - modeStats.wins}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rivalries.length > 0 ? (
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm">⚔️</span>
                <span className="pixel-font text-[8px] uppercase tracking-widest text-indigo-400">Rivalries</span>
              </div>
              <div className="space-y-1">
                {rivalries.map((rivalry, index) => {
                  const lead = rivalry.p1Selected > rivalry.p2Selected
                    ? `${rivalry.player1} selected ${rivalry.p1Selected}x`
                    : rivalry.p2Selected > rivalry.p1Selected
                      ? `${rivalry.player2} selected ${rivalry.p2Selected}x`
                      : 'Tied!';
                  return (
                    <div key={index} className="flex items-center gap-2 border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <span className="font-mono text-[10px] text-white">{rivalry.player1} vs {rivalry.player2}</span>
                      <span className="font-mono text-[9px] text-slate-500">{rivalry.totalGames} games</span>
                      <span className="font-mono text-[9px] text-indigo-400">{lead}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {Object.values(awards).some(Boolean) ? (
            <div className="mb-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm">🏅</span>
                <span className="pixel-font text-[8px] uppercase tracking-widest text-indigo-400">Awards</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {awards.mostAccurate ? (
                  <div className="border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-2">
                    <div className="pixel-font text-[7px] text-emerald-400 mb-1">🎯 Most Accurate</div>
                    <div className="font-mono text-[10px] text-white">{awards.mostAccurate.name}</div>
                    <div className="font-mono text-[8px] text-slate-500">{awards.mostAccurate.stat}</div>
                  </div>
                ) : null}
                {awards.cursed ? (
                  <div className="border border-purple-500/20 bg-purple-500/[0.05] px-3 py-2">
                    <div className="pixel-font text-[7px] text-purple-400 mb-1">😈 Cursed</div>
                    <div className="font-mono text-[10px] text-white">{awards.cursed.name}</div>
                    <div className="font-mono text-[8px] text-slate-500">{awards.cursed.stat}</div>
                  </div>
                ) : null}
                {awards.onFire ? (
                  <div className="border border-orange-500/20 bg-orange-500/[0.05] px-3 py-2">
                    <div className="pixel-font text-[7px] text-orange-400 mb-1">🔥 On Fire</div>
                    <div className="font-mono text-[10px] text-white">{awards.onFire.name}</div>
                    <div className="font-mono text-[8px] text-slate-500">{awards.onFire.stat}</div>
                  </div>
                ) : null}
                {awards.downBad ? (
                  <div className="border border-red-500/20 bg-red-500/[0.05] px-3 py-2">
                    <div className="pixel-font text-[7px] text-red-400 mb-1">💀 Down Bad</div>
                    <div className="font-mono text-[10px] text-white">{awards.downBad.name}</div>
                    <div className="font-mono text-[8px] text-slate-500">{awards.downBad.stat}</div>
                  </div>
                ) : null}
                {awards.mostGames ? (
                  <div className="border border-cyan-500/20 bg-cyan-500/[0.05] px-3 py-2">
                    <div className="pixel-font text-[7px] text-cyan-400 mb-1">🎮 Most Games</div>
                    <div className="font-mono text-[10px] text-white">{awards.mostGames.name}</div>
                    <div className="font-mono text-[8px] text-slate-500">{awards.mostGames.stat}</div>
                  </div>
                ) : null}
                {awards.luckiestMode ? (
                  <div className="border border-green-500/20 bg-green-500/[0.05] px-3 py-2">
                    <div className="pixel-font text-[7px] text-green-400 mb-1">🍀 Luckiest Mode</div>
                    <div className="font-mono text-[10px] text-white">{awards.luckiestMode.name}</div>
                    <div className="font-mono text-[8px] text-slate-500">{awards.luckiestMode.modeName} {awards.luckiestMode.pct}%</div>
                  </div>
                ) : null}
                {awards.unluckiestMode ? (
                  <div className="border border-rose-500/20 bg-rose-500/[0.05] px-3 py-2">
                    <div className="pixel-font text-[7px] text-rose-400 mb-1">🪠 Unluckiest Mode</div>
                    <div className="font-mono text-[10px] text-white">{awards.unluckiestMode.name}</div>
                    <div className="font-mono text-[8px] text-slate-500">{awards.unluckiestMode.modeName} {awards.unluckiestMode.pct}%</div>
                  </div>
                ) : null}
                {awards.biggestRivalry ? (
                  <div className="border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2">
                    <div className="pixel-font text-[7px] text-amber-400 mb-1">⚔️ Biggest Rivalry</div>
                    <div className="font-mono text-[10px] text-white">{awards.biggestRivalry.player1} vs {awards.biggestRivalry.player2}</div>
                    <div className="font-mono text-[8px] text-slate-500">{awards.biggestRivalry.totalGames} games</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
