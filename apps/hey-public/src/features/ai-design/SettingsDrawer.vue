<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import { useAiDesignStore } from '#/store/aiDesignStore';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const store = useAiDesignStore();

const resolutionOptions = [
  { value: '1k', label: '1K', desc: '1024×1024' },
  { value: '2k', label: '2K', desc: '2048×2048' },
  { value: '4k', label: '4K', desc: '4096×4096' },
];

const currentResolution = computed({
  get: () => store.resolution || '1k',
  set: (v: string) => {
    store.resolution = v;
  },
});

// Hover preview state — dynamic positioning
const hoveredStylePreview = ref<null | string>(null);
const hoveredPalettePreview = ref<null | string>(null);
const previewPos = ref<null | { left: number; top: number }>(null);

const PREVIEW_W = 220;
const PREVIEW_H = 230;
const GAP = 10;

// Compute dynamic position for hover preview based on trigger element rect
function computePreviewPos(target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top: number;
  // Prefer below; if not enough space, place above
  const belowSpace = vh - rect.bottom;
  const aboveSpace = rect.top;
  if (belowSpace >= PREVIEW_H + GAP || belowSpace >= aboveSpace) {
    top = rect.bottom + GAP;
    if (top + PREVIEW_H > vh) top = vh - PREVIEW_H - GAP;
  } else {
    top = rect.top - PREVIEW_H - GAP;
    if (top < GAP) top = GAP;
  }

  let left: number;
  // Prefer right-aligned to button's right edge; if not enough space on right, place to left
  const rightAligned = rect.right - PREVIEW_W;
  const rightSpace = vw - rect.right;
  const leftSpace = rect.left;
  if (rightAligned >= GAP) {
    left = rightAligned;
  } else if (rightSpace >= PREVIEW_W + GAP || rightSpace >= leftSpace) {
    left = rect.right + GAP;
    if (left + PREVIEW_W > vw) left = vw - PREVIEW_W - GAP;
  } else {
    left = rect.left - PREVIEW_W - GAP;
    if (left < GAP) left = GAP;
  }

  previewPos.value = { top, left };
}

function onStyleEnter(event: MouseEvent, preview: string) {
  hoveredStylePreview.value = preview;
  hoveredPalettePreview.value = null;
  const target = event.currentTarget as HTMLElement;
  nextTick(() => computePreviewPos(target));
}

function onPaletteEnter(event: MouseEvent, preview: string) {
  hoveredPalettePreview.value = preview;
  hoveredStylePreview.value = null;
  const target = event.currentTarget as HTMLElement;
  nextTick(() => computePreviewPos(target));
}

function clearHover() {
  hoveredStylePreview.value = null;
  hoveredPalettePreview.value = null;
  previewPos.value = null;
}

const currentStylePreset = computed(() =>
  store.stylePresets.find((s) => s.preview === hoveredStylePreview.value),
);
const currentPalette = computed(() =>
  store.colorPalettes.find((p) => p.preview === hoveredPalettePreview.value),
);

// Select design type — auto-apply default ratio
function selectDesignType(label: string, w: number, h: number) {
  store.selectedDesignType = label;
  store.designWidth = w;
  store.designHeight = h;
  const defaultRatio = store.designTypeRatios[label];
  if (defaultRatio) {
    store.selectedAspectRatio = defaultRatio;
    applyRatio(defaultRatio, w);
  }
}

// Apply aspect ratio to current dimensions
function applyRatio(ratio: string, baseW?: number) {
  store.selectedAspectRatio = ratio;
  if (ratio === 'auto' || ratio === 'custom') return;

  const parts = ratio.split(':');
  if (parts.length !== 2) return;
  const [rwStr, rhStr] = parts as [string, string];
  const rw = Number.parseFloat(rwStr);
  const rh = Number.parseFloat(rhStr);
  if (!rw || !rh) return;

  const w = baseW ?? store.designWidth;
  store.designWidth = Math.round(w);
  store.designHeight = Math.round(((w * rh) / rw) * 10) / 10;
}

