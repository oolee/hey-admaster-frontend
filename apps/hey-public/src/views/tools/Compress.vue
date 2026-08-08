<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

// ============ Types ============
type CompressMode = 'percent' | 'scene' | 'targetsize';
type OutputFormat = 'jpeg' | 'png' | 'webp';
type ScenePreset = 'article' | 'email' | 'print' | 'webfast' | 'wechat';

interface ImageInfo {
  file: File;
  url: string;
  width: number;
  height: number;
  size: number;
  name: string;
  format: string;
}

interface CompressedResult {
  url: string;
  blob: Blob;
  width: number;
  height: number;
  size: number;
  format: OutputFormat;
  quality: number;
}

interface SceneConfig {
  key: ScenePreset;
  name: string;
  icon: string;
  desc: string;
  defaultFmt: OutputFormat;
  defaultQuality: number;
  hint: string;
}

// ============ State ============
const originalImage = ref<ImageInfo | null>(null);
const compressedResult = ref<CompressedResult | null>(null);
const isProcessing = ref(false);
const isDragging = ref(false);
const compressMode = ref<CompressMode>('scene');
const outputFormat = ref<OutputFormat>('webp');
const qualityPercent = ref(62);
const targetSizeKB = ref(150);
const scenePreset = ref<ScenePreset>('webfast');
const comparePosition = ref(50);
const isComparing = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const compareContainer = ref<HTMLDivElement | null>(null);

// AB hold-to-switch
const isShowOnlyOriginal = ref(false); // 按住看原图

// Fullscreen overlay compare
const showFullscreen = ref(false);
const fullscreenCompare = ref(50);
const isFullscreenDragging = ref(false);

const SCENE_PRESETS: SceneConfig[] = [
  {
    key: 'webfast',
    name: '网页极速',
    icon: '',
    desc: '文章/博客极速加载',
    hint: '≤ 150KB，首屏秒开',
    defaultFmt: 'webp',
    defaultQuality: 0.62,
  },
  {
    key: 'article',
    name: '图文平衡',
    icon: '',
    desc: '画质与体积平衡',
    hint: '推荐通用场景',
    defaultFmt: 'jpeg',
    defaultQuality: 0.78,
  },
  {
    key: 'wechat',
    name: '微信/社媒',
    icon: '',
    desc: '公众号分享友好',
    hint: '流量友好',
    defaultFmt: 'jpeg',
    defaultQuality: 0.7,
  },
  {
    key: 'email',
    name: '邮件附件',
    icon: '',
    desc: '≤ 300KB 不卡邮箱',
    hint: '附件友好',
    defaultFmt: 'jpeg',
    defaultQuality: 0.55,
  },
  {
    key: 'print',
    name: '高清印刷',
    icon: '',
    desc: '保留细节供打印',
    hint: '高质量',
    defaultFmt: 'jpeg',
    defaultQuality: 0.95,
  },
];

const MIME_MAP: Record<OutputFormat, string> = {
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  png: 'image/png',
};

const currentScene = computed(
  () =>
    SCENE_PRESETS.find((s) => s.key === scenePreset.value) ?? SCENE_PRESETS[0],
);
const savingsPercent = computed(() => {
  if (!originalImage.value || !compressedResult.value) return 0;
  const saved = originalImage.value.size - compressedResult.value.size;
  return Math.max(0, Math.round((saved / originalImage.value.size) * 100));
});
const savingsKB = computed(() => {
  if (!originalImage.value || !compressedResult.value) return 0;
  return Math.round(
    (originalImage.value.size - compressedResult.value.size) / 1024,
  );
});
const formattedOriginalSize = computed(() =>
  formatSize(originalImage.value?.size ?? 0),
);
const formattedCompressedSize = computed(() =>
  formatSize(compressedResult.value?.size ?? 0),
);

// 动态计算对比区的 aspect-ratio —— 根据原图方向自适应，让图片尽可能大
// 竖图不要硬塞进 16:9 浪费两边空间，横图保持 16:9
const stageAspectRatio = computed(() => {
  if (!originalImage.value) return '16 / 9';
  const { width: w, height: h } = originalImage.value;
  const ratio = w / h;
  if (ratio >= 1) {
    // 横图：16:9 顶
    return `${Math.min(ratio, 16 / 9)} / 1`;
  } else {
    // 竖图：1 : 原图 ratio，但最大 1:1.4（防止长图无限高）
    const hratio = Math.min(h / w, 1.45);
    return `1 / ${hratio}`;
  }
});

// ===== 对比器 clip-path (左右裁剪，无缩放) =====
const compressedClipPath = computed(() => {
  if (isShowOnlyOriginal.value) return 'inset(0 100% 0 0)'; // 完全隐藏压缩后
  return `inset(0 ${100 - comparePosition.value}% 0 0)`;
});
const originalClipPath = computed(() => {
  if (isShowOnlyOriginal.value) return 'inset(0 0 0 0)'; // 完全展示原图
  return `inset(0 0 0 ${comparePosition.value}%)`;
});

