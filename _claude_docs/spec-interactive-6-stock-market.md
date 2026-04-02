Read `.claude/CLAUDE.md` for context on this repo.

**Depends on:** `spec-interactive-1-infrastructure.md` — build that first.

# Interactive Stock Market — Pick Your Stock + Sell Button

## Overview

Two layers of player interaction for Stock Market mode:

1. **Pre-game:** Each player picks their stock from a pool of tickers on their phone (draft/pick phase)
2. **During gameplay:** Each player has a "SELL" button on their phone. They watch their stock's line on the chart and decide when to cash out. Selling locks in their current price. Riding to the end could moon or crash.

This combines meaningful pre-game choice with real-time decision-making during the animation. It's the Stake Crash cashout mechanic applied to a stock chart.

When `interactiveMode` is false, Stock Market works as designed in `spec-five-new-game-modes.md`.

## Phase 1: Stock Draft

### Flow

1. Host starts the game → result builder generates 8 stocks with pre-computed price histories
2. Host broadcasts the stock pool to all players
3. Players see the ticker list on their phone with brief descriptions
4. Players pick in order (first player picks first — order is shuffled randomly)
5. Each pick is broadcast so everyone sees what's taken
6. After all players have picked, the chart animation begins

### Stock Pool

Generate more stocks than players (always 8, regardless of player count). Each stock has a ticker, a starting price ($100), and a pre-computed price history. Players see the ticker name and a one-line "analyst note" (random flavor) — but NOT the price history.

```js
const stockPool = [
  { ticker: "$DOGE", note: "Much wow. Very volatile.", history: [...] },
  { ticker: "$TSLA", note: "Elon tweeted again.", history: [...] },
  { ticker: "$STONK", note: "It only goes up. Right?", history: [...] },
  { ticker: "$GME", note: "The squeeze hasn't squoze.", history: [...] },
  { ticker: "$MOON", note: "Literally can't go tits up.", history: [...] },
  { ticker: "$AAPL", note: "The safe play. Boring.", history: [...] },
  { ticker: "$REKT", note: "Named after your portfolio.", history: [...] },
  { ticker: "$COPE", note: "For when $REKT isn't enough.", history: [...] },
];
```

The "analyst notes" are random flavor text. They give NO real indication of whether the stock will moon or tank — that's the gamble.

### Draft Broadcast

**Host → All (draft start):**
```js
broadcastEvent({
  type: 'choice_prompt',
  action: 'pick_stock',
  timeoutSeconds: 10,
  stockPool: stockPool.map(s => ({ ticker: s.ticker, note: s.note })),  // NO histories
  pickOrder: ['Nick', 'Beck', 'Jeremy', 'Oakley'],  // randomized
  currentPicker: 'Nick',
  taken: {},  // { ticker: playerName }
});
```

**Player → Host (stock pick):**
```js
sendPlayerAction({
  action: 'pick_stock',
  ticker: '$DOGE'
});
```

**Host → All (pick made):**
```js
broadcastEvent({
  type: 'stock_picked',
  playerName: 'Nick',
  ticker: '$DOGE',
  nextPicker: 'Beck',
  taken: { '$DOGE': 'Nick' }
});
```

### Player Phone UI (Draft)

```
┌────────────────────────────┐
│   📈 PICK YOUR STOCK        │
│                            │
│   Nick is picking...       │  ← or "YOUR TURN" if it's you
│                            │
│   $DOGE — Much wow ← TAKEN │
│   $TSLA — Elon tweeted     │  ← tappable
│   $STONK — Only goes up    │  ← tappable
│   $GME — Squeeze incoming  │  ← tappable
│   $MOON — Can't go wrong   │  ← tappable
│   $AAPL — Safe and boring  │  ← tappable
│   $REKT — Your portfolio   │  ← tappable
│   $COPE — For the pain     │  ← tappable
│                            │
│   ⏱️ 8 seconds              │
│                            │
└────────────────────────────┘
```

Taken stocks are grayed out. Your pick is highlighted when it's your turn.

### Timeout

If a player doesn't pick within 10 seconds, auto-assign them a random available stock.

## Phase 2: Sell Button (During Chart Animation)

### Flow

