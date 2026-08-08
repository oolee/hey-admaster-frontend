<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

type Img = { height: number; src: string; width: number; };

const originalImage = ref<Img | null>(null);
const originalUrl = ref('');
const wmImage = ref<Img | null>(null);
const wmUrl = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const wmFileInput = ref<HTMLInputElement | null>(null);
const stageCanvas = ref<HTMLCanvasElement | null>(null);
const dragOver = ref(false);

const wmMode = ref<'image' | 'text'>('text');
const layout = ref<'single' | 'tile'>('single');
const wmPosition = ref('br');
const wmText = ref('仅供审核 · Hey19.com');
const wmFontSize = ref(48);
const wmOpacity = ref(25);
const wmRotate = ref(-20);
const wmColor = ref('#DFFE00');
const wmFontFamily = ref('system-ui');
const wmScale = ref(22);
const marginX = ref(5);
const marginY = ref(5);
const tileGapX = ref(20);
const tileGapY = ref(25);
const outFormat = ref('image/png');
const outQuality = ref(92);

const positions = [
  { key: 'tl', label: '左上' },
  { key: 'tc', label: '顶部' },
  { key: 'tr', label: '右上' },
  { key: 'ml', label: '左侧' },
  { key: 'cc', label: '正中' },
  { key: 'mr', label: '右侧' },
  { key: 'bl', label: '左下' },
  { key: 'bc', label: '底部' },
  { key: 'br', label: '右下' },
];

const textColors = [
  '#DFFE00',
  '#FFFFFF',
  '#000000',
  '#FF3B30',
  '#007AFF',
  '#34C759',
  '#FF9500',
];

const canExport = computed(
  () =>
    !!originalImage.value &&
    (wmMode.value === 'text' ? !!wmText.value.trim() : !!wmImage.value),
);

function loadFile(file: File, cb: (img: Img) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const src = e.target?.result as string;
    const im = new Image();
    im.onload = () =>
      cb({ width: im.naturalWidth, height: im.naturalHeight, src });
    im.src = src;
  };
  reader.readAsDataURL(file);
}

function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  loadFile(f, (img) => {
    originalImage.value = img;
    originalUrl.value = img.src;
  });
}

function onWmFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  loadFile(f, (img) => {
    wmImage.value = img;
    wmUrl.value = img.src;
  });
}

function onDrop(e: DragEvent) {
  dragOver.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (f && f.type.startsWith('image/'))
    loadFile(f, (img) => {
      originalImage.value = img;
      originalUrl.value = img.src;
    });
}

function labelPos(k: string) {
  return positions.find((p) => p.key === k)?.label ?? k;
}

function light(hex: string) {
  const h = hex.replace('#', '');
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}

function resetAll() {
  originalImage.value = null;
  originalUrl.value = '';
  wmImage.value = null;
  wmUrl.value = '';
  if (fileInput.value) fileInput.value.value = '';
  if (wmFileInput.value) wmFileInput.value.value = '';
}

// 渲染水印到 canvas
let rafId = 0;
function scheduleRender() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(render);
}

function render() {
  if (!originalImage.value || !stageCanvas.value) return;
  const base = new Image();
  base.onload = () => {
    const cv = stageCanvas.value!;
    const w = originalImage.value!.width;
    const h = originalImage.value!.height;
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(base, 0, 0, w, h);
    ctx.globalAlpha = wmOpacity.value / 100;

    if (layout.value === 'tile') {
      drawTile(ctx, w, h);
    } else {
      drawSingle(ctx, w, h);
    }
    ctx.globalAlpha = 1;
  };
  base.src = originalImage.value.src;
}

function measureTextSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxH: number,
) {
  // 估算尺寸：受字体和旋转影响，用外接矩形近似
  ctx.font = `${wmFontSize.value}px ${wmFontFamily.value}`;
  const m = ctx.measureText(text);
  const tw = m.width;
  const th = wmFontSize.value * 1.2;
  // 旋转后的外接矩形
  const rad = (wmRotate.value * Math.PI) / 180;
  const cosA = Math.abs(Math.cos(rad));
  const sinA = Math.abs(Math.sin(rad));
  const bw = tw * cosA + th * sinA;
  const bh = tw * sinA + th * cosA;
  let scale = 1;
  if (maxW && bw > maxW) scale = Math.min(scale, maxW / bw);
  if (maxH && bh > maxH) scale = Math.min(scale, maxH / bh);
  return { tw, th, bw, bh, scale };
}