// Fullscreen clip-path (独立状态)
const fsCompClipPath = computed(
  () => `inset(0 ${100 - fullscreenCompare.value}% 0 0)`,
);
const fsOrigClipPath = computed(
  () => `inset(0 0 0 ${fullscreenCompare.value}%)`,
);

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
function getFileNameWithoutExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}
function applyScene(key: ScenePreset) {
  scenePreset.value = key;
  const cfg = SCENE_PRESETS.find((s) => s.key === key);
  if (!cfg) return;
  outputFormat.value = cfg.defaultFmt;
  qualityPercent.value = Math.round(cfg.defaultQuality * 100);
  const map: Record<ScenePreset, number> = {
    webfast: 150,
    article: 500,
    wechat: 350,
    email: 280,
    print: 2048,
  };
  targetSizeKB.value = map[key] ?? 150;
}

function triggerFileInput() {
  fileInput.value?.click();
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) handleFile(file);
}
function onDragOver(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
}
function onDragLeave(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;
}
function onDrop(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
}
async function handleFile(file: File) {
  if (!file.type.startsWith('image/')) {
    alert('请上传图片文件');
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('图片加载失败'));
  });
  if (originalImage.value) URL.revokeObjectURL(originalImage.value.url);
  if (compressedResult.value) {
    URL.revokeObjectURL(compressedResult.value.url);
    compressedResult.value = null;
  }
  originalImage.value = {
    file,
    url,
    width: img.naturalWidth,
    height: img.naturalHeight,
    size: file.size,
    name: file.name,
    format: file.type.split('/')[1] || 'unknown',
  };
  comparePosition.value = 50;
  await nextTick();
  await compressImage();
}

async function compressImage() {
  if (!originalImage.value) return;
  isProcessing.value = true;
  try {
    let result: CompressedResult;
    const fmt = outputFormat.value;
    if (compressMode.value === 'scene') {
      const preset = currentScene.value;
      const q = preset ? preset.defaultQuality : 0.62;
      result = await compressWithQuality(originalImage.value, fmt, q);
    } else if (compressMode.value === 'targetsize') {
      result = await compressToTargetSize(
        originalImage.value,
        fmt,
        targetSizeKB.value,
      );
    } else {
      result = await compressWithQuality(
        originalImage.value,
        fmt,
        qualityPercent.value / 100,
      );
    }
    if (compressedResult.value) URL.revokeObjectURL(compressedResult.value.url);
    compressedResult.value = result;
  } catch (error) {
    console.error('压缩失败:', error);
  } finally {
    isProcessing.value = false;
  }
}

async function compressWithQuality(
  img: ImageInfo,
  format: OutputFormat,
  quality: number,
): Promise<CompressedResult> {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  const image = new Image();
  image.src = img.url;
  await new Promise<void>((r) => (image.onload = () => r()));
  ctx.drawImage(image, 0, 0);
  const mimeType = MIME_MAP[format];
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Blob conversion failed'))),
      mimeType,
      format === 'png' ? undefined : quality,
    );
  });
  return {
    url: URL.createObjectURL(blob),
    blob,
    width: img.width,
    height: img.height,
    size: blob.size,
    format,
    quality,
  };
}
async function compressToTargetSize(
  img: ImageInfo,
  format: OutputFormat,
  targetKB: number,
): Promise<CompressedResult> {
  const targetBytes = targetKB * 1024;
  let maxQ = 1;
    let minQ = 0.05;
  let best: CompressedResult | null = null;
  for (let i = 0; i < 10; i++) {
    const midQ = (minQ + maxQ) / 2;
    const result = await compressWithQuality(img, format, midQ);
    if (Math.abs(result.size - targetBytes) <= targetBytes * 0.05) {
      if (best) URL.revokeObjectURL(best.url);
      return result;
    }
    if (result.size > targetBytes) maxQ = midQ;
    else minQ = midQ;
    if (best) URL.revokeObjectURL(best.url);
    best = result;
  }
  if (!best) throw new Error('压缩失败');
  return best;
}

// ===== Card compare slider =====
function onCompareMouseDown(e: MouseEvent) {
  e.preventDefault();
  isComparing.value = true;
}
function onCompareMove(e: MouseEvent | TouchEvent) {
  if (!isComparing.value || !compareContainer.value) return;
  const rect = compareContainer.value.getBoundingClientRect();
  let clientX = 0;
  if ('touches' in e) {
    const touch = e.touches?.[0];
    if (!touch) return;
    clientX = touch.clientX;
  } else clientX = e.clientX;
  let pos = ((clientX - rect.left) / rect.width) * 100;
  pos = Math.max(0, Math.min(100, pos));
  comparePosition.value = pos;
}
function onCompareUp() {
  isComparing.value = false;
}

