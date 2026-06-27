<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

interface CardItem {
  id: number;
  imageUrl: string;
  title: string;
  description: string;
}

const items: CardItem[] = [
  {
    id: 1,
    imageUrl: '/images/carousel/ai1.svg',
    title: '赛博都市',
    description: 'AI 生成 · 概念艺术',
  },
  {
    id: 2,
    imageUrl: '/images/carousel/ai2.svg',
    title: '极简海报',
    description: 'AI 生成 · 品牌设计',
  },
  {
    id: 3,
    imageUrl: '/images/carousel/ai3.svg',
    title: '未来界面',
    description: 'AI 生成 · UI/UX',
  },
  {
    id: 4,
    imageUrl: '/images/carousel/ai4.svg',
    title: '梦幻场景',
    description: 'AI 生成 · 插画艺术',
  },
  {
    id: 5,
    imageUrl: '/images/carousel/ai5.svg',
    title: '产品渲染',
    description: 'AI 生成 · 3D 视觉',
  },
  {
    id: 6,
    imageUrl: '/images/carousel/ai6.svg',
    title: '霓虹街景',
    description: 'AI 生成 · 摄影风格',
  },
  {
    id: 7,
    imageUrl: '/images/carousel/ai7.svg',
    title: '抽象几何',
    description: 'AI 生成 · 图形设计',
  },
  {
    id: 8,
    imageUrl: '/images/carousel/ai8.svg',
    title: '潮流插画',
    description: 'AI 生成 · 商业插画',
  },
];

// 三倍列表：保证任意方向拖拽都有足够内容
const tripled = [...items, ...items, ...items];
const selectedItem = ref<CardItem | null>(null);

const trackRef = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);
const cursorGrabbing = ref(false);

let currentOffset = 0;
let dragStartX = 0;
let dragStartOffset = 0;
let animationId = 0;
let lastTime = 0;

const cardWidth = 280;
const gap = 24;
const step = cardWidth + gap; // 304px
const totalWidth = items.length * step;
const autoSpeed = 0.6; // 每帧自动滚动速度（px）

function applyTransform() {
  if (trackRef.value) {
    trackRef.value.style.transform = `translateX(${currentOffset}px)`;
  }
}

// 无限循环包裹
function wrapOffset() {
  // 从第二组中间开始（-totalWidth），保证左右都有内容
  if (currentOffset <= -totalWidth * 2) {
    currentOffset += totalWidth;
  }
  if (currentOffset >= 0) {
    currentOffset -= totalWidth;
  }
}

function animate(timestamp: number) {
  if (!lastTime) lastTime = timestamp;
  if (!isDragging.value) {
    // 自动向左滚动
    currentOffset -= autoSpeed;
    wrapOffset();
    applyTransform();
  }
  lastTime = timestamp;
  animationId = requestAnimationFrame(animate);
}

// === 拖拽交互 ===
function onMouseDown(e: MouseEvent) {
  // 不阻止点击弹窗
  isDragging.value = true;
  cursorGrabbing.value = true;
  dragStartX = e.clientX;
  dragStartOffset = currentOffset;
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  const delta = e.clientX - dragStartX;
  currentOffset = dragStartOffset + delta;
  wrapOffset();
  applyTransform();
}

function onMouseUp() {
  isDragging.value = false;
  cursorGrabbing.value = false;
}

// 全局 mouseup 兜底（鼠标拖到组件外松开）
function onGlobalMouseUp() {
  if (isDragging.value) {
    isDragging.value = false;
    cursorGrabbing.value = false;
  }
}

// 点击 vs 拖拽判断
let clickMoved = false;
function onCardMouseDown(e: MouseEvent) {
  clickMoved = false;
  onMouseDown(e);
}

function onCardMouseMove(e: MouseEvent) {
  if (isDragging.value) {
    const delta = Math.abs(e.clientX - dragStartX);
    if (delta > 3) clickMoved = true;
  }
  onMouseMove(e);
}

function onCardClick(item: CardItem) {
  if (!clickMoved) {
    openLightbox(item);
  }
}

function openLightbox(item: CardItem) {
  selectedItem.value = item;
}

function closeLightbox() {
  selectedItem.value = null;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeLightbox();
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('mouseup', onGlobalMouseUp);
  // 初始偏移：从第二组开始，保证左右都有内容
  currentOffset = -totalWidth;
  applyTransform();
  animationId = requestAnimationFrame(animate);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('mouseup', onGlobalMouseUp);
  cancelAnimationFrame(animationId);
});
</script>