function resetSettings() {
  selectDesignType('门头', 300, 150);
  store.selectedStyle = 'flat';
  store.selectedPalette = 'pal-3';
  store.generateCount = 1;
  store.selectedModel = 'gpt-image2';
  currentResolution.value = '1k';
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div v-if="visible" class="settings-overlay" @click.self="emit('close')">
        <div class="settings-drawer">
          <!-- Header -->
          <div class="settings-header">
            <h2 class="settings-title">设计参数</h2>
            <button class="settings-close" @click="emit('close')">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="settings-body">
            <!-- ═══ 设计类型 ═══ -->
            <section class="settings-section">
              <h3 class="settings-section-title">设计类型</h3>
              <div class="settings-type-grid">
                <button
                  v-for="tpl in store.sizePresets"
                  :key="tpl.label"
                  class="settings-type-btn"
                  :class="{ active: store.selectedDesignType === tpl.label }"
                  @click="selectDesignType(tpl.label, tpl.w, tpl.h)"
                >
                  <span class="type-name">{{ tpl.label }}</span>
                  <span class="type-size">{{ tpl.w }}×{{ tpl.h }}cm</span>
                </button>
              </div>
            </section>

            <!-- ═══ 场景设计比例 ═══ -->
            <section class="settings-section">
              <h3 class="settings-section-title">场景设计比例</h3>
              <!-- Preset ratios row (mutually exclusive with custom) -->
              <div class="ratio-grid">
                <button
                  v-for="r in store.aspectRatioOptions"
                  :key="r.value"
                  class="ratio-btn"
                  :class="{ active: store.selectedAspectRatio === r.value }"
                  @click="applyRatio(r.value)"
                >
                  {{ r.label }}
                </button>
              </div>
              <!-- Custom size row (separate line, inputs after the custom button) -->
              <div
                class="custom-size-row"
                :class="{ active: store.selectedAspectRatio === 'custom' }"
              >
                <button
                  class="ratio-btn custom-btn"
                  :class="{ active: store.selectedAspectRatio === 'custom' }"
                  @click="store.selectedAspectRatio = 'custom'"
                  title="自定义尺寸（与预设比例互斥）"
                >
                  自定义
                </button>
                <div
                  class="custom-inputs"
                  :class="{ disabled: store.selectedAspectRatio !== 'custom' }"
                >
                  <input
                    v-model.number="store.designWidth"
                    type="number"
                    class="settings-input"
                    placeholder="宽"
                    :disabled="store.selectedAspectRatio !== 'custom'"
                  />
                  <span class="settings-size-x">×</span>
                  <input
                    v-model.number="store.designHeight"
                    type="number"
                    class="settings-input"
                    placeholder="高"
                    :disabled="store.selectedAspectRatio !== 'custom'"
                  />
                  <span class="settings-size-unit">cm</span>
                </div>
              </div>
            </section>

            <!-- ═══ 清晰度（在尺寸后面）═══ -->
            <section class="settings-section">
              <h3 class="settings-section-title">输出清晰度</h3>
              <div class="settings-resolution-row">
                <button
                  v-for="r in resolutionOptions"
                  :key="r.value"
                  class="settings-resolution-btn"
                  :class="{ active: currentResolution === r.value }"
                  @click="currentResolution = r.value"
                >
                  <span class="resolution-label">{{ r.label }}</span>
                  <span class="resolution-desc">{{ r.desc }}</span>
                </button>
              </div>
            </section>

            <!-- ═══ 设计风格（悬停预览案例图）═══ -->
            <section class="settings-section">
              <h3 class="settings-section-title">
                设计风格 <span class="section-hint">悬停查看案例</span>
              </h3>
              <div class="style-grid-compact">
                <button
                  v-for="s in store.stylePresets"
                  :key="s.id"
                  class="style-chip"
                  :class="{ active: store.selectedStyle === s.id }"
                  @mouseenter="onStyleEnter($event, s.preview)"
                  @mouseleave="clearHover"
                  @click="store.selectedStyle = s.id"
                >
                  {{ s.name }}
                </button>
              </div>
            </section>

            <!-- ═══ 配色方案（悬停预览效果图）═══ -->
            <section class="settings-section">
              <h3 class="settings-section-title">
                配色方案 <span class="section-hint">悬停查看效果</span>
              </h3>
              <div class="palette-grid-compact">
                <button
                  v-for="p in store.colorPalettes"
                  :key="p.id"
                  class="palette-chip"
                  :class="{ active: store.selectedPalette === p.id }"
                  @mouseenter="onPaletteEnter($event, p.preview)"
                  @mouseleave="clearHover"
                  @click="store.selectedPalette = p.id"
                >
                  <span class="palette-dots">
                    <span
                      v-for="(c, i) in p.colors.slice(0, 4)"
                      :key="i"
                      class="palette-dot"
                      :style="{ background: c }"
                    ></span>
                  </span>
                  <span class="palette-chip-name">{{ p.name }}</span>
                </button>
              </div>
            </section>

            <!-- ═══ 高级设置 ═══ -->
            <section class="settings-section">
              <h3 class="settings-section-title">高级设置</h3>
              <div class="settings-advanced">
                <label class="settings-advanced-row">
                  <span class="advanced-label">生成数量</span>
                  <select
                    v-model.number="store.generateCount"
                    class="settings-select"
                  >
                    <option v-for="n in store.countOptions" :key="n" :value="n">
                      {{ n }} 张
                    </option>
                  </select>
                </label>
                <label class="settings-advanced-row">
                  <span class="advanced-label">默认模型</span>
                  <select v-model="store.selectedModel" class="settings-select">
                    <option
                      v-for="m in store.modelOptions"
                      :key="m.id"
                      :value="m.id"
                      :disabled="m.disabled"
                    >
                      {{ m.label }}{{ m.recommended ? ' (推荐)' : '' }}
                    </option>
                  </select>
                </label>
              </div>
            </section>
          </div>

          <!-- Footer -->
          <div class="settings-footer">
            <button class="settings-reset-btn" @click="resetSettings">
              恢复默认
            </button>
            <button class="settings-apply-btn" @click="emit('close')">
              应用设置
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Dynamic hover preview (teleported to body for free positioning, outside drawer transition) -->
  <Teleport to="body">
    <Transition name="preview-fade">
      <div
        v-if="previewPos && (hoveredStylePreview || hoveredPalettePreview)"
        class="hover-preview-popup"
        :style="{
          top: `${previewPos.top}px`,
          left: `${previewPos.left}px`,
          width: `${PREVIEW_W}px`,
        }"
        @mouseenter="clearHover"
      >
        <div class="preview-header">
          <span class="preview-name">
            {{
              currentStylePreset
                ? `${currentStylePreset.name}风格`
                : currentPalette
                  ? `${currentPalette.name}配色`
                  : ''
            }}
          </span>
          <span v-if="currentStylePreset" class="preview-tag">案例参考</span>
          <span v-else-if="currentPalette" class="palette-preview-dots">
            <span
              v-for="(c, i) in currentPalette?.colors.slice(0, 5)"
              :key="i"
              class="palette-preview-dot"
              :style="{ background: c }"
            ></span>
          </span>
        </div>
        <img
          :src="hoveredStylePreview || hoveredPalettePreview || ''"
          class="preview-img"
          :alt="currentStylePreset ? '风格案例' : '配色效果'"
        />
        <div class="preview-caption">
          {{
            currentStylePreset
              ? currentStylePreset.description
              : '实际应用效果参考'
          }}
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  justify-content: flex-end;
  background: rgb(0 0 0 / 30%);
}

