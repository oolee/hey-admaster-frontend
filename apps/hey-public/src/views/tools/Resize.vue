<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// ================ Types ================
type ResizeMode = 'manual' | 'percent' | 'preset';

interface ImageInfo {
  name: string;
  format: string;
  width: number;
  height: number;
  sizeKB: number;
  url: string;
  element: HTMLImageElement;
}

interface PresetSize {
  key: string;
  name: string;
  w: number;
  h: number;
  desc: string;
}

// ================ Config ================
const PRESETS: PresetSize[] = [
  {
    key: 'avatar',
    name: '社交头像',
    w: 400,
    h: 400,
    desc: '微信 / QQ / WeChat',
  },
  {
    key: 'cover',
    name: '公众号封面',
    w: 900,
    h: 500,
    desc: '900 × 500 通用文章封面',
  },
  { key: 'xhs', name: '小红书竖图', w: 1242, h: 1660, desc: '3 : 4 黄金比例' },
  {
    key: 'pyq',
    name: '朋友圈 9 图',
    w: 1080,
    h: 1080,
    desc: '1 : 1 正方形排版',
  },
  {
    key: 'taobao',
    name: '电商主图',
    w: 800,
    h: 800,
    desc: '淘宝 / 京东 / 拼多多',
  },
  {
    key: 'banner',
    name: '横幅 Banner',
    w: 1920,
    h: 600,
    desc: '网页首屏通用横幅',
  },
];

// ================ State ================
const originalImage = ref<ImageInfo | null>(null);
const resizeMode = ref<ResizeMode>('manual');
const lockRatio = ref(true);
const presetKey = ref<string>('avatar');
const newWidth = ref<number>(0);
const newHeight = ref<number>(0);
const scalePercent = ref<number>(100);

const resizedUrl = ref<string>('');
const resizedBlob = ref<Blob | null>(null);
const resizedKB = ref<number>(0);
const isProcessing = ref(false);
const copied = ref(false);

const fileInput = ref<HTMLInputElement | null>(null);
const dragOver = ref(false);

// ================ Computed ================
const originalRatio = computed(() => {
  if (!originalImage.value) return 1;
  return originalImage.value.width / originalImage.value.height;
});
const formattedOriginalSize = computed(() => {
  if (!originalImage.value) return '0 KB';
  return formatSize(originalImage.value.sizeKB);
});
const formattedResizedSize = computed(() => formatSize(resizedKB.value));
const sizeDeltaKB = computed(() =>
  Math.round(resizedKB.value - (originalImage.value?.sizeKB ?? 0)),
);
const sizeDeltaPct = computed(() => {
  if (!originalImage.value || originalImage.value.sizeKB === 0) return 0;
  return Math.round(
    ((resizedKB.value - originalImage.value.sizeKB) /
      originalImage.value.sizeKB) *
      100,
  );
});
const pixelDeltaPct = computed(() => {
  if (!originalImage.value) return 0;
  const orig = originalImage.value.width * originalImage.value.height;
  const nw =
    orig === 0
      ? 0
      : Math.round(100 - ((newWidth.value * newHeight.value) / orig) * 100);
  return nw;
});
const isResized = computed(() => !!resizedUrl.value && !isProcessing.value);

// ================ Helpers ================
function formatSize(kb: number): string {
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 2 : kb < 100 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
function clampInt(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, Math.round(v)));
}
function revokeUrl(s?: string) {
  if (s && s.startsWith('blob:')) URL.revokeObjectURL(s);
}

// ================ File Handlers ================
function triggerSelect() {
  fileInput.value?.click();
}
function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) handleFile(f);
  // reset so same file can be re-selected
  (e.target as HTMLInputElement).value = '';
}
function onDrop(e: DragEvent) {
  dragOver.value = false;
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (f && f.type.startsWith('image/')) handleFile(f);
}
async function handleFile(file: File) {
  if (!file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
  });
  const fmt = (file.name.split('.').pop() || 'jpeg').toLowerCase();
  resetAll(false);
  const info: ImageInfo = {
    name: file.name,
    format: fmt === 'jpg' ? 'jpeg' : fmt,
    width: img.naturalWidth,
    height: img.naturalHeight,
    sizeKB: file.size / 1024,
    url,
    element: img,
  };
  originalImage.value = info;
  newWidth.value = info.width;
  newHeight.value = info.height;
  scalePercent.value = 100;
   
  doResize().catch(console.error);
}
function resetAll(full = true) {
  revokeUrl(resizedUrl.value);
  if (full && originalImage.value) revokeUrl(originalImage.value.url);
  if (full) originalImage.value = null;
  resizedUrl.value = '';
  resizedBlob.value = null;
  resizedKB.value = 0;
}

