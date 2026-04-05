import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function RocketPlayback({ result, step, done, ModeHeader, PlayerResultCard }) {
  const [phase, setPhase] = useState('ready');
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [crashed, setCrashed] = useState([]);
  const [currentMilestone, setCurrentMilestone] = useState(null);
  const [milestoneKey, setMilestoneKey] = useState(0);
  const startTimeRef = React.useRef(null);
  const animFrameRef = React.useRef(null);
  const crashedRef = React.useRef(new Set());
  const milestonesHitRef = React.useRef(new Set());

  const TIME_SCALE = 3;

  const MILESTONES = [
    { distance: 100, label: 'Leaving the atmosphere' },
    { distance: 400, label: 'Passing the ISS' },
    { distance: 2000, label: 'Low Earth orbit' },
    { distance: 20000, label: 'Passing GPS satellites' },
    { distance: 36000, label: 'Geostationary orbit' },
    { distance: 384000, label: 'Passing the Moon' },
    { distance: 800000, label: 'Deep space' },
    { distance: 1000000, label: 'Uncharted territory' },
  ];

  function distanceAtTime(t) {
    return 100 * t + 0.5 * 200 * t * t;
  }

  function formatDist(d) {
    if (d >= 1000000) return (d / 1000000).toFixed(1) + 'M km';
    return Math.round(d).toLocaleString() + ' km';
  }

  // Original order for display (randomized), sorted for crash detection logic
  const displayPlayers = result.players;
  const sortedPlayers = useMemo(() =>
    [...result.players].sort((a, b) => a.crashTime - b.crashTime),
  [result.players]);

  const maxCrashTime = sortedPlayers[sortedPlayers.length - 1].crashTime;

  function startLaunch() {
    setPhase('countdown');
    setCountdown(3);
  }

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('flying');
      startTimeRef.current = performance.now();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== 'flying') return;

    function tick(now) {
      const realElapsed = (now - startTimeRef.current) / 1000;
      const simElapsed = realElapsed * TIME_SCALE;
      setElapsed(simElapsed);
      window.__rocketElapsed = simElapsed;

      // Read interactive eject state from window
      const iEjects = (typeof window !== 'undefined' && window.__interactiveRocketEjects) || {};
      const isRocketInteractive = typeof window !== 'undefined' && window.__rocketInteractive;

      const newCrashes = [];
      for (const p of sortedPlayers) {
        if (!crashedRef.current.has(p.name) && !iEjects[p.name] && simElapsed >= p.crashTime) {
          crashedRef.current.add(p.name);
          newCrashes.push(p.name);
        }
      }
      if (newCrashes.length > 0) {
        setCrashed(prev => [...prev, ...newCrashes]);
      }

      const leadingDist = distanceAtTime(simElapsed);
      for (const m of MILESTONES) {
        if (!milestonesHitRef.current.has(m.distance) && leadingDist >= m.distance) {
          milestonesHitRef.current.add(m.distance);
          setCurrentMilestone(m.label);
          setMilestoneKey(k => k + 1);
          setTimeout(() => setCurrentMilestone(null), 2500);
        }
      }

      if (isRocketInteractive) {
        const doneCount = sortedPlayers.filter(p => crashedRef.current.has(p.name) || iEjects[p.name]).length;
        if (doneCount >= sortedPlayers.length) {
          setPhase('complete');
          return;
        }
      } else {
        if (crashedRef.current.size >= sortedPlayers.length - 1) {
          setPhase('complete');
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [phase, sortedPlayers]);

  useEffect(() => {
    if (phase === 'complete') {
      window.dispatchEvent(new Event('rocket-complete'));
    }
  }, [phase]);

  const ROCKET_COLORS = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#22d3ee', '#f87171'];
  const leadingDistance = distanceAtTime(Math.min(elapsed, maxCrashTime));
  const isComplete = phase === 'complete' || done;

  return (
    <div className="space-y-4">
      <ModeHeader
        result={result}
        done={isComplete}
        pendingText={phase === 'ready' ? 'Ready for launch...' : phase === 'countdown' ? `T-minus ${countdown}...` : 'Rockets are flying!'}
        pendingSummary="Last rocket flying gets selected."
      />

      {(() => {
        const flightProgress = Math.min(elapsed / maxCrashTime, 1);
        const bgDarkness = Math.min(flightProgress * 1.2, 1);
        const skyColor = phase === 'flying' || phase === 'complete'
          ? `rgb(${Math.round(10 - bgDarkness * 8)}, ${Math.round(15 - bgDarkness * 13)}, ${Math.round(40 - bgDarkness * 35)})`
          : '#0a0f28';
        const showStars = flightProgress > 0.15;
        const showDeepStars = flightProgress > 0.4;

        return phase === 'ready' ? (
        <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(to top, #2a1a0a 0%, #1a2a1a 8%, #0a1428 40%, #0a0f28 70%, #050510 100%)', minHeight: 380 }}>
          {/* Sky stars */}
          {[{x:10,y:8},{x:25,y:15},{x:45,y:5},{x:65,y:12},{x:80,y:8},{x:90,y:18}].map((s,i) => (
            <div key={i} className="absolute rounded-full bg-white" style={{ left:`${s.x}%`, top:`${s.y}%`, width:2, height:2, opacity:0.3 }} />
          ))}
          {/* Moon */}
          <div className="absolute right-[12%] top-[10%] w-8 h-8 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #e5e7eb, #9ca3af, #6b7280)', boxShadow: '0 0 15px rgba(229,231,235,0.2)' }} />
          {/* Ground layers */}
          <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: 'linear-gradient(to top, #3d2b1a 0%, #2d4a2d 40%, #1a3a1a 80%, transparent 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: 'linear-gradient(to top, #2a1a0a, #3d2b1a)' }} />
          {/* Grass tufts */}
          {[5,12,20,28,38,48,55,62,72,80,88,95].map((x,i) => (
            <div key={i} className="absolute" style={{ left:`${x}%`, bottom: 18 + (i%3)*2, fontSize: i%2===0 ? 10 : 8, opacity: 0.7 }}>🌿</div>
          ))}
          {/* Trees */}
          {[8,22,42,68,85].map((x,i) => (
            <div key={i} className="absolute" style={{ left:`${x}%`, bottom: 22, fontSize: i%2===0 ? 18 : 14 }}>🌲</div>
          ))}
          {/* Launch pad */}
          <div className="absolute bottom-[18px] left-[15%] right-[15%] h-[6px] rounded" style={{ background: 'linear-gradient(to right, transparent, #4b5563, #6b7280, #4b5563, transparent)' }} />
          {/* Rockets on pad */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-around px-8">
            {displayPlayers.map((p, i) => (
              <div key={p.name} className="text-center">
                <div className="text-2xl sm:text-3xl">🚀</div>
                <div className="pixel-font text-[7px] mt-1" style={{ color: ROCKET_COLORS[i % ROCKET_COLORS.length] }}>{p.name}</div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={startLaunch}
              className="pixel-font inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-sm text-white shadow-lg shadow-violet-600/30 transition hover:scale-105 active:scale-95"
              style={{ textShadow: '0 0 10px rgba(139,92,246,0.5)' }}
            >
              🚀 LAUNCH
            </button>
          </div>
        </div>
      ) : phase === 'countdown' ? (
        <div className="relative overflow-hidden rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(to top, #2a1a0a 0%, #1a2a1a 8%, #0a1428 40%, #0a0f28 70%, #050510 100%)', minHeight: 380 }}>
          <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: 'linear-gradient(to top, #3d2b1a 0%, #2d4a2d 40%, #1a3a1a 80%, transparent 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: 'linear-gradient(to top, #2a1a0a, #3d2b1a)' }} />
          {[5,12,20,28,38,48,55,62,72,80,88,95].map((x,i) => (
            <div key={i} className="absolute" style={{ left:`${x}%`, bottom: 18 + (i%3)*2, fontSize: i%2===0 ? 10 : 8, opacity: 0.7 }}>🌿</div>
          ))}
          {[8,22,42,68,85].map((x,i) => (
            <div key={i} className="absolute" style={{ left:`${x}%`, bottom: 22, fontSize: i%2===0 ? 18 : 14 }}>🌲</div>
          ))}
          <div className="absolute bottom-[18px] left-[15%] right-[15%] h-[6px] rounded" style={{ background: 'linear-gradient(to right, transparent, #4b5563, #6b7280, #4b5563, transparent)' }} />
          <div className="absolute bottom-6 left-0 right-0 flex justify-around px-8">
            {displayPlayers.map((p, i) => (
              <div key={p.name} className="text-center">
                <div className="text-2xl sm:text-3xl" style={{ animation: 'rocket-fly 0.15s ease-in-out infinite alternate' }}>🚀</div>
                <div className="pixel-font text-[7px] mt-1" style={{ color: ROCKET_COLORS[i % ROCKET_COLORS.length] }}>{p.name}</div>
              </div>
            ))}
          </div>
          <motion.div
            key={countdown}
            initial={{ scale: 3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="pixel-font text-7xl text-violet-300 relative z-10"
            style={{ textShadow: '0 0 40px rgba(139,92,246,0.8), 0 0 80px rgba(139,92,246,0.4)' }}
          >
            {countdown}
          </motion.div>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-2xl" style={{ background: `linear-gradient(to top, ${flightProgress < 0.3 ? '#1a2a1a' : '#050508'} 0%, ${skyColor} 30%, ${flightProgress > 0.5 ? '#020205' : '#0a0f28'} 100%)`, minHeight: 400, transition: 'background 2s ease' }}>
            {/* Stars — fade in as atmosphere thins */}
            {showStars ? (
              <div className="absolute inset-0 pointer-events-none" style={{ opacity: Math.min((flightProgress - 0.15) * 2, 1), transition: 'opacity 1s' }}>
                {[{x:5,y:10,s:2},{x:15,y:25,s:1},{x:25,y:8,s:2},{x:35,y:35,s:1},{x:45,y:15,s:2},{x:55,y:40,s:1},{x:65,y:5,s:2},{x:75,y:30,s:1},{x:85,y:12,s:2},{x:92,y:38,s:1},{x:10,y:45,s:1},{x:50,y:50,s:2},{x:70,y:48,s:1},{x:30,y:55,s:2},{x:80,y:55,s:1},{x:3,y:30,s:1},{x:40,y:22,s:2},{x:58,y:8,s:1},{x:73,y:42,s:2},{x:95,y:5,s:1}].map((s,i) => (
                  <div key={i} className="absolute rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animation: `twinkle${(i%3)+1} ${3+i%4}s ease-in-out infinite` }} />
                ))}
              </div>
            ) : null}
            {/* Colored deep space stars + nebula glow */}
            {showDeepStars ? (
              <div className="absolute inset-0 pointer-events-none" style={{ opacity: Math.min((flightProgress - 0.4) * 3, 0.8) }}>
                {[{x:8,y:5,c:'#c4b5fd'},{x:22,y:18,c:'#f9a8d4'},{x:42,y:3,c:'#93c5fd'},{x:62,y:22,c:'#c4b5fd'},{x:78,y:8,c:'#fcd34d'},{x:88,y:28,c:'#f9a8d4'},{x:18,y:42,c:'#93c5fd'},{x:52,y:32,c:'#fcd34d'},{x:33,y:12,c:'#86efac'},{x:72,y:38,c:'#fda4af'},{x:48,y:48,c:'#c4b5fd'},{x:15,y:55,c:'#93c5fd'}].map((s,i) => (
                  <div key={i} className="absolute rounded-full" style={{ left: `${s.x}%`, top: `${s.y}%`, width: 3, height: 3, background: s.c, boxShadow: `0 0 6px ${s.c}`, animation: `twinkle${(i%3)+1} ${2+i%3}s ease-in-out infinite` }} />
                ))}
              </div>
            ) : null}

            {/* Ground fading away */}
            {flightProgress < 0.3 ? (
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ opacity: 1 - flightProgress * 3.5 }}>
                <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: 'linear-gradient(to top, #3d2b1a 0%, #2d4a2d 40%, #1a3a1a 80%, transparent 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: 'linear-gradient(to top, #2a1a0a, #3d2b1a)' }} />
                {[5,12,20,28,38,48,55,62,72,80,88,95].map((x,i) => (
                  <div key={i} className="absolute" style={{ left:`${x}%`, bottom: 18 + (i%3)*2, fontSize: i%2===0 ? 10 : 8, opacity: 0.7 }}>🌿</div>
                ))}
                {[8,22,42,68,85].map((x,i) => (
                  <div key={i} className="absolute" style={{ left:`${x}%`, bottom: 22, fontSize: i%2===0 ? 18 : 14 }}>🌲</div>
                ))}
              </div>
            ) : null}

            {/* Atmosphere blue glow fading */}
            {flightProgress > 0.02 && flightProgress < 0.2 ? (
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(100,180,255,0.08), transparent 50%)', opacity: 1 - (flightProgress - 0.02) * 6 }} />
            ) : null}

            {/* Earth visible below as you leave */}
            {flightProgress > 0.12 && flightProgress < 0.5 ? (
              <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 pointer-events-none" style={{ opacity: Math.min((flightProgress - 0.12) * 4, 1) * (1 - Math.max(0, (flightProgress - 0.35) * 6.6)), width: 300, height: 80 }}>
                <div className="w-full h-full rounded-[50%]" style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e3a5f 0%, #1a4a2e 30%, #0d2818 60%, transparent 100%)', boxShadow: '0 0 30px rgba(30,58,95,0.3)' }} />
              </div>
            ) : null}

            {/* Moon passing by */}
            {flightProgress > 0.4 && flightProgress < 0.7 ? (
              <motion.div
                className="absolute pointer-events-none"
                style={{ right: '8%', top: '15%', opacity: Math.min((flightProgress - 0.4) * 5, 1) * (1 - Math.max(0, (flightProgress - 0.6) * 10)) }}
              >
                <div className="w-12 h-12 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #e5e7eb, #9ca3af, #6b7280)', boxShadow: '0 0 20px rgba(229,231,235,0.3)' }} />
              </motion.div>
            ) : null}

            {/* Asteroids drifting by in deep space */}
            {flightProgress > 0.5 ? (
              <div className="absolute inset-0 pointer-events-none" style={{ opacity: Math.min((flightProgress - 0.5) * 3, 0.6) }}>
                {[{x:15,y:20,s:8},{x:75,y:35,s:6},{x:45,y:55,s:10},{x:88,y:15,s:7}].map((a,i) => (
                  <div key={i} className="absolute" style={{ left:`${a.x}%`, top:`${a.y}%`, fontSize: a.s }}>☄️</div>
                ))}
              </div>
            ) : null}

            {/* Distant planet in deep space */}
            {flightProgress > 0.7 ? (
              <div className="absolute pointer-events-none" style={{ left: '5%', top: '20%', opacity: Math.min((flightProgress - 0.7) * 4, 0.7) }}>
                <div className="w-16 h-16 rounded-full" style={{ background: 'radial-gradient(circle at 40% 30%, #c084fc, #7c3aed, #4c1d95)', boxShadow: '0 0 25px rgba(139,92,246,0.4)' }} />
                <div className="absolute top-1/2 left-[-4px] right-[-4px] h-[3px] rounded-full -translate-y-1/2" style={{ background: 'linear-gradient(to right, transparent, rgba(196,181,253,0.4), transparent)', transform: 'rotate(-15deg)' }} />
              </div>
            ) : null}

            {/* Saturn-like ringed planet even deeper */}
            {flightProgress > 0.85 ? (
              <div className="absolute pointer-events-none" style={{ right: '10%', top: '25%', opacity: Math.min((flightProgress - 0.85) * 5, 0.5) }}>
                <div className="w-10 h-10 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #fcd34d, #d97706, #92400e)', boxShadow: '0 0 15px rgba(252,211,77,0.3)' }} />
                <div className="absolute top-1/2 left-[-10px] right-[-10px] h-[2px] rounded-full -translate-y-1/2" style={{ background: 'linear-gradient(to right, transparent 5%, rgba(252,211,77,0.5) 30%, rgba(252,211,77,0.3) 70%, transparent 95%)', transform: 'rotate(-10deg)' }} />
              </div>
            ) : null}

            <div className="absolute top-3 left-0 right-0 text-center z-10">
              <div className="pixel-font text-[7px] text-slate-500 uppercase tracking-widest mb-1">Altitude</div>
              <div className="font-mono text-2xl sm:text-3xl font-black text-white" style={{ textShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
                {formatDist(leadingDistance)}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {currentMilestone ? (
                <motion.div
                  key={milestoneKey}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                  className="absolute top-16 left-0 right-0 text-center z-10"
                >
                  <span className="inline-block rounded-xl bg-violet-500/30 border border-violet-400/40 px-5 py-2.5 pixel-font text-[9px] sm:text-[11px] text-violet-200 backdrop-blur-sm" style={{ textShadow: '0 0 12px rgba(139,92,246,0.6)', boxShadow: '0 0 20px rgba(139,92,246,0.2)' }}>
                    {currentMilestone}
                  </span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="absolute bottom-4 left-0 right-0 flex justify-around items-end px-4 sm:px-8">
              {(() => {
                const iEjectsDisplay = (typeof window !== 'undefined' && window.__interactiveRocketEjects) || {};
                return displayPlayers.map((player, idx) => {
                const hasCrashed = crashed.includes(player.name);
                const hasEjected = !!iEjectsDisplay[player.name];
                const isSurvivor = isComplete && player.name === result.selectedName;
                const ejectData = iEjectsDisplay[player.name];
                const rocketProgress = hasCrashed
                  ? (player.crashTime / maxCrashTime)
                  : hasEjected
                  ? (ejectData.time / maxCrashTime)
                  : Math.min(elapsed / maxCrashTime, 1);
                const rocketY = rocketProgress * 600;
                const color = ROCKET_COLORS[idx % ROCKET_COLORS.length];

                return (
                  <div key={player.name} className="relative text-center" style={{ width: `${Math.max(60, 100 / displayPlayers.length)}px` }}>
                    {hasCrashed ? (
                      <motion.div
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{ scale: [1, 1.8, 2.5, 0], opacity: [1, 1, 0.8, 0] }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{ bottom: `${Math.min(rocketY, 380)}px` }}
                      >
                        <div className="text-2xl">💥</div>
                      </motion.div>
                    ) : hasEjected ? (
                      <motion.div
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{ bottom: `${Math.min(rocketY, 380)}px` }}
                      >
                        <div className="text-2xl" style={{ filter: `drop-shadow(0 0 8px ${color})` }}>🪂</div>
                      </motion.div>
                    ) : (
                      <motion.div
                        className="absolute left-1/2 -translate-x-1/2"
                        animate={{ y: -rocketY }}
                        transition={{ duration: 0.3, ease: 'linear' }}
                        style={{ bottom: 0 }}
                      >
                        <div className="text-2xl sm:text-3xl" style={{ filter: isSurvivor ? `drop-shadow(0 0 12px ${color})` : 'none' }}>🚀</div>
                        {phase === 'flying' && !hasCrashed ? (
                          <motion.div
                            className="absolute left-1/2 -translate-x-1/2 top-full"
                            animate={{ opacity: [0.6, 1, 0.6], scaleY: [0.8, 1.2, 0.8] }}
                            transition={{ duration: 0.2, repeat: Infinity }}
                          >
                            <div className="text-xs" style={{ filter: `drop-shadow(0 0 4px ${color})` }}>🔥</div>
                          </motion.div>
                        ) : null}
                      </motion.div>
                    )}
                    <div className="pixel-font text-[6px] sm:text-[7px]" style={{ color: (hasCrashed || hasEjected) ? '#4b5563' : color }}>{player.name}</div>
                    {hasCrashed ? <div className="font-mono text-[8px] text-slate-600">💥 {player.distanceFormatted}</div> : null}
                    {hasEjected ? <div className="font-mono text-[8px] text-green-400">🪂 {formatDist(ejectData.distance)}</div> : null}
                    {isSurvivor && !hasEjected ? <div className="font-mono text-[8px] text-violet-300">🏆 {player.distanceFormatted}</div> : null}
                  </div>
                );
              });
              })()}
            </div>
          </div>

          {(() => {
            const iEjectsLog = (typeof window !== 'undefined' && window.__interactiveRocketEjects) || {};
            const ejectedNames = Object.keys(iEjectsLog);
            return (crashed.length > 0 || ejectedNames.length > 0) ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="pixel-font text-[7px] text-slate-600 uppercase tracking-widest mb-2">Flight Log</div>
              <div className="flex flex-wrap gap-2">
                {ejectedNames.map((name) => (
                  <div key={name} className="font-mono text-[10px] text-green-400/80 border border-green-500/20 bg-green-500/[0.05] px-2 py-1 rounded">
                    🪂 {name} — {formatDist(iEjectsLog[name].distance)}
                  </div>
                ))}
                {crashed.map((name) => {
                  const p = sortedPlayers.find(pl => pl.name === name);
                  return (
                    <div key={name} className="font-mono text-[10px] text-slate-500 border border-white/5 bg-white/[0.02] px-2 py-1 rounded">
                      💥 {name} — {p?.distanceFormatted || '???'}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null;
          })()}
        </>
      );
      })()}

      {isComplete ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...result.players].sort((a, b) => a.rank - b.rank).map(player => (
            <PlayerResultCard
              key={player.name}
              name={player.name}
              selectionGoal={result.selectionGoal}
              title={player.headline}
              subtitle={player.subline}
              selected={player.selected}
            >
              <div className="flex flex-wrap gap-2">
                {player.chips.map(chip => (
                  <span key={chip} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-400">{chip}</span>
                ))}
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-400">Rank #{player.rank}</span>
              </div>
            </PlayerResultCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SpaceInvadersPlayback({ result, step, done, ModeHeader, PlayerResultCard }) {
  const eliminationOrder = result.eliminationOrder || [];
  const totalAliens = result.players.length;
  const destroyedCount = Math.min(step, eliminationOrder.length);
  const destroyedNames = new Set(eliminationOrder.slice(0, destroyedCount));
  const currentTarget = step > 0 && step <= eliminationOrder.length ? eliminationOrder[step - 1] : null;
  const [showLaser, setShowLaser] = useState(false);
  const [showExplosion, setShowExplosion] = useState(null);
  const [flashDestroyed, setFlashDestroyed] = useState(null);

  const prevStepRef = React.useRef(0);

  useEffect(() => {
    if (step > prevStepRef.current && step <= eliminationOrder.length) {
      const target = eliminationOrder[step - 1];
      setShowLaser(true);
      const t1 = setTimeout(() => {
        setShowLaser(false);
        setShowExplosion(target);
        setFlashDestroyed(target);
      }, 400);
      const t2 = setTimeout(() => {
        setShowExplosion(null);
      }, 1000);
      const t3 = setTimeout(() => {
        setFlashDestroyed(null);
      }, 1500);
      prevStepRef.current = step;
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
    prevStepRef.current = step;
  }, [step, eliminationOrder]);

  const cols = totalAliens <= 4 ? 2 : totalAliens <= 6 ? 3 : 4;
  const isComplete = done || destroyedCount >= eliminationOrder.length;
  const survivorName = result.selectedName;

  return (
    <div className="space-y-4">
      <ModeHeader
        result={result}
        done={isComplete}
        pendingText={destroyedCount === 0 ? "Aliens are forming up..." : `Shot ${destroyedCount} of ${eliminationOrder.length}`}
        pendingSummary="Laser fires. Last alien standing gets selected."
      />

      <div className="relative overflow-hidden rounded-2xl" style={{ background: '#000', minHeight: 380 }}>
        {/* Score display */}
        <div className="absolute top-3 left-4 z-10">
          <div className="pixel-font text-[7px] text-green-500/60 uppercase tracking-widest">Score</div>
          <div className="pixel-font text-sm text-green-400" style={{ textShadow: '0 0 8px rgba(34,197,94,0.5)' }}>{destroyedCount * 100}</div>
        </div>
        <div className="absolute top-3 right-4 z-10">
          <div className="pixel-font text-[7px] text-green-500/60 uppercase tracking-widest">Hi-Score</div>
          <div className="pixel-font text-sm text-green-400/50">9999</div>
        </div>

        {/* Alien formation */}
        <div className="absolute top-16 left-0 right-0 flex justify-center z-10">
          <div className="grid gap-x-6 gap-y-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {result.players.map((player) => {
              const isDestroyed = destroyedNames.has(player.name);
              const isExploding = showExplosion === player.name;
              const isFlashing = flashDestroyed === player.name;
              const isSurvivor = isComplete && player.name === survivorName;

              return (
                <div key={player.name} className="text-center" style={{ minWidth: 70 }}>
                  {isExploding ? (
                    <motion.div
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: [1, 1.8, 2.2, 0], opacity: [1, 1, 0.6, 0] }}
                      transition={{ duration: 0.6 }}
                      className="text-2xl sm:text-3xl"
                    >
                      💥
                    </motion.div>
                  ) : isDestroyed ? (
                    <div className="text-2xl sm:text-3xl" style={{ opacity: 0.25, color: '#4b5563' }}>✕</div>
                  ) : (
                    <div
                      className="text-2xl sm:text-3xl"
                      style={{
                        animation: 'invader-drift 2s ease-in-out infinite',
                        filter: isSurvivor ? 'drop-shadow(0 0 12px #22c55e)' : 'none',
                      }}
                    >
                      👾
                    </div>
                  )}
                  <div
                    className="pixel-font text-[7px] mt-1"
                    style={{
                      color: isDestroyed ? '#4b5563' : isSurvivor ? '#22c55e' : '#4ade80',
                      textDecoration: isDestroyed ? 'line-through' : 'none',
                      textShadow: isSurvivor ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                    }}
                  >
                    {player.name}
                  </div>
                  {isFlashing ? (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="pixel-font text-[6px] text-red-400 mt-0.5"
                    >
                      DESTROYED
                    </motion.div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Laser line */}
        {showLaser ? (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[2px] z-20" style={{
            height: '60%',
            background: 'linear-gradient(to top, #22c55e, #4ade80, transparent)',
            boxShadow: '0 0 8px #22c55e, 0 0 16px #22c55e',
            animation: 'laser-fire 0.4s ease-out forwards',
          }} />
        ) : null}

        {/* Turret */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center z-10">
          <div style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '16px solid #22c55e', margin: '0 auto', filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.5))' }} />
        </div>

        {/* Ground line */}
        <div className="absolute bottom-4 left-[10%] right-[10%] h-[2px] z-10" style={{ background: 'linear-gradient(to right, transparent, #22c55e, transparent)', boxShadow: '0 0 6px rgba(34,197,94,0.3)' }} />

        {/* Last alien standing text */}
        {isComplete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-20 left-0 right-0 text-center z-20"
          >
            <span className="pixel-font text-[10px] sm:text-xs text-green-400 px-4 py-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(34,197,94,0.4)', textShadow: '0 0 10px rgba(34,197,94,0.6)' }}>
              LAST ALIEN STANDING
            </span>
          </motion.div>
        ) : null}
      </div>

      {isComplete ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...result.players].sort((a, b) => a.rank - b.rank).map(player => (
            <PlayerResultCard
              key={player.name}
              name={player.name}
              selectionGoal={result.selectionGoal}
              title={player.headline}
              subtitle={player.subline}
              selected={player.selected}
            >
              <div className="flex flex-wrap gap-2">
                {player.chips.map(chip => (
                  <span key={chip} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-400">{chip}</span>
                ))}
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-400">Rank #{player.rank}</span>
              </div>
            </PlayerResultCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BombPlayback({ result, step, done, interactiveBombState, ModeHeader, PlayerResultCard }) {
  const [phase, setPhase] = useState('ready');
  const [tickIndex, setTickIndex] = useState(0);
  const [exploded, setExploded] = useState(false);
  const [shaking, setShaking] = useState(false);
  const startTimeRef = React.useRef(null);
  const animFrameRef = React.useRef(null);
  const tickIndexRef = React.useRef(0);

  const isInteractive = !!interactiveBombState;
  const totalTicks = result.totalTicks;
  const sequence = result.sequence;
  const playerNames = result.players.map(p => p.name);

  function getTickInterval(idx) {
    const remaining = totalTicks - idx;
    if (remaining <= 5) return 250;
    if (remaining <= 10) return 400;
    return 600;
  }

  function startFuse() {
    setPhase('ticking');
    startTimeRef.current = performance.now();
    tickIndexRef.current = 0;
    setTickIndex(0);
  }

  // Autonomous animation (non-interactive only)
  useEffect(() => {
    if (isInteractive) return;
    if (phase !== 'ticking') return;

    let accumulatedTime = 0;
    for (let i = 0; i < tickIndexRef.current; i++) {
      accumulatedTime += getTickInterval(i);
    }

    function tick(now) {
      const elapsed = now - startTimeRef.current;
      let currentTick = 0;
      let timeSum = 0;
      for (let i = 0; i < totalTicks; i++) {
        timeSum += getTickInterval(i);
        if (elapsed >= timeSum) {
          currentTick = i + 1;
        } else {
          break;
        }
      }

      if (currentTick > tickIndexRef.current) {
        tickIndexRef.current = currentTick;
        setTickIndex(currentTick);
      }

      if (currentTick >= totalTicks) {
        setExploded(true);
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        setPhase('complete');
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [phase, totalTicks, isInteractive]);

  useEffect(() => {
    if (phase === 'complete') {
      window.dispatchEvent(new Event('rocket-complete'));
    }
  }, [phase]);

  // Interactive mode: derive display state from interactiveBombState
  const iTickIndex = isInteractive ? (interactiveBombState.tickNumber || 0) : tickIndex;
  const iExploded = isInteractive ? (interactiveBombState.phase === 'detonated') : exploded;
  const iHolder = isInteractive
    ? interactiveBombState.holder
    : (tickIndex < totalTicks ? sequence[tickIndex] : sequence[totalTicks - 1]);
  const iPhase = isInteractive
    ? (interactiveBombState.phase === 'detonated' ? 'complete' : 'ticking')
    : phase;

  const currentHolder = iHolder;
  const fusePercent = totalTicks > 0 ? Math.max(0, 1 - iTickIndex / totalTicks) : 1;
  const isComplete = iPhase === 'complete' || done;

  // Trigger shaking on interactive detonation
  useEffect(() => {
    if (isInteractive && interactiveBombState.phase === 'detonated' && !shaking) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  }, [isInteractive, interactiveBombState?.phase]);

  const angleStep = (2 * Math.PI) / playerNames.length;
  const radius = playerNames.length <= 4 ? 100 : playerNames.length <= 6 ? 120 : 140;

  // Determine the selected name for explosion display
  const explodedName = isInteractive
    ? (interactiveBombState.phase === 'detonated' ? interactiveBombState.holder : null)
    : result.selectedName;

  return (
    <div className="space-y-4">
      <ModeHeader
        result={result}
        done={isComplete}
        pendingText={iPhase === 'ready' ? 'Bomb is armed...' : iExploded ? 'KABOOM!' : `Tick ${iTickIndex} of ${totalTicks}`}
        pendingSummary="Don't be holding the bomb when it blows."
      />

      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'repeating-linear-gradient(-45deg, #1a1a2e, #1a1a2e 20px, #1e1e34 20px, #1e1e34 22px)',
          minHeight: 380,
          animation: shaking ? 'screen-shake 0.5s ease-out' : 'none',
        }}
      >
        {/* Fuse bar */}
        <div className="absolute top-3 left-4 right-4 z-10">
          <div className="pixel-font text-[7px] text-red-400/60 uppercase tracking-widest mb-1">Fuse</div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: fusePercent > 0.3 ? 'linear-gradient(90deg, #f97316, #ef4444)' : 'linear-gradient(90deg, #ef4444, #dc2626)',
                boxShadow: fusePercent <= 0.3 ? '0 0 10px rgba(239,68,68,0.6)' : 'none',
              }}
              animate={{ width: `${fusePercent * 100}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>

        {/* Player circle */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: 30 }}>
          <div className="relative" style={{ width: radius * 2 + 80, height: radius * 2 + 80 }}>
            {playerNames.map((name, idx) => {
              const angle = angleStep * idx - Math.PI / 2;
              const x = Math.cos(angle) * radius + radius + 40;
              const y = Math.sin(angle) * radius + radius + 40;
              const isHolding = !iExploded && currentHolder === name;
              const isExplodedOn = iExploded && name === explodedName;
              const isSafe = iExploded && name !== explodedName;

              return (
                <motion.div
                  key={name}
                  className="absolute text-center"
                  style={{
                    left: x - 35,
                    top: y - 22,
                    width: 70,
                  }}
                  animate={{
                    scale: isHolding ? [1, 1.05, 1] : 1,
                  }}
                  transition={{ duration: 0.3, repeat: isHolding ? Infinity : 0 }}
                >
                  <div
                    className="rounded-xl px-2 py-2 text-center"
                    style={{
                      background: isExplodedOn ? 'rgba(239,68,68,0.3)' : isSafe ? 'rgba(34,197,94,0.15)' : isHolding ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isExplodedOn ? 'rgba(239,68,68,0.6)' : isSafe ? 'rgba(34,197,94,0.4)' : isHolding ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      boxShadow: isHolding ? '0 0 12px rgba(239,68,68,0.3)' : isExplodedOn ? '0 0 16px rgba(239,68,68,0.4)' : 'none',
                    }}
                  >
                    {isHolding && !iExploded ? (
                      <div className="text-lg" style={{ animation: 'bomb-pulse 0.5s ease-in-out infinite' }}>💣</div>
                    ) : isExplodedOn ? (
                      <motion.div
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 2, 1.5] }}
                        transition={{ duration: 0.5 }}
                        className="text-lg"
                      >
                        💥
                      </motion.div>
                    ) : null}
                    <div className="pixel-font text-[7px]" style={{
                      color: isExplodedOn ? '#fca5a5' : isSafe ? '#86efac' : isHolding ? '#fca5a5' : '#94a3b8',
                    }}>
                      {name}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Center bomb (when not being held) */}
            {iPhase === 'ready' ? (
              <div className="absolute text-3xl" style={{ left: radius + 40 - 16, top: radius + 40 - 16 }}>
                💣
              </div>
            ) : null}
          </div>
        </div>

        {/* Start button (non-interactive only) */}
        {!isInteractive && iPhase === 'ready' ? (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <button
              onClick={startFuse}
              className="pixel-font inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 px-8 py-4 text-sm text-white shadow-lg shadow-red-600/30 transition hover:scale-105 active:scale-95"
              style={{ textShadow: '0 0 10px rgba(239,68,68,0.5)' }}
            >
              💣 LIGHT THE FUSE
            </button>
          </div>
        ) : null}
      </div>

      {isComplete ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...result.players].sort((a, b) => a.rank - b.rank).map(player => (
            <PlayerResultCard
              key={player.name}
              name={player.name}
              selectionGoal={result.selectionGoal}
              title={player.headline}
              subtitle={player.subline}
              selected={player.selected}
            >
              <div className="flex flex-wrap gap-2">
                {player.chips.map(chip => (
                  <span key={chip} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-400">{chip}</span>
                ))}
              </div>
            </PlayerResultCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PlinkoPlayback({ result, step, done, ModeHeader, PlayerResultCard }) {
  const SLOT_VALUES = result.slotValues || [1, 2, 3, 5, 8, 13, 21, 13, 8, 5, 3, 2, 1];
  const ROWS = result.rows || 12;
  const totalPlayers = result.players.length;
  const droppedCount = Math.min(step, totalPlayers);
  const droppedPlayers = result.players.slice(0, droppedCount);

  const [animatingBall, setAnimatingBall] = useState(null);
  const [animRow, setAnimRow] = useState(-1);
  const [landedBalls, setLandedBalls] = useState(new Set());
  const prevStepRef = React.useRef(0);

  useEffect(() => {
    if (step > prevStepRef.current && step <= totalPlayers) {
      const player = result.players[step - 1];
      setAnimatingBall(player);
      setAnimRow(-1);
      let row = 0;
      const interval = setInterval(() => {
        setAnimRow(row);
        row++;
        if (row > ROWS) {
          clearInterval(interval);
          setLandedBalls(prev => new Set([...prev, player.name]));
          setTimeout(() => setAnimatingBall(null), 500);
        }
      }, 280);
      prevStepRef.current = step;
      return () => clearInterval(interval);
    }
    prevStepRef.current = step;
  }, [step, totalPlayers, ROWS, result.players]);

  const BALL_COLORS = ['#ec4899', '#fbbf24', '#60a5fa', '#34d399', '#a78bfa', '#fb923c', '#22d3ee', '#f87171'];
  const isComplete = done || droppedCount >= totalPlayers;

  function getBallX(path, row) {
    let col = 0;
    for (let r = 0; r <= Math.min(row, path.length - 1); r++) {
      col += path[r];
    }
    return col;
  }

  const boardWidth = 320;
  const boardHeight = 340;
  const pegSpacingY = boardHeight / (ROWS + 2);
  const slotWidth = boardWidth / 13;

  return (
    <div className="space-y-4">
      <ModeHeader
        result={result}
        done={isComplete}
        pendingText={droppedCount === 0 ? "Ready to drop..." : `Ball ${droppedCount} of ${totalPlayers}`}
        pendingSummary="Each ball bounces down through the pegs."
      />

      <div className="relative overflow-hidden rounded-2xl flex justify-center" style={{ background: 'linear-gradient(180deg, #1a0a18, #0f0610)', minHeight: 420, padding: '20px 0' }}>
        <svg viewBox={`0 0 ${boardWidth} ${boardHeight + 60}`} className="w-full h-auto" style={{ maxHeight: 420 }}>
          {/* Pegs */}
          {Array.from({ length: ROWS }, (_, row) => {
            const pegsInRow = row + 2;
            const rowWidth = (pegsInRow - 1) * slotWidth;
            const startX = (boardWidth - rowWidth) / 2;
            return Array.from({ length: pegsInRow }, (_, pegIdx) => (
              <circle
                key={`peg-${row}-${pegIdx}`}
                cx={startX + pegIdx * slotWidth}
                cy={(row + 1) * pegSpacingY}
                r={3}
                fill={pegIdx % 2 === 0 ? '#ec4899' : '#22d3ee'}
                opacity={0.5}
              >
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur={`${2 + pegIdx * 0.3}s`} repeatCount="indefinite" />
              </circle>
            ));
          })}

          {/* Slot labels at bottom */}
          {SLOT_VALUES.map((val, i) => {
            const x = (i + 0.5) * slotWidth;
            const isCenter = i >= 5 && i <= 7;
            return (
              <g key={`slot-${i}`}>
                <rect x={x - slotWidth / 2 + 1} y={boardHeight - 5} width={slotWidth - 2} height={30} rx={4}
                  fill={isCenter ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)'}
                  stroke={isCenter ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'} strokeWidth={1} />
                <text x={x} y={boardHeight + 15} textAnchor="middle" fill={isCenter ? '#fbbf24' : '#94a3b8'}
                  fontSize={10} fontFamily="'Press Start 2P', monospace">{val}</text>
              </g>
            );
          })}

          {/* Dropped balls (landed) */}
          {droppedPlayers.filter(p => p !== animatingBall).map((player, idx) => {
            const x = (player.finalSlot + 0.5) * slotWidth;
            return (
              <circle key={`landed-${idx}`} cx={x} cy={boardHeight + 8} r={6}
                fill={BALL_COLORS[idx % BALL_COLORS.length]} opacity={0.7}>
                <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite" />
              </circle>
            );
          })}

          {/* Animating ball */}
          {animatingBall && animRow >= 0 ? (() => {
            const playerIdx = result.players.indexOf(animatingBall);
            const col = getBallX(animatingBall.path, Math.min(animRow, ROWS - 1));
            const totalCols = Math.min(animRow + 2, ROWS + 1);
            const rowWidthAtRow = (totalCols - 1) * slotWidth;
            const startXAtRow = (boardWidth - rowWidthAtRow) / 2;
            let cx, cy;
            if (animRow >= ROWS) {
              cx = (animatingBall.finalSlot + 0.5) * slotWidth;
              cy = boardHeight + 8;
            } else {
              const pegsInRow = animRow + 2;
              const rw = (pegsInRow - 1) * slotWidth;
              const sx = (boardWidth - rw) / 2;
              cx = sx + col * slotWidth;
              cy = (animRow + 1) * pegSpacingY;
            }
            return (
              <circle cx={cx} cy={cy} r={8}
                fill={BALL_COLORS[playerIdx % BALL_COLORS.length]}
                style={{ filter: `drop-shadow(0 0 8px ${BALL_COLORS[playerIdx % BALL_COLORS.length]})`, transition: 'cx 0.2s ease-out, cy 0.2s ease-out' }} />
            );
          })() : null}
        </svg>

        {/* Player legend */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap justify-center gap-2">
          {result.players.map((p, i) => (
            <div key={p.name} className="pixel-font text-[7px] px-2 py-1 rounded" style={{
              background: i < droppedCount ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              color: BALL_COLORS[i % BALL_COLORS.length],
              opacity: i < droppedCount ? 1 : 0.4,
            }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: BALL_COLORS[i % BALL_COLORS.length], marginRight: 4, verticalAlign: 'middle' }} />
              {p.name} {landedBalls.has(p.name) ? `(${p.score})` : ''}
            </div>
          ))}
        </div>
      </div>

      {isComplete ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...result.players].sort((a, b) => a.rank - b.rank).map(player => (
            <PlayerResultCard
              key={player.name}
              name={player.name}
              selectionGoal={result.selectionGoal}
              title={player.headline}
              subtitle={player.subline}
              selected={player.selected}
              tied={player.tied}
            >
              <div className="flex flex-wrap gap-2">
                {player.chips.map(chip => (
                  <span key={chip} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-400">{chip}</span>
                ))}
              </div>
            </PlayerResultCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BattleRoyalePlayback({ result, step, done, ModeHeader, PlayerResultCard }) {
  const totalPlayers = result.players.length;
  const eliminationOrder = result.eliminationOrder || [];
  const elimCount = Math.min(step, eliminationOrder.length);
  const destroyedNames = new Set(eliminationOrder.slice(0, elimCount));
  const aliveCount = totalPlayers - elimCount;
  const currentPhase = Math.min(step, result.zones.length - 1);
  const zone = result.zones[currentPhase] || result.zones[0];
  const survivorName = result.players.find((player) => !eliminationOrder.includes(player.name))?.name
    || result.players.find((player) => player.rank === 1)?.name
    || result.selectedName;

  const [flashElim, setFlashElim] = useState(null);
  const prevStepRef = React.useRef(0);

  useEffect(() => {
    if (step > prevStepRef.current && step <= eliminationOrder.length) {
      const target = eliminationOrder[step - 1];
      setFlashElim(target);
      const t = setTimeout(() => setFlashElim(null), 1500);
      prevStepRef.current = step;
      return () => clearTimeout(t);
    }
    prevStepRef.current = step;
  }, [step, eliminationOrder]);

  const isComplete = done || elimCount >= eliminationOrder.length;
  const mapSize = 300;
  const scale = mapSize / 100;

  const PLAYER_COLORS = ['#22d3ee', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb923c', '#60a5fa', '#f87171'];

  return (
    <div className="space-y-4">
      <ModeHeader
        result={result}
        done={isComplete}
        pendingText={elimCount === 0 ? "Players dropping in..." : `Phase ${elimCount} of ${eliminationOrder.length}`}
        pendingSummary="Zone shrinks each phase. Furthest player gets eliminated."
      />

      <div className="relative overflow-hidden rounded-2xl" style={{ background: '#050a18', minHeight: 400 }}>
        {/* Grid background */}
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg,transparent 0px,transparent 29px,rgba(34,211,238,0.04) 29px,rgba(34,211,238,0.04) 30px), repeating-linear-gradient(90deg,transparent 0px,transparent 29px,rgba(34,211,238,0.04) 29px,rgba(34,211,238,0.04) 30px)' }} />

        {/* Top-left: zone phase */}
        <div className="absolute top-3 left-4 z-10">
          <div className="pixel-font text-[7px] text-cyan-500/60 uppercase tracking-widest">Zone Phase</div>
          <div className="pixel-font text-sm text-cyan-400">{currentPhase}/{result.zones.length - 1}</div>
        </div>

        {/* Top-right: alive count */}
        <div className="absolute top-3 right-4 z-10">
          <div className="pixel-font text-[7px] text-cyan-500/60 uppercase tracking-widest">Alive</div>
          <div className="pixel-font text-sm text-cyan-400">{aliveCount}/{totalPlayers}</div>
        </div>

        {/* Map area */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: 30 }}>
          <div className="relative w-full" style={{ maxWidth: mapSize, aspectRatio: '1 / 1' }}>
            {/* Map border */}
            <div className="absolute inset-0 border border-cyan-800/30 rounded" />

            {/* Danger zone (area outside zone circle) */}
            <div className="absolute inset-0 overflow-hidden rounded">
              <div className="absolute inset-0" style={{
                background: step > 0 ? 'rgba(239,68,68,0.06)' : 'transparent',
                transition: 'background 1.5s ease',
              }} />
            </div>

            {/* Zone circle */}
            <motion.div
              className="absolute rounded-full"
              style={{
                border: '2px solid rgba(34,211,238,0.5)',
                background: 'rgba(34,211,238,0.04)',
                boxShadow: '0 0 20px rgba(34,211,238,0.15), inset 0 0 20px rgba(34,211,238,0.05)',
              }}
              animate={{
                width: zone.radius * 2 * scale,
                height: zone.radius * 2 * scale,
                left: zone.cx * scale - zone.radius * scale,
                top: zone.cy * scale - zone.radius * scale,
              }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />

            {/* Players */}
            {result.players.map((player, idx) => {
              const isEliminated = destroyedNames.has(player.name);
              const isFlashing = flashElim === player.name;
              const isSurvivor = isComplete && player.name === survivorName;
              const livePosition = result.positions?.find((position) => position.name === player.name);
              const px = (livePosition?.x ?? player.x) * scale;
              const py = (livePosition?.y ?? player.y) * scale;

              return (
                <motion.div
                  key={player.name}
                  className="absolute"
                  style={{ left: px - 14, top: py - 14, width: 28, textAlign: 'center', zIndex: isSurvivor ? 10 : 1 }}
                  animate={{
                    opacity: isEliminated && !isFlashing ? 0.3 : 1,
                    scale: isFlashing ? [1, 1.3, 0.8] : isSurvivor ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <div style={{
                    width: 10, height: 10, margin: '0 auto',
                    transform: 'rotate(45deg)',
                    background: isEliminated ? '#4b5563' : PLAYER_COLORS[idx % PLAYER_COLORS.length],
                    boxShadow: isSurvivor ? `0 0 12px ${PLAYER_COLORS[idx % PLAYER_COLORS.length]}` : isFlashing ? '0 0 12px rgba(239,68,68,0.6)' : 'none',
                    border: isFlashing ? '1px solid #ef4444' : 'none',
                  }} />
                  <div className="pixel-font text-[8px] mt-0.5" style={{
                    color: isEliminated ? '#4b5563' : PLAYER_COLORS[idx % PLAYER_COLORS.length],
                    textDecoration: isEliminated ? 'line-through' : 'none',
                  }}>
                    {isEliminated && !isFlashing ? '☠' : ''}{player.name}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* VICTORY ROYALE */}
        {isComplete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-16 left-0 right-0 text-center z-20"
          >
            <span className="pixel-font text-[10px] sm:text-xs text-cyan-300 px-4 py-2 rounded-lg" style={{ background: 'rgba(5,10,24,0.9)', border: '1px solid rgba(34,211,238,0.4)', textShadow: '0 0 10px rgba(34,211,238,0.6)' }}>
              VICTORY ROYALE
            </span>
          </motion.div>
        ) : null}

        {/* Event log at bottom */}
        <div className="absolute bottom-3 left-4 right-4 z-10">
          {flashElim ? (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="pixel-font text-[7px] text-red-400/80 text-center"
            >
              {flashElim} was eliminated from the zone
            </motion.div>
          ) : null}
        </div>
      </div>

      {isComplete ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...result.players].sort((a, b) => a.rank - b.rank).map(player => (
            <PlayerResultCard
              key={player.name}
              name={player.name}
              selectionGoal={result.selectionGoal}
              title={player.headline}
              subtitle={player.subline}
              selected={player.selected}
            >
              <div className="flex flex-wrap gap-2">
                {player.chips.map(chip => (
                  <span key={chip} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-400">{chip}</span>
                ))}
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-400">Rank #{player.rank}</span>
              </div>
            </PlayerResultCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StockMarketPlayback({ result, step, done, ModeHeader, PlayerResultCard, pickRandomMessage, WIN_MESSAGES, LOSE_MESSAGES }) {
  const [phase, setPhase] = useState('ready');
  const [drawIndex, setDrawIndex] = useState(0);
  const startTimeRef = React.useRef(null);
  const animFrameRef = React.useRef(null);
  const tradingStartedRef = React.useRef(false);

  const STOCK_COLORS = ['#10b981', '#22d3ee', '#ec4899', '#fbbf24', '#a78bfa', '#fb923c', '#60a5fa', '#f87171'];

  function startTrading() {
    if (tradingStartedRef.current) return;
    tradingStartedRef.current = true;
    setPhase('trading');
    setDrawIndex(0);
    window.__stockDrawIndex = 0;
    startTimeRef.current = performance.now();
  }

  useEffect(() => {
    if (result.draftPhase) {
      tradingStartedRef.current = false;
      setPhase('ready');
      setDrawIndex(0);
      return undefined;
    }
    if (phase !== 'ready') return undefined;
    const timer = setTimeout(() => startTrading(), 1200);
    return () => clearTimeout(timer);
  }, [phase, result.draftPhase, result.runId]);

  useEffect(() => {
    if (result.draftPhase) return undefined;
    if (phase !== 'trading') return;

    function tick(now) {
      const elapsed = (now - startTimeRef.current) / 1000;
      const newIndex = Math.min(59, Math.floor(elapsed * 4));
      setDrawIndex(newIndex);
      window.__stockDrawIndex = newIndex;

      if (newIndex >= 59) {
        setPhase('complete');
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [phase, result.draftPhase]);

  useEffect(() => {
    if (result.draftPhase) return undefined;
    if (phase === 'complete') {
      const sellState = (typeof window !== 'undefined' && window.__stockSellState) || {};
      const isStockInteractive = typeof window !== 'undefined' && window.__stockInteractive;

      if (isStockInteractive && result.isInteractiveChart) {
        // Compute final result with sell decisions
        const finalPlayers = result.players.map(p => {
          const sold = sellState[p.name];
          const finalPrice = sold ? sold.price : p.prices[59];
          const pctChange = ((finalPrice - 100) / 100 * 100);
          return {
            ...p,
            endPrice: finalPrice,
            percentChange: pctChange,
            sold: !!sold,
            headline: `${p.ticker} \u2014 ${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%`,
            subline: sold ? `Sold at $${finalPrice.toFixed(2)}` : `Held to $${finalPrice.toFixed(2)}`,
            chips: [p.ticker, `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%`, sold ? 'SOLD' : 'HELD'],
          };
        });

        finalPlayers.sort((a, b) => b.percentChange - a.percentChange);
        finalPlayers.forEach((p, i) => { p.rank = i + 1; });

        const selected = result.selectionGoal === 'winner' ? finalPlayers[0] : finalPlayers[finalPlayers.length - 1];

        result.selectedName = selected.name;
        result.headline = pickRandomMessage(
          result.selectionGoal === 'winner' ? WIN_MESSAGES : LOSE_MESSAGES,
          selected.name, result.selectionGoal === 'winner' ? 'win' : 'lose'
        );
        result.summary = `${selected.name}'s ${selected.ticker} ${selected.percentChange >= 0 ? 'gained' : 'lost'} ${Math.abs(selected.percentChange).toFixed(1)}%.`;
        result.isTie = false;
        result.players = finalPlayers.map(p => ({ ...p, selected: p.name === selected.name }));
      }

      window.dispatchEvent(new Event('rocket-complete'));
    }
  }, [phase, result, result.draftPhase]);

  if (result.draftPhase) {
    const draftState = (typeof window !== 'undefined' && window.__stockDraftState) || {};
    return (
      <div className="space-y-6">
        <ModeHeader result={result} done={false} pendingText="Players are picking stocks..." pendingSummary="Each player chooses their stock from the pool." />
        <div className="text-center py-12">
          <div className="pixel-font text-xl text-emerald-300 animate-pulse mb-4">{"\uD83D\uDCC8"} STOCK DRAFT {"\uD83D\uDCC8"}</div>
          <div className="font-mono text-sm text-slate-500">Waiting for picks...</div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(result.pickOrder || []).map((name) => {
              const hasPicked = draftState?.playerStocks?.[name];
              return (
                <div key={name} className={`px-3 py-1.5 rounded-lg font-mono text-xs ${
                  hasPicked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-500'
                }`}>
                  {name} {hasPicked ? `\u2713 ${draftState.playerStocks[name]}` : '...'}
                </div>
              );
            })}
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-lg mx-auto">
            {(result.stockPool || []).map(s => {
              const takenBy = draftState?.taken?.[s.ticker];
              return (
                <div key={s.ticker} className={`px-2 py-2 rounded-lg font-mono text-[10px] ${
                  takenBy ? 'bg-white/5 text-slate-600 line-through' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                }`}>
                  <div className="font-bold text-xs">{s.ticker}</div>
                  <div className="text-[8px] opacity-60">{takenBy ? `\u2192 ${takenBy}` : s.note}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const isComplete = phase === 'complete' || done;

  const allPrices = result.players.flatMap(p => p.prices || []);
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) * 1.1 : 200;
  const minPrice = allPrices.length > 0 ? Math.max(0, Math.min(...allPrices) * 0.9) : 0;

  const chartWidth = 500;
  const chartHeight = 260;
  const chartPadX = 50;
  const chartPadY = 20;
  const plotWidth = chartWidth - chartPadX - 10;
  const plotHeight = chartHeight - chartPadY * 2;

  function priceToY(price) {
    return chartPadY + plotHeight - ((price - minPrice) / (maxPrice - minPrice)) * plotHeight;
  }

  function indexToX(idx) {
    return chartPadX + (idx / 59) * plotWidth;
  }

  const gridLines = 5;
  const priceStep = (maxPrice - minPrice) / gridLines;

  return (
    <div className="space-y-4">
      <ModeHeader
        result={result}
        done={isComplete}
        pendingText={phase === 'ready' ? 'Markets opening...' : phase === 'trading' ? 'Trading in progress...' : 'MARKET CLOSED'}
        pendingSummary="Watch the charts. Best/worst stock gets selected."
      />

      <div className="relative overflow-hidden rounded-2xl" style={{ background: '#000', minHeight: 380 }}>
        {/* Grid background */}
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg,transparent 0px,transparent 14px,rgba(16,185,129,0.03) 14px,rgba(16,185,129,0.03) 15px), repeating-linear-gradient(90deg,transparent 0px,transparent 29px,rgba(16,185,129,0.02) 29px,rgba(16,185,129,0.02) 30px)' }} />

        {/* Chart */}
        <div className="flex items-center justify-center pt-4">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto" style={{ maxHeight: 300 }}>
            {/* Y-axis grid lines */}
            {Array.from({ length: gridLines + 1 }, (_, i) => {
              const price = minPrice + i * priceStep;
              const y = priceToY(price);
              return (
                <g key={`grid-${i}`}>
                  <line x1={chartPadX} y1={y} x2={chartWidth - 10} y2={y} stroke="rgba(16,185,129,0.1)" strokeWidth={0.5} />
                  <text x={chartPadX - 5} y={y + 3} textAnchor="end" fill="#10b981" fontSize={8} fontFamily="'Source Code Pro', monospace" opacity={0.5}>
                    ${Math.round(price)}
                  </text>
                </g>
              );
            })}

            {/* $100 baseline */}
            <line x1={chartPadX} y1={priceToY(100)} x2={chartWidth - 10} y2={priceToY(100)}
              stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} strokeDasharray="4,4" />

            {/* Price lines */}
            {result.players.map((player, pIdx) => {
              const endIdx = phase === 'ready' ? 0 : Math.min(drawIndex + 1, 60);
              if (endIdx < 2) return null;
              const points = player.prices.slice(0, endIdx).map((price, i) =>
                `${indexToX(i)},${priceToY(price)}`
              ).join(' ');
              return (
                <polyline key={player.name} points={points}
                  fill="none" stroke={STOCK_COLORS[pIdx % STOCK_COLORS.length]}
                  strokeWidth={1.5} opacity={0.8} />
              );
            })}
          </svg>
        </div>

        {/* Sidebar: current prices */}
        <div className="absolute top-4 right-4 z-10 space-y-1">
          {result.players.map((player, pIdx) => {
            const currentIdx = phase === 'ready' ? 0 : Math.min(drawIndex, 59);
            const currentPrice = player.prices[currentIdx];
            const pctChange = ((currentPrice - 100) / 100 * 100).toFixed(1);
            const isUp = currentPrice >= 100;
            const isMooning = currentPrice > 200;
            const isTanking = currentPrice < 20;
            return (
              <div key={player.name} className="font-mono text-[9px] flex items-center gap-1.5 py-0.5" style={{ color: STOCK_COLORS[pIdx % STOCK_COLORS.length] }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: STOCK_COLORS[pIdx % STOCK_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                <span className="font-bold" style={{ minWidth: 50 }}>{player.name}</span>
                <span className="pixel-font text-[6px]" style={{ minWidth: 40, opacity: 0.7 }}>{player.ticker}</span>
                <span className="font-bold" style={{ color: isUp ? '#10b981' : '#ef4444', minWidth: 45, textAlign: 'right' }}>
                  ${currentPrice.toFixed(0)}
                </span>
                <span style={{ fontSize: 8, color: isUp ? '#10b981' : '#ef4444', minWidth: 40, textAlign: 'right' }}>
                  {isUp ? '+' : ''}{pctChange}%
                  {isMooning ? ' \uD83D\uDE80' : isTanking ? ' \uD83D\uDC80' : ''}
                </span>
              </div>
            );
          })}
        </div>

        {/* Start button */}
        {phase === 'ready' ? (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="text-center">
              <button
                onClick={startTrading}
                className="pixel-font inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-4 text-sm text-white shadow-lg shadow-emerald-600/30 transition hover:scale-105 active:scale-95"
                style={{ textShadow: '0 0 10px rgba(16,185,129,0.5)' }}
              >
                📈 START TRADING
              </button>
              <div className="pixel-font mt-3 text-[7px] text-emerald-300/80">
                Auto-starting...
              </div>
            </div>
          </div>
        ) : null}

        {/* Market closed overlay */}
        {isComplete ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
          >
            <span className="pixel-font text-sm sm:text-base text-emerald-400 px-6 py-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(16,185,129,0.4)', textShadow: '0 0 10px rgba(16,185,129,0.6)' }}>
              MARKET CLOSED
            </span>
          </motion.div>
        ) : null}
      </div>

      {isComplete ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...result.players].sort((a, b) => a.rank - b.rank).map(player => (
            <PlayerResultCard
              key={player.name}
              name={player.name}
              selectionGoal={result.selectionGoal}
              title={player.headline}
              subtitle={player.subline}
              selected={player.selected}
              tied={player.tied}
            >
              <div className="flex flex-wrap gap-2">
                {player.chips.map(chip => (
                  <span key={chip} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-400">{chip}</span>
                ))}
              </div>
            </PlayerResultCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}
