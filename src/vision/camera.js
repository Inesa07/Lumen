// camera.js: the "eyes" of Lumen, running entirely inside the browser.
//
// Python version: OpenCV read the webcam, MediaPipe FaceMesh + YOLOv8 ran on the CPU.
// Web version:    getUserMedia() gives the webcam, MediaPipe Tasks for Web runs the same kind of
//                 neural networks compiled to WebAssembly (WASM), on the GPU (WebGL) when possible.
//
// Privacy: frames never leave this computer. Only the numbers in each "sample" are used.
//
// Every processed frame becomes one sample: { t, face, ear, mar, yaw, pitch, gx, gy, size, fy,
// smile, lift, brow, gap, bs, phone } — exactly the format the Python SessionTracker expects.

import { faceFeatures, blendshapeFeatures, headAngles, greyStd } from './features.js';

const MP_VERSION = '0.10.14';
const MP_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
// EfficientDet-Lite0 was trained on COCO, the same 80 classes as YOLOv8 -> it knows "cell phone"
const OBJECT_MODEL = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';

const PHONE_EVERY = 5;        // the object detector is slower: every 5th frame (3x a second at 15 fps)
const PHONE_MEMORY = 1.5;     // seconds: the detector misses single frames, so remember a phone a little
const COVER_EVERY = 5;

/**
 * A tiny timer that lives in a Web Worker.
 * Browsers slow down setTimeout / requestAnimationFrame in background tabs (down to once a minute!),
 * but a worker's timer keeps ticking, so tracking continues while you read in another tab.
 */
function workerTicker(fps, onTick) {
  const code = `let id; onmessage = (e) => { clearInterval(id); if (e.data > 0) id = setInterval(() => postMessage(0), e.data); };`;
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  const w = new Worker(url);
  w.onmessage = onTick;
  w.postMessage(Math.round(1000 / fps));
  return () => { w.postMessage(0); w.terminate(); URL.revokeObjectURL(url); };
}

// The models are loaded ONCE per page and kept: starting the next lesson is then instant.
let modelsPromise = null;
function loadModels(withPhone, status) {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const { FilesetResolver, FaceLandmarker, ObjectDetector } = await import(`${MP_URL}/vision_bundle.mjs`);
      const fileset = await FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
      const faceOpts = (delegate) => ({
        baseOptions: { modelAssetPath: FACE_MODEL, delegate },
        runningMode: 'VIDEO', numFaces: 1,
        outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
        minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
      });
      let face, delegate;
      // GPU is much faster; some computers don't support it, then we fall back to the CPU
      try {
        face = await FaceLandmarker.createFromOptions(fileset, faceOpts('GPU'));
        delegate = 'GPU';
      } catch (e) {
        console.warn('GPU not available for the face model, using CPU', e);
        face = await FaceLandmarker.createFromOptions(fileset, faceOpts('CPU'));
        delegate = 'CPU';
      }
      let objects = null;
      if (withPhone) {
        status('Loading the phone detector…');
        try {
          objects = await ObjectDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: OBJECT_MODEL, delegate },
            runningMode: 'VIDEO', scoreThreshold: 0.3, maxResults: 3, categoryAllowlist: ['cell phone'],
          });
        } catch (e) {
          console.warn('Phone detector not available, phone detection is off', e);
        }
      }
      return { face, objects, delegate };
    })();
    modelsPromise.catch(() => { modelsPromise = null; });     // a failed download can be retried
  }
  return modelsPromise;
}

export class CameraVision {
  /**
   * @param {object} o
   * @param {(sample:object)=>void} o.onSample  called for every processed frame
   * @param {(status:object)=>void} [o.onStatus] loading progress / errors, for the UI
   * @param {number} [o.fps=15]
   * @param {boolean} [o.phone=true] run the phone detector
   */
  constructor({ onSample, onStatus = () => {}, fps = 15, phone = true }) {
    Object.assign(this, { onSample, onStatus, fps, usePhone: phone });
    this.video = null;
    this.stream = null;
    this.face = null;
    this.objects = null;
    this.lastLandmarks = null;     // for drawing an overlay
    this.lastPhoneBox = null;
    this.delegate = null;          // "GPU" or "CPU"
    this.fpsMeasured = 0;
  }

