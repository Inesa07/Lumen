// Camera lab: a test page for step 1 of the web version.
// Open with ?fake=1 to use the simulated student instead of a real camera.
import { CameraVision } from '../src/vision/camera.js';
import { FakeVision } from '../src/vision/fake.js';
import { LEFT_EYE, RIGHT_EYE, NOSE_TIP } from '../src/vision/features.js';

const $ = (s) => document.querySelector(s);
const fake = new URLSearchParams(location.search).has('fake');
let vision = null;
let last = null;
let count = 0;
let hiddenAt = null, hiddenCount = 0;

if (!window.isSecureContext) {
  $('#hint').textContent = 'The camera only works on https:// or http://localhost.';
}

const setStatus = ({ stage, text }) => {
  $('#status').textContent = text;
  $('#status').dataset.stage = stage;
};

$('#startBtn').onclick = async () => {
  $('#startBtn').disabled = true;
  const opts = { onSample: (s) => { last = s; count += 1; }, onStatus: setStatus };
  vision = fake ? new FakeVision({ ...opts, speed: 1 }) : new CameraVision(opts);
  try {
    $('#intro').hidden = true;
    $('#live').hidden = false;
    await vision.start($('#video'));
    $('#delegate').textContent = vision.delegate === 'GPU' ? '⚡ GPU' : vision.delegate === 'CPU' ? '🐢 CPU' : '🧪 fake';
    requestAnimationFrame(draw);
  } catch (e) {
    console.error(e);
    try { vision.stop(); } catch { /* nothing to stop */ }
    $('#intro').hidden = false;
    $('#live').hidden = true;
    $('#startBtn').disabled = false;
    setStatus({ stage: 'error', text: 'Could not start' });
    $('#hint').textContent = e.name === 'NotAllowedError'
      ? 'Camera permission was denied. Allow it in the address bar (🔒 / camera icon) and try again.'
      : `Error: ${e.message || e}`;
  }
};

$('#stopBtn').onclick = () => { vision.stop(); location.reload(); };

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = performance.now(); hiddenCount = count; return; }
  if (hiddenAt === null) return;
  const secs = (performance.now() - hiddenAt) / 1000;
  const rate = (count - hiddenCount) / secs;
  $('#bgResult').innerHTML = `Hidden for ${secs.toFixed(0)} s: <b>${rate.toFixed(1)} samples/s</b> `
    + (rate >= 5 ? '✅ tracking kept running' : '⚠️ the browser slowed tracking down in the background');
  hiddenAt = null;
});

const fmt = (v, d = 2) => (v === null || v === undefined ? '–' : Number(v).toFixed(d));

function guessMood(bs) {
  if (!bs) return ['😶', 'no face'];
  if (bs.smile > 0.35) return ['😊', 'happy'];
  if (bs.eye_wide > 0.35 && bs.brow_up > 0.3) return ['😮', 'surprised'];
  if (bs.brow_down > 0.35) return ['😣', 'frowning'];
  if (bs.frown > 0.2 || bs.brow_up > 0.4) return ['😟', 'sad'];
  return ['😌', 'calm'];
}

function draw() {
  if (!vision) return;
  $('#fps').textContent = `${vision.fpsMeasured} fps`;
  const s = last;
  if (s) {
    $('#faceBadge').textContent = s.face ? 'face ✓' : 'no face';
    $('#faceBadge').classList.toggle('ok', s.face);
    $('#phoneBadge').hidden = !s.phone;
    $('#attn').innerHTML = [
      ['Eyes open (EAR)', fmt(s.ear), s.ear !== null && s.ear < 0.18 ? 'closed / blink' : ''],
      ['Mouth (MAR)', fmt(s.mar), s.mar > 0.5 ? 'yawn?' : ''],
      ['Head left/right (yaw°)', fmt(s.yaw, 0), ''],
      ['Head up/down (pitch°)', fmt(s.pitch, 0), ''],
      ['Eyes left/right (gx)', fmt(s.gx), ''],
      ['Eyes up/down (gy)', fmt(s.gy, 3), ''],
      ['Distance (face size)', fmt(s.size, 3), ''],
    ].map(([k, v, note]) => `<dt>${k}</dt><dd>${v}${note ? ` <span class="note">${note}</span>` : ''}</dd>`).join('');
    const [emoji, name] = guessMood(s.bs);
    $('#mood').innerHTML = `${emoji} <span>${name}</span>`;
    const bs = s.bs || {};
    $('#bars').innerHTML = ['smile', 'frown', 'brow_down', 'brow_up', 'eye_wide', 'jaw', 'cheek'].map((k) => `
      <div class="bar"><span>${k}</span><i><b style="width:${Math.round((bs[k] || 0) * 100)}%"></b></i><em>${fmt(bs[k])}</em></div>`).join('');
  }
  drawOverlay();
  requestAnimationFrame(draw);
}

function drawOverlay() {
  const v = $('#video'), c = $('#overlay');
  if (!v.videoWidth) return;
  if (c.width !== v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; }
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  const lm = vision.lastLandmarks;
  if (lm) {
    ctx.fillStyle = '#4CC9B0';
    for (const i of [...LEFT_EYE, ...RIGHT_EYE, NOSE_TIP]) {
      ctx.beginPath(); ctx.arc(lm[i].x * c.width, lm[i].y * c.height, 2, 0, 7); ctx.fill();
    }
    if (lm.length > 473) {
      ctx.fillStyle = '#F2B544';
      for (const i of [468, 473]) { ctx.beginPath(); ctx.arc(lm[i].x * c.width, lm[i].y * c.height, 3.5, 0, 7); ctx.fill(); }
    }
  }
  const box = vision.lastPhoneBox;
  if (box && last && last.phone) {
    ctx.strokeStyle = '#FF8A70'; ctx.lineWidth = 3;
    ctx.strokeRect(box.originX, box.originY, box.width, box.height);
  }
}
