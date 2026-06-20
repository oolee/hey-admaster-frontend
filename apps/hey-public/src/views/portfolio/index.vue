<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { usePortfolioStore } from '#/store/portfolioStore'
import SectionTitle from '#/components/ui/SectionTitle.vue'
import BentoGrid from '#/components/ui/BentoGrid.vue'
import PortfolioCard from '#/features/portfolio/PortfolioCard.vue'
import PortfolioGrid from '#/features/portfolio/PortfolioGrid.vue'
import { SERVICE_CATEGORIES } from '#/utils/constants'

const portfolioStore = usePortfolioStore()
const activeCategory = ref<string | null>(null)

function setCategory(categoryId: string | null) {
  activeCategory.value = categoryId
  portfolioStore.setFilter(categoryId)
}

const isActive = (categoryId: string | null) => activeCategory.value === categoryId

onMounted(() => {
  portfolioStore.load()
})
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
        <div v-else-if="portfolioStore.filteredItems.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <p class="empty-text">该分类下暂无作品</p>
          <button class="btn-neon" @click="setCategory(null)">查看全部作品</button>
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
  padding: 8px 20px;
  border-radius: 100px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: #8888a0;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
}

.filter-btn:hover {
  color: #cccce0;
  border-color: rgba(200, 255, 0, 0.3);
}

.filter-btn.active {
  background: rgba(200, 255, 0, 0.1);
  border-color: #C8FF00;
  color: #C8FF00;
}

.filter-count {
  font-size: 0.75rem;
  opacity: 0.6;
  font-weight: 600;
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
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 64px 24px;
}

.empty-icon {
  color: #555570;
  margin-bottom: 16px;
}

.empty-text {
  color: #8888a0;
  font-size: 1rem;
  margin-bottom: 24px;
}
</style>