<script setup lang="ts">
import type { AiGeneratedImage } from '#/store/aiDesignStore';

import { onMounted, onUnmounted, watch } from 'vue';

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

      <!-- Image -->
      <img :src="image.url" :alt="image.title" class="lightbox-image" />

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

.lightbox-image {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgb(0 0 0 / 50%);
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