// ===== Fullscreen slider =====
function openFullscreen() {
  fullscreenCompare.value = comparePosition.value;
  showFullscreen.value = true;
  setTimeout(() => {
    document.body.style.overflow = 'hidden';
  }, 0);
}
function closeFullscreen() {
  showFullscreen.value = false;
  document.body.style.overflow = '';
}
function onFsMouseDown(e: MouseEvent) {
  e.preventDefault();
  isFullscreenDragging.value = true;
}
function onFsMove(e: MouseEvent | TouchEvent) {
  if (!isFullscreenDragging.value) return;
  const stage = document.querySelector<HTMLElement>('.fs-stage');
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  let clientX = 0;
  if ('touches' in e) {
    const touch = e.touches?.[0];
    if (!touch) return;
    clientX = touch.clientX;
  } else clientX = e.clientX;
  let pos = ((clientX - rect.left) / rect.width) * 100;
  pos = Math.max(0, Math.min(100, pos));
  fullscreenCompare.value = pos;
}
function onFsUp() {
  isFullscreenDragging.value = false;
}
function onFsKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeFullscreen();
}

// Download
function downloadCompressed() {
  if (!compressedResult.value || !originalImage.value) return;
  const a = document.createElement('a');
  a.href = compressedResult.value.url;
  const baseName = getFileNameWithoutExtension(originalImage.value.name);
  const ext =
    compressedResult.value.format === 'jpeg'
      ? 'jpg'
      : compressedResult.value.format;
  a.download = `${baseName}_compressed.${ext}`;
  document.body.append(a);
  a.click();
  document.body.removeChild(a);
}
function resetAll() {
  if (originalImage.value) URL.revokeObjectURL(originalImage.value.url);
  if (compressedResult.value) URL.revokeObjectURL(compressedResult.value.url);
  originalImage.value = null;
  compressedResult.value = null;
  if (fileInput.value) fileInput.value.value = '';
}

watch(
  [compressMode, outputFormat, qualityPercent, targetSizeKB, scenePreset],
  () => {
    if (originalImage.value && !isProcessing.value)
      nextTick(() => compressImage());
  },
);

onMounted(() => {
  applyScene('webfast');
  window.addEventListener('mousemove', onCompareMove);
  window.addEventListener('mouseup', onCompareUp);
  window.addEventListener('touchmove', onCompareMove, { passive: false });
  window.addEventListener('touchend', onCompareUp);
  window.addEventListener('keydown', onFsKey);
});
onUnmounted(() => {
  window.removeEventListener('mousemove', onCompareMove);
  window.removeEventListener('mouseup', onCompareUp);
  window.removeEventListener('touchmove', onCompareMove);
  window.removeEventListener('touchend', onCompareUp);
  window.removeEventListener('keydown', onFsKey);
  document.body.style.overflow = '';
  if (originalImage.value) URL.revokeObjectURL(originalImage.value.url);
  if (compressedResult.value) URL.revokeObjectURL(compressedResult.value.url);
});
</script>

