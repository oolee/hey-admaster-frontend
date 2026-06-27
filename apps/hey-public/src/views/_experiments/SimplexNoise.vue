<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';

// ===== Simplex 2D =====
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const grad3: [number, number][] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
// oxlint-disable typescript/no-non-null-assertion
function permute(seed: number): Uint8Array {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16_807) % 2_147_483_647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j]!, p[i]!];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i % 256]!;
  return perm;
}

function dot2(g: [number, number], x: number, y: number): number {
  return g[0] * x + g[1] * y;
}

function simplex2D(perm: Uint8Array, xin: number, yin: number): number {
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = xin - X0;
  const y0 = yin - Y0;
  const [i1, j1] = x0 > y0 ? [1, 0] : [0, 1];
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  const ii = i & 255;
  const jj = j & 255;

  let n0 = 0;
  let n1 = 0;
  let n2 = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    t0 *= t0;
    n0 = t0 * t0 * dot2(grad3[perm[ii + perm[jj]!]! % 8]!, x0, y0);
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    t1 *= t1;
    n1 = t1 * t1 * dot2(grad3[perm[ii + i1 + perm[jj + j1]!]! % 8]!, x1, y1);
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    t2 *= t2;
    n2 = t2 * t2 * dot2(grad3[perm[ii + 1 + perm[jj + 1]!]! % 8]!, x2, y2);
  }
  return 70 * (n0 + n1 + n2);
}

function fbm(
  perm: Uint8Array,
  x: number,
  y: number,
  octaves: number,
  lacunarity: number,
  persistence: number,
): number {
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  let value = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * simplex2D(perm, x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / maxValue;
}

// ===== Color Schemes =====
interface Stop {
  pos: number;
  r: number;
  g: number;
  b: number;
}
const SCHEMES: Record<string, { name: string; stops: Stop[] }> = {
  grayscale: {
    name: '灰度',
    stops: [
      { pos: 0, r: 0, g: 0, b: 0 },
      { pos: 1, r: 255, g: 255, b: 255 },
    ],
  },
  terrain: {
    name: '地形',
    stops: [
      { pos: 0, r: 10, g: 25, b: 80 },
      { pos: 0.3, r: 30, g: 60, b: 140 },
      { pos: 0.45, r: 200, g: 190, b: 140 },
      { pos: 0.55, r: 60, g: 140, b: 60 },
      { pos: 0.7, r: 100, g: 80, b: 60 },
      { pos: 0.85, r: 160, g: 150, b: 140 },
      { pos: 1, r: 255, g: 255, b: 255 },
    ],
  },
  neon: {
    name: '霓虹',
    stops: [
      { pos: 0, r: 10, g: 0, b: 30 },
      { pos: 0.25, r: 80, g: 0, b: 140 },
      { pos: 0.5, r: 0, g: 200, b: 200 },
      { pos: 0.75, r: 200, g: 0, b: 100 },
      { pos: 1, r: 255, g: 220, b: 0 },
    ],
  },
  fire: {
    name: '火焰',
    stops: [
      { pos: 0, r: 0, g: 0, b: 0 },
      { pos: 0.3, r: 80, g: 0, b: 0 },
      { pos: 0.55, r: 200, g: 40, b: 0 },
      { pos: 0.75, r: 255, g: 160, b: 0 },
      { pos: 1, r: 255, g: 255, b: 200 },
    ],
  },
  ocean: {
    name: '海洋',
    stops: [
      { pos: 0, r: 0, g: 20, b: 60 },
      { pos: 0.3, r: 0, g: 60, b: 140 },
      { pos: 0.5, r: 0, g: 140, b: 200 },
      { pos: 0.7, r: 30, g: 180, b: 220 },
      { pos: 1, r: 200, g: 240, b: 255 },
    ],
  },
  forest: {
    name: '森林',
    stops: [
      { pos: 0, r: 10, g: 30, b: 10 },
      { pos: 0.4, r: 20, g: 80, b: 20 },
      { pos: 0.6, r: 50, g: 140, b: 40 },
      { pos: 0.8, r: 120, g: 180, b: 60 },
      { pos: 1, r: 200, g: 220, b: 160 },
    ],
  },
};

function lerpColor(stops: Stop[], t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  if (c <= stops[0]!.pos) return [stops[0]!.r, stops[0]!.g, stops[0]!.b];
  if (c >= stops[stops.length - 1]!.pos) {
    const l = stops[stops.length - 1]!;
    return [l.r, l.g, l.b];
  }
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1]!.pos < c) i++;
  const a = stops[i]!;
  const b = stops[i + 1]!;
  const f = (c - a.pos) / (b.pos - a.pos);
  return [
    Math.trunc(a.r + (b.r - a.r) * f),
    Math.trunc(a.g + (b.g - a.g) * f),
    Math.trunc(a.b + (b.b - a.b) * f),
  ];
}

