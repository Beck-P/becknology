import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function WheelPlayback({ result, step, done, ModeHeader, WHEEL_COLORS }) {
  const angleStep = 360 / result.wheel.names.length;
  const gradient = result.wheel.names
    .map((_, index) => {
      const start = index * angleStep;
      const end = (index + 1) * angleStep;
      return `${WHEEL_COLORS[index % WHEEL_COLORS.length]} ${start}deg ${end}deg`;
    })
    .join(", ");
  const spinStarted = step >= 1;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 shadow-xl backdrop-blur">
      <ModeHeader result={result} done={done} pendingText={spinStarted ? "The wheel is spinning..." : "Click to spin the wheel..."} pendingSummary={spinStarted ? "One more click reveals who got picked." : "Everybody gets a slice. Start the spin when you're ready."} />

      <div className="p-6" style={{ background: "linear-gradient(180deg, #1a1a3e 0%, #0f0f2a 100%)" }}>
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6">
          {/* Stage lights effect */}
          <div className="relative h-64 w-64 sm:h-80 sm:w-80">
            {/* Spotlight glow */}
            <div className="absolute -inset-8 rounded-full" style={{ background: "radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-2 text-3xl" style={{ color: "#fbbf24", filter: "drop-shadow(0 0 6px rgba(251,191,36,0.5))" }}>▼</div>
            <motion.div
              className="absolute inset-0 rounded-full shadow-2xl"
              initial={false}
              animate={{ rotate: spinStarted ? result.wheel.rotation : result.wheel.rotation - 360 }}
              transition={{ duration: 3.4, ease: [0.12, 0.9, 0.1, 1] }}
              style={{ background: `conic-gradient(${gradient})`, border: "6px solid rgba(255,255,255,0.9)", boxShadow: "0 0 30px rgba(251,191,36,0.2), inset 0 0 20px rgba(0,0,0,0.3)" }}
            />
            <div className="absolute inset-[26%] z-10 flex items-center justify-center rounded-full" style={{ background: "radial-gradient(circle, #2a2a4e, #1a1a3e)", border: "3px solid rgba(251,191,36,0.4)", boxShadow: "0 0 15px rgba(251,191,36,0.15)" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={done ? result.selectedName : spinStarted ? "spinning" : "ready"}
                  initial={{ opacity: 0, scale: 0.55, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <div className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: "rgba(251,191,36,0.7)" }}>
                    {done ? "Picked" : spinStarted ? "Spinning" : "Ready"}
                  </div>
                  <div className="mt-1 text-xl font-bold" style={{ color: "#fff" }}>{done ? result.selectedName : spinStarted ? "???" : "Tap next"}</div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Verdict text in Bungee */}
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="text-2xl font-bold" style={{ fontFamily: "'Bungee', cursive", color: "#fbbf24", textShadow: "0 0 20px rgba(251,191,36,0.4)" }}>
                {result.selectedName}
              </div>
            </motion.div>
          ) : null}

          {/* Podiums */}
          <div className="flex w-full flex-wrap items-end justify-center gap-2 pt-4 sm:gap-3" style={{ minHeight: "120px" }}>
            {result.wheel.names.map((name, index) => {
              const isSelected = done && name === result.selectedName;
              const isWinner = result.selectionGoal === "winner";
              const segColor = WHEEL_COLORS[index % WHEEL_COLORS.length];
              const podiumHeight = isSelected ? 100 : 60 + (index % 3) * 10;
              return (
                <motion.div
                  key={name}
                  animate={isSelected ? { scale: [1, 1.05, 1] } : {}}
                  transition={isSelected ? { duration: 1.2, repeat: Infinity } : undefined}
                  className="flex flex-col items-center flex-1 min-w-0"
                  style={{ maxWidth: "120px", minWidth: "60px" }}
                >
                  <div className="text-xs font-bold text-center mb-1 truncate w-full" style={{ color: isSelected ? "#fbbf24" : "#aaa" }}>{name}</div>
                  <motion.div
                    animate={{ height: podiumHeight }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                    className="w-full rounded-t-lg"
                    style={{
                      background: `linear-gradient(180deg, ${segColor}, ${segColor}88)`,
                      boxShadow: isSelected ? `0 0 24px ${segColor}88, 0 0 48px rgba(251,191,36,0.3)` : `0 2px 8px rgba(0,0,0,0.3)`,
                      border: isSelected ? "2px solid rgba(251,191,36,0.6)" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NumberPlayback({ result, step, done, ModeHeader, CyclingNumber, clamp }) {
  const revealed = clamp(step, 0, result.players.length);
  return (
    <div className="overflow-hidden rounded-2xl shadow-xl" style={{ border: "1px solid #333", fontFamily: "'Source Code Pro', monospace" }}>
      {/* Terminal title bar */}
      <div className="flex items-center gap-2 px-4 py-2" style={{ background: "#1a1a2e", borderBottom: "1px solid #333" }}>
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
          <div className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
        </div>
        <div className="flex-1 text-center text-xs font-semibold" style={{ color: "#666" }}>RUNOUTS_RNG v2.4.1</div>
      </div>

      {/* Terminal body */}
      <div className="p-5 space-y-1" style={{ background: "#0a0a1a", color: "#00ff41", minHeight: "280px" }}>
        {/* System boot text */}
        <div className="text-xs" style={{ color: "#333" }}>system initialized. seed: crypto.getRandomValues()</div>
        <div className="text-xs" style={{ color: "#333" }}>players loaded: {result.players.length}</div>
        <div className="text-xs mb-4" style={{ color: "#333" }}>---</div>

        {/* Header line */}
        {done ? (
          <div>
            <div className="text-sm font-bold mb-1" style={{ color: result.isTie ? "#f59e0b" : result.selectionGoal === "winner" ? "#fbbf24" : "#f87171" }}>
              {"> "}{result.headline}
            </div>
            <div className="text-xs mb-4" style={{ color: "#666" }}>{"> "}{result.summary}</div>
          </div>
        ) : (
          <div>
            <div className="text-sm font-bold mb-1" style={{ color: "#00ff41" }}>{"> "}Processing results...</div>
            <div className="text-xs mb-4" style={{ color: "#666" }}>{"> "}Lowest number gets the chore.</div>
          </div>
        )}

        {/* Player result lines */}
        {result.players.map((player, index) => {
          const isShown = index < revealed;
          const isSelected = done && player.selected;
          const isTied = done && player.tied;
          const isWinner = result.selectionGoal === "winner";
          return (
            <motion.div
              key={player.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded px-3 py-2 text-sm"
              style={{
                background: isTied ? "rgba(245,158,11,0.15)" : isSelected ? (isWinner ? "rgba(251,191,36,0.15)" : "rgba(248,113,113,0.15)") : "transparent",
                color: isTied ? "#f59e0b" : isSelected ? (isWinner ? "#fbbf24" : "#f87171") : isShown ? "#00ff41" : "#333",
                border: isTied ? "1px solid rgba(245,158,11,0.3)" : isSelected ? `1px solid ${isWinner ? "rgba(251,191,36,0.3)" : "rgba(248,113,113,0.3)"}` : "1px solid transparent",
              }}
            >
              <span style={{ color: "#666" }}>{">"} </span>
              <span>RESULT: </span>
              <span className="font-bold">{player.name}</span>
              <span> = </span>
              <span className="text-2xl font-black" style={{ fontFamily: "'Source Code Pro', monospace" }}>
                <CyclingNumber value={player.value} active={isShown} />
              </span>
              {done && isTied ? (
                <span className="ml-3 text-xs font-bold" style={{ color: "#f59e0b" }}>
                  {"<<<"} TIED
                </span>
              ) : done && isSelected ? (
                <span className="ml-3 text-xs font-bold" style={{ color: isWinner ? "#fbbf24" : "#f87171" }}>
                  {"<<<"} {player.subline}
                </span>
              ) : isShown ? (
                <span className="ml-3 text-xs" style={{ color: "#666" }}>[locked]</span>
              ) : (
                <span className="ml-3 text-xs" style={{ color: "#333" }}>[pending]</span>
              )}
            </motion.div>
          );
        })}

        {/* Blinking cursor */}
        {!done ? (
          <motion.div
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="mt-4 text-sm"
            style={{ color: "#00ff41" }}
          >
            {">"} _
          </motion.div>
        ) : (
          <div className="mt-4 text-xs" style={{ color: "#333" }}>
            {">"} process complete. exit code 0
          </div>
        )}
      </div>
    </div>
  );
}

export function DicePlayback({ result, step, done, ModeHeader, clamp }) {
  const revealed = clamp(step, 0, result.players.length);
  return (
    <div className="overflow-hidden rounded-[2rem] shadow-xl" style={{ background: "linear-gradient(180deg, #2a1a0e 0%, #1a0f08 100%)", border: "2px solid #4a3520" }}>
      <ModeHeader result={result} done={done} pendingText="Dice are hitting the table..." pendingSummary="Lowest total ends up stuck with it." />

      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {result.players.map((player, index) => {
            const isShown = index < revealed;
            const isSelected = done && player.selected;
            const isTied = done && player.tied;
            const isWinner = result.selectionGoal === "winner";
            const hpPct = Math.round((player.total / 12) * 100);
            return (
              <motion.div
                key={player.name}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={isSelected || isTied ? { opacity: 1, x: 0, scale: [0.96, 1.03, 1] } : { opacity: 1, x: 0, scale: 1 }}
                className={isTied ? "rounded-xl p-4 pulse-tie" : "rounded-xl p-4"}
                style={{
                  background: "linear-gradient(135deg, #f5e6d0 0%, #e8d5b8 50%, #dcc8a5 100%)",
                  border: isTied
                    ? "3px solid #d97706"
                    : isSelected
                      ? isWinner ? "3px solid #b8860b" : "3px solid #8b0000"
                      : "2px solid #8b7355",
                  boxShadow: isTied
                    ? "0 0 20px rgba(217,119,6,0.4)"
                    : isSelected
                      ? isWinner ? "0 0 20px rgba(184,134,11,0.4), inset 0 0 15px rgba(184,134,11,0.1)" : "0 0 20px rgba(139,0,0,0.4)"
                      : "inset 0 0 30px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                {/* Character name */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-bold" style={{ fontFamily: "'MedievalSharp', cursive", color: "#3a2a1a" }}>{player.name}</div>
                  {isTied ? (
                    <span className="text-xs font-bold px-2 py-1 rounded" style={{
                      background: "#d97706",
                      color: "#fff",
                      fontFamily: "'MedievalSharp', cursive",
                    }}>
                      TIED
                    </span>
                  ) : isSelected ? (
                    <span className="text-xs font-bold px-2 py-1 rounded" style={{
                      background: isWinner ? "#b8860b" : "#8b0000",
                      color: "#fff",
                      fontFamily: "'MedievalSharp', cursive",
                    }}>
                      {isWinner ? "CHAMPION" : "DEFEATED"}
                    </span>
                  ) : null}
                </div>

                {/* HP Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1" style={{ color: "#5a4a3a", fontFamily: "'MedievalSharp', cursive" }}>
                    <span>Vitality</span>
                    <span>{isShown ? `${player.total}/12` : "??/12"}</span>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden" style={{ background: "#8b7355", border: "1px solid #6b5335" }}>
                    <motion.div
                      animate={{ width: isShown ? `${hpPct}%` : "100%" }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        background: isShown
                          ? hpPct > 60 ? "linear-gradient(90deg, #228b22, #32cd32)" : hpPct > 30 ? "linear-gradient(90deg, #b8860b, #daa520)" : "linear-gradient(90deg, #8b0000, #dc143c)"
                          : "linear-gradient(90deg, #666, #888)",
                      }}
                    />
                  </div>
                  {done && isSelected && !isWinner ? (
                    <div className="text-center text-xs font-bold mt-1" style={{ color: "#8b0000", fontFamily: "'MedievalSharp', cursive" }}>DEFEATED</div>
                  ) : null}
                </div>

                {/* Dice + Attack result */}
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {[player.d1, player.d2].map((value, dieIndex) => (
                      <motion.div
                        key={`${player.name}-${dieIndex}`}
                        animate={{
                          rotate: isShown ? [720, -30, 15, -5, 0] : [0, 360],
                          scale: isShown ? [0.4, 1.25, 0.9, 1.05, 1] : [1, 1.12, 1],
                        }}
                        transition={{
                          duration: isShown ? 1.6 : 0.9,
                          delay: isShown ? dieIndex * 0.35 : 0,
                          repeat: isShown ? 0 : Infinity,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="flex h-14 w-14 items-center justify-center rounded-lg text-xl font-black"
                        style={{
                          background: "linear-gradient(145deg, #f0e0c8, #d4c4a8)",
                          border: "2px solid #8b7355",
                          color: "#3a2a1a",
                          boxShadow: "2px 2px 6px rgba(0,0,0,0.2), inset 1px 1px 2px rgba(255,255,255,0.3)",
                        }}
                      >
                        {isShown ? value : "?"}
                      </motion.div>
                    ))}
                  </div>
                  {isShown ? (
                    <div className="flex-1">
                      <div className="text-lg font-bold" style={{ fontFamily: "'MedievalSharp', cursive", color: "#3a2a1a" }}>
                        {"ATK: "}{player.total}
                      </div>
                      <div className="text-xs" style={{ color: "#6b5335" }}>
                        {done ? player.subline : "Dice locked"}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 text-sm" style={{ color: "#8b7355", fontFamily: "'MedievalSharp', cursive" }}>
                      Awaiting fate...
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function HighCardPlayback({ result, step, done, ModeHeader, CardFace, clamp }) {
  const revealed = clamp(step, 0, result.players.length);
  const playerCount = result.players.length;
  return (
    <div className="overflow-hidden rounded-[2rem] shadow-xl" style={{
      background: "linear-gradient(180deg, #d4a76a 0%, #c4955a 20%, #8b6914 100%)",
      border: "3px solid #6b4e1a",
    }}>
      <ModeHeader result={result} done={done} pendingText="Cards are flipping..." pendingSummary="Lowest rank loses. Everybody watch the turn." />

      <div className="p-6 relative" style={{ minHeight: "320px" }}>
        {/* Dusty atmosphere */}
        <div className="absolute inset-0 opacity-20" style={{
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Center deck */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex flex-col items-center">
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ fontFamily: "'Rye', cursive", color: "#3a2a1a" }}>
              The Draw
            </div>
            <div className="relative">
              <div className="h-24 w-16 rounded-xl" style={{
                background: "linear-gradient(135deg, #1e3a5f, #0f2744)",
                border: "2px solid #4a3520",
                boxShadow: "3px 3px 0 #4a3520, 6px 6px 0 #3a2510, 0 0 20px rgba(0,0,0,0.3)",
              }} />
            </div>
          </div>
        </div>

        {/* Player face-off layout */}
        <div className={`grid gap-6 grid-cols-1 ${playerCount <= 2 ? "sm:grid-cols-2" : playerCount === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 md:grid-cols-4"}`}>
          {result.players.map((player, index) => {
            const isShown = index < revealed;
            const isSelected = done && player.selected;
            const isTied = done && player.tied;
            const isWinner = result.selectionGoal === "winner";
            return (
              <motion.div
                key={player.name}
                initial={{ opacity: 0, y: 20 }}
                animate={isSelected || isTied ? { opacity: 1, y: 0, scale: [0.96, 1.04, 1] } : { opacity: 1, y: 0, scale: 1 }}
                className="flex flex-col items-center text-center"
              >
                {/* Wanted poster / Star badge */}
                <div className={`rounded-lg p-4 relative ${isTied ? "pulse-tie" : ""}`} style={{
                  background: isSelected || isTied
                    ? "linear-gradient(135deg, #f5e6d0, #e8d0a8)"
                    : "linear-gradient(135deg, #f0e0c8, #dcc8a5)",
                  border: isTied ? "3px solid #d97706" : isSelected ? "3px solid #8b4513" : "2px solid #8b7355",
                  boxShadow: isTied ? "0 0 20px rgba(217,119,6,0.4)" : isSelected ? "0 0 20px rgba(139,69,19,0.4), inset 0 0 20px rgba(139,69,19,0.1)" : "2px 2px 8px rgba(0,0,0,0.3)",
                  minWidth: "120px",
                }}>
                  {isTied ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 rounded" style={{
                      background: "#d97706",
                      color: "#fff",
                      fontFamily: "'Rye', cursive",
                      letterSpacing: "0.15em",
                    }}>
                      TIED
                    </div>
                  ) : isSelected ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 rounded" style={{
                      background: "#8b4513",
                      color: "#f5e6d0",
                      fontFamily: "'Rye', cursive",
                      letterSpacing: "0.15em",
                    }}>
                      WANTED
                    </div>
                  ) : done ? (
                    <div className="absolute -top-2 -right-2 text-lg">{"\u2B50"}</div>
                  ) : null}

                  <div className="text-base font-bold mb-3" style={{ fontFamily: "'Rye', cursive", color: "#3a2a1a" }}>
                    {player.name}
                  </div>

                  <div className="flex justify-center mb-3">
                    {isShown ? <CardFace card={player.card} hidden={false} large deal dealIndex={0} /> : <div className="h-24 w-16 rounded-lg border-2 border-dashed border-amber-900/20 flex items-center justify-center text-amber-900/30 text-lg">?</div>}
                  </div>

                  <div className="text-xs" style={{ color: "#6b5335", fontFamily: "'Rye', cursive" }}>
                    {done ? player.subline : isShown ? "Card drawn" : "Hand on holster..."}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* VS separators for 2-player */}
        {playerCount === 2 ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-4 text-2xl font-black" style={{ fontFamily: "'Rye', cursive", color: "#3a2a1a", textShadow: "1px 1px 0 rgba(255,255,255,0.3)", opacity: 0.6 }}>
            VS
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CoinPlayback({ result, step, done, ModeHeader, clamp }) {
  const playerCount = result.players.length;
  const currentPlayerIndex = Math.min(Math.floor(step / 5), playerCount - 1);
  const currentFlipInPlayer = step - currentPlayerIndex * 5;

  function getFlipsShown(playerIdx) {
    if (done) return 5;
    if (playerIdx < currentPlayerIndex) return 5;
    if (playerIdx === currentPlayerIndex) return clamp(currentFlipInPlayer, 0, 5);
    return 0;
  }

  const activePlayerName = currentPlayerIndex < playerCount ? result.players[currentPlayerIndex]?.name : null;
  const roundsShown = done ? 5 : clamp(currentFlipInPlayer, 0, 5);
  return (
    <div className="overflow-hidden rounded-[2rem] shadow-xl" style={{
      background: "linear-gradient(180deg, #1a2a3a 0%, #0a1520 100%)",
      border: "2px solid #3a5a7a",
    }}>
      <ModeHeader result={result} done={done} pendingText={activePlayerName ? `${activePlayerName}'s flip ${Math.max(1, roundsShown)} of 5...` : "Flipping..."} pendingSummary="Five flips each. Fewest heads is doomed." />

      <div className="p-6">
        {/* Pirate header */}
        <div className="text-center mb-6">
          <div className="text-lg font-bold" style={{ fontFamily: "'Pirata One', cursive", color: "#d4a76a" }}>
            The Treasure Path
          </div>
          <div className="text-xs" style={{ color: "#6a8aaa" }}>Five coins on the trail to fortune...</div>
        </div>

        {/* Player paths */}
        <div className="space-y-6">
          {result.players.map((player, pIdx) => {
            const isSelected = done && player.selected;
            const isTied = done && player.tied;
            const isWinner = result.selectionGoal === "winner";
            const playerFlipsShown = getFlipsShown(pIdx);
            const isActivePlayer = pIdx === currentPlayerIndex && !done;
            return (
              <div key={player.name} className={`rounded-xl p-4 transition-all duration-300 ${isTied ? "pulse-tie" : ""}`} style={{
                background: isTied
                  ? "rgba(245,158,11,0.15)"
                  : isSelected
                    ? isWinner ? "rgba(184,134,11,0.15)" : "rgba(139,0,0,0.15)"
                    : isActivePlayer ? "rgba(212,167,106,0.1)" : "rgba(255,255,255,0.04)",
                border: isTied
                  ? "2px solid rgba(245,158,11,0.4)"
                  : isSelected
                    ? isWinner ? "2px solid rgba(184,134,11,0.4)" : "2px solid rgba(139,0,0,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
              }}>
                {/* Player name */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold" style={{ fontFamily: "'Pirata One', cursive", color: "#d4a76a" }}>{player.name}</div>
                  {done ? (
                    <div className="text-xs font-bold" style={{
                      fontFamily: "'Pirata One', cursive",
                      color: isTied ? "#f59e0b" : isSelected ? (isWinner ? "#fbbf24" : "#f87171") : "#6a8aaa",
                    }}>
                      {isTied ? "TIED" : `${player.heads} heads`}
                    </div>
                  ) : null}
                </div>

                {/* Winding path with waypoints */}
                <div className="coin-path-row relative flex items-center justify-between" style={{ height: "80px" }}>
                  {/* Path line */}
                  <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
                    <path
                      d={`M 10 40 Q ${80/5 * 1.5} 15, ${80/5 * 2} 40 T ${80/5 * 4} 40 T ${80/5 * 6} 40 T ${80/5 * 8} 40 T ${80/5 * 10} 40`}
                      fill="none"
                      stroke="rgba(212,167,106,0.2)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      style={{ transform: "scale(1)", transformOrigin: "center" }}
                    />
                  </svg>

                  {player.flips.map((flip, index) => {
                    const shown = index < playerFlipsShown;
                    const isHeads = flip === "H";
                    const yOffset = index % 2 === 0 ? -8 : 8;
                    return (
                      <motion.div
                        key={`${player.name}-${index}`}
                        animate={{
                          rotateY: shown ? [0, 360, 720, 1080, 0] : [0, 180, 0],
                          scale: shown ? [1, 0.7, 1, 0.7, 1.15, 1] : 1,
                          y: yOffset,
                        }}
                        transition={{ duration: shown ? 1.6 : 0.8, repeat: shown ? 0 : Infinity, ease: [0.22, 1, 0.36, 1] }}
                        className="coin-token relative z-10 flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          background: shown
                            ? isHeads
                              ? "radial-gradient(circle at 35% 35%, #fde68a, #d4a76a, #b8860b)"
                              : "radial-gradient(circle at 35% 35%, #e2e8f0, #94a3b8, #64748b)"
                            : "radial-gradient(circle, #334155, #1e293b)",
                          border: shown
                            ? isHeads ? "2px solid #b8860b" : "2px solid #64748b"
                            : "2px solid #475569",
                          color: shown
                            ? isHeads ? "#3a2a1a" : "#1e293b"
                            : "#475569",
                          boxShadow: shown && isHeads ? "0 0 12px rgba(184,134,11,0.4)" : "none",
                        }}
                      >
                        {shown ? flip : "?"}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Result text */}
                {done ? (
                  <div className="mt-2 text-center text-xs font-bold" style={{
                    fontFamily: "'Pirata One', cursive",
                    color: isSelected ? (isWinner ? "#fbbf24" : "#f87171") : "#6a8aaa",
                  }}>
                    {isSelected
                      ? isWinner ? "CLAIMED THE TREASURE" : "WALKED THE PLANK"
                      : player.subline
                    }
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MarblePlayback({ result, step, done, ModeHeader, clamp }) {
  const revealed = clamp(step, 0, result.players.length);
  const playerCount = result.players.length;

  return (
    <div className="overflow-hidden rounded-[2rem] shadow-xl" style={{
      background: "radial-gradient(ellipse at center, #1a1a3e 0%, #0a0a1e 60%, #050510 100%)",
      border: "1px solid rgba(139,92,246,0.3)",
    }}>
      <ModeHeader result={result} done={done} pendingText="The bag is opening..." pendingSummary="Safe marbles first... until somebody hits the black one." />

      <div className="p-6 relative" style={{ minHeight: "400px" }}>
        {/* Starfield dots */}
        {Array.from({ length: 20 }, (_, i) => (
          <div key={`star-${i}`} className="absolute rounded-full" style={{
            width: "2px",
            height: "2px",
            background: "rgba(255,255,255,0.3)",
            left: `${5 + (i * 47) % 90}%`,
            top: `${10 + (i * 31) % 80}%`,
            animation: `twinkle${(i % 3) + 1} ${2 + (i % 3)}s ease-in-out infinite`,
          }} />
        ))}

        {/* Central marble bag */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-20 w-20 items-center justify-center rounded-full text-3xl"
            style={{
              background: "radial-gradient(circle at 35% 35%, #4a3a6a, #2a1a4a, #1a0a3a)",
              border: "2px solid rgba(139,92,246,0.4)",
              boxShadow: "0 0 30px rgba(139,92,246,0.2), inset 0 0 15px rgba(0,0,0,0.5)",
            }}
          >
            {"\uD83D\uDD2E"}
          </motion.div>
          <div className="mt-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(139,92,246,0.6)", fontFamily: "'Cinzel Decorative', cursive" }}>
            The Vessel
          </div>
        </div>

        {/* Players in circle layout with constellation lines */}
        <div className="relative mx-auto" style={{ maxWidth: "500px" }}>
          {/* Constellation connecting lines */}
          <svg className="absolute inset-0 w-full h-full hidden sm:block" style={{ pointerEvents: "none" }}>
            {result.players.map((_, index) => {
              const nextIndex = (index + 1) % playerCount;
              const angle1 = (index / playerCount) * Math.PI * 2 - Math.PI / 2;
              const angle2 = (nextIndex / playerCount) * Math.PI * 2 - Math.PI / 2;
              const cx = 50, cy = 50, r = 38;
              return (
                <line
                  key={`line-${index}`}
                  x1={`${cx + Math.cos(angle1) * r}%`}
                  y1={`${cy + Math.sin(angle1) * r}%`}
                  x2={`${cx + Math.cos(angle2) * r}%`}
                  y2={`${cy + Math.sin(angle2) * r}%`}
                  stroke="rgba(139,92,246,0.15)"
                  strokeWidth="1"
                  strokeDasharray="3 6"
                />
              );
            })}
            {/* Node dots on constellation */}
            {result.players.map((_, index) => {
              const angle = (index / playerCount) * Math.PI * 2 - Math.PI / 2;
              const cx = 50, cy = 50, r = 38;
              return (
                <circle
                  key={`node-${index}`}
                  cx={`${cx + Math.cos(angle) * r}%`}
                  cy={`${cy + Math.sin(angle) * r}%`}
                  r="3"
                  fill="rgba(139,92,246,0.4)"
                />
              );
            })}
          </svg>

          {/* Player nodes */}
          <div className={`grid gap-4 grid-cols-1 ${playerCount <= 2 ? "sm:grid-cols-2" : playerCount === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 md:grid-cols-4"}`}>
            {result.players.map((player, index) => {
              const isShown = index < revealed;
              const isBlack = player.marble === "Black";
              const isSelected = done && player.selected;
              const isWinner = result.selectionGoal === "winner";
              return (
                <motion.div
                  key={player.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isShown && isBlack ? { opacity: 1, scale: 1, rotate: [0, -4, 4, -3, 3, -1, 0] } : { opacity: 1, scale: 1 }}
                  transition={{ duration: isShown && isBlack ? 1.2 : 0.5 }}
                  className="flex flex-col items-center text-center p-3 rounded-xl"
                  style={{
                    background: isSelected
                      ? isWinner ? "rgba(139,92,246,0.15)" : "rgba(239,68,68,0.1)"
                      : "rgba(255,255,255,0.03)",
                    border: isSelected
                      ? isWinner ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(239,68,68,0.3)"
                      : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="text-sm font-semibold mb-1" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "'Cinzel Decorative', cursive", fontSize: "12px" }}>{player.name}</div>
                  <div className="text-[10px] mb-2" style={{ color: "rgba(139,92,246,0.5)" }}>Draw #{index + 1}</div>

                  {/* Marble */}
                  <motion.div
                    animate={{
                      scale: isShown ? (isBlack ? [0.3, 1.4, 0.8, 1.15, 0.95, 1] : [0.84, 1.12, 1]) : [1, 1.12, 1],
                      opacity: isShown ? [0.45, 1] : [0.45, 1, 0.45],
                    }}
                    transition={{ duration: isShown ? (1.2 + index * 0.4) : 0.9, repeat: isShown ? 0 : Infinity, ease: [0.22, 1, 0.36, 1] }}
                    className="flex h-16 w-16 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: isShown
                        ? isBlack
                          ? "radial-gradient(circle at 35% 35%, #4a4a5a, #1a1a2a, #050510)"
                          : "radial-gradient(circle at 35% 35%, #e0e7ff, #a5b4fc, #6366f1)"
                        : "radial-gradient(circle at 35% 35%, #2a2a3e, #1a1a2e)",
                      border: isShown
                        ? isBlack ? "3px solid rgba(255,255,255,0.2)" : "2px solid rgba(139,92,246,0.4)"
                        : "2px solid rgba(139,92,246,0.15)",
                      color: isShown
                        ? isBlack ? "rgba(255,255,255,0.8)" : "#1a1a3e"
                        : "rgba(139,92,246,0.3)",
                      boxShadow: isShown && isBlack ? "0 0 20px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.3)" : isShown ? "0 0 15px rgba(139,92,246,0.2)" : "none",
                    }}
                  >
                    {isShown ? player.marble : "?"}
                  </motion.div>

                  <div className="mt-2 text-[11px]" style={{ color: "rgba(139,92,246,0.6)", fontFamily: "'Cinzel Decorative', cursive" }}>
                    {done ? player.subline : isShown ? "Revealed" : "Awaiting fate"}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Verdict */}
        {done ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-6"
          >
            <div className="text-lg font-bold" style={{ fontFamily: "'Cinzel Decorative', cursive", color: "#a78bfa", textShadow: "0 0 20px rgba(139,92,246,0.4)" }}>
              THE FATES HAVE CHOSEN
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

export function SlotsPlayback({ result, step, done, ModeHeader, CyclingSlot, clamp }) {
  const revealed = clamp(step, 0, result.players.length);
  return (
    <div className="overflow-hidden rounded-[2rem] shadow-xl" style={{
      background: "linear-gradient(180deg, #1a0a2e 0%, #0a0018 100%)",
      border: "3px solid transparent",
      backgroundClip: "padding-box",
      position: "relative",
    }}>
      {/* Chrome bezel border */}
      <div className="absolute inset-0 rounded-[2rem] -z-10" style={{
        background: "linear-gradient(135deg, #888 0%, #ccc 20%, #666 40%, #ddd 60%, #888 80%, #aaa 100%)",
        margin: "-3px",
        borderRadius: "calc(2rem + 3px)",
      }} />

      <ModeHeader result={result} done={done} pendingText="Casino chaos loading..." pendingSummary="Best combo is safe. Worst score gets the chore." />

      <div className="p-6" style={{ background: "radial-gradient(ellipse at top, rgba(236,72,153,0.08) 0%, transparent 60%)" }}>
        {/* Vegas header */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-3xl font-bold"
            style={{
              fontFamily: "'Monoton', cursive",
              color: "#ec4899",
              textShadow: "0 0 20px rgba(236,72,153,0.5), 0 0 40px rgba(236,72,153,0.3)",
            }}
          >
            {done ? (result.isTie ? "TIE" : result.players.find((p) => p.selected)?.selected && result.selectionGoal === "winner" ? "JACKPOT" : "BUST") : "SLOTS"}
          </motion.div>
        </div>

        {/* Slot machines per player */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {result.players.map((player, index) => {
            const isShown = index < revealed;
            const isSelected = done && player.selected;
            const isTied = done && player.tied;
            const isWinner = result.selectionGoal === "winner";
            return (
              <motion.div
                key={player.name}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={isSelected || isTied ? { opacity: 1, scale: [0.96, 1.03, 1] } : { opacity: 1, scale: 1 }}
                className={`rounded-xl overflow-hidden ${isTied ? "pulse-tie" : ""}`}
                style={{
                  background: "linear-gradient(180deg, #2a1a3e, #1a0a2e)",
                  border: isTied
                    ? "2px solid #f59e0b"
                    : isSelected
                      ? isWinner ? "2px solid #fbbf24" : "2px solid #f87171"
                      : "2px solid rgba(236,72,153,0.2)",
                  boxShadow: isTied
                    ? "0 0 30px rgba(245,158,11,0.3)"
                    : isSelected
                      ? isWinner ? "0 0 30px rgba(251,191,36,0.3)" : "0 0 30px rgba(248,113,113,0.3)"
                      : "0 4px 20px rgba(0,0,0,0.4)",
                }}
              >
                {/* Player name bar */}
                <div className="px-4 py-2 flex items-center justify-between" style={{
                  background: "linear-gradient(90deg, rgba(236,72,153,0.15), rgba(139,92,246,0.15))",
                  borderBottom: "1px solid rgba(236,72,153,0.15)",
                }}>
                  <div className="text-sm font-bold" style={{ color: "#e2e8f0" }}>{player.name}</div>
                  <div className="text-xs font-semibold" style={{ color: isTied ? "#f59e0b" : isSelected ? (isWinner ? "#fbbf24" : "#f87171") : "#a78bfa" }}>
                    {done ? (isTied ? "TIED" : player.score.label) : isShown ? "STOPPED" : "SPINNING"}
                  </div>
                </div>

                {/* Reel display */}
                <div className="p-4 flex justify-center">
                  <div className="flex gap-1 p-2 rounded-xl" style={{
                    background: "linear-gradient(180deg, #0a0018, #1a0a2e, #0a0018)",
                    border: "2px solid",
                    borderImage: "linear-gradient(180deg, #888, #444, #888) 1",
                  }}>
                    {player.reels.map((symbol, reelIndex) => (
                      <motion.div
                        key={`${player.name}-${reelIndex}`}
                        animate={{ y: isShown ? [28, -8, 4, 0] : [0, -12, 12, 0], scale: isShown ? [0.86, 1.08, 1] : 1, opacity: isShown ? [0.45, 1] : [1, 0.45, 1] }}
                        transition={{ duration: isShown ? 1 : 0.75, delay: isShown ? reelIndex * 0.3 : 0, repeat: isShown ? 0 : Infinity, ease: [0.22, 1, 0.36, 1] }}
                        className="slots-reel-cell flex h-20 w-20 items-center justify-center text-4xl"
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          borderLeft: reelIndex > 0 ? "1px solid rgba(236,72,153,0.1)" : "none",
                        }}
                      >
                        {isShown ? symbol : <CyclingSlot symbol={symbol} active={isShown} delay={reelIndex * 300} />}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Credits display */}
                <div className="px-4 pb-3 flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(236,72,153,0.5)" }}>Credits</div>
                  <div className="text-lg font-black" style={{
                    fontFamily: "'Monoton', cursive",
                    color: isSelected ? (isWinner ? "#fbbf24" : "#f87171") : "#ec4899",
                    textShadow: isSelected ? `0 0 10px ${isWinner ? "rgba(251,191,36,0.5)" : "rgba(248,113,113,0.5)"}` : "none",
                    fontSize: "14px",
                  }}>
                    {done ? player.subline : isShown ? "LOCKED" : "---"}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function HorseRacePlayback({ result, step, done, ModeHeader, clamp, HORSE_EMOJIS }) {
  const turnsShown = clamp(step, 0, result.turns.length);
  const latestPositions = turnsShown > 0 ? result.turns[turnsShown - 1].positions : Object.fromEntries(result.players.map((player) => [player.name, 0]));
  const latestTurn = turnsShown > 0 ? result.turns[turnsShown - 1] : null;

  const laneColors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];
  const raceCallTexts = [
    "AND THEY'RE OFF!",
    "ROUNDING THE BEND...",
    "NECK AND NECK!",
    "AND DOWN THE STRETCH...",
    "HERE THEY COME!",
    "WHAT A RACE!",
    "PHOTO FINISH!",
  ];
  const raceCallIndex = done ? 6 : turnsShown > 0 ? Math.min(Math.floor((turnsShown / result.turns.length) * 6), 5) : 0;

  // Sort players by position for standings
  const sortedPlayers = done
    ? [...result.players].sort((a, b) => (latestPositions[b.name] ?? 0) - (latestPositions[a.name] ?? 0))
    : result.players;
  const placeSuffixes = ["1st", "2nd", "3rd", "4th", "5th", "6th"];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[2rem] shadow-xl" style={{
        background: "linear-gradient(180deg, #1a4a2a 0%, #0d3018 60%, #081a0e 100%)",
        border: "2px solid #2a5a3a",
      }}>
        <ModeHeader result={result} done={done} pendingText={latestTurn ? latestTurn.text : "The gates are opening..."} pendingSummary={`Turn ${Math.max(turnsShown, 0)} of ${result.turns.length}`} />

        <div className="p-4 space-y-2">
          {result.players.map((player, index) => {
            const progress = latestPositions[player.name] ?? 0;
            const pct = result.race.max > 0 ? Math.min((progress / result.race.max) * 85, 85) : 0;
            const finalSelected = done && player.selected;
            const isTied = done && player.tied;
            const justMoved = latestTurn?.mover === player.name;
            const isWinner = result.selectionGoal === "winner";
            const laneColor = laneColors[index % laneColors.length];
            return (
              <div key={player.name} className={`rounded-xl overflow-hidden ${isTied ? "pulse-tie" : ""}`} style={{
                border: isTied
                  ? "2px solid #f59e0b"
                  : finalSelected
                    ? isWinner ? "2px solid #fbbf24" : "2px solid #f87171"
                    : "1px solid rgba(255,255,255,0.1)",
                boxShadow: isTied
                  ? "0 0 15px rgba(245,158,11,0.3)"
                  : finalSelected
                    ? isWinner ? "0 0 15px rgba(251,191,36,0.3)" : "0 0 15px rgba(248,113,113,0.3)"
                    : "none",
              }}>
                {/* Lane label */}
                <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <div className="h-3 w-3 rounded-full" style={{ background: laneColor }} />
                  <div className="text-xs font-bold" style={{ color: "#e2e8f0" }}>{player.name}</div>
                  <div className="flex-1" />
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {done ? player.subline : `${progress} spaces`}
                  </div>
                </div>

                {/* Race lane */}
                <div className="horse-race-lane relative h-12" style={{ background: `linear-gradient(90deg, ${laneColor}15, ${laneColor}08)` }}>
                  {/* Lane lines */}
                  <div className="absolute inset-0" style={{
                    background: "repeating-linear-gradient(90deg, transparent 0px, transparent 58px, rgba(255,255,255,0.05) 58px, rgba(255,255,255,0.05) 60px)",
                    pointerEvents: "none",
                  }} />

                  {/* Finish line - checkered pattern on the right */}
                  <div className="absolute right-0 top-0 bottom-0 w-8" style={{
                    background: `repeating-conic-gradient(#fff 0% 25%, #111 0% 50%) 0 0 / 8px 8px`,
                    opacity: 0.6,
                  }} />

                  {/* Horse */}
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 text-2xl"
                    style={{ left: "4px" }}
                    animate={{ x: `${pct * 3}px`, y: justMoved ? [0, -8, 0, -4, 0] : 0, scale: justMoved ? [1, 1.2, 1] : 1 }}
                    transition={{ type: "spring", stiffness: 70, damping: 14, mass: 1.25 }}
                  >
                    {HORSE_EMOJIS[index % HORSE_EMOJIS.length]}
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Race call ticker */}
        <div className="px-4 py-3" style={{ background: "rgba(0,0,0,0.4)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <motion.div
            key={raceCallIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center text-sm font-bold break-words"
            style={{ fontFamily: "'Press Start 2P', monospace", color: "#fbbf24", fontSize: "10px", letterSpacing: "0.1em", wordBreak: "break-word" }}
          >
            {raceCallTexts[raceCallIndex]}
          </motion.div>
        </div>
      </div>

      {/* Standings / Scoreboard */}
      {done ? (
        <div className="rounded-2xl overflow-hidden shadow-lg" style={{
          background: "#111",
          border: "2px solid #333",
        }}>
          <div className="px-4 py-2 text-center" style={{ background: "#222", borderBottom: "1px solid #333" }}>
            <div className="text-xs font-bold" style={{ fontFamily: "'Press Start 2P', monospace", color: "#fbbf24", fontSize: "10px" }}>
              FINAL STANDINGS
            </div>
          </div>
          <div className="p-3 space-y-1">
            {sortedPlayers.map((player, index) => {
              const isSelected = player.selected;
              const isTied = player.tied;
              const isWinner = result.selectionGoal === "winner";
              return (
                <div key={player.name} className="flex items-center gap-3 px-3 py-2 rounded" style={{
                  background: isTied ? "rgba(245,158,11,0.15)" : isSelected ? (isWinner ? "rgba(251,191,36,0.15)" : "rgba(248,113,113,0.15)") : "transparent",
                }}>
                  <div className="text-xs font-bold w-8" style={{
                    fontFamily: "'Press Start 2P', monospace",
                    color: index === 0 ? "#fbbf24" : index === 1 ? "#c0c0c0" : index === 2 ? "#cd7f32" : "#666",
                    fontSize: "10px",
                  }}>
                    {placeSuffixes[index] || `${index + 1}th`}
                  </div>
                  <div className="flex-1 text-xs font-bold" style={{
                    fontFamily: "'Press Start 2P', monospace",
                    color: isTied ? "#f59e0b" : isSelected ? (isWinner ? "#fbbf24" : "#f87171") : "#aaa",
                    fontSize: "9px",
                  }}>
                    {player.name} {isTied ? "(TIED)" : ""}
                  </div>
                  <div className="text-xs" style={{ color: "#666", fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}>
                    {latestPositions[player.name] ?? 0} SPC
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-4 shadow-lg" style={{ background: "#111", border: "1px solid #333" }}>
          <div className="mb-3 text-xs font-bold" style={{ fontFamily: "'Press Start 2P', monospace", color: "#fbbf24", fontSize: "10px" }}>RACE LOG</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {result.turns.slice(0, turnsShown).map((turn) => (
              <div key={turn.turn} className="text-xs px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.03)", color: "#888", fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}>
                {turn.text}
              </div>
            ))}
            {!turnsShown ? <div className="text-xs" style={{ color: "#555", fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}>Waiting for the starting gun...</div> : null}
          </div>
        </div>
      )}
    </div>
  );
}