<template>
  <div class="tool-page">
    <!-- ============ Sticky 工具顶栏（top: 60px 避让主站导航） ============ -->
    <header class="topbar">
      <div class="topbar-inner container-custom">
        <RouterLink to="/tools" class="topbar-back" title="返回工具箱">
          <span>返回工具箱</span>
        </RouterLink>
        <h1 class="topbar-title">
          <span class="t-main">图片压缩</span>
          <span class="t-sub">本地处理 · 隐私安全 · 极速转换 · 对比预览</span>
        </h1>
        <div class="topbar-right">
          <span class="pill-format">JPG · PNG · WebP</span>
        </div>
      </div>
    </header>

    <div class="tool-workspace container-custom">
      <!-- ====== 上传阶段 ====== -->
      <div v-if="!originalImage" class="upload-section">
        <div
          class="upload-area"
          :class="{ 'drag-over': isDragging }"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @click="triggerFileInput"
        >
          <div class="upload-inner">
            <div class="upload-icon">
              <svg
                viewBox="0 0 24 24"
                width="38"
                height="38"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p class="upload-text">
              <span class="highlight">拖拽图片到此</span>
              <span class="or">或</span>
              <span class="highlight">点击选择文件</span>
            </p>
            <p class="upload-hint">
              支持 JPG / PNG / WebP / BMP 等格式 ·
              完全浏览器本地处理不上传服务器
            </p>
            <div class="upload-actions-preview">
              <span class="feat">按质量/大小/场景压缩</span>
              <span class="feat">拖动滑块对比效果</span>
              <span class="feat">格式互转</span>
              <span class="feat">隐私安全</span>
            </div>
            <button class="btn-pick" @click.stop="triggerFileInput">
              选择图片
            </button>
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden-input"
          @change="onFileSelected"
        />
      </div>

      <!-- ====== 工作阶段 ====== -->
      <template v-else>
        <!-- ====== 卡片 1: 模式 & 设置 ====== -->
        <section class="glass-card card-settings">
          <!-- 三个 Tab -->
          <div class="mode-tabs">
            <button
              class="mode-tab"
              :class="{ active: compressMode === 'scene' }"
              @click="compressMode = 'scene'"
            >
              <span>按场景推荐</span>
            </button>
            <button
              class="mode-tab"
              :class="{ active: compressMode === 'percent' }"
              @click="compressMode = 'percent'"
            >
              <span>按质量百分比</span>
            </button>
            <button
              class="mode-tab"
              :class="{ active: compressMode === 'targetsize' }"
              @click="compressMode = 'targetsize'"
            >
              <span>按目标大小</span>
            </button>
          </div>

          <div class="settings-grid">
            <!-- 左: 当前模式内容 -->
            <div class="setting-block">
              <template v-if="compressMode === 'scene'">
                <label class="setting-label"
                  ><span>选择场景，自动匹配最佳参数</span></label
                >
                <div class="scene-presets">
                  <button
                    v-for="p in SCENE_PRESETS"
                    :key="p.key"
                    class="scene-preset"
                    :class="{ active: scenePreset === p.key }"
                    @click="applyScene(p.key)"
                  >
                    <div class="sp-text">
                      <span class="sp-name">{{ p.name }}</span>
                      <span class="sp-desc">{{ p.hint }}</span>
                    </div>
                  </button>
                </div>
              </template>

              <template v-else-if="compressMode === 'percent'">
                <label class="setting-label">
                  <span>压缩质量</span>
                  <span class="setting-value text-neon-mono"
                    >{{ qualityPercent }}%</span
                  >
                </label>
                <div class="slider-wrap">
                  <input
                    v-model.number="qualityPercent"
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    class="custom-slider"
                    :style="{ ['--pct']: `${qualityPercent }%` }"
                  />
                  <div class="slider-hints">
                    <span>更小体积</span><span>更好画质</span>
                  </div>
                </div>
              </template>

              <template v-else>
                <label class="setting-label">
                  <span>目标文件大小</span>
                  <span class="setting-value text-neon-mono">
                    <input
                      v-model.number="targetSizeKB"
                      type="number"
                      min="10"
                      max="20000"
                      class="size-input"
                    />
                    KB
                  </span>
                </label>
                <div class="size-presets">
                  <button
                    v-for="s in [100, 300, 500, 1024, 2048, 5120]"
                    :key="s"
                    class="size-preset"
                    :class="{ active: targetSizeKB === s }"
                    @click="targetSizeKB = s"
                  >
                    {{ s < 1024 ? `${s }KB` : `${s / 1024 }MB` }}
                  </button>
                </div>
              </template>
            </div>

            <!-- 右: 输出格式 -->
            <div class="setting-block">
              <label class="setting-label"><span>输出格式</span></label>
              <div class="format-picker">
                <button
                  v-for="f in ['jpeg', 'webp', 'png'] as OutputFormat[]"
                  :key="f"
                  class="format-btn"
                  :class="{ active: outputFormat === f }"
                  @click="outputFormat = f"
                >
                  <span class="fmt-name">{{
                    f === 'jpeg' ? 'JPEG' : f === 'webp' ? 'WebP' : 'PNG'
                  }}</span>
                  <span class="fmt-desc">
                    {{
                      f === 'jpeg'
                        ? '通用兼容 · 照片最佳'
                        : f === 'webp'
                          ? '体积最小 · 网页优先'
                          : '无损透明 · 图标/logo'
                    }}
                  </span>
                </button>
              </div>
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
              </div>
            </div>
          </div>
          <div class="info-right">
            <button class="btn-ghost" @click="resetAll">重新选择图片</button>
          </div>
        </section>

        <!-- ====== 卡片 3: 对比预览 ====== -->
        <section class="glass-card card-compare">
          <header class="compare-head">
            <div class="compare-titles">
              <div class="ct ct-comp">
                <span class="ct-dot ct-dot-c"></span>
                压缩后
                <b class="ct-val">{{ formattedCompressedSize }}</b>
              </div>
              <div class="ct-vs">VS</div>
              <div class="ct ct-orig">
                <b class="ct-val">{{ formattedOriginalSize }}</b>
                原图
                <span class="ct-dot ct-dot-o"></span>
              </div>
            </div>
            <div class="compare-tools">
              <button
                class="btn-tool"
                @mousedown.prevent="isShowOnlyOriginal = true"
                @mouseup="isShowOnlyOriginal = false"
                @mouseleave="isShowOnlyOriginal = false"
                @touchstart.prevent="isShowOnlyOriginal = true"
                @touchend="isShowOnlyOriginal = false"
                title="按住只看原图 (快速切换 AB)"
              >
                按住看原图
              </button>
              <button
                class="btn-tool"
                @click="openFullscreen"
                title="全屏放大对比"
              >
                放大对比
              </button>
            </div>
          </header>

          <!-- Stage -->
          <div
            ref="compareContainer"
            class="compare-stage"
            :style="{ aspectRatio: stageAspectRatio }"
            :class="{
              processing: isProcessing,
              'ab-original': isShowOnlyOriginal,
            }"
            @mousedown="onCompareMouseDown"
            @touchstart.passive="() => (isComparing = true)"
          >
            <!-- 底层：原图（右侧） -->
            <img
              v-if="originalImage"
              :src="originalImage.url"
              class="compare-img img-orig"
              :style="{ clipPath: originalClipPath }"
              draggable="false"
              alt="原图"
            />
            <!-- 上层：压缩后（左侧） -->
            <img
              v-if="compressedResult && !isProcessing"
              :src="compressedResult.url"
              class="compare-img img-comp"
              :style="{ clipPath: compressedClipPath }"
              draggable="false"
              alt="压缩后"
            />
            <!-- 角标 -->
            <div
              class="cmp-tag tag-comp"
              :style="{ maxWidth: `calc(${ comparePosition }% - 10px)` }"
              v-show="!isShowOnlyOriginal"
            >
              压缩后 · {{ formattedCompressedSize }}
            </div>
            <div
              class="cmp-tag tag-orig"
              :style="{
                maxWidth: `calc(${ 100 - comparePosition }% - 10px)`,
              }"
            >
              原图 · {{ formattedOriginalSize }}
            </div>
            <!-- Processing -->
            <div v-if="isProcessing" class="processing-overlay">
              <div class="spinner"></div>
              <span>压缩处理中...</span>
            </div>
            <!-- Divider -->
            <div
              v-show="!isShowOnlyOriginal"
              class="compare-divider"
              :style="{ left: `${comparePosition }%` }"
            >
              <div class="divider-line"></div>
              <div class="divider-handle">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                  <polyline
                    points="9 18 3 12 9 6"
                    transform="translate(12 0)"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <!-- ====== 卡片 4: 统计 & 下载 ====== -->
        <section class="glass-card card-stats">
          <div class="stats-grid">
            <div class="stat-box">
              <div class="st-label">原始体积</div>
              <div class="st-val">{{ formattedOriginalSize }}</div>
              <div class="st-sub">
                {{ originalImage.width }} × {{ originalImage.height }} px
              </div>
            </div>
            <div class="stat-box stat-compressed">
              <div class="st-label">压缩后体积</div>
              <div class="st-val st-val-neon">
                {{ formattedCompressedSize }}
              </div>
              <div class="st-sub">
                {{ compressedResult?.format.toUpperCase() }} · 质量
                {{ Math.round((compressedResult?.quality ?? 0) * 100) }}%
              </div>
            </div>
            <div class="stat-box stat-saved">
              <div class="st-label">节省</div>
              <div class="st-val st-val-green">-{{ savingsPercent }}%</div>
              <div class="st-sub">少了 {{ savingsKB }} KB</div>
            </div>
            <div class="stat-download">
              <button
                class="btn-download"
                :disabled="!compressedResult || isProcessing"
                @click="downloadCompressed"
              >
                <span>下载压缩图片</span>
                <small v-if="compressedResult"
                  >{{ compressedResult.format.toUpperCase() }} ·
                  {{ formattedCompressedSize }}</small
                >
              </button>
            </div>
          </div>
        </section>
      </template>
    </div>

    <!-- ============ 全屏放大对比 Overlay ============ -->
    <div
      v-if="showFullscreen"
      class="fs-overlay"
      @mousedown="onFsMouseDown"
      @touchstart.passive="() => (isFullscreenDragging = true)"
    >
      <div class="fs-toolbar">
        <div class="fs-left">
          <span class="fs-chip fs-chip-c"
            >压缩后 · {{ formattedCompressedSize }}</span
          >
          <div class="fs-vs">对比</div>
          <span class="fs-chip fs-chip-o"
            >原图 · {{ formattedOriginalSize }}</span
          >
        </div>
        <div class="fs-right">
          <span class="fs-tip">拖动分隔线对比 · Esc 或点击空白处关闭</span>
          <button class="fs-close" @click.stop="closeFullscreen" title="关闭">
            关闭
          </button>
        </div>
      </div>
      <div
        class="fs-stage"
        :style="{ aspectRatio: stageAspectRatio }"
        @mousemove="onFsMove"
        @touchmove="onFsMove"
        @mouseup="onFsUp"
        @touchend="onFsUp"
      >
        <img
          v-if="originalImage"
          :src="originalImage.url"
          class="compare-img img-orig"
          :style="{ clipPath: fsOrigClipPath }"
          draggable="false"
          alt="原图"
        />
        <img
          v-if="compressedResult"
          :src="compressedResult.url"
          class="compare-img img-comp"
          :style="{ clipPath: fsCompClipPath }"
          draggable="false"
          alt="压缩后"
        />
        <div
          class="cmp-tag tag-comp"
          :style="{ maxWidth: `calc(${ fullscreenCompare }% - 12px)` }"
        >
          压缩后 · {{ formattedCompressedSize }}
        </div>
        <div
          class="cmp-tag tag-orig"
          :style="{
            maxWidth: `calc(${ 100 - fullscreenCompare }% - 12px)`,
          }"
        >
          原图 · {{ formattedOriginalSize }}
        </div>
        <div
          class="compare-divider fs-divider"
          :style="{ left: `${fullscreenCompare }%` }"
        >
          <div class="divider-line"></div>
          <div class="divider-handle">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
              <polyline points="9 18 3 12 9 6" transform="translate(12 0)" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* =========================================================
   设计风格：回到上一版 —— 多独立玻璃卡片，空间透气更大气
   - Neon green 主色 + 暗色玻璃态
   - 44px sticky topbar + top: 60px 避让主站导航
   ========================================================= */