// ===== State =====
const params = reactive({
  seed: 42,
  scale: 140,
  octaves: 4,
  persistence: 0.5,
  lacunarity: 2,
  colorScheme: 'terrain',
  animate: false,
  speed: 0.4,
  resolution: 1, // 1=full, 2=half, 3=third
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isPanelOpen = ref(true);
let perm = permute(params.seed);
let animId = 0;
let time = 0;
let lastTime = 0;
let renderPending = false;
const targetResolution = 1;

// ===== Render (optimized) =====
function render() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) return;

  const res = params.animate ? 2 : 1;
  const w = (canvas.width = Math.floor(canvas.clientWidth / res));
  const h = (canvas.height = Math.floor(canvas.clientHeight / res));
  canvas.style.width = `${canvas.clientWidth}px`;
  canvas.style.height = `${canvas.clientHeight}px`;

  const img = ctx.createImageData(w, h);
  const d = img.data;
  const stops = SCHEMES[params.colorScheme]!.stops;
  const scale = params.scale * res;
  const oct = params.octaves;
  const lac = params.lacunarity;
  const per = params.persistence;
  const t = time;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      let nx = px / scale;
      let ny = py / scale;
      if (params.animate) {
        nx += t * params.speed;
        ny += t * params.speed * 0.7;
      }
      let v = fbm(perm, nx, ny, oct, lac, per);
      v = (v + 1) * 0.5;
      const [r, g, b] = lerpColor(stops, v);
      const idx = (py * w + px) * 4;
      d[idx] = r;
      d[idx + 1] = g;
      d[idx + 2] = b;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  renderPending = false;
}

function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => render());
}

// ===== Animation loop (throttled to ~15fps) =====
let frameSkip = 0;
function animate(ts: number) {
  if (lastTime === 0) lastTime = ts;
  frameSkip++;
  if (frameSkip >= 4) {
    frameSkip = 0;
    time += (ts - lastTime) * 0.001;
    lastTime = ts;
    render();
  }
  animId = requestAnimationFrame(animate);
}

// ===== Watchers =====
watch(
  () => params.seed,
  (v) => {
    perm = permute(v);
    scheduleRender();
  },
);
watch(
  () => [
    params.scale,
    params.octaves,
    params.persistence,
    params.lacunarity,
    params.colorScheme,
  ],
  () => {
    if (!params.animate) scheduleRender();
  },
);

watch(
  () => params.animate,
  (v) => {
    if (v) {
      lastTime = 0;
      frameSkip = 0;
      animId = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animId);
      scheduleRender();
    }
  },
);

onMounted(() => {
  scheduleRender();
  window.addEventListener('resize', scheduleRender);
});
onUnmounted(() => {
  cancelAnimationFrame(animId);
  window.removeEventListener('resize', scheduleRender);
});