<template>
  <div class="carousel-wrapper" :class="{ grabbing: cursorGrabbing }">
    <div
      ref="trackRef"
      class="carousel-track"
      @mousedown="onCardMouseDown"
      @mousemove="onCardMouseMove"
      @mouseup="onMouseUp"
    >
      <div
        v-for="(item, idx) in tripled"
        :key="`${item.id}-${idx}`"
        class="carousel-card"
        @click="onCardClick(item)"
      >
        <div class="card-3d">
          <img :src="item.imageUrl" :alt="item.title" loading="lazy" />
          <div class="card-info">
            <span class="card-title">{{ item.title }}</span>
            <span class="card-desc">{{ item.description }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 左右渐变遮罩 -->
    <div class="carousel-fade-left"></div>
    <div class="carousel-fade-right"></div>
  </div>

  <!-- 弹窗 -->
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="selectedItem"
        class="lightbox-overlay"
        @click.self="closeLightbox"
      >
        <div class="lightbox-content">
          <button
            class="lightbox-close"
            @click="closeLightbox"
            aria-label="关闭"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            :src="selectedItem.imageUrl"
            :alt="selectedItem.title"
            class="lightbox-image"
          />
          <div class="lightbox-caption">
            <h3>{{ selectedItem.title }}</h3>
            <p>{{ selectedItem.description }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.carousel-wrapper {
  position: relative;
  width: 100%;
  padding: 12px 0;
  overflow: hidden;
  user-select: none;
}

.carousel-wrapper.grabbing {
  cursor: grabbing;
}

.carousel-track {
  display: flex;
  gap: 24px;
  width: max-content;
  cursor: grab;
  will-change: transform;
}

.carousel-card {
  flex-shrink: 0;
  width: 280px;
  perspective: 800px;
}

.card-3d {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 4px 20px rgb(0 0 0 / 40%);
  transform: rotateY(0deg) rotateX(0deg);
  transition:
    transform 0.4s ease,
    box-shadow 0.4s ease;
}

.card-3d img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  pointer-events: none; /* 让拖拽事件穿透到 track */
  object-fit: cover;
  transition: transform 0.5s ease;
}

.card-3d:hover {
  border-color: var(--color-neon-dim);
  box-shadow:
    0 20px 50px rgb(0 0 0 / 50%),
    0 0 30px var(--color-neon-dim);
  transform: rotateY(-5deg) rotateX(3deg) translateY(-8px);
}

.card-3d:hover img {
  transform: scale(1.05);
}

.card-info {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  pointer-events: none;
  background: linear-gradient(transparent, rgb(0 0 0 / 80%));
}

.card-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.card-desc {
  font-size: 0.72rem;
  color: var(--color-neon);
  opacity: 0.7;
}

/* 左右渐变遮罩 */
.carousel-fade-left,
.carousel-fade-right {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  width: 60px;
  pointer-events: none;
}

.carousel-fade-left {
  left: 0;
  background: linear-gradient(90deg, var(--color-bg-primary), transparent);
}

.carousel-fade-right {
  right: 0;
  background: linear-gradient(270deg, var(--color-bg-primary), transparent);
}

/* ===== 弹窗 ===== */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: rgb(0 0 0 / 90%);
  backdrop-filter: blur(10px);
}

.lightbox-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  max-width: 90vw;
  max-height: 90vh;
}

.lightbox-close {
  position: absolute;
  top: -40px;
  right: -40px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-primary);
  cursor: pointer;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.lightbox-close:hover {
  color: var(--color-neon);
  background: var(--color-neon-dim);
  border-color: var(--color-neon);
}

.lightbox-image {
  max-width: 100%;
  max-height: 75vh;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgb(0 0 0 / 50%);
}

.lightbox-caption {
  text-align: center;
}

.lightbox-caption h3 {
  margin-bottom: 4px;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-neon);
}

.lightbox-caption p {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.lightbox-enter-active {
  transition: opacity 0.3s ease;
}

.lightbox-enter-active .lightbox-content {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.lightbox-leave-active {
  transition: opacity 0.2s ease;
}

.lightbox-leave-active .lightbox-content {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.lightbox-enter-from {
  opacity: 0;
}

.lightbox-enter-from .lightbox-content {
  opacity: 0;
  transform: scale(0.9);
}

.lightbox-leave-to {
  opacity: 0;
}

.lightbox-leave-to .lightbox-content {
  opacity: 0;
  transform: scale(0.95);
}
</style>
