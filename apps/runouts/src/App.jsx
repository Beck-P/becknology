import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import './index.css';
import { getSingleTotalSteps, getPlaybackConfig, getPlaybackConfigDiagnostics } from './playbackConfig';

let leaderboardModulePromise;
let classicModePlaybacksPromise;
let interactionPanelsPromise;
let metaPanelsPromise;
let strategicModePlaybacksPromise;
let heavyModePlaybacksPromise;

function loadLeaderboardModule() {
  leaderboardModulePromise ||= import('./Leaderboard');
  return leaderboardModulePromise;
}

function loadClassicModePlaybacks() {
  classicModePlaybacksPromise ||= import('./ClassicModePlaybacks');
  return classicModePlaybacksPromise;
}

function loadInteractionPanels() {
  interactionPanelsPromise ||= import('./InteractionPanels');
  return interactionPanelsPromise;
}

function loadMetaPanels() {
  metaPanelsPromise ||= import('./MetaPanels');
  return metaPanelsPromise;
}

function loadStrategicModePlaybacks() {
  strategicModePlaybacksPromise ||= import('./StrategicModePlaybacks');
  return strategicModePlaybacksPromise;
}

function loadHeavyModePlaybacks() {
  heavyModePlaybacksPromise ||= import('./HeavyModePlaybacks');
  return heavyModePlaybacksPromise;
}

const Leaderboard = React.lazy(loadLeaderboardModule);
const WheelPlayback = React.lazy(() => loadClassicModePlaybacks().then((module) => ({ default: module.WheelPlayback })));
const NumberPlayback = React.lazy(() => loadClassicModePlaybacks().then((module) => ({ default: module.NumberPlayback })));
const DicePlayback = React.lazy(() => loadClassicModePlaybacks().then((module) => ({ default: module.DicePlayback })));
const HighCardPlayback = React.lazy(() => loadClassicModePlaybacks().then((module) => ({ default: module.HighCardPlayback })));
const CoinPlayback = React.lazy(() => loadClassicModePlaybacks().then((module) => ({ default: module.CoinPlayback })));
const MarblePlayback = React.lazy(() => loadClassicModePlaybacks().then((module) => ({ default: module.MarblePlayback })));
const SlotsPlayback = React.lazy(() => loadClassicModePlaybacks().then((module) => ({ default: module.SlotsPlayback })));
const HorseRacePlayback = React.lazy(() => loadClassicModePlaybacks().then((module) => ({ default: module.HorseRacePlayback })));
const PlayerActionBar = React.lazy(() => loadInteractionPanels().then((module) => ({ default: module.PlayerActionBar })));
const JoinScreen = React.lazy(() => loadMetaPanels().then((module) => ({ default: module.JoinScreen })));
const VoteGrid = React.lazy(() => loadMetaPanels().then((module) => ({ default: module.VoteGrid })));
const SeriesScoreboard = React.lazy(() => loadMetaPanels().then((module) => ({ default: module.SeriesScoreboard })));
const SeriesResult = React.lazy(() => loadMetaPanels().then((module) => ({ default: module.SeriesResult })));
const PokerPlayback = React.lazy(() => loadStrategicModePlaybacks().then((module) => ({ default: module.PokerPlayback })));
const TournamentPlayback = React.lazy(() => loadStrategicModePlaybacks().then((module) => ({ default: module.TournamentPlayback })));
const RocketPlayback = React.lazy(() => loadHeavyModePlaybacks().then((module) => ({ default: module.RocketPlayback })));
const SpaceInvadersPlayback = React.lazy(() => loadHeavyModePlaybacks().then((module) => ({ default: module.SpaceInvadersPlayback })));
const BombPlayback = React.lazy(() => loadHeavyModePlaybacks().then((module) => ({ default: module.BombPlayback })));
const PlinkoPlayback = React.lazy(() => loadHeavyModePlaybacks().then((module) => ({ default: module.PlinkoPlayback })));
const BattleRoyalePlayback = React.lazy(() => loadHeavyModePlaybacks().then((module) => ({ default: module.BattleRoyalePlayback })));
const StockMarketPlayback = React.lazy(() => loadHeavyModePlaybacks().then((module) => ({ default: module.StockMarketPlayback })));

    // Supabase setup — replace with your project credentials
    const SUPABASE_URL = 'https://nwtfrlxgydbeuqfcftzn.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_mjJW8ba__7yjbwAAx81sXg_oMlDkrol';
    const _supabase = SUPABASE_URL !== 'YOUR_SUPABASE_URL'
      ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      : null;

    function Icon({ symbol, className = '' }) {
      return <span className={className} aria-hidden="true" style={{display:'inline-flex',alignItems:'center',justifyContent:'center'}}>{symbol}</span>;
    }
    const Dices = (props) => <Icon symbol="🎲" {...props} />;
    const FastForward = (props) => <Icon symbol="⏩" {...props} />;
    const RotateCcw = (props) => <Icon symbol="🔄" {...props} />;
    const Shuffle = (props) => <Icon symbol="🔀" {...props} />;
    const Sparkles = (props) => <Icon symbol="✨" {...props} />;
    const Trophy = (props) => <Icon symbol="🏆" {...props} />;

    function CyclingNumber({ value, active }) {
      const [display, setDisplay] = useState("?");
      useEffect(() => {
        if (!active) { setDisplay("?"); return; }
        let count = 0;
        const interval = setInterval(() => {
          count++;
          if (count >= 18) { clearInterval(interval); setDisplay(value); }
          else { setDisplay(Math.floor(Math.random() * 100) + 1); }
        }, 55);
        return () => clearInterval(interval);
      }, [active, value]);
      return display;
    }

    function CyclingSlot({ symbol, active, delay = 0 }) {
      const [display, setDisplay] = useState("🎰");
      useEffect(() => {
        if (!active) { setDisplay("🎰"); return; }
        const timeout = setTimeout(() => {
          let count = 0;
          const interval = setInterval(() => {
            count++;
            if (count >= 16) { clearInterval(interval); setDisplay(symbol); }
            else { setDisplay(SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]); }
          }, 55);
          return () => clearInterval(interval);
        }, delay);
        return () => clearTimeout(timeout);
      }, [active, symbol, delay]);
      return display;
    }

    function Celebration() {
      const particles = useMemo(() =>
        Array.from({ length: 28 }, (_, i) => ({
          emoji: ["🎉", "⭐", "🏆", "✨", "🎊", "🥇", "👑"][i % 7],
          x: (Math.random() - 0.5) * 600,
          y: -(Math.random() * 350 + 80),
          rotate: Math.random() * 720 - 360,
          delay: Math.random() * 0.7,
          size: 18 + Math.random() * 22,
        })),
      []);
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {particles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{ fontSize: p.size }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{ x: p.x, y: p.y, opacity: [1, 1, 0], scale: [0, 1.3, 0.6], rotate: p.rotate }}
              transition={{ duration: 2.8, delay: p.delay, ease: "easeOut" }}
            >
              {p.emoji}
            </motion.div>
          ))}
        </div>
      );
    }

    function SadOverlay() {
      const drops = useMemo(() =>
        Array.from({ length: 18 }, (_, i) => ({
          emoji: ["😢", "💀", "😭", "🪦", "☠️", "📉"][i % 6],
          x: 5 + Math.random() * 90,
          delay: Math.random() * 2.5,
          duration: 2.5 + Math.random() * 2,
          size: 16 + Math.random() * 16,
        })),
      []);
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {drops.map((d, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{ left: `${d.x}%`, fontSize: d.size, top: -30 }}
              initial={{ y: -30, opacity: 0.7, rotate: 0 }}
              animate={{ y: 600, opacity: [0.7, 0.5, 0], rotate: [0, 15, -15, 8, -5] }}
              transition={{ duration: d.duration, delay: d.delay, ease: "easeIn" }}
            >
              {d.emoji}
            </motion.div>
          ))}
        </div>
      );
    }

    function TieAnimation({ tiedNames }) {
      const particles = useMemo(() =>
        Array.from({ length: 24 }, (_, i) => ({
          emoji: ["\u26A1", "\uD83D\uDD25", "\u2694\uFE0F", "\uD83D\uDCA5"][i % 4],
          x: (Math.random() - 0.5) * 500,
          y: (Math.random() - 0.5) * 400,
          rotate: Math.random() * 720 - 360,
          delay: Math.random() * 0.6,
          size: 20 + Math.random() * 24,
        })),
      []);
      return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {particles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{ fontSize: p.size }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{ x: p.x, y: p.y, opacity: [1, 1, 0.8, 0], scale: [0, 1.5, 1, 0.5], rotate: p.rotate }}
              transition={{ duration: 2.5, delay: p.delay, ease: "easeOut" }}
            >
              {p.emoji}
            </motion.div>
          ))}
          {tiedNames ? (
            <motion.div
              className="absolute inset-0 flex items-end justify-center pb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0.8] }}
              transition={{ duration: 2, delay: 0.3 }}
            >
              <div className="text-sm font-bold tracking-widest" style={{ color: "#f59e0b" }}>
                {tiedNames.join(" vs ")}
              </div>
            </motion.div>
          ) : null}
        </div>
      );
    }

    function ThemeArt({ modeId }) {
      const art = useMemo(() => {
        switch (modeId) {
          case 'holdem':
            return (
              <div className="theme-art-layer">
                {/* Green poker chip top-right */}
                <div className="theme-art-sprite pixel-chip float-slow" style={{top:16,right:20,transform:'scale(1.3)'}} />
                {/* Blinking block cursor bottom-left */}
                <div style={{position:'absolute',bottom:24,left:20,width:10,height:16,background:'#00ff41',animation:'cursor-blink 1s steps(1) infinite',opacity:0.7}} />
                {/* Scrolling ticker at bottom */}
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:18,overflow:'hidden',opacity:0.3}}>
                  <div style={{display:'inline-block',whiteSpace:'nowrap',fontFamily:"'Press Start 2P', monospace",fontSize:8,color:'#00ff41',animation:'ticker-scroll 12s linear infinite',willChange:'transform'}}>
                    {"DEALER WINS: 47% \u25CF POT ODDS: 3.2:1 \u25CF DEALER WINS: 47% \u25CF POT ODDS: 3.2:1 \u25CF "}
                  </div>
                </div>
              </div>
            );
          case 'plo':
            return (
              <div className="theme-art-layer">
                {/* Glitched heart with offset shadows */}
                <div style={{position:'absolute',top:20,right:28}}>
                  <div className="pixel-heart" style={{position:'absolute',filter:'brightness(0) invert(1)',opacity:0.2,transform:'translate(-2px, 1px)',mixBlendMode:'screen'}} />
                  <div className="pixel-heart" style={{position:'absolute',filter:'hue-rotate(180deg)',opacity:0.15,transform:'translate(2px, -1px)',mixBlendMode:'screen'}} />
                  <div className="pixel-heart" style={{position:'relative',opacity:0.5}} />
                </div>
                {/* Glitch bars */}
                <div style={{position:'absolute',top:'25%',left:0,right:0,height:2,background:'rgba(236,72,153,0.4)',animation:'glitch-bar 3s steps(1) infinite',willChange:'opacity'}} />
                <div style={{position:'absolute',top:'55%',left:0,right:0,height:1,background:'rgba(168,85,247,0.3)',animation:'glitch-bar 4.5s steps(1) infinite 1s',willChange:'opacity'}} />
                <div style={{position:'absolute',top:'78%',left:0,right:0,height:2,background:'rgba(34,211,238,0.3)',animation:'glitch-bar 3.8s steps(1) infinite 0.5s',willChange:'opacity'}} />
                {/* Static noise grain */}
                <div style={{position:'absolute',inset:0,background:'repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(168,85,247,0.015) 1px,rgba(168,85,247,0.015) 2px)',opacity:0.8}} />
              </div>
            );
          case 'rng':
            return (
              <div className="theme-art-layer">
                {/* Rain columns */}
                {[8, 22, 45, 68, 88].map((left, i) => (
                  <div key={i} style={{position:'absolute',top:0,left:`${left}%`,width:1,height:'100%',background:'linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.3) 30%, rgba(0,255,65,0.2) 60%, transparent 100%)',animation:`rain-fall ${2.5 + i * 0.4}s linear infinite`,animationDelay:`${i * 0.6}s`,willChange:'transform',opacity:0.5}} />
                ))}
                {/* Terminal prompt */}
                <div style={{position:'absolute',bottom:20,left:16,fontFamily:"'Press Start 2P', monospace",fontSize:10,color:'#22d3ee',opacity:0.4}}>
                  <span>{">_"}</span>
                  <span style={{display:'inline-block',width:8,height:12,background:'#22d3ee',marginLeft:2,animation:'cursor-blink 1s steps(1) infinite'}} />
                </div>
                {/* Grid paper */}
                <div style={{position:'absolute',inset:0,background:'repeating-linear-gradient(0deg,transparent,transparent 19px,rgba(34,211,238,0.04) 19px,rgba(34,211,238,0.04) 20px), repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(34,211,238,0.04) 19px,rgba(34,211,238,0.04) 20px)',opacity:0.5}} />
              </div>
            );
          case 'wheel':
            return (
              <div className="theme-art-layer">
                {/* Marquee chase lights along top */}
                <div style={{position:'absolute',top:6,left:20,right:20,height:4,background:'repeating-linear-gradient(90deg,#fbbf24 0px,#fbbf24 4px,transparent 4px,transparent 8px,#ec4899 8px,#ec4899 12px,transparent 12px,transparent 16px,#38bdf8 16px,#38bdf8 20px,transparent 20px,transparent 32px)',animation:'marquee-dots 1.2s linear infinite',willChange:'background-position',opacity:0.6,borderRadius:2}} />
                {/* Star burst top-left */}
                <div className="theme-art-sprite pixel-star-burst float-slow" style={{top:24,left:16,transform:'scale(1.2)',opacity:0.8}} />
                {/* Spotlight cone */}
                <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:120,height:200,background:'radial-gradient(ellipse at top center, rgba(251,191,36,0.08) 0%, transparent 70%)',opacity:0.6}} />
              </div>
            );
          case 'dice':
            return (
              <div className="theme-art-layer">
                {/* Torch left side */}
                <div style={{position:'absolute',top:'30%',left:8}}>
                  <div className="theme-art-sprite pixel-torch" style={{transform:'scale(1.3)',opacity:0.9}} />
                  <div style={{position:'absolute',top:-10,left:-8,width:40,height:40,borderRadius:'50%',background:'radial-gradient(circle,rgba(251,191,36,0.15),transparent 70%)',animation:'torch-flicker 3s ease-in-out infinite'}} />
                </div>
                {/* Torch right side */}
                <div style={{position:'absolute',top:'30%',right:8}}>
                  <div className="theme-art-sprite pixel-torch" style={{transform:'scale(1.3)',opacity:0.9}} />
                  <div style={{position:'absolute',top:-10,right:-8,width:40,height:40,borderRadius:'50%',background:'radial-gradient(circle,rgba(251,191,36,0.15),transparent 70%)',animation:'torch-flicker 3s ease-in-out infinite 0.5s'}} />
                </div>
                {/* Skull at bottom center */}
                <div className="theme-art-sprite pixel-skull" style={{bottom:16,left:'50%',transform:'translateX(-50%) scale(1.2)',opacity:0.5}} />
                {/* Stone wall texture */}
                <div style={{position:'absolute',inset:0,background:'repeating-linear-gradient(0deg, rgba(120,100,80,0.03) 0px, rgba(120,100,80,0.03) 20px, rgba(80,60,40,0.04) 20px, rgba(80,60,40,0.04) 21px), repeating-linear-gradient(90deg, rgba(100,80,60,0.02) 0px, rgba(100,80,60,0.02) 40px, rgba(70,50,30,0.03) 40px, rgba(70,50,30,0.03) 41px)',opacity:0.7}} />
              </div>
            );
          case 'high-card':
            return (
              <div className="theme-art-layer">
                {/* Badge top-right */}
                <div className="theme-art-sprite pixel-badge" style={{top:18,right:20,transform:'scale(1.2)',opacity:0.7}} />
                {/* Dust particles */}
                {[{x:15,y:40},{x:30,y:65},{x:55,y:30},{x:70,y:55},{x:85,y:45},{x:45,y:75},{x:20,y:20},{x:75,y:80}].map((p, i) => (
                  <div key={i} style={{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,width:3,height:3,borderRadius:'50%',background:'#d4a854',opacity:0.3,animation:`dust-drift ${4 + i * 0.7}s ease-in-out infinite`,animationDelay:`${i * 0.8}s`,willChange:'transform'}} />
                ))}
                {/* Sandy texture at bottom */}
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:'15%',background:'repeating-linear-gradient(170deg, transparent 0px, transparent 6px, rgba(180,140,80,0.04) 6px, rgba(180,140,80,0.04) 8px)',opacity:0.6}} />
              </div>
            );
          case 'coin-flips':
            return (
              <div className="theme-art-layer">
                {/* Treasure chest bottom-right */}
                <div className="theme-art-sprite pixel-chest" style={{bottom:20,right:16,transform:'scale(1.3)',opacity:0.6}} />
                {/* Ocean waves at bottom */}
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:'18%',background:'repeating-linear-gradient(170deg, transparent 0px, transparent 10px, rgba(30,58,138,0.06) 10px, rgba(30,58,138,0.06) 12px, transparent 12px, transparent 18px, rgba(56,189,248,0.04) 18px, rgba(56,189,248,0.04) 20px)',animation:'wave-drift 6s linear infinite',willChange:'background-position'}} />
                {/* Scattered coins */}
                <div className="theme-art-sprite pixel-coin float-slow" style={{top:20,left:'15%',transform:'scale(0.8)',opacity:0.5}} />
                <div className="theme-art-sprite pixel-coin float-med" style={{top:'45%',right:'10%',transform:'scale(1.1)',opacity:0.4}} />
                <div className="theme-art-sprite pixel-coin float-fast" style={{bottom:'30%',left:'25%',transform:'scale(0.6)',opacity:0.3}} />
                <div className="theme-art-sprite pixel-coin float-slow" style={{top:'60%',left:'65%',transform:'scale(0.9)',opacity:0.35}} />
              </div>
            );
          case 'black-marble':
            return (
              <div className="theme-art-layer">
                {/* Crystal at bottom center */}
                <div className="theme-art-sprite pixel-crystal" style={{bottom:14,left:'50%',transform:'translateX(-50%) scale(1.4)',opacity:0.6}} />
                {/* Enhanced starfield */}
                {Array.from({length:12}, (_, i) => ({
                  x: 5 + (i * 37 + 13) % 90,
                  y: 5 + (i * 53 + 7) % 90,
                  size: i % 3 === 0 ? 3 : 2,
                  delay: (i * 0.4) % 3,
                  dur: 2 + (i % 4) * 0.7,
                })).map((s, i) => (
                  <div key={i} style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,width:s.size,height:s.size,borderRadius:'50%',background:i % 4 === 0 ? '#c4b5fd' : i % 3 === 0 ? '#e0e7ff' : '#8b5cf6',boxShadow:`0 0 ${s.size + 2}px rgba(139,92,246,0.5)`,animation:`twinkle${(i % 3) + 1} ${s.dur}s ease-in-out infinite`,animationDelay:`${s.delay}s`}} />
                ))}
                {/* Nebula clouds */}
                <div style={{position:'absolute',top:'10%',left:'10%',width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle, rgba(88,28,135,0.08), transparent 70%)',animation:'nebula-pulse 8s ease-in-out infinite',willChange:'opacity'}} />
                <div style={{position:'absolute',bottom:'15%',right:'10%',width:160,height:160,borderRadius:'50%',background:'radial-gradient(circle, rgba(67,56,202,0.06), transparent 70%)',animation:'nebula-pulse 6s ease-in-out infinite 2s',willChange:'opacity'}} />
              </div>
            );
          case 'slots':
            return (
              <div className="theme-art-layer">
                {/* Cherry top-left */}
                <div className="theme-art-sprite pixel-cherry" style={{top:16,left:16,transform:'scale(1.2)',opacity:0.7}} />
                {/* Seven top-right */}
                <div className="theme-art-sprite pixel-seven" style={{top:16,right:20,transform:'scale(1.3)',opacity:0.7}} />
                {/* Chase lights left side */}
                <div style={{position:'absolute',top:60,left:4,bottom:20,width:4,background:'repeating-linear-gradient(180deg, #ec4899 0px, #ec4899 4px, transparent 4px, transparent 8px, #38bdf8 8px, #38bdf8 12px, transparent 12px, transparent 16px, #fbbf24 16px, #fbbf24 20px, transparent 20px, transparent 32px)',animation:'marquee-dots-v 1s linear infinite',willChange:'background-position',opacity:0.5,borderRadius:2}} />
                {/* Chase lights right side */}
                <div style={{position:'absolute',top:60,right:4,bottom:20,width:4,background:'repeating-linear-gradient(180deg, #fbbf24 0px, #fbbf24 4px, transparent 4px, transparent 8px, #ec4899 8px, #ec4899 12px, transparent 12px, transparent 16px, #38bdf8 16px, #38bdf8 20px, transparent 20px, transparent 32px)',animation:'marquee-dots-v 1s linear infinite 0.5s',willChange:'background-position',opacity:0.5,borderRadius:2}} />
                {/* JACKPOT background text */}
                <div style={{position:'absolute',top:'40%',left:'50%',transform:'translate(-50%,-50%)',fontFamily:"'Press Start 2P', monospace",fontSize:48,color:'#ec4899',opacity:0.04,letterSpacing:'0.2em',animation:'neon-throb 3s ease-in-out infinite',willChange:'filter',whiteSpace:'nowrap'}}>JACKPOT</div>
                {/* Dollar sign particles */}
                {[15, 35, 55, 75, 90].map((left, i) => (
                  <div key={i} style={{position:'absolute',bottom:10,left:`${left}%`,fontFamily:"'Press Start 2P', monospace",fontSize:14,color:'#fbbf24',opacity:0.4,animation:`dollar-rise ${3 + i * 0.5}s ease-out infinite`,animationDelay:`${i * 0.8}s`,willChange:'transform'}}>$</div>
                ))}
              </div>
            );
          case 'horse-race':
            return (
              <div className="theme-art-layer">
                {/* Green turf texture */}
                <div style={{position:'absolute',top:0,left:0,right:0,height:'35%',background:'repeating-linear-gradient(90deg, rgba(34,197,94,0.03) 0px, rgba(34,197,94,0.03) 20px, rgba(22,163,74,0.04) 20px, rgba(22,163,74,0.04) 40px)',opacity:0.7}} />
                {/* Flag top-right */}
                <div className="theme-art-sprite pixel-flag" style={{top:16,right:20,transform:'scale(1.3)',opacity:0.7}} />
                {/* Lane markers */}
                {[30, 50, 70].map((top, i) => (
                  <div key={i} style={{position:'absolute',top:`${top}%`,left:'5%',right:'5%',height:1,borderTop:'2px dashed rgba(255,255,255,0.08)'}} />
                ))}
                {/* PHOTO FINISH banner */}
                <div style={{position:'absolute',bottom:12,left:'50%',transform:'translateX(-50%)',padding:'3px 12px',border:'2px solid rgba(34,197,94,0.3)',background:'rgba(13,26,13,0.7)',fontFamily:"'Press Start 2P', monospace",fontSize:7,color:'#86efac',letterSpacing:'0.15em',opacity:0.5,whiteSpace:'nowrap'}}>PHOTO FINISH</div>
              </div>
            );
          case 'rocket':
            return (
              <div className="theme-art-layer">
                {/* Twinkling stars */}
                {[{x:8,y:12,s:3,d:2.5},{x:25,y:35,s:2,d:3.2},{x:42,y:8,s:2,d:2.8},{x:65,y:22,s:3,d:3.5},{x:80,y:45,s:2,d:2.2},{x:15,y:70,s:2,d:4},{x:55,y:65,s:3,d:2.9},{x:90,y:15,s:2,d:3.8}].map((s, i) => (
                  <div key={i} style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,width:s.s,height:s.s,borderRadius:'50%',background:i % 3 === 0 ? '#c4b5fd' : i % 2 === 0 ? '#e0e7ff' : '#8b5cf6',boxShadow:`0 0 ${s.s + 2}px rgba(139,92,246,0.5)`,animation:`twinkle${(i % 3) + 1} ${s.d}s ease-in-out infinite`,animationDelay:`${i * 0.4}s`}} />
                ))}
                {/* Pixel planet bottom-right */}
                <div style={{position:'absolute',bottom:20,right:24,width:28,height:28,borderRadius:'50%',background:'radial-gradient(circle at 40% 35%, #6d28d9, #3730a3 60%, #1e1b4b)',boxShadow:'0 0 12px rgba(109,40,217,0.3)',opacity:0.6}} />
                {/* Ring around planet */}
                <div style={{position:'absolute',bottom:28,right:12,width:52,height:12,borderRadius:'50%',border:'1px solid rgba(139,92,246,0.25)',transform:'rotate(-15deg)',opacity:0.4}} />
                {/* Subtle nebula glow */}
                <div style={{position:'absolute',top:'15%',left:'10%',width:180,height:180,borderRadius:'50%',background:'radial-gradient(circle, rgba(99,102,241,0.06), transparent 70%)',animation:'nebula-pulse 7s ease-in-out infinite',willChange:'opacity'}} />
                {/* MISSION CONTROL label */}
                <div style={{position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',padding:'3px 12px',border:'1px solid rgba(139,92,246,0.2)',background:'rgba(10,5,32,0.7)',fontFamily:"'Press Start 2P', monospace",fontSize:7,color:'#8b5cf6',letterSpacing:'0.15em',opacity:0.4,whiteSpace:'nowrap'}}>MISSION CONTROL</div>
              </div>
            );
          case 'space-invaders':
            return (
              <div className="theme-art-layer">
                {/* Green pixel dots (shields) */}
                {[{x:15,y:70,w:20,h:8},{x:45,y:70,w:20,h:8},{x:75,y:70,w:20,h:8}].map((s, i) => (
                  <div key={i} style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,width:s.w,height:s.h,background:'rgba(34,197,94,0.15)',borderRadius:2,boxShadow:'0 0 6px rgba(34,197,94,0.1)'}} />
                ))}
                {/* Floating pixel dots */}
                {[{x:10,y:15,s:3},{x:30,y:25,s:2},{x:50,y:10,s:3},{x:70,y:30,s:2},{x:88,y:18,s:3},{x:20,y:50,s:2},{x:60,y:45,s:3},{x:82,y:55,s:2}].map((s, i) => (
                  <div key={i} style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,width:s.s,height:s.s,background:'#22c55e',opacity:0.3,animation:`twinkle${(i%3)+1} ${2.5+i*0.4}s ease-in-out infinite`,animationDelay:`${i*0.3}s`}} />
                ))}
                {/* CRT scanlines */}
                <div style={{position:'absolute',inset:0,background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(34,197,94,0.02) 2px,rgba(34,197,94,0.02) 4px)',opacity:0.8}} />
                {/* GAME OVER label */}
                <div style={{position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',padding:'3px 12px',border:'1px solid rgba(34,197,94,0.2)',background:'rgba(0,0,0,0.7)',fontFamily:"'Press Start 2P', monospace",fontSize:7,color:'#22c55e',letterSpacing:'0.15em',opacity:0.4,whiteSpace:'nowrap'}}>INSERT COIN</div>
              </div>
            );
          case 'bomb':
            return (
              <div className="theme-art-layer">
                {/* Hazard stripe pattern */}
                <div style={{position:'absolute',top:0,left:0,right:0,height:8,background:'repeating-linear-gradient(90deg, #f97316 0px, #f97316 8px, #1a1a2e 8px, #1a1a2e 16px)',opacity:0.15}} />
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:8,background:'repeating-linear-gradient(90deg, #f97316 0px, #f97316 8px, #1a1a2e 8px, #1a1a2e 16px)',opacity:0.15}} />
                {/* Spark particles */}
                {[{x:20,y:30},{x:45,y:20},{x:70,y:40},{x:85,y:25},{x:15,y:60},{x:55,y:55}].map((s, i) => (
                  <div key={i} style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,width:3,height:3,borderRadius:'50%',background:i%2===0?'#f97316':'#ef4444',opacity:0.4,animation:`fuse-spark ${1.5+i*0.3}s ease-in-out infinite`,animationDelay:`${i*0.4}s`}} />
                ))}
                {/* WARNING label */}
                <div style={{position:'absolute',bottom:14,left:'50%',transform:'translateX(-50%)',padding:'3px 12px',border:'1px solid rgba(239,68,68,0.2)',background:'rgba(26,26,46,0.7)',fontFamily:"'Press Start 2P', monospace",fontSize:7,color:'#ef4444',letterSpacing:'0.15em',opacity:0.4,whiteSpace:'nowrap'}}>DANGER ZONE</div>
              </div>
            );
          case 'plinko':
            return (
              <div className="theme-art-layer">
                {/* Neon peg dots */}
                {[{x:20,y:15},{x:40,y:25},{x:60,y:15},{x:80,y:25},{x:30,y:40},{x:50,y:35},{x:70,y:40},{x:15,y:55},{x:45,y:50},{x:75,y:55},{x:85,y:45},{x:25,y:65},{x:55,y:60},{x:65,y:70}].map((s, i) => (
                  <div key={i} style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,width:4,height:4,borderRadius:'50%',background:i%2===0?'#ec4899':'#fbbf24',boxShadow:`0 0 6px ${i%2===0?'rgba(236,72,153,0.5)':'rgba(251,191,36,0.5)'}`,opacity:0.4,animation:`led-blink ${1.5+i*0.2}s ease-in-out infinite`,animationDelay:`${i*0.3}s`}} />
                ))}
                {/* PLINKO label */}
                <div style={{position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',padding:'3px 12px',border:'1px solid rgba(236,72,153,0.2)',background:'rgba(26,10,24,0.7)',fontFamily:"'Press Start 2P', monospace",fontSize:7,color:'#ec4899',letterSpacing:'0.15em',opacity:0.4,whiteSpace:'nowrap'}}>PLINKO</div>
              </div>
            );
          case 'battle-royale':
            return (
              <div className="theme-art-layer">
                {/* Cyan grid */}
                <div style={{position:'absolute',inset:0,background:'repeating-linear-gradient(0deg,transparent 0px,transparent 29px,rgba(34,211,238,0.04) 29px,rgba(34,211,238,0.04) 30px), repeating-linear-gradient(90deg,transparent 0px,transparent 29px,rgba(34,211,238,0.04) 29px,rgba(34,211,238,0.04) 30px)',opacity:0.5}} />
                {/* Crosshair decoration */}
                <div style={{position:'absolute',top:'30%',right:'20%',width:24,height:24,border:'1px solid rgba(34,211,238,0.2)',borderRadius:'50%',opacity:0.4}}>
                  <div style={{position:'absolute',top:'50%',left:-6,width:8,height:1,background:'rgba(34,211,238,0.3)'}} />
                  <div style={{position:'absolute',top:'50%',right:-6,width:8,height:1,background:'rgba(34,211,238,0.3)'}} />
                  <div style={{position:'absolute',left:'50%',top:-6,width:1,height:8,background:'rgba(34,211,238,0.3)'}} />
                  <div style={{position:'absolute',left:'50%',bottom:-6,width:1,height:8,background:'rgba(34,211,238,0.3)'}} />
                </div>
                {/* CLASSIFIED watermark */}
                <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%) rotate(-15deg)',fontFamily:"'Orbitron', sans-serif",fontSize:36,color:'#22d3ee',opacity:0.03,letterSpacing:'0.3em',whiteSpace:'nowrap'}}>CLASSIFIED</div>
                {/* Label */}
                <div style={{position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',padding:'3px 12px',border:'1px solid rgba(34,211,238,0.2)',background:'rgba(5,10,24,0.7)',fontFamily:"'Press Start 2P', monospace",fontSize:7,color:'#22d3ee',letterSpacing:'0.15em',opacity:0.4,whiteSpace:'nowrap'}}>ZONE ACTIVE</div>
              </div>
            );
          case 'stock-market':
            return (
              <div className="theme-art-layer">
                {/* Green grid dots */}
                <div style={{position:'absolute',inset:0,background:'repeating-linear-gradient(0deg,transparent 0px,transparent 14px,rgba(16,185,129,0.04) 14px,rgba(16,185,129,0.04) 15px), repeating-linear-gradient(90deg,transparent 0px,transparent 29px,rgba(16,185,129,0.03) 29px,rgba(16,185,129,0.03) 30px)',opacity:0.6}} />
                {/* Ticker tape animation */}
                <div style={{position:'absolute',top:8,left:0,right:0,height:14,overflow:'hidden',opacity:0.25}}>
                  <div style={{display:'inline-block',whiteSpace:'nowrap',fontFamily:"'Source Code Pro', monospace",fontSize:8,color:'#10b981',animation:'ticker-scroll 18s linear infinite',willChange:'transform'}}>
                    {"$DOGE +42% \u25CF $MOON -12% \u25CF $YOLO +88% \u25CF $HODL -5% \u25CF $STONK +120% \u25CF $DOGE +42% \u25CF $MOON -12% \u25CF $YOLO +88% \u25CF "}
                  </div>
                </div>
                {/* WALL ST label */}
                <div style={{position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',padding:'3px 12px',border:'1px solid rgba(16,185,129,0.2)',background:'rgba(0,0,0,0.7)',fontFamily:"'Press Start 2P', monospace",fontSize:7,color:'#10b981',letterSpacing:'0.15em',opacity:0.4,whiteSpace:'nowrap'}}>WALL ST</div>
              </div>
            );
          default:
            return null;
        }
      }, [modeId]);
      return art;
    }

    function VerdictReveal({ text, isWinner }) {
      return (
        <motion.div
          initial={{ scale: 2.5, opacity: 0, filter: "blur(20px)", y: -30 }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ type: "spring", stiffness: 50, damping: 10, mass: 1.5 }}
          className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
        >
          {text}
        </motion.div>
      );
    }

    function ModeHeader({ result, done, pendingText, pendingSummary }) {
      const isWinner = result.selectionGoal === "winner";
      const isTie = result.isTie;
      return (
        <div className={`mode-header-bg relative overflow-hidden bg-gradient-to-r px-6 py-6 text-white ${MODE_META.find((mode) => mode.id === result.modeId)?.accent ?? "from-slate-700 to-slate-900"}`}>
          {done && isTie ? <TieAnimation tiedNames={result.tiedNames} /> : null}
          {done && !isTie && isWinner ? <Celebration /> : null}
          {done && !isTie && !isWinner ? <SadOverlay /> : null}
          <div className="relative z-10">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">{result.modeName}</div>
            {done
              ? <VerdictReveal text={result.headline} isWinner={isTie ? false : isWinner} />
              : <div className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{pendingText}</div>
            }
            <div className="mt-3 max-w-2xl text-white/90">{done ? result.summary : pendingSummary}</div>
          </div>
        </div>
      );
    }


