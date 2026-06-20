<script setup lang="ts">
import type { PortfolioItem } from '#/types/portfolio'
import GlassCard from '#/components/ui/GlassCard.vue'

defineProps<{
  item: PortfolioItem
  tag?: string
}>()
</script>

<template>
  <GlassCard :tag="tag" :hoverable="true">
    <div class="portfolio-card">
      <div class="portfolio-image-wrapper">
        <img
          :src="item.imageUrl"
          :alt="item.title"
          class="portfolio-image"
          loading="lazy"
        />
        <span class="portfolio-category">{{ item.category }}</span>
      </div>

      <div class="portfolio-info">
        <h3 class="portfolio-title">{{ item.title }}</h3>
        <p class="portfolio-description">{{ item.description }}</p>
      </div>
    </div>
  </GlassCard>
</template>

<style scoped>
.portfolio-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.portfolio-image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: 12px;
}

.portfolio-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.portfolio-card:hover .portfolio-image {
  transform: scale(1.05);
}

.portfolio-category {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 12px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #C8FF00;
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(200, 255, 0, 0.2);
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.portfolio-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.portfolio-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f0f0f5;
  margin: 0;
  font-family: var(--font-sans);
  line-height: 1.3;
}

.portfolio-description {
  font-size: 0.85rem;
  color: #8888a0;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>