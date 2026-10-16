/**
 * /api/talk — the Bridge's characters, voiced by Claude Haiku 5.5.
 *
 * GET  → { enabled, env }  (whether a key is configured — the game hides free talk without one —
 *                          and which Vercel environment answered)
 * POST → { mode: 'greet' | 'talk' | 'fold' | 'letter', person, say?, history?, bond?, clues?, news?, flags?, place? }
 *
 * The prompt is built here, never sent by the browser: who the character is
 * (apps/bridge/assets/people.json, plus the fuller sheets in api/_personas.json,
 * which hold secrets and so are not served to the page), what the pilot has
 * found (quest clue ids → text from quests.json), what's happened since they
 * last talked, and how the character feels about the pilot. Secrets only go
 * into the prompt once the character trusts the pilot enough to tell them.
 *
 * The reply is JSON: { reply, feeling (-2..2), mood, remember, action }; a
 * letter (someone who likes the pilot writing to the ship) is { letter }.
 * The browser keeps the relationship (js/talk.js) and sends it back each time.
 */
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const load = (p) => JSON.parse(readFileSync(new URL(p, ROOT), 'utf8'));
const PEOPLE = load('apps/bridge/assets/people.json');
const QUESTS = load('apps/bridge/assets/quests.json');
const BUSINESSES = load('apps/bridge/assets/businesses.json');
const PERSONAS = load('api/_personas.json');

const MODEL = 'claude-haiku-5-5';

const WORLD = `This is Becknology, a cozy pixel-art space fantasy. The player is "the pilot", captain of a sky-galleon called the Wayfarer, who flies a small skiff down to four places:
- Lumar: a night-time sea world of glowing water and islands - the harbour town of Diggen's Point, Crimson Reach (pirate camp, a dragon's cave), Rose Cove (crystal terraces, hot springs), Sapphire Port (market town, lighthouse) and Midnight Isle (a sorceress's tower, a graveyard, stone sentinels).
- Arcadia: a rainy neon cyberpunk city of arcades, noodle bars and rooftop skyports.
- Enigma Station: an abandoned relay station drifting by a ringed gas giant.
- The Singularity: the shattered edge of a black hole where time runs wrong.`;

const RULES = `How to play this character:
- Speak only as them, in their voice. 1 to 3 short sentences, under 60 words. No stage directions, no narration, no emoji, no quotation marks around your line.
- You know only what your sheet says, plus anything the pilot tells you. If you don't know something, say so in character. Never invent places, people, items or quest answers that aren't in your sheet.
- Keep your secrets unless they're listed as things you're ready to share.
- If the pilot talks about things outside this world (the real world, AI, games), react in character - puzzled, or wave it off.
- Let how you feel about the pilot colour how warm or guarded you are. React to what they actually say: kindness, help and listening warm you; rudeness, threats and mockery cool you.
- You may mention news you've heard if it interests you.

Also return:
- feeling: how this exchange changed your feeling toward the pilot: 0 usually; +1 for kindness, help or real interest; +2 rarely, for something that matters to you; -1 for rudeness; -2 for cruelty or threats.
- mood: your mood right now, 1 to 3 words.
- remember: one short line, from your point of view, about the pilot if something worth remembering happened (a promise, a kindness, an insult, something they told you); otherwise an empty string.
- action: "join_crew" only if the pilot asks you to join their crew and you would consider it; "trade" only if the pilot wants to buy from or sell to you and you trade; otherwise "none".`;

const LETTER_RULES = `How to write as this character:
- Write only as them, in their voice: a short letter of 40 to 90 words, plain prose, no stage directions, no emoji.
- You know only what your sheet says, plus what the pilot has told you and the news you've heard. Never invent places, people, items or quest answers that aren't in your sheet.
- Keep your secrets unless they're listed as things you're ready to share.
- Let how you feel about the pilot colour how warm or guarded the letter is.`;

const REPLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'feeling', 'mood', 'remember', 'action'],
  properties: {
    reply: { type: 'string' },
    feeling: { type: 'integer', description: 'Change in feeling, from -2 to 2 (clamped).' },
    mood: { type: 'string' },
    remember: { type: 'string' },
    action: { type: 'string', enum: ['none', 'join_crew', 'trade'] },
  },
};
const LETTER_SCHEMA = {
  type: 'object',
  properties: {
    letter: { type: 'string', description: 'The letter: 40 to 90 words of plain prose in sentence case, signed with your name on its own last line.' },
  },
  required: ['letter'],
  additionalProperties: false,
};

const FOLD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary'],
  properties: { summary: { type: 'string' } },
};

// ---- input hygiene -----------------------------------------------------------------------------
const str = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n) : '');
const list = (v, n, len) => (Array.isArray(v) ? v.slice(-n).map((x) => str(x, len)).filter(Boolean) : []);
const clamp = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(+v) ? Math.round(+v) : 0));

