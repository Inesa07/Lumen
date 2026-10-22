# ◎ Lumen — focus coach in your browser

Lumen helps students study with focus. It watches **attention** (head and eye direction, phone in hand),
**tiredness** (blinks, yawns, slow eye closures) and **mood** (facial expressions) through the webcam,
suggests breaks at the right moment, and turns confusing moments into **flashcards** for spaced repetition.

> 🔒 **Privacy first:** the camera is processed **on your own computer**, inside the browser
> (MediaPipe + WebAssembly). Video and photos are never uploaded. Only numbers like
> "45 minutes, 82 % focus" are saved.

This repository is the **web version** of Lumen (the first version was a local Python app).

## Status

| Step | What | State |
|---|---|---|
| 1 | Camera in the browser: face, eyes, head, phone, expressions | ✅ lab page |
| 2 | Tracker, stats, reviews, AI tutor and all pages running in the browser (guest mode, data in IndexedDB) | ✅ |
| 3 | Accounts with Supabase: sign up, sign in, password reset, guest data moves into the account, offline-first sync | ✅ |
| 4 | Google sign-in, polishing sync | ⏳ |
| 5 | Free AI tutor for signed-in students: Supabase Edge Function, secret key on the server, daily limit | ✅ (deploy: docs/AI.md) |
| 6 | Publishing: https://inesa07.github.io/Lumen/ (GitHub Pages) | ✅ |
| 7 | Privacy policy, testing on many devices | ⏳ |

See [docs/ROADMAP.md](docs/ROADMAP.md) for details and [docs/AUTH.md](docs/AUTH.md) for how accounts and security work.

## Run it locally

No build step and no `npm install` needed: the browser loads plain JavaScript modules.

```bash
python3 -m http.server 5173
# the app:         http://localhost:5173/
# the camera lab:  http://localhost:5173/lab/
```

The camera only works on `https://` or `http://localhost`.
Add `?fake=1` to the address to test with a simulated student instead of a camera.

## Tests

```bash
node --test
```

`tests/fixtures/*_golden.json` were produced by the original Python code on the same simulated lesson.
The JavaScript tracker and statistics must give **exactly the same** results.

## Project structure

```
index.html              the app
src/
  main.js               start-up: open the data, start the in-browser server, load the pages
  vision/               camera + MediaPipe -> one "sample" per frame (and a simulated student)
  core/
    tracker.js          the "brain": attention, looking away, tiredness, mood, breaks, the lesson report
    stats.js            numbers for Home, Classes, Statistics, Weekly report
    validate.js         the accuracy check
    ai.js               AI tutor (Gemini / Claude, streaming)
    util.js             helpers that behave exactly like Python (rounding, median, Counter)
  config.js             Supabase address + public key
  data/
    db.js               documents in memory + IndexedDB
    cloud.js            sync with your Supabase account (offline-first, outbox)
    fake-supabase.js    stand-in cloud for tests (?fake=1)
    stores.js           to-dos, sticky notes, chats, review cards
supabase/migrations/    the database schema with Row Level Security
supabase/functions/     server code (Edge Functions): the shared AI tutor
  server/
    local-server.js     the old Python server.py, now running inside the tab (same /api/... paths)
static/                 the pages (HTML/CSS/JS from the first version)
lab/                    camera lab (step 1 test page)
tests/                  unit tests; the tracker and stats are checked against the Python results
docs/                   roadmap and architecture notes
```

## How it works (short)

1. `getUserMedia()` gives the webcam stream to a `<video>` element.
2. **MediaPipe FaceLandmarker** (a neural network, ~4 MB) finds 478 points on the face, 52 expression
   scores ("blendshapes") and the head rotation matrix, ~15 times a second, on the GPU when possible.
3. **EfficientDet-Lite0** (trained on COCO, like YOLO) looks for a `cell phone` 3 times a second.
4. `features.js` turns that into a few numbers (EAR, gaze, yaw, pitch…). The tracker (step 2) compares them with
   *your own* calm baseline to decide focus, tiredness and mood.
5. A timer inside a Web Worker drives the loop, because browsers slow down normal timers in background tabs.
