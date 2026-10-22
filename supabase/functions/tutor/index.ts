// Supabase Edge Function "tutor": the shared AI tutor for every signed-in student.
//
//   browser ──(question + login token)──▶ tutor (this code, on Supabase's servers) ──(secret key)──▶ Gemini
//
// Why a server? The Gemini API key must stay SECRET. In the browser anybody could copy it.
// Here it is an environment variable (Supabase → Edge Functions → Secrets → GEMINI_API_KEY).
// The function also checks who is asking (the login token) and counts questions per day.
//
// Runtime: Deno (a JavaScript/TypeScript runtime like Node.js), running close to the database.
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const MAX_PER_DAY = Number(Deno.env.get("AI_DAILY_LIMIT") ?? "40");
const MAX_MESSAGES = 20;
const MAX_CHARS = 6000;
// The project's PUBLIC key (the same one that is in the website's code). Supabase provides it as an
// environment variable; the fallback makes the function work with both the old and the new key system.
const PROJECT_URL = "https://mvonovmjnxkyrmdewnxm.supabase.co";
const PUBLIC_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
  "sb_publishable_I3hWAEvW1rprdth5bIgt9A_Lj_LZMKj";

// CORS: the browser only lets the page read this answer if the server says the page may.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-AI-Used, X-AI-Limit",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type Msg = { role: string; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "The AI tutor is not set up yet (GEMINI_API_KEY is missing)." }, 503);

  // 1. Who is asking? A client that acts AS this user, so auth.uid() works in the database.
  const auth = req.headers.get("Authorization") ?? "";
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? PROJECT_URL, PUBLIC_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
  if (userErr || !userData.user) return json({ error: "Please sign in to use the AI tutor." }, 401);

  // 2. Read and check the question
  let body: { system?: string; messages?: Msg[] };
  try { body = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  const messages = (body.messages ?? []).slice(-MAX_MESSAGES)
    .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content.slice(0, MAX_CHARS) }] }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "empty question" }, 400);
  const system = String(body.system ?? "").slice(0, 8000);

  // 3. Daily limit (counted in the database, see 002_ai_usage.sql)
  const { data: quota, error: qErr } = await db.rpc("use_ai_quota", { max_per_day: MAX_PER_DAY });
  if (qErr) return json({ error: `Usage counter: ${qErr.message}` }, 500);
  const q = Array.isArray(quota) ? quota[0] : quota;
  if (!q?.allowed) {
    return json({ error: `You asked ${MAX_PER_DAY} questions today, the daily limit. The tutor is back tomorrow!`, limit: MAX_PER_DAY }, 429);
  }

  // 4. Ask Gemini and stream the answer straight through to the browser (Server-Sent Events)
  const upstream = await fetch(`${GEMINI_URL}/models/${MODEL}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: messages,
      generationConfig: { maxOutputTokens: 2048 },
    }),
  });
  if (!upstream.ok || !upstream.body) {
    const detail = (await upstream.text()).slice(0, 300);
    const status = upstream.status === 429 ? 429 : 502;
    return json({ error: upstream.status === 429 ? "The AI is busy right now. Try again in a minute." : `AI error ${upstream.status}: ${detail}` }, status);
  }
  return new Response(upstream.body, {
    headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-store", "X-AI-Used": String(q.used), "X-AI-Limit": String(MAX_PER_DAY) },
  });
});