// ================ Resize Logic ================
function onWidthInput(e: Event) {
  const v = Number.parseInt((e.target as HTMLInputElement).value, 10);
  if (Number.isNaN(v)) return;
  newWidth.value = clampInt(v, 1, 10_000);
  if (lockRatio.value && originalImage.value) {
    newHeight.value = clampInt(
      Math.round(newWidth.value / originalRatio.value),
      1,
      10_000,
    );
  }
  if (resizeMode.value === 'manual') syncPercentFromSize();
}
function onHeightInput(e: Event) {
  const v = Number.parseInt((e.target as HTMLInputElement).value, 10);
  if (Number.isNaN(v)) return;
  newHeight.value = clampInt(v, 1, 10_000);
  if (lockRatio.value && originalImage.value) {
    newWidth.value = clampInt(
      Math.round(newHeight.value * originalRatio.value),
      1,
      10_000,
    );
  }
  if (resizeMode.value === 'manual') syncPercentFromSize();
}
function syncPercentFromSize() {
  if (!originalImage.value) return;
  scalePercent.value = Math.max(
    1,
    Math.min(
      400,
      Math.round((newWidth.value / originalImage.value.width) * 100),
    ),
  );
}
function applyPercent() {
  if (!originalImage.value) return;
  newWidth.value = clampInt(
    Math.round((originalImage.value.width * scalePercent.value) / 100),
    1,
    10_000,
  );
  newHeight.value = clampInt(
    Math.round((originalImage.value.height * scalePercent.value) / 100),
    1,
    10_000,
  );
}
function applyPreset(key: string) {
  presetKey.value = key;
  const p = PRESETS.find((x) => x.key === key);
  if (!p) return;
  newWidth.value = p.w;
  newHeight.value = p.h;
  syncPercentFromSize();
}
function toggleLock() {
  lockRatio.value = !lockRatio.value;
}

let resizeTimer: number | undefined;
watch([newWidth, newHeight], () => {
  if (resizeMode.value === 'percent') return; // avoid double-fire: percent watcher handles it
  if (resizeTimer) window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => doResize(), 120);
});
watch(scalePercent, () => {
  if (resizeMode.value !== 'percent') return;
  applyPercent();
  if (resizeTimer) window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => doResize(), 120);
});
watch(presetKey, () => {
  if (resizeMode.value !== 'preset') return;
  applyPreset(presetKey.value);
});
watch(resizeMode, () => {
  if (!originalImage.value) return;
  if (resizeMode.value === 'percent') applyPercent();
  else if (resizeMode.value === 'preset') applyPreset(presetKey.value);
  if (resizeTimer) window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => doResize(), 120);
});

async function doResize() {
  if (!originalImage.value) return;
  isProcessing.value = true;
  await new Promise((r) => setTimeout(r, 20));
  try {
    const w = newWidth.value || 1;
    const h = newHeight.value || 1;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(originalImage.value.element, 0, 0, w, h);
    const mime =
      originalImage.value.format === 'png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), mime, 0.94),
    );
    revokeUrl(resizedUrl.value);
    if (!blob) return;
    resizedBlob.value = blob;
    resizedKB.value = blob.size / 1024;
    resizedUrl.value = URL.createObjectURL(blob);
  } finally {
    isProcessing.value = false;
  }
}

// ================ Output ================
function downloadResized() {
  if (!resizedBlob.value || !originalImage.value) return;
  const a = document.createElement('a');
  const ext = originalImage.value.format === 'png' ? 'png' : 'jpg';
  const base = originalImage.value.name.replace(/\.[^.]+$/, '');
  a.href = resizedUrl.value;
  a.download = `${base}_${newWidth.value}x${newHeight.value}.${ext}`;
  document.body.append(a);
  a.click();
  a.remove();
}
async function copySize() {
  const text = `${newWidth.value} × ${newHeight.value}`;
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    /* ignore */
  }
}

