// Supabase Edge Function "widget": the desktop widget asks here for today's summary.
//
//   widget ──(widget key)──▶ this function ──(public key + hash of the key)──▶ widget_summary() in the database
//
// The widget key is a long random secret made in Lumen → Settings → Mac widget. Only its SHA-256
// hash is stored. The database function returns just the small summary for that exact hash.
// Settings: Supabase → Edge Functions → this function → "Verify JWT" OFF.
import { createClient } from "npm:@supabase/supabase-js@2";

const PROJECT_URL = "https://mvonovmjnxkyrmdewnxm.supabase.co";
const PUBLIC_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
  "sb_publishable_I3hWAEvW1rprdth5bIgt9A_Lj_LZMKj";

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function sha256hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const key = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim() || url.searchParams.get("key") || "";
  if (!/^[A-Za-z0-9_-]{32,}$/.test(key)) return json({ error: "missing or bad widget key" }, 401);
  const db = createClient(PROJECT_URL, PUBLIC_KEY, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("widget_summary", { key_hash: await sha256hex(key) });
  if (error) return json({ error: `server error: ${error.message}` }, 500);
  if (!data) return json({ error: "unknown widget key: connect the widget again in Lumen" }, 404);
  return json(data);
});
