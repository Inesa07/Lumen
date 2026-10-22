// ai.js: the AI tutor (port of ai.py), talking to the AI directly from the browser.
//
// Providers (whichever is set up, in this order):
//   1. Claude (Anthropic API) - your own API key (optional)
//   2. Gemini (Google)        - your own FREE key from https://aistudio.google.com/apikey (optional)
//   3. Lumen AI               - for everybody who is signed in: the "tutor" Edge Function on Supabase
//                               asks Gemini with Lumen's secret key (supabase/functions/tutor), daily limit
// Your own keys are kept only in this browser (they are never uploaded).
//
// Streaming: the model writes one token at a time, and the API sends every piece immediately as
// Server-Sent Events ("data: {...}" lines). We read the HTTP response body piece by piece with a
// ReadableStream reader, which is why the answer appears word by word.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_CLAUDE_MODEL = 'claude-haiku-5-5';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_FALLBACK = 'gemini-2.5-flash';
const MAX_HISTORY = 20;

export const SYSTEM = `You are Lumen's study tutor. The student is learning and wants to really understand, not just get answers.
- Answer in the language the student writes in. Keep technical terms in English and explain them in brackets when helpful.
- Explain step by step, from the idea to the details. Use a small example, analogy, formula or code when it helps.
- Be correct and honest: if you are not sure, say so. Don't invent facts or sources.
- Keep answers focused: short paragraphs, lists only when they help. Use Markdown (\`\`\`code\`\`\`, **bold**, lists, tables).
- Write math in LaTeX: $...$ inline and $$...$$ on its own line (for example $\\int_0^1 x^2\\,dx$).
- End with one short question or exercise that checks understanding, when it fits.`;

const HINT = `The student asked for a HINT, not the answer: give one helpful nudge or a guiding question
that moves them one step forward. Do not give the full solution.`;

export class AIError extends Error {}

const hint = (k) => (k.length > 12 ? `${k.slice(0, 6)}…${k.slice(-4)}` : 'set');

/** Yields the JSON of every "data: ..." line of a Server-Sent Events HTTP response. */
async function* sse(resp, signal) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      if (signal && signal.aborted) return;
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (data && data !== '[DONE]') yield JSON.parse(data);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function post(url, body, headers, signal) {
  let resp;
  try {
    resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new AIError('Could not reach the AI. Check your internet connection.');
  }
  if (!resp.ok) {
    let detail = (await resp.text()).slice(0, 300);
    try { detail = JSON.parse(detail).error.message; } catch { /* keep the text */ }
    const c = resp.status;
    if (c === 401 || ((c === 400 || c === 403) && /key/i.test(detail))) throw new AIError('The API key was not accepted. Check it in Settings → AI tutor.');
    if (c === 404) throw new AIError(`Model not found: ${detail}`);
    if (c === 429) throw new AIError('The free limit is used up for the moment. Wait a minute and ask again (the daily free limit resets every night).');
    throw new AIError(`AI error ${c}: ${detail}`);
  }
  return resp;
}

export class Tutor {
  /** @param {import('../data/db.js').DocDB} db  @param {{fake?: boolean}} opts */
  /**
   * @param {{fake?: boolean, cloud?: {url: string, key: string, token: () => Promise<string|null>}}} opts
   *   cloud: how to reach the shared tutor (only when signed in)
   */
  constructor(db, { fake = false, cloud = null } = {}) { this.db = db; this.fake = fake; this.cloud = cloud; }

  config() {
    return { api_key: '', model: DEFAULT_CLAUDE_MODEL, gemini_key: '', gemini_model: '', ...(this.db.getValue('ai') || {}) };
  }

  async save({ api_key = null, model = null, gemini_key = null } = {}) {
    const cfg = this.config();
    if (gemini_key !== null && gemini_key !== undefined) {
      const k = String(gemini_key).trim();
      if (k) cfg.gemini_model = await this.geminiPick(k);     // also checks that the key works
      cfg.gemini_key = k;
    }
    if (api_key !== null && api_key !== undefined) cfg.api_key = String(api_key).trim();
    if (model) cfg.model = String(model).trim();
    this.db.setValue('ai', cfg);
    return this.status();
  }