onBeforeUnmount(() => resetAll(true));
 
router;
</script>

<template>
  <div class="tool-page">
    <input
      ref="fileInput"
      class="hidden-input"
      type="file"
      accept="image/*"
      @change="onFileChange"
    />

    <!-- ========= Topbar (sticky) ========= -->
    <header class="topbar">
      <div class="topbar-inner container-custom">
        <RouterLink to="/tools" class="topbar-back" title="返回工具箱">
          <span>返回工具箱</span>
        </RouterLink>
        <div class="topbar-title">
          <h1>图片尺寸调整</h1>
          <p>本地处理 · 浏览器端极速缩放 · 精确到像素 · 支持锁定比例与预设</p>
        </div>
        <span class="pill-format">精确像素 · 预设尺寸 · 比例锁定</span>
      </div>
    </header>

    <!-- ========= Workspace ========= -->
    <main class="tool-workspace container-custom">
      <!-- Upload / Workspace Switch -->
      <div v-if="!originalImage" class="upload-shell">
        <div
          class="upload-dropzone glass-card"
          :class="{ 'drag-over': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop="onDrop"
          @click="triggerSelect"
        >
          <div class="upload-main">
            <div class="upload-icon">
              <svg
                viewBox="0 0 24 24"
                width="56"
                height="56"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h2 class="upload-title">拖拽图片到此 或 点击选择文件</h2>
            <p class="upload-hint">
              支持 JPG / PNG / WebP / BMP 等格式 ·
              完全浏览器本地处理不上传服务器
            </p>
            <button type="button" class="btn-pick" @click.stop="triggerSelect">
              选择图片
            </button>
          </div>
          <div class="upload-actions-preview">
            <span class="feat">锁定宽高比例</span>
            <span class="feat">像素级精确</span>
            <span class="feat">场景预设尺寸</span>
            <span class="feat">百分比缩放</span>
          </div>
        </div>
      </div>

      <!-- ========= Work Area ========= -->
      <template v-else>
        <!-- ====== 卡片 1: 设置 ====== -->
        <section class="glass-card card-settings">
          <div class="mode-tabs">
            <button
              class="mode-tab"
              :class="{ active: resizeMode === 'manual' }"
              @click="resizeMode = 'manual'"
            >
              <span>手动尺寸 (W × H)</span>
            </button>
            <button
              class="mode-tab"
              :class="{ active: resizeMode === 'preset' }"
              @click="resizeMode = 'preset'"
            >
              <span>场景预设</span>
            </button>
            <button
              class="mode-tab"
              :class="{ active: resizeMode === 'percent' }"
              @click="resizeMode = 'percent'"
            >
              <span>百分比缩放</span>
            </button>
          </div>

          <!-- Manual -->
          <div v-if="resizeMode === 'manual'" class="set-body">
            <div class="manual-row">
              <div class="wh-field">
                <label>宽度 (px)</label>
                <input
                  type="number"
                  :value="newWidth"
                  min="1"
                  max="10000"
                  @input="onWidthInput"
                />
              </div>
              <button
                class="btn-lock"
                :class="{ on: lockRatio }"
                @click="toggleLock"
                :title="lockRatio ? '解锁比例' : '锁定比例'"
              >
                <svg
                  v-if="lockRatio"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
              </button>
              <div class="wh-field">
                <label>高度 (px)</label>
                <input
                  type="number"
                  :value="newHeight"
                  min="1"
                  max="10000"
                  @input="onHeightInput"
                />
              </div>
              <button class="btn-copy" @click="copySize">
                {{ copied ? '已复制' : '复制尺寸' }}
              </button>
            </div>
            <div class="ratio-hint">
              原始比例 {{ originalRatio.toFixed(3) }}（{{
                originalImage.width
              }}
              × {{ originalImage.height }}） ·
              锁定比例后修改一边，另一边自动同步
            </div>
          </div>

          <!-- Preset -->
          <div v-else-if="resizeMode === 'preset'" class="set-body">
            <div class="preset-grid">
              <button
                v-for="p in PRESETS"
                :key="p.key"
                class="preset-card"
                :class="{ active: presetKey === p.key }"
                @click="applyPreset(p.key)"
              >
                <div class="pc-name">{{ p.name }}</div>
                <div class="pc-size">{{ p.w }} × {{ p.h }}</div>
                <div class="pc-desc">{{ p.desc }}</div>
              </button>
            </div>
          </div>

          <!-- Percent -->
          <div v-else class="set-body">
            <div class="scale-row">
              <span class="scale-val">{{ scalePercent }}%</span>
              <input
                class="scale-range"
                type="range"
                min="1"
                max="400"
                step="1"
                v-model.number="scalePercent"
              />
            </div>
            <div class="scale-stops">
              <button @click="scalePercent = 10">10%</button>
              <button @click="scalePercent = 25">25%</button>
              <button @click="scalePercent = 50">50%</button>
              <button @click="scalePercent = 75">75%</button>
              <button @click="scalePercent = 100">100%</button>
              <button @click="scalePercent = 150">150%</button>
              <button @click="scalePercent = 200">200%</button>
              <button @click="scalePercent = 400">400%</button>
            </div>
            <div class="ratio-hint mt">
              结果尺寸：{{ newWidth }} × {{ newHeight }} px
            </div>
          </div>
        </section>

        <!-- ====== 卡片 2: 文件信息 ====== -->
        <section class="glass-card card-info">
          <div class="info-left">
            <div class="info-text">
              <span class="info-name" :title="originalImage.name">{{
                originalImage.name
              }}</span>
              <div class="info-sub">
                <span class="chip"
                  >{{ originalImage.width }} × {{ originalImage.height }}</span
                >
                <span class="chip chip-muted">{{
                  originalImage.format.toUpperCase()
                }}</span>
                <span class="chip chip-muted">{{ formattedOriginalSize }}</span>
              </div>
            </div>
          </div>
          <div class="info-right">
            <button class="btn-ghost" @click="resetAll(true)">
              重新选择图片
            </button>
          </div>
        </section>

        <!-- ====== 卡片 3: 对比预览 ====== -->
        <section class="glass-card card-compare">
          <div class="compare-header">
            <div class="compare-left-title">
              <span class="vs-chip vs-chip-o"
                >原图 · {{ originalImage.width }} ×
                {{ originalImage.height }}</span
              >
            </div>
            <div class="compare-right-title">
              <span class="vs-chip vs-chip-c"
                >新尺寸 · {{ newWidth }} × {{ newHeight }}</span
              >
            </div>
          </div>
          <div class="compare-stage">
            <div class="split-wrap">
              <div class="split-col">
                <div class="sp-label sp-label-o">原尺寸</div>
                <div class="img-box">
                  <img :src="originalImage.url" alt="原图" draggable="false" />
                </div>
              </div>
              <div class="split-col">
                <div class="sp-label sp-label-c">新尺寸</div>
                <div class="img-box">
                  <img
                    v-if="isResized"
                    :src="resizedUrl"
                    alt="Resize结果"
                    draggable="false"
                  />
                  <div v-else class="placeholder-tiny">生成中...</div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="isProcessing" class="processing-overlay">
            <div class="spinner"></div>
            <span>尺寸处理中...</span>
          </div>
        </section>

        <!-- ====== 卡片 4: 统计 & 下载 ====== -->
        <section class="glass-card card-stats">
          <div class="stats-grid">
            <div class="stat-box">
              <div class="st-label">原始像素</div>
              <div class="st-val">
                {{ originalImage.width }} × {{ originalImage.height }}
              </div>
              <div class="st-sub">{{ formattedOriginalSize }}</div>
            </div>
            <div class="stat-box stat-compressed">
              <div class="st-label">新尺寸像素</div>
              <div class="st-val st-val-neon">
                {{ newWidth }} × {{ newHeight }}
              </div>
              <div class="st-sub">{{ formattedResizedSize }}</div>
            </div>
            <div
              class="stat-box"
              :class="pixelDeltaPct >= 0 ? 'stat-saved' : ''"
            >
              <div class="st-label">像素变化</div>
              <div
                class="st-val"
                :class="pixelDeltaPct >= 0 ? 'st-val-green' : ''"
              >
                {{ pixelDeltaPct >= 0 ? '-' : '+'
                }}{{ Math.abs(pixelDeltaPct) }}%
              </div>
              <div class="st-sub">
                {{ pixelDeltaPct >= 0 ? '减少' : '增加' }}
                {{
                  Math.abs(
                    originalImage.width * originalImage.height -
                      newWidth * newHeight,
                  ).toLocaleString()
                }}
                px²
              </div>
            </div>
            <div class="stat-download">
              <button
                class="btn-download"
                :disabled="!isResized"
                @click="downloadResized"
              >
                <span>下载调整后图片</span>
                <small v-if="isResized"
                  >{{ newWidth }} × {{ newHeight }} ·
                  {{ formattedResizedSize }}</small
                >
              </button>
            </div>
          </div>
          <div
            v-if="isResized && resizedBlob"
            class="delta-hint"
            :class="sizeDeltaPct > 0 ? 'up' : 'down'"
          >
            文件体积：{{ sizeDeltaPct > 0 ? '增加' : '减少' }}
            {{ Math.abs(sizeDeltaPct) }}% （{{ sizeDeltaKB > 0 ? '+' : ''
            }}{{ sizeDeltaKB }} KB）
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  pointer-events: none;
  opacity: 0;
}