// ===== Export =====
function exportPNG() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `simplex-noise-${params.scale}-${params.octaves}o-${params.seed}.png`;
  link.href = canvas.toDataURL();
  link.click();
}

// ===== Presets =====
const presets = [
  {
    label: '云层',
    scale: 200,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    scheme: 'grayscale',
  },
  {
    label: '山脉',
    scale: 300,
    octaves: 6,
    persistence: 0.55,
    lacunarity: 2.2,
    scheme: 'terrain',
  },
  {
    label: '等离子',
    scale: 80,
    octaves: 3,
    persistence: 0.6,
    lacunarity: 2.5,
    scheme: 'neon',
  },
  {
    label: '熔岩',
    scale: 100,
    octaves: 5,
    persistence: 0.65,
    lacunarity: 2,
    scheme: 'fire',
  },
  {
    label: '深海',
    scale: 250,
    octaves: 4,
    persistence: 0.45,
    lacunarity: 2.1,
    scheme: 'ocean',
  },
  {
    label: '林冠',
    scale: 180,
    octaves: 5,
    persistence: 0.5,
    lacunarity: 2.3,
    scheme: 'forest',
  },
];

function applyPreset(p: (typeof presets)[number]) {
  params.scale = p.scale;
  params.octaves = p.octaves;
  params.persistence = p.persistence;
  params.lacunarity = p.lacunarity;
  params.colorScheme = p.scheme;
}

function randomSeed() {
  params.seed = Math.floor(Math.random() * 100_000);
}
</script>

<template>
  <div class="sn-page">
    <canvas ref="canvasRef" class="sn-canvas"></canvas>

    <!-- 设计器面板 -->
    <div class="sn-panel" :class="{ collapsed: !isPanelOpen }">
      <button class="panel-toggle" @click="isPanelOpen = !isPanelOpen">
        {{ isPanelOpen ? '收起' : '展开' }}
      </button>

      <div v-show="isPanelOpen" class="panel-body">
        <h3 class="panel-title">Simplex 噪声设计器</h3>

        <!-- 预设 -->
        <div class="panel-section">
          <label class="panel-label">预设方案</label>
          <div class="preset-grid">
            <button
              v-for="p in presets"
              :key="p.label"
              class="preset-btn"
              @click="applyPreset(p)"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- 种子 -->
        <div class="panel-section">
          <label class="panel-label">随机种子</label>
          <div class="input-row">
            <input
              v-model.number="params.seed"
              type="number"
              class="panel-input"
              min="0"
              max="99999"
            />
            <button class="panel-btn" @click="randomSeed">随机</button>
          </div>
        </div>

        <!-- 缩放 -->
        <div class="panel-section">
          <label class="panel-label">
            缩放 <span class="param-value">{{ params.scale }}</span>
          </label>
          <input
            v-model.number="params.scale"
            type="range"
            class="panel-range"
            min="20"
            max="500"
            step="5"
          />
        </div>

        <!-- 叠加层数 -->
        <div class="panel-section">
          <label class="panel-label">
            叠加层数 <span class="param-value">{{ params.octaves }}</span>
          </label>
          <input
            v-model.number="params.octaves"
            type="range"
            class="panel-range"
            min="1"
            max="8"
            step="1"
          />
        </div>

        <!-- 持续度 -->
        <div class="panel-section">
          <label class="panel-label">
            持续度
            <span class="param-value">{{ params.persistence.toFixed(2) }}</span>
          </label>
          <input
            v-model.number="params.persistence"
            type="range"
            class="panel-range"
            min="0.1"
            max="1.0"
            step="0.01"
          />
        </div>

        <!-- 间隙度 -->
        <div class="panel-section">
          <label class="panel-label">
            间隙度
            <span class="param-value">{{ params.lacunarity.toFixed(1) }}</span>
          </label>
          <input
            v-model.number="params.lacunarity"
            type="range"
            class="panel-range"
            min="1.0"
            max="4.0"
            step="0.1"
          />
        </div>

        <!-- 配色方案 -->
        <div class="panel-section">
          <label class="panel-label">配色方案</label>
          <div class="scheme-grid">
            <button
              v-for="(s, key) in SCHEMES"
              :key="key"
              class="scheme-btn"
              :class="{ active: params.colorScheme === key }"
              @click="params.colorScheme = key"
            >
              <span
                class="scheme-swatch"
                :style="{
                  background: `linear-gradient(90deg, ${s.stops.map((st) => `rgb(${st.r},${st.g},${st.b})`).join(',')})`,
                }"
              ></span>
              <span class="scheme-name">{{ s.name }}</span>
            </button>
          </div>
        </div>

        <!-- 动画 -->
        <div class="panel-section">
          <label class="panel-label panel-label-row">
            <span>动态流动</span>
            <label class="toggle-switch">
              <input v-model="params.animate" type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </label>
          <div v-if="params.animate" class="param-sub">
            <label class="panel-label">
              流动速度
              <span class="param-value">{{ params.speed.toFixed(1) }}</span>
            </label>
            <input
              v-model.number="params.speed"
              type="range"
              class="panel-range"
              min="0.05"
              max="2.0"
              step="0.05"
            />
          </div>
        </div>

        <!-- 导出 -->
        <div class="panel-section">
          <button class="export-btn" @click="exportPNG">导出 PNG</button>
        </div>
      </div>
    </div>

    <!-- 左下角信息 -->
    <div class="sn-info">
      <span>Simplex Noise</span>
      <span class="sn-info-sep">·</span>
      <span>{{ SCHEMES[params.colorScheme]?.name }}</span>
      <span class="sn-info-sep">·</span>
      <span>缩放 {{ params.scale }}</span>
      <span class="sn-info-sep">·</span>
      <span>{{ params.octaves }} 层</span>
    </div>
  </div>