.settings-drawer {
  display: flex;
  flex-direction: column;
  width: 400px;
  max-width: 90vw;
  height: 100%;
  background: var(--color-bg-secondary);
  border-left: 1px solid var(--color-border);
  box-shadow: -12px 0 48px rgb(0 0 0 / 22%);
  animation: drawer-slide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

:global(.dark) .settings-drawer {
  box-shadow: -12px 0 48px rgb(0 0 0 / 50%);
}

@keyframes drawer-slide {
  from {
    opacity: 0;
    transform: translateX(40px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.settings-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  background: linear-gradient(135deg, rgb(122 158 0 / 6%), transparent);
  border-bottom: 1px solid var(--color-border);
}

.settings-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: transparent;
  letter-spacing: -0.01em;
  background: linear-gradient(
    135deg,
    var(--color-text-primary) 0%,
    var(--color-neon) 100%
  );
  background-clip: text;
}

.settings-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--color-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 10px;
  transition: all 0.2s;
}

.settings-close:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-card);
  transform: rotate(90deg);
}

.settings-close:active {
  transform: rotate(90deg) scale(0.92);
  transition-duration: 0.06s;
}

.settings-body {
  flex: 1;
  padding: 18px 22px;
  overflow-y: auto;
  scrollbar-color: var(--color-border) transparent;
  scrollbar-width: thin;
}

.settings-body::-webkit-scrollbar {
  width: 4px;
}

.settings-body::-webkit-scrollbar-track {
  background: transparent;
}

.settings-body::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
  transition: background 0.2s;
}

.settings-body:hover::-webkit-scrollbar-thumb {
  background: var(--color-neon-dim);
}

.settings-section {
  margin-bottom: 22px;
}

.settings-section + .settings-section {
  padding-top: 18px;
  border-top: 1px solid var(--color-border);
}

.settings-section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0 0 12px;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.section-hint {
  padding: 1px 6px;
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--color-neon);
  text-transform: none;
  letter-spacing: 0;
  background: var(--color-neon-glow);
  border-radius: 4px;
}

