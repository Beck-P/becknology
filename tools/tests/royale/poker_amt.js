// poker: type an exact bet into the raise box
const { chromium } = require('playwright');
const S = __dirname;
const [, , W = 1280, H = 800] = process.argv;
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: +W < 600 })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 160)));
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 160)); });
  await p.goto('http://127.0.0.1:8766/runouts/?game=poker&table=poker-1'); await p.waitForTimeout(2000);
  console.log('buy-in:', await p.evaluate(() => [...document.querySelectorAll('.bp-opts button')].map(b => b.innerText.replace(/\n/g, ' ')).join(' | ')));
  await p.evaluate(() => { const b = document.querySelector('.bp-opts button'); b && b.click(); });
  const box = async () => p.evaluate(() => { const i = document.querySelector('.raise-amt'); const g = [...document.querySelectorAll('.poker-acts button')].map(b => b.innerText.replace(/\n/g, ' ')); return i ? { val: i.value, btns: g } : null; });
  let st = null;
  for (let i = 0; i < 60 && !(st = await box()); i++) await p.waitForTimeout(500);
  console.log('my turn:', JSON.stringify(st));
  if (!st) { await p.screenshot({ path: S + '/shots/pk_amt_none.png' }); await b.close(); return; }
  const stack0 = await p.evaluate(() => document.body.innerText.match(/YOU\s*\n?\s*([\d,]+)/));
  // type an exact amount: the button follows once it's taken
  await p.click('.raise-amt'); await p.keyboard.type('37'); 
  console.log('typing 37:', JSON.stringify(await box()));
  await p.keyboard.press('Tab'); await p.waitForTimeout(200);
  console.log('after blur:', JSON.stringify(await box()));
  await p.screenshot({ path: S + '/shots/pk_amt_37.png' });
  // keys typed in the box don't fold/call (f, c, r, space)
  await p.click('.raise-amt'); await p.keyboard.type('fcr 5'); await p.waitForTimeout(200);
  console.log('typed "fcr 5" (digits only):', JSON.stringify(await box()));
  // too little: the least raise, said so
  await p.keyboard.press('Control+A'); await p.keyboard.type('1'); await p.keyboard.press('Tab'); await p.waitForTimeout(300);
  console.log('typed 1 ->', JSON.stringify(await box()), 'toast:', await p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.innerText : null; }));
  // too much: all in
  await p.click('.raise-amt'); await p.keyboard.press('Control+A'); await p.keyboard.type('999999'); await p.keyboard.press('Tab'); await p.waitForTimeout(300);
  console.log('typed 999999 ->', JSON.stringify(await box()), 'toast:', await p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.innerText : null; }));
  // Enter bets it
  await p.click('.raise-amt'); await p.keyboard.press('Control+A'); await p.keyboard.type('40'); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
  console.log('after Enter on 40:', JSON.stringify(await box()));
  console.log('my bet on the table:', await p.evaluate(() => { const v = window.__table && window.__table.view && window.__table.view(); if (!v) return null; const me = v.seats.find(s => s.kind !== 'npc'); return me ? { bet: me.bet, stack: me.stack } : null; }));
  await p.screenshot({ path: S + '/shots/pk_amt_after.png' });
  await b.close();
})();
