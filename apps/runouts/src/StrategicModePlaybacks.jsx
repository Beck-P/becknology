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
  const progress = getTournamentProgress(result, step);
  const currentRound = result.rounds[Math.max(progress.roundIndex, 0)];
  const safeSoFar = result.rounds.slice(0, progress.phase === "summary" ? progress.roundIndex + 1 : progress.roundIndex).map((round) => round.selectedName);
  const remainingNow = progress.phase === "summary"
    ? progress.roundIndex < result.rounds.length - 1
      ? result.rounds[progress.roundIndex + 1].remainingAtStart
      : [result.finalLoser]
    : currentRound?.remainingAtStart ?? [];

  if (done) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 shadow-xl backdrop-blur">
          <div className="bg-gradient-to-r from-slate-950 to-slate-800 px-6 py-6 text-white">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">Tournament complete</div>
            <div className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{result.headline}</div>
            <div className="mt-3 max-w-2xl text-white/90">{result.summary}</div>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="rounded-3xl border border-rose-300 bg-rose-50 p-5 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">Final loser</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{result.finalLoser}</div>
              <div className="mt-2 text-sm text-slate-600">The only player who never won a round.</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Safe order</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.safeNames.map((name, index) => (
                  <span key={`${name}-${index}`} className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    Round {index + 1}: {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (progress.phase === "summary") {
    const roundWinner = result.rounds[progress.roundIndex].selectedName;
    const nextPlayers = progress.roundIndex < result.rounds.length - 1 ? result.rounds[progress.roundIndex + 1].remainingAtStart : [result.finalLoser];
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 shadow-xl backdrop-blur">
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-6 text-white">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">{result.rounds[progress.roundIndex].roundLabel} complete</div>
            <div className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{roundWinner} is safe</div>
            <div className="mt-3 max-w-2xl text-white/90">
              {progress.roundIndex < result.rounds.length - 1 ? `Next round: ${nextPlayers.join(", ")}` : `${result.finalLoser} is the only person left without a win.`}
            </div>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Safe so far</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...safeSoFar].map((name, index) => (
                  <span key={`${name}-${index}`} className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Still in danger</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {nextPlayers.map((name) => (
                  <span key={name} className="rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Tournament status</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{currentRound.roundLabel}</div>
          <div className="mt-2 text-slate-600">Win this round and you're safe. One person will be left at the end.</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {safeSoFar.length ? safeSoFar.map((name, index) => (
              <span key={`${name}-${index}`} className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                Safe: {name}
              </span>
            )) : <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">No one safe yet</span>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {remainingNow.map((name) => (
              <span key={name} className="rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                Playing: {name}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Rounds</div>
          <div className="mt-3 space-y-2">
            {result.rounds.map((round, index) => {
              const active = index === progress.roundIndex;
              const complete = index < progress.roundIndex || progress.phase === "summary";
              return (
                <div key={`${round.roundLabel}-${index}`} className={`rounded-2xl border px-4 py-3 ${active ? "border-sky-300 bg-sky-50" : complete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                  <div className="text-sm font-semibold text-slate-900">{round.roundLabel}</div>
                  <div className="text-sm text-slate-500">{complete ? `${round.selectedName} won immunity` : round.remainingAtStart.join(", ")}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <PlaybackStage result={currentRound} step={progress.roundStep} done={progress.roundDone} />
    </div>
  );
}

