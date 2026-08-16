<script setup lang="ts">
import type { FeaturedPortfolio } from '#/types/api';

import { onMounted, ref } from 'vue';

import BentoGrid from '#/components/ui/BentoGrid.vue';
import { fetchPortfolio } from '#/utils/api';

import PortfolioCard from './PortfolioCard.vue';

const props = withDefaults(
  defineProps<{
    limit?: number;
  }>(),
  {
    limit: undefined,
  },
);

const items = ref<FeaturedPortfolio[]>([]);
const loading = ref(true);
const fetchError = ref<null | string>(null);

onMounted(async () => {
  try {
    const res = await fetchPortfolio({ maxResultCount: 100 });
    const allItems = res.items as FeaturedPortfolio[];
    items.value = props.limit ? allItems.slice(0, props.limit) : allItems;
  } catch (error) {
    fetchError.value = '加载作品集失败，请稍后重试';
    console.error('[PortfolioGrid] fetch error:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="portfolio-grid">
    <!-- 加载状态 -->
    <div v-if="loading" class="grid-loading">
      <div class="loading-spinner-ring"></div>
      <span class="loading-text">正在加载作品集...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="fetchError" class="grid-error">
      <span class="error-text">{{ fetchError }}</span>
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
  gap: 16px;
  align-items: center;
  padding: 60px 0;
}

.loading-spinner-ring {
  width: 40px;
  height: 40px;
  border: 2px solid var(--color-neon-dim);
  border-top-color: var(--color-neon);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.grid-error {
  padding: 40px 0;
  text-align: center;
}

.error-text {
  font-size: 0.9rem;
  color: #ff6b6b;
}

.grid-empty {
  padding: 40px 0;
  text-align: center;
}

.empty-text {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