function feelingWord(f) {
  if (f <= -6) return 'cold toward them';
  if (f <= -2) return 'wary of them';
  if (f < 2) return 'neutral about them';
  if (f < 5) return 'friendly toward them';
  if (f < 8) return 'warm toward them';
  return 'trusting them deeply';
}

// ---- the character -------------------------------------------------------------------------------
function sheet(id, feeling, flags) {
  const p = PEOPLE[id];
  const s = PERSONAS[id];
  const lines = [`You are ${p.name} - ${p.role}.`];
  if (s) {
    lines.push(`Voice: ${s.voice}`, '', `Your story: ${s.story}`, '', 'What you know:');
    s.knows.forEach((k) => lines.push(`- ${k}`));
    const ready = s.secrets.filter((x) => feeling >= x.trust);
    if (ready.length) {
      lines.push('', 'Things you are now ready to share with the pilot, if it comes up naturally:');
      ready.forEach((x) => lines.push(`- ${x.text}`));
    }
    if (s.secrets.length > ready.length) lines.push('', 'You have something private you are not ready to talk about yet. If pressed, deflect.');
    lines.push('', `What you want: ${s.wants}`);
    const others = Object.entries(s.others || {});
    if (others.length) {
      lines.push('', 'People you know:');
      others.forEach(([who, how]) => lines.push(`- ${(PEOPLE[who] && PEOPLE[who].name) || who}: ${how}`));   // by name, never the id (the id 'alyssa' read as the pilot)
    }
    const beats = (s.beats || []).filter((b) => flags.includes(b.when));
    if (beats.length) {
      lines.push('', 'Where your story stands now:');
      beats.forEach((b) => lines.push(`- ${b.text}`));
    }
  } else {
    lines.push('Your voice and what you know come from the lines you have already said to visitors:');
    lines.push(`- Greeting: ${p.greet}`);
    (p.topics || []).forEach((t) => lines.push(`- Asked "${t.q}": ${t.a}`));
  }
  if (p.crew) {
    if (p.crew.after && !flags.includes(`quest:${p.crew.after}`)) {
      lines.push('', `You will not join anyone's crew yet. If asked: ${p.crew.notYet}`);
    } else {
      lines.push('', `You could be persuaded to join the pilot's crew as ${p.crew.role}. Your pitch: ${p.crew.pitch}`);
    }
  }
  if ((p.topics || []).some((t) => t.sell)) lines.push('', 'You buy goods from travellers.');
  return lines.join('\n');
}

function newsLine(n) {
  const [kind, id] = n.split(':');
  if (kind === 'quest' && QUESTS[id]) return `The pilot has finished something: ${QUESTS[id].done}`;
  if (kind === 'crew' && PEOPLE[id] && PEOPLE[id].crew) return `${PEOPLE[id].name} has joined the pilot's crew as ${PEOPLE[id].crew.role}.`;
  if (kind === 'biz' && BUSINESSES[id]) return `The pilot has bought ${BUSINESSES[id].name}.`;
  return '';
}

function clueLine(c) {
  const [qid, cid] = c.split('/');
  const q = QUESTS[qid];
  const clue = q && q.clues.find((x) => x.id === cid);
  return clue ? clue.text : '';
}

function situation(body, mode) {
  const b = body.bond || {};
  const feeling = clamp(b.feeling, -10, 10);
  const lines = [];
  const name = str(body.pilot, 24);
  if (name) lines.push(`The pilot's name is ${name}.`);
  lines.push(b.met ? `You have met the pilot before. You are ${feelingWord(feeling)}.` : 'You have never met the pilot before.');
  if (str(b.mood, 40)) lines.push(`Your mood when you last saw them: ${str(b.mood, 40)}.`);
  const summary = str(b.summary, 700);
  if (summary) lines.push(`What you remember from before: ${summary}`);
  const mem = list(b.memories, 12, 160);
  if (mem.length) {
    lines.push('Things you remember about the pilot:');
    mem.forEach((m) => lines.push(`- ${m}`));
  }
  const news = list(body.news, 8, 60).map(newsLine).filter(Boolean);
  if (news.length) {
    lines.push('', 'Word that has reached you since you last saw the pilot (gossip travels):');
    news.forEach((n) => lines.push(`- ${n}`));
  }
  const clues = list(body.clues, 30, 60).map(clueLine).filter(Boolean);
  if (clues.length) {
    lines.push('', "Things the pilot has seen on their travels (you don't know these unless they tell you; never reveal more than this):");
    clues.forEach((c) => lines.push(`- ${c}`));
  }
  const hist = Array.isArray(body.history) ? body.history.slice(-12) : [];
  if (hist.length) {
    lines.push('', 'This conversation so far:');
    hist.forEach((h) => {
      const t = str(h && h.text, 400);
      if (t) lines.push(`${h.from === 'them' ? 'You' : 'Pilot'}: ${t}`);
    });
  }
  lines.push('');
  if (mode === 'greet') lines.push('The pilot has just walked up to you. Greet them in a line or two, the way you would given how you feel and what you remember or have heard.');
  else if (mode === 'letter') lines.push("The pilot is away on their ship. Write them a short letter, sent up to the Wayfarer, in your own voice: about something you remember of them, word you've heard of what they've done, or what's going on with you and your place. Plain prose in sentence case (not capitals), no 'Dear' header, nothing they couldn't know; sign it with your name on the last line.");
  else lines.push(`The pilot says: ${str(body.say, 240)}`);
  return lines.join('\n');
}