</template>

<style scoped>
.sn-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #0a0a0f;
}

.sn-canvas {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}

/* ===== 设计器面板 ===== */
.sn-panel {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10;
  width: 260px;
  max-height: calc(100vh - 32px);
  overflow: hidden;
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: rgb(15 15 25 / 92%);
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 12px;
  backdrop-filter: blur(16px);
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.sn-panel.collapsed {
  width: 56px;
}

.panel-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  padding: 4px 10px;
  font-size: 11px;
  color: #808090;
  white-space: nowrap;
  cursor: pointer;
  background: rgb(255 255 255 / 6%);
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 6px;
  transition: all 0.25s ease;
}

.panel-toggle:hover {
  color: #c0c0d0;
  background: rgb(255 255 255 / 12%);
}

.panel-body {
  max-height: calc(100vh - 80px);
  padding: 14px;
  padding-top: 40px;
  overflow-y: auto;
}

.panel-body::-webkit-scrollbar {
  width: 3px;
}

.panel-body::-webkit-scrollbar-thumb {
  background: rgb(255 255 255 / 10%);
  border-radius: 2px;
}

.panel-title {
  margin-bottom: 14px;
  font-size: 12px;
  font-weight: 600;
  color: #c0c0d0;
  letter-spacing: 0.04em;
}

.panel-section {
  margin-bottom: 12px;
}

.panel-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 10px;
  font-weight: 500;
  color: #707080;
  letter-spacing: 0.04em;
}

.panel-label-row {
  flex-direction: row;
}

.param-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #9090b0;
}

/* ===== 预设 ===== */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.preset-btn {
  padding: 5px 4px;
  font-size: 10px;
  font-weight: 500;
  color: #808090;
  text-align: center;
  cursor: pointer;
  background: rgb(255 255 255 / 4%);
  border: 1px solid rgb(255 255 255 / 6%);
  border-radius: 6px;
  transition: all 0.25s ease;
}

.preset-btn:hover {
  color: #c0c0d0;
  background: rgb(255 255 255 / 10%);
  border-color: rgb(255 255 255 / 15%);
}

