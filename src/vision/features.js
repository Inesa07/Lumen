// features.js: turn MediaPipe's raw output into a few numbers that mean something.
//
// Port of the Python `face_features` / `blendshape_features` (vision.py). Pure functions:
// no camera, no DOM, so they are easy to test.
//
// Landmarks are NORMALISED: x and y go from 0 to 1 across the picture, so we multiply
// by the video width / height to get pixels before measuring distances.

// MediaPipe face-mesh landmark indices (points on the 478-point face mesh)
export const LEFT_EYE = [33, 160, 158, 133, 153, 144];   // p1..p6 for EAR
export const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const MOUTH_V = [13, 14];          // upper / lower inner lip
const MOUTH_H = [78, 308];         // inner mouth corners
export const NOSE_TIP = 1;
const EYE_OUTER_L = 33, EYE_OUTER_R = 263;
const MOUTH_CORNERS = [61, 291];
const LIP_MID = [13, 14];
const BROW_INNER = [107, 336];
const LID_TOP = [159, 386];
// iris centre, eye corner A, eye corner B, upper lid, lower lid
const IRIS = [[468, 33, 133, 159, 145], [473, 362, 263, 386, 374]];

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** EAR (Eye Aspect Ratio) = (|p2-p6| + |p3-p5|) / (2 |p1-p4|). Open ~0.25-0.35, closed ~0.05-0.15. */
export function eyeAspectRatio([p1, p2, p3, p4, p5, p6]) {
  return (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4) + 1e-6);
}

/**
 * Head angles from MediaPipe's 4x4 "facial transformation matrix".
 * The Python version found the rotation itself (Kabsch algorithm + SVD); in the browser
 * FaceLandmarker already gives the rotation, so we only read the angles out of it.
 *
 * The matrix is stored column by column (column-major): element (row r, col c) = data[c*4 + r].
 * For a rotation R = Rz(roll)·Ry(yaw)·Rx(pitch):
 *   pitch = atan2(R21, R22)      yaw = atan2(-R20, sqrt(R21² + R22²))
 * Only CHANGES against your own calm position matter later, so small offsets don't hurt.
 */
export function headAngles(matrixData) {
  if (!matrixData || matrixData.length < 16) return { yaw: null, pitch: null };
  const R = (r, c) => matrixData[c * 4 + r];
  const deg = 180 / Math.PI;
  const pitch = Math.atan2(R(2, 1), R(2, 2)) * deg;
  const yaw = Math.atan2(-R(2, 0), Math.hypot(R(2, 1), R(2, 2))) * deg;
  return { yaw, pitch };
}

/** 478 landmarks -> interpretable numbers (eyes, mouth, gaze, posture, expression geometry). */
export function faceFeatures(lm, w, h) {
  const P = (i) => [lm[i].x * w, lm[i].y * h];
  const ear = (eyeAspectRatio(LEFT_EYE.map(P)) + eyeAspectRatio(RIGHT_EYE.map(P))) / 2;
  const mar = dist(P(MOUTH_V[0]), P(MOUTH_V[1])) / (dist(P(MOUTH_H[0]), P(MOUTH_H[1])) + 1e-6);

  // Eye gaze: the head can stay still while the eyes look away, so we also follow the iris.
  let gx = null, gy = null;
  if (lm.length > 473) {
    const xs = [], ys = [];
    for (const [iris, a, b] of IRIS) {
      const I = P(iris), A = P(a), B = P(b);
      xs.push((I[0] - A[0]) / (B[0] - A[0] + 1e-6));
      // up/down against the eye CORNERS: the eyelids follow the eye when you look down
      ys.push((I[1] - (A[1] + B[1]) / 2) / (Math.abs(B[0] - A[0]) + 1e-6));
    }
    gx = (xs[0] + xs[1]) / 2;
    gy = (ys[0] + ys[1]) / 2;
  }
  // posture: face size (closer = bigger) and how high the face is in the picture
  const eyeD = dist(P(EYE_OUTER_L), P(EYE_OUTER_R)) + 1e-6;
  const size = eyeD / w;
  const fy = P(NOSE_TIP)[1] / h;

  // geometric expression measures (backup when blendshapes are missing), divided by eye distance
  const cl = P(MOUTH_CORNERS[0]), cr = P(MOUTH_CORNERS[1]);
  const smile = dist(cl, cr) / eyeD;
  const lipY = (P(LIP_MID[0])[1] + P(LIP_MID[1])[1]) / 2;
  const lift = (lipY - (cl[1] + cr[1]) / 2) / eyeD;
  const bl = P(BROW_INNER[0]), br = P(BROW_INNER[1]);
  const brow = ((P(LID_TOP[0])[1] - bl[1]) + (P(LID_TOP[1])[1] - br[1])) / 2 / eyeD;
  const gap = dist(bl, br) / eyeD;
  return { ear, mar, gx, gy, size, fy, smile, lift, brow, gap };
}

/** 52 blendshape scores (0..1) -> the few that tell the expression. */
export function blendshapeFeatures(categories) {
  const b = {};
  for (const c of categories || []) b[c.categoryName] = c.score;
  const avg = (a, z) => ((b[a] || 0) + (b[z] || 0)) / 2;
  return {
    smile: avg('mouthSmileLeft', 'mouthSmileRight'),
    frown: avg('mouthFrownLeft', 'mouthFrownRight'),
    brow_down: avg('browDownLeft', 'browDownRight'),
    brow_up: b.browInnerUp || 0,
    eye_wide: avg('eyeWideLeft', 'eyeWideRight'),
    jaw: b.jawOpen || 0,
    cheek: avg('cheekSquintLeft', 'cheekSquintRight'),
  };
}

/** Standard deviation of a grey image: a covered camera gives an almost uniform picture. */
export function greyStd(rgba) {
  let sum = 0, sum2 = 0;
  const n = rgba.length / 4;
  for (let i = 0; i < rgba.length; i += 4) {
    const g = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    sum += g; sum2 += g * g;
  }
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sum2 / n - mean * mean));
}

/**
 * How much detail ("edges") a small grey picture has: the average brightness jump between
 * neighbouring pixels. A real room is full of edges; a hand right in front of the lens is
 * out of focus and smooth, so its value is tiny even when its colours are not uniform.
 * @param {Uint8ClampedArray} rgba image data, w*h*4
 */
export function edgeEnergy(rgba, w, h) {
  const g = new Float32Array(w * h);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 1) g[j] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  let sum = 0, n = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const k = y * w + x;
      if (x + 1 < w) { sum += Math.abs(g[k + 1] - g[k]); n += 1; }
      if (y + 1 < h) { sum += Math.abs(g[k + w] - g[k]); n += 1; }
    }
  }
  return n ? sum / n : 0;
}
