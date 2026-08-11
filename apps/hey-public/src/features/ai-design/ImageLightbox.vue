<script setup lang="ts">
import type { AiGeneratedImage } from '#/store/aiDesignStore';

import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  image: AiGeneratedImage | null;
  selectedImageId: null | string;
  visible: boolean;
}>();
const emit = defineEmits<{
  close: [];
  download: [url: string, title: string];
  modify: [img: AiGeneratedImage];
  select: [img: AiGeneratedImage];
}>();
/** 缩放档位（滚轮以 1.15 倍步进，按钮 ±25%），支持复位 */
const MIN_SCALE = 0.25;
const MAX_SCALE = 8;
const scale = ref(1);

function clampScale(v: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));
}

function zoomIn() {
  scale.value = clampScale(scale.value * 1.25);
}

function zoomOut() {
  scale.value = clampScale(scale.value / 1.25);
}

function resetZoom() {
  scale.value = 1;
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  scale.value = clampScale(
    e.deltaY < 0 ? scale.value * 1.15 : scale.value / 1.15,
  );
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) {
    emit('close');
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

watch(
  () => props.visible,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : '';
    if (!v) resetZoom();
  },
);

watch(
  () => props.image?.id,
  () => {
    resetZoom();
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible && image"
      class="lightbox-backdrop"
      @click.self="emit('close')"
    >
      <!-- Close -->
      <button class="lightbox-close" @click="emit('close')">
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Title -->
      <div class="lightbox-title">{{ image.title }}</div>

      <!-- Zoom controls -->
      <div class="lightbox-zoom">
        <button class="lightbox-zoom-btn" title="缩小" @click="zoomOut">
          −
        </button>
        <span class="lightbox-zoom-percent"
          >{{ Math.round(scale * 100) }}%</span
        >
        <button class="lightbox-zoom-btn" title="放大" @click="zoomIn">
          ＋
        </button>
        <button
          class="lightbox-zoom-btn lightbox-zoom-reset"
          :class="{ disabled: scale === 1 }"
          title="复原（100%）"
          :disabled="scale === 1"
          @click="resetZoom"
        >
          复原
        </button>
      </div>

      <!-- Image：滚轮缩放仅对图片生效；点击图片以外的区域返回对话 -->
      <div class="lightbox-stage" @click="emit('close')">
        <img
          :src="image.url"
          :alt="image.title"
          class="lightbox-image"
          :style="{ transform: `scale(${scale})` }"
          draggable="false"
          @click.stop
          @wheel.stop="onWheel"
        />
      </div>

      <!-- Action bar -->
      <div class="lightbox-actions">
        <button
          class="lightbox-action-btn"
          @click="
            emit('modify', image);
            emit('close');
          "
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          编辑
        </button>
        <button
          class="lightbox-action-btn"
          @click="emit('download', image.url, image.title)"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          下载
        </button>
        <button
          class="lightbox-action-btn"
          :class="[{ selected: selectedImageId === image.id }]"
          @click="emit('select', image)"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {{ selectedImageId === image.id ? '已选择' : '选择此方案' }}
        </button>
      </div>

      <!-- ESC hint -->
      <div class="lightbox-hint">ESC 关闭</div>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 92%);
  backdrop-filter: blur(12px);
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #fff;
  cursor: pointer;
  background: rgb(255 255 255 / 10%);
  border: none;
  border-radius: 50%;
  transition: background 0.2s;
}

.lightbox-close:hover {
  background: rgb(255 255 255 / 20%);
}

.lightbox-title {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 10;
  font-size: 0.9rem;
  font-weight: 500;
  color: #fff;
}

.lightbox-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: zoom-in;
}

.lightbox-zoom {
  position: absolute;
  top: 20px;
  left: 50%;
  z-index: 10;
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px 10px;
  background: rgb(255 255 255 / 10%);
  border-radius: 999px;
  backdrop-filter: blur(8px);
  transform: translateX(-50%);
}

.lightbox-zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  font-size: 0.8rem;
  color: #fff;
  cursor: pointer;
  background: rgb(255 255 255 / 10%);
  border: none;
  border-radius: 999px;
  transition: background 0.2s;
}

.lightbox-zoom-btn:hover:not(:disabled) {
  background: rgb(255 255 255 / 24%);
}

.lightbox-zoom-btn.disabled,
.lightbox-zoom-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.lightbox-zoom-reset {
  font-size: 0.7rem;
  color: var(--color-neon, #7df9ff);
  background: rgb(125 249 255 / 12%);
}

.lightbox-zoom-percent {
  min-width: 44px;
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-align: center;
}

.lightbox-image {
  max-width: 94vw;
  max-height: 88vh;
  user-select: none;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgb(0 0 0 / 50%);
  transform-origin: center center;
  transition: transform 0.12s ease-out;
}

.lightbox-actions {
  position: absolute;
  bottom: 28px;
  left: 50%;
  z-index: 10;
  display: flex;
  gap: 12px;
  transform: translateX(-50%);
}

.lightbox-action-btn {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 10px 18px;
  font-size: 0.82rem;
  color: #fff;
  cursor: pointer;
  background: rgb(255 255 255 / 10%);
  border: none;
  border-radius: 12px;
  backdrop-filter: blur(8px);
  transition: background 0.2s;
}

.lightbox-action-btn:hover {
  background: rgb(255 255 255 / 20%);
}

.lightbox-action-btn.selected {
  color: var(--color-bg-primary);
  background: var(--color-neon);
}

.lightbox-hint {
  position: absolute;
  right: 28px;
  bottom: 28px;
  z-index: 10;
  font-size: 0.7rem;
  color: rgb(255 255 255 / 30%);
}
</style>
