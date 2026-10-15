import React from 'react';
import { motion } from 'framer-motion';

export function PokerPlayback({ result, step, done, omaha = false, Celebration, SadOverlay, VerdictReveal, CardFace, clamp, cardKey, getCurrentHoldemHandLabel, getCurrentPloHandLabel }) {
  if (result.draftPhase) {
    const draftSubmissions = (typeof window !== 'undefined' && window.__draftChoices) || {};
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-white/60 shadow-xl backdrop-blur" style={{ background: "radial-gradient(ellipse, #1a472a 0%, #0d2818 60%, #091a10 100%)" }}>
          <div className="mode-header-bg relative overflow-hidden px-6 py-5 text-white" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.3))" }}>
            <div className="relative z-10">
              <div className="text-sm font-semibold uppercase tracking-[0.25em]" style={{ color: "#4ade80", fontFamily: "var(--mode-font, inherit)" }}>{result.modeName}</div>
              <div className="mt-2 text-2xl font-black tracking-tight sm:text-3xl" style={{ color: "#e2e8f0" }}>Players are drafting their cards...</div>
              <div className="mt-2 max-w-2xl text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                Each player picks {result.keepCount} hole cards from {result.keepCount === 2 ? "4" : "6"} options.
              </div>
            </div>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="pixel-font text-xl text-indigo-300 animate-pulse mb-4">{'\uD83C\uDCCF'} DRAFT IN PROGRESS {'\uD83C\uDCCF'}</div>
          <div className="font-mono text-sm text-slate-500 mb-4">Waiting for all players to lock in...</div>
          <div className="flex flex-wrap justify-center gap-2">
            {Object.keys(result.draftHands).map(name => {
              const submitted = draftSubmissions[name];
              return (
                <div key={name} className={`px-3 py-1.5 rounded-lg font-mono text-xs ${submitted ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-500 animate-pulse'}`}>
                  {name} {submitted ? '\u2713' : '...'}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const playerCount = result.players.length;
  const playerRevealCount = clamp(step, 0, playerCount);
  const flopVisible = step >= playerCount + 1;
  const turnVisible = step >= playerCount + 2;
  const riverVisible = step >= playerCount + 3;
  const verdictVisible = done;
  const visibleBoard = result.board.filter((_, index) => {
    if (index <= 2) return flopVisible;
    if (index === 3) return turnVisible;
    return riverVisible;
  });
  const stageKey = step >= playerCount + 3 ? "river" : step >= playerCount + 2 ? "turn" : step >= playerCount + 1 ? "flop" : step >= playerCount ? "preflop" : null;
  const currentPercentages = stageKey ? result.pokerPercentages?.[stageKey] : null;
  const chanceLabel = result.selectionGoal === "winner" ? "Win chance" : "Picked chance";
  const streetLabel = stageKey ? `${stageKey.charAt(0).toUpperCase()}${stageKey.slice(1)}` : "Waiting";

  const playerPositions2 = [
    { top: "0%", left: "50%", transform: "translateX(-50%)" },
    { bottom: "0%", left: "50%", transform: "translateX(-50%)" },
  ];
  const playerPositions3 = [
    { top: "0%", left: "50%", transform: "translateX(-50%)" },
    { bottom: "8%", left: "8%" },
    { bottom: "8%", right: "8%" },
  ];
  const playerPositions4 = [
    { top: "0%", left: "25%", transform: "translateX(-50%)" },
    { top: "0%", right: "25%", transform: "translateX(50%)" },
    { bottom: "0%", left: "25%", transform: "translateX(-50%)" },
    { bottom: "0%", right: "25%", transform: "translateX(50%)" },
  ];
  const positionsMap = playerCount <= 2 ? playerPositions2 : playerCount === 3 ? playerPositions3 : playerPositions4;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="overflow-hidden rounded-[2rem] border border-white/60 shadow-xl backdrop-blur" style={{ background: "radial-gradient(ellipse, #1a472a 0%, #0d2818 60%, #091a10 100%)" }}>
        <div className="mode-header-bg relative overflow-hidden px-6 py-5 text-white" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.3))" }}>
          {verdictVisible && result.selectionGoal === "winner" ? <Celebration /> : null}
          {verdictVisible && result.selectionGoal === "loser" ? <SadOverlay /> : null}
          <div className="relative z-10">
            <div className="text-sm font-semibold uppercase tracking-[0.25em]" style={{ color: "#4ade80", fontFamily: "var(--mode-font, inherit)" }}>{result.modeName}</div>
            {verdictVisible
              ? <VerdictReveal text={result.headline} isWinner={result.selectionGoal === "winner"} />
              : <div className="mt-2 text-2xl font-black tracking-tight sm:text-3xl" style={{ color: "#e2e8f0" }}>{omaha ? "Omaha cards are hitting the table..." : "The Hold'em hand is building..."}</div>
            }
            <div className="mt-2 max-w-2xl text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
              {verdictVisible ? result.summary : `Hole cards reveal first, then flop, turn, river, and live ${chanceLabel.toLowerCase()} updates.`}
            </div>
          </div>
        </div>

        {/* Stage label */}
        <div className="flex flex-wrap items-center justify-center gap-2 px-2 py-3 sm:gap-4 sm:px-0" style={{ background: "rgba(0,0,0,0.4)", borderTop: "1px solid rgba(74,222,128,0.15)", borderBottom: "1px solid rgba(74,222,128,0.15)" }}>
          {["PREFLOP", "FLOP", "TURN", "RIVER", "SHOWDOWN"].map((label) => {
            const activeStage = verdictVisible ? "SHOWDOWN" : streetLabel.toUpperCase();
            const isActive = label === activeStage;
            return (
              <div key={label} className="text-[10px] font-bold tracking-[0.1em] sm:text-xs sm:tracking-[0.2em]" style={{
                fontFamily: "var(--mode-font, inherit)",
                color: isActive ? "#4ade80" : "rgba(255,255,255,0.25)",
                textShadow: isActive ? "0 0 12px rgba(74,222,128,0.6)" : "none",
              }}>
                {label}
              </div>
            );
          })}
        </div>

        {/* Poker table */}
        <div className="relative mx-auto my-8 px-4" style={{ maxWidth: "760px" }}>
          {/* Felt table */}
          <div className="poker-table-felt relative mx-auto overflow-hidden" style={{
            borderRadius: "50%/40%",
            background: "radial-gradient(ellipse, #1e5c34 0%, #145028 40%, #0d3a1c 70%, #092a14 100%)",
            border: "6px solid #3a2a1a",
            boxShadow: "0 0 0 3px #5a4a3a, 0 0 40px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.3)",
            aspectRatio: "2/1.1",
            minHeight: "240px",
          }}>
            {/* Rail texture */}
            <div className="absolute inset-0" style={{
              borderRadius: "50%/40%",
              boxShadow: "inset 0 0 0 12px rgba(30,92,52,0.4), inset 0 0 0 14px rgba(0,0,0,0.2)",
              pointerEvents: "none",
            }} />

            {/* Community cards in center */}
            <div className="poker-community-cards absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-10">
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                {result.board.map((card, index) => {
                  const shown = visibleBoard.includes(card);
                  const staggerDelay = index <= 2 ? index * 0.45 : 0;
                  if (!shown) return <div key={cardKey(card)} className="h-24 w-16 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center text-white/10 text-lg">?</div>;
                  return <CardFace key={cardKey(card)} card={card} hidden={false} large delay={staggerDelay} deal dealIndex={index <= 2 ? index : 0} />;
                })}
              </div>
              {currentPercentages ? (
                <div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(0,0,0,0.5)", color: "#4ade80", fontFamily: "var(--mode-font, inherit)" }}>
                  {streetLabel} {currentPercentages.method}
                </div>
              ) : null}
            </div>
          </div>

          {/* Players around the table */}
          <div className="poker-players-grid relative" style={{ marginTop: "-20px" }}>
            <div className={`grid gap-4 grid-cols-1 ${playerCount <= 2 ? "sm:grid-cols-2" : playerCount === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
              {result.players.map((player, index) => {
                const revealed = index < playerRevealCount;
                const isSelected = verdictVisible && player.selected;
                const isTied = verdictVisible && player.tied;
                const isWinner = result.selectionGoal === "winner";
                return (
                  <motion.div
                    key={player.name}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={isSelected || isTied ? { opacity: 1, y: 0, scale: [0.96, 1.04, 1] } : { opacity: 1, y: 0, scale: 1 }}
                    className={`rounded-2xl p-3 text-center ${isTied ? "pulse-tie" : ""}`}
                    style={{
                      background: isTied
                        ? "rgba(245,158,11,0.2)"
                        : isSelected
                          ? isWinner ? "rgba(234,179,8,0.2)" : "rgba(239,68,68,0.2)"
                          : "rgba(0,0,0,0.35)",
                      border: isTied
                        ? "2px solid rgba(245,158,11,0.6)"
                        : isSelected
                          ? isWinner ? "2px solid rgba(234,179,8,0.6)" : "2px solid rgba(239,68,68,0.6)"
                          : "1px solid rgba(74,222,128,0.15)",
                      boxShadow: isTied
                        ? "0 0 20px rgba(245,158,11,0.3)"
                        : isSelected
                          ? isWinner ? "0 0 20px rgba(234,179,8,0.3)" : "0 0 20px rgba(239,68,68,0.3)"
                          : "none",
                    }}
                  >
                    <div className="text-sm font-bold" style={{ color: "#e2e8f0" }}>{player.name}</div>
                    <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {verdictVisible
                        ? player.subline
                        : revealed
                          ? stageKey === "preflop"
                            ? omaha ? "Waiting for the flop" : "Current preflop hand"
                            : stageKey ? `Current ${stageKey} hand` : "Cards revealed"
                          : "Cards still face down"
                      }
                    </div>
                    <div className={`flex justify-center gap-1.5 mt-2 ${omaha ? "flex-wrap" : ""}`} style={omaha ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", justifyItems: "center" } : {}}>
                      {revealed ? player.cards.map((card, cardIndex) => (
                        <CardFace key={`${player.name}-${cardIndex}-${cardKey(card)}`} card={card} hidden={false} deal dealIndex={cardIndex} />
                      )) : <div className="h-10 flex items-center justify-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>🂠 🂠{omaha ? " 🂠 🂠" : ""}</div>}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1 mt-2">
                      {player.chips.map((chip) => (
                        <span key={chip} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(74,222,128,0.12)", color: "#86efac" }}>
                          {chip}
                        </span>
                      ))}
                    </div>
                    {revealed && currentPercentages ? (
                      <div className="mt-2 rounded-xl px-2 py-1.5" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(74,222,128,0.2)" }}>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "rgba(74,222,128,0.6)" }}>{chanceLabel}</div>
                        <div className="text-xl font-black" style={{ color: "#4ade80", fontFamily: "var(--mode-font, inherit)" }}>{currentPercentages.byPlayer[player.name]}%</div>
                      </div>
                    ) : null}
                    {verdictVisible ? (
                      <div className="mt-1 text-xs font-bold" style={{ color: isSelected ? (isWinner ? "#fbbf24" : "#f87171") : "#86efac", fontFamily: "var(--mode-font, inherit)" }}>
                        {player.headline}
                      </div>
                    ) : revealed ? (
                      <div className="mt-1 text-xs font-semibold" style={{ color: "#86efac", fontFamily: "var(--mode-font, inherit)" }}>
                        {omaha ? getCurrentPloHandLabel(player.cards, visibleBoard) : getCurrentHoldemHandLabel(player.cards, visibleBoard)}
                      </div>
                    ) : null}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TournamentPlayback({ result, step, done, PlaybackStage, getTournamentProgress }) {
  // Picking a loser: each round's winner is safe and drops out. Picking a winner: each round's loser is out.
  const progress = getTournamentProgress(result, step);
  const hunt = result.selectionGoal === "winner";
  const finalName = result.finalName || result.finalLoser || result.champion;
  const verb = hunt ? "OUT" : "SAFE";
  const currentRound = result.rounds[Math.max(progress.roundIndex, 0)];
  const settled = result.rounds.slice(0, progress.phase === "summary" ? progress.roundIndex + 1 : progress.roundIndex);

  const ladder = (
    <div className="tourney-ladder">
      {result.rounds.map((round, index) => {
        const active = index === progress.roundIndex && !done;
        const complete = done || index < progress.roundIndex || (index === progress.roundIndex && progress.phase === "summary");
        return (
          <div key={`${round.roundLabel}-${index}`} className={`tourney-rung ${active ? "is-active" : ""} ${complete ? (hunt ? "is-out" : "is-safe") : ""}`}>
            <span className="tourney-rung-n">R{index + 1}</span>
            <span className="tourney-rung-who">{complete ? (round.selectedName || "TIE") : active ? `${round.remainingAtStart.length} PLAYING` : "-"}</span>
            {complete && round.selectedName ? <span className="tourney-rung-tag">{verb}</span> : null}
          </div>
        );
      })}
      <div className={`tourney-rung is-final ${done ? "is-done" : ""}`}>
        <span className="tourney-rung-n">END</span>
        <span className="tourney-rung-who">{done ? finalName : "?"}</span>
        {done ? <span className="tourney-rung-tag">{hunt ? "CHAMPION" : "PICKED"}</span> : null}
      </div>
    </div>
  );

  if (done) {
    return (
      <div className="tourney">
        {ladder}
        <div className={`tourney-card ${hunt ? "is-gold" : "is-red"}`}>
          <div className="tourney-kicker">Tournament over</div>
          <div className="tourney-big">{finalName}</div>
          <div className="tourney-sub">{result.summary}</div>
          <div className="tourney-chips">
            {(hunt ? result.eliminatedNames : result.safeNames).map((name, index) => (
              <span key={`${name}-${index}`} className={`tourney-chip ${hunt ? "is-out" : "is-safe"}`}>R{index + 1} {name} {verb}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (progress.phase === "summary") {
    const pick = result.rounds[progress.roundIndex].selectedName;
    const last = progress.roundIndex >= result.rounds.length - 1;
    const next = last ? [finalName] : result.rounds[progress.roundIndex + 1].remainingAtStart;
    return (
      <div className="tourney">
        {ladder}
        <div className={`tourney-card ${hunt ? "is-red" : "is-green"}`}>
          <div className="tourney-kicker">{result.rounds[progress.roundIndex].roundLabel} done</div>
          <div className="tourney-big">{pick ? `${pick} is ${hunt ? "out" : "safe"}` : "A tie - go again"}</div>
          <div className="tourney-sub">
            {last
              ? hunt ? `${finalName} is the last one standing.` : `${finalName} is the only one left without a win.`
              : `Next round: ${next.join(", ")}`}
          </div>
          {settled.length ? (
            <div className="tourney-chips">
              {settled.filter((round) => round.selectedName).map((round, index) => (
                <span key={`${round.selectedName}-${index}`} className={`tourney-chip ${hunt ? "is-out" : "is-safe"}`}>{round.selectedName} {verb}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="tourney">
      {ladder}
      <div className="tourney-note">
        {currentRound.roundLabel}: {hunt ? "lose this round and you're out" : "win this round and you're safe"} - {currentRound.remainingAtStart.join(", ")}
      </div>
      <PlaybackStage result={currentRound} step={progress.roundStep} done={progress.roundDone} />
    </div>
  );
}