.tool-page {
  min-height: 100vh;
  padding-top: 96px; /* 主站导航 56px + 40px 上下呼吸间距，避免返回工具箱紧贴主菜单 */
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

/* ========= Topbar (sticky, 主站导航下面) ========= */
.topbar {
  position: sticky;
  top: 56px; /* 吸顶时对齐主站导航下沿 */
  z-index: 50;
  background: color-mix(in srgb, var(--color-bg-primary) 82%, transparent);
  border-bottom: 1px solid var(--color-border);
  border-radius: 12px 12px 0 0;
  backdrop-filter: saturate(180%) blur(14px);
  backdrop-filter: saturate(180%) blur(14px);
}

.topbar-inner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  max-width: 1080px;
  height: 52px;
  padding: 0 20px;
  margin: 0 auto;
}

.topbar-back {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
  text-decoration: none;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.2s;
}

.topbar-back:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
  box-shadow: 0 0 0 2px var(--color-neon-glow);
}

.topbar-title {
  display: inline-flex;
  flex-direction: column;
  gap: 0;
  align-items: center;
  justify-self: center;
  margin: 0;
  line-height: 1.1;
}

.t-main {
  font-size: 0.98rem;
  font-weight: 900;
  letter-spacing: -0.01em;
  background: linear-gradient(
    135deg,
    var(--color-text-primary) 0%,
    var(--color-neon) 100%
  );
  background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.t-sub {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--color-text-muted);
  -webkit-text-fill-color: var(--color-text-muted);
  letter-spacing: 0.02em;
}

