// The lobby: the Neon Royale's sign, your chips, a tile for every game (with its table limits, drawn live), the
// board of recent wins, and the cage. The Runouts section is its own little lobby of sixteen games.
import React, { useMemo } from 'react';
import Stage from './Stage.jsx';
import { Balance, SoundToggle, useWallet, Btn } from './Shell.jsx';
import { GAMES, limitsFor } from '../core/tables.js';
import { MODES } from '../games/runouts.js';
import { drawTile, drawSign, drawMode } from '../art/tiles.js';
import { PATRONS } from '../core/people.js';
import { num, short } from '../core/fmt.js';
import { recentWins } from '../core/wins.js';
import { requestClose, inFrame } from '../core/wallet.js';

function limitText(id, stakes) {
  const l = limitsFor(id, stakes);
  if (id === 'poker') return 'BLINDS ' + short(l.sb) + '/' + short(l.bb);
  if (id === 'slots') return 'BET ' + short(l.bets[0]) + '–' + short(l.bets[l.bets.length - 1]);
  return short(l.min) + '–' + short(l.max);
}

function Ticker({ wallet }) {
  const items = useMemo(() => {
    const mine = recentWins().slice(0, 6).map((w) => ({ who: 'YOU', game: w.game, amt: w.amt, mine: true }));
    const seed = Math.floor(Date.now() / 600000);
    const fake = Array.from({ length: 10 }, (_, i) => {
      const h = Math.abs(Math.sin(seed * 31 + i * 7.3) * 10000);
      const g = GAMES[Math.floor(h) % 7];
      return { who: PATRONS[Math.floor(h * 7) % PATRONS.length], game: g.id, amt: [40, 120, 250, 75, 600, 1500, 90, 330][Math.floor(h * 3) % 8] };
    });
    const out = [];
    for (let i = 0; i < Math.max(mine.length, fake.length); i++) { if (fake[i]) out.push(fake[i]); if (mine[i]) out.push(mine[i]); }
    return out;
  }, []);
  void wallet;
  const name = (id) => (GAMES.find((g) => g.id === id) || { name: id }).name;
  return (
    <div className="ticker" aria-label="Recent wins">
      <div className="ticker-lab">BIG WINS</div>
      <div className="ticker-run">
        {items.map((w, i) => <span key={i} className={w.mine ? 'mine' : ''}>{w.who} <b>+{num(w.amt)}</b> on {name(w.game)}</span>)}
      </div>
    </div>
  );
}

export default function Lobby({ wallet, stakes, onPick, onStakes }) {
  useWallet(wallet);
  const high = stakes === 'high';
  return (
    <div className="lobby fade-in">
      <div className="lobby-inner">
        <div className="marquee-top">
          {inFrame ? <button type="button" className="back-btn" onClick={() => requestClose('royale-lobby')}><span className="chev">◀</span><span className="back-lab">Leave</span></button>
            : <a className="back-btn" href="/bridge"><span className="chev">◀</span><span className="back-lab">Bridge</span></a>}
          <div className="tb-right"><Balance wallet={wallet} /><SoundToggle /></div>
        </div>
        <div className="sign">
          <div className="sign-box"><Stage target={{ land: [200, 46], port: [150, 40] }} draw={(ctx, f) => drawSign(ctx, f, high)} /></div>
          <div className="sign-sub">{high ? 'High roller room · Royale Link' : 'Royale Link · the Neon Royale’s tables, anywhere'}</div>
        </div>
        <p className="lobby-hint">
          Pick a game and take a seat. Your {wallet.kind === 'bridge' ? <b>Bridge coins</b> : <b>play chips</b>} are your chips:
          bet, watch it play out, get paid.
        </p>
        {wallet.note && <div className="note">{wallet.note}</div>}
        {wallet.high && onStakes && (
          <div className="stakes-pick">
            <Btn small kind={high ? 'dark' : 'gold'} onClick={() => onStakes(null)}>Main floor</Btn>
            <Btn small kind={high ? 'pink' : 'dark'} onClick={() => onStakes('high')}>High roller room</Btn>
          </div>
        )}
        <Ticker wallet={wallet} />
        <div className="tiles">
          {GAMES.map((g, i) => (
            <button key={g.id} type="button" className={'tile' + (i === 0 ? ' hot' : '')} onClick={() => onPick(g.id)} aria-label={'Play ' + g.name}>
              <div className="tile-art"><Stage target={{ land: [120, 75], port: [120, 75] }} draw={(ctx, f) => drawTile(g.id, ctx, f, high)} /></div>
              <div className="tile-body">
                <div className="tile-name">{g.name}</div>
                <div className="tile-tag">{g.tag}</div>
                <div className="tile-limits"><span className="lim">{limitText(g.id, stakes)}</span></div>
              </div>
              <div className="tile-play">PLAY ▶</div>
            </button>
          ))}
        </div>
        <div className="cage">
          {wallet.kind === 'local' ? (
            <>
              <span>The cage: play chips, this browser only</span>
              {wallet.balance < 1000 && <Btn small kind="gold" onClick={() => wallet.refill()}>Top up to 1,000</Btn>}
            </>
          ) : <span>Playing for <b>{wallet.pilot || 'your'}</b>'s Bridge coins</span>}
        </div>
      </div>
    </div>
  );
}

export function RunoutsLobby({ wallet, stakes, onBack, onPick }) {
  useWallet(wallet);
  const kinds = [['cards', 'Cards'], ['luck', 'Luck'], ['shows', 'Shows']];
  const l = limitsFor('runouts', stakes);
  return (
    <div className="lobby fade-in">
      <div className="lobby-inner">
        <div className="marquee-top">
          <button type="button" className="back-btn" onClick={onBack}><span className="chev">◀</span><span className="back-lab">Lobby</span></button>
          <div className="tb-right"><Balance wallet={wallet} /><SoundToggle /></div>
        </div>
        <div className="sign">
          <div className="sign-box"><Stage target={{ land: [200, 46], port: [150, 40] }} draw={(ctx, f) => drawSign(ctx, f, false, 'RUNOUTS')} /></div>
          <div className="sign-sub">Four players, one runout · bets {short(l.min)}–{short(l.max)}</div>
        </div>
        <p className="lobby-hint">Back anyone at the table to <b>win</b> (×3.8), to stay <b>safe</b> (×1.27) or to come <b>last</b> (×3.8) — then watch it run out.</p>
        <div className="mini-tiles">
          <button type="button" className="tile hot" onClick={() => onPick('random')}>
            <div className="tile-art"><Stage target={{ land: [112, 63], port: [112, 63] }} draw={(ctx, f) => drawMode('random', ctx, f)} /></div>
            <div className="tile-body"><div className="tile-name">Random</div><div className="tile-blurb">A different runout every round.</div></div>
          </button>
          {kinds.map(([k]) => MODES.filter((m) => m.kind === k).map((m) => (
            <button key={m.id} type="button" className="tile" onClick={() => onPick(m.id)}>
              <div className="tile-art"><Stage target={{ land: [112, 63], port: [112, 63] }} draw={(ctx, f) => drawMode(m.id, ctx, f)} /></div>
              <div className="tile-body"><div className="tile-name">{m.name}</div><div className="tile-blurb">{m.blurb}</div></div>
            </button>
          )))}
        </div>
      </div>
    </div>
  );
}