:root {
  --color-neon: #cf0;
  --color-neon-dim: rgb(204 255 0 / 35%);
  --color-neon-glow: rgb(204 255 0 / 16%);
  --color-bg-primary: #0b0d0c;
  --color-bg-card: #131615;
  --color-border: rgb(255 255 255 / 8%);
  --color-border-hover: rgb(255 255 255 / 16%);
  --color-text-primary: #e9f2ee;
  --color-text-secondary: #a7b3ac;
  --color-text-muted: #6c7872;
}

@media (prefers-color-scheme: light) {
  :root {
    --color-bg-primary: #f7f9f6;
    --color-bg-card: #fff;
    --color-border: rgb(0 0 0 / 7%);
    --color-border-hover: rgb(0 0 0 / 14%);
    --color-text-primary: #0f1714;
    --color-text-secondary: #4b5650;
    --color-text-muted: #7a867f;
  }
}

.tool-page {
  min-height: 100vh;
  padding-top: 96px;
  background:
    radial-gradient(
      circle at 10% -10%,
      var(--color-neon-glow),
      transparent 45%
    ),
    radial-gradient(
      circle at 110% 120%,
      var(--color-neon-glow),
      transparent 40%
    ),
    var(--color-bg-primary);
  background-attachment: fixed;
}

