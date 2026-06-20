<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { PortfolioItem } from '#/types/portfolio'
import type { ApiResponse } from '#/types/api'
import { fetchPortfolio } from '#/utils/api'
import PortfolioCard from './PortfolioCard.vue'
import BentoGrid from '#/components/ui/BentoGrid.vue'

const props = withDefaults(defineProps<{
  limit?: number
}>(), {
  limit: undefined,
})

const items = ref<PortfolioItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const res = await fetchPortfolio()
    const data = res.data as unknown as ApiResponse<PortfolioItem[]>
    const allItems = Array.isArray(data) ? data : (data.data ?? [])
    items.value = props.limit ? allItems.slice(0, props.limit) : allItems
  } catch (e) {
    error.value = '加载作品集失败，请稍后重试'
    console.error('[PortfolioGrid] fetch error:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="portfolio-grid">
    <!-- 加载状态 -->
    <div v-if="loading" class="grid-loading">
      <div class="loading-spinner-ring" />
      <span class="loading-text">正在加载作品集...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="grid-error">
      <span class="error-text">{{ error }}</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="items.length === 0" class="grid-empty">
      <span class="empty-text">暂无作品展示</span>
    </div>

    <!-- 作品网格 -->
    <BentoGrid v-else :cols="3" gap="24px">
      <PortfolioCard
        v-for="(item, index) in items"
        :key="item.id"
        :item="item"
        :tag="String(index + 1).padStart(2, '0')"
      />
    </BentoGrid>
  </div>
</template>

<style scoped>
.portfolio-grid {
  width: 100%;
}

.grid-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 0;
}

.loading-spinner-ring {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(200, 255, 0, 0.15);
  border-top-color: #C8FF00;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  color: #8888a0;
  font-size: 0.9rem;
}

.grid-error {
  text-align: center;
  padding: 40px 0;
}

.error-text {
  color: #ff6b6b;
  font-size: 0.9rem;
}

.grid-empty {
  text-align: center;
  padding: 40px 0;
}

.empty-text {
  color: #555570;
  font-size: 0.9rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>