  async start(video) {
    this.video = video;
    this.onStatus({ stage: 'camera', text: 'Asking for the camera…' });
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false,
    });
    video.srcObject = this.stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();

    this.onStatus({ stage: 'models', text: 'Loading the face model (~4 MB, once)…' });
    const m = await loadModels(this.usePhone, (text) => this.onStatus({ stage: 'models', text }));
    Object.assign(this, { face: m.face, objects: m.objects, delegate: m.delegate });

    this.small = document.createElement('canvas');      // 64x48 copy for "is the camera covered?"
    this.small.width = 64; this.small.height = 48;
    this.smallCtx = this.small.getContext('2d', { willReadFrequently: true });

    this.t0 = performance.now();
    this.frame = 0;
    this.lastTs = -1;
    this.tsBase = Math.round(performance.now());      // shared models need ever-growing timestamps
    this.phoneSeen = -1e9;
    this.covered = false;
    this.fpsWindow = [];
    this.stopTicker = workerTicker(this.fps, () => this.step());
    this.onStatus({ stage: 'ready', text: `Ready (${this.delegate})`, delegate: this.delegate, phone: !!this.objects });
  }

  step() {
    const v = this.video;
    if (!v || v.readyState < 2 || !this.face) return;
    const nowMs = performance.now();
    let ts = Math.round(nowMs - this.t0);
    if (ts <= this.lastTs) ts = this.lastTs + 1;       // VIDEO mode needs strictly growing timestamps
    this.lastTs = ts;
    const t = ts / 1000;                               // seconds since this lesson started
    const mpTs = this.tsBase + ts;                     // timestamp for MediaPipe (grows across lessons)
    const w = v.videoWidth, h = v.videoHeight;

    let res;
    try {
      res = this.face.detectForVideo(v, mpTs);
    } catch (e) {
      this.onStatus({ stage: 'error', text: `Face model stopped: ${e.message || e}` });
      return;
    }

    if (this.objects && this.frame % PHONE_EVERY === 0) {
      try {
        const det = this.objects.detectForVideo(v, mpTs);
        const hit = det.detections && det.detections[0];
        if (hit) { this.phoneSeen = t; this.lastPhoneBox = hit.boundingBox; } else this.lastPhoneBox = null;
      } catch (e) { console.warn('phone detector error', e); }
    }
    const phone = t - this.phoneSeen < PHONE_MEMORY;

    if (this.frame % COVER_EVERY === 0) {
      this.smallCtx.drawImage(v, 0, 0, 64, 48);
      this.covered = greyStd(this.smallCtx.getImageData(0, 0, 64, 48).data) < 12;
    }

    const sample = { t, face: false, ear: null, mar: null, yaw: null, pitch: null, gx: null, gy: null,
      size: null, fy: null, smile: null, lift: null, brow: null, gap: null, bs: null, phone };
    const lm = res.faceLandmarks && res.faceLandmarks[0];
    this.lastLandmarks = lm && !this.covered ? lm : null;
    if (lm && !this.covered) {
      Object.assign(sample, { face: true }, faceFeatures(lm, w, h));
      const m = res.facialTransformationMatrixes && res.facialTransformationMatrixes[0];
      Object.assign(sample, headAngles(m && m.data));
      const cats = res.faceBlendshapes && res.faceBlendshapes[0] && res.faceBlendshapes[0].categories;
      sample.bs = cats ? blendshapeFeatures(cats) : null;
    }

    this.fpsWindow.push(nowMs);
    while (this.fpsWindow.length && nowMs - this.fpsWindow[0] > 1000) this.fpsWindow.shift();
    this.fpsMeasured = this.fpsWindow.length;
    this.frame += 1;
    this.onSample(sample);
  }

  stop() {
    if (this.stopTicker) this.stopTicker();
    this.stopTicker = null;
    if (this.stream) this.stream.getTracks().forEach((tr) => tr.stop());   // camera light goes off
    if (this.video) this.video.srcObject = null;
    this.face = this.objects = this.stream = null;      // the models stay loaded for the next lesson
  }
}