/* ================= Topbar ================= */
.topbar {
  position: sticky;
  top: 56px;
  z-index: 50;
  background: color-mix(in srgb, var(--color-bg-primary) 82%, transparent);
  border-bottom: 1px solid var(--color-border);
  border-radius: 12px 12px 0 0;
  backdrop-filter: saturate(180%) blur(14px);
  backdrop-filter: saturate(180%) blur(14px);
}

.topbar-inner {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  max-width: 1080px;
  padding: 11px 20px;
  margin: 0 auto;
}

.topbar-back {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.2s;
}

.topbar-back:hover {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
}

.topbar-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  min-width: 0;
}

.topbar-title h1 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1;
  color: var(--color-neon);
  letter-spacing: 0.01em;
}

.topbar-title p {
  max-width: 640px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.74rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  opacity: 0.9;
}

.pill-format {
  display: inline-flex;
  align-items: center;
  padding: 5px 13px;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
  white-space: nowrap;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
}

@media (max-width: 720px) {
  .topbar-title p {
    display: none;
  }

  .pill-format {
    display: none;
  }
}

/* ================= Workspace (padding top when sticky) ================= */
.tool-workspace {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1080px;
  padding: 18px 20px 40px;
  margin: 0 auto;
}

.glass-card {
  padding: 16px 18px;
  background: color-mix(in srgb, var(--color-bg-card) 86%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  transition: border-color 0.2s;
}

.glass-card:hover {
  border-color: var(--color-border-hover);
}

/* ================= Upload Shell ================= */
.upload-shell {
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.upload-dropzone {
  width: 100%;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
}

.upload-dropzone.drag-over {
  border-color: var(--color-neon);
  box-shadow: 0 0 0 3px var(--color-neon-glow);
}

.upload-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  padding: 52px 20px 28px;
  text-align: center;
}

.upload-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-radius: 20px;
  animation: floatY 3.2s ease-in-out infinite;
}

