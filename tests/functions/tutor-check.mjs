// Manual check of the Edge Function logic in Node (no Deno, no Supabase needed):
//   sed 's#import { createClient } from "npm:@supabase/supabase-js@2";#const createClient = (globalThis as any).createClient;#' \
//     supabase/functions/tutor/index.ts > /tmp/tutor.ts && cp tests/functions/tutor-check.mjs /tmp/ && node --experimental-strip-types /tmp/tutor-check.mjs
// It fakes Google (busy model, retired model, errors) and prints what the function does.
const env = { GEMINI_API_KEY: 'k', SUPABASE_URL: 'https://x' };
let refunds = 0, quota = 0;
globalThis.Deno = { env: { get: (k) => env[k] }, serve: (h) => { globalThis.handler = h; } };
globalThis.createClient = () => ({
  auth: { getUser: async (t) => (t === 'good' ? { data: { user: { id: 'u' } }, error: null } : { data: {}, error: { message: 'bad' } }) },
  rpc: async (name) => { if (name === 'refund_ai_quota') { refunds++; return {}; } quota++; return { data: [{ allowed: true, used: quota }], error: null }; },
});
const calls = [];
let plan = [];
globalThis.fetch = async (url) => {
  calls.push(url.replace('https://generativelanguage.googleapis.com/v1beta', ''));
  if (url.includes('/models?')) return new Response(JSON.stringify({ models: [
    { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.8-flash-lite', supportedGenerationMethods: ['generateContent'] }] }));
  const st = plan.shift() ?? 200;
  return st === 200 ? new Response('data: {"candidates":[{"content":{"parts":[{"text":"hi"}]}}]}\n\n') : new Response('{"error":{}}', { status: st });
};
await import('./tutor.ts');
const req = (tok = 'good') => new Request('https://f', { method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: JSON.stringify({ system: 's', messages: [{ role: 'user', content: 'q' }] }) });
let r = await handler(req('bad')); console.log('bad token', r.status);
plan = [503, 200]; calls.length = 0; r = await handler(req()); console.log('503 then ok:', r.status, await r.text(), calls);
plan = [503, 503, 200]; calls.length = 0; r = await handler(req()); console.log('fallback model:', r.status, calls);
plan = [503, 503, 503, 503]; calls.length = 0; r = await handler(req()); console.log('all busy:', r.status, await r.text(), 'refunds', refunds);
plan = [404, 200]; calls.length = 0; r = await handler(req()); console.log('404 refresh:', r.status, calls);
plan = [400]; calls.length = 0; r = await handler(req()); console.log('400:', r.status, await r.text(), calls.length);
