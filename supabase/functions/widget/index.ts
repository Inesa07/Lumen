// Supabase Edge Function "widget": the macOS widget asks here for today's summary.
//
//   Mac widget ──(widget key)──▶ widget (this code) ──(service key, server only)──▶ table "widget"
//
// The widget key is a long random secret made in Lumen → Settings → Mac widget. Only its SHA-256
// hash is stored, so the database never contains the key itself. The answer is just the small
// summary the browser saved (no lessons, no notes, no account data).
// Settings: Supabase → Edge Functions → widget → "Verify JWT" OFF (the widget has no login token;
// the key below is the check).
import { createClient } from "npm:@supabase/supabase-js@2";

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
  // The service-role key is provided by Supabase to every Edge Function; it never leaves the server.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin.from("widget").select("summary, updated_at")
    .eq("token_hash", await sha256hex(key)).maybeSingle();
  if (error) return json({ error: "server error" }, 500);
  if (!data) return json({ error: "unknown widget key: connect the widget again in Lumen" }, 404);
  return json({ ...(data.summary ?? {}), updated_at: data.updated_at });
});
