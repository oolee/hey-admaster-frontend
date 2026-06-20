<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface CardItem {
  id: number
  imageUrl: string
  title: string
  description: string
}

const items: CardItem[] = [
  { id: 1, imageUrl: 'https://picsum.photos/seed/ai1/800/450', title: '赛博都市', description: 'AI 生成 · 概念艺术' },
  { id: 2, imageUrl: 'https://picsum.photos/seed/ai2/800/450', title: '极简海报', description: 'AI 生成 · 品牌设计' },
  { id: 3, imageUrl: 'https://picsum.photos/seed/ai3/800/450', title: '未来界面', description: 'AI 生成 · UI/UX' },
  { id: 4, imageUrl: 'https://picsum.photos/seed/ai4/800/450', title: '梦幻场景', description: 'AI 生成 · 插画艺术' },
  { id: 5, imageUrl: 'https://picsum.photos/seed/ai5/800/450', title: '产品渲染', description: 'AI 生成 · 3D 视觉' },
  { id: 6, imageUrl: 'https://picsum.photos/seed/ai6/800/450', title: '霓虹街景', description: 'AI 生成 · 摄影风格' },
  { id: 7, imageUrl: 'https://picsum.photos/seed/ai7/800/450', title: '抽象几何', description: 'AI 生成 · 图形设计' },
  { id: 8, imageUrl: 'https://picsum.photos/seed/ai8/800/450', title: '潮流插画', description: 'AI 生成 · 商业插画' },
]

// 三倍列表：保证任意方向拖拽都有足够内容
const tripled = [...items, ...items, ...items]
const selectedItem = ref<CardItem | null>(null)

const trackRef = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)
const cursorGrabbing = ref(false)

let currentOffset = 0
let dragStartX = 0
let dragStartOffset = 0
let animationId = 0
let lastTime = 0

const cardWidth = 280
const gap = 24
const step = cardWidth + gap // 304px
const totalWidth = items.length * step
const autoSpeed = 0.6 // 每帧自动滚动速度（px）

function applyTransform() {
  if (trackRef.value) {
    trackRef.value.style.transform = `translateX(${currentOffset}px)`
  }
}

// 无限循环包裹
function wrapOffset() {
  // 从第二组中间开始（-totalWidth），保证左右都有内容
  if (currentOffset <= -totalWidth * 2) {
    currentOffset += totalWidth
  }
  if (currentOffset >= 0) {
    currentOffset -= totalWidth
  }
}

function animate(timestamp: number) {
  if (!lastTime) lastTime = timestamp
  if (!isDragging.value) {
    // 自动向左滚动
    currentOffset -= autoSpeed
    wrapOffset()
    applyTransform()
  }
  lastTime = timestamp
  animationId = requestAnimationFrame(animate)
}

// === 拖拽交互 ===
function onMouseDown(e: MouseEvent) {
  // 不阻止点击弹窗
  isDragging.value = true
  cursorGrabbing.value = true
  dragStartX = e.clientX
  dragStartOffset = currentOffset
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const delta = e.clientX - dragStartX
  currentOffset = dragStartOffset + delta
  wrapOffset()
  applyTransform()
}

function onMouseUp() {
  isDragging.value = false
  cursorGrabbing.value = false
}

// 全局 mouseup 兜底（鼠标拖到组件外松开）
function onGlobalMouseUp() {
  if (isDragging.value) {
    isDragging.value = false
    cursorGrabbing.value = false
  }
}

// 点击 vs 拖拽判断
let clickMoved = false
function onCardMouseDown(e: MouseEvent) {
  clickMoved = false
  onMouseDown(e)
}

function onCardMouseMove(e: MouseEvent) {
  if (isDragging.value) {
    const delta = Math.abs(e.clientX - dragStartX)
    if (delta > 3) clickMoved = true
  }
  onMouseMove(e)
}

function onCardClick(item: CardItem) {
  if (!clickMoved) {
    openLightbox(item)
  }
}

function openLightbox(item: CardItem) {
  selectedItem.value = item
}

function closeLightbox() {
  selectedItem.value = null
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeLightbox()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('mouseup', onGlobalMouseUp)
  // 初始偏移：从第二组开始，保证左右都有内容
  currentOffset = -totalWidth
  applyTransform()
  animationId = requestAnimationFrame(animate)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('mouseup', onGlobalMouseUp)
  cancelAnimationFrame(animationId)
})
</script>

<template>
  <div
    class="carousel-wrapper"
    :class="{ grabbing: cursorGrabbing }"
  >
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
    <div class="carousel-fade-left" />
    <div class="carousel-fade-right" />
  </div>

  <!-- 弹窗 -->
  <Teleport to="body">
    <Transition name="lightbox">
      <div v-if="selectedItem" class="lightbox-overlay" @click.self="closeLightbox">
        <div class="lightbox-content">
          <button class="lightbox-close" @click="closeLightbox" aria-label="关闭">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img :src="selectedItem.imageUrl" :alt="selectedItem.title" class="lightbox-image" />
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
  width: 100%;
  overflow: hidden;
  padding: 12px 0;
  position: relative;
  user-select: none;
}

.carousel-wrapper.grabbing {
  cursor: grabbing;
}

.carousel-track {
  display: flex;
  gap: 24px;
  width: max-content;
  will-change: transform;
  cursor: grab;
}

.carousel-card {
  flex-shrink: 0;
  width: 280px;
  perspective: 800px;
}

.card-3d {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
  transform: rotateY(0deg) rotateX(0deg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.card-3d img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  transition: transform 0.5s ease;
  pointer-events: none; /* 让拖拽事件穿透到 track */
}

.card-3d:hover {
  transform: rotateY(-5deg) rotateX(3deg) translateY(-8px);
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(200, 255, 0, 0.15);
  border-color: rgba(200, 255, 0, 0.25);
}

.card-3d:hover img {
  transform: scale(1.05);
}

.card-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 14px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: none;
}

.card-title {
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
}

.card-desc {
  color: rgba(200, 255, 0, 0.7);
  font-size: 0.72rem;
}

/* 左右渐变遮罩 */
.carousel-fade-left,
.carousel-fade-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 60px;
  z-index: 2;
  pointer-events: none;
}

.carousel-fade-left {
  left: 0;
  background: linear-gradient(90deg, #0a0a0f, transparent);
}

.carousel-fade-right {
  right: 0;
  background: linear-gradient(270deg, #0a0a0f, transparent);
}

/* ===== 弹窗 ===== */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.lightbox-close {
  position: absolute;
  top: -40px;
  right: -40px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lightbox-close:hover {
  background: rgba(200, 255, 0, 0.2);
  border-color: #C8FF00;
  color: #C8FF00;
}

.lightbox-image {
  max-width: 100%;
  max-height: 75vh;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.lightbox-caption {
  text-align: center;
}

.lightbox-caption h3 {
  color: #C8FF00;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.lightbox-caption p {
  color: #8888a0;
  font-size: 0.9rem;
}

.lightbox-enter-active {
  transition: opacity 0.3s ease;
}

.lightbox-enter-active .lightbox-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.lightbox-leave-active {
  transition: opacity 0.2s ease;
}

.lightbox-leave-active .lightbox-content {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.lightbox-enter-from {
  opacity: 0;
}

.lightbox-enter-from .lightbox-content {
  transform: scale(0.9);
  opacity: 0;
}

.lightbox-leave-to {
  opacity: 0;
}

.lightbox-leave-to .lightbox-content {
  transform: scale(0.95);
  opacity: 0;
}
</style>