// ---- rate limiting (per instance; the account's spend cap is the hard ceiling) -----------------------
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000, max = 40;
  const h = hits.get(ip) || { n: 0, t: now };
  if (now - h.t > win) { h.n = 0; h.t = now; }
  h.n += 1;
  hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  return h.n > max;
}

function textOf(msg) {
  const block = (msg.content || []).find((c) => c.type === 'text');
  return block ? block.text : '';
}

export function createHandler(getClient) {
  return async function handler(req, res) {
    const client = getClient();
    if (req.method === 'GET') {
      // never cached, and says which Vercel environment answered (production / preview) so a
      // missing key is easy to place; never anything about the key itself
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ enabled: !!client, env: process.env.VERCEL_ENV || 'local' });
      return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
    if (!client) { res.status(503).json({ error: 'disabled' }); return; }
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (limited(ip)) { res.status(429).json({ error: 'busy' }); return; }

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    if (!body || typeof body !== 'object') { res.status(400).json({ error: 'body' }); return; }
    const id = str(body.person, 40);
    const mode = ['greet', 'talk', 'fold', 'letter'].includes(body.mode) ? body.mode : 'talk';
    if (!PEOPLE[id]) { res.status(400).json({ error: 'person' }); return; }
    if (mode === 'talk' && !str(body.say, 240)) { res.status(400).json({ error: 'say' }); return; }

    try {
      if (mode === 'fold') {
        const b = body.bond || {};
        const msg = await client.messages.create({
          model: MODEL,
          max_tokens: 1024,
          output_config: { effort: 'low', format: { type: 'json_schema', schema: FOLD_SCHEMA } },
          system: `You keep the memory of ${PEOPLE[id].name}, ${PEOPLE[id].role}, a character in a game, about the player (the pilot). Fold the old summary and the memories into one short summary, in ${PEOPLE[id].name}'s point of view, under 80 words, keeping what matters most to how they feel about the pilot.`,
          messages: [{ role: 'user', content: `Old summary: ${str(b.summary, 700) || '(none)'}\nMemories:\n${list(b.memories, 20, 160).map((m) => `- ${m}`).join('\n')}` }],
        });
        const out = JSON.parse(textOf(msg) || '{}');
        res.status(200).json({ summary: str(out.summary, 700) });
        return;
      }

      const feeling = clamp(body.bond && body.bond.feeling, -10, 10);
      // story beats key off finished quests (quest:<id>) and clues found along the way (clue:<quest>/<clue>)
      const flags = list(body.flags, 40, 60).concat(list(body.clues, 30, 60).map((c) => `clue:${c}`));
      const letter = mode === 'letter';
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: letter ? LETTER_SCHEMA : REPLY_SCHEMA } },
        system: [
          { type: 'text', text: `${WORLD}\n\n${letter ? LETTER_RULES : RULES}` },
          { type: 'text', text: sheet(id, feeling, flags) },
        ],
        messages: [{ role: 'user', content: situation(body, mode) }],
      });
      if (msg.stop_reason === 'refusal') {
        res.status(200).json(letter ? { letter: '' } : { reply: '...', feeling: 0, mood: '', remember: '', action: 'none' });
        return;
      }
      const out = JSON.parse(textOf(msg) || '{}');
      if (letter) {
        res.status(200).json({ letter: typeof out.letter === 'string' ? out.letter.replace(/\r/g, '').trim().slice(0, 900) : '' });
        return;
      }
      res.status(200).json({
        reply: str(out.reply, 600) || '...',
        feeling: clamp(out.feeling, -2, 2),
        mood: str(out.mood, 40),
        remember: str(out.remember, 160),
        action: ['join_crew', 'trade'].includes(out.action) ? out.action : 'none',
      });
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) { res.status(503).json({ error: 'busy' }); return; }
      console.error('talk failed', err && err.status, err && err.message);
      res.status(502).json({ error: 'failed' });
    }
  };
}

let client = null;
export default createHandler(() => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
});
