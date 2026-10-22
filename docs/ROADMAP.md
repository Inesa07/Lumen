# Roadmap

## Architecture

```
Browser (everything heavy happens here)            Supabase (later)
┌───────────────────────────────────────┐         ┌──────────────────────────┐
│ camera → MediaPipe (WASM/GPU)          │         │ Auth: email, Google       │
│ → features → tracker (focus, mood…)    │  JSON   │ PostgreSQL: sessions,    │
│ → UI pages                             │ ──────▶ │ classes, todos, notes,   │
│ local storage (guest mode)             │         │ reviews, chats           │
│                                        │         │ Edge Function: AI tutor  │
└───────────────────────────────────────┘         └──────────────────────────┘
        video never leaves the browser               Row Level Security:
                                                     every user sees only their rows
```

## Steps

1. **Camera lab** — prove that face, gaze, head pose, phone and expressions work in the browser. ✅
2. **Everything in the browser** — tracker, stats, reviews, accuracy check, AI tutor and all pages; data in IndexedDB (guest mode); export / import; a running lesson survives a closed tab. ✅
3. **Accounts** — Supabase project, tables + Row Level Security, sign up / sign in / password reset, guest data
   moves into the account after sign-up, offline-first sync. ✅ (Google sign-in: needs a Google OAuth client.)
4. **Sync** — the same data layer with a Supabase adapter: your lessons on every device.
5. **AI tutor** — Gemini through a Supabase Edge Function so the API key is never in the browser; daily limits per user.
6. **Publish** — GitHub Pages or Vercel; a custom domain later.
7. **Quality** — privacy policy (children!), parental consent, tests on Chrome / Safari / Edge and slow laptops.

## Later

- Own backend (Node.js + PostgreSQL) as a learning project, replacing Supabase step by step.
- PWA: install as an app, offline mode.
- New name.
