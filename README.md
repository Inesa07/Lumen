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
| 2 | Session tracker ported from Python (focus, tiredness, mood, breaks) | ⏳ |
| 3 | Accounts with Supabase (sign up, log in, Google) | ⏳ |
| 4 | All pages: Home, Session, Classes, Review, Stats, Reports, Settings | ⏳ |
| 5 | AI tutor through a server function (key hidden, per-user limits) | ⏳ |
| 6 | Publishing (public link) | ⏳ |
| 7 | Privacy policy, testing on many devices | ⏳ |

See [docs/ROADMAP.md](docs/ROADMAP.md) for details.

## Run it locally

No build step and no `npm install` needed: the browser loads plain JavaScript modules.

```bash
python3 -m http.server 5173
# open http://localhost:5173/lab/
```

The camera only works on `https://` or `http://localhost`.
Add `?fake=1` to the address to test with a simulated student instead of a camera.

## Tests

```bash
node --test
```

## Project structure

```
index.html            landing page
lab/                  camera lab (step 1 test page)
src/vision/
  camera.js           webcam + MediaPipe FaceLandmarker + ObjectDetector -> one "sample" per frame
  features.js         pure maths: eye aspect ratio, head angles, gaze, blendshapes
  fake.js             simulated student for tests
tests/                unit tests (node:test)
docs/                 roadmap and architecture notes
```

## How it works (short)

1. `getUserMedia()` gives the webcam stream to a `<video>` element.
2. **MediaPipe FaceLandmarker** (a neural network, ~4 MB) finds 478 points on the face, 52 expression
   scores ("blendshapes") and the head rotation matrix, ~15 times a second, on the GPU when possible.
3. **EfficientDet-Lite0** (trained on COCO, like YOLO) looks for a `cell phone` 3 times a second.
4. `features.js` turns that into a few numbers (EAR, gaze, yaw, pitch…). The tracker (step 2) compares them with
   *your own* calm baseline to decide focus, tiredness and mood.
5. A timer inside a Web Worker drives the loop, because browsers slow down normal timers in background tabs.
