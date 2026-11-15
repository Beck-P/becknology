// The coach's server function (api/chess-coach.mjs) with a stand-in for the Anthropic client: what it asks the model
// for, what it sends down to the page, what it refuses, and what it does when the API refuses it. No browser, no key.
//   node tools/tests/chess/coach_api.js
const path = require('path');

let failed = 0;
const check = (name, ok, more = '') => { if (!ok) failed++; console.log((ok ? 'ok   ' : 'FAILED ') + name + (more ? '  — ' + more : '')); };

(async () => {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const { createHandler } = await import(path.join(__dirname, '..', '..', '..', 'api', 'chess-coach.mjs'));

  // a client whose streams do what the next entry of `script` says: { text, message } or { error }
  const calls = [];
  let script = [];
  const stream = (kind) => (params, options) => {
    const step = script.shift() || {};
    calls.push({ kind, params, options });
    let onText = () => {};
    return {
      on(ev, fn) { if (ev === 'text') onText = fn; return this; },
      async finalMessage() {
        (step.text || []).forEach((d) => onText(d));
        if (step.error) throw step.error;
        return step.message;
      },
    };
  };
  const client = { beta: { messages: { stream: stream('beta') } }, messages: { stream: stream('plain') } };
  const refused = (status, msg) => Anthropic.APIError.generate(status, { type: 'error', error: { type: 'x', message: msg } }, msg, new Headers());

  let ip = 0;
  const call = async (handler, { method = 'POST', body, origin = 'https://becknology.test', sameIp = false } = {}) => {
    const out = { status: 0, json: null, head: null, events: [], ended: false };
    const res = {
      setHeader() {},
      status(c) { out.status = c; return res; },
      json(o) { out.json = o; out.ended = true; },
      writeHead(c, h) { out.status = c; out.head = h; },
      write(chunk) { String(chunk).split('\n\n').filter(Boolean).forEach((l) => out.events.push(JSON.parse(l.replace(/^data: /, '')))); },
      end() { out.ended = true; },
    };
    const headers = { host: 'becknology.test', 'x-forwarded-for': sameIp ? '9.9.9.9' : '10.0.0.' + (++ip % 250) + ', 1.1.1.1' };
    if (origin) headers.origin = origin;
    await handler({ method, headers, body, socket: {} }, res);
    return out;
  };

  const off = createHandler(() => null);
  const on = createHandler(() => client);
  const thinking = { type: 'thinking', thinking: '', signature: 'sig' };
  const ask = [{ role: 'user', content: '<board>…</board>\n\nwhy not Nxe5?' }];
  const round = [...ask,
    { role: 'assistant', content: [thinking, { type: 'tool_use', id: 'toolu_1', name: 'evaluate_moves', input: { moves: ['Nxe5'] } }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '- 10. Nxe5: -2.1' }] }];

  let r = await call(off, { method: 'GET' });
  check('GET says the coach is off without a key', r.status === 200 && r.json.enabled === false);
  r = await call(on, { method: 'GET' });
  check('…and on with one', r.json.enabled === true);
  r = await call(off, { body: { messages: ask } });
  check('a question with no key is turned away as disabled', r.status === 503 && r.json.error === 'disabled');
  r = await call(on, { body: { messages: ask }, origin: 'https://elsewhere.example' });
  check("another site's page is refused", r.status === 403 && calls.length === 0);
  for (const [why, messages] of [['none', []], ['ends on the coach', [...ask, { role: 'assistant', content: 'hi' }]], ['starts on the coach', [{ role: 'assistant', content: 'hi' }, ...ask]],
    ['an unknown block', [{ role: 'user', content: [{ type: 'image', source: {} }] }]], ['not a list', 'hello'], ['too many', new Array(200).fill(ask[0])]]) {
    r = await call(on, { body: { messages } });
    check('a malformed conversation is refused: ' + why, r.status === 400 && r.json.error === 'messages' && calls.length === 0);
  }
  r = await call(on, { body: { messages: [{ role: 'user', content: 'x'.repeat(700 * 1024) }] } });
  check('…and one too long', r.status === 413 && calls.length === 0);

  // an answer
  const answer = { stop_reason: 'end_turn', content: [thinking, { type: 'text', text: 'Because the knight is pinned.' }] };
  script = [{ text: ['Because ', 'the knight ', 'is pinned.'], message: answer }];
  r = await call(on, { body: { messages: round } });
  const p = calls[0].params;
  check('the question goes to Claude Opus 5.5, streamed, through the beta endpoint', calls.length === 1 && calls[0].kind === 'beta' && p.model === 'claude-opus-5-5' && p.max_tokens >= 8000 && p.output_config.effort === 'medium');
  check('…with a refusal fallback and thinking that survives an edited history', p.fallbacks === 'default' && p.betas.includes('server-side-fallback-2026-07-01') && p.betas.includes('thinking-binding-controls-2026-08-01') && p.thinking.type === 'adaptive' && p.thinking.block_binding.prefix_mismatch_behavior === 'drop_block');
  check('…the three tools, free to use them, and the conversation exactly as it came', p.tools.map((t) => t.name).join() === 'evaluate_moves,analyze_line,find_threats' && p.tool_choice.type === 'auto' && JSON.stringify(p.messages) === JSON.stringify(round));
  check('the system prompt is the coach\'s, and says where the truth comes from', typeof p.system === 'string' && /chess coach/.test(p.system) && /Stockfish's evaluations and lines are the facts/.test(p.system) && /\[asked by voice\]/.test(p.system));
  check('the words go down as they come, then the whole reply', r.status === 200 && /text\/event-stream/.test(r.head['Content-Type']) && r.events.filter((e) => e.t === 'text').map((e) => e.d).join('') === 'Because the knight is pinned.' && r.events[r.events.length - 1].t === 'done' && r.events[r.events.length - 1].stop === 'end_turn' && r.events[r.events.length - 1].content[0].signature === 'sig' && r.ended);

  // tool calls
  const wants = { stop_reason: 'tool_use', content: [thinking, { type: 'tool_use', id: 'toolu_2', name: 'find_threats', input: {} }] };
  script = [{ message: wants }];
  r = await call(on, { body: { messages: ask } });
  check('a reply that is a tool call goes down as one', r.events.length === 1 && r.events[0].stop === 'tool_use' && r.events[0].content[1].name === 'find_threats');
  script = [{ text: ['Fine.'], message: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Fine.' }] } }];
  r = await call(on, { body: { messages: round, final: true } });
  check('"answer now" takes the tools out of reach without changing them', calls[calls.length - 1].params.tool_choice.type === 'none' && JSON.stringify(calls[calls.length - 1].params.tools) === JSON.stringify(p.tools) && calls[calls.length - 1].params.system === p.system);
  script = [{ message: { stop_reason: 'max_tokens', content: [thinking, { type: 'tool_use', id: 'toolu_3', name: 'analyze_line', input: { moves: ['e4'] } }] } }];
  r = await call(on, { body: { messages: ask } });
  check('a tool call cut off by the token limit is never passed on to be run', r.events[0].stop === 'max_tokens' && !r.events[0].content.some((b) => b.type === 'tool_use'));
  script = [{ message: { stop_reason: 'refusal', content: [] } }];
  r = await call(on, { body: { messages: ask } });
  check('a refusal is passed on as one', r.events[0].stop === 'refusal');

  // the API saying no
  let n = calls.length;
  script = [{ error: refused(400, 'thinking.block_binding: Extra inputs are not permitted') }, { text: ['Plainly.'], message: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Plainly.' }] } }];
  r = await call(on, { body: { messages: round } });
  const plain = calls[calls.length - 1];
  check('a request the API rejects is tried once more the plain way', calls.length === n + 2 && plain.kind === 'plain' && !('betas' in plain.params) && !('fallbacks' in plain.params) && !('cache_control' in plain.params) && plain.params.thinking.type === 'adaptive' && !plain.params.thinking.block_binding && r.events.map((e) => e.t).join() === 'text,done');
  check('…without the thinking blocks, the tool call and its result kept', JSON.stringify(plain.params.messages[1].content.map((b) => b.type)) === '["tool_use"]' && plain.params.messages[2].content[0].type === 'tool_result' && plain.params.messages.length === 3);
  n = calls.length;
  script = [{ text: ['Half an '], error: refused(400, 'late') }];
  r = await call(on, { body: { messages: ask } });
  check('…but not once part of an answer has gone out: that ends with an error', calls.length === n + 1 && r.events.map((e) => e.t).join() === 'text,error' && r.events[1].error === 'failed' && r.ended);
  script = [{ error: refused(429, 'slow down') }];
  r = await call(on, { body: { messages: ask } });
  check('a rate limit at the API reads as busy', r.status === 503 && r.json.error === 'busy');
  script = [{ error: refused(529, 'overloaded') }];
  r = await call(on, { body: { messages: ask } });
  check('…and so does an overloaded one', r.status === 503 && r.json.error === 'busy');
  script = [{ error: refused(500, 'boom') }];
  r = await call(on, { body: { messages: ask } });
  check('any other failure reads as failed', r.status === 502 && r.json.error === 'failed');
  script = [{ error: new SyntaxError('Unexpected end of JSON input') }];
  r = await call(on, { body: { messages: ask } });
  check("a tool call that can't be read is a failure too, not a crash", r.status === 502 && r.json.error === 'failed');

  // one address asking too often
  let last = null;
  for (let i = 0; i < 91; i++) { script = [{ message: answer }]; last = await call(on, { body: { messages: ask }, sameIp: true }); }
  check('the ninety-first request in ten minutes from one address is told to wait', last.status === 429 && last.json.error === 'busy');

  // ---- the real SDK, talking to a stand-in for the API: what actually goes over the wire, and the stream read back
  const http = require('http');
  const seen = [];
  const sse = (events) => events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
  const reply = (blocks, stop) => {
    const ev = [{ type: 'message_start', message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } } }];
    blocks.forEach((b, i) => {
      if (b.type === 'thinking') ev.push({ type: 'content_block_start', index: i, content_block: { type: 'thinking', thinking: '', signature: '' } }, { type: 'content_block_delta', index: i, delta: { type: 'signature_delta', signature: b.signature } });
      else if (b.type === 'text') { ev.push({ type: 'content_block_start', index: i, content_block: { type: 'text', text: '' } }); b.text.match(/\S+\s*/g).forEach((d) => ev.push({ type: 'content_block_delta', index: i, delta: { type: 'text_delta', text: d } })); }
      else { ev.push({ type: 'content_block_start', index: i, content_block: { type: 'tool_use', id: b.id, name: b.name, input: {} } }); const j = JSON.stringify(b.input); ev.push({ type: 'content_block_delta', index: i, delta: { type: 'input_json_delta', partial_json: j.slice(0, 9) } }, { type: 'content_block_delta', index: i, delta: { type: 'input_json_delta', partial_json: j.slice(9) } }); }
      ev.push({ type: 'content_block_stop', index: i });
    });
    ev.push({ type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 30 } }, { type: 'message_stop' });
    return sse(ev);
  };
  let next = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      seen.push({ url: req.url, beta: req.headers['anthropic-beta'] || '', body: JSON.parse(raw) });
      const step = next.shift();
      if (step.status) { res.writeHead(step.status, { 'content-type': 'application/json' }); res.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: step.message } })); return; }
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.end(step.sse);
    });
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const real = createHandler(() => new Anthropic({ apiKey: 'test-key', baseURL: 'http://127.0.0.1:' + server.address().port, maxRetries: 0 }));

  next = [{ sse: reply([{ type: 'thinking', signature: 'sig-a' }, { type: 'tool_use', id: 'toolu_9', name: 'evaluate_moves', input: { moves: ['Nxe5', 'O-O'], after: ['Rd1'] } }], 'tool_use') }];
  r = await call(real, { body: { messages: ask } });
  const w = seen[0];
  check('over the wire: the beta endpoint, both betas named, a streamed request', /^\/v1\/messages(\?beta=true)?$/.test(w.url) && /server-side-fallback-2026-07-01/.test(w.beta) && /thinking-binding-controls-2026-08-01/.test(w.beta) && w.body.stream === true && !('betas' in w.body), w.url + ' ' + w.beta);
  check('…carrying the fallback, the thinking setting, the effort, caching and the tools as written', w.body.fallbacks === 'default' && w.body.thinking.block_binding.prefix_mismatch_behavior === 'drop_block' && w.body.output_config.effort === 'medium' && w.body.cache_control.type === 'ephemeral' && w.body.tools.length === 3 && w.body.tools.every((t) => t.eager_input_streaming === true && t.input_schema.type === 'object') && w.body.model === 'claude-opus-5-5');
  const done = r.events[r.events.length - 1];
  check('a streamed tool call is read back whole, with the signed thinking block before it', done.stop === 'tool_use' && done.content[0].type === 'thinking' && done.content[0].signature === 'sig-a' && JSON.stringify(done.content[1].input) === '{"moves":["Nxe5","O-O"],"after":["Rd1"]}', JSON.stringify(done.content));

  next = [{ sse: reply([{ type: 'thinking', signature: 'sig-b' }, { type: 'text', text: 'The knight on e5 is pinned to the queen.' }], 'end_turn') }];
  r = await call(real, { body: { messages: round } });
  check('a streamed answer reaches the page word by word and whole', r.events.filter((e) => e.t === 'text').length === 9 && r.events.filter((e) => e.t === 'text').map((e) => e.d).join('') === 'The knight on e5 is pinned to the queen.' && r.events[r.events.length - 1].content[1].text === 'The knight on e5 is pinned to the queen.');

  next = [{ status: 400, message: 'messages.1.content.0: Invalid `signature` in `thinking` block. The block is bound to a different conversation.' }, { sse: reply([{ type: 'text', text: 'Still here.' }], 'end_turn') }];
  r = await call(real, { body: { messages: round } });
  const again = seen[seen.length - 1];
  check('a real 400 from the API leads to the plain request: no beta header, no thinking blocks', r.events[r.events.length - 1].stop === 'end_turn' && !again.beta && !('fallbacks' in again.body) && !JSON.stringify(again.body.messages).includes('"thinking"') && again.body.thinking.type === 'adaptive', again.url + ' [' + again.beta + ']');
  server.close();

  console.log('errors:', failed);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('FAILED: the test crashed —', e.stack.split('\n').slice(0, 3).join(' | ')); process.exit(1); });