/* ═══ Type grid ═══ */
.settings-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}

.settings-type-btn {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  padding: 11px 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 11px;
  transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.settings-type-btn:hover {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
  box-shadow: 0 4px 14px rgb(122 158 0 / 10%);
  transform: translateY(-2px);
}

.settings-type-btn:active {
  transform: translateY(0) scale(0.96);
  transition-duration: 0.06s;
}

.settings-type-btn.active {
  color: #fff;
  background: linear-gradient(135deg, var(--color-neon), #5a7a00);
  border-color: var(--color-neon);
  box-shadow: 0 4px 16px var(--color-neon-glow);
}

:global(.dark) .settings-type-btn.active {
  background: linear-gradient(135deg, var(--color-neon), #a3cc00);
}

.type-name {
  font-size: 0.78rem;
  font-weight: 700;
}

.type-size {
  font-size: 0.58rem;
  color: var(--color-text-muted);
  letter-spacing: 0.02em;
}

.settings-type-btn.active .type-size {
  color: rgb(255 255 255 / 70%);
}

/* ═══ Ratio grid ═══ */
.ratio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 6px;
  margin-bottom: 12px;
}

.ratio-btn {
  padding: 8px 4px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-align: center;
  letter-spacing: 0.02em;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 9px;
  transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ratio-btn:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
  transform: translateY(-2px);
}

.ratio-btn:active {
  transform: translateY(0) scale(0.95);
  transition-duration: 0.06s;
}

.ratio-btn.active {
  color: #fff;
  background: linear-gradient(135deg, var(--color-neon), #5a7a00);
  border-color: var(--color-neon);
  box-shadow: 0 3px 12px var(--color-neon-glow);
}

:global(.dark) .ratio-btn.active {
  background: linear-gradient(135deg, var(--color-neon), #a3cc00);
}

/* ═══ Size inputs ═══ */
.settings-size-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Custom size row (separate line, mutually exclusive with presets) */
.custom-size-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  margin-top: 8px;
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  transition: all 0.2s;
}

.custom-size-row.active {
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
  border-style: solid;
}

.custom-btn {
  flex-shrink: 0;
}

.custom-inputs {
  display: flex;
  flex: 1;
  gap: 6px;
  align-items: center;
  min-width: 0;
  transition: opacity 0.2s;
}

.custom-inputs.disabled {
  pointer-events: none;
  opacity: 0.4;
}

.settings-input {
  width: 72px;
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
  outline: none;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.2s;
}

.settings-input:focus {
  border-color: var(--color-neon);
  box-shadow: 0 0 0 3px var(--color-neon-glow);
}

.settings-size-x {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.settings-size-unit {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

/* ═══ Resolution ═══ */
.settings-resolution-row {
  display: flex;
  gap: 7px;
}

.settings-resolution-btn {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  padding: 12px 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 11px;
  transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.settings-resolution-btn:hover {
  border-color: var(--color-neon-dim);
  box-shadow: 0 4px 14px rgb(122 158 0 / 10%);
  transform: translateY(-2px);
}

.settings-resolution-btn:active {
  transform: translateY(0) scale(0.96);
  transition-duration: 0.06s;
}

.settings-resolution-btn.active {
  color: #fff;
  background: linear-gradient(135deg, var(--color-neon), #5a7a00);
  border-color: var(--color-neon);
  box-shadow: 0 4px 16px var(--color-neon-glow);
}

:global(.dark) .settings-resolution-btn.active {
  background: linear-gradient(135deg, var(--color-neon), #a3cc00);
}

.resolution-label {
  font-size: 0.9rem;
  font-weight: 800;
}

.resolution-desc {
  font-size: 0.6rem;
  color: var(--color-text-muted);
}

.settings-resolution-btn.active .resolution-desc {
  color: rgb(255 255 255 / 65%);
}

/* ═══ Style grid (compact with hover preview) ═══ */
.style-grid-compact {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 6px;
}

.style-chip {
  position: relative;
  padding: 8px 6px;
  overflow: hidden;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-align: center;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 9px;
  transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.style-chip::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: linear-gradient(135deg, var(--color-neon) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.2s;
}

.style-chip:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
  box-shadow: 0 4px 14px rgb(122 158 0 / 12%);
  transform: translateY(-2px);
}

.style-chip:active {
  transform: translateY(0) scale(0.95);
  transition-duration: 0.06s;
}

.style-chip:hover::before {
  opacity: 0.08;
}

.style-chip.active {
  color: #fff;
  background: linear-gradient(135deg, var(--color-neon), #5a7a00);
  border-color: var(--color-neon);
  box-shadow: 0 4px 14px var(--color-neon-glow);
}

:global(.dark) .style-chip.active {
  background: linear-gradient(135deg, var(--color-neon), #a3cc00);
}

/* Style preview popup — dynamic positioning (teleported to body) */
.hover-preview-popup {
  position: fixed;
  z-index: 500;
  padding: 8px;
  overflow: hidden;
  pointer-events: none;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-neon-dim);
  border-radius: 14px;
  box-shadow:
    0 12px 32px rgb(0 0 0 / 28%),
    0 0 0 3px var(--color-neon-glow);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 6px 6px;
}

.preview-name {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-neon);
  letter-spacing: 0.02em;
}

.preview-tag {
  padding: 1px 7px;
  font-size: 0.58rem;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
  background: var(--color-bg-primary);
  border-radius: 4px;
}

.palette-preview-dots {
  display: flex;
  gap: 3px;
}

.palette-preview-dot {
  width: 10px;
  height: 10px;
  border: 1px solid rgb(0 0 0 / 12%);
  border-radius: 50%;
}

.preview-img {
  display: block;
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 10px;
  transition: transform 0.4s ease;
}

.hover-preview-popup:hover .preview-img {
  transform: scale(1.04);
}

.preview-caption {
  padding: 0 4px 4px;
  margin-top: 8px;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-text-secondary);
  text-align: center;
}

/* ═══ Palette grid (compact with hover preview) ═══ */
.palette-grid-compact {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 6px;
}

.palette-chip {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  padding: 8px 4px 7px;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 2px solid transparent;
  border-radius: 10px;
  transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.palette-chip:hover {
  border-color: var(--color-neon-dim);
  box-shadow: 0 4px 14px rgb(122 158 0 / 10%);
  transform: translateY(-2px);
}

.palette-chip:active {
  transform: translateY(0) scale(0.95);
  transition-duration: 0.06s;
}

.palette-chip.active {
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
  box-shadow: 0 4px 14px var(--color-neon-glow);
}

.palette-dots {
  display: flex;
  gap: 2px;
}

.palette-dot {
  width: 12px;
  height: 12px;
  border: 1px solid rgb(0 0 0 / 10%);
  border-radius: 50%;
  transition: transform 0.15s;
}

.palette-chip:hover .palette-dot {
  transform: scale(1.15);
}

.palette-chip-name {
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.palette-chip.active .palette-chip-name {
  color: var(--color-neon);
}

/* Palette preview popup — now uses shared .hover-preview-popup with dynamic positioning */

/* ═══ Advanced ═══ */
.settings-advanced {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-advanced-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: border-color 0.2s;
}

.settings-advanced-row:hover {
  border-color: var(--color-neon-dim);
}

.advanced-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.settings-select {
  padding: 6px 10px;
  font-size: 0.76rem;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  outline: none;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: border-color 0.2s;
}

.settings-select:focus {
  border-color: var(--color-neon);
}

/* ═══ Footer ═══ */
.settings-footer {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  padding: 16px 22px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
}

.settings-reset-btn {
  flex: 1;
  padding: 11px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 11px;
  transition: all 0.2s;
}

.settings-reset-btn:hover {
  color: #ef4444;
  background: rgb(239 68 68 / 5%);
  border-color: rgb(239 68 68 / 30%);
}

.settings-reset-btn:active {
  transform: scale(0.97);
  transition-duration: 0.06s;
}

.settings-apply-btn {
  flex: 2;
  padding: 11px;
  font-size: 0.84rem;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--color-neon), #5a7a00);
  border: none;
  border-radius: 11px;
  box-shadow: 0 4px 14px var(--color-neon-glow);
  transition: all 0.2s;
}

:global(.dark) .settings-apply-btn {
  background: linear-gradient(135deg, var(--color-neon), #a3cc00);
}

.settings-apply-btn:hover {
  box-shadow: 0 8px 24px var(--color-neon-glow);
  transform: translateY(-2px);
}

.settings-apply-btn:active {
  transform: translateY(0) scale(0.97);
  transition-duration: 0.06s;
}

/* ═══ Transitions ═══ */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.28s ease;
}

.drawer-fade-enter-active .settings-drawer,
.drawer-fade-leave-active .settings-drawer {
  transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-fade-enter-from .settings-drawer,
.drawer-fade-leave-to .settings-drawer {
  transform: translateX(100%);
}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.96);
}
</style>