1. Chart animation begins — all stock lines draw simultaneously over ~15 seconds
2. Each player's phone shows their stock's current price and a "SELL" button
3. Player can tap "SELL" at any time to lock in their current price
4. If they don't sell by the end of the chart, their final price is whatever the chart ended at
5. After all players have sold (or the chart ends), compute final rankings

### Sell Mechanics

- **Selling is permanent** — once you sell, you can't buy back in
- **You see your current price** updating in real-time on your phone
- **You see other players' status** — who's still holding, who sold and at what price
- **The chart keeps drawing** even after you sell, so you see what you missed (or avoided)

### Broadcast Messages

**Host → All (chart state, ~4x/sec during animation):**
```js
broadcastEvent({
  type: 'stock_state',
  progress: 0.45,  // 0 to 1, how far through the chart
  prices: {
    '$DOGE': { current: 187.50, change: 87.5 },
    '$TSLA': { current: 42.10, change: -57.9 },
    // ...
  },
  sold: {
    'Beck': { ticker: '$AAPL', price: 134.20, change: 34.2 }
  },
  holding: ['Nick', 'Jeremy', 'Oakley']
});
```

**Player → Host (sell):**
```js
sendPlayerAction({
  action: 'sell',
  ticker: '$DOGE'    // redundant but explicit
});
```

**Host → All (sell event):**
```js
broadcastEvent({
  type: 'stock_sold',
  playerName: 'Beck',
  ticker: '$AAPL',
  price: 134.20,
  percentChange: 34.2
});
```

### Player Phone UI (During Chart)

**While holding:**
```
┌────────────────────────────┐
│   📈 $DOGE                  │
│                            │
│   $187.50  (+87.5%)        │
│   ▲▲▲ green, large font    │
│                            │
│   ┌──────────────────────┐ │
│   │                      │ │
│   │    💰 SELL NOW       │ │
│   │                      │ │
│   └──────────────────────┘ │
│                            │
│   Beck sold $AAPL at $134  │
│   Nick holding $STONK      │
│   Jeremy holding $GME      │
│                            │
│   ▓▓▓▓▓▓▓░░░░░ 45% done   │
│                            │
└────────────────────────────┘
```

- Price is BIG and color-coded (green for gains, red for losses)
- Price updates in real-time
- SELL button is always visible and tappable
- Other players' status shown below
- Progress bar shows how much chart is left

**After selling:**
```
┌────────────────────────────┐
│   📈 $DOGE — SOLD           │
│                            │
│   You sold at $187.50      │
│   (+87.5%)                 │
│                            │
│   Current price: $243.80   │  ← still updating
│   You missed: +$56.30     │  ← or "You avoided: -$X"
│                            │
│   Nick holding $STONK $89  │
│   Jeremy holding $GME $312 │
│                            │
└────────────────────────────┘
```

After selling, you see what the stock is doing now — either vindicated or regretful.

### Result Computation (Post-Animation)

```js
function computeStockResult(stockData, sellState, playerStocks, selectionGoal) {
  const results = Object.entries(playerStocks).map(([name, ticker]) => {
    const sold = sellState[name];
    const stock = stockData.find(s => s.ticker === ticker);
    const finalPrice = sold ? sold.price : stock.history[stock.history.length - 1];
    const percentChange = ((finalPrice - 100) / 100) * 100;
    return {
      name,
      ticker,
      finalPrice,
      percentChange,
      sold: !!sold,
      soldAt: sold ? sold.progress : null, // when in the chart they sold
    };
  });

  // Rank by percent change (best to worst)
  results.sort((a, b) => b.percentChange - a.percentChange);
  results.forEach((r, i) => r.rank = i + 1);

  const selected = selectionGoal === 'winner' ? results[0] : results[results.length - 1];
  // ... build full result object
}
```

### Non-Connected Players

Players without connected phones don't sell — they ride to the end automatically. Their final price is whatever the chart ends at. This works naturally.

## Changes Required

| What | Change |
|------|--------|
| `buildStockMarketResult` | Add interactive path: generate stock pool, draft mechanics. Return partial result for draft phase. |
| `StockMarketPlayback` | Add draft phase UI, sell button handling during animation, post-animation result computation |
| `PlayerActionBar` | Add `case 'pick_stock'` (draft) and `case 'sell'` (during chart) |
| `startGame` | Handle the multi-phase flow: draft → chart animation with sell → finalize |
| Result finalization | New function builds complete result from sell decisions |