@keyframes floatY {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-7px);
  }
}

.upload-title {
  margin: 0;
  font-size: 1.28rem;
  font-weight: 900;
  color: var(--color-text-primary);
  letter-spacing: 0.01em;
}

.upload-hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.btn-pick {
  display: inline-flex;
  align-items: center;
  padding: 12px 28px;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--color-bg-primary);
  letter-spacing: 0.01em;
  cursor: pointer;
  background: var(--color-neon);
  border: none;
  border-radius: 12px;
  box-shadow: 0 10px 22px var(--color-neon-glow);
  transition: all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.btn-pick:hover {
  box-shadow: 0 16px 32px var(--color-neon-glow);
  transform: translateY(-2px);
}

.upload-actions-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  padding: 14px 20px 22px;
  margin-top: 8px;
  border-top: 1px dashed var(--color-border);
}

.feat {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
}

/* ================= Card 1: Settings ================= */
.card-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mode-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 13px;
}

.mode-tab {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 10px 12px;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 9px;
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.mode-tab:hover:not(.active) {
  color: var(--color-text-primary);
  background: var(--color-bg-card);
}

.mode-tab.active {
  font-weight: 800;
  color: var(--color-bg-primary);
  background: var(--color-neon);
  box-shadow: 0 8px 20px -12px var(--color-neon);
}

.set-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.manual-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  gap: 10px;
  align-items: end;
}

@media (max-width: 560px) {
  .manual-row {
    grid-template-columns: 1fr auto;
  }
}