const SUITS = ["s", "h", "d", "c"];
const SUIT_SYMBOLS = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_NAMES = { s: "Spade", h: "Heart", d: "Diamond", c: "Club" };
const RANK_LABELS = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};
const RANK_WORDS = {
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
  10: "Ten",
  11: "Jack",
  12: "Queen",
  13: "King",
  14: "Ace",
};
const RANK_PLURALS = {
  2: "Twos",
  3: "Threes",
  4: "Fours",
  5: "Fives",
  6: "Sixes",
  7: "Sevens",
  8: "Eights",
  9: "Nines",
  10: "Tens",
  11: "Jacks",
  12: "Queens",
  13: "Kings",
  14: "Aces",
};
const WHEEL_COLORS = ["#60a5fa", "#f472b6", "#f59e0b", "#34d399", "#a78bfa", "#fb923c", "#22d3ee", "#f87171"];
const SLOT_SYMBOLS = ["🍒", "🍋", "⭐", "🍀", "🔔", "7️⃣"];
const SLOT_WEIGHTS = {
  "🍒": 2,
  "🍋": 3,
  "⭐": 4,
  "🍀": 5,
  "🔔": 6,
  "7️⃣": 7,
};
const HORSE_EMOJIS = ["🐎", "🦄", "🐴", "🏇"];

const MODE_META = [
  {
    id: "holdem",
    name: "Texas Hold’em",
    icon: "🃏",
    blurb: "2 hole cards, board flips, weakest hand loses.",
    accent: "from-sky-500 to-blue-600",
    cardHint: "card-hint-holdem",
    themeClass: "theme-holdem",
    resultWin: "ROYAL FLUSH",
    resultLose: "MUCKED",
  },
  {
    id: "plo",
    name: "PLO",
    icon: "🂠",
    blurb: "4 hole cards, Omaha rules, full showdown.",
    accent: "from-violet-500 to-fuchsia-600",
    cardHint: "card-hint-plo",
    themeClass: "theme-plo",
    resultWin: "NUTS",
    resultLose: "GLITCHED",
  },
  {
    id: "rng",
    name: "Random Number",
    icon: "#️⃣",
    blurb: "Dramatic number reveal. Lowest loses.",
    accent: "from-emerald-500 to-green-600",
    cardHint: "card-hint-rng",
    themeClass: "theme-rng",
    resultWin: "OVERFLOW",
    resultLose: "NULL",
  },
  {
    id: "wheel",
    name: "Wheel Spinner",
    icon: "🎡",
    blurb: "Spin the wheel of doom.",
    accent: "from-orange-500 to-amber-600",
    cardHint: "card-hint-wheel",
    themeClass: "theme-wheel",
    resultWin: "JACKPOT",
    resultLose: "BANKRUPT",
  },
  {
    id: "dice",
    name: "Dice Duel",
    icon: "🎲",
    blurb: "Roll 2d6. Lowest total gets picked.",
    accent: "from-rose-500 to-red-600",
    cardHint: "card-hint-dice",
    themeClass: "theme-dice",
    resultWin: "VICTORIOUS",
    resultLose: "DEFEATED",
  },
  {
    id: "high-card",
    name: "High Card",
    icon: "🂡",
    blurb: "One card each. Lowest rank loses.",
    accent: "from-cyan-500 to-sky-600",
    cardHint: "card-hint-high-card",
    themeClass: "theme-high-card",
    resultWin: "FASTEST DRAW",
    resultLose: "OUTDRAWN",
  },
  {
    id: "coin-flips",
    name: "Coin Gauntlet",
    icon: "🪙",
    blurb: "5 flips. Fewest heads gets stuck.",
    accent: "from-yellow-500 to-orange-500",
    cardHint: "card-hint-coin-flips",
    themeClass: "theme-coin-flips",
    resultWin: "TREASURE FOUND",
    resultLose: "WALKED THE PLANK",
  },
  {
    id: "black-marble",
    name: "Black Marble",
    icon: "🔮",
    blurb: "Draw until someone hits the black one.",
    accent: "from-slate-700 to-slate-900",
    cardHint: "card-hint-black-marble",
    themeClass: "theme-black-marble",
    resultWin: "FATE FAVORS",
    resultLose: "CURSED",
  },
  {
    id: "slots",
    name: "Slot Machine",
    icon: "🎰",
    blurb: "Casino reels. Worst combo loses.",
    accent: "from-pink-500 to-rose-600",
    cardHint: "card-hint-slots",
    themeClass: "theme-slots",
    resultWin: "TRIPLE SEVENS",
    resultLose: "BUST",
  },
  {
    id: "horse-race",
    name: "Horse Race",
    icon: "🏇",
    blurb: "12 random turns on the track.",
    accent: "from-lime-500 to-emerald-600",
    cardHint: "card-hint-horse-race",
    themeClass: "theme-horse-race",
    resultWin: "PHOTO FINISH",
    resultLose: "LAST PLACE",
  },
  {
    id: "rocket",
    name: "Rocket Launch",
    icon: "🚀",
    blurb: "Launch into space. Last rocket flying wins.",
    accent: "from-indigo-500 to-violet-700",
    cardHint: "card-hint-rocket",
    themeClass: "theme-rocket",
    resultWin: "ORBIT ACHIEVED",
    resultLose: "BURNED UP",
  },
  {
    id: "space-invaders",
    name: "Space Invaders",
    icon: "👾",
    blurb: "Aliens descend. Laser fires. Last one standing.",
    accent: "from-green-500 to-emerald-700",
    cardHint: "card-hint-space-invaders",
    themeClass: "theme-space-invaders",
    resultWin: "LAST ALIEN",
    resultLose: "VAPORIZED",
  },
  {
    id: "bomb",
    name: "Bomb",
    icon: "💣",
    blurb: "Hot potato. Don't hold it when it blows.",
    accent: "from-red-600 to-orange-500",
    cardHint: "card-hint-bomb",
    themeClass: "theme-bomb",
    resultWin: "SURVIVED",
    resultLose: "DETONATED",
  },
  {
    id: "plinko",
    name: "Plinko",
    icon: "📍",
    blurb: "Drop the ball. Watch it bounce. Pray.",
    accent: "from-pink-500 to-amber-500",
    cardHint: "card-hint-plinko",
    themeClass: "theme-plinko",
    resultWin: "JACKPOT",
    resultLose: "GUTTER",
  },
  {
    id: "battle-royale",
    name: "Battle Royale",
    icon: "🎯",
    blurb: "Zone shrinks. Players drop. Last one in wins.",
    accent: "from-cyan-400 to-blue-800",
    cardHint: "card-hint-battle-royale",
    themeClass: "theme-battle-royale",
    resultWin: "VICTORY ROYALE",
    resultLose: "ELIMINATED",
  },
  {
    id: "stock-market",
    name: "Stock Market",
    icon: "📈",
    blurb: "Invest. Pray. Watch the charts.",
    accent: "from-emerald-400 to-red-500",
    cardHint: "card-hint-stock-market",
    themeClass: "theme-stock-market",
    resultWin: "TO THE MOON",
    resultLose: "LIQUIDATED",
  },
];

function startTimeout(seconds, onTimeout) {
  const deadline = Date.now() + seconds * 1000;
  const timer = setTimeout(onTimeout, seconds * 1000);
  return { deadline, timer, clear: () => clearTimeout(timer) };
}

function secureRandomInt(max) {
  if (max <= 0) return 0;
  const maxUint = 0x100000000;
  const limit = maxUint - (maxUint % max);
  const arr = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(arr);
    value = arr[0];
  } while (value >= limit);
  return value % max;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom(items) {
  return items[secureRandomInt(items.length)];
}

function compareScores(a, b) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) return left - right;
  }
  return 0;
}

