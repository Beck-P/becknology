// Under a game screen once it's over: the result in words, and how everyone did, as a board in the room's style
// (the screen does the celebrating, so this stays quiet).
import React from "react";
import { PCOL } from "./kit.js";

export default function ArcadeVerdict({ result, names, kicker, note, label }) {
  const goal = result.selectionGoal === "winner" ? "winner" : "loser";
  const order = names && names.length ? names : (result.players || []).map((p) => p.name);
  const colour = (name) => PCOL[Math.max(0, order.indexOf(name)) % PCOL.length];
  const tone = result.isTie ? "is-tie" : goal === "winner" ? "is-win" : "is-lose";
  const players = [...(result.players || [])].sort((a, b) => (b.selected || b.tied ? 1 : 0) - (a.selected || a.tied ? 1 : 0));
  return (
    <div className={`arcade-verdict ${tone}`}>
      {label ? <div className="arcade-verdict-label">{label}</div> : null}
      <div className="arcade-verdict-kicker">{kicker || (result.isTie ? "Dead heat" : goal === "winner" ? "We have a winner" : "Round complete")}</div>
      <div className="arcade-verdict-head">{result.isTie ? "It's a tie" : result.headline}</div>
      {result.summary && !result.isTie ? <div className="arcade-verdict-sum">{result.summary}</div> : null}
      <div className="arcade-verdict-board">
        {players.map((p) => {
          const hot = p.selected || p.tied;
          return (
            <div key={p.name} className={`arcade-verdict-row ${hot ? "is-hot" : ""}`} style={{ "--pc": colour(p.name) }}>
              <span className="arcade-verdict-dot" />
              <span className="arcade-verdict-name">{p.name}</span>
              <span className="arcade-verdict-val">{String(p.headline || "").replace(/[^\x20-\x7E]/g, "").trim()}</span>
            </div>
          );
        })}
      </div>
      {note ? <div className="arcade-verdict-note">{note}</div> : null}
    </div>
  );
}