.topbar-right {
  display: flex;
  justify-content: flex-end;
}

.pill-format {
  padding: 4px 12px;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 999px;
}

/* ========= Workspace ========= */
.tool-workspace {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1080px;
  padding: 18px 20px 40px;
  margin: 0 auto;
}

/* ================= Upload (上一版大气版) ================= */
.upload-section {
}

.upload-area {
  position: relative;
  padding: 44px 32px;
  overflow: hidden;
  cursor: pointer;
  background:
    radial-gradient(circle at 50% 0%, var(--color-neon-glow), transparent 60%),
    var(--color-bg-secondary);
  border: 2.5px dashed var(--color-border);
  border-radius: 20px;
  transition: all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.upload-area:hover {
  border-color: var(--color-neon-dim);
  box-shadow: 0 24px 60px -30px var(--color-neon-glow);
  transform: translateY(-2px);
}

.upload-area.drag-over {
  border-color: var(--color-neon);
  box-shadow: 0 0 40px var(--color-neon-glow);
  transform: translateY(-2px) scale(1.005);
}

.upload-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  text-align: center;
}

.upload-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-bottom: 2px;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1.5px solid var(--color-neon-dim);
  border-radius: 22px;
  animation: floatY 3.5s ease-in-out infinite;
}

@keyframes floatY {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-4px);
  }
}

.upload-text {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.upload-text .highlight {
  font-weight: 800;
  color: var(--color-neon);
}

.upload-text .or {
  margin: 0 10px;
  font-weight: 400;
  color: var(--color-text-muted);
}

.upload-hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.upload-actions-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 4px;
}

.feat {
  padding: 4px 10px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 999px;
}

.btn-pick {
  padding: 11px 26px;
  margin-top: 10px;
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--color-bg-primary);
  cursor: pointer;
  background: var(--color-neon);
  border: none;
  border-radius: 12px;
  box-shadow: 0 6px 18px var(--color-neon-glow);
  transition: all 0.25s;
}