/* ===== 输入 ===== */
.input-row {
  display: flex;
  gap: 6px;
}

.panel-input {
  flex: 1;
  padding: 5px 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #c0c0d0;
  outline: none;
  background: rgb(255 255 255 / 4%);
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 6px;
  transition: border-color 0.25s ease;
}

.panel-input:focus {
  border-color: rgb(255 255 255 / 20%);
}

.panel-btn {
  padding: 5px 10px;
  font-size: 10px;
  font-weight: 500;
  color: #808090;
  white-space: nowrap;
  cursor: pointer;
  background: rgb(255 255 255 / 6%);
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 6px;
  transition: all 0.25s ease;
}

.panel-btn:hover {
  color: #c0c0d0;
  background: rgb(255 255 255 / 12%);
}

.panel-range {
  width: 100%;
  height: 4px;
  appearance: none;
  cursor: pointer;
  outline: none;
  background: rgb(255 255 255 / 8%);
  border-radius: 2px;
  transition: background 0.25s ease;
}

.panel-range::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  appearance: none;
  cursor: pointer;
  background: #6060a0;
  border-radius: 50%;
  box-shadow: 0 0 8px rgb(96 96 160 / 30%);
  transition: background 0.25s ease;
}

.panel-range::-webkit-slider-thumb:hover {
  background: #8080c0;
  box-shadow: 0 0 12px rgb(128 128 192 / 40%);
}

/* ===== 配色方案 ===== */
.scheme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.scheme-btn {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 5px;
  cursor: pointer;
  background: rgb(255 255 255 / 3%);
  border: 1px solid rgb(255 255 255 / 6%);
  border-radius: 6px;
  transition: all 0.25s ease;
}

.scheme-btn.active {
  background: rgb(120 120 200 / 8%);
  border-color: rgb(120 120 200 / 50%);
}

.scheme-btn:hover {
  background: rgb(255 255 255 / 6%);
}

.scheme-swatch {
  display: block;
  height: 10px;
  border-radius: 3px;
}

.scheme-name {
  font-size: 9px;
  color: #808090;
  text-align: center;
}

.scheme-btn.active .scheme-name {
  color: #a0a0c0;
}

/* ===== 开关 ===== */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
}

.toggle-switch input {
  width: 0;
  height: 0;
  opacity: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  cursor: pointer;
  background: rgb(255 255 255 / 8%);
  border-radius: 9px;
  transition: background 0.3s ease;
}

.toggle-slider::before {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  content: '';
  background: #6060a0;
  border-radius: 50%;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-switch input:checked + .toggle-slider {
  background: rgb(100 100 180 / 30%);
}

.toggle-switch input:checked + .toggle-slider::before {
  background: #8080c0;
  transform: translateX(16px);
}

.param-sub {
  padding-left: 4px;
  margin-top: 8px;
}

/* ===== 导出 ===== */
.export-btn {
  width: 100%;
  padding: 7px;
  font-size: 11px;
  font-weight: 600;
  color: #c0c0d0;
  letter-spacing: 0.03em;
  cursor: pointer;
  background: rgb(100 100 180 / 12%);
  border: 1px solid rgb(100 100 180 / 25%);
  border-radius: 8px;
  transition: all 0.25s ease;
}

.export-btn:hover {
  color: #fff;
  background: rgb(100 100 180 / 22%);
  border-color: rgb(100 100 180 / 40%);
}

/* ===== 左下角信息 ===== */
.sn-info {
  position: fixed;
  bottom: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 7px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #606070;
  background: rgb(15 15 25 / 65%);
  border: 1px solid rgb(255 255 255 / 6%);
  border-radius: 8px;
  backdrop-filter: blur(8px);
  transition: opacity 0.5s ease;
}

.sn-info-sep {
  opacity: 0.25;
}
</style>
