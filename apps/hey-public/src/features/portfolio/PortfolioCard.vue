<script setup lang="ts">
import type { PortfolioItem } from '#/types/portfolio';

import GlassCard from '#/components/ui/GlassCard.vue';

defineProps<{
  item: PortfolioItem;
  tag?: string;
}>();
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
  color: var(--color-neon);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
  backdrop-filter: blur(8px);
}

.portfolio-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.portfolio-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-text-primary);
}

.portfolio-description {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
  -webkit-box-orient: vertical;
}
</style>