.btn-pick:hover {
  box-shadow: 0 10px 26px var(--color-neon-glow);
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.hidden-input {
  display: none;
}

/* ================= Glass Card 通用 ================= */
.glass-card {
  position: relative;
  padding: 16px 18px;
  background: color-mix(in srgb, var(--color-bg-secondary) 78%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 4%) inset,
    0 16px 40px -26px rgb(0 0 0 / 50%);
  backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

/* ================= Card 1: Settings ================= */
.mode-tabs {
  display: inline-flex;
  width: 100%;
  padding: 4px;
  margin-bottom: 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
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
  background: var(--color-bg-primary);
}

.mode-tab.active {
  color: #000;
  background: var(--color-neon);
  box-shadow: 0 4px 14px var(--color-neon-glow);
}

.settings-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 18px;
}

@media (max-width: 720px) {
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

.setting-block {
}

.setting-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.setting-value {
  font-size: 0.82rem;
}

.text-neon-mono {
  font-family: var(--font-mono);
  font-weight: 800;
  color: var(--color-neon);
}

/* Scene presets */
.scene-presets {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

@media (max-width: 640px) {
  .scene-presets {
    grid-template-columns: repeat(3, 1fr);
  }
}

.scene-preset {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  justify-content: center;
  padding: 14px 10px;
  text-align: center;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.scene-preset:hover:not(.active) {
  border-color: var(--color-border-hover);
  box-shadow: 0 10px 20px -14px rgb(0 0 0 / 40%);
  transform: translateY(-2px);
}

.scene-preset.active {
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
  box-shadow:
    0 0 0 2.5px var(--color-neon-glow),
    0 10px 24px -16px var(--color-neon-glow);
  transform: translateY(-2px);
}

.sp-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.25;
}

.sp-name {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: 0.01em;
}

.sp-desc {
  font-size: 0.66rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.scene-preset.active .sp-name {
  color: var(--color-neon);
}

/* Slider */
.slider-wrap {
  position: relative;
}

.custom-slider {
  width: 100%;
  height: 7px;
  appearance: none;
  appearance: none;
  cursor: pointer;
  outline: none;
  background: linear-gradient(
    to right,
    var(--color-neon) 0%,
    var(--color-neon) var(--pct, 62%),
    var(--color-border) var(--pct, 62%),
    var(--color-border) 100%
  );
  border-radius: 4px;
}

.custom-slider::-webkit-slider-thumb {
  width: 20px;
  height: 20px;
  appearance: none;
  appearance: none;
  cursor: pointer;
  background: var(--color-neon);
  border: 3px solid var(--color-bg-secondary);
  border-radius: 50%;
  box-shadow:
    0 0 0 2.5px var(--color-neon-dim),
    0 3px 10px rgb(0 0 0 / 22%);
  transition: transform 0.15s;
}

.custom-slider::-webkit-slider-thumb:hover {
  transform: scale(1.12);
}

.custom-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  cursor: pointer;
  background: var(--color-neon);
  border: 3px solid var(--color-bg-secondary);
  border-radius: 50%;
}

.slider-hints {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.size-input {
  width: 64px;
  padding: 2px 7px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--color-neon);
  text-align: right;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 7px;
}

.size-input:focus {
  outline: none;
  border-color: var(--color-neon);
  box-shadow: 0 0 0 2px var(--color-neon-glow);
}

.size-presets {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

@media (max-width: 720px) {
  .size-presets {
    grid-template-columns: repeat(3, 1fr);
  }
}

.size-preset {
  padding: 7px 2px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.22s;
}

.size-preset:hover:not(.active) {
  color: var(--color-text-primary);
  border-color: var(--color-border-hover);
}

.size-preset.active {
  color: #000;
  background: var(--color-neon);
  border-color: var(--color-neon);
  box-shadow: 0 0 0 2.5px var(--color-neon-glow);
}

/* Format picker — 大气三按钮 */
.format-picker {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.format-btn {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  padding: 14px 8px;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.format-btn:hover:not(.active) {
  border-color: var(--color-border-hover);
  box-shadow: 0 12px 22px -16px rgb(0 0 0 / 40%);
  transform: translateY(-2px);
}

.format-btn.active {
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
  box-shadow: 0 0 0 2.5px var(--color-neon-glow);
  transform: translateY(-2px);
}

.fmt-name {
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
}

.format-btn.active .fmt-name {
  color: var(--color-neon);
}

/* 高对比度明暗适配描述 */
.fmt-desc {
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.3;
  text-align: center;
}

/* Light theme 默认 */
.fmt-desc {
  color: #475569;
} /* slate-600 */

/* Dark theme */
:global(.dark) .fmt-desc,
.dark .fmt-desc {
  color: #cbd5e1;
} /* slate-300 */

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
  font-family: var(--font-mono);
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

/* ================= Card 3: Compare ================= */
.card-compare {
  padding: 14px;
}

.compare-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.compare-titles {
  display: flex;
  gap: 12px;
  align-items: center;
}

.ct {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.ct-val {
  font-family: var(--font-mono);
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--color-text-primary);
}

.ct-comp .ct-val {
  color: var(--color-neon);
}

.ct-vs {
  padding: 3px 10px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 900;
  color: var(--color-bg-primary);
  background: var(--color-text-secondary);
  border-radius: 6px;
}

.ct-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.ct-dot-c {
  background: var(--color-neon);
  box-shadow: 0 0 8px var(--color-neon);
}

.ct-dot-o {
  background: #60a5fa;
  box-shadow: 0 0 8px #60a5fa;
}

.compare-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.btn-tool {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  cursor: pointer;
  user-select: none;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-tool:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.btn-tool:active {
  transform: translateY(1px);
}

/* ============ Stage ============ */
.compare-stage {
  position: relative;
  width: 100%;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  background:
    conic-gradient(var(--color-bg-card) 25%, transparent 25%) 0 0 / 16px 16px,
    conic-gradient(transparent 75%, var(--color-bg-card) 75%) 0 0 / 16px 16px,
    conic-gradient(transparent 75%, var(--color-bg-card) 75%) 8px -8px / 16px
      16px,
    conic-gradient(var(--color-bg-card) 25%, transparent 25%) 8px -8px / 16px
      16px,
    var(--color-bg-secondary);
  border-radius: 14px;
}

.compare-stage.processing {
  pointer-events: none;
  opacity: 0.82;
}

.compare-img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
  object-fit: contain;
  object-position: center center;
  -webkit-user-drag: none;
}

.img-orig {
  z-index: 1;
}

.img-comp {
  z-index: 2;
}

.cmp-tag {
  position: absolute;
  top: 10px;
  z-index: 6;
  padding: 5px 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
  pointer-events: none;
  border-radius: 8px;
  backdrop-filter: blur(7px);
  backdrop-filter: blur(7px);
}

.tag-comp {
  left: 10px;
  color: #000;
  background: color-mix(in srgb, var(--color-neon) 88%, transparent);
}

.tag-orig {
  right: 10px;
  color: #fff;
  background: rgb(15 23 42 / 78%);
  border: 1px solid rgb(255 255 255 / 12%);
}

.processing-overlay {
  position: absolute;
  inset: 0;
  z-index: 9;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  color: #fff;
  background: rgb(0 0 0 / 38%);
  backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3.5px solid rgb(255 255 255 / 25%);
  border-top-color: var(--color-neon);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Divider */
.compare-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 8;
  width: 0;
  cursor: col-resize;
  transform: translateX(-50%);
}

.divider-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2.5px;
  background: #fff;
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 28%),
    0 0 14px rgb(255 255 255 / 45%);
  transform: translateX(-50%);
}

.divider-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  color: #000;
  cursor: grab;
  background: #fff;
  border-radius: 50%;
  box-shadow:
    0 0 0 2.5px rgb(0 0 0 / 20%),
    0 6px 16px rgb(0 0 0 / 32%);
  transform: translate(-50%, -50%);
  transition: transform 0.15s;
}

.divider-handle:hover {
  color: #000;
  background: var(--color-neon);
  transform: translate(-50%, -50%) scale(1.08);
}

.divider-handle:active {
  cursor: grabbing;
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
  font-family: var(--font-mono);
  font-size: 1.08rem;
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

:global(.dark) .stat-saved .st-val-green,
.dark .stat-saved .st-val-green {
  color: #4ade80;
}

.stat-download {
  display: flex;
  justify-content: flex-end;
}

.btn-download {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 14px 24px;
  font-size: 0.94rem;
  font-weight: 800;
  line-height: 1;
  color: var(--color-bg-primary);
  letter-spacing: 0.01em;
  cursor: pointer;
  background: var(--color-neon);
  border: none;
  border-radius: 13px;
  box-shadow: 0 8px 22px var(--color-neon-glow);
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.btn-download small {
  padding: 2px 7px;
  font-size: 0.68rem;
  font-weight: 600;
  color: #000;
  background: rgb(0 0 0 / 18%);
  border-radius: 999px;
  opacity: 0.8;
}

.btn-download:disabled {
  cursor: not-allowed;
  box-shadow: none !important;
  opacity: 0.5;
  transform: none !important;
}

.btn-download:hover:not(:disabled) {
  box-shadow: 0 12px 30px var(--color-neon-glow);
  filter: brightness(1.06);
  transform: translateY(-1px);
}

/* ============ 全屏放大对比 Overlay ============ */
.fs-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  padding: 16px 24px 24px;
  background:
    radial-gradient(circle at 50% 30%, rgb(0 0 0 / 60%), rgb(0 0 0 / 90%)),
    var(--color-bg-primary);
  animation: fadeIn 0.22s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.fs-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  margin-bottom: 14px;
  background: color-mix(in srgb, var(--color-bg-secondary) 85%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.fs-left {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.fs-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 999px;
}

.fs-chip-c {
  color: #000;
  background: var(--color-neon);
  box-shadow: 0 0 0 3px var(--color-neon-glow);
}

.fs-chip-o {
  color: #fff;
  background: #2563eb;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 25%);
}

.fs-vs {
  padding: 4px 12px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 900;
  color: var(--color-text-primary);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 999px;
}

.fs-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.fs-tip {
  font-size: 0.74rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.fs-close {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.01em;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.2s;
}

.fs-close:hover {
  color: #f87171;
  background: rgb(239 68 68 / 15%);
  border-color: rgb(239 68 68 / 30%);
}

.fs-stage {
  position: relative;
  width: 100%;
  max-width: 100%;
  max-height: calc(100vh - 120px);
  margin: 0 auto;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  background:
    conic-gradient(var(--color-bg-card) 25%, transparent 25%) 0 0 / 18px 18px,
    conic-gradient(transparent 75%, var(--color-bg-card) 75%) 0 0 / 18px 18px,
    conic-gradient(transparent 75%, var(--color-bg-card) 75%) 9px -9px / 18px
      18px,
    conic-gradient(var(--color-bg-card) 25%, transparent 25%) 9px -9px / 18px
      18px,
    #0f172a;
  border-radius: 16px;
}

.fs-divider .divider-handle {
  width: 44px;
  height: 44px;
}

.fs-divider .divider-line {
  width: 3px;
}

.fs-stage .cmp-tag {
  top: 12px;
  padding: 6px 12px;
  font-size: 0.8rem;
}

.fs-stage .tag-comp {
  left: 12px;
}

.fs-stage .tag-orig {
  right: 12px;
}
</style>
