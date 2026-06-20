<script setup lang="ts">
import type { GeneratedImage } from '#/types/ai'
import LoadingSpinner from '#/components/ui/LoadingSpinner.vue'

defineProps<{
  images: GeneratedImage[]
  isLoading: boolean
  error: string | null
  isMock: boolean
}>()

function getImageSrc(image: GeneratedImage): string {
  if (image.url) return image.url
  if (image.b64_json) return `data:image/png;base64,${image.b64_json}`
  return ''
}
</script>

<template>
  <div class="ai-image-gallery">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="gallery-loading">
      <LoadingSpinner size="lg" />
      <span class="loading-text">AI 正在生成图像，请耐心等待...</span>
      <span class="loading-hint">通义万相异步生成通常需要 10-30 秒</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="gallery-error">
      <div class="error-icon">⚠️</div>
      <p class="error-title">生成失败</p>
      <p class="error-hint">{{ error }}</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="images.length === 0" class="gallery-empty">
      <div class="empty-icon">🎨</div>
      <p class="empty-title">选择模板或输入描述，开始创作</p>
      <p class="empty-hint">支持门头设计、VI设计、DM传单、文化墙、3D效果图等场景</p>
    </div>

    <!-- 图片网格 -->
    <div v-else class="gallery-grid">
      <div
        v-for="(image, idx) in images"
        :key="idx"
        class="gallery-item"
      >
        <img
          :src="getImageSrc(image)"
          :alt="image.revised_prompt ?? `生成图片 ${idx + 1}`"
          class="gallery-image"
          loading="lazy"
        />
        <div class="gallery-overlay">
          <span class="gallery-index">{{ idx + 1 }}</span>
        </div>
      </div>
    </div>

    <!-- Mock 提示 -->
    <div v-if="isMock && images.length > 0" class="mock-badge">
      <span>⚠️ 当前为演示模式，配置 API Key 后可使用真实 AI 生成</span>
    </div>
  </div>
</template>

<style scoped>
.ai-image-gallery {
  width: 100%;
}

.gallery-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
}

.loading-text {
  color: #8888a0;
  font-size: 0.9rem;
}

.loading-hint {
  color: #555570;
  font-size: 0.75rem;
}

.gallery-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: 8px;
}

.error-icon {
  font-size: 2rem;
  line-height: 1;
}

.error-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ff5555;
  margin: 0;
}

.error-hint {
  font-size: 0.85rem;
  color: #8888a0;
  margin: 0;
}

.gallery-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 12px;
}

.empty-icon {
  font-size: 3rem;
  line-height: 1;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #8888a0;
  margin: 0;
}

.empty-hint {
  font-size: 0.85rem;
  color: #555570;
  margin: 0;
  text-align: center;
  max-width: 300px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 640px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .gallery-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(18, 18, 30, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.gallery-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.gallery-item:hover .gallery-image {
  transform: scale(1.05);
}

.gallery-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 10px;
  display: flex;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.gallery-item:hover .gallery-overlay {
  opacity: 1;
}

.gallery-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(200, 255, 0, 0.2);
  color: #C8FF00;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: var(--font-mono);
}

.mock-badge {
  margin-top: 16px;
  padding: 10px 16px;
  background: rgba(255, 180, 0, 0.08);
  border: 1px solid rgba(255, 180, 0, 0.2);
  border-radius: 8px;
  text-align: center;
}

.mock-badge span {
  font-size: 0.75rem;
  color: #ffb400;
}
</style>