function drawTextAt(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((wmRotate.value * Math.PI) / 180);
  ctx.fillStyle = wmColor.value;
  ctx.font = `${wmFontSize.value}px ${wmFontFamily.value}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 阴影（文字可读性）
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillText(wmText.value, 0, 0);
  ctx.restore();
}

function drawImageAt(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseW: number,
  baseH: number,
) {
  if (!wmImage.value) return;
  const s = wmScale.value / 100;
  // 基于原图最短边的比例
  const ref = Math.min(baseW, baseH);
  const w = Math.max(20, ref * s);
  const ratio = wmImage.value.width / wmImage.value.height;
  const h = w / ratio;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.drawImage(loadImgRef(wmImage.value.src), -w / 2, -h / 2, w, h);
  ctx.restore();
}

// 简单的 image 缓存
const _imgCache: Record<string, HTMLImageElement> = {};
function loadImgRef(src: string) {
  if (_imgCache[src]) return _imgCache[src];
  const i = new Image();
  i.src = src;
  _imgCache[src] = i;
  return i;
}

function drawSingle(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const mx = (marginX.value / 100) * w;
  const my = (marginY.value / 100) * h;
  let cx = w / 2;
  let cy = h / 2;
  const [v, horiz] = [...wmPosition.value];
  if (horiz === 'l') cx = mx;
  else if (horiz === 'r') cx = w - mx;
  else cx = w / 2;
  if (v === 't') cy = my;
  else if (v === 'b') cy = h - my;
  else cy = h / 2;

  if (wmMode.value === 'text') drawTextAt(ctx, cx, cy);
  else drawImageAt(ctx, cx, cy, w, h);
}

function drawTile(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 平铺：计算步长（基于水印在原图的像素尺寸 × gap 百分比）
  let stepW: number;
  let stepH: number;
  if (wmMode.value === 'text') {
    const { bw, bh } = measureTextSize(ctx, wmText.value, 0, 0);
    stepW = bw * (1 + tileGapX.value / 100);
    stepH = bh * (1 + tileGapY.value / 100);
  } else {
    const ref = Math.min(w, h);
    const s = wmScale.value / 100;
    const wi = ref * s;
    const ratio = wmImage.value
      ? wmImage.value.width / wmImage.value.height
      : 1;
    const hi = wi / ratio;
    stepW = wi * (1 + tileGapX.value / 100);
    stepH = hi * (1 + tileGapY.value / 100);
  }
  stepW = Math.max(20, stepW);
  stepH = Math.max(20, stepH);
  // 交错排列，视觉更均匀
  const startX = -stepW;
  const startY = -stepH;
  let row = 0;
  for (let y = startY; y < h + stepH; y += stepH) {
    row++;
    const offset = row % 2 === 0 ? stepW / 2 : 0;
    for (let x = startX + offset; x < w + stepW; x += stepW) {
      if (wmMode.value === 'text') drawTextAt(ctx, x, y);
      else drawImageAt(ctx, x, y, w, h);
    }
  }
}

function download() {
  if (!stageCanvas.value) return;
  const cv = stageCanvas.value;
  const mime = outFormat.value;
  const q =
    outFormat.value === 'image/png' ? undefined : outQuality.value / 100;
  cv.toBlob(
    (blob) => {
      if (!blob) return;
      const ext =
        mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `watermarked.${Date.now()}.${ext}`;
      document.body.append(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    mime,
    q,
  );
}

// 监听所有相关参数变化重绘
const renderDeps = [
  originalImage,
  wmMode,
  layout,
  wmPosition,
  wmText,
  wmFontSize,
  wmOpacity,
  wmRotate,
  wmColor,
  wmFontFamily,
  wmImage,
  wmScale,
  marginX,
  marginY,
  tileGapX,
  tileGapY,
];
renderDeps.forEach((d) => watch(d, scheduleRender, { deep: true }));

watch(originalImage, () => nextTick(scheduleRender));
</script>

<template>
  <div class="tool-page">
    <div class="tool-topbar">
      <router-link to="/tools" class="back-btn">← 返回工具箱</router-link>
      <div class="tool-title-block">
        <h1 class="tool-title">水印大师</h1>
        <p class="tool-subtitle">
          本地处理 · 文字 / 图片水印 · 九宫格定位 · 平铺铺满 ·
          广告样图防抄袭利器
        </p>
      </div>
      <div class="filler"></div>
    </div>

    <div class="tool-body">
      <!-- 上传卡片 -->
      <div class="glass-card upload-card">
        <h2 class="card-title">原始图片</h2>
        <div
          class="drop-zone"
          :class="{ active: dragOver, has: !!originalImage }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
          @click="$refs.fileInput.click()"
        >
          <template v-if="!originalImage">
            <div class="dz-title">拖拽图片到此 或 点击选择文件</div>
            <div class="dz-sub">
              支持 JPG / PNG / WebP / BMP 等格式 ·
              完全浏览器本地处理不上传服务器
            </div>
          </template>
          <template v-else>
            <img :src="originalUrl" alt="" @click.stop />
          </template>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="onFile"
            hidden
          />
        </div>
      </div>

      <!-- 水印设置 -->
      <div class="glass-card">
        <h2 class="card-title">水印模式</h2>
        <div class="seg-row">
          <button
            class="seg-btn"
            :class="{ active: wmMode === 'text' }"
            @click="wmMode = 'text'"
          >
            文字水印
          </button>
          <button
            class="seg-btn"
            :class="{ active: wmMode === 'image' }"
            @click="wmMode = 'image'"
          >
            图片水印
          </button>
        </div>

        <!-- 文字水印 -->
        <template v-if="wmMode === 'text'">
          <div class="form-row">
            <label>水印文字</label>
            <input
              type="text"
              v-model="wmText"
              maxlength="60"
              placeholder="例如：仅供审核 · 机密 · Hey19.com"
            />
          </div>
          <div class="two-col">
            <div class="form-row">
              <label>字体大小 (px)</label>
              <div class="num-row">
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="1"
                  v-model.number="wmFontSize"
                />
                <span class="num-val">{{ wmFontSize }}</span>
              </div>
            </div>
            <div class="form-row">
              <label>透明度</label>
              <div class="num-row">
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  v-model.number="wmOpacity"
                />
                <span class="num-val">{{ wmOpacity }}%</span>
              </div>
            </div>
          </div>
          <div class="two-col">
            <div class="form-row">
              <label>字体</label>
              <select v-model="wmFontFamily">
                <option value="system-ui">系统默认</option>
                <option value="'PingFang SC', sans-serif">苹方</option>
                <option value="'Microsoft YaHei', sans-serif">微软雅黑</option>
                <option value="serif">衬线</option>
                <option value="'Courier New', monospace">等宽</option>
                <option value="'Impact', sans-serif">Impact</option>
              </select>
            </div>
            <div class="form-row">
              <label>旋转角度</label>
              <div class="num-row">
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="1"
                  v-model.number="wmRotate"
                />
                <span class="num-val">{{ wmRotate }}°</span>
              </div>
            </div>
          </div>
          <div class="form-row">
            <label>文字颜色</label>
            <div class="color-row">
              <div class="color-pick-wrap">
                <input type="color" v-model="wmColor" />
                <span class="hex">{{ wmColor }}</span>
              </div>
              <div class="preset-row">
                <button
                  v-for="c in textColors"
                  :key="c"
                  class="chip-sq"
                  :style="{ background: c, color: light(c) ? '#000' : '#fff' }"
                  :class="{ active: wmColor === c }"
                  @click="wmColor = c"
                >
                  {{ c }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- 图片水印 -->
        <template v-else>
          <div
            class="drop-zone small"
            :class="{ has: !!wmImage }"
            @click="$refs.wmFileInput.click()"
          >
            <template v-if="!wmImage">
              <div class="dz-title">点击选择水印图片（建议 PNG 透明背景）</div>
            </template>
            <template v-else>
              <img :src="wmUrl" alt="" @click.stop />
            </template>
            <input
              ref="wmFileInput"
              type="file"
              accept="image/*"
              @change="onWmFile"
              hidden
            />
          </div>
          <div class="two-col">
            <div class="form-row">
              <label>水印尺寸 (%)</label>
              <div class="num-row">
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  v-model.number="wmScale"
                />
                <span class="num-val">{{ wmScale }}%</span>
              </div>
            </div>
            <div class="form-row">
              <label>透明度</label>
              <div class="num-row">
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  v-model.number="wmOpacity"
                />
                <span class="num-val">{{ wmOpacity }}%</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 布局 -->
        <h3 class="card-subtitle">布局方式</h3>
        <div class="seg-row">
          <button
            class="seg-btn"
            :class="{ active: layout === 'single' }"
            @click="layout = 'single'"
          >
            单点位置
          </button>
          <button
            class="seg-btn"
            :class="{ active: layout === 'tile' }"
            @click="layout = 'tile'"
          >
            平铺铺满
          </button>
        </div>

        <template v-if="layout === 'single'">
          <h3 class="card-subtitle">水印位置（九宫格）</h3>
          <div class="grid-3x3">
            <button
              v-for="(pos, idx) in positions"
              :key="idx"
              class="pos-cell"
              :class="{ active: wmPosition === pos.key }"
              @click="wmPosition = pos.key"
            >
              {{ pos.label }}
            </button>
          </div>
          <div class="two-col">
            <div class="form-row">
              <label>水平边距 (%)</label>
              <div class="num-row">
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  v-model.number="marginX"
                />
                <span class="num-val">{{ marginX }}%</span>
              </div>
            </div>
            <div class="form-row">
              <label>垂直边距 (%)</label>
              <div class="num-row">
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  v-model.number="marginY"
                />
                <span class="num-val">{{ marginY }}%</span>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="two-col">
            <div class="form-row">
              <label>横向间距 (%)</label>
              <div class="num-row">
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  v-model.number="tileGapX"
                />
                <span class="num-val">{{ tileGapX }}%</span>
              </div>
            </div>
            <div class="form-row">
              <label>纵向间距 (%)</label>
              <div class="num-row">
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  v-model.number="tileGapY"
                />
                <span class="num-val">{{ tileGapY }}%</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 结果预览 -->
      <div class="glass-card" v-if="originalImage">
        <h2 class="card-title">结果预览</h2>
        <div class="preview-stage">
          <canvas ref="stageCanvas" class="stage-canvas"></canvas>
        </div>
        <div class="info-strip">
          <div class="info-item">
            <span class="lbl">原图尺寸</span
            ><span class="val"
              >{{ originalImage?.width }} × {{ originalImage?.height }}</span
            >
          </div>
          <div class="info-item">
            <span class="lbl">模式</span
            ><span class="val"
              >{{ wmMode === 'text' ? '文字' : '图片' }} ·
              {{ layout === 'single' ? labelPos(wmPosition) : '平铺' }}</span
            >
          </div>
          <div class="info-item">
            <span class="lbl">输出</span
            ><span class="val"
              >{{ outFormat.toUpperCase() }} · 质量 {{ outQuality }}%</span
            >
          </div>
        </div>
      </div>

      <!-- 导出卡片 -->
      <div class="glass-card" v-if="originalImage">
        <h2 class="card-title">导出设置</h2>
        <div class="two-col">
          <div class="form-row">
            <label>输出格式</label>
            <div class="seg-row">
              <button
                v-for="f in ['image/png', 'image/jpeg', 'image/webp']"
                :key="f"
                class="seg-btn"
                :class="{ active: outFormat === f }"
                @click="outFormat = f"
              >
                {{ f.split('/')[1].toUpperCase() }}
              </button>
            </div>
          </div>
          <div class="form-row" v-if="outFormat !== 'image/png'">
            <label>输出质量</label>
            <div class="num-row">
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                v-model.number="outQuality"
              />
              <span class="num-val">{{ outQuality }}%</span>
            </div>
          </div>
        </div>
        <div class="action-row">
          <button class="btn-primary" @click="download" :disabled="!canExport">
            下载加水印图片
          </button>
          <button class="btn-ghost" @click="resetAll" v-if="originalImage">
            清空重来
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-page {
  padding-top: 60px;
  padding-bottom: 64px;
}

.tool-topbar {
  position: sticky;
  top: 56px;
  z-index: 10;
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 14px 28px;
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  backdrop-filter: blur(18px);
}

.back-btn {
  padding: 8px 14px;
  font-size: 13px;
  color: var(--color-text-primary);
  white-space: nowrap;
  text-decoration: none;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  transition: all 0.2s;
}

.back-btn:hover {
  color: var(--neon);
  border-color: var(--neon);
}

.tool-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.tool-subtitle {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  opacity: 0.9;
}

.filler {
  flex: 1;
}

.tool-body {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
  max-width: 1440px;
  padding: 24px 28px 0;
  margin: 0 auto;
}

.glass-card {
  grid-column: span 12;
  padding: 22px 24px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  backdrop-filter: blur(18px);
}

@media (min-width: 960px) {
  .upload-card {
    grid-column: span 5;
  }

  .glass-card:nth-of-type(2) {
    grid-column: span 7;
  }

  .glass-card:nth-of-type(3) {
    grid-column: span 7;
  }

  .glass-card:nth-of-type(4) {
    grid-column: span 5;
  }
}

.card-title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.card-subtitle {
  margin: 16px 0 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 18px;
  text-align: center;
  cursor: pointer;
  border: 2px dashed var(--glass-border);
  border-radius: 16px;
  transition: all 0.2s;
}

.drop-zone.small {
  min-height: 120px;
  padding: 12px;
}

.drop-zone:hover {
  border-color: var(--neon);
}

.drop-zone.active {
  background: color-mix(in srgb, var(--neon) 6%, transparent);
  border-color: var(--neon);
}

.drop-zone.has img {
  max-width: 100%;
  max-height: 220px;
  object-fit: contain;
  border-radius: 10px;
}

.drop-zone.small.has img {
  max-height: 100px;
}

.dz-title {
  font-size: 15px;
  font-weight: 700;
}

.dz-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  opacity: 0.9;
}

.seg-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.seg-btn {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  transition: all 0.15s;
}

.seg-btn:hover {
  border-color: var(--neon);
}

.seg-btn.active {
  color: #0b0d0c;
  background: var(--neon);
  border-color: var(--neon);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--neon) 20%, transparent);
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 600px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

.form-row {
  margin-top: 10px;
}

.form-row > label {
  display: block;
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.form-row input[type='text'],
.form-row select {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--color-text-primary);
  outline: none;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  transition: border-color 0.15s;
}

.form-row input[type='text']:focus,
.form-row select:focus {
  border-color: var(--neon);
}

.num-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.num-row input[type='range'] {
  flex: 1;
  height: 6px;
  appearance: none;
  appearance: none;
  outline: none;
  background: var(--glass-border);
  border-radius: 999px;
}

.num-row input[type='range']::-webkit-slider-thumb {
  width: 18px;
  height: 18px;
  appearance: none;
  appearance: none;
  cursor: pointer;
  background: var(--neon);
  border-radius: 50%;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--neon) 22%, transparent);
}

.num-row input[type='range']::-moz-range-thumb {
  width: 18px;
  height: 18px;
  cursor: pointer;
  background: var(--neon);
  border: none;
  border-radius: 50%;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--neon) 22%, transparent);
}

.num-val {
  min-width: 52px;
  font-size: 13px;
  font-weight: 700;
  text-align: right;
}

.color-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.color-pick-wrap {
  display: flex;
  gap: 10px;
  align-items: center;
}

.color-pick-wrap input[type='color'] {
  width: 40px;
  height: 40px;
  padding: 2px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
}

.color-pick-wrap .hex {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  font-weight: 700;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip-sq {
  padding: 6px 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: transform 0.1s;
}

.chip-sq:hover {
  transform: translateY(-1px);
}

.chip-sq.active {
  border-color: var(--color-text-primary);
}

.grid-3x3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-width: 360px;
}

.pos-cell {
  padding: 16px 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  transition: all 0.15s;
}

.pos-cell:hover {
  border-color: var(--neon);
}

.pos-cell.active {
  color: #0b0d0c;
  background: var(--neon);
  border-color: var(--neon);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--neon) 20%, transparent);
}

.preview-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 320px;
  padding: 12px;
  background:
    linear-gradient(45deg, rgb(127 127 127 / 12%) 25%, transparent 25%),
    linear-gradient(-45deg, rgb(127 127 127 / 12%) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgb(127 127 127 / 12%) 75%),
    linear-gradient(-45deg, transparent 75%, rgb(127 127 127 / 12%) 75%);
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
  background-size: 20px 20px;
  border-radius: 14px;
}

.stage-canvas {
  max-width: 100%;
  max-height: 520px;
  border-radius: 10px;
  box-shadow: 0 12px 40px rgb(0 0 0 / 18%);
}

.info-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 12px 14px;
  margin-top: 14px;
  background: color-mix(in srgb, var(--neon) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--neon) 22%, transparent);
  border-radius: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-item .lbl {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.info-item .val {
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 600px) {
  .info-strip {
    grid-template-columns: 1fr 1fr;
  }
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.btn-primary {
  padding: 11px 20px;
  font-size: 14px;
  font-weight: 800;
  color: #0b0d0c;
  cursor: pointer;
  background: var(--neon);
  border: 1px solid var(--neon);
  border-radius: 12px;
  box-shadow: 0 6px 20px color-mix(in srgb, var(--neon) 28%, transparent);
  transition: all 0.15s;
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 10px 28px color-mix(in srgb, var(--neon) 35%, transparent);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-ghost {
  padding: 11px 18px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  transition: all 0.15s;
}

.btn-ghost:hover {
  color: var(--neon);
  border-color: var(--neon);
}
</style>
