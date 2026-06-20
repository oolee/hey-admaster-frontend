<script setup lang="ts">
import { computed } from 'vue'
import { useAiStore } from '#/store/aiStore'
import GlassCard from '#/components/ui/GlassCard.vue'

const aiStore = useAiStore()

const history = computed(() => aiStore.history)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getThumbSrc(image: any): string {
  if (image.url) return image.url
  if (image.b64_json) return `data:image/png;base64,${image.b64_json}`
  return ''
}
</script>

<template>
  <div class="ai-history-panel">
    <div class="history-header">
      <h3 class="history-title">生成历史</h3>
      <span class="history-count">
        {{ aiStore.generationCount }} 次生成
        <span class="remaining-badge">
          剩余 {{ aiStore.remainingFree }} 次
        </span>
      </span>
    </div>

    <!-- 空状态 -->
    <div v-if="history.length === 0" class="history-empty">
      <p class="empty-text">暂无生成记录</p>
    </div>

    <!-- 历史列表 -->
    <div v-else class="history-list">
      <GlassCard
        v-for="item in history"
        :key="item.id"
        :hoverable="true"
        class="history-item"
      >
        <div class="history-item-header">
          <span class="history-time">{{ formatDate(item.createdAt) }}</span>
          <span class="history-count-badge">{{ item.images.length }} 张</span>
        </div>
        <p class="history-prompt">{{ item.prompt }}</p>
        <div class="history-thumbnails">
          <img
            v-for="img in item.images.slice(0, 4)"
            :key="img.index"
            :src="getThumbSrc(img)"
            :alt="`缩略图 ${(img.index ?? 0) + 1}`"
            class="history-thumb"
            loading="lazy"
          />
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped>
.ai-history-panel {
  width: 100%;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.history-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f0f0f5;
  margin: 0;
  font-family: var(--font-sans);
}

.history-count {
  font-size: 0.8rem;
  color: #8888a0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.remaining-badge {
  padding: 2px 10px;
  font-size: 0.7rem;
  color: #C8FF00;
  background: rgba(200, 255, 0, 0.08);
  border: 1px solid rgba(200, 255, 0, 0.15);
  border-radius: 9999px;
}

.history-empty {
  text-align: center;
  padding: 40px 0;
}

.empty-text {
  color: #555570;
  font-size: 0.9rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item {
  padding: 20px !important;
}

.history-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.history-time {
  font-size: 0.75rem;
  color: #555570;
  font-family: var(--font-mono);
}

.history-count-badge {
  font-size: 0.7rem;
  color: #8888a0;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
}

.history-prompt {
  font-size: 0.9rem;
  color: #f0f0f5;
  line-height: 1.5;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.history-thumbnails {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.history-thumb {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: transform 0.2s ease;
}

.history-thumb:hover {
  transform: scale(1.1);
}
</style>
