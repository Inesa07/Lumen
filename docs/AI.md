# The free AI tutor

```
browser ──question + login token──▶ Edge Function "tutor" ──secret GEMINI_API_KEY──▶ Gemini
        ◀─────── answer, streamed word by word (Server-Sent Events) ───────────────┘
```

* The Gemini key is a **secret** of the server (an environment variable). It is never sent to a browser.
* Only signed-in students can ask (the function checks the login token).
* Each student has a **daily limit** (default 40 questions), counted in the table `ai_usage`
  by the database function `use_ai_quota()` (see `supabase/migrations/002_ai_usage.sql`).
* Students may still connect their own Gemini / Claude key in Settings; then their key is used instead.

## Set up (one time)

1. **SQL Editor** → run `supabase/migrations/002_ai_usage.sql`.
2. **Edge Functions → Secrets** → add `GEMINI_API_KEY` = your key from https://aistudio.google.com/apikey
   (optional: `AI_DAILY_LIMIT` = questions per student per day; `GEMINI_MODEL` to force one model, otherwise the newest Flash model is picked automatically).
3. **Edge Functions → Deploy a new function → Via Editor** → name it `tutor` →
   paste `supabase/functions/tutor/index.ts` → **Deploy**.

## Limits to keep in mind

The free Gemini tier has its own limits per key (requests per minute and per day). With many students, the
shared key reaches them sooner: then switch the Google project to a paid plan or lower `AI_DAILY_LIMIT`.
