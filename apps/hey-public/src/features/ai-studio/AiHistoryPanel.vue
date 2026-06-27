<script setup lang="ts">
import { computed } from 'vue';

import GlassCard from '#/components/ui/GlassCard.vue';
import { useAiStore } from '#/store/aiStore';

const aiStore = useAiStore();

const history = computed(() => aiStore.history);

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getThumbSrc(image: any): string {
  if (image.url) return image.url;
  if (image.b64_json) return `data:image/png;base64,${image.b64_json}`;
  return '';
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
  margin: 0;
  font-family: var(--font-sans);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.history-count {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.remaining-badge {
  padding: 2px 10px;
  font-size: 0.7rem;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
}

.history-empty {
  padding: 40px 0;
  text-align: center;
}

.empty-text {
  font-size: 0.9rem;
  color: var(--color-text-muted);
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
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.history-count-badge {
  padding: 2px 8px;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  background: var(--color-bg-card);
  border-radius: 4px;
}

.history-prompt {
  display: -webkit-box;
  margin: 0 0 12px;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text-primary);
  -webkit-box-orient: vertical;
}

.history-thumbnails {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.history-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  object-fit: cover;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: transform 0.2s ease;
}

.history-thumb:hover {
  transform: scale(1.1);
}
</style>