function combinations(items, size) {
  const results = [];
  const current = [];

  function walk(start, depth) {
    if (depth === size) {
      results.push([...current]);
      return;
    }
    for (let i = start; i <= items.length - (size - depth); i += 1) {
      current.push(items[i]);
      walk(i + 1, depth + 1);
      current.pop();
    }
  }

  walk(0, 0);
  return results;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rankLabel(rank) {
  return RANK_LABELS[rank];
}

function rankWord(rank) {
  return RANK_WORDS[rank];
}

function rankPlural(rank) {
  return RANK_PLURALS[rank];
}

function formatCard(card) {
  return `${rankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}`;
}

function cardKey(card) {
  return `${rankLabel(card.rank)}${card.suit}`;
}

function createDeck() {
  const deck = [];
  for (let rank = 2; rank <= 14; rank += 1) {
    for (const suit of SUITS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function straightHigh(ranksDesc) {
  if (ranksDesc.length !== 5) return null;
  const wheel = [14, 5, 4, 3, 2];
  if (wheel.every((rank, index) => ranksDesc[index] === rank)) return 5;
  for (let i = 1; i < ranksDesc.length; i += 1) {
    if (ranksDesc[i - 1] - 1 !== ranksDesc[i]) return null;
  }
  return ranksDesc[0];
}

function describeHand(score, cards) {
  const category = score[0];
  if (category === 8) return `Straight flush, ${rankWord(score[1])} high`;
  if (category === 7) return `Four of a kind, ${rankPlural(score[1])}`;
  if (category === 6) return `Full house, ${rankPlural(score[1])} over ${rankPlural(score[2])}`;
  if (category === 5) return `${SUIT_NAMES[cards[0].suit]} flush, ${rankWord(score[1])} high`;
  if (category === 4) return `Straight, ${rankWord(score[1])} high`;
  if (category === 3) return `Three of a kind, ${rankPlural(score[1])}`;
  if (category === 2) return `Two pair, ${rankPlural(score[1])} and ${rankPlural(score[2])}`;
  if (category === 1) return `Pair of ${rankPlural(score[1])}`;
  return `High card, ${rankWord(score[1])}`;
}

function evaluateFive(cards) {
  const ranksDesc = cards.map((card) => card.rank).sort((a, b) => b - a);
  const counts = {};
  ranksDesc.forEach((rank) => {
    counts[rank] = (counts[rank] || 0) + 1;
  });

  const groups = Object.entries(counts)
    .map(([rank, count]) => ({ rank: Number(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  const flush = cards.every((card) => card.suit === cards[0].suit);
  const uniqueRanksDesc = [...new Set(ranksDesc)].sort((a, b) => b - a);
  const straight = straightHigh(uniqueRanksDesc);

  if (flush && straight) {
    const score = [8, straight];
    return { score, label: describeHand(score, cards), cards };
  }

  if (groups[0].count === 4) {
    const score = [7, groups[0].rank, groups[1].rank];
    return { score, label: describeHand(score, cards), cards };
  }

  if (groups[0].count === 3 && groups[1]?.count === 2) {
    const score = [6, groups[0].rank, groups[1].rank];
    return { score, label: describeHand(score, cards), cards };
  }

  if (flush) {
    const score = [5, ...ranksDesc];
    return { score, label: describeHand(score, cards), cards };
  }

  if (straight) {
    const score = [4, straight];
    return { score, label: describeHand(score, cards), cards };
  }

  if (groups[0].count === 3) {
    const kickers = groups.slice(1).map((group) => group.rank).sort((a, b) => b - a);
    const score = [3, groups[0].rank, ...kickers];
    return { score, label: describeHand(score, cards), cards };
  }

  if (groups[0].count === 2 && groups[1]?.count === 2) {
    const pairRanks = groups
      .filter((group) => group.count === 2)
      .map((group) => group.rank)
      .sort((a, b) => b - a);
    const kicker = groups.find((group) => group.count === 1)?.rank ?? 0;
    const score = [2, pairRanks[0], pairRanks[1], kicker];
    return { score, label: describeHand(score, cards), cards };
  }

  if (groups[0].count === 2) {
    const kickers = groups.filter((group) => group.count === 1).map((group) => group.rank).sort((a, b) => b - a);
    const score = [1, groups[0].rank, ...kickers];
    return { score, label: describeHand(score, cards), cards };
  }

  const score = [0, ...ranksDesc];
  return { score, label: describeHand(score, cards), cards };
}

function bestHoldemHand(holeCards, board) {
  const sevenCards = [...holeCards, ...board];
  let best = null;
  for (const combo of combinations(sevenCards, 5)) {
    const evaluated = evaluateFive(combo);
    if (!best || compareScores(evaluated.score, best.score) > 0) {
      best = evaluated;
    }
  }
  return best;
}

function bestPloHand(holeCards, board) {
  const holeCombos = combinations(holeCards, 2);
  const boardCombos = combinations(board, 3);
  let best = null;

  for (const holeCombo of holeCombos) {
    for (const boardCombo of boardCombos) {
      const evaluated = evaluateFive([...holeCombo, ...boardCombo]);
      if (!best || compareScores(evaluated.score, best.score) > 0) {
        best = evaluated;
      }
    }
  }

  return best;
}

function findTiedByGoal(participants, getScore, selectionGoal = "loser") {
  let tied = [participants[0]];
  let targetScore = getScore(participants[0]);

  for (const participant of participants.slice(1)) {
    const score = getScore(participant);
    const comparison = compareScores(score, targetScore);
    const shouldReplace = selectionGoal === "winner" ? comparison > 0 : comparison < 0;
    if (shouldReplace) {
      targetScore = score;
      tied = [participant];
    } else if (comparison === 0) {
      tied.push(participant);
    }
  }

  return tied;
}

function calculatePokerPercentages(players, partialBoard, selectionGoal, evaluator) {
  const usedCards = new Set(
    [...partialBoard, ...players.flatMap((player) => player.holeCards)].map((card) => cardKey(card))
  );
  const remainingDeck = createDeck().filter((card) => !usedCards.has(cardKey(card)));
  const missingBoardCards = 5 - partialBoard.length;
  const exact = missingBoardCards <= 2;
  const runouts = exact
    ? combinations(remainingDeck, missingBoardCards)
    : Array.from({ length: missingBoardCards === 5 ? 1500 : 1200 }, () => shuffle(remainingDeck).slice(0, missingBoardCards));

  const selectionShares = Object.fromEntries(players.map((player) => [player.name, 0]));

  runouts.forEach((runout) => {
    const board = [...partialBoard, ...runout];
    const evaluated = players.map((player) => ({
      name: player.name,
      score: evaluator(player.holeCards, board).score,
    }));
    const tied = findTiedByGoal(evaluated, (player) => player.score, selectionGoal);
    tied.forEach((player) => {
      selectionShares[player.name] += 1 / tied.length;
    });
  });

  const denominator = runouts.length || 1;
  return {
    byPlayer: Object.fromEntries(
      players.map((player) => [player.name, Number(((selectionShares[player.name] / denominator) * 100).toFixed(1))])
    ),
    method: exact ? (missingBoardCards === 0 ? "Locked" : "Exact") : `Sim • ${runouts.length}`,
  };
}

function describeHoldemStartingHand(holeCards) {
  const sorted = [...holeCards].sort((a, b) => b.rank - a.rank);
  if (sorted[0].rank === sorted[1].rank) {
    return `Pair of ${rankPlural(sorted[0].rank)}`;
  }
  return `High card, ${rankWord(sorted[0].rank)}`;
}

function getCurrentHoldemHandLabel(holeCards, visibleBoard) {
  if (visibleBoard.length === 0) {
    return describeHoldemStartingHand(holeCards);
  }
  return bestHoldemHand(holeCards, visibleBoard).label;
}

function getCurrentPloHandLabel(holeCards, visibleBoard) {
  if (visibleBoard.length < 3) {
    return "Need flop to make a hand";
  }
  return bestPloHand(holeCards, visibleBoard).label;
}

function resolveByGoal(participants, getScore, selectionGoal = "loser") {
  let tied = [participants[0]];
  let targetScore = getScore(participants[0]);

  for (const participant of participants.slice(1)) {
    const score = getScore(participant);
    const comparison = compareScores(score, targetScore);
    const shouldReplace = selectionGoal === "winner" ? comparison > 0 : comparison < 0;
    if (shouldReplace) {
      targetScore = score;
      tied = [participant];
    } else if (comparison === 0) {
      tied.push(participant);
    }
  }

  return {
    tied,
    picked: tied[secureRandomInt(tied.length)],
  };
}

function modeById(id) {
  return MODES.find((mode) => mode.id === id);
}

const WIN_MESSAGES = [
  "{name} is the man",
  "{name} is so back",
  "I want to grow up and be like {name}",
  "{name} could have my children",
  "I'd let {name} date my daughter",
  "{name} needed this",
  "{name} put in the call",
  "{name} woke up feeling dangerous",
  "{name} doesn't miss",
  "{name} is him",
  "{name} was simply built different today",
  "{name} owns this house now",
  "Everyone say thank you {name}",
  "{name} walked so we could run",
  "{name}'s mom would be so proud",
  "The prophecy spoke of {name}",
  "{name} is inevitable",
  "We are all witnesses. {name} is that guy",
  "{name} just different gravy",
  "Clear eyes, full hearts, {name} wins",
  "{name} with the plot armor",
  "{name} is carrying this friend group",
  "{name}'s aura is immaculate right now",
  "{name} chose violence and it worked",
  "{name} has earned the right to do nothing",
  "Somebody get {name} a throne",
  "{name} is the main character today",
  "{name} really said 'not today'",
  "{name} understood the assignment",
  "We don't deserve {name}",
];

const LOSE_MESSAGES = [
  "{name} is not the man",
  "{name} is a fish",
  "{name} down bad",
  "{name} fell off",
  "{name} is cooked",
  "Couldn't be {name} right now",
  "{name} took one for the team. Again.",
  "{name} in their flop era",
  "Someone check on {name}",
  "{name}'s vibes are off",
  "{name} was not him today",
  "{name} fumbled the bag",
  "Thoughts and prayers for {name}",
  "{name} is a liability",
  "{name} will remember this day",
  "{name} has been humbled",
  "Rest in peace {name}'s evening",
  "The universe said no to {name}",
  "{name} is giving quitter energy",
  "{name} caught a stray",
  "{name} needs to sit down and think about what they've done",
  "{name} really thought they had it",
  "{name} playing like they want to lose",
  "{name} and it's not even close",
  "Someone get {name} a tissue",
  "{name} is the weakest link. Goodbye.",
  "{name} couldn't beat a goldfish right now",
  "{name} owes everyone an apology",
  "This is a {name} intervention",
  "{name} just got sent to the shadow realm",
];

let _lastWinIdx = -1;
let _lastLoseIdx = -1;

function pickRandomMessage(messages, name, lastIdxRef) {
  let idx = secureRandomInt(messages.length);
  if (messages.length > 1) {
    while (idx === (lastIdxRef === "win" ? _lastWinIdx : _lastLoseIdx)) {
      idx = secureRandomInt(messages.length);
    }
  }
  if (lastIdxRef === "win") _lastWinIdx = idx;
  else _lastLoseIdx = idx;
  return messages[idx].replace(/\{name\}/g, name);
}

function buildOutcomeHeadline(selectedName, taskLabel, selectionGoal, modeName) {
  const msg = selectionGoal === "winner"
    ? pickRandomMessage(WIN_MESSAGES, selectedName, "win")
    : pickRandomMessage(LOSE_MESSAGES, selectedName, "lose");
  return msg;
}

function buildHoldemResult(names, taskLabel, selectionGoal) {
  const isInteractive = typeof window !== 'undefined' && window.__interactiveMode;

  if (isInteractive) {
    const deck = shuffle(createDeck());
    const draftHands = {};
    names.forEach(name => {
      draftHands[name] = [deck.pop(), deck.pop(), deck.pop(), deck.pop()]; // 4 cards, keep 2
    });
    const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    const modeName = "Texas Hold'em";

    return {
      modeId: "holdem",
      modeName,
      selectionGoal,
      draftPhase: true,
      draftHands,
      keepCount: 2,
      board,
      headline: "Drafting cards...",
      summary: "Players are choosing their hole cards.",
      selectedName: null,
      isTie: false,
      players: names.map(name => ({
        name,
        selected: false,
        holeCards: [],
        cards: [],
        headline: "Drafting...",
        subline: "Choosing cards",
        rank: 0,
        chips: ["Hold'em", "Draft"],
      })),
    };
  }

  const deck = shuffle(createDeck());
  const players = names.map((name) => ({
    name,
    holeCards: [deck.pop(), deck.pop()],
  }));
  const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];

  const evaluatedPlayers = players.map((player) => ({
    ...player,
    best: bestHoldemHand(player.holeCards, board),
  }));

  const resolution = resolveByGoal(evaluatedPlayers, (player) => player.best.score, selectionGoal);
  const tiedNames = resolution.tied.map((player) => player.name);
  const hasTie = tiedNames.length > 1;
  const selectedName = hasTie ? null : resolution.picked.name;
  const choosingWinner = selectionGoal === "winner";
  const pokerPercentages = {
    preflop: calculatePokerPercentages(players, [], selectionGoal, bestHoldemHand),
    flop: calculatePokerPercentages(players, board.slice(0, 3), selectionGoal, bestHoldemHand),
    turn: calculatePokerPercentages(players, board.slice(0, 4), selectionGoal, bestHoldemHand),
    river: calculatePokerPercentages(players, board, selectionGoal, bestHoldemHand),
  };

  const modeName = "Texas Hold'em";
  return {
    modeId: "holdem",
    modeName,
    selectionGoal,
    selectedName,
    isTie: hasTie,
    tiedNames: hasTie ? tiedNames : undefined,
    headline: hasTie ? "IT'S A TIE" : buildOutcomeHeadline(selectedName, taskLabel, selectionGoal, modeName),
    summary: hasTie
      ? `${tiedNames.join(" and ")} tied with the same ${choosingWinner ? "best" : "worst"} hand!`
      : `${choosingWinner ? "Strongest" : "Weakest"} showdown hand gets selected.`,
    board,
    pokerPercentages,
    players: evaluatedPlayers.map((player) => {
      const isTied = hasTie && tiedNames.includes(player.name);
      return {
        name: player.name,
        cards: player.holeCards,
        headline: player.best.label,
        subline: hasTie
          ? (isTied ? "TIED" : "Safe this round")
          : (player.name === selectedName ? `Selected with the ${choosingWinner ? "best" : "worst"} hand` : "Safe this round"),
        selected: hasTie ? false : player.name === selectedName,
        tied: isTied,
        chips: ["Hold'em", "2 hole cards"],
      };
    }),
  };
}

function buildPloResult(names, taskLabel, selectionGoal) {
  const isInteractive = typeof window !== 'undefined' && window.__interactiveMode;

  if (isInteractive) {
    const deck = shuffle(createDeck());
    const draftHands = {};
    names.forEach(name => {
      draftHands[name] = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()]; // 6 cards, keep 4
    });
    const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    const modeName = "PLO";

    return {
      modeId: "plo",
      modeName,
      selectionGoal,
      draftPhase: true,
      draftHands,
      keepCount: 4,
      board,
      headline: "Drafting cards...",
      summary: "Players are choosing their hole cards.",
      selectedName: null,
      isTie: false,
      players: names.map(name => ({
        name,
        selected: false,
        holeCards: [],
        cards: [],
        headline: "Drafting...",
        subline: "Choosing cards",
        rank: 0,
        chips: ["Omaha", "Draft"],
      })),
    };
  }

  const deck = shuffle(createDeck());
  const players = names.map((name) => ({
    name,
    holeCards: [deck.pop(), deck.pop(), deck.pop(), deck.pop()],
  }));
  const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];

  const evaluatedPlayers = players.map((player) => ({
    ...player,
    best: bestPloHand(player.holeCards, board),
  }));

  const resolution = resolveByGoal(evaluatedPlayers, (player) => player.best.score, selectionGoal);
  const tiedNames = resolution.tied.map((player) => player.name);
  const hasTie = tiedNames.length > 1;
  const selectedName = hasTie ? null : resolution.picked.name;
  const choosingWinner = selectionGoal === "winner";
  const pokerPercentages = {
    preflop: calculatePokerPercentages(players, [], selectionGoal, bestPloHand),
    flop: calculatePokerPercentages(players, board.slice(0, 3), selectionGoal, bestPloHand),
    turn: calculatePokerPercentages(players, board.slice(0, 4), selectionGoal, bestPloHand),
    river: calculatePokerPercentages(players, board, selectionGoal, bestPloHand),
  };

  const modeName = "PLO";
  return {
    modeId: "plo",
    modeName,
    selectionGoal,
    selectedName,
    isTie: hasTie,
    tiedNames: hasTie ? tiedNames : undefined,
    headline: hasTie ? "IT'S A TIE" : buildOutcomeHeadline(selectedName, taskLabel, selectionGoal, modeName),
    summary: hasTie
      ? `${tiedNames.join(" and ")} tied with the same ${choosingWinner ? "best" : "worst"} Omaha hand!`
      : `${choosingWinner ? "Strongest" : "Weakest"} PLO showdown hand gets selected.`,
    board,
    pokerPercentages,
    players: evaluatedPlayers.map((player) => {
      const isTied = hasTie && tiedNames.includes(player.name);
      return {
        name: player.name,
        cards: player.holeCards,
        headline: player.best.label,
        subline: hasTie
          ? (isTied ? "TIED" : "Safe this round")
          : (player.name === selectedName ? `Selected with the ${choosingWinner ? "best" : "worst"} Omaha hand` : "Safe this round"),
        selected: hasTie ? false : player.name === selectedName,
        tied: isTied,
        chips: ["Omaha", "4 hole cards"],
      };
    }),
  };
}

function finalizeDraftResult(draftResult, playerChoices) {
  const board = draftResult.board;
  const isOmaha = draftResult.modeId === 'plo';
  const evaluator = isOmaha ? bestPloHand : bestHoldemHand;
  const selectionGoal = draftResult.selectionGoal;

  const evaluatedPlayers = Object.entries(playerChoices).map(([name, indices]) => {
    const holeCards = indices.map(i => draftResult.draftHands[name][i]);
    return {
      name,
      holeCards,
      best: evaluator(holeCards, board),
    };
  });

  const resolution = resolveByGoal(evaluatedPlayers, p => p.best.score, selectionGoal);
  const selectedName = resolution.picked.name;
  const tiedNames = resolution.tied.map(p => p.name);
  const choosingWinner = selectionGoal === "winner";
  const isTie = tiedNames.length > 1;

  // Calculate percentages
  const playersForCalc = evaluatedPlayers.map(p => ({
    name: p.name,
    holeCards: p.holeCards,
  }));
  const pokerPercentages = {
    preflop: calculatePokerPercentages(playersForCalc, [], selectionGoal, evaluator),
    flop: calculatePokerPercentages(playersForCalc, board.slice(0, 3), selectionGoal, evaluator),
    turn: calculatePokerPercentages(playersForCalc, board.slice(0, 4), selectionGoal, evaluator),
    river: calculatePokerPercentages(playersForCalc, board, selectionGoal, evaluator),
  };

  const modeName = isOmaha ? "PLO" : "Texas Hold'em";

  const headline = isTie ? "IT'S A TIE" : pickRandomMessage(
    selectionGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
    selectedName,
    selectionGoal === "winner" ? "win" : "lose"
  );

  return {
    modeId: draftResult.modeId,
    modeName,
    selectionGoal,
    selectedName: isTie ? null : selectedName,
    isTie,
    tiedNames: isTie ? tiedNames : undefined,
    headline,
    summary: isTie
      ? `${tiedNames.join(" and ")} tied with the same ${choosingWinner ? "best" : "worst"} hand!`
      : `${choosingWinner ? "Strongest" : "Weakest"} showdown hand gets selected.`,
    board,
    pokerPercentages,
    draftPhase: false,
    players: evaluatedPlayers.map(p => ({
      name: p.name,
      cards: p.holeCards,
      holeCards: p.holeCards,
      headline: p.best.label,
      subline: isTie
        ? (tiedNames.includes(p.name) ? "TIED" : "Safe this round")
        : (p.name === selectedName ? `Selected with the ${choosingWinner ? "best" : "worst"} hand` : "Safe this round"),
      selected: !isTie && p.name === selectedName,
      tied: isTie && tiedNames.includes(p.name),
      chips: [isOmaha ? "Omaha" : "Hold'em", `${isOmaha ? 4 : 2} hole cards`],
    })),
  };
}

function buildRngResult(names, taskLabel, selectionGoal) {
  const players = names.map((name) => ({
    name,
    value: secureRandomInt(100) + 1,
  }));
  const resolution = resolveByGoal(players, (player) => [player.value], selectionGoal);
  const tiedNames = resolution.tied.map((player) => player.name);
  const hasTie = tiedNames.length > 1;
  const selectedName = hasTie ? null : resolution.picked.name;
  const choosingWinner = selectionGoal === "winner";

  const modeName = "Random Number";
  return {
    modeId: "rng",
    modeName,
    selectionGoal,
    selectedName,
    isTie: hasTie,
    tiedNames: hasTie ? tiedNames : undefined,
    headline: hasTie ? "IT'S A TIE" : buildOutcomeHeadline(selectedName, taskLabel, selectionGoal, modeName),
    summary: hasTie
      ? `${tiedNames.join(" and ")} rolled the same number!`
      : `Everyone got a number from 1 to 100. ${choosingWinner ? "Highest" : "Lowest"} number gets selected.`,
    players: players.map((player) => {
      const isTied = hasTie && tiedNames.includes(player.name);
      return {
        name: player.name,
        value: player.value,
        headline: `${player.value}`,
        subline: hasTie
          ? (isTied ? "TIED" : "Not selected")
          : (player.name === selectedName ? `${choosingWinner ? "Highest" : "Lowest"} number` : "Not selected"),
        selected: hasTie ? false : player.name === selectedName,
        tied: isTied,
        chips: ["1\u2013100"],
      };
    }),
  };
}

function buildWheelResult(names, taskLabel, selectionGoal, currentRotation) {
  const selectedName = pickRandom(names);
  const selectedIndex = names.indexOf(selectedName);
  const segment = 360 / names.length;
  const segmentCenter = selectedIndex * segment + segment / 2;
  const extraTurns = 5 + secureRandomInt(4);
  const nextRotation = currentRotation + extraTurns * 360 + (360 - segmentCenter);
  const choosingWinner = selectionGoal === "winner";

  const modeName = "Wheel Spinner";
  return {
    modeId: "wheel",
    modeName,
    selectionGoal,
    selectedName,
    headline: buildOutcomeHeadline(selectedName, taskLabel, selectionGoal, modeName),
    summary: `Pure wheel-of-fate chaos. The wheel randomly picks the ${choosingWinner ? "winner" : "loser"}.`,
    wheel: {
      names,
      rotation: nextRotation,
    },
    players: names.map((name) => ({
      name,
      headline: name === selectedName ? "Wheel landed here" : "Missed by fate",
      subline: name === selectedName ? `Selected as ${choosingWinner ? "winner" : "loser"}` : "Safe this round",
      selected: name === selectedName,
      chips: [`${Math.round(100 / names.length)}% slice`],
    })),
  };
}

function buildDiceResult(names, taskLabel, selectionGoal) {
  const players = names.map((name) => {
    const d1 = secureRandomInt(6) + 1;
    const d2 = secureRandomInt(6) + 1;
    return {
      name,
      d1,
      d2,
      total: d1 + d2,
    };
  });
  const resolution = resolveByGoal(players, (player) => [player.total, player.d1, player.d2], selectionGoal);
  const tiedNames = resolution.tied.map((player) => player.name);
  const hasTie = tiedNames.length > 1;
  const selectedName = hasTie ? null : resolution.picked.name;
  const choosingWinner = selectionGoal === "winner";

  const modeName = "Dice Duel";
  return {
    modeId: "dice",
    modeName,
    selectionGoal,
    selectedName,
    isTie: hasTie,
    tiedNames: hasTie ? tiedNames : undefined,
    headline: hasTie ? "IT'S A TIE" : buildOutcomeHeadline(selectedName, taskLabel, selectionGoal, modeName),
    summary: hasTie
      ? `${tiedNames.join(" and ")} rolled the same total!`
      : `Two dice each. ${choosingWinner ? "Highest" : "Lowest"} total gets selected.`,
    players: players.map((player) => {
      const isTied = hasTie && tiedNames.includes(player.name);
      return {
        name: player.name,
        d1: player.d1,
        d2: player.d2,
        total: player.total,
        headline: `${player.d1} + ${player.d2} = ${player.total}`,
        subline: hasTie
          ? (isTied ? "TIED" : "Not selected")
          : (player.name === selectedName ? `${choosingWinner ? "Highest" : "Lowest"} roll` : "Not selected"),
        selected: hasTie ? false : player.name === selectedName,
        tied: isTied,
        chips: ["2d6"],
      };
    }),
  };
}

function buildHighCardResult(names, taskLabel, selectionGoal) {
  const isInteractive = typeof window !== 'undefined' && window.__interactiveMode;

  if (isInteractive) {
    const deck = shuffle(createDeck());
    const draftHands = {};
    names.forEach(name => {
      draftHands[name] = [deck.pop(), deck.pop(), deck.pop()];
    });

    return {
      modeId: "high-card",
      modeName: "High Card Draw",
      selectionGoal,
      draftPhase: true,
      draftHands,
      selectedName: null,
      isTie: false,
      headline: "Pick a card...",
      summary: "Players are choosing their card blind.",
      players: names.map(name => ({
        name,
        selected: false,
        headline: "Picking...",
        subline: "",
        rank: 0,
        chips: [],
      })),
    };
  }

  const deck = shuffle(createDeck());
  const players = names.map((name) => ({
    name,
    card: deck.pop(),
  }));
  const resolution = resolveByGoal(players, (player) => [player.card.rank], selectionGoal);
  const tiedNames = resolution.tied.map((player) => player.name);
  const hasTie = tiedNames.length > 1;
  const selectedName = hasTie ? null : resolution.picked.name;
  const choosingWinner = selectionGoal === "winner";

  const modeName = "High Card Draw";
  return {
    modeId: "high-card",
    modeName,
    selectionGoal,
    selectedName,
    isTie: hasTie,
    tiedNames: hasTie ? tiedNames : undefined,
    headline: hasTie ? "IT'S A TIE" : buildOutcomeHeadline(selectedName, taskLabel, selectionGoal, modeName),
    summary: hasTie
      ? `${tiedNames.join(" and ")} drew the same rank!`
      : `Everyone drew one card. ${choosingWinner ? "Highest" : "Lowest"} rank gets selected.`,
    players: players.map((player) => {
      const isTied = hasTie && tiedNames.includes(player.name);
      return {
        name: player.name,
        cards: [player.card],
        card: player.card,
        headline: formatCard(player.card),
        subline: hasTie
          ? (isTied ? "TIED" : "Not selected")
          : (player.name === selectedName ? `${choosingWinner ? "Highest" : "Lowest"} card` : "Not selected"),
        selected: hasTie ? false : player.name === selectedName,
        tied: isTied,
        chips: [rankWord(player.card.rank)],
      };
    }),
  };
}

function buildCoinFlipResult(names, taskLabel, selectionGoal) {
  const players = names.map((name) => {
    const flips = Array.from({ length: 5 }, () => (secureRandomInt(2) === 0 ? "T" : "H"));
    const heads = flips.filter((flip) => flip === "H").length;
    return { name, flips, heads };
  });
  const resolution = resolveByGoal(players, (player) => [player.heads], selectionGoal);
  const tiedNames = resolution.tied.map((player) => player.name);
  const hasTie = tiedNames.length > 1;
  const selectedName = hasTie ? null : resolution.picked.name;
  const choosingWinner = selectionGoal === "winner";

  const modeName = "Coin Flip Gauntlet";
  return {
    modeId: "coin-flips",
    modeName,
    selectionGoal,
    selectedName,
    isTie: hasTie,
    tiedNames: hasTie ? tiedNames : undefined,
    headline: hasTie ? "IT'S A TIE" : buildOutcomeHeadline(selectedName, taskLabel, selectionGoal, modeName),
    summary: hasTie
      ? `${tiedNames.join(" and ")} flipped the same number of heads!`
      : `Five flips each. ${choosingWinner ? "Most" : "Fewest"} heads gets selected.`,
    players: players.map((player) => {
      const isTied = hasTie && tiedNames.includes(player.name);
      return {
        name: player.name,
        flips: player.flips,
        heads: player.heads,
        headline: `${player.flips.join(" ")}`,
        subline: hasTie
          ? `${player.heads} heads${isTied ? " \u2022 TIED" : ""}`
          : `${player.heads} heads${player.name === selectedName ? ` \u2022 ${choosingWinner ? "most" : "fewest"} total` : ""}`,
        selected: hasTie ? false : player.name === selectedName,
        tied: isTied,
        chips: ["5 flips"],
      };
    }),
  };
}

function buildBlackMarbleResult(names, taskLabel, selectionGoal) {
  const choosingWinner = selectionGoal === "winner";
  const targetMarble = choosingWinner ? "Gold" : "Black";
  const safeMarble = choosingWinner ? "Black" : "White";
  const bag = shuffle([...Array(names.length - 1).fill(safeMarble), targetMarble]);
  const order = shuffle(names);
  const selectedName = order[bag.indexOf(targetMarble)];
  const modeName = choosingWinner ? "Gold Marble" : "Black Marble";

  return {
    modeId: "black-marble",
    modeName,
    selectionGoal,
    selectedName,
    headline: buildOutcomeHeadline(selectedName, taskLabel, selectionGoal, modeName),
    summary: choosingWinner
      ? "One gold marble, three black marbles. Lucky draw picks the winner."
      : "Three safe marbles. One black marble. Bad luck decides everything.",
    players: order.map((name, index) => ({
      name,
      marble: bag[index],
      headline: `${bag[index]} marble`,
      subline: `Draw #${index + 1}${name === selectedName ? ` • ${choosingWinner ? "lucky" : "unlucky"} draw` : " • safe"}`,
      selected: name === selectedName,
      chips: [bag[index]],
    })),
  };
}

function scoreSlots(reels) {
  const counts = {};
  reels.forEach((symbol) => {
    counts[symbol] = (counts[symbol] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || SLOT_WEIGHTS[b[0]] - SLOT_WEIGHTS[a[0]]);
  const topSymbol = entries[0][0];
  const topCount = entries[0][1];
  const base = reels.reduce((sum, symbol) => sum + SLOT_WEIGHTS[symbol], 0);
  if (topCount === 3) return { value: 100 + SLOT_WEIGHTS[topSymbol], label: `Triple ${topSymbol}` };
  if (topCount === 2) return { value: 50 + SLOT_WEIGHTS[topSymbol] + base / 100, label: `Pair of ${topSymbol}` };
  return { value: base, label: "No match" };
}

function buildSlotsResult(names, taskLabel, selectionGoal) {
  const players = names.map((name) => {
    const reels = Array.from({ length: 3 }, () => pickRandom(SLOT_SYMBOLS));
    const score = scoreSlots(reels);
    return { name, reels, score };
  });
  const resolution = resolveByGoal(players, (player) => [player.score.value], selectionGoal);
  const tiedNames = resolution.tied.map((player) => player.name);
  const hasTie = tiedNames.length > 1;
  const selectedName = hasTie ? null : resolution.picked.name;
  const choosingWinner = selectionGoal === "winner";

  const modeName = "Slot Machine";
  return {
    modeId: "slots",
    modeName,
    selectionGoal,
    selectedName,
    isTie: hasTie,
    tiedNames: hasTie ? tiedNames : undefined,
    headline: hasTie ? "IT'S A TIE" : buildOutcomeHeadline(selectedName, taskLabel, selectionGoal, modeName),
    summary: hasTie
      ? `${tiedNames.join(" and ")} hit the same slot score!`
      : `${choosingWinner ? "Best" : "Worst"} slot score gets selected.`,
    players: players.map((player) => {
      const isTied = hasTie && tiedNames.includes(player.name);
      return {
        name: player.name,
        reels: player.reels,
        score: player.score,
        headline: `${player.reels.join(" ")}`,
        subline: hasTie
          ? `${player.score.label}${isTied ? " \u2022 TIED" : ""}`
          : `${player.score.label}${player.name === selectedName ? ` \u2022 ${choosingWinner ? "best" : "worst"} score` : ""}`,
        selected: hasTie ? false : player.name === selectedName,
        tied: isTied,
        chips: [player.score.label],
      };
    }),
  };
}

function buildHorseRaceResult(names, taskLabel, selectionGoal) {
  const isInteractive = typeof window !== 'undefined' && window.__interactiveMode;

  if (isInteractive) {
    // Build race data but enter draft phase for lane picks
    const LANE_NAMES = ['\uD83C\uDFC7 Lane 1', '\uD83C\uDFC7 Lane 2', '\uD83C\uDFC7 Lane 3', '\uD83C\uDFC7 Lane 4', '\uD83C\uDFC7 Lane 5', '\uD83C\uDFC7 Lane 6'].slice(0, Math.max(names.length, 3));

    const positions = Object.fromEntries(names.map((name) => [name, 0]));
    const turns = [];
    for (let turn = 1; turn <= 12; turn += 1) {
      const mover = pickRandom(names);
      positions[mover] += 1;
      turns.push({ turn, mover, positions: { ...positions }, text: 'Turn ' + turn + ': ' + mover + ' advances to ' + positions[mover] });
    }

    const players = names.map((name) => ({
      name,
      position: positions[name],
      progress: positions[name],
    }));

    return {
      modeId: "horse-race",
      modeName: "Lucky Horse Race",
      selectionGoal,
      draftPhase: true,
      lanes: LANE_NAMES,
      lanePickOrder: shuffle([...names]),
      turns,
      race: { max: Math.max(...players.map(p => p.position), 1) },
      selectedName: null,
      isTie: false,
      headline: "Pick your lane...",
      summary: "Players are choosing their lane.",
      players: players.map(p => ({
        name: p.name,
        progress: p.progress,
        selected: false,
        headline: p.progress + ' spaces moved',
        subline: "Picking lane...",
        rank: 0,
        chips: ["Race"],
      })),
    };
  }

  const positions = Object.fromEntries(names.map((name) => [name, 0]));
  const turns = [];

  for (let turn = 1; turn <= 12; turn += 1) {
    const mover = pickRandom(names);
    positions[mover] += 1;
    turns.push({
      turn,
      mover,
      positions: { ...positions },
      text: `Turn ${turn}: ${mover} advances to ${positions[mover]}`,
    });
  }

  const players = names.map((name) => ({
    name,
    position: positions[name],
  }));

  const resolution = resolveByGoal(players, (player) => [player.position], selectionGoal);
  const tiedNames = resolution.tied.map((player) => player.name);
  const hasTie = tiedNames.length > 1;
  const selectedName = hasTie ? null : resolution.picked.name;
  const choosingWinner = selectionGoal === "winner";

  const modeName = "Lucky Horse Race";
  return {
    modeId: "horse-race",
    modeName,
    selectionGoal,
    selectedName,
    isTie: hasTie,
    tiedNames: hasTie ? tiedNames : undefined,
    headline: hasTie ? "IT'S A TIE" : buildOutcomeHeadline(selectedName, taskLabel, selectionGoal, modeName),
    summary: hasTie
      ? `${tiedNames.join(" and ")} finished in the same position!`
      : `Twelve random turns. Whoever finishes ${choosingWinner ? "first" : "last"} gets selected.`,
    turns,
    race: {
      max: Math.max(...players.map((player) => player.position), 1),
    },
    players: players.map((player) => {
      const isTied = hasTie && tiedNames.includes(player.name);
      return {
        name: player.name,
        progress: player.position,
        headline: `${player.position} spaces moved`,
        subline: hasTie
          ? (isTied ? "TIED" : "Not selected")
          : (player.name === selectedName ? `Finished ${choosingWinner ? "in front" : "at the back"}` : "Not selected"),
        selected: hasTie ? false : player.name === selectedName,
        tied: isTied,
        chips: ["Race"],
      };
    }),
  };
}

function buildRocketResult(names, taskLabel, selectionGoal) {
  const modeName = "Rocket Launch";

  function generateCrashTime() {
    const minTime = 5;
    const maxTime = 120;
    const lambda = 3;
    const u = Math.random();
    const expVal = -Math.log(1 - u * (1 - Math.exp(-lambda))) / lambda;
    return minTime + expVal * (maxTime - minTime);
  }

  function distanceAtTime(t) {
    return 100 * t + 0.5 * 200 * t * t;
  }

  function formatDistance(d) {
    if (d >= 1000000) return (d / 1000000).toFixed(2) + 'M km';
    if (d >= 1000) return Math.round(d).toLocaleString() + ' km';
    return Math.round(d) + ' km';
  }

  function formatFlightTime(t) {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`;
  }

  const crashTimes = names.map(() => generateCrashTime());
  const shuffledTimes = shuffle(crashTimes);
  const players = names.map((name, i) => ({
    name,
    crashTime: shuffledTimes[i],
    distance: distanceAtTime(shuffledTimes[i]),
  }));

  // Rank by crash time (don't sort the array — keep original name order for display)
  const sortedByTime = [...players].sort((a, b) => a.crashTime - b.crashTime);
  sortedByTime.forEach((p, i) => {
    p.rank = players.length - i;
  });

  const survivor = sortedByTime[sortedByTime.length - 1];
  const selected = survivor.name;

  let subline = `${formatFlightTime(survivor.crashTime)} flight time`;
  if (survivor.distance > 384000) subline += ' — past the Moon';
  else if (survivor.distance > 36000) subline += ' — geostationary orbit';

  const headline = pickRandomMessage(
    selectionGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
    selected,
    selectionGoal === "winner" ? "win" : "lose"
  );

  return {
    modeId: "rocket",
    modeName,
    selectionGoal,
    selectedName: selected,
    isTie: false,
    headline,
    summary: `All other rockets burned up. ${selected} made it to ${formatDistance(survivor.distance)}.`,
    players: players.map(p => ({
      name: p.name,
      selected: p.name === selected,
      crashTime: p.crashTime,
      distance: p.distance,
      distanceFormatted: formatDistance(p.distance),
      headline: p.name === selected ? `Survived to ${formatDistance(p.distance)}` : `Crashed at ${formatDistance(p.distance)}`,
      subline: p.name === selected ? subline : `${formatFlightTime(p.crashTime)} flight time`,
      rank: p.rank,
      chips: [formatDistance(p.distance)],
    })),
  };
}

function buildSpaceInvadersResult(names, taskLabel, selectionGoal) {
  const modeName = "Space Invaders";
  const shuffled = shuffle(names);
  const survivor = shuffled[shuffled.length - 1];
  const selectedName = survivor;
  const choosingWinner = selectionGoal === "winner";

  const eliminationOrder = shuffled.slice(0, shuffled.length - 1);

  const headline = pickRandomMessage(
    selectionGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
    selectedName,
    selectionGoal === "winner" ? "win" : "lose"
  );

  return {
    modeId: "space-invaders",
    modeName,
    selectionGoal,
    selectedName,
    isTie: false,
    headline,
    summary: `The laser picked off aliens one by one. ${selectedName} was the last alien standing.`,
    eliminationOrder,
    players: names.map((name) => {
      const elimIndex = eliminationOrder.indexOf(name);
      const isSurvivor = name === survivor;
      const destroyedAt = isSurvivor ? null : elimIndex + 1;
      const rank = isSurvivor ? 1 : names.length - elimIndex;
      return {
        name,
        selected: name === selectedName,
        destroyedAt,
        rank,
        headline: isSurvivor ? "LAST ALIEN STANDING" : `Destroyed: Shot #${destroyedAt}`,
        subline: isSurvivor ? "Survived the onslaught" : `Eliminated ${choosingWinner ? "early" : ""}`,
        chips: isSurvivor ? ["Survivor"] : [`Shot #${destroyedAt}`],
      };
    }),
  };
}

function generateTickTimings(totalTicks) {
  const timings = [];
  const startInterval = 800;
  const endInterval = 250;
  for (let i = 0; i < totalTicks; i++) {
    const progress = i / Math.max(totalTicks - 1, 1);
    const interval = startInterval - (startInterval - endInterval) * (progress * progress);
    timings.push(Math.round(interval));
  }
  return timings;
}

function buildBombResult(names, taskLabel, selectionGoal) {
  const modeName = "Bomb";
  const totalTicks = 15 + secureRandomInt(16);
  const selectedName = pickRandom(names);
  const sequence = [];
  let current = pickRandom(names);

  for (let i = 0; i < totalTicks - 1; i++) {
    sequence.push(current);
    let next;
    do { next = pickRandom(names); } while (next === current && names.length > 1);
    current = next;
  }
  sequence.push(selectedName);

  const timesHeld = {};
  names.forEach(n => { timesHeld[n] = 0; });
  sequence.forEach(n => { timesHeld[n]++; });

  const choosingWinner = selectionGoal === "winner";
  const headline = pickRandomMessage(
    selectionGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
    selectedName,
    selectionGoal === "winner" ? "win" : "lose"
  );

  return {
    modeId: "bomb",
    modeName,
    selectionGoal,
    selectedName,
    isTie: false,
    headline,
    summary: `The bomb was passed ${totalTicks} times before detonating on ${selectedName}.`,
    totalTicks,
    tickTimings: generateTickTimings(totalTicks),
    sequence,
    players: names.map((name) => {
      const isSelected = name === selectedName;
      return {
        name,
        selected: isSelected,
        timesHeld: timesHeld[name],
        headline: isSelected ? "BOOM!" : "Survived",
        subline: isSelected ? `Held the bomb ${timesHeld[name]} time${timesHeld[name] !== 1 ? "s" : ""}` : `Held ${timesHeld[name]} time${timesHeld[name] !== 1 ? "s" : ""}`,
        rank: isSelected ? names.length : 1,
        chips: [`Held ${timesHeld[name]}x`],
      };
    }),
  };
}

function buildPlinkoResult(names, taskLabel, selectionGoal) {
  const modeName = "Plinko";
  const SLOT_VALUES = [1, 2, 3, 5, 8, 13, 21, 13, 8, 5, 3, 2, 1];
  const ROWS = 12;

  const players = names.map((name) => {
    const path = [];
    let col = 0;
    for (let r = 0; r < ROWS; r++) {
      const choice = secureRandomInt(2);
      path.push(choice);
      col += choice;
    }
    const finalSlot = col;
    const score = SLOT_VALUES[finalSlot];
    return { name, path, finalSlot, score };
  });

  const { tied, picked } = resolveByGoal(players, (p) => [p.score], selectionGoal);
  const hasTie = tied.length > 1;
  const selectedName = hasTie ? null : picked.name;

  const headline = hasTie
    ? `It's a tie between ${tied.map(t => t.name).join(' and ')}!`
    : pickRandomMessage(
        selectionGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
        selectedName,
        selectionGoal === "winner" ? "win" : "lose"
      );

  return {
    modeId: "plinko",
    modeName,
    selectionGoal,
    selectedName: hasTie ? tied[0].name : selectedName,
    isTie: hasTie,
    tiedNames: hasTie ? tied.map(t => t.name) : undefined,
    headline,
    summary: hasTie
      ? `${tied.map(t => t.name).join(' and ')} both scored ${tied[0].score} points.`
      : `${selectedName} landed in the ${SLOT_VALUES[picked.finalSlot]}-point slot.`,
    slotValues: SLOT_VALUES,
    rows: ROWS,
    players: players.map((p) => ({
      name: p.name,
      path: p.path,
      finalSlot: p.finalSlot,
      score: p.score,
      selected: hasTie ? false : p.name === selectedName,
      tied: hasTie && tied.some(t => t.name === p.name),
      rank: hasTie ? (tied.some(t => t.name === p.name) ? 1 : 2) :
        (p.name === selectedName ? 1 : players.length),
      headline: p.name === (hasTie ? null : selectedName) ? `Slot ${p.finalSlot + 1}: ${p.score} pts` : `Slot ${p.finalSlot + 1}: ${p.score} pts`,
      subline: `Scored ${p.score} point${p.score !== 1 ? 's' : ''}`,
      chips: [`${p.score} pts`, `Slot #${p.finalSlot + 1}`],
    })),
  };
}

function buildBattleRoyaleResult(names, taskLabel, selectionGoal) {
  const modeName = "Battle Royale";

  const positions = names.map((name) => ({
    name,
    x: 10 + secureRandomInt(80),
    y: 10 + secureRandomInt(80),
  }));

  const zones = [{ cx: 50, cy: 50, radius: 45 }];
  const shrinkAmount = 45 / names.length * 0.9;
  for (let i = 1; i < names.length; i++) {
    const prev = zones[i - 1];
    const newCx = Math.max(10, Math.min(90, prev.cx + (secureRandomInt(11) - 5)));
    const newCy = Math.max(10, Math.min(90, prev.cy + (secureRandomInt(11) - 5)));
    const newRadius = Math.max(5, prev.radius - shrinkAmount);
    zones.push({ cx: newCx, cy: newCy, radius: newRadius });
  }

  const alive = new Set(names);
  const eliminationOrder = [];

  for (let phase = 1; phase < names.length; phase++) {
    const zone = zones[phase];
    let farthest = null;
    let farthestDist = -1;

    for (const name of alive) {
      const pos = positions.find(p => p.name === name);
      const dx = pos.x - zone.cx;
      const dy = pos.y - zone.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > farthestDist) {
        farthestDist = dist;
        farthest = name;
      }
    }

    alive.delete(farthest);
    eliminationOrder.push(farthest);
  }

  const survivor = [...alive][0];
  const selectedName = selectionGoal === "winner" ? survivor : eliminationOrder[0];

  const headline = pickRandomMessage(
    selectionGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
    selectedName,
    selectionGoal === "winner" ? "win" : "lose"
  );

  return {
    modeId: "battle-royale",
    modeName,
    selectionGoal,
    selectedName,
    isTie: false,
    headline,
    summary: selectionGoal === "winner"
      ? `The zone closed in ${names.length - 1} times. ${selectedName} was the last one standing.`
      : `${selectedName} was the first one caught outside the zone.`,
    positions,
    zones,
    eliminationOrder,
    players: names.map((name) => {
      const pos = positions.find(p => p.name === name);
      const elimIndex = eliminationOrder.indexOf(name);
      const isSurvivor = name === survivor;
      const rank = isSurvivor ? 1 : names.length - elimIndex;
      return {
        name,
        x: pos.x,
        y: pos.y,
        selected: name === selectedName,
        rank,
        headline: isSurvivor ? "VICTORY ROYALE" : `Eliminated: Phase ${elimIndex + 1}`,
        subline: isSurvivor ? "Last one in the zone" : `Caught outside zone ${elimIndex + 1}`,
        chips: isSurvivor ? ["Winner"] : [`Phase ${elimIndex + 1}`],
      };
    }),
  };
}

function buildStockMarketResult(names, taskLabel, selectionGoal) {
  const modeName = "Stock Market";
  const TICKERS = ["$DOGE","$MOON","$YOLO","$HODL","$FOMO","$STONK","$APE","$REKT","$PUMP","$CHAD","$COPE","$WAGMI","$TSLA","$GME","$NVDA","$PLTR","$COIN"];
  const shuffledTickers = shuffle(TICKERS);

  function gaussianRandom() {
    return Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
  }

  function generatePriceHistory() {
    const volatility = 0.03 + Math.random() * 0.05;
    const drift = (Math.random() - 0.5) * 0.02;
    const prices = [100];
    for (let i = 1; i < 60; i++) {
      const change = prices[i - 1] * (gaussianRandom() * volatility + drift);
      prices.push(Math.max(0.01, prices[i - 1] + change));
    }
    return prices;
  }

  // Interactive mode: generate a stock pool for drafting
  const isInteractive = typeof window !== 'undefined' && window.__interactiveMode;

  if (isInteractive) {
    const TICKER_POOL = ["$DOGE","$TSLA","$STONK","$GME","$MOON","$AAPL","$REKT","$COPE","$PUMP","$YOLO","$HODL","$FOMO","$APE","$CHAD","$NVDA","$PLTR"];
    const NOTES = [
      "Much wow. Very volatile.",
      "Elon tweeted again.",
      "It only goes up. Right?",
      "The squeeze hasn't squoze.",
      "Literally can't go tits up.",
      "The safe play. Boring.",
      "Named after your portfolio.",
      "For when $REKT isn't enough.",
      "Pump it. PUMP IT.",
      "You only lose once.",
      "Diamond hands required.",
      "Fear of missing out... on losses.",
      "Return to monke.",
      "The chosen one.",
      "To the moon or the floor.",
      "Trust the process.",
    ];

    const selectedTickers = shuffle(TICKER_POOL).slice(0, 8);

    const stockPool = selectedTickers.map((ticker, i) => {
      const volatility = 0.03 + Math.random() * 0.05;
      const drift = (Math.random() - 0.5) * 0.02;
      const prices = [100];
      for (let j = 1; j < 60; j++) {
        const change = prices[j-1] * (gaussianRandom() * volatility + drift);
        prices.push(Math.max(0.01, prices[j-1] + change));
      }
      return {
        ticker,
        note: NOTES[i % NOTES.length],
        prices,
        endPrice: prices[59],
        percentChange: ((prices[59] - 100) / 100 * 100),
      };
    });

    const pickOrder = shuffle([...names]);

    return {
      modeId: "stock-market",
      modeName,
      selectionGoal,
      draftPhase: true,
      stockPool,
      pickOrder,
      selectedName: null,
      isTie: false,
      headline: "Picking stocks...",
      summary: "Players are choosing their stocks.",
      players: names.map(name => ({
        name,
        selected: false,
        ticker: null,
        headline: "Picking...",
        subline: "",
        rank: 0,
        chips: [],
      })),
    };
  }

  const players = names.map((name, i) => {
    const prices = generatePriceHistory();
    const finalPrice = prices[prices.length - 1];
    const percentChange = ((finalPrice - 100) / 100 * 100).toFixed(1);
    return {
      name,
      ticker: shuffledTickers[i % shuffledTickers.length],
      prices,
      finalPrice,
      percentChange: parseFloat(percentChange),
    };
  });

  const { tied, picked } = resolveByGoal(players, (p) => [p.finalPrice], selectionGoal);
  const hasTie = tied.length > 1;
  const selectedName = hasTie ? null : picked.name;

  const headline = hasTie
    ? `It's a tie between ${tied.map(t => t.name).join(' and ')}!`
    : pickRandomMessage(
        selectionGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
        hasTie ? tied[0].name : selectedName,
        selectionGoal === "winner" ? "win" : "lose"
      );

  return {
    modeId: "stock-market",
    modeName,
    selectionGoal,
    selectedName: hasTie ? tied[0].name : selectedName,
    isTie: hasTie,
    tiedNames: hasTie ? tied.map(t => t.name) : undefined,
    headline,
    summary: hasTie
      ? `${tied.map(t => t.name).join(' and ')} finished at the same price.`
      : `${picked.name}'s ${picked.ticker} ${picked.percentChange >= 0 ? 'gained' : 'lost'} ${Math.abs(picked.percentChange)}%.`,
    players: players.map((p) => ({
      name: p.name,
      ticker: p.ticker,
      prices: p.prices,
      finalPrice: p.finalPrice,
      percentChange: p.percentChange,
      selected: hasTie ? false : p.name === selectedName,
      tied: hasTie && tied.some(t => t.name === p.name),
      rank: hasTie ? (tied.some(t => t.name === p.name) ? 1 : 2) :
        (p.name === selectedName ? 1 : players.length),
      headline: `${p.ticker}: $${p.finalPrice.toFixed(2)}`,
      subline: `${p.percentChange >= 0 ? '+' : ''}${p.percentChange}%`,
      chips: [p.ticker, `${p.percentChange >= 0 ? '+' : ''}${p.percentChange}%`],
    })),
  };
}

const MODES = [
  { id: "holdem", run: buildHoldemResult },
  { id: "plo", run: buildPloResult },
  { id: "rng", run: buildRngResult },
  { id: "wheel", run: buildWheelResult },
  { id: "dice", run: buildDiceResult },
  { id: "high-card", run: buildHighCardResult },
  { id: "coin-flips", run: buildCoinFlipResult },
  { id: "black-marble", run: buildBlackMarbleResult },
  { id: "slots", run: buildSlotsResult },
  { id: "horse-race", run: buildHorseRaceResult },
  { id: "rocket", run: buildRocketResult },
  { id: "space-invaders", run: buildSpaceInvadersResult },
  { id: "bomb", run: buildBombResult },
  { id: "plinko", run: buildPlinkoResult },
  { id: "battle-royale", run: buildBattleRoyaleResult },
  { id: "stock-market", run: buildStockMarketResult },
];

const CLASSIC_LAZY_MODE_IDS = new Set([
  "wheel",
  "rng",
  "dice",
  "high-card",
  "coin-flips",
  "black-marble",
  "slots",
  "horse-race",
]);

const STRATEGIC_LAZY_MODE_IDS = new Set([
  "holdem",
  "plo",
]);

const HEAVY_LAZY_MODE_IDS = new Set([
  "rocket",
  "space-invaders",
  "bomb",
  "plinko",
  "battle-royale",
  "stock-market",
]);

function buildTournamentOutcome(names, taskLabel, baseModeId, currentWheelRotation = 0) {
  const mode = modeById(baseModeId);
  let remainingNames = [...names];
  let localWheelRotation = currentWheelRotation;
  const rounds = [];
  const safeNames = [];

  while (remainingNames.length > 1) {
    const roundResult = mode.run(remainingNames, "win immunity", "winner", localWheelRotation);
    if (roundResult.modeId === "wheel") {
      localWheelRotation = roundResult.wheel.rotation;
    }
    rounds.push({
      ...roundResult,
      roundLabel: `Round ${rounds.length + 1}`,
      remainingAtStart: [...remainingNames],
    });
    safeNames.push(roundResult.selectedName);
    remainingNames = remainingNames.filter((name) => name !== roundResult.selectedName);
  }

  const finalLoser = remainingNames[0];
  const modeName = `${modeById(baseModeId)?.name ?? "Game"} Tournament`;
  return {
    modeId: baseModeId,
    modeName,
    selectionGoal: "loser",
    selectedName: finalLoser,
    headline: pickRandomMessage(LOSE_MESSAGES, finalLoser, "lose"),
    summary: `${finalLoser} was the only person who never won a round. Win once and you're safe.`,
    isTournament: true,
    rounds,
    safeNames,
    finalLoser,
    wheelRotation: localWheelRotation,
  };
}

function getTournamentProgress(result, step) {
  let cursor = 0;
  for (let index = 0; index < result.rounds.length; index += 1) {
    const round = result.rounds[index];
    const roundSteps = getSingleTotalSteps(round);
    if (step <= cursor + roundSteps) {
      return {
        phase: "round",
        roundIndex: index,
        roundStep: Math.max(0, step - cursor),
        roundDone: step - cursor >= roundSteps,
      };
    }
    cursor += roundSteps;
    if (step <= cursor + 1) {
      return {
        phase: "summary",
        roundIndex: index,
      };
    }
    cursor += 2;
  }

  return {
    phase: "summary",
    roundIndex: result.rounds.length - 1,
  };
}

function CardFace({ card, hidden = false, large = false, delay = 0, deal = false, dealIndex = 0 }) {
  const red = card?.suit === "h" || card?.suit === "d";
  const sizeClass = large ? "h-24 w-16 text-lg" : "h-14 w-10 text-sm";
  const dealDelay = dealIndex * 0.15 + delay;
  const shouldHide = deal && hidden;
  return (
    <motion.div
      initial={deal ? { x: 300, y: -80, rotateY: 180, opacity: 0, scale: 0.85, rotate: 8 } : false}
      animate={shouldHide
        ? { x: 0, y: 0, rotateY: 180, opacity: 1, scale: 1, rotate: 0 }
        : deal
          ? { x: 0, y: 0, rotateY: 0, opacity: 1, scale: 1, rotate: 0 }
          : { rotateY: hidden ? 180 : 0, opacity: 1 }
      }
      transition={deal ? {
        x: { type: "spring", stiffness: 90, damping: 16, delay: dealDelay },
        y: { type: "spring", stiffness: 90, damping: 16, delay: dealDelay },
        rotate: { type: "spring", stiffness: 90, damping: 16, delay: dealDelay },
        opacity: { duration: 0.15, delay: dealDelay },
        scale: { type: "spring", stiffness: 150, damping: 18, delay: dealDelay },
        rotateY: { type: "spring", stiffness: 15, damping: 7, mass: 3, delay: hidden ? dealDelay : dealDelay + 0.1 },
      } : {
        rotateY: { type: "spring", stiffness: 15, damping: 7, mass: 3, delay },
      }}
      className={`relative ${sizeClass}`}
      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
    >
      {/* Front face — white card */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center rounded-lg border-2 shadow-md ${
          red ? "border-rose-300 text-rose-600" : "border-slate-400 text-black"
        }`}
        style={{ backfaceVisibility: "hidden", background: "#ffffff" }}
      >
        <div className={`font-extrabold ${large ? "text-xl" : "text-sm"}`} style={{ color: red ? '#dc2626' : '#000000' }}>{rankLabel(card.rank)}</div>
        <div className={large ? "text-lg" : "text-xs"} style={{ color: red ? '#e11d48' : '#000000' }}>{SUIT_SYMBOLS[card.suit]}</div>
      </div>
      {/* Back face — red card back with pixel diamond pattern */}
      <div
        className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-red-800 shadow-md overflow-hidden"
        style={{
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)",
        }}
      >
        <div className="absolute inset-[3px] border border-red-400/30 rounded" style={{
          backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px)",
        }} />
        <div className="relative z-10 text-red-300/50 font-bold" style={{ fontSize: large ? 18 : 10 }}>♦</div>
      </div>
    </motion.div>
  );
}

function RevealBanner({ modeName, step, totalSteps, done }) {
  return (
    <div className="mode-banner flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Live mode</div>
        <div className="mt-1 text-xl font-bold text-slate-900">{modeName}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="progress-track w-36 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="progress-bar h-2 rounded-full bg-gradient-to-r from-slate-900 via-sky-500 to-slate-900 shadow-[0_0_12px_2px_rgba(56,189,248,0.5)]"
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="step-badge rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {done ? "Final" : step === 0 ? `Ready • 0/${totalSteps}` : `Step ${step}/${totalSteps}`}
        </div>
      </div>
    </div>
  );
}

function PlayerResultCard({ name, title, subtitle, selected, selectionGoal, tied, children }) {
  const isWinner = selectionGoal === "winner";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={selected ? { opacity: 1, y: 0, scale: [0.96, 1.04, 1], rotate: isWinner ? 0 : [0, -1.5, 1.5, -0.8, 0.5, 0] } : tied ? { opacity: 1, y: 0, scale: [0.96, 1.02, 1] } : { opacity: 1, y: 0, scale: 1 }}
      transition={selected || tied ? { duration: 0.8 } : undefined}
      className={`rounded-3xl border p-4 shadow-sm ${
        tied
          ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 pulse-tie"
          : selected
            ? isWinner
              ? "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 pulse-winner"
              : "border-rose-300 bg-gradient-to-br from-rose-50 to-orange-50 pulse-loser"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">{name}</div>
          <div className="text-sm text-slate-500">{subtitle}</div>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
          tied
            ? "bg-yellow-500 text-white"
            : selected
              ? isWinner
                ? "bg-amber-500 text-white"
                : "bg-rose-500 text-white"
              : "bg-slate-100 text-slate-600"
        }`}>
          {tied ? "Tied!" : selected ? (isWinner ? "Winner!" : "Selected") : "Watching"}
        </div>
      </div>
      <div className="space-y-3">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        {children}
      </div>
    </motion.div>
  );
}

function PlaybackStage({ result, step, done, interactiveBombState }) {
  const classicPlaybackFallback = (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 p-6 text-center shadow-xl backdrop-blur">
      <div className="pixel-font text-[8px] uppercase tracking-widest text-slate-500">Loading mode</div>
      <div className="mt-3 text-sm text-slate-600">Spinning up the game screen...</div>
    </div>
  );
  const strategicPlaybackFallback = (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 p-6 text-center shadow-xl backdrop-blur">
      <div className="pixel-font text-[8px] uppercase tracking-widest text-slate-500">Loading mode</div>
      <div className="mt-3 text-sm text-slate-600">Dealing cards and setting the bracket...</div>
    </div>
  );
  const heavyPlaybackFallback = (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 p-6 text-center shadow-xl backdrop-blur">
      <div className="pixel-font text-[8px] uppercase tracking-widest text-slate-500">Loading mode</div>
      <div className="mt-3 text-sm text-slate-600">Warming up the gameplay screen...</div>
    </div>
  );

  function renderClassicPlayback(Component) {
    return (
      <React.Suspense fallback={classicPlaybackFallback}>
        <Component
          result={result}
          step={step}
          done={done}
          ModeHeader={ModeHeader}
          CardFace={CardFace}
          CyclingNumber={CyclingNumber}
          CyclingSlot={CyclingSlot}
          clamp={clamp}
          WHEEL_COLORS={WHEEL_COLORS}
          HORSE_EMOJIS={HORSE_EMOJIS}
        />
      </React.Suspense>
    );
  }

  function renderStrategicPlayback(Component, extraProps = {}) {
    return (
      <React.Suspense fallback={strategicPlaybackFallback}>
        <Component
          result={result}
          step={step}
          done={done}
          Celebration={Celebration}
          SadOverlay={SadOverlay}
          VerdictReveal={VerdictReveal}
          CardFace={CardFace}
          PlaybackStage={PlaybackStage}
          clamp={clamp}
          cardKey={cardKey}
          getCurrentHoldemHandLabel={getCurrentHoldemHandLabel}
          getCurrentPloHandLabel={getCurrentPloHandLabel}
          getTournamentProgress={getTournamentProgress}
          {...extraProps}
        />
      </React.Suspense>
    );
  }

  function renderHeavyPlayback(Component, extraProps = {}) {
    return (
      <React.Suspense fallback={heavyPlaybackFallback}>
        <Component
          result={result}
          step={step}
          done={done}
          ModeHeader={ModeHeader}
          PlayerResultCard={PlayerResultCard}
          {...extraProps}
        />
      </React.Suspense>
    );
  }

  if (result.isTournament) {
    return renderStrategicPlayback(TournamentPlayback);
  }
  switch (result.modeId) {
    case "holdem":
      return renderStrategicPlayback(PokerPlayback);
    case "plo":
      return renderStrategicPlayback(PokerPlayback, { omaha: true });
    case "rng":
      return renderClassicPlayback(NumberPlayback);
    case "wheel":
      return renderClassicPlayback(WheelPlayback);
    case "dice":
      return renderClassicPlayback(DicePlayback);
    case "high-card":
      return renderClassicPlayback(HighCardPlayback);
    case "coin-flips":
      return renderClassicPlayback(CoinPlayback);
    case "black-marble":
      return renderClassicPlayback(MarblePlayback);
    case "slots":
      return renderClassicPlayback(SlotsPlayback);
    case "horse-race":
      return renderClassicPlayback(HorseRacePlayback);
    case "rocket":
      return renderHeavyPlayback(RocketPlayback);
    case "space-invaders":
      return renderHeavyPlayback(SpaceInvadersPlayback);
    case "bomb":
      return renderHeavyPlayback(BombPlayback, { interactiveBombState });
    case "plinko":
      return renderHeavyPlayback(PlinkoPlayback);
    case "battle-royale":
      return renderHeavyPlayback(BattleRoyalePlayback);
    case "stock-market":
      return renderHeavyPlayback(StockMarketPlayback, { pickRandomMessage, WIN_MESSAGES, LOSE_MESSAGES });
    default:
      return null;
  }
}

export default function ChoreChaosApp() {
  // ── Device mode state ──
  const [deviceMode, setDeviceMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') ? null : 'choose';
  });
  const [hostName, setHostName] = useState('');
  const [hostSetupDone, setHostSetupDone] = useState(false);

  const [names, setNames] = useState(["Beck", "Nick", "Jeremy", "Oakley"]);
  const [taskLabel, setTaskLabel] = useState("");
  const [selectionGoal, setSelectionGoal] = useState("winner");
  const [selectedModeId, setSelectedModeId] = useState("auto");
  const [gameFormat, setGameFormat] = useState("single");

  // ── Series (Best of N) state ──
  const [seriesActive, setSeriesActive] = useState(false);
  const [seriesConfig, setSeriesConfig] = useState(null);
  const [seriesScores, setSeriesScores] = useState({});
  const [seriesRound, setSeriesRound] = useState(0);
  const [seriesHistory, setSeriesHistory] = useState([]);
  const [seriesComplete, setSeriesComplete] = useState(false);
  const [showSeriesSetup, setShowSeriesSetup] = useState(false);
  const [showSeriesScoreboard, setShowSeriesScoreboard] = useState(false);
  const seriesScoreRef = useRef({});
  const seriesRoundRecordedRef = useRef(null);

  // Clear legacy persisted series state so fresh visits always start clean.
  useEffect(() => {
    try {
      localStorage.removeItem('runouts_series');
    } catch (e) {}
  }, []);

  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [playbackStep, setPlaybackStep] = useState(0);
  const [playbackDone, setPlaybackDone] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [suddenDeathRound, setSuddenDeathRound] = useState(0);
  const [suddenDeathNames, setSuddenDeathNames] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(false);

  // Room / spectator / player state
  const [roomMode, setRoomMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') ? 'joining' : 'none';
  });
  const [roomCode, setRoomCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || null;
  });
  const [roomChannel, setRoomChannel] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [spectatorState, setSpectatorState] = useState(null);
  const [spectatorConnected, setSpectatorConnected] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const [playerName, setPlayerName] = useState(null);
  const [joinedPlayers, setJoinedPlayers] = useState({});
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [roomPlayerNames, setRoomPlayerNames] = useState([]);
  const currentActionHandler = React.useRef(null);
  const roomModeRef = React.useRef(roomMode);
  const [interactiveBombState, setInteractiveBombState] = useState(null);
  const [interactiveRocketEjects, setInteractiveRocketEjects] = useState({});
  const [draftChoices, setDraftChoices] = useState({});
  const [stockDraftState, setStockDraftState] = useState(null);
  const [stockSellState, setStockSellState] = useState({});
  const [highCardDraftHands, setHighCardDraftHands] = useState(null);
  const [horseWhips, setHorseWhips] = useState({});
  const [horseLanePicks, setHorseLanePicks] = useState(null);
  const [usedShields, setUsedShields] = useState({});
  const [battleMoves, setBattleMoves] = useState(null);
  const [voteActive, setVoteActive] = useState(false);
  const [votes, setVotes] = useState({});
  const votesRef = useRef({});
  const [voteDeadline, setVoteDeadline] = useState(null);
  const [spectatorSeries, setSpectatorSeries] = useState(null);
  const [seriesTied, setSeriesTied] = useState(null);
  const [handoffReady, setHandoffReady] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    if (!_supabase) { setLeaderboardLoading(false); return; }
    try {
      const { data, error } = await _supabase
        .from('runouts_games')
        .select('*')
        .order('played_at', { ascending: true });
      if (error) throw error;
      setLeaderboardData(data || []);
      setLeaderboardError(false);
    } catch (e) {
      console.error('Leaderboard fetch failed:', e);
      setLeaderboardError(true);
    }
    setLeaderboardLoading(false);
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  useEffect(() => { roomModeRef.current = roomMode; }, [roomMode]);

  // ── Derived state for local interactive mode ──
  const _trimmedNames = names.map(n => n.trim());
  const _filledCount = _trimmedNames.filter(Boolean).length;
  const _allFilled = _trimmedNames.every(Boolean);
  const _namesUnique = new Set(_trimmedNames.filter(Boolean)).size === _filledCount;
  const _hasEnough = _filledCount >= 2;
  const _localCanRun = _allFilled && _namesUnique && _hasEnough;
  const localInteractiveMode = deviceMode === 'local' && _localCanRun;

  useEffect(() => {
    if (gameActive) return undefined;
    if (deviceMode === 'choose' && roomMode === 'none') return undefined;

    const timer = setTimeout(() => {
      loadInteractionPanels();
      loadMetaPanels();
      if (selectedModeId === 'auto' || CLASSIC_LAZY_MODE_IDS.has(selectedModeId)) {
        loadClassicModePlaybacks();
      }
      if (gameFormat === 'tournament' || selectedModeId === 'auto' || STRATEGIC_LAZY_MODE_IDS.has(selectedModeId)) {
        loadStrategicModePlaybacks();
      }
      if (selectedModeId === 'auto' || HEAVY_LAZY_MODE_IDS.has(selectedModeId)) {
        loadHeavyModePlaybacks();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [deviceMode, roomMode, selectedModeId, gameFormat, gameActive]);

  function isPrivateAction(action) {
    return action === 'choose_cards' || action === 'pick_card_blind' || action === 'pick_stock';
  }

  useEffect(() => { window.__interactiveMode = interactiveMode || localInteractiveMode; }, [interactiveMode, localInteractiveMode]);

  // In local interactive mode, track playerName to whoever's turn it is
  useEffect(() => {
    if (localInteractiveMode && pendingAction?.playerName) {
      setPlayerName(pendingAction.playerName);
    }
  }, [localInteractiveMode, pendingAction?.playerName]);

  // Reset handoff when pending action changes to a new player
  useEffect(() => {
    if (pendingAction?.playerName) {
      setHandoffReady(false);
    }
  }, [pendingAction?.playerName]);

  useEffect(() => {
    function handleRocketComplete() {
      if ((result?.modeId === 'rocket' || result?.modeId === 'bomb' || result?.modeId === 'stock-market') && !playbackDone) {
        // Interactive rocket: compute final result from eject decisions
        if (result?.modeId === 'rocket' && (interactiveMode || localInteractiveMode) && Object.keys(interactiveRocketEjects).length > 0) {
          const formatDist = (d) => d >= 1000000 ? (d/1000000).toFixed(2) + 'M km' : Math.round(d).toLocaleString() + ' km';

          const finalPlayers = result.players.map(p => {
            const eject = interactiveRocketEjects[p.name];
            const ejected = !!eject;
            const crashed = !ejected;
            const finalDistance = ejected ? eject.distance : p.distance;
            // Crashed players lose everything
            const effectiveDistance = crashed ? 0 : finalDistance;
            return {
              ...p,
              ejected,
              crashed,
              distance: finalDistance,
              effectiveDistance,
              distanceFormatted: formatDist(finalDistance),
              time: ejected ? eject.time : p.crashTime,
            };
          });

          finalPlayers.sort((a, b) => b.effectiveDistance - a.effectiveDistance);
          finalPlayers.forEach((p, i) => { p.rank = i + 1; });

          const selected = result.selectionGoal === 'winner' ? finalPlayers[0] : finalPlayers[finalPlayers.length - 1];

          result.selectedName = selected.name;
          result.headline = pickRandomMessage(
            result.selectionGoal === 'winner' ? WIN_MESSAGES : LOSE_MESSAGES,
            selected.name,
            result.selectionGoal === 'winner' ? 'win' : 'lose'
          );
          result.summary = selected.name + ' ' + (selected.ejected ? 'ejected' : 'crashed') + ' at ' + selected.distanceFormatted + '.';
          result.isTie = false;
          result.players = finalPlayers.map(p => ({
            ...p,
            selected: p.name === selected.name,
            headline: p.ejected ? 'Ejected at ' + p.distanceFormatted : 'Crashed at ' + p.distanceFormatted,
            subline: p.ejected ? 'Safe landing' : 'Burned up',
            chips: [p.distanceFormatted, p.ejected ? 'Ejected' : 'Crashed'],
          }));

          pushHistory(result);
          setPendingAction(null);
          currentActionHandler.current = null;
        }

        // Interactive stock market: result was computed in StockMarketPlayback before this event
        if (result?.isInteractiveChart && result?.selectedName) {
          pushHistory(result);
          setPendingAction(null);
          currentActionHandler.current = null;
        }

        setPlaybackStep(2);
        setPlaybackDone(true);
      }
    }
    window.addEventListener('rocket-complete', handleRocketComplete);
    return () => window.removeEventListener('rocket-complete', handleRocketComplete);
  }, [result, playbackDone, interactiveMode, interactiveRocketEjects, stockSellState]);

  // Interactive Black Marble turn management
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result || result.modeId !== 'black-marble') return;
    if (playbackDone) {
      setPendingAction(null);
      currentActionHandler.current = null;
      return;
    }

    const drawerIndex = playbackStep;
    if (drawerIndex >= result.players.length) return;

    const currentDrawer = result.players[drawerIndex]?.name;
    if (!currentDrawer) return;

    broadcastEvent({
      type: 'turn_prompt',
      playerName: currentDrawer,
      action: 'draw',
      turnNumber: drawerIndex + 1,
      totalDraws: result.players.length,
    });

    setPendingAction({
      type: 'turn',
      playerName: currentDrawer,
      action: 'draw',
      turnNumber: drawerIndex + 1,
      totalDraws: result.players.length,
    });

    currentActionHandler.current = (payload) => {
      if (payload.action !== 'draw' || payload.playerName !== currentDrawer) return;
      advancePlayback();
    };
  }, [interactiveMode, localInteractiveMode, gameActive, result, playbackStep, playbackDone]);

  // Interactive Bomb turn management
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result || result.modeId !== 'bomb') return;
    if (playbackDone) {
      setPendingAction(null);
      currentActionHandler.current = null;
      return;
    }

    // Initialize bomb state on first run
    if (!interactiveBombState && playbackStep >= 0) {
      const firstHolder = result.players[secureRandomInt(result.players.length)].name;
      const state = {
        holder: firstHolder,
        previousHolder: null,
        tickNumber: 0,
        sequence: [firstHolder],
        phase: 'waiting',
      };
      setInteractiveBombState(state);
      return; // Let the next render pick up the new state
    }

    if (!interactiveBombState || interactiveBombState.phase !== 'waiting') return;

    const { holder, previousHolder, tickNumber, sequence } = interactiveBombState;
    const totalTicks = result.totalTicks;
    const tickTimings = result.tickTimings;

    // Check if bomb should detonate
    if (tickNumber >= totalTicks - 1) {
      const selectedName = holder;
      // Build final result
      const timesHeld = {};
      result.players.forEach(p => { timesHeld[p.name] = 0; });
      sequence.forEach(n => { timesHeld[n] = (timesHeld[n] || 0) + 1; });

      const headline = pickRandomMessage(
        result.selectionGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
        selectedName,
        result.selectionGoal === "winner" ? "win" : "lose"
      );

      const finalPlayers = result.players.map(p => ({
        ...p,
        selected: p.name === selectedName,
        timesHeld: timesHeld[p.name] || 0,
        headline: p.name === selectedName ? "BOOM!" : "Survived",
        subline: `Held the bomb ${timesHeld[p.name] || 0} time${(timesHeld[p.name] || 0) !== 1 ? 's' : ''}`,
        chips: p.name === selectedName ? ["💥", `Held ${timesHeld[p.name] || 0}x`] : ["Safe", `Held ${timesHeld[p.name] || 0}x`],
      }));
      const sorted = [...finalPlayers].sort((a, b) => a.timesHeld - b.timesHeld);
      sorted.forEach((p, i) => { p.rank = i + 1; });
      // Apply ranks back
      finalPlayers.forEach(p => {
        const s = sorted.find(x => x.name === p.name);
        if (s) p.rank = s.rank;
      });

      // Update result object in place
      result.selectedName = selectedName;
      result.headline = headline;
      result.summary = `The bomb went off in ${selectedName}'s hands.`;
      result.sequence = sequence;
      result.players = finalPlayers;
      result.isTie = false;

      setInteractiveBombState(prev => ({ ...prev, phase: 'detonated' }));

      broadcastEvent({ type: 'bomb_detonated', holder: selectedName, finalResult: result });

      // Trigger completion
      setPlaybackDone(true);
      setPlaybackStep(2);
      setPendingAction(null);
      currentActionHandler.current = null;

      // Record to leaderboard
      pushHistory(result);
      return;
    }

    // Normal tick: prompt current holder to pass
    const targets = result.players
      .map(p => p.name)
      .filter(n => n !== holder && (previousHolder === null || n !== previousHolder || result.players.length <= 2));

    const timeoutMs = tickTimings[tickNumber] || 500;

    broadcastEvent({
      type: 'turn_prompt',
      playerName: holder,
      action: 'pass_bomb',
      targets,
      timeoutMs,
    });

    broadcastEvent({
      type: 'bomb_state',
      holder,
      tickNumber,
      totalTicks,
      timeoutMs,
    });

    setPendingAction({
      type: 'turn',
      playerName: holder,
      action: 'pass_bomb',
      targets,
      deadline: Date.now() + timeoutMs,
      tickNumber,
      totalTicks,
    });

    currentActionHandler.current = (payload) => {
      if (payload.action !== 'pass_bomb' || payload.playerName !== holder) return;
      const target = targets.includes(payload.target) ? payload.target : targets[secureRandomInt(targets.length)];

      setInteractiveBombState(prev => ({
        holder: target,
        previousHolder: holder,
        tickNumber: prev.tickNumber + 1,
        sequence: [...prev.sequence, target],
        phase: 'waiting',
      }));
    };

    // Timeout: auto-pass
    const timer = setTimeout(() => {
      const target = targets[secureRandomInt(targets.length)];
      setInteractiveBombState(prev => ({
        holder: target,
        previousHolder: holder,
        tickNumber: prev.tickNumber + 1,
        sequence: [...prev.sequence, target],
        phase: 'waiting',
      }));
    }, timeoutMs);

    return () => {
      clearTimeout(timer);
    };
  }, [interactiveMode, localInteractiveMode, gameActive, result, playbackStep, playbackDone, interactiveBombState]);

  // Interactive Rocket eject management
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result || result.modeId !== 'rocket') return;
    if (playbackDone) {
      setPendingAction(null);
      currentActionHandler.current = null;
      window.__rocketInteractive = false;
      return;
    }

    // Expose interactive state on window for cross-component communication
    window.__interactiveRocketEjects = interactiveRocketEjects;
    window.__rocketInteractive = true;

    // Register action handler for eject actions
    currentActionHandler.current = (payload) => {
      if (payload.action !== 'eject') return;
      const actor = payload.playerName;
      if (!actor || interactiveRocketEjects[actor]) return; // Already ejected

      const currentElapsed = window.__rocketElapsed || 0;
      const distance = 100 * currentElapsed + 0.5 * 200 * currentElapsed * currentElapsed;

      setInteractiveRocketEjects(prev => ({
        ...prev,
        [actor]: { time: currentElapsed, distance }
      }));

      broadcastEvent({
        type: 'rocket_eject',
        playerName: actor,
        distance,
        distanceFormatted: distance >= 1000000 ? (distance/1000000).toFixed(1) + 'M km' : Math.round(distance).toLocaleString() + ' km',
      });
    };

    // Set pending action so all flying players see the EJECT button
    setPendingAction({
      type: 'realtime',
      action: 'eject',
      modeId: 'rocket',
    });

    return () => {
      currentActionHandler.current = null;
    };
  }, [interactiveMode, localInteractiveMode, gameActive, result, playbackDone, interactiveRocketEjects]);

  // Interactive Poker draft management
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result) return;
    if (result.modeId !== 'holdem' && result.modeId !== 'plo') return;
    if (!result.draftPhase) return;

    // Broadcast draft prompt to all players
    broadcastEvent({
      type: 'choice_prompt',
      action: 'choose_cards',
      modeId: result.modeId,
      keepCount: result.keepCount,
      hands: result.draftHands,
    });

    const allPlayers = Object.keys(result.draftHands);
    const choices = {};

    if (localInteractiveMode && !interactiveMode) {
      // Local mode: cycle through players one at a time with handoff
      const currentPicker = allPlayers[0];
      setPendingAction({
        type: 'turn',
        action: 'choose_cards',
        playerName: currentPicker,
        modeId: result.modeId,
        keepCount: result.keepCount,
        hands: result.draftHands,
      });

      currentActionHandler.current = (payload) => {
        if (payload.action !== 'choose_cards') return;
        const actor = payload.playerName;
        if (!result.draftHands[actor]) return;
        if (choices[actor]) return;

        const indices = payload.indices;
        if (!Array.isArray(indices) || indices.length !== result.keepCount) return;

        choices[actor] = indices;
        setDraftChoices({ ...choices });

        const allSubmitted = allPlayers.every(name => choices[name]);
        if (allSubmitted) {
          completeDraft(choices);
        } else {
          // Advance to next unsubmitted player
          const nextPlayer = allPlayers.find(name => !choices[name]);
          if (nextPlayer) {
            setPendingAction({
              type: 'turn',
              action: 'choose_cards',
              playerName: nextPlayer,
              modeId: result.modeId,
              keepCount: result.keepCount,
              hands: result.draftHands,
            });
          }
        }
      };
    } else {
      // Multiplayer mode: all players pick simultaneously
      setPendingAction({
        type: 'choice',
        action: 'choose_cards',
        modeId: result.modeId,
        keepCount: result.keepCount,
        hands: result.draftHands,
        received: {},
        playersNeeded: allPlayers,
      });

      currentActionHandler.current = (payload) => {
        if (payload.action !== 'choose_cards') return;
        const actor = payload.playerName;
        if (!result.draftHands[actor]) return;
        if (choices[actor]) return; // Already submitted

        const indices = payload.indices;
        if (!Array.isArray(indices) || indices.length !== result.keepCount) return;

        choices[actor] = indices;
        setDraftChoices({ ...choices });

        // Check if all players have submitted
        const allSubmitted = allPlayers.every(name => choices[name]);

        if (allSubmitted) {
          completeDraft(choices);
        }
      };
    }

    function completeDraft(allChoices) {
      const finalResult = finalizeDraftResult(result, allChoices);
      finalResult.runId = result.runId;
      finalResult.taskLabel = result.taskLabel;

      setResult(finalResult);
      setPlaybackStep(0);
      setPendingAction(null);
      currentActionHandler.current = null;

      broadcastEvent({ type: 'draft_complete' });
      broadcastEvent({ type: 'game_start', result: finalResult });

      // Record to leaderboard now that hand is finalized
      if (!finalResult.isTie) {
        pushHistory(finalResult);
      }
    }

  }, [interactiveMode, localInteractiveMode, gameActive, result?.draftPhase]);

  // Expose draft choices on window for PokerPlayback to read
  useEffect(() => {
    window.__draftChoices = draftChoices;
  }, [draftChoices]);

  // Interactive Stock Market draft management
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result || result.modeId !== 'stock-market') return;
    if (!result.draftPhase) return;

    // Initialize draft state if not already
    if (!stockDraftState) {
      const initial = { taken: {}, currentPickerIndex: 0, playerStocks: {} };
      setStockDraftState(initial);
      window.__stockDraftState = initial;
      return;
    }

    const { taken, currentPickerIndex, playerStocks } = stockDraftState;
    const { pickOrder, stockPool } = result;

    // Sync to window for StockMarketPlayback to read
    window.__stockDraftState = stockDraftState;

    // Check if draft is complete
    if (currentPickerIndex >= pickOrder.length) {
      // All players have picked — finalize and start chart
      finalizeDraft();
      return;
    }

    const currentPicker = pickOrder[currentPickerIndex];

    // Broadcast draft state
    broadcastEvent({
      type: 'choice_prompt',
      action: 'pick_stock',
      stockPool: stockPool.map(s => ({ ticker: s.ticker, note: s.note })),
      pickOrder,
      currentPicker,
      taken,
    });

    setPendingAction({
      type: 'turn',
      action: 'pick_stock',
      playerName: currentPicker,
      stockPool: stockPool.map(s => ({ ticker: s.ticker, note: s.note })),
      taken,
    });

    currentActionHandler.current = (payload) => {
      if (payload.action !== 'pick_stock' || payload.playerName !== currentPicker) return;
      const ticker = payload.ticker;
      if (!ticker || taken[ticker]) return; // Invalid or already taken
      if (!stockPool.find(s => s.ticker === ticker)) return;

      const newTaken = { ...taken, [ticker]: currentPicker };
      const newPlayerStocks = { ...playerStocks, [currentPicker]: ticker };

      broadcastEvent({
        type: 'stock_picked',
        playerName: currentPicker,
        ticker,
        taken: newTaken,
        nextPicker: pickOrder[currentPickerIndex + 1] || null,
      });

      setStockDraftState({
        taken: newTaken,
        currentPickerIndex: currentPickerIndex + 1,
        playerStocks: newPlayerStocks,
      });
    };

    function finalizeDraft() {
      // Build the chart result from player stock picks
      const chartResult = {
        modeId: "stock-market",
        modeName: "Stock Market",
        selectionGoal: result.selectionGoal,
        draftPhase: false,
        isInteractiveChart: true,
        stockPool: result.stockPool,
        playerStocks,
        selectedName: null,
        isTie: false,
        headline: "Trading...",
        summary: "Charts are live.",
        players: Object.entries(playerStocks).map(([name, ticker]) => {
          const stock = stockPool.find(s => s.ticker === ticker);
          if (!stock) return { name, selected: false, ticker, prices: Array(60).fill(100), startPrice: 100, endPrice: 100, percentChange: 0, headline: ticker, subline: "No data", rank: 0, chips: [ticker] };
          return {
            name,
            selected: false,
            ticker,
            prices: stock.prices,
            startPrice: 100,
            endPrice: stock.endPrice,
            percentChange: stock.percentChange,
            headline: ticker,
            subline: "$100 start",
            rank: 0,
            chips: [ticker],
          };
        }),
      };
      chartResult.runId = result.runId;
      chartResult.taskLabel = result.taskLabel;

      setResult(chartResult);
      setPlaybackStep(0);
      setPendingAction(null);
      currentActionHandler.current = null;

      broadcastEvent({ type: 'draft_complete' });
      broadcastEvent({ type: 'game_start', result: chartResult });
    }
  }, [interactiveMode, localInteractiveMode, gameActive, result, stockDraftState]);

  // Interactive Stock Market sell management
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result || result.modeId !== 'stock-market') return;
    if (result.draftPhase || !result.isInteractiveChart) return;

    // Sync sell state to window for StockMarketPlayback to read
    window.__stockSellState = stockSellState;
    window.__stockInteractive = true;

    // Set pending action for sell button (all players, real-time)
    const playerStocks = result.playerStocks || {};
    setPendingAction({
      type: 'realtime',
      action: 'sell',
      modeId: 'stock-market',
      playerStocks,
      sold: stockSellState,
    });

    currentActionHandler.current = (payload) => {
      if (payload.action !== 'sell') return;
      const actor = payload.playerName;
      if (stockSellState[actor]) return; // Already sold

      const ticker = playerStocks[actor];
      if (!ticker) return;

      const currentProgress = window.__stockDrawIndex || 0;
      const stock = result.players.find(p => p.name === actor);
      if (!stock) return;

      const priceIndex = Math.min(currentProgress, 59);
      const price = stock.prices[priceIndex];
      const percentChange = ((price - 100) / 100 * 100);

      const newSellState = {
        ...stockSellState,
        [actor]: { ticker, price, percentChange, progress: currentProgress / 59 },
      };

      setStockSellState(newSellState);
      window.__stockSellState = newSellState;

      broadcastEvent({
        type: 'stock_sold',
        playerName: actor,
        ticker,
        price: price.toFixed(2),
        percentChange: percentChange.toFixed(1),
      });
    };

    return () => {
      currentActionHandler.current = null;
    };
  }, [interactiveMode, localInteractiveMode, gameActive, result, stockSellState]);

  // Interactive Dice Duel — roll + optional re-roll
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result || result.modeId !== 'dice') return;
    if (playbackDone) {
      setPendingAction(null);
      currentActionHandler.current = null;
      // Re-resolve the result based on potentially re-rolled dice
      const selGoal = result.selectionGoal;
      const choosingWinner = selGoal === 'winner';
      const resolution = resolveByGoal(result.players, (p) => [p.total, p.d1, p.d2], selGoal);
      const tiedNames = resolution.tied.map(p => p.name);
      const hasTie = tiedNames.length > 1;
      const selectedName = hasTie ? null : resolution.picked.name;

      result.isTie = hasTie;
      result.tiedNames = hasTie ? tiedNames : undefined;
      result.selectedName = selectedName;
      result.headline = hasTie ? "IT'S A TIE" : pickRandomMessage(
        selGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
        selectedName,
        selGoal === "winner" ? "win" : "lose"
      );

      result.players.forEach(p => {
        const isTied = hasTie && tiedNames.includes(p.name);
        p.headline = p.d1 + ' + ' + p.d2 + ' = ' + p.total;
        p.subline = hasTie
          ? (isTied ? "TIED" : "Not selected")
          : (p.name === selectedName ? (choosingWinner ? "Highest" : "Lowest") + " roll" : "Not selected");
        p.selected = hasTie ? false : p.name === selectedName;
        p.tied = isTied;
      });

      return;
    }

    const playerIndex = playbackStep;
    if (playerIndex >= result.players.length) {
      advancePlayback();
      return;
    }
    const currentPlayer = result.players[playerIndex];
    const playerNameCur = currentPlayer?.name;
    if (!playerNameCur) return;

    broadcastEvent({ type: 'turn_prompt', playerName: playerNameCur, action: 'roll_dice' });
    setPendingAction({ type: 'turn', playerName: playerNameCur, action: 'roll_dice' });

    currentActionHandler.current = (payload) => {
      if (payload.playerName !== playerNameCur) return;

      if (payload.action === 'roll_dice') {
        // Show roll result and give re-roll option
        broadcastEvent({
          type: 'turn_prompt', playerName: playerNameCur, action: 'reroll_dice',
          d1: currentPlayer.d1, d2: currentPlayer.d2, total: currentPlayer.total,
        });
        setPendingAction({
          type: 'turn', playerName: playerNameCur, action: 'reroll_dice',
          d1: currentPlayer.d1, d2: currentPlayer.d2, total: currentPlayer.total,
        });

        currentActionHandler.current = (payload2) => {
          if (payload2.playerName !== playerNameCur) return;
          if (payload2.action === 'keep_dice') {
            advancePlayback();
          } else if (payload2.action === 'reroll_die') {
            const dieIndex = payload2.dieIndex; // 0 or 1
            const newValue = 1 + secureRandomInt(6);
            if (dieIndex === 0) {
              currentPlayer.d1 = newValue;
            } else {
              currentPlayer.d2 = newValue;
            }
            currentPlayer.total = currentPlayer.d1 + currentPlayer.d2;
            currentPlayer.headline = currentPlayer.d1 + ' + ' + currentPlayer.d2 + ' = ' + currentPlayer.total;
            advancePlayback();
          }
        };
      }
    };
  }, [interactiveMode, localInteractiveMode, gameActive, result, playbackStep, playbackDone]);

  // Interactive High Card — blind card pick
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result || result.modeId !== 'high-card') return;
    if (!result.draftPhase) return;

    // Deal 3 cards per player for blind pick
    broadcastEvent({
      type: 'choice_prompt',
      action: 'pick_card_blind',
      hands: result.draftHands,
    });

    const allPlayers = Object.keys(result.draftHands);
    const choices = {};

    if (localInteractiveMode && !interactiveMode) {
      // Local mode: cycle through players one at a time with handoff
      const currentPicker = allPlayers[0];
      setPendingAction({
        type: 'turn',
        action: 'pick_card_blind',
        playerName: currentPicker,
        hands: result.draftHands,
      });

      currentActionHandler.current = (payload) => {
        if (payload.action !== 'pick_card_blind') return;
        const actor = payload.playerName;
        if (!result.draftHands[actor]) return;
        if (choices[actor] !== undefined) return;

        const cardIndex = payload.cardIndex;
        if (typeof cardIndex !== 'number' || cardIndex < 0 || cardIndex >= 3) return;

        choices[actor] = cardIndex;
        setHighCardDraftHands(prev => ({ ...prev, [actor]: cardIndex }));

        if (allPlayers.every(name => choices[name] !== undefined)) {
          finalizeHighCard(choices);
        } else {
          // Advance to next unsubmitted player
          const nextPlayer = allPlayers.find(name => choices[name] === undefined);
          if (nextPlayer) {
            setPendingAction({
              type: 'turn',
              action: 'pick_card_blind',
              playerName: nextPlayer,
              hands: result.draftHands,
            });
          }
        }
      };
    } else {
      // Multiplayer mode: all players pick simultaneously
      setPendingAction({
        type: 'choice',
        action: 'pick_card_blind',
        hands: result.draftHands,
        received: {},
        playersNeeded: allPlayers,
      });

      currentActionHandler.current = (payload) => {
        if (payload.action !== 'pick_card_blind') return;
        const actor = payload.playerName;
        if (!result.draftHands[actor]) return;
        if (choices[actor] !== undefined) return;

        const cardIndex = payload.cardIndex;
        if (typeof cardIndex !== 'number' || cardIndex < 0 || cardIndex >= 3) return;

        choices[actor] = cardIndex;
        setHighCardDraftHands(prev => ({ ...prev, [actor]: cardIndex }));

        if (allPlayers.every(name => choices[name] !== undefined)) {
          finalizeHighCard(choices);
        }
      };
    }

    function finalizeHighCard(allChoices) {
      const selGoal = result.selectionGoal;
      const choosingWinner = selGoal === 'winner';

      const players = Object.entries(allChoices).map(([name, idx]) => {
        const card = result.draftHands[name][idx];
        return { name, card, cards: [card] };
      });

      const resolution = resolveByGoal(players, (p) => [p.card.rank], selGoal);
      const tiedNames = resolution.tied.map(p => p.name);
      const hasTie = tiedNames.length > 1;
      const selectedName = hasTie ? null : resolution.picked.name;

      const modeName = "High Card Draw";
      const headline = hasTie ? "IT'S A TIE" : pickRandomMessage(
        selGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
        selectedName,
        selGoal === "winner" ? "win" : "lose"
      );

      const finalResult = {
        modeId: "high-card",
        modeName,
        selectionGoal: selGoal,
        selectedName,
        isTie: hasTie,
        tiedNames: hasTie ? tiedNames : undefined,
        headline,
        summary: hasTie
          ? tiedNames.join(" and ") + " drew the same rank!"
          : "Everyone picked a card blind. " + (choosingWinner ? "Highest" : "Lowest") + " rank gets selected.",
        draftPhase: false,
        players: players.map(p => {
          const isTied = hasTie && tiedNames.includes(p.name);
          return {
            name: p.name,
            cards: [p.card],
            card: p.card,
            headline: formatCard(p.card),
            subline: hasTie
              ? (isTied ? "TIED" : "Not selected")
              : (p.name === selectedName ? (choosingWinner ? "Highest" : "Lowest") + " card" : "Not selected"),
            selected: hasTie ? false : p.name === selectedName,
            tied: isTied,
            chips: [rankWord(p.card.rank)],
          };
        }),
      };
      finalResult.runId = result.runId;
      finalResult.taskLabel = result.taskLabel;

      setResult(finalResult);
      setPlaybackStep(0);
      setPendingAction(null);
      currentActionHandler.current = null;

      broadcastEvent({ type: 'draft_complete' });
      broadcastEvent({ type: 'game_start', result: finalResult });

      if (!finalResult.isTie) {
        pushHistory(finalResult);
      }
    }

  }, [interactiveMode, localInteractiveMode, gameActive, result?.draftPhase, result?.modeId]);

  // Interactive Plinko — choose drop column
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result || result.modeId !== 'plinko') return;
    if (playbackDone) {
      setPendingAction(null);
      currentActionHandler.current = null;
      // Re-resolve winner based on updated scores
      const selGoal = result.selectionGoal;
      const resolution = resolveByGoal(result.players, (p) => [p.score], selGoal);
      const tiedNames = resolution.tied.map(p => p.name);
      const hasTie = tiedNames.length > 1;
      const selectedName = hasTie ? null : resolution.picked.name;

      result.isTie = hasTie;
      result.tiedNames = hasTie ? tiedNames : undefined;
      result.selectedName = hasTie ? null : selectedName;
      result.headline = hasTie
        ? 'It\'s a tie between ' + tiedNames.join(' and ') + '!'
        : pickRandomMessage(
            selGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
            selectedName,
            selGoal === "winner" ? "win" : "lose"
          );
      result.players.forEach(p => {
        p.selected = hasTie ? false : p.name === selectedName;
        p.tied = hasTie && tiedNames.includes(p.name);
      });
      return;
    }

    const playerIndex = playbackStep;
    if (playerIndex >= result.players.length) {
      advancePlayback();
      return;
    }
    const currentPlayer = result.players[playerIndex];
    const playerNameCur = currentPlayer?.name;
    if (!playerNameCur) return;

    broadcastEvent({ type: 'turn_prompt', playerName: playerNameCur, action: 'drop_plinko' });
    setPendingAction({ type: 'turn', playerName: playerNameCur, action: 'drop_plinko', slotCount: 13 });

    currentActionHandler.current = (payload) => {
      if (payload.action !== 'drop_plinko' || payload.playerName !== playerNameCur) return;
      const col = typeof payload.column === 'number' ? Math.max(0, Math.min(12, payload.column)) : secureRandomInt(13);

      // Regenerate path from chosen starting column
      // The original plinko: path is array of 0/1, finalSlot = sum of path values (0..12)
      // With column choice, we bias the path towards the chosen column area
      const SLOT_VALUES = [1, 2, 3, 5, 8, 13, 21, 13, 8, 5, 3, 2, 1];
      const ROWS = 12;
      const path = [];
      // Bias: distribute roughly (col) 1s across the path, rest 0s, with randomness
      const targetOnes = col;
      let onesLeft = targetOnes;
      let slotsLeft = ROWS;
      for (let r = 0; r < ROWS; r++) {
        // Probability of placing a 1 here = onesLeft / slotsLeft, with some noise
        const prob = Math.max(0, Math.min(1, onesLeft / slotsLeft + (Math.random() - 0.5) * 0.3));
        const choice = Math.random() < prob ? 1 : 0;
        path.push(choice);
        if (choice === 1) onesLeft--;
        slotsLeft--;
      }
      let finalSlot = 0;
      for (let r = 0; r < ROWS; r++) {
        finalSlot += path[r];
      }
      finalSlot = Math.max(0, Math.min(12, finalSlot));
      const score = SLOT_VALUES[finalSlot];

      currentPlayer.path = path;
      currentPlayer.finalSlot = finalSlot;
      currentPlayer.score = score;
      currentPlayer.headline = 'Slot ' + (finalSlot + 1) + ': ' + score + ' pts';
      currentPlayer.subline = 'Scored ' + score + ' point' + (score !== 1 ? 's' : '');
      currentPlayer.chips = [score + ' pts', 'Slot #' + (finalSlot + 1)];
      currentPlayer.startCol = col;

      advancePlayback();
    };

  }, [interactiveMode, localInteractiveMode, gameActive, result, playbackStep, playbackDone]);

  // Interactive Horse Race — lane pick + whip
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result || result.modeId !== 'horse-race') return;

    // Phase 1: Lane pick draft
    if (result.draftPhase) {
      if (!horseLanePicks) {
        const initial = { taken: {}, currentPickerIndex: 0, playerLanes: {} };
        setHorseLanePicks(initial);
        return;
      }

      const { taken, currentPickerIndex, playerLanes } = horseLanePicks;
      const pickOrder = result.lanePickOrder;
      const lanes = result.lanes;

      if (currentPickerIndex >= pickOrder.length) {
        // All picked — finalize and start race
        const raceResult = {
          ...result,
          draftPhase: false,
          playerLanes,
        };
        raceResult.runId = result.runId;
        raceResult.taskLabel = result.taskLabel;
        setResult(raceResult);
        setPlaybackStep(0);
        setPendingAction(null);
        currentActionHandler.current = null;
        setHorseWhips(Object.fromEntries(result.lanePickOrder.map(n => [n, 2])));
        broadcastEvent({ type: 'draft_complete' });
        broadcastEvent({ type: 'game_start', result: raceResult });
        return;
      }

      const currentPicker = pickOrder[currentPickerIndex];

      broadcastEvent({
        type: 'choice_prompt',
        action: 'pick_lane',
        lanes,
        currentPicker,
        taken,
      });

      setPendingAction({
        type: 'turn',
        action: 'pick_lane',
        playerName: currentPicker,
        lanes,
        taken,
      });

      currentActionHandler.current = (payload) => {
        if (payload.action !== 'pick_lane' || payload.playerName !== currentPicker) return;
        const lane = payload.lane;
        if (!lane || taken[lane]) return;
        if (!lanes.includes(lane)) return;

        const newTaken = { ...taken, [lane]: currentPicker };
        const newPlayerLanes = { ...playerLanes, [currentPicker]: lane };

        setHorseLanePicks({
          taken: newTaken,
          currentPickerIndex: currentPickerIndex + 1,
          playerLanes: newPlayerLanes,
        });
      };

    }

    // Phase 2: Race with whip — step-based
    if (playbackDone) {
      setPendingAction(null);
      currentActionHandler.current = null;
      // Re-resolve winner from final positions (whips may have changed things)
      const selGoal = result.selectionGoal;
      const choosingWinner = selGoal === 'winner';
      const finalPositions = result.turns.length > 0 ? result.turns[result.turns.length - 1].positions : {};
      result.players.forEach(p => { p.progress = finalPositions[p.name] || p.progress; });
      const resolution = resolveByGoal(result.players, (p) => [p.progress], selGoal);
      const tiedNames = resolution.tied.map(p => p.name);
      const hasTie = tiedNames.length > 1;
      const selectedName = hasTie ? null : resolution.picked.name;

      result.isTie = hasTie;
      result.tiedNames = hasTie ? tiedNames : undefined;
      result.selectedName = selectedName;
      result.headline = hasTie ? "IT'S A TIE" : pickRandomMessage(
        selGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
        selectedName,
        selGoal === "winner" ? "win" : "lose"
      );
      result.players.forEach(p => {
        const isTied = hasTie && tiedNames.includes(p.name);
        p.headline = p.progress + ' spaces moved';
        p.subline = hasTie
          ? (isTied ? "TIED" : "Not selected")
          : (p.name === selectedName ? 'Finished ' + (choosingWinner ? "in front" : "at the back") : "Not selected");
        p.selected = hasTie ? false : p.name === selectedName;
        p.tied = isTied;
      });
      return;
    }

    const turnIndex = playbackStep;
    if (turnIndex >= result.turns.length) {
      advancePlayback();
      return;
    }

    // Give all surviving players a chance to whip for 4 seconds
    const aliveNames = result.players.map(p => p.name);

    broadcastEvent({
      type: 'turn_prompt',
      action: 'whip_horse',
      turnNumber: turnIndex + 1,
      totalTurns: result.turns.length,
      whipsRemaining: horseWhips,
    });

    setPendingAction({
      type: 'realtime',
      action: 'whip_horse',
      modeId: 'horse-race',
      turnNumber: turnIndex + 1,
      totalTurns: result.turns.length,
      whipsRemaining: horseWhips,
    });

    currentActionHandler.current = (payload) => {
      if (payload.action !== 'whip_horse') return;
      const actor = payload.playerName;
      if (!actor || !horseWhips[actor] || horseWhips[actor] <= 0) return;

      // Apply whip: guaranteed advance this turn
      const turn = result.turns[turnIndex];
      if (!turn) return;

      // Advance this player's position
      turn.positions[actor] = (turn.positions[actor] || 0) + 1;
      // Update all future turns
      for (let i = turnIndex + 1; i < result.turns.length; i++) {
        result.turns[i].positions[actor] = (result.turns[i].positions[actor] || 0) + 1;
      }
      // Update player final position
      const p = result.players.find(pl => pl.name === actor);
      if (p) {
        p.progress = (p.progress || 0) + 1;
        p.headline = p.progress + ' spaces moved';
      }

      setHorseWhips(prev => ({ ...prev, [actor]: prev[actor] - 1 }));

      broadcastEvent({
        type: 'horse_whip',
        playerName: actor,
        whipsRemaining: horseWhips[actor] - 1,
      });
    };
  }, [interactiveMode, localInteractiveMode, gameActive, result, playbackStep, playbackDone, horseLanePicks, result?.draftPhase]);

  // Interactive Space Invaders — shield reaction
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result || result.modeId !== 'space-invaders') return;
    if (playbackDone) { setPendingAction(null); currentActionHandler.current = null; return; }

    const elimIndex = playbackStep;
    if (elimIndex >= result.eliminationOrder.length) {
      // All eliminations processed, advance to finish
      advancePlayback();
      return;
    }

    let targetName = result.eliminationOrder[elimIndex];

    // If target has a shield and hasn't used it yet, give them a chance
    if (!usedShields[targetName]) {
      broadcastEvent({
        type: 'turn_prompt',
        playerName: targetName,
        action: 'shield',
        elimIndex,
      });

      setPendingAction({
        type: 'turn',
        playerName: targetName,
        action: 'shield',
        elimIndex,
      });

      currentActionHandler.current = (payload) => {
        if (payload.action !== 'shield' || payload.playerName !== targetName) return;

        setUsedShields(prev => ({ ...prev, [targetName]: true }));

        // Re-pick target: random from remaining (not shielded target, not already eliminated)
        const eliminated = result.eliminationOrder.slice(0, elimIndex);
        const remaining = result.players
          .map(p => p.name)
          .filter(n => n !== targetName && !eliminated.includes(n));

        if (remaining.length > 0) {
          const newTarget = remaining[secureRandomInt(remaining.length)];
          // Swap in elimination order
          const newTargetElimIdx = result.eliminationOrder.indexOf(newTarget);
          if (newTargetElimIdx >= 0) {
            result.eliminationOrder[elimIndex] = newTarget;
            result.eliminationOrder[newTargetElimIdx] = targetName;
          } else {
            result.eliminationOrder[elimIndex] = newTarget;
          }

          // Update player data
          result.players.forEach(p => {
            const ei = result.eliminationOrder.indexOf(p.name);
            const isSurvivor = ei === -1 || ei >= result.eliminationOrder.length;
            if (isSurvivor) {
              p.headline = "LAST ALIEN STANDING";
              p.subline = "Survived the onslaught";
              p.chips = ["Survivor"];
              p.destroyedAt = null;
            } else {
              p.destroyedAt = ei + 1;
              p.headline = 'Destroyed: Shot #' + (ei + 1);
              p.subline = 'Eliminated';
              p.chips = ['Shot #' + (ei + 1)];
            }
          });

          broadcastEvent({ type: 'shield_used', playerName: targetName, newTarget: newTarget });
        }

        advancePlayback();
      };
    } else {
      // Target already used shield — just advance
      setPendingAction({
        type: 'turn',
        playerName: targetName,
        action: 'shield_unavailable',
      });

      broadcastEvent({
        type: 'turn_prompt',
        playerName: targetName,
        action: 'shield_unavailable',
      });

      setTimeout(() => advancePlayback(), 0);
    }
  }, [interactiveMode, localInteractiveMode, gameActive, result, playbackStep, playbackDone, usedShields]);

  // Interactive Battle Royale — directional movement
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result || result.modeId !== 'battle-royale') return;
    if (playbackDone) { setPendingAction(null); currentActionHandler.current = null; return; }

    const phase = playbackStep; // 0-indexed, each phase = one elimination
    if (phase >= result.zones.length - 1) {
      advancePlayback();
      return;
    }

    const nextZone = result.zones[phase + 1];
    const eliminated = result.eliminationOrder.slice(0, phase);
    const alive = result.players.filter(p => !eliminated.includes(p.name)).map(p => p.name);

    if (alive.length <= 1) return;

    // Collect movement choices from all alive players
    const MOVE_TIMEOUT_MS = 8000;
    broadcastEvent({
      type: 'choice_prompt',
      action: 'move_direction',
      aliveNames: alive,
      zone: nextZone,
      phase: phase + 1,
    });

    const moveChoices = {};
    let moveResolutionTimer = null;
    let movesResolved = false;

    function lockMove(actor, dir) {
      moveChoices[actor] = dir;
      setBattleMoves(prev => ({ ...prev, [actor]: dir }));
      setPendingAction(prev => prev && prev.action === 'move_direction'
        ? { ...prev, received: { ...(prev.received || {}), [actor]: dir } }
        : prev);
    }

    function finalizeMoves(moves) {
      if (movesResolved) return;
      movesResolved = true;
      if (moveResolutionTimer) clearTimeout(moveResolutionTimer);
      applyMovesAndAdvance(moves);
    }

    if (localInteractiveMode && !interactiveMode) {
      // Local mode: cycle through alive players one at a time
      const currentMover = alive[0];
      setPendingAction({
        type: 'turn',
        action: 'move_direction',
        playerName: currentMover,
        aliveNames: alive,
        zone: nextZone,
        phase: phase + 1,
      });

      currentActionHandler.current = (payload) => {
        if (payload.action !== 'move_direction') return;
        const actor = payload.playerName;
        if (!alive.includes(actor) || moveChoices[actor]) return;

        const dir = payload.direction;
        if (!['up', 'down', 'left', 'right', 'stay'].includes(dir)) return;

        lockMove(actor, dir);

        if (alive.every(name => moveChoices[name])) {
          finalizeMoves(moveChoices);
        } else {
          const nextMover = alive.find(name => !moveChoices[name]);
          if (nextMover) {
            setPendingAction({
              type: 'turn',
              action: 'move_direction',
              playerName: nextMover,
              aliveNames: alive,
              zone: nextZone,
              phase: phase + 1,
            });
          }
        }
      };
    } else {
      // Multiplayer mode: all alive players move simultaneously
      setPendingAction({
        type: 'choice',
        action: 'move_direction',
        aliveNames: alive,
        zone: nextZone,
        phase: phase + 1,
        received: {},
        deadline: Date.now() + MOVE_TIMEOUT_MS,
      });

      currentActionHandler.current = (payload) => {
        if (payload.action !== 'move_direction') return;
        const actor = payload.playerName;
        if (!alive.includes(actor) || moveChoices[actor]) return;

        const dir = payload.direction;
        if (!['up', 'down', 'left', 'right', 'stay'].includes(dir)) return;

        lockMove(actor, dir);

        // Check if all alive players have moved
        if (alive.every(name => moveChoices[name])) {
          finalizeMoves(moveChoices);
        }
      };

      moveResolutionTimer = setTimeout(() => {
        const fallbackMoves = {};
        alive.forEach(name => {
          fallbackMoves[name] = moveChoices[name] || 'stay';
        });
        finalizeMoves(fallbackMoves);
      }, MOVE_TIMEOUT_MS);
    }

    function applyMovesAndAdvance(moves) {
      const MOVE_DIST = 10;
      const dirMap = {
        up: { dx: 0, dy: -MOVE_DIST },
        down: { dx: 0, dy: MOVE_DIST },
        left: { dx: -MOVE_DIST, dy: 0 },
        right: { dx: MOVE_DIST, dy: 0 },
        stay: { dx: 0, dy: 0 },
      };

      // Apply moves to positions
      alive.forEach(name => {
        const dir = moves[name] || 'stay';
        const pos = result.positions.find(p => p.name === name);
        if (!pos) return;
        const d = dirMap[dir];
        pos.x = Math.max(0, Math.min(100, pos.x + d.dx));
        pos.y = Math.max(0, Math.min(100, pos.y + d.dy));
        const player = result.players.find(p => p.name === name);
        if (player) {
          player.x = pos.x;
          player.y = pos.y;
        }
      });

      // Recalculate who's farthest from zone center
      let farthest = null;
      let farthestDist = -1;
      for (const name of alive) {
        const pos = result.positions.find(p => p.name === name);
        const dx = pos.x - nextZone.cx;
        const dy = pos.y - nextZone.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > farthestDist) {
          farthestDist = dist;
          farthest = name;
        }
      }

      // Update elimination order for this phase
      if (farthest) {
        result.eliminationOrder[phase] = farthest;

        // Update player data
        result.players.forEach(p => {
          const ei = result.eliminationOrder.indexOf(p.name);
          const isEliminated = ei >= 0 && ei <= phase;
          if (isEliminated) {
            p.headline = 'Eliminated: Phase ' + (ei + 1);
            p.subline = 'Caught outside zone ' + (ei + 1);
            p.chips = ['Phase ' + (ei + 1)];
            p.selected = false;
            p.rank = result.players.length - ei;
          }
        });

        // Check if only one remains
        const remaining = alive.filter(n => n !== farthest);
        if (remaining.length === 1) {
          const survivor = remaining[0];
          const selectedName = result.selectionGoal === 'winner' ? survivor : result.eliminationOrder[0];
          result.selectedName = selectedName;
          const sp = result.players.find(p => p.name === survivor);
          if (sp) {
            sp.headline = "VICTORY ROYALE";
            sp.subline = "Last one in the zone";
            sp.chips = ["Winner"];
            sp.rank = 1;
          }
          result.players.forEach(p => {
            p.selected = p.name === selectedName;
          });
          result.headline = pickRandomMessage(
            result.selectionGoal === "winner" ? WIN_MESSAGES : LOSE_MESSAGES,
            selectedName,
            result.selectionGoal === "winner" ? "win" : "lose"
          );
          result.summary = result.selectionGoal === 'winner'
            ? 'The zone closed in ' + (phase + 1) + ' times. ' + survivor + ' was the last one standing.'
            : selectedName + ' was the first one caught outside the zone.';
        }
      }

      advancePlayback();
    }

    return () => {
      if (moveResolutionTimer) clearTimeout(moveResolutionTimer);
    };
  }, [interactiveMode, localInteractiveMode, gameActive, result, playbackStep, playbackDone]);

  // Interactive turn management for RNG, Wheel, Slots, Coin Gauntlet
  useEffect(() => {
    if (!(interactiveMode || localInteractiveMode) || !gameActive || !result) return;
    const mode = result.modeId;
    if (['black-marble', 'bomb', 'rocket', 'holdem', 'plo', 'stock-market', 'dice', 'high-card', 'plinko', 'horse-race', 'space-invaders', 'battle-royale'].includes(mode)) return;
    if (playbackDone) { setPendingAction(null); currentActionHandler.current = null; return; }

    let action, playerName;

    if (mode === 'rng' || mode === 'slots') {
      // Step-based, one player per step
      const playerIndex = playbackStep;
      if (playerIndex >= result.players.length) return;
      playerName = result.players[playerIndex]?.name;
      action = mode === 'rng' ? 'stop_number' : 'pull_slots';
    } else if (mode === 'wheel') {
      // Single spin — first player gets the button
      if (playbackStep >= 1) return;
      playerName = result.players[0]?.name;
      action = 'spin_wheel';
    } else if (mode === 'coin-flips') {
      // Per-player sequential: player 1 does all 5 flips, then player 2, etc.
      const totalFlipSteps = result.players.length * 5;
      if (playbackStep >= totalFlipSteps) return;
      const currentPlayerIdx = Math.floor(playbackStep / 5);
      playerName = result.players[currentPlayerIdx]?.name;
      action = 'flip_coin';
    } else {
      return;
    }

    if (!playerName) return;

    broadcastEvent({
      type: 'turn_prompt',
      playerName,
      action,
    });

    setPendingAction({
      type: 'turn',
      playerName,
      action,
    });

    currentActionHandler.current = (payload) => {
      if (payload.action !== action || payload.playerName !== playerName) return;
      advancePlayback();
    };
  }, [interactiveMode, localInteractiveMode, gameActive, result, playbackStep, playbackDone]);

  // ── Vote handler + auto-resolve timer ─────────────────────
  useEffect(() => {
    if (!voteActive) return;

    currentActionHandler.current = (payload) => {
      if (payload.action !== 'vote_game') return;
      const voter = payload.playerName;
      const modeId = payload.modeId;
      if (!voter || !modeId) return;

      setVotes(prev => {
        const updated = { ...prev, [voter]: modeId };
        votesRef.current = updated;
        return updated;
      });

      // Broadcast the vote to everyone
      broadcastEvent({ type: 'vote_cast', playerName: voter, modeId });
    };

    // 30-second timeout
    const timer = setTimeout(() => resolveVote(), 30000);
    return () => clearTimeout(timer);
  }, [voteActive]);

  // Check if all players have voted
  useEffect(() => {
    if (!voteActive) return;
    const allPlayerNames = Object.keys(joinedPlayers);
    const allVoted = allPlayerNames.length > 0 && allPlayerNames.every(name => votes[name]);
    if (allVoted) resolveVote();
  }, [votes, voteActive, joinedPlayers]);

  const cleanedNames = useMemo(() => names.map((name) => name.trim()), [names]);
  const filledNames = cleanedNames.filter(Boolean);
  const nameSet = new Set(filledNames);
  const allFilled = cleanedNames.every(Boolean);
  const namesAreUnique = nameSet.size === cleanedNames.length;
  const hasEnoughPlayers = cleanedNames.length >= 2;
  const multiplayerReady = interactiveMode && Object.keys(joinedPlayers).length >= 2;
  const canRun = multiplayerReady || (allFilled && namesAreUnique && hasEnoughPlayers);
  const currentConfig = result ? getPlaybackConfig(result) : null;

  useEffect(() => {
    if (!import.meta.env.DEV || !result) return;
    const issues = getPlaybackConfigDiagnostics(result);
    if (issues.length > 0) {
      console.warn(`[runouts] Playback config warnings for ${result.modeId}:`, issues, result);
    }
  }, [result?.runId, result?.modeId, result?.draftPhase]);

  function updateName(index, value) {
    setNames((current) => current.map((entry, idx) => (idx === index ? value : entry)));
  }

  function addPlayer() {
    setNames((current) => [...current, ""]);
  }

  function removePlayer(index) {
    if (names.length <= 2) return;
    setNames((current) => current.filter((_, idx) => idx !== index));
  }

  async function recordGame(outcome) {
    if (!_supabase || outcome.isTie || outcome.isTournament || !outcome.players) return;
    try {
      await _supabase.from('runouts_games').insert({
        mode_id: outcome.modeId,
        mode_name: outcome.modeName,
        selection_goal: outcome.selectionGoal,
        stakes: outcome.taskLabel || null,
        selected_player: outcome.selectedName,
        all_players: outcome.players.map(p => ({
          name: p.name,
          selected: p.selected || false,
          headline: p.headline || null,
        })),
        headline: outcome.headline,
      });
    } catch (e) {
      // Silent fail — don't block gameplay
    }
  }

  function pushHistory(outcome) {
    if (outcome.isTie) return; // Don't push tie rounds to history; wait for resolution
    const historyFormat = outcome.historyFormat || (outcome.isTournament ? "tournament" : outcome.isSeriesSuddenDeath || seriesActive ? "series" : "single");
    setHistory((current) => [
      {
        id: `${Date.now()}-${secureRandomInt(100000)}`,
        modeName: outcome.modeName,
        selectedName: outcome.selectedName,
        selectionGoal: outcome.selectionGoal,
        format: historyFormat,
        suddenDeath: outcome.suddenDeathRound > 0,
      },
      ...current,
    ].slice(0, 8));
    // Fire-and-forget: record to Supabase then refresh leaderboard
    recordGame(outcome).then(() => fetchLeaderboard());
  }

  // ── Series helpers ──
  function resetSeriesState() {
    setSeriesActive(false);
    setSeriesConfig(null);
    setSeriesScores({});
    setSeriesRound(0);
    setSeriesHistory([]);
    setSeriesComplete(false);
    setShowSeriesSetup(false);
    setShowSeriesScoreboard(false);
    setSeriesTied(null);
    seriesScoreRef.current = {};
    seriesRoundRecordedRef.current = null;
  }

  function resetTransientGameState() {
    setPendingAction(null);
    currentActionHandler.current = null;
    setPlaybackStep(0);
    setPlaybackDone(false);
    setSuddenDeathRound(0);
    setSuddenDeathNames(null);
    setInteractiveBombState(null);
    setInteractiveRocketEjects({});
    setDraftChoices({});
    setStockDraftState(null);
    setStockSellState({});
    setHighCardDraftHands(null);
    setHorseWhips({});
    setHorseLanePicks(null);
    setUsedShields({});
    setBattleMoves(null);
    setHandoffReady(false);
    setVoteActive(false);
    setVotes({});
    votesRef.current = {};
    setVoteDeadline(null);
    setShowSeriesScoreboard(false);
    window.__interactiveRocketEjects = {};
    window.__draftChoices = {};
    window.__rocketInteractive = false;
    window.__rocketElapsed = 0;
    window.__stockSellState = {};
    window.__stockDraftState = null;
    window.__stockInteractive = false;
    window.__stockDrawIndex = 0;
  }

  function isSeriesClinched(scores, totalRounds, currentRound) {
    const vals = Object.values(scores);
    if (vals.length === 0) return false;
    const sorted = [...vals].sort((a, b) => b - a);
    const maxScore = sorted[0];
    const secondHighest = sorted[1] || 0;
    const remainingRounds = totalRounds - currentRound;
    if (currentRound >= totalRounds) return true;
    if (maxScore > secondHighest + remainingRounds) return true;
    return false;
  }

  function startSeriesNextRound(forcedModeId) {
    // Start the next round in an active series
    if (forcedModeId) {
      setGameActive(false);
      setTimeout(() => startGame(forcedModeId), 100);
    } else {
      setGameActive(false);
      setTimeout(() => startGame(pickRandom(MODES).id), 100);
    }
  }

  function startSeriesSuddenDeath(forcedModeId) {
    // Sudden death round — only the tied players participate
    if (!seriesTied || seriesTied.length < 2) return;
    const tiedPlayerNames = seriesTied;
    setSeriesTied(null);
    setSeriesRound(prev => prev + 1);
    resetTransientGameState();

    const modeId = forcedModeId || pickRandom(MODES).id;
    const outcome = {
      ...createOutcome(modeId, tiedPlayerNames),
      runId: `${Date.now()}-${secureRandomInt(100000)}`,
    };
    outcome.taskLabel = taskLabel.trim();
    outcome.isSeriesSuddenDeath = true;
    if (outcome.modeId === "wheel" && outcome.wheel) {
      setWheelRotation(outcome.wheel.rotation);
    }
    setResult(outcome);
    setPlaybackStep(0);
    setPlaybackDone(false);
    setGameActive(true);
    setSuddenDeathRound(0);
    setSuddenDeathNames(null);
    setVoteActive(false);
    setVotes({}); votesRef.current = {};
    setVoteDeadline(null);
    setShowSeriesScoreboard(false);
    broadcastEvent({
      type: 'game_start',
      result: outcome,
      series: { active: true, config: seriesConfig, scores: seriesScoreRef.current, round: seriesRound + 1, history: seriesHistory, suddenDeath: true },
    });
  }

  function createOutcome(forcedModeId = null, forcedNames = null) {
    const resolvedModeId = forcedModeId
      ? forcedModeId
      : selectedModeId === "auto"
        ? pickRandom(MODES).id
        : selectedModeId;

    const activePlayerNames = (interactiveMode && Object.keys(joinedPlayers).length >= 2)
      ? Object.keys(joinedPlayers)
      : cleanedNames;
    const playerNames = forcedNames || activePlayerNames;

    if (!forcedNames && gameFormat === "tournament") {
      return buildTournamentOutcome(activePlayerNames, taskLabel.trim() || "do the chores", resolvedModeId, wheelRotation);
    }

    const mode = modeById(resolvedModeId);
    return {
      ...mode.run(playerNames, taskLabel.trim() || "do the chores", selectionGoal, wheelRotation),
      runId: `${Date.now()}-${secureRandomInt(100000)}`,
    };
  }

  function startGame(forcedModeId = null) {
    if (!canRun) return;
    resetTransientGameState();
    const wantsSeries = ['best-of-3', 'best-of-5', 'best-of-7'].includes(gameFormat);
    let nextSeriesActive = seriesActive;
    let nextSeriesConfig = seriesConfig;
    let nextSeriesScores = seriesScoreRef.current;
    let nextSeriesHistory = seriesHistory;
    let nextSeriesRound = seriesRound;

    // Initialize a new series if selecting a best-of format and not already in one
    if (wantsSeries && !seriesActive) {
      const totalRounds = gameFormat === 'best-of-3' ? 3 : gameFormat === 'best-of-5' ? 5 : 7;
      const seriesNames = (interactiveMode && Object.keys(joinedPlayers).length >= 2)
        ? Object.keys(joinedPlayers)
        : cleanedNames;
      const initScores = Object.fromEntries(seriesNames.map(n => [n, 0]));
      nextSeriesActive = true;
      nextSeriesConfig = { totalRounds, selectionGoal };
      nextSeriesScores = initScores;
      nextSeriesHistory = [];
      nextSeriesRound = 0;
      setSeriesActive(true);
      setSeriesConfig(nextSeriesConfig);
      setSeriesScores(initScores);
      seriesScoreRef.current = initScores;
      setSeriesRound(0);
      setSeriesHistory([]);
      setSeriesComplete(false);
      setShowSeriesScoreboard(false);
      setSeriesTied(null);
      // If interactive, start a vote for the first mode
      if (interactiveMode && !forcedModeId) {
        startVote();
        return;
      }
      // Otherwise fall through to start with forced mode or random
    }

    // If series is active, increment round counter
    if (nextSeriesActive) {
      nextSeriesRound += 1;
      setSeriesRound(nextSeriesRound);
    }

    const outcome = {
      ...createOutcome(forcedModeId),
      runId: `${Date.now()}-${secureRandomInt(100000)}`,
    };
    outcome.historyFormat = outcome.isTournament ? "tournament" : nextSeriesActive ? "series" : "single";
    outcome.taskLabel = taskLabel.trim();
    if (outcome.modeId === "wheel" && outcome.wheel) {
      setWheelRotation(outcome.wheel.rotation);
    }
    if (outcome.isTournament && outcome.wheelRotation) {
      setWheelRotation(outcome.wheelRotation);
    }
    setResult(outcome);
    setPlaybackStep(0);
    setPlaybackDone(false);
    setGameActive(true);
    // Don't record interactive bomb/rocket/poker-draft/stock-draft/high-card-draft/horse-race-draft immediately — they record on completion
    if (!((interactiveMode || localInteractiveMode) && (outcome.modeId === 'bomb' || outcome.modeId === 'rocket' || outcome.draftPhase))) {
      pushHistory(outcome);
    }
    broadcastEvent({
      type: 'game_start',
      result: outcome,
      series: nextSeriesActive ? { active: true, config: nextSeriesConfig, scores: nextSeriesScores, round: nextSeriesRound, history: nextSeriesHistory } : null,
    });
  }

  function startSuddenDeath() {
    if (!result || !result.isTie || !result.tiedNames) return;
    const nextRound = suddenDeathRound + 1;
    const tiedPlayerNames = result.tiedNames;
    resetTransientGameState();
    const outcome = {
      ...createOutcome(result.modeId, tiedPlayerNames),
      runId: `${Date.now()}-${secureRandomInt(100000)}`,
    };
    outcome.historyFormat = seriesActive ? "series" : "single";
    outcome.taskLabel = taskLabel.trim();
    if (outcome.modeId === "wheel" && outcome.wheel) {
      setWheelRotation(outcome.wheel.rotation);
    }
    // If sudden death resolved (no tie), annotate the result
    if (!outcome.isTie) {
      outcome.suddenDeathRound = nextRound;
      outcome.summary = outcome.summary + ` Decided after ${nextRound} round${nextRound > 1 ? "s" : ""} of sudden death.`;
      pushHistory(outcome);
    }
    setResult(outcome);
    setPlaybackStep(0);
    setPlaybackDone(false);
    setSuddenDeathRound(nextRound);
    setSuddenDeathNames(tiedPlayerNames);
    broadcastEvent({ type: 'game_start', result: outcome });
  }

  function playAgain() {
    if (!result || !canRun) return;
    startGame(result.modeId);
  }

  function advancePlayback() {
    if (!result || playbackDone) return;
    const config = getPlaybackConfig(result);
    const nextStep = Math.min(playbackStep + 1, config.totalSteps);
    setPlaybackStep(nextStep);
    if (nextStep >= config.totalSteps) {
      setPlaybackDone(true);
    }
    broadcastEvent({ type: 'step', step: nextStep, done: nextStep >= config.totalSteps });
  }

  function revealAll() {
    if (!result) return;
    const config = getPlaybackConfig(result);
    setPlaybackStep(config.totalSteps);
    setPlaybackDone(true);
    broadcastEvent({ type: 'step', step: config.totalSteps, done: true });
  }

  function exitGame() {
    resetTransientGameState();
    setGameActive(false);
    resetSeriesState();
    setGameFormat('single');
    broadcastEvent({ type: 'game_reset' });
  }

  // ── Series round completion tracking ──
  useEffect(() => {
    if (!seriesActive || !seriesConfig || !result || !playbackDone) return;
    if (result.isTie) return; // Don't count ties — wait for sudden death
    if (!result.selectedName) return;
    // Prevent double-recording the same round
    const roundKey = `${result.runId}-${seriesRound}`;
    if (seriesRoundRecordedRef.current === roundKey) return;
    seriesRoundRecordedRef.current = roundKey;

    const newScores = { ...seriesScoreRef.current };
    newScores[result.selectedName] = (newScores[result.selectedName] || 0) + 1;
    seriesScoreRef.current = newScores;
    setSeriesScores(newScores);

    const newHistory = [...seriesHistory, {
      round: seriesRound,
      modeId: result.modeId,
      modeName: result.modeName,
      selectedName: result.selectedName,
    }];
    setSeriesHistory(newHistory);

    // Check if clinched
    if (isSeriesClinched(newScores, seriesConfig.totalRounds, seriesRound)) {
      // Check for tie at the top
      const sorted = Object.entries(newScores).sort((a, b) => b[1] - a[1]);
      const topScore = sorted[0][1];
      const tiedPlayers = sorted.filter(([_, s]) => s === topScore).map(([n]) => n);

      if (tiedPlayers.length > 1 && seriesRound >= seriesConfig.totalRounds) {
        // TIE at the top — go to sudden death instead of declaring winner
        setSeriesTied(tiedPlayers);
        broadcastEvent({ type: 'series_update', scores: newScores, round: seriesRound, history: newHistory, complete: false, tied: tiedPlayers });
      } else {
        setSeriesComplete(true);
        broadcastEvent({ type: 'series_update', scores: newScores, round: seriesRound, history: newHistory, complete: true });
      }
    } else {
      broadcastEvent({ type: 'series_update', scores: newScores, round: seriesRound, history: newHistory, complete: false });
    }
  }, [seriesActive, playbackDone, result?.runId, seriesRound, seriesConfig, seriesHistory]);

  // ── Vote for Next Game ────────────────────────────────────

  function startVote() {
    const deadline = Date.now() + 30000;
    setVoteActive(true);
    setVotes({}); votesRef.current = {};
    setVoteDeadline(deadline);

    broadcastEvent({
      type: 'vote_start',
      modes: MODE_META.map(m => ({ id: m.id, name: m.name, icon: m.icon })),
      deadline,
    });

    setPendingAction({
      type: 'vote',
      action: 'vote_game',
      modes: MODE_META.map(m => ({ id: m.id, name: m.name, icon: m.icon })),
      deadline,
    });
  }

  function resolveVote() {
    if (!voteActive) return;
    setVoteActive(false);
    setPendingAction(null);
    currentActionHandler.current = null;

    // Count votes (use ref for latest values in case called from timeout)
    const currentVotes = votesRef.current;
    const counts = {};
    Object.values(currentVotes).forEach(modeId => {
      counts[modeId] = (counts[modeId] || 0) + 1;
    });

    // Handle "random" votes
    if (counts['random']) {
      for (let i = 0; i < counts['random']; i++) {
        const randomMode = pickRandom(MODES).id;
        counts[randomMode] = (counts[randomMode] || 0) + 1;
      }
      delete counts['random'];
    }

    // Find winner(s)
    const maxVotes = Math.max(...Object.values(counts), 0);
    if (maxVotes === 0) {
      // No votes — pick random
      setGameActive(false);
      setTimeout(() => startGame(pickRandom(MODES).id), 100);
      return;
    }

    const winners = Object.keys(counts).filter(id => counts[id] === maxVotes);
    const winnerId = winners.length === 1 ? winners[0] : pickRandom(winners);

    // Broadcast result
    broadcastEvent({ type: 'vote_result', winnerId, winnerName: MODE_META.find(m => m.id === winnerId)?.name, counts });

    // Launch the winning game
    setGameActive(false);
    setTimeout(() => startGame(winnerId), 500);
  }

  // ── Room / Spectator helpers ──────────────────────────────

  function generateRoomCode() {
    const name = names[0] || 'GAME';
    const prefix = name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${suffix}`;
  }

  function createRoom() {
    if (!_supabase) return;
    const code = generateRoomCode();
    const channel = _supabase.channel(`room:${code}`, {
      config: { broadcast: { self: false } }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const players = {};
      let total = 0;
      Object.values(state).flat().forEach(p => {
        total++;
        if (p.role === 'player' && p.playerName) {
          players[p.playerName] = true;
        }
      });
      setJoinedPlayers(players);
      setViewerCount(total);
      setInteractiveMode(Object.keys(players).length > 0);
      // Add any new remote player names to the names list
      const playerNames = Object.keys(players);
      setNames(current => {
        const currentSet = new Set(current.map(n => n.trim()).filter(Boolean));
        const newNames = playerNames.filter(n => !currentSet.has(n));
        if (newNames.length === 0) return current;
        // Remove empty slots first, then add new names
        const filled = current.filter(n => n.trim());
        return [...filled, ...newNames];
      });
      // Re-broadcast room_info so new joiners get the current state
      const updatedNames = [...new Set([...cleanedNames.filter(Boolean), ...playerNames])];
      channel.send({
        type: 'broadcast',
        event: 'game_event',
        payload: { type: 'room_info', names: updatedNames, joinedPlayers: players }
      });
    });

    channel.on('broadcast', { event: 'player_action' }, ({ payload }) => {
      if (currentActionHandler.current) {
        currentActionHandler.current(payload);
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setRoomCode(code);
        setRoomMode('host');
        setRoomChannel(channel);
        channel.send({
          type: 'broadcast',
          event: 'game_event',
          payload: { type: 'room_created', hostName: names[0] || 'Host', playerNames: cleanedNames }
        });
        // Host registers as a player
        const hostName = cleanedNames[0] || 'Host';
        channel.track({ joinedAt: Date.now(), role: 'player', playerName: hostName });
        setPlayerName(hostName);
      }
    });
  }

  function closeRoom() {
    resetTransientGameState();
    resetSeriesState();
    if (roomChannel) {
      roomChannel.send({
        type: 'broadcast',
        event: 'game_event',
        payload: { type: 'room_closed' }
      });
      _supabase.removeChannel(roomChannel);
    }
    setRoomMode('none');
    setRoomCode(null);
    setRoomChannel(null);
    setViewerCount(0);
    setJoinedPlayers({});
    setInteractiveMode(false);
    setPlayerName(null);
    setResult(null);
    setGameActive(false);
    setHostSetupDone(false);
    setGameFormat('single');
    setDeviceMode('choose');
  }

  function handleCreateRoom() {
    const trimmedName = hostName.trim();
    if (!trimmedName) return;
    setNames([trimmedName]);
    setHostSetupDone(true);
    setTimeout(() => createRoom(), 50);
  }

  function broadcastEvent(payload) {
    if (roomMode !== 'host' || !roomChannel) return;
    roomChannel.send({ type: 'broadcast', event: 'game_event', payload });
  }

  function sendPlayerAction(action) {
    if (roomMode !== 'player' || !roomChannel || !playerName) return;
    roomChannel.send({
      type: 'broadcast',
      event: 'player_action',
      payload: { playerName: playerName, ...action }
    });
  }

  function handleHostAction(action) {
    if (!playerName || !currentActionHandler.current) return;
    currentActionHandler.current({ playerName, ...action });
  }

  // Spectator/Player: connect to room (only triggered on initial 'joining' state)
  const isJoining = roomMode === 'joining' || roomMode === 'spectator' || roomMode === 'player';
  const channelCreatedRef = React.useRef(false);
  useEffect(() => {
    if (!isJoining || !roomCode || !_supabase || channelCreatedRef.current) return;
    channelCreatedRef.current = true;
    setRoomClosed(false);
    setSpectatorConnected(false);

    const channel = _supabase.channel(`room:${roomCode}`, {
      config: { broadcast: { self: false } }
    });

    channel.on('broadcast', { event: 'game_event' }, ({ payload }) => {
      switch (payload.type) {
        case 'room_created':
          setSpectatorState({ type: 'waiting', hostName: payload.hostName });
          setRoomPlayerNames(payload.playerNames || []);
          break;
        case 'room_info':
          setRoomPlayerNames(payload.names || []);
          if (payload.joinedPlayers) setJoinedPlayers(payload.joinedPlayers);
          break;
        case 'game_start':
          window.__votes = {};
          setSpectatorState({ type: 'playing', result: payload.result, step: 0, done: false });
          if (payload.series) setSpectatorSeries(payload.series);
          // Auto-set pending action for real-time interactive modes on player side
          if (roomModeRef.current === 'player') {
            if (payload.result?.modeId === 'rocket') {
              setPendingAction({ type: 'realtime', action: 'eject', modeId: 'rocket' });
            } else if (payload.result?.modeId === 'stock-market' && payload.result?.isInteractiveChart) {
              setPendingAction({
                type: 'realtime',
                action: 'sell',
                modeId: 'stock-market',
                playerStocks: payload.result.playerStocks || {},
                sold: {},
              });
            }
          }
          break;
        case 'step':
          setSpectatorState(prev => prev ? { ...prev, step: payload.step, done: payload.done } : prev);
          if (roomModeRef.current === 'player') setPendingAction(null);
          break;
        case 'turn_prompt':
          if (roomModeRef.current === 'player') {
            const deadlineMs = payload.timeoutMs
              ? payload.timeoutMs
              : (payload.timeoutSeconds || 10) * 1000;
            setPendingAction({
              type: 'turn',
              playerName: payload.playerName,
              action: payload.action,
              deadline: Date.now() + deadlineMs,
              turnNumber: payload.turnNumber,
              totalDraws: payload.totalDraws,
              targets: payload.targets,
              tickNumber: payload.tickNumber,
              totalTicks: payload.totalTicks,
            });
          }
          break;
        case 'bomb_state':
          // Update spectator state so they can see the bomb moving
          break;
        case 'bomb_detonated':
          if (payload.finalResult) {
            setSpectatorState(prev => prev ? { ...prev, result: payload.finalResult, done: true } : prev);
          }
          if (roomModeRef.current === 'player') setPendingAction(null);
          break;
        case 'choice_prompt':
          if (roomModeRef.current === 'player') {
            if (payload.action === 'pick_stock') {
              setPendingAction({
                type: 'turn',
                action: 'pick_stock',
                playerName: payload.currentPicker,
                stockPool: payload.stockPool,
                taken: payload.taken,
                deadline: Date.now() + (payload.timeoutSeconds || 10) * 1000,
              });
            } else {
              setPendingAction({
                type: 'choice',
                action: payload.action,
                modeId: payload.modeId,
                keepCount: payload.keepCount,
                hands: payload.hands,
                deadline: Date.now() + (payload.timeoutSeconds || 20) * 1000,
              });
            }
          }
          break;
        case 'stock_picked':
          // Update the pending action with new taken state
          if (roomModeRef.current === 'player') {
            setPendingAction(prev => prev && prev.action === 'pick_stock' ? {
              ...prev,
              taken: payload.taken,
              playerName: payload.nextPicker || prev.playerName,
            } : prev);
          }
          break;
        case 'stock_sold':
          // Update sell state on window so PlayerActionBar can read it
          if (typeof window !== 'undefined') {
            const prevSellState = window.__stockSellState || {};
            prevSellState[payload.playerName] = {
              ticker: payload.ticker,
              price: parseFloat(payload.price),
              percentChange: parseFloat(payload.percentChange),
            };
            window.__stockSellState = prevSellState;
          }
          break;
        case 'draft_complete':
          setPendingAction(null);
          break;
        case 'vote_start':
          window.__votes = {};
          if (roomModeRef.current === 'player') {
            setPendingAction({
              type: 'vote',
              action: 'vote_game',
              modes: payload.modes,
              deadline: payload.deadline,
            });
          }
          break;
        case 'vote_cast':
          window.__votes = window.__votes || {};
          window.__votes[payload.playerName] = payload.modeId;
          // Force re-render by updating pendingAction
          setPendingAction(prev => prev ? { ...prev, _tick: Date.now() } : prev);
          break;
        case 'vote_result':
          window.__votes = {};
          setPendingAction(null);
          break;
        case 'series_update':
          setSpectatorSeries(prev => prev ? { ...prev, scores: payload.scores, round: payload.round, history: payload.history, complete: payload.complete, tied: payload.tied || null } : prev);
          break;
        case 'game_reset':
          window.__votes = {};
          setSpectatorState({ type: 'waiting' });
          setSpectatorSeries(null);
          break;
        case 'room_closed':
          setRoomClosed(true);
          _supabase.removeChannel(channel);
          break;
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setSpectatorConnected(true);
        // Track as generic joiner initially; will re-track when user picks a role
        channel.track({
          joinedAt: Date.now(),
          role: 'spectator',
          playerName: null
        });
      }
    });

    setRoomChannel(channel);

    return () => {
      channelCreatedRef.current = false;
      _supabase.removeChannel(channel);
    };
  }, [isJoining, roomCode]);

  // Broadcast updated player names when host changes them
  useEffect(() => {
    if (roomMode !== 'host' || !roomChannel) return;
    broadcastEvent({ type: 'room_info', names: cleanedNames, joinedPlayers: joinedPlayers });
  }, [cleanedNames.join(',')]);

  // QR code generation for host
  useEffect(() => {
    if (roomMode !== 'host' || !roomCode) return;
    const el = document.getElementById('room-qr');
    if (!el) return;
    let cancelled = false;

    (async () => {
      try {
        const { default: qrcode } = await import('qrcode-generator');
        if (cancelled) return;
        const qr = qrcode(0, 'M');
        qr.addData(`https://becknology.vercel.app/runouts?room=${roomCode}`);
        qr.make();
        el.innerHTML = `<img src="${qr.createDataURL(2)}" style="width:100%;height:100%;image-rendering:pixelated;" />`;
      } catch (error) {
        console.error('QR code generation failed:', error);
      }
    })();

    return () => {
      cancelled = true;
      el.innerHTML = '';
    };
  }, [roomMode, roomCode]);

  // ── Join / Spectator / Player mode early returns ──────────────────────────

  // Handlers for the join screen
  function handleJoinAsPlayer(name) {
    setPlayerName(name);
    setRoomMode('player');
    // Re-track presence with player role
    if (roomChannel) {
      roomChannel.track({ joinedAt: Date.now(), role: 'player', playerName: name });
    }
  }

  function handleJoinAsSpectator() {
    setRoomMode('spectator');
    // Re-track presence as spectator
    if (roomChannel) {
      roomChannel.track({ joinedAt: Date.now(), role: 'spectator', playerName: null });
    }
  }

  function leaveRoom() {
    resetTransientGameState();
    resetSeriesState();
    currentActionHandler.current = null;
    if (roomChannel && _supabase) {
      _supabase.removeChannel(roomChannel);
    }
    channelCreatedRef.current = false;
    setGameActive(false);
    setResult(null);
    setSpectatorState(null);
    setSpectatorSeries(null);
    setSpectatorConnected(false);
    setRoomClosed(false);
    setRoomPlayerNames([]);
    setJoinedPlayers({});
    setViewerCount(0);
    setInteractiveMode(false);
    setPlayerName(null);
    setRoomChannel(null);
    setRoomCode(null);
    setRoomMode('none');
    setDeviceMode('choose');
    setGameFormat('single');
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // Room closed — applies to joining, spectator, and player modes
  if ((roomMode === 'joining' || roomMode === 'spectator' || roomMode === 'player') && roomClosed) {
    return (
      <div className="app-screen flex flex-col items-center justify-center bg-[#0a0a1a] text-white p-6 text-center">
        <div className="pixel-font text-2xl text-rose-400 mb-4">ROOM CLOSED</div>
        <p className="font-mono text-sm text-slate-400 mb-6">The host ended the session</p>
        <button onClick={leaveRoom} className="pixel-font text-[10px] border border-indigo-500/40 bg-indigo-500/10 px-6 py-3 text-indigo-300">
          START YOUR OWN SESSION
        </button>
      </div>
    );
  }

  // Join screen — user hasn't picked a role yet
  if (roomMode === 'joining') {
    return (
      <React.Suspense fallback={null}>
        <JoinScreen
          roomCode={roomCode}
          names={roomPlayerNames}
          joinedPlayers={joinedPlayers}
          onJoinAsPlayer={handleJoinAsPlayer}
          onJoinAsSpectator={handleJoinAsSpectator}
          onLeave={leaveRoom}
        />
      </React.Suspense>
    );
  }

  // Spectator waiting screen
  if (roomMode === 'spectator') {
    if (!spectatorState || spectatorState.type === 'waiting') {
      return (
        <div className="app-screen flex flex-col items-center justify-center bg-[#0a0a1a] text-white p-6 text-center">
          <div className="pixel-font text-[9px] text-slate-500 mb-2 uppercase tracking-widest">Spectator Mode</div>
          <div className="pixel-font text-2xl text-cyan-300 mb-4" style={{ textShadow: '0 0 10px rgba(34,211,238,0.5)' }}>{roomCode}</div>
          {spectatorState?.hostName ? <p className="font-mono text-sm text-slate-400 mb-4">Connected to {spectatorState.hostName}'s room</p> : null}
          <div className="font-mono text-sm text-slate-500 animate-pulse">Waiting for the next game...</div>
          {!spectatorConnected ? <div className="font-mono text-xs text-amber-400 mt-4">Connecting...</div> : null}
          <button onClick={leaveRoom} className="mt-6 font-mono text-xs text-slate-500 hover:text-slate-300 transition">
            ← Leave room
          </button>
        </div>
      );
    }

    if (spectatorState.type === 'playing') {
      const specResult = spectatorState.result;
      const specStep = spectatorState.step;
      const specDone = spectatorState.done;
      const specConfig = getPlaybackConfig(specResult);

      return (
        <div className="fixed inset-0 z-50 bg-slate-950 p-0 sm:p-6">
          <div className={`theme-${specResult.modeId} arcade-bezel relative flex h-full flex-col overflow-hidden rounded-none sm:rounded-[2rem] border border-white/10 shadow-2xl`}>
            <ThemeArt modeId={specResult.modeId} />
            {spectatorSeries?.active ? (
              <div className="relative z-10 flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]" style={{ fontSize: 10 }}>
                <span className="pixel-font text-[7px] text-indigo-400">
                  {spectatorSeries.round > spectatorSeries.config.totalRounds ? `Sudden Death \u2022 Round ${spectatorSeries.round}` : `Best of ${spectatorSeries.config.totalRounds} \u2022 Round ${spectatorSeries.round}`}
                </span>
                <span className="font-mono text-[9px] text-slate-400">
                  {Object.entries(spectatorSeries.scores).map(([name, score]) => `${name}: ${score}`).join('  ')}
                </span>
              </div>
            ) : null}
            <div className="modal-toolbar relative z-10 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-3 py-3 backdrop-blur sm:px-6 sm:py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Spectating</div>
                <div className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{specResult.modeName}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={leaveRoom}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
                >
                  Leave
                </button>
                <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="pixel-font text-[8px] text-red-400">LIVE</span>
              </div>
            </div>

            <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
              <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-6">
                <RevealBanner
                  modeName={specResult.modeName}
                  step={specDone ? specConfig.totalSteps : specStep}
                  totalSteps={specConfig.totalSteps}
                  done={specDone}
                />
                <div className="flex-1">
                  <PlaybackStage result={specResult} step={specStep} done={specDone} />
                </div>
                {specDone ? (
                  <div className="verdict-card relative overflow-hidden rounded-[2rem] border p-6 text-center shadow-xl backdrop-blur border-slate-200 bg-white/85">
                    {specResult.selectionGoal === "winner" ? <Celebration /> : <SadOverlay />}
                    <div className="relative z-10">
                      <VerdictReveal text={specResult.headline} isWinner={specResult.selectionGoal === "winner"} />
                    </div>
                  </div>
                ) : null}
                {specDone && spectatorSeries?.active && !spectatorSeries?.complete ? (
                  <React.Suspense fallback={null}>
                    <SeriesScoreboard
                      scores={spectatorSeries.scores}
                      history={spectatorSeries.history}
                      round={spectatorSeries.round}
                      totalRounds={spectatorSeries.config.totalRounds}
                      selectionGoal={spectatorSeries.config.selectionGoal}
                    />
                  </React.Suspense>
                ) : null}
                {specDone && spectatorSeries?.active && spectatorSeries?.complete ? (
                  <React.Suspense fallback={null}>
                    <SeriesResult
                      scores={spectatorSeries.scores}
                      history={spectatorSeries.history}
                      totalRounds={spectatorSeries.config.totalRounds}
                      selectionGoal={spectatorSeries.config.selectionGoal}
                    />
                  </React.Suspense>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Player waiting screen
  if (roomMode === 'player') {
    if (!spectatorState || spectatorState.type === 'waiting') {
      return (
        <div className="app-screen flex flex-col items-center justify-center bg-[#0a0a1a] text-white p-6 text-center">
          <div className="flex items-center gap-2 justify-center mb-2">
            <span className="pixel-font text-[9px] text-indigo-400 uppercase tracking-widest">Playing as</span>
            <span className="pixel-font text-[9px] text-cyan-300">{playerName}</span>
          </div>
          <div className="pixel-font text-2xl text-cyan-300 mb-4" style={{ textShadow: '0 0 10px rgba(34,211,238,0.5)' }}>{roomCode}</div>
          {spectatorState?.hostName ? <p className="font-mono text-sm text-slate-400 mb-4">Connected to {spectatorState.hostName}'s room</p> : null}
          {pendingAction?.action === 'vote_game' ? (
            <div className="w-full max-w-lg">
              <React.Suspense fallback={null}>
                <VoteGrid
                  votes={window.__votes || {}}
                  deadline={pendingAction.deadline}
                  onVote={(action) => { sendPlayerAction(action); window.__votes = window.__votes || {}; window.__votes[playerName] = action.modeId; setPendingAction(prev => prev ? { ...prev, _tick: Date.now() } : prev); }}
                  playerName={playerName}
                  MODE_META={MODE_META}
                />
              </React.Suspense>
            </div>
          ) : (
            <>
              <div className="font-mono text-sm text-slate-500 animate-pulse">Waiting for the next game...</div>
              {!spectatorConnected ? <div className="font-mono text-xs text-amber-400 mt-4">Connecting...</div> : null}
              <button onClick={leaveRoom} className="mt-6 font-mono text-xs text-slate-500 hover:text-slate-300 transition">
                ← Leave room
              </button>
              <React.Suspense fallback={null}>
                <PlayerActionBar pendingAction={pendingAction} onAction={sendPlayerAction} playerName={playerName} rankLabel={rankLabel} SUIT_SYMBOLS={SUIT_SYMBOLS} />
              </React.Suspense>
            </>
          )}
        </div>
      );
    }

    if (spectatorState.type === 'playing') {
      const specResult = spectatorState.result;
      const specStep = spectatorState.step;
      const specDone = spectatorState.done;
      const specConfig = getPlaybackConfig(specResult);

      return (
        <div className="fixed inset-0 z-50 bg-slate-950 p-0 sm:p-6">
          <div className={`theme-${specResult.modeId} arcade-bezel relative flex h-full flex-col overflow-hidden rounded-none sm:rounded-[2rem] border border-white/10 shadow-2xl`}>
            <ThemeArt modeId={specResult.modeId} />
            {spectatorSeries?.active ? (
              <div className="relative z-10 flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]" style={{ fontSize: 10 }}>
                <span className="pixel-font text-[7px] text-indigo-400">
                  {spectatorSeries.round > spectatorSeries.config.totalRounds ? `Sudden Death \u2022 Round ${spectatorSeries.round}` : `Best of ${spectatorSeries.config.totalRounds} \u2022 Round ${spectatorSeries.round}`}
                </span>
                <span className="font-mono text-[9px] text-slate-400">
                  {Object.entries(spectatorSeries.scores).map(([name, score]) => `${name}: ${score}`).join('  ')}
                </span>
              </div>
            ) : null}
            <div className="modal-toolbar relative z-10 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-3 py-3 backdrop-blur sm:px-6 sm:py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">Playing as {playerName}</div>
                <div className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{specResult.modeName}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={leaveRoom}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
                >
                  Leave
                </button>
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="pixel-font text-[8px] text-indigo-400">PLAYING</span>
              </div>
            </div>

            <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
              <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-6">
                <RevealBanner
                  modeName={specResult.modeName}
                  step={specDone ? specConfig.totalSteps : specStep}
                  totalSteps={specConfig.totalSteps}
                  done={specDone}
                />
                <div className="flex-1">
                  <PlaybackStage result={specResult} step={specStep} done={specDone} />
                </div>
                {specDone ? (
                  <div className="verdict-card relative overflow-hidden rounded-[2rem] border p-6 text-center shadow-xl backdrop-blur border-slate-200 bg-white/85">
                    {specResult.selectionGoal === "winner" ? <Celebration /> : <SadOverlay />}
                    <div className="relative z-10">
                      <VerdictReveal text={specResult.headline} isWinner={specResult.selectionGoal === "winner"} />
                    </div>
                  </div>
                ) : null}
                {specDone && spectatorSeries?.active && !spectatorSeries?.complete ? (
                  <React.Suspense fallback={null}>
                    <SeriesScoreboard
                      scores={spectatorSeries.scores}
                      history={spectatorSeries.history}
                      round={spectatorSeries.round}
                      totalRounds={spectatorSeries.config.totalRounds}
                      selectionGoal={spectatorSeries.config.selectionGoal}
                    />
                  </React.Suspense>
                ) : null}
                {specDone && spectatorSeries?.active && spectatorSeries?.complete ? (
                  <React.Suspense fallback={null}>
                    <SeriesResult
                      scores={spectatorSeries.scores}
                      history={spectatorSeries.history}
                      totalRounds={spectatorSeries.config.totalRounds}
                      selectionGoal={spectatorSeries.config.selectionGoal}
                    />
                  </React.Suspense>
                ) : null}
                {pendingAction?.action === 'vote_game' && specDone ? (
                  <React.Suspense fallback={null}>
                    <VoteGrid
                      votes={window.__votes || {}}
                      deadline={pendingAction.deadline}
                      onVote={(action) => { sendPlayerAction(action); window.__votes = window.__votes || {}; window.__votes[playerName] = action.modeId; setPendingAction(prev => prev ? { ...prev, _tick: Date.now() } : prev); }}
                      playerName={playerName}
                      MODE_META={MODE_META}
                    />
                  </React.Suspense>
                ) : null}
              </div>
            </div>
          </div>
          {pendingAction?.action !== 'vote_game' ? (
            <React.Suspense fallback={null}>
              <PlayerActionBar pendingAction={pendingAction} onAction={sendPlayerAction} playerName={playerName} rankLabel={rankLabel} SUIT_SYMBOLS={SUIT_SYMBOLS} />
            </React.Suspense>
          ) : null}
        </div>
      );
    }
  }

  // ── Landing screen: choose Host or Same Device ──
  if (deviceMode === 'choose' && roomMode === 'none') {
    return (
      <div className="app-screen flex flex-col items-center justify-center bg-[#0a0a1a] text-white p-6">
        <div className="mb-4 flex items-center justify-center gap-8">
          <div className="float-slow relative" style={{ width: 44, height: 32 }}>
            <div className="invader" style={{ '--pc': '#22d3ee' }} />
          </div>
          <div className="float-med relative" style={{ width: 21, height: 27 }}>
            <div className="pixel-joystick" />
          </div>
          <div className="float-fast relative" style={{ width: 44, height: 32 }}>
            <div className="invader" style={{ '--pc': '#f472b6' }} />
          </div>
        </div>
        <h1 className="pixel-font neon-text text-3xl tracking-wider sm:text-5xl" style={{ color: "#a5b4fc" }}>RUNOUTS</h1>
        <p className="pixel-font mt-4 text-[8px] uppercase leading-relaxed tracking-widest text-cyan-400/70 sm:text-[10px]">
          Insert coins {"\u25CF"} Pick a game {"\u25CF"} Someone loses
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button
            onClick={() => setDeviceMode('host')}
            className="flex-1 py-6 px-6 rounded-2xl text-center transition hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))', border: '2px solid rgba(99,102,241,0.4)', boxShadow: '0 0 30px rgba(99,102,241,0.15)' }}
          >
            <div className="text-3xl mb-2">{"\uD83D\uDCE1"}</div>
            <div className="pixel-font text-[11px] text-indigo-300">HOST A GAME</div>
            <div className="pixel-font text-[7px] text-slate-500 mt-1">Friends join on their phones</div>
          </button>

          <button
            onClick={() => setDeviceMode('local')}
            className="flex-1 py-6 px-6 rounded-2xl text-center transition hover:scale-105 active:scale-95"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="text-3xl mb-2">{"\uD83D\uDD79\uFE0F"}</div>
            <div className="pixel-font text-[11px] text-white">SAME DEVICE</div>
            <div className="pixel-font text-[7px] text-slate-500 mt-1">Everyone plays on this screen</div>
          </button>
        </div>
      </div>
    );
  }

  // ── Host setup screen ──
  if (deviceMode === 'host' && !hostSetupDone) {
    return (
      <div className="app-screen flex flex-col items-center justify-center bg-[#0a0a1a] text-white p-6">
        <div className="pixel-font text-[9px] text-slate-500 uppercase tracking-widest mb-4">Host Setup</div>
        <div className="pixel-font text-xl text-indigo-300 mb-8" style={{ textShadow: '0 0 10px rgba(99,102,241,0.5)' }}>RUNOUTS</div>

        <div className="w-full max-w-sm space-y-4">
          <div>
            <div className="pixel-font text-[7px] text-fuchsia-400 uppercase tracking-widest mb-1.5">Your Name</div>
            <input value={hostName} onChange={e => setHostName(e.target.value)}
              className="w-full border border-indigo-500/30 bg-white/[0.06] px-4 py-3 font-mono text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400"
              placeholder="Enter your name..." autoFocus />
          </div>

          <div>
            <div className="pixel-font text-[7px] text-green-400 uppercase tracking-widest mb-1.5">Format</div>
            <select value={gameFormat} onChange={e => setGameFormat(e.target.value)}
              className="w-full border border-green-500/20 bg-black/40 px-4 py-2.5 font-mono text-sm text-green-300 outline-none">
              <option value="single">Single Round</option>
              <option value="tournament">Tournament</option>
              <option value="best-of-3">Best of 3</option>
              <option value="best-of-5">Best of 5</option>
              <option value="best-of-7">Best of 7</option>
            </select>
          </div>

          <div>
            <div className="pixel-font text-[7px] text-rose-400 uppercase tracking-widest mb-1.5">Picking a...</div>
            <select value={selectionGoal} onChange={e => setSelectionGoal(e.target.value)}
              className="w-full border border-rose-500/20 bg-black/40 px-4 py-2.5 font-mono text-sm text-rose-300 outline-none">
              <option value="loser">Loser</option>
              <option value="winner">Winner</option>
            </select>
          </div>

          <div>
            <div className="pixel-font text-[7px] text-yellow-400 uppercase tracking-widest mb-1.5">Stakes (optional)</div>
            <input value={taskLabel} onChange={e => setTaskLabel(e.target.value)}
              className="w-full border border-yellow-500/20 bg-black/40 px-4 py-2.5 font-mono text-sm text-yellow-300 placeholder-slate-600 outline-none"
              placeholder="what's at stake?" />
          </div>

          <button onClick={handleCreateRoom} disabled={!hostName.trim()}
            className="w-full py-4 rounded-xl font-bold text-sm transition hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))', border: '2px solid rgba(99,102,241,0.5)', color: '#a5b4fc', textShadow: '0 0 8px rgba(99,102,241,0.4)' }}>
            {"\uD83D\uDCE1"} CREATE ROOM
          </button>

          <button onClick={() => setDeviceMode('choose')} className="w-full py-2 font-mono text-xs text-slate-600 hover:text-slate-400 transition">
            {"\u2190"} Back
          </button>
        </div>
      </div>
    );
  }

  // ── Host lobby screen ──
  if (deviceMode === 'host' && hostSetupDone && roomMode === 'host' && !gameActive) {
    return (
      <div className="app-screen bg-[#0a0a1a] text-white p-6">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="pixel-font text-[9px] text-slate-500 uppercase tracking-widest mb-2">Room Code</div>
            <div className="pixel-font text-3xl text-cyan-300 mb-4" style={{ textShadow: '0 0 15px rgba(34,211,238,0.5)' }}>{roomCode}</div>

            <div className="flex justify-center mb-4">
              <div id="room-qr" className="bg-white p-1 rounded" style={{ width: 120, height: 120 }} />
            </div>

            <button onClick={() => navigator.clipboard.writeText(`https://becknology.vercel.app/runouts?room=${roomCode}`)}
              className="pixel-font text-[8px] border border-white/10 bg-white/5 px-4 py-2 text-slate-400 hover:text-white transition">
              COPY LINK
            </button>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-6">
            <div className="pixel-font text-[7px] text-slate-600 uppercase tracking-widest mb-2">Settings</div>
            <div className="flex flex-wrap gap-3">
              <span className="px-2 py-1 rounded bg-green-500/10 border border-green-500/20 font-mono text-xs text-green-400">{gameFormat}</span>
              <span className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 font-mono text-xs text-rose-400">Pick a {selectionGoal}</span>
              {taskLabel ? <span className="px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 font-mono text-xs text-yellow-400">{taskLabel}</span> : null}
            </div>
          </div>

          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 mb-6">
            <div className="pixel-font text-[7px] text-indigo-400 uppercase tracking-widest mb-3">Players ({Object.keys(joinedPlayers).length})</div>
            <div className="space-y-2">
              {Object.keys(joinedPlayers).map(function(name) {
                return (
                  <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/15">
                    <span className="text-sm">{"\uD83D\uDCF1"}</span>
                    <span className="font-mono text-sm font-bold text-indigo-300">{name}</span>
                    {name === playerName ? <span className="pixel-font text-[6px] text-slate-500">(you)</span> : null}
                  </div>
                );
              })}
            </div>
            {Object.keys(joinedPlayers).length < 2 ? (
              <div className="pixel-font text-[8px] text-amber-400 mt-3 animate-pulse">Waiting for players to join...</div>
            ) : null}
          </div>

          <button
            onClick={() => { if (interactiveMode) startVote(); else startGame(pickRandom(MODES).id); }}
            disabled={Object.keys(joinedPlayers).length < 2}
            className="w-full py-4 rounded-xl pixel-font text-sm transition hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: Object.keys(joinedPlayers).length >= 2 ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)', border: '2px solid rgba(16,185,129,0.5)', color: '#d1fae5', textShadow: '0 0 8px rgba(16,185,129,0.4)' }}>
            {"\uD83D\uDE80"} START ({Object.keys(joinedPlayers).length} players)
          </button>

          {voteActive && !gameActive ? (
            <div className="mt-4">
              <React.Suspense fallback={null}>
                <VoteGrid votes={votes} deadline={voteDeadline} onVote={handleHostAction} playerName={playerName} MODE_META={MODE_META} />
              </React.Suspense>
            </div>
          ) : null}

          <div className="flex gap-3 mt-4">
            <button onClick={closeRoom} className="flex-1 py-2 font-mono text-xs text-slate-600 hover:text-rose-400 transition">Close Room</button>
            <button onClick={() => { closeRoom(); setDeviceMode('choose'); setHostSetupDone(false); }} className="flex-1 py-2 font-mono text-xs text-slate-600 hover:text-slate-400 transition">{"\u2190"} Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="crt-vignette crt-global-scanlines crt-flicker relative app-screen overflow-hidden bg-[#0a0a1a] text-white">
      {/* Return to Bridge */}
      <a href="/bridge" className="fixed top-4 left-6 z-50 font-mono text-xs text-slate-600 no-underline transition-colors hover:text-purple-400/60">&larr; Return to Bridge</a>
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.2) 0%, transparent 50%), radial-gradient(ellipse at 20% 100%, rgba(236,72,153,0.12) 0%, transparent 40%), radial-gradient(ellipse at 80% 60%, rgba(34,211,238,0.08) 0%, transparent 35%)" }} />
      {/* Dot grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      {/* Starfield */}
      <div className="pointer-events-none absolute inset-0">
        {[
          { x: 8, y: 5, c: "star-bright", a: "twinkle1", d: "3s" },
          { x: 15, y: 12, c: "star-dim", a: "twinkle2", d: "4s" },
          { x: 25, y: 3, c: "star-pink", a: "twinkle3", d: "5s" },
          { x: 35, y: 18, c: "star-bright", a: "twinkle1", d: "3.5s" },
          { x: 45, y: 7, c: "star-dim", a: "twinkle2", d: "6s" },
          { x: 55, y: 22, c: "star-pink", a: "twinkle1", d: "4.5s" },
          { x: 65, y: 4, c: "star-bright", a: "twinkle3", d: "5.5s" },
          { x: 72, y: 15, c: "star-dim", a: "twinkle2", d: "3.2s" },
          { x: 82, y: 8, c: "star-pink", a: "twinkle1", d: "4.8s" },
          { x: 90, y: 20, c: "star-bright", a: "twinkle3", d: "6.5s" },
          { x: 5, y: 35, c: "star-dim", a: "twinkle1", d: "7s" },
          { x: 18, y: 28, c: "star-bright", a: "twinkle2", d: "3.8s" },
          { x: 38, y: 32, c: "star-pink", a: "twinkle3", d: "5.2s" },
          { x: 60, y: 30, c: "star-dim", a: "twinkle1", d: "4.2s" },
          { x: 78, y: 35, c: "star-bright", a: "twinkle2", d: "6.2s" },
          { x: 92, y: 38, c: "star-pink", a: "twinkle3", d: "3.6s" },
          { x: 12, y: 45, c: "star-bright", a: "twinkle1", d: "5.8s" },
          { x: 50, y: 42, c: "star-dim", a: "twinkle2", d: "4.4s" },
          { x: 85, y: 48, c: "star-pink", a: "twinkle1", d: "7.2s" },
          { x: 30, y: 50, c: "star-bright", a: "twinkle3", d: "3.4s" },
        ].map((s, i) => (
          <div key={i} className={`star ${s.c}`} style={{ left: `${s.x}%`, top: `${s.y}%`, animation: `${s.a} ${s.d} ease-in-out infinite` }} />
        ))}
      </div>
      {/* Synthwave grid */}
      <div className="synthwave-grid" />
      {/* Pixel art corner sprites */}
      <div className="pixel-sprite invader float-slow" style={{ '--pc': '#818cf8', top: '15%', left: '3%', opacity: 0.3 }} />
      <div className="pixel-sprite invader float-med" style={{ '--pc': '#f472b6', top: '40%', right: '2%', opacity: 0.25, transform: 'scale(0.8)' }} />
      <div className="pixel-sprite pixel-coin float-fast" style={{ top: '25%', right: '5%', opacity: 0.35 }} />
      <div className="pixel-sprite pixel-heart float-slow" style={{ bottom: '30%', left: '4%', opacity: 0.3 }} />
      <div className="pixel-sprite pixel-joystick float-med" style={{ bottom: '20%', right: '4%', opacity: 0.25 }} />
      <div className="pixel-sprite pixel-coin float-fast" style={{ top: '60%', left: '6%', opacity: 0.2, transform: 'scale(0.7)' }} />

      <div className="crt-screen relative mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <div className="relative mb-6 flex items-center justify-center gap-8">
            <div className="float-slow relative" style={{ width: 44, height: 32 }}>
              <div className="invader" style={{ '--pc': '#22d3ee' }} />
            </div>
            <div className="float-med relative" style={{ width: 21, height: 27 }}>
              <div className="pixel-joystick" />
            </div>
            <div className="float-fast relative" style={{ width: 44, height: 32 }}>
              <div className="invader" style={{ '--pc': '#f472b6' }} />
            </div>
          </div>
          <h1 className="pixel-font pixel-title-scale neon-text text-2xl tracking-wider sm:text-5xl" style={{ color: "#a5b4fc" }}>
            RUNOUTS
          </h1>
          <p className="pixel-font phosphor mt-4 text-[8px] uppercase leading-relaxed tracking-widest text-cyan-400/70 sm:text-[10px]">
            Insert coins ● Pick a game ● Someone loses
          </p>
          <div className="mx-auto mt-4 h-[2px] w-64 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          <div className="mx-auto mt-1 h-[1px] w-48 bg-gradient-to-r from-transparent via-fuchsia-500/50 to-transparent" />
          {deviceMode === 'local' ? (
            <button onClick={() => setDeviceMode('choose')} className="mt-4 font-mono text-xs text-slate-600 hover:text-slate-400 transition">
              {"\u2190"} Back to menu
            </button>
          ) : null}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="crt-scanlines relative mb-10 overflow-hidden bg-[#0d0d24] p-5 sm:p-6" style={{ border: "3px solid #2d2b6b", boxShadow: "0 0 30px rgba(99,102,241,0.15), inset 0 0 60px rgba(0,0,0,0.5)" }}>
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-2">
              <span className="pixel-font text-[10px] text-fuchsia-400">▶</span>
              <span className="pixel-font phosphor text-[9px] uppercase tracking-widest text-fuchsia-400">Players</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {names.map((name, index) => {
                const colors = ["text-cyan-400 border-cyan-500/30 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.25)]", "text-fuchsia-400 border-fuchsia-500/30 focus:border-fuchsia-400 focus:shadow-[0_0_20px_rgba(236,72,153,0.25)]", "text-green-400 border-green-500/30 focus:border-green-400 focus:shadow-[0_0_20px_rgba(34,197,94,0.25)]", "text-amber-400 border-amber-500/30 focus:border-amber-400 focus:shadow-[0_0_20px_rgba(245,158,11,0.25)]"];
                return (
                <div key={index} className="group relative">
                  <div className="pixel-font absolute left-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-600">P{index + 1}</div>
                  <input
                    value={name}
                    onChange={(event) => updateName(index, event.target.value)}
                    className={`w-full border bg-black/40 px-4 py-3 pl-10 font-mono text-sm outline-none transition ${colors[index % colors.length]}`}
                    placeholder="..."
                  />
                  {names.length > 2 ? (
                    <button
                      onClick={() => removePlayer(index)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-1 font-mono text-xs text-slate-700 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                );
              })}
              <button
                onClick={addPlayer}
                className="flex items-center justify-center border border-dashed border-white/10 py-3 font-mono text-xs text-slate-600 transition hover:border-indigo-500/50 hover:text-indigo-400"
              >
                + ADD PLAYER
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div>
                <div className="pixel-font mb-1.5 text-[7px] uppercase tracking-widest text-yellow-500/80">What's at stake</div>
                <input
                  value={taskLabel}
                  onChange={(event) => setTaskLabel(event.target.value)}
                  className="w-full border border-yellow-500/20 bg-black/40 px-4 py-2.5 font-mono text-sm text-yellow-300 placeholder-slate-600 outline-none transition focus:border-yellow-400 focus:shadow-[0_0_16px_rgba(234,179,8,0.2)]"
                  placeholder="enter the stakes..."
                />
              </div>
              <div>
                <div className="pixel-font mb-1.5 text-[7px] uppercase tracking-widest text-green-500/80">Format</div>
                <select
                  value={gameFormat}
                  onChange={(event) => setGameFormat(event.target.value)}
                  className="w-full border border-green-500/20 bg-black/40 px-4 py-2.5 font-mono text-sm text-green-300 outline-none transition focus:border-green-400"
                >
                  <option value="single">Single Round</option>
                  <option value="tournament">Tournament</option>
                  <option value="best-of-3">Best of 3</option>
                  <option value="best-of-5">Best of 5</option>
                  <option value="best-of-7">Best of 7</option>
                </select>
              </div>
              <div>
                <div className="pixel-font mb-1.5 text-[7px] uppercase tracking-widest text-rose-500/80">Picking a...</div>
                <select
                  value={selectionGoal}
                  onChange={(event) => setSelectionGoal(event.target.value)}
                  className="w-full border border-rose-500/20 bg-black/40 px-4 py-2.5 font-mono text-sm text-rose-300 outline-none transition focus:border-rose-400"
                >
                  <option value="loser">Loser</option>
                  <option value="winner">Winner</option>
                </select>
              </div>
            </div>

            {!hasEnoughPlayers ? <p className="pixel-font mt-3 text-[8px] text-amber-400">▸ NEED AT LEAST 2 PLAYERS</p> : null}
            {hasEnoughPlayers && !allFilled ? <p className="pixel-font mt-3 text-[8px] text-amber-400">▸ FILL IN ALL NAMES TO PLAY</p> : null}
            {hasEnoughPlayers && allFilled && !namesAreUnique ? <p className="pixel-font mt-3 text-[8px] text-amber-400">▸ NAMES MUST BE UNIQUE</p> : null}
          </div>
        </motion.div>

        <div className="pixel-divider mb-6" />

        <div className="mb-5 flex items-center gap-4">
          <div className="relative" style={{ width: 21, height: 21 }}>
            <div className="pixel-coin" style={{ transform: 'scale(0.8)' }} />
          </div>
          <div className="h-[2px] flex-1 bg-gradient-to-r from-fuchsia-500/50 via-indigo-500/30 to-transparent" />
          <span className="pixel-font phosphor text-[9px] uppercase tracking-widest text-indigo-400">Select Game</span>
          <div className="h-[2px] flex-1 bg-gradient-to-l from-cyan-500/50 via-indigo-500/30 to-transparent" />
          <div className="relative" style={{ width: 21, height: 21 }}>
            <div className="pixel-coin" style={{ transform: 'scale(0.8)' }} />
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <button
            onClick={() => { setSelectedModeId("auto"); startGame(); }}
            disabled={!canRun}
            className="arcade-card group relative overflow-hidden p-5 text-center disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(236,72,153,0.1))", border: "2px solid rgba(99,102,241,0.4)", boxShadow: "0 0 20px rgba(99,102,241,0.15)" }}
          >
            <div className="coin-spin mb-3 text-4xl">🎲</div>
            <div className="pixel-font text-[10px] text-indigo-300" style={{ textShadow: "0 0 10px rgba(129,140,248,0.5)" }}>RANDOM</div>
            <div className="pixel-font mt-2 text-[7px] text-indigo-400/60">??? SURPRISE ???</div>
          </button>

          {MODE_META.map((mode) => (
            <button
              key={mode.id}
              onClick={() => { setSelectedModeId(mode.id); startGame(mode.id); }}
              disabled={!canRun}
              className={`arcade-card group relative overflow-hidden p-5 text-center disabled:cursor-not-allowed disabled:opacity-40 ${mode.cardHint}`}
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-3 text-4xl transition-transform group-hover:scale-125" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.2))" }}>{mode.icon}</div>
                <div className="pixel-font text-[9px] leading-tight text-white">{mode.name}</div>
                <div className="pixel-font mt-2 text-[6px] leading-relaxed text-slate-500">{mode.blurb}</div>
              </div>
            </button>
          ))}
        </div>

        {result ? (
          <div className="mb-6 flex justify-center">
            <button
              onClick={playAgain}
              disabled={!canRun}
              className="pixel-font inline-flex items-center gap-2 border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-[8px] text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-40"
            >
              ↻ REPLAY {MODE_META.find(m => m.id === result.modeId)?.name?.toUpperCase()}
            </button>
          </div>
        ) : null}

        {/* Room controls — host or standalone (hidden in local mode) */}
        {deviceMode !== 'local' && roomMode !== 'spectator' && roomMode !== 'player' && roomMode !== 'joining' ? (
          roomMode === 'host' ? (
            <div className="mb-6 crt-scanlines relative overflow-hidden bg-[#0d0d24] p-5" style={{ border: '3px solid #2d2b6b', boxShadow: '0 0 30px rgba(99,102,241,0.15)' }}>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{"\uD83D\uDCE1"}</span>
                    <span className="pixel-font text-[9px] uppercase tracking-widest text-green-400">Room Live</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="pixel-font text-[8px] text-slate-400">{"\uD83D\uDC40"} {viewerCount} watching</span>
                    <button onClick={closeRoom} className="pixel-font text-[7px] text-slate-600 hover:text-rose-400 transition">CLOSE ROOM</button>
                  </div>
                </div>
                <div className="pixel-font text-center text-2xl tracking-widest text-cyan-300 mb-3" style={{ textShadow: '0 0 10px rgba(34,211,238,0.5)' }}>
                  {roomCode}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button onClick={() => { navigator.clipboard.writeText(`https://becknology.vercel.app/runouts?room=${roomCode}`); }} className="pixel-font text-[7px] border border-white/10 bg-white/5 px-3 py-2 text-slate-400 hover:text-white transition">
                    COPY LINK
                  </button>
                  <div id="room-qr" className="bg-white p-1 rounded" style={{ width: 80, height: 80 }} />
                </div>
                {/* Connected players */}
                {Object.keys(joinedPlayers).length > 0 ? (
                  <div className="mt-4 border-t border-white/5 pt-3">
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                      {Object.keys(joinedPlayers).map(function(pName) {
                        return (
                          <span key={pName} className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/20 px-3 py-1">
                            <span className="text-xs">{"\uD83D\uDCF1"}</span>
                            <span className="pixel-font text-[7px] text-indigo-300">{pName}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {/* Interactive mode indicator */}
                <div className="mt-2 text-center">
                  {interactiveMode ? (
                    <>
                      <span className="pixel-font text-[7px] text-green-400">{"\uD83C\uDFAE"} Interactive Mode</span>
                      {!gameActive ? (
                        <div className="mt-3">
                          <button
                            onClick={startVote}
                            className="pixel-font inline-flex items-center gap-2 border-2 border-violet-500/40 bg-violet-500/10 px-5 py-3 text-[9px] text-violet-300 transition hover:bg-violet-500/20 hover:border-violet-400"
                          >
                            {"\uD83D\uDDF3\uFE0F"} VOTE FOR NEXT GAME
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <span className="pixel-font text-[7px] text-slate-500">{"\uD83D\uDC40"} Spectator Only</span>
                  )}
                </div>
                {voteActive && !gameActive ? (
                  <div className="mt-4">
                    <React.Suspense fallback={null}>
                      <VoteGrid votes={votes} deadline={voteDeadline} onVote={handleHostAction} playerName={playerName} MODE_META={MODE_META} />
                    </React.Suspense>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null
        ) : null}

        <React.Suspense
          fallback={(
            <div className="mb-6 pt-2">
              <div className="pixel-divider mb-5" />
              <div className="pixel-font text-[8px] text-slate-500 text-center py-4">Loading leaderboard...</div>
            </div>
          )}
        >
          <Leaderboard games={leaderboardData} loading={leaderboardLoading} error={leaderboardError} />
        </React.Suspense>
      </div>

      <AnimatePresence>
        {gameActive && result ? (
          <motion.div
            key={result.runId}
            initial={{ opacity: 0, scale: 0.85, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 80, damping: 18, mass: 1 }}
            className="mobile-modal-overlay fixed inset-0 z-50 bg-slate-950/80 p-0 backdrop-blur-md sm:p-6"
          >
            <div className={`theme-${result.modeId} arcade-bezel relative flex h-full flex-col overflow-hidden rounded-none sm:rounded-[2rem] border border-white/10 shadow-2xl`}>
              <ThemeArt modeId={result.modeId} />
              <div className="modal-toolbar relative z-10 flex flex-col border-b border-slate-200/80 bg-white/80 backdrop-blur">
                {seriesActive && seriesConfig ? (
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-slate-200/50 bg-gradient-to-r from-indigo-50/80 to-violet-50/80 px-3 py-2 sm:px-6">
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                      Best of {seriesConfig.totalRounds}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {seriesRound > seriesConfig.totalRounds ? `Sudden Death \u2022 Round ${seriesRound}` : `Round ${seriesRound} of ${seriesConfig.totalRounds}`}
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      {Object.entries(seriesScores).sort((a, b) => b[1] - a[1]).map(([name, score]) => (
                        <span key={name} className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-700">{name}:</span>
                          <span className={`text-xs font-black ${score > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{score}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {suddenDeathRound > 0 ? `Sudden death \u2022 Round ${suddenDeathRound}` : seriesActive && seriesConfig && seriesRound > seriesConfig.totalRounds ? `Sudden death \u2022 Round ${seriesRound}` : seriesActive ? `Series round ${seriesRound}` : "Game view"}
                  </div>
                  <div className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{result.modeName}</div>
                </div>
                <div className="flex items-center gap-3">
                  {!playbackDone ? (
                    <button
                      onClick={exitGame}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                    >
                      {seriesActive ? 'Exit series' : 'Exit'}
                    </button>
                  ) : null}
                <div className="hidden sm:flex flex-wrap items-center justify-end gap-3">
                  {!playbackDone ? (
                    (result.modeId === 'rocket' || result.modeId === 'bomb' || result.modeId === 'stock-market' || result.draftPhase) ? null : (
                    <>
                      <button
                        onClick={advancePlayback}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5"
                      >
                        <Sparkles className="h-4 w-4" />
                        {playbackStep === 0 ? "Start reveal" : "Next reveal"}
                      </button>
                      <button
                        onClick={revealAll}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                      >
                        <FastForward className="h-4 w-4" />
                        Reveal all
                      </button>
                    </>
                    )
                  ) : result.isTie ? (
                    <>
                      <button
                        onClick={startSuddenDeath}
                        className="sudden-death-btn inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5"
                      >
                        {"\u2694\uFE0F"} SUDDEN DEATH
                      </button>
                      <button
                        onClick={exitGame}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                      >
                        Exit
                      </button>
                    </>
                  ) : seriesActive && seriesTied ? (
                    <>
                      <span className="text-xs font-black uppercase tracking-widest text-orange-500 animate-pulse">SERIES TIED — {seriesTied.join(' vs ')}</span>
                      <button
                        onClick={() => startSeriesSuddenDeath(null)}
                        className="sudden-death-btn inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5"
                      >
                        {"\u2694\uFE0F"} SUDDEN DEATH
                      </button>
                      <button
                        onClick={exitGame}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                      >
                        Exit
                      </button>
                    </>
                  ) : seriesActive && !seriesComplete ? (
                    <>
                      {interactiveMode ? (
                        <button
                          onClick={startVote}
                          className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5"
                        >
                          {"\uD83D\uDDF3\uFE0F"} Next Round
                        </button>
                      ) : (
                        <button
                          onClick={() => startSeriesNextRound(null)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5"
                        >
                          <Sparkles className="h-4 w-4" />
                          Next Round
                        </button>
                      )}
                      <button
                        onClick={() => setShowSeriesScoreboard(prev => !prev)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5"
                      >
                        {"\uD83D\uDCCA"} Scoreboard
                      </button>
                      <button
                        onClick={exitGame}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                      >
                        Exit Series
                      </button>
                    </>
                  ) : seriesActive && seriesComplete ? (
                    <>
                      <button
                        onClick={() => { resetSeriesState(); setGameActive(false); setTimeout(() => startGame(), 100); }}
                        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5"
                      >
                        <RotateCcw className="h-4 w-4" />
                        New Series
                      </button>
                      <button
                        onClick={exitGame}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                      >
                        Exit
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setGameActive(false); setTimeout(() => startGame(pickRandom(MODES).id), 50); }}
                        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5"
                      >
                        <Shuffle className="h-4 w-4" />
                        New random game
                      </button>
                      {interactiveMode ? (
                        <button
                          onClick={startVote}
                          className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5"
                        >
                          {"\uD83D\uDDF3\uFE0F"} Vote next
                        </button>
                      ) : null}
                      <button
                        onClick={playAgain}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Play again
                      </button>
                      <button
                        onClick={exitGame}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                      >
                        Exit
                      </button>
                    </>
                  )}
                </div>
                </div>
                </div>
              </div>

              <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
                <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-6">
                  <RevealBanner
                    modeName={suddenDeathRound > 0 ? `${result.modeName} \u2022 Sudden Death #${suddenDeathRound}` : result.modeName}
                    step={playbackDone ? currentConfig?.totalSteps ?? playbackStep : playbackStep}
                    totalSteps={currentConfig?.totalSteps ?? 1}
                    done={playbackDone}
                  />

                  <div className="flex-1">
                    <PlaybackStage result={result} step={playbackStep} done={playbackDone} interactiveBombState={interactiveBombState} />
                  </div>

                  {(interactiveMode || localInteractiveMode) && pendingAction && (playerName || (localInteractiveMode && pendingAction.type === 'realtime')) && !playbackDone ? (
                    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 backdrop-blur">
                      {localInteractiveMode && !interactiveMode && pendingAction.type === 'realtime' && pendingAction.action === 'eject' ? (
                        (() => {
                          const ejects = (typeof window !== 'undefined' && window.__interactiveRocketEjects) || {};
                          return (
                            <div>
                              <div className="pixel-font text-[9px] text-indigo-300 mb-3 text-center">{"\uD83D\uDE80"} EJECT BUTTONS</div>
                              <div className="grid grid-cols-2 gap-2">
                                {cleanedNames.map(name => {
                                  const hasEjected = ejects[name];
                                  return hasEjected ? (
                                    <div key={name} className="py-3 px-4 rounded-xl bg-green-900/30 border border-green-500/20 text-center">
                                      <div className="pixel-font text-[8px] text-green-400">{"\uD83E\uDE82"} {name}</div>
                                      <div className="pixel-font text-[7px] text-green-600 mt-1">{hasEjected.distance >= 1000000 ? (hasEjected.distance/1000000).toFixed(1) + 'M km' : Math.round(hasEjected.distance).toLocaleString() + ' km'}</div>
                                    </div>
                                  ) : (
                                    <button key={name} onClick={() => { if (currentActionHandler.current) currentActionHandler.current({ playerName: name, action: 'eject' }); }}
                                      className="py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-sm shadow-lg shadow-red-600/30 transition hover:scale-[1.02] active:scale-95">
                                      {"\uD83E\uDE82"} {name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()
                      ) : localInteractiveMode && !interactiveMode && pendingAction.type === 'realtime' && pendingAction.action === 'sell' ? (
                        (() => {
                          const sellState = (typeof window !== 'undefined' && window.__stockSellState) || {};
                          const playerStocks = pendingAction.playerStocks || {};
                          return (
                            <div>
                              <div className="pixel-font text-[9px] text-emerald-300 mb-3 text-center">{"\uD83D\uDCC8"} SELL BUTTONS</div>
                              <div className="grid grid-cols-2 gap-2">
                                {cleanedNames.filter(name => playerStocks[name]).map(name => {
                                  const hasSold = sellState[name];
                                  return hasSold ? (
                                    <div key={name} className="py-3 px-4 rounded-xl bg-emerald-900/30 border border-emerald-500/20 text-center">
                                      <div className="pixel-font text-[8px] text-emerald-400">{"\u2705"} {name}</div>
                                      <div className="pixel-font text-[7px] text-emerald-600 mt-1">${hasSold.price?.toFixed ? hasSold.price.toFixed(2) : hasSold.price} ({hasSold.percentChange > 0 ? '+' : ''}{hasSold.percentChange?.toFixed ? hasSold.percentChange.toFixed(1) : hasSold.percentChange}%)</div>
                                    </div>
                                  ) : (
                                    <button key={name} onClick={() => { if (currentActionHandler.current) currentActionHandler.current({ playerName: name, action: 'sell' }); }}
                                      className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition hover:scale-[1.02] active:scale-95">
                                      {"\uD83D\uDCB0"} {name} — SELL
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()
                      ) : localInteractiveMode && !interactiveMode && pendingAction.type === 'realtime' && pendingAction.action === 'whip_horse' ? (
                        (() => {
                          const whipsRemaining = pendingAction.whipsRemaining || {};
                          return (
                            <div>
                              <div className="pixel-font text-[9px] text-green-300 mb-3 text-center">{"\uD83C\uDFC7"} WHIP — Turn {pendingAction.turnNumber}/{pendingAction.totalTurns}</div>
                              <div className="grid grid-cols-2 gap-2">
                                {cleanedNames.map(name => {
                                  const whips = whipsRemaining[name] || 0;
                                  return whips > 0 ? (
                                    <button key={name} onClick={() => { if (currentActionHandler.current) currentActionHandler.current({ playerName: name, action: 'whip_horse' }); }}
                                      className="py-3 px-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold text-sm shadow-lg transition hover:scale-[1.02] active:scale-95">
                                      {"\uD83E\uDE7F"} {name} ({whips})
                                    </button>
                                  ) : (
                                    <div key={name} className="py-3 px-4 rounded-xl bg-slate-800/30 border border-slate-700/20 text-center">
                                      <div className="pixel-font text-[8px] text-slate-500">{name}</div>
                                      <div className="pixel-font text-[7px] text-slate-600 mt-1">No whips</div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="pixel-font text-[7px] text-slate-600 mt-2 text-center">Tap to guarantee your horse advances</div>
                            </div>
                          );
                        })()
                      ) : localInteractiveMode && isPrivateAction(pendingAction.action) && !handoffReady ? (
                        <div className="rounded-2xl border border-indigo-500/20 bg-[#0a0a1a] p-8 text-center">
                          <div className="pixel-font text-[9px] text-slate-500 uppercase tracking-widest mb-4">Pass the device</div>
                          <div className="pixel-font text-xl text-indigo-300 mb-6" style={{ textShadow: '0 0 10px rgba(99,102,241,0.5)' }}>
                            {pendingAction.playerName}
                          </div>
                          <div className="font-mono text-sm text-slate-500 mb-6">Only look when it's your turn!</div>
                          <button
                            onClick={() => setHandoffReady(true)}
                            className="w-full max-w-xs mx-auto py-4 rounded-xl pixel-font text-sm transition hover:scale-[1.02] active:scale-95"
                            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))', border: '2px solid rgba(99,102,241,0.5)', color: '#a5b4fc' }}>
                            I'M READY
                          </button>
                        </div>
                      ) : (
                        <React.Suspense fallback={null}>
                          <PlayerActionBar pendingAction={pendingAction} onAction={handleHostAction} playerName={playerName} rankLabel={rankLabel} SUIT_SYMBOLS={SUIT_SYMBOLS} />
                        </React.Suspense>
                      )}
                    </div>
                  ) : null}

                  {playbackDone ? (() => {
                    const modeMeta = MODE_META.find(m => m.id === result.modeId);
                    const themedLabel = result.selectionGoal === "winner" ? modeMeta?.resultWin : modeMeta?.resultLose;

                    if (result.isTie) {
                      return (
                        <div className="verdict-card relative overflow-hidden rounded-[2rem] border border-yellow-400 bg-gradient-to-br from-yellow-50/90 to-amber-50/90 p-6 text-center shadow-xl backdrop-blur">
                          <TieAnimation tiedNames={result.tiedNames} />
                          <div className="relative z-10">
                            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-600">
                              {suddenDeathRound > 0 ? `Sudden death \u2022 Round ${suddenDeathRound}` : "Dead heat"}
                            </div>
                            <VerdictReveal text="IT'S A TIE" isWinner={false} />
                            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                              {result.tiedNames.map((name) => (
                                <span key={name} className="rounded-full bg-yellow-500 px-4 py-2 text-sm font-bold text-white shadow">
                                  {name}
                                </span>
                              ))}
                            </div>
                            <div className="mx-auto mt-4 max-w-3xl text-slate-600">
                              {result.summary} Click <span className="font-bold text-orange-600">{"\u2694\uFE0F"} Sudden Death</span> to settle it.
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                    <div className={`verdict-card relative overflow-hidden rounded-[2rem] border p-6 text-center shadow-xl backdrop-blur ${
                      result.selectionGoal === "winner"
                        ? "border-amber-300 bg-gradient-to-br from-amber-50/90 to-yellow-50/90"
                        : "border-slate-200 bg-white/85"
                    }`}>
                      {result.selectionGoal === "winner" ? <Celebration /> : <SadOverlay />}
                      <div className="relative z-10">
                        {themedLabel ? <div className="theme-verdict-label">{themedLabel}</div> : null}
                        <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                          {result.selectionGoal === "winner" ? "We have a winner!" : "Round complete"}
                        </div>
                        <VerdictReveal text={result.headline} isWinner={result.selectionGoal === "winner"} />
                        <div className="mx-auto mt-3 max-w-3xl text-slate-600">
                          {suddenDeathRound > 0 ? (
                            <span>{result.summary}</span>
                          ) : seriesActive && seriesConfig ? (
                            <span>
                              {seriesTied
                                ? `Series tied! ${seriesTied.join(' and ')} are locked at the top. Time for sudden death.`
                                : seriesComplete
                                ? `Series complete! ${result.selectedName} clinched it.`
                                : `Round ${seriesRound} of ${seriesConfig.totalRounds} complete. Click Next Round to continue the series.`
                              }
                            </span>
                          ) : (
                            <span>Choose <span className="font-semibold">Play again</span> to run it back in full screen, or <span className="font-semibold">Exit</span> to return to setup.</span>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })() : null}

                  {seriesActive && playbackDone && seriesComplete && seriesConfig ? (
                    <React.Suspense fallback={null}>
                      <SeriesResult
                        scores={seriesScores}
                        history={seriesHistory}
                        totalRounds={seriesConfig.totalRounds}
                        selectionGoal={seriesConfig.selectionGoal}
                      />
                    </React.Suspense>
                  ) : null}

                  {seriesActive && playbackDone && !seriesComplete && (showSeriesScoreboard || !result.isTie) && seriesConfig ? (
                    <React.Suspense fallback={null}>
                      <SeriesScoreboard
                        scores={seriesScores}
                        history={seriesHistory}
                        round={seriesRound}
                        totalRounds={seriesConfig.totalRounds}
                        selectionGoal={seriesConfig.selectionGoal}
                      />
                    </React.Suspense>
                  ) : null}

                  {voteActive && playbackDone ? (
                    <React.Suspense fallback={null}>
                      <VoteGrid votes={votes} deadline={voteDeadline} onVote={handleHostAction} playerName={playerName} MODE_META={MODE_META} />
                    </React.Suspense>
                  ) : null}
                  {pendingAction && !playbackDone ? <div className="h-24 sm:hidden" /> : null}
                </div>
              </div>

              {!pendingAction ? (
              <div className="sm:hidden relative z-10 flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-black/90 px-3 py-3 backdrop-blur safe-area-bottom">
                {!playbackDone ? (
                  (result.modeId === 'rocket' || result.modeId === 'bomb' || result.modeId === 'stock-market' || result.draftPhase) ? null : (
                  <>
                    <button
                      onClick={advancePlayback}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg"
                    >
                      <Sparkles className="h-4 w-4" />
                      {playbackStep === 0 ? "Start" : "Next"}
                    </button>
                    <button
                      onClick={revealAll}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300"
                    >
                      <FastForward className="h-4 w-4" />
                      All
                    </button>
                  </>
                  )
                ) : result.isTie ? (
                  <>
                    <button
                      onClick={startSuddenDeath}
                      className="sudden-death-btn flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-sm font-bold text-white shadow-lg"
                    >
                      {"\u2694\uFE0F"} SUDDEN DEATH
                    </button>
                    <button
                      onClick={exitGame}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300"
                    >
                      Exit
                    </button>
                  </>
                ) : seriesActive && seriesTied ? (
                  <>
                    <button
                      onClick={() => startSeriesSuddenDeath(null)}
                      className="sudden-death-btn flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-sm font-bold text-white shadow-lg"
                    >
                      {"\u2694\uFE0F"} SUDDEN DEATH
                    </button>
                    <button
                      onClick={exitGame}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300"
                    >
                      Exit
                    </button>
                  </>
                ) : seriesActive && !seriesComplete ? (
                  <>
                    {interactiveMode ? (
                      <button
                        onClick={startVote}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
                      >
                        {"\uD83D\uDDF3\uFE0F"} Next Round
                      </button>
                    ) : (
                      <button
                        onClick={() => startSeriesNextRound(null)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
                      >
                        Next Round
                      </button>
                    )}
                    <button
                      onClick={() => setShowSeriesScoreboard(prev => !prev)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-lg"
                    >
                      {"\uD83D\uDCCA"}
                    </button>
                    <button
                      onClick={exitGame}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300"
                    >
                      Exit
                    </button>
                  </>
                ) : seriesActive && seriesComplete ? (
                  <>
                    <button
                      onClick={() => { resetSeriesState(); setGameActive(false); setTimeout(() => startGame(), 100); }}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
                    >
                      New Series
                    </button>
                    <button
                      onClick={exitGame}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300"
                    >
                      Exit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setGameActive(false); setTimeout(() => startGame(pickRandom(MODES).id), 50); }}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
                    >
                      <Shuffle className="h-4 w-4" />
                      Random
                    </button>
                    {interactiveMode ? (
                      <button
                        onClick={startVote}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
                      >
                        {"\uD83D\uDDF3\uFE0F"} Vote
                      </button>
                    ) : null}
                    <button
                      onClick={playAgain}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-lg"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Replay
                    </button>
                    <button
                      onClick={exitGame}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300"
                    >
                      Exit
                    </button>
                  </>
                )}
              </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