  /** Which provider will answer. Safe to show (no key inside). */
  status() {
    const cfg = this.config();
    if (this.fake) return { ready: true, provider: 'test', model: 'echo' };
    if (cfg.api_key) return { ready: true, provider: 'claude', model: cfg.model, key_hint: hint(cfg.api_key), gemini_hint: cfg.gemini_key ? hint(cfg.gemini_key) : null };
    if (cfg.gemini_key) return { ready: true, provider: 'gemini', model: cfg.gemini_model || GEMINI_FALLBACK, gemini_hint: hint(cfg.gemini_key) };
    if (this.cloud) return { ready: true, provider: 'lumen', model: 'Lumen AI', usage: this.usage || null };
    return { ready: false, provider: null, web: true, signin: true };
  }

  async ask(messages, context = '', isHint = false) {
    let out = '';
    for await (const piece of this.askStream(messages, context, isHint)) out += piece;
    return out.trim() || '(empty answer)';
  }

  /** Async generator: yields the answer in small pieces while the model is still writing. */
  async* askStream(messages, context = '', isHint = false, signal = undefined) {
    const st = this.status();
    if (!st.ready) throw new AIError('Sign in to use the free AI tutor (menu → Guest → Create account), or add your own key in Settings → AI tutor.');
    const system = SYSTEM + (context ? `\n\n${context}` : '') + (isHint ? `\n\n${HINT}` : '');
    const msgs = messages.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content }));
    if (st.provider === 'test') {
      const text = `(test answer) You asked: **${msgs.at(-1).content}**\n\n## Idea\nThe integral $\\int_a^b f(x)\\,dx$ is the area.\n\n`
        + "$$F(b) - F(a)$$\n\n| x | f(x) |\n|---|---|\n| 1 | 2 |\n\n```python\nprint('hi')\n```\nWhat do you think?";
      for (const w of text.split(' ')) {
        if (signal && signal.aborted) return;
        await new Promise((r) => setTimeout(r, 15));
        yield `${w} `;
      }
      return;
    }
    if (st.provider === 'claude') yield* this._claude(system, msgs, st.model, signal);
    else if (st.provider === 'lumen') yield* this._lumen(system, msgs, signal);
    else yield* this._gemini(system, msgs, st.model, signal);
  }

  async* _claude(system, msgs, model, signal) {
    const resp = await post(ANTHROPIC_URL, { model, max_tokens: 2000, system, messages: msgs, stream: true }, {
      'x-api-key': this.config().api_key, 'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',     // the key belongs to this user, in their own browser
    }, signal);
    for await (const ev of sse(resp, signal)) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') yield ev.delta.text;
      else if (ev.type === 'error') throw new AIError((ev.error || {}).message || 'AI error');
    }
  }

  /** Ask Google which models this key may use and pick the newest "Flash" model. */
  async geminiPick(key) {
    let resp;
    try {
      resp = await fetch(`${GEMINI_URL}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    } catch {
      throw new AIError('Could not reach Google. Check your internet connection.');
    }
    if ([400, 401, 403].includes(resp.status)) throw new AIError('Google did not accept this key. Copy it again from aistudio.google.com/apikey.');
    if (!resp.ok) throw new AIError(`Google answered with error ${resp.status}. Try again in a minute.`);
    const models = (await resp.json()).models || [];
    const skip = ['lite', 'image', 'tts', 'audio', 'live', 'embedding', 'exp', 'preview', 'thinking', 'vision'];
    let best = null, bestVer = -1;
    for (const m of models) {
      const name = (m.name || '').split('/').at(-1);
      if (!(m.supportedGenerationMethods || []).includes('generateContent')) continue;
      if (!name.startsWith('gemini-') || !name.includes('flash') || skip.some((x) => name.includes(x))) continue;
      const ver = parseFloat(name.split('-')[1]);
      if (!Number.isNaN(ver) && ver > bestVer) { best = name; bestVer = ver; }
    }
    return best || GEMINI_FALLBACK;
  }

  async* _gemini(system, msgs, model, signal) {
    const key = this.config().gemini_key;
    const body = {
      system_instruction: { parts: [{ text: system }] },
      contents: msgs.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 2048 },
    };
    const url = (m) => `${GEMINI_URL}/models/${m}:streamGenerateContent?alt=sse`;
    let resp;
    try {
      resp = await post(url(model), body, { 'x-goog-api-key': key }, signal);
    } catch (e) {
      if (!(e instanceof AIError) || !/not found/i.test(e.message)) throw e;
      model = await this.geminiPick(key);                  // the model was retired: pick the current one
      this.db.setValue('ai', { ...this.config(), gemini_model: model });
      resp = await post(url(model), body, { 'x-goog-api-key': key }, signal);
    }
    let got = false;
    for await (const ev of sse(resp, signal)) {
      for (const c of ev.candidates || []) {
        for (const part of (c.content || {}).parts || []) {
          if (part.text && !part.thought) { got = true; yield part.text; }
        }
      }
    }
    if (!got && !(signal && signal.aborted)) throw new AIError('Gemini did not answer this question (it may have been blocked by its safety filter).');
  }
}

/** Answers stream back in Gemini's format, so the same reader works for both. */
async function* geminiPieces(resp, signal) {
  let got = false;
  for await (const ev of sse(resp, signal)) {
    for (const c of ev.candidates || []) {
      for (const part of (c.content || {}).parts || []) {
        if (part.text && !part.thought) { got = true; yield part.text; }
      }
    }
  }
  if (!got && !(signal && signal.aborted)) throw new AIError('The AI did not answer this question (it may have been blocked by its safety filter).');
}

Tutor.prototype._lumen = async function* lumen(system, msgs, signal) {
  const token = await this.cloud.token();
  if (!token) throw new AIError('Please sign in again to use the AI tutor.');
  let resp;
  try {
    resp = await fetch(`${this.cloud.url}/functions/v1/tutor`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: this.cloud.key },
      body: JSON.stringify({ system, messages: msgs }),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new AIError('Could not reach the AI tutor. Check your internet connection.');
  }
  if (!resp.ok) {
    let msg = '';
    try { msg = (await resp.json()).error || ''; } catch { /* not JSON */ }
    if (resp.status === 404) throw new AIError('The free AI tutor is not switched on yet (the "tutor" function is not deployed).');
    throw new AIError(msg || `AI error ${resp.status}`);
  }
  const used = Number(resp.headers.get('X-AI-Used')), limit = Number(resp.headers.get('X-AI-Limit'));
  if (limit) this.usage = { used, limit };
  yield* geminiPieces(resp, signal);
};

/** What the tutor should know about where the question comes from. */
export function lessonContext(cls = null, lesson = null, tasks = [], notes = [], questions = []) {
  const lines = [];
  if (cls) lines.push(`Class: ${cls}`);
  if (lesson) lines.push(`Current lesson: ${lesson}`);
  if (tasks && tasks.length) lines.push(`Student's plan / to-do: ${tasks.slice(0, 10).map((t) => t.text + (t.done ? ' (done)' : '')).join('; ')}`);
  const nt = (notes || []).slice(0, 8).filter((n) => n.text).map((n) => n.text.slice(0, 200));
  if (nt.length) lines.push(`Student's sticky notes: ${nt.join(' | ')}`);
  const qs = (questions || []).slice(0, 6).filter((q) => q).map((q) => q.slice(0, 150));
  if (qs.length) lines.push(`Moments the student marked as confusing: ${qs.join(' | ')}`);
  return lines.length ? `Context about the student's lesson:\n${lines.join('\n')}` : '';
}
