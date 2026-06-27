<script setup lang="ts">
import { onMounted, ref } from 'vue';

import BentoGrid from '#/components/ui/BentoGrid.vue';
import SectionTitle from '#/components/ui/SectionTitle.vue';
import PortfolioCard from '#/features/portfolio/PortfolioCard.vue';
import { usePortfolioStore } from '#/store/portfolioStore';
import { SERVICE_CATEGORIES } from '#/utils/constants';

const portfolioStore = usePortfolioStore();
const activeCategory = ref<null | string>(null);

function setCategory(categoryId: null | string) {
  activeCategory.value = categoryId;
  portfolioStore.setFilter(categoryId);
}

const isActive = (categoryId: null | string) =>
  activeCategory.value === categoryId;

onMounted(() => {
  portfolioStore.load();
});
</script>

<template>
  <div class="portfolio-page">
    <!-- Hero Section -->
    <section class="section">
      <div class="container-custom">
        <SectionTitle
          title="作品集"
          subtitle="我们为品牌打造的视觉作品，用创意驱动商业增长"
        />
      </div>
    </section>

    <!-- Category Filter Bar -->
    <section class="section filter-section">
      <div class="container-custom">
        <div class="filter-bar">
          <button
            class="filter-btn"
            :class="{ active: isActive(null) }"
            @click="setCategory(null)"
          >
            全部
          </button>
          <button
            v-for="cat in SERVICE_CATEGORIES"
            :key="cat.id"
            class="filter-btn"
            :class="{ active: isActive(cat.id) }"
            @click="setCategory(cat.id)"
          >
            {{ cat.label }}
            <span class="filter-count">{{ cat.count }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Portfolio Grid -->
    <section class="section">
      <div class="container-custom">
        <!-- Loading State -->
        <div v-if="portfolioStore.loading" class="loading-state">
          <div class="loading-placeholder" v-for="n in 6" :key="n">
            <div class="skeleton-card"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="portfolioStore.filteredItems.length === 0"
          class="empty-state"
        >
          <div class="empty-icon">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <p class="empty-text">该分类下暂无作品</p>
          <button class="btn-neon" @click="setCategory(null)">
            查看全部作品
          </button>
        </div>

        <!-- Portfolio Grid -->
        <BentoGrid v-else :cols="3">
          <PortfolioCard
            v-for="item in portfolioStore.filteredItems"
            :key="item.id"
            :item="item"
          />
        </BentoGrid>
      </div>
    </section>
  </div>
</template>

<style scoped>
.portfolio-page {
  min-height: 100vh;
}

.filter-section {
  padding-top: 0;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.filter-btn {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 20px;
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 100px;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-neon-dim);
}

.filter-btn.active {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
}

.filter-count {
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.6;
}

.filter-btn.active .filter-count {
  opacity: 1;
}

/* Loading State */
.loading-state {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 640px) {
  .loading-state {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .loading-state {
    grid-template-columns: repeat(3, 1fr);
  }
}

.skeleton-card {
  height: 300px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.3;
  }

  50% {
    opacity: 0.6;
  }
}

/* Empty State */
.empty-state {
  padding: 64px 24px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 16px;
  color: var(--color-text-muted);
}

.empty-text {
  margin-bottom: 24px;
  font-size: 1rem;
  color: var(--color-text-secondary);
}
</style>
