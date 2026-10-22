// The shared AI tutor (Edge Function) path, with fetch() replaced by a fake server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tutor, AIError, lessonContext } from '../src/core/ai.js';

const db = { v: {}, getValue(k) { return this.v[k] ?? null; }, setValue(k, x) { this.v[k] = x; } };
const sseBody = (pieces) => new ReadableStream({
  start(c) {
    for (const p of pieces) c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: p }] } }] })}\n\n`));
    c.close();
  },
});
const cloud = { url: 'https://x.supabase.co', key: 'pk', token: async () => 'tok' };

test('signed in without own key -> Lumen AI streams the answer', async () => {
  let seen;
  globalThis.fetch = async (url, opts) => {
    seen = { url, opts };
    return new Response(sseBody(['Hello', ' world']), { headers: { 'X-AI-Used': '3', 'X-AI-Limit': '40' } });
  };
  const t = new Tutor(db, { cloud });
  assert.equal(t.status().provider, 'lumen');
  const out = [];
  for await (const p of t.askStream([{ role: 'user', content: 'hi' }], 'ctx')) out.push(p);
  assert.equal(out.join(''), 'Hello world');
  assert.equal(seen.url, 'https://x.supabase.co/functions/v1/tutor');
  assert.equal(seen.opts.headers.Authorization, 'Bearer tok');
  assert.deepEqual(JSON.parse(seen.opts.body).messages, [{ role: 'user', content: 'hi' }]);
  assert.deepEqual(t.status().usage, { used: 3, limit: 40 });
});

test('daily limit reached -> a friendly error', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'You asked 40 questions today' }), { status: 429 });
  const t = new Tutor(db, { cloud });
  await assert.rejects(() => t.ask([{ role: 'user', content: 'hi' }]), (e) => e instanceof AIError && /40 questions/.test(e.message));
});

test('guest without key -> not ready, asked to sign in', () => {
  const t = new Tutor({ getValue: () => null }, {});
  assert.equal(t.status().ready, false);
  assert.equal(t.status().signin, true);
});

test('own Gemini key wins over Lumen AI', () => {
  const t = new Tutor({ getValue: () => ({ gemini_key: 'AIzaSyXXXXXXXXXXXX' }) }, { cloud });
  assert.equal(t.status().provider, 'gemini');
});

test('lesson context lists class, plan and notes', () => {
  const c = lessonContext('Math', 'Derivatives', [{ text: 'ex 1', done: true }], [{ text: 'chain rule?' }], ['why 2x']);
  assert.match(c, /Class: Math/);
  assert.match(c, /ex 1 \(done\)/);
  assert.match(c, /chain rule\?/);
});