.wh-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.wh-field label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.wh-field input {
  width: 100%;
  padding: 10px 13px;
  font-family: inherit;
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: 0.01em;
  outline: none;
  background: var(--color-bg-card);
  border: 1.5px solid var(--color-border);
  border-radius: 11px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.wh-field input:focus {
  border-color: var(--color-neon);
  box-shadow: 0 0 0 3px var(--color-neon-glow);
}

.btn-lock {
  display: inline-flex;
  align-items: center;
  align-self: end;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1.5px solid var(--color-border);
  border-radius: 11px;
  transition: all 0.2s;
}

.btn-lock.on {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.btn-copy {
  align-self: end;
  height: 44px;
  padding: 10px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1.5px solid var(--color-border);
  border-radius: 11px;
  transition: all 0.2s;
}

.btn-copy:hover {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
}

.ratio-hint {
  padding: 8px 12px;
  font-size: 0.74rem;
  color: var(--color-text-muted);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.ratio-hint.mt {
  margin-top: 4px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 13px 12px;
  text-align: center;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.25s;
}

.preset-card:hover:not(.active) {
  border-color: var(--color-border-hover);
  transform: translateY(-2px);
}

.preset-card.active {
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
  box-shadow: 0 0 0 2.5px var(--color-neon-glow);
  transform: translateY(-2px);
}

.pc-name {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: 0.01em;
}

.pc-size {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 0.9rem;
  font-weight: 900;
  color: var(--color-neon);
}

.pc-desc {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.preset-card.active .pc-name {
  color: var(--color-neon);
}

.scale-row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.scale-val {
  min-width: 78px;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--color-neon);
  text-align: left;
}

.scale-range {
  flex: 1;
  height: 6px;
  appearance: none;
  appearance: none;
  outline: none;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
}

.scale-range::-webkit-slider-thumb {
  width: 20px;
  height: 20px;
  appearance: none;
  appearance: none;
  cursor: pointer;
  background: var(--color-neon);
  border-radius: 50%;
  box-shadow: 0 0 0 4px var(--color-neon-glow);
}

.scale-range::-moz-range-thumb {
  width: 20px;
  height: 20px;
  cursor: pointer;
  background: var(--color-neon);
  border: none;
  border-radius: 50%;
  box-shadow: 0 0 0 4px var(--color-neon-glow);
}

.scale-stops {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}

@media (max-width: 700px) {
  .scale-stops {
    grid-template-columns: repeat(4, 1fr);
  }
}

.scale-stops button {
  padding: 6px 0;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.18s;
}

.scale-stops button:hover {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
}

/* ================= Card 2: Info ================= */
.card-info {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.info-left {
  display: flex;
  align-items: center;
  min-width: 0;
}

.info-text {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.info-name {
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.94rem;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.info-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-primary);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.chip-muted {
  color: var(--color-text-secondary);
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  white-space: nowrap;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 9px;
  transition: all 0.22s;
}

.btn-ghost:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

/* ================= Card 3: Compare (split 2-col) ================= */
.card-compare {
  position: relative;
  padding: 14px 16px 16px;
}

.compare-header {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.vs-chip {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 5px 12px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  border-radius: 9999px;
}

.vs-chip-o {
  color: #38bdf8;
  background: rgb(56 189 248 / 12%);
  border: 1px solid rgb(56 189 248 / 25%);
}

.vs-chip-c {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
}

.compare-stage {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.split-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-items: center;
}

@media (max-width: 620px) {
  .split-wrap {
    grid-template-columns: 1fr;
  }
}

.split-col {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.sp-label {
  align-self: flex-start;
  padding: 3px 9px;
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 6px;
}

.sp-label-o {
  color: #38bdf8;
  background: rgb(56 189 248 / 10%);
}

.sp-label-c {
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.img-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 4 / 3;
  padding: 10px;
  overflow: hidden;
  background:
    linear-gradient(45deg, rgb(128 128 128 / 10%) 25%, transparent 25%),
    linear-gradient(-45deg, rgb(128 128 128 / 10%) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgb(128 128 128 / 10%) 75%),
    linear-gradient(-45deg, transparent 75%, rgb(128 128 128 / 10%) 75%);
  background-position:
    0 0,
    0 11px,
    11px -11px,
    -11px 0;
  background-size: 22px 22px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.img-box img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.placeholder-tiny {
  padding: 20px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.processing-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-bg-card) 74%, transparent);
  border-radius: 18px;
  backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

.processing-overlay span {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.spinner {
  width: 22px;
  height: 22px;
  border: 2.5px solid var(--color-border);
  border-top-color: var(--color-neon);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ================= Card 4: Stats + Download ================= */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) 1.15fr;
  gap: 14px;
  align-items: center;
}

@media (max-width: 820px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-rows: auto;
  }

  .stat-download {
    grid-column: 1 / -1;
    margin-top: 4px;
  }
}

.stat-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 11px 13px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.st-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.st-val {
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 1.02rem;
  font-weight: 900;
  line-height: 1.1;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.st-sub {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
}

.stat-compressed {
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.stat-compressed .st-val-neon {
  color: var(--color-neon);
}

.stat-saved {
  background: rgb(34 197 94 / 10%);
  border-color: rgb(34 197 94 / 30%);
}

.stat-saved .st-val-green {
  color: #22c55e;
}

.stat-download {
  display: flex;
  justify-content: flex-end;
}

.btn-download {
  display: inline-flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  width: 100%;
  min-width: 230px;
  padding: 12px 22px;
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.1;
  color: var(--color-bg-primary);
  letter-spacing: 0.01em;
  cursor: pointer;
  background: var(--color-neon);
  border: none;
  border-radius: 13px;
  box-shadow: 0 8px 22px var(--color-neon-glow);
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@media (min-width: 821px) {
  .btn-download {
    justify-content: center;
    width: auto;
  }
}

.btn-download:disabled {
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.55;
}

.btn-download:not(:disabled):hover {
  box-shadow: 0 14px 28px var(--color-neon-glow);
  transform: translateY(-2px);
}

.btn-download small {
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--color-bg-primary) 62%, transparent);
  letter-spacing: 0.02em;
  background: rgb(255 255 255 / 30%);
  border-radius: 9999px;
}

.delta-hint {
  padding: 8px 12px;
  margin-top: 12px;
  font-size: 0.74rem;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.02em;
  border-radius: 10px;
}

.delta-hint.down {
  color: #16a34a;
  background: rgb(34 197 94 / 10%);
  border: 1px solid rgb(34 197 94 / 22%);
}

.delta-hint.up {
  color: #ea580c;
  background: rgb(234 88 12 / 10%);
  border: 1px solid rgb(234 88 12 / 22%);
}
</style>
