<script setup lang="ts">
import type { PortfolioDetail } from '#/types/portfolio';

import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import GlassCard from '#/components/ui/GlassCard.vue';
import NeonButton from '#/components/ui/NeonButton.vue';
import SectionTitle from '#/components/ui/SectionTitle.vue';
import { fetchPortfolioDetail } from '#/utils/api';

const route = useRoute();
const detail = ref<null | PortfolioDetail>(null);
const loading = ref(true);
const fetchError = ref<null | string>(null);

function galleryUrl(image: { id: string }): string {
  return `/api/app/public/portfolio/${detail.value?.id}/gallery/${image.id}`;
}

onMounted(async () => {
  const id = String(route.params.id ?? '');
  try {
    detail.value = await fetchPortfolioDetail(id);
  } catch (error) {
    console.error('[PortfolioDetail] fetch error:', error);
    fetchError.value = '加载案例详情失败，请稍后重试';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="portfolio-detail-page">
    <section class="section">
      <div class="container-custom">
        <!-- 加载状态 -->
        <div v-if="loading" class="state-block">
          <div class="loading-spinner-ring"></div>
          <span class="state-text">正在加载案例详情...</span>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="fetchError" class="state-block">
          <span class="state-text state-error">{{ fetchError }}</span>
          <NeonButton to="/portfolio" variant="outline">返回作品集</NeonButton>
        </div>

        <!-- 详情内容 -->
        <template v-else-if="detail">
          <div class="detail-hero">
            <img
              :src="detail.coverImageUrl"
              :alt="detail.title"
              class="detail-cover"
              loading="lazy"
            />
            <div class="detail-heading">
              <SectionTitle :title="detail.title" :subtitle="detail.category" />
              <div v-if="detail.tags.length" class="detail-tags">
                <span v-for="tag in detail.tags" :key="tag" class="tag-pill">
                  {{ tag }}
                </span>
              </div>
              <div class="detail-meta">
                <span v-if="detail.client">客户：{{ detail.client }}</span>
                <span v-if="detail.year">年份：{{ detail.year }}</span>
              </div>
            </div>
          </div>

          <p v-if="detail.description" class="detail-description">
            {{ detail.description }}
          </p>

          <!-- 富文本内容 -->
          <div
            v-if="detail.content"
            class="detail-content"
            v-html="detail.content"
          ></div>

          <!-- 配图组 -->
          <div v-if="detail.images.length" class="detail-gallery">
            <SectionTitle title="项目展示" />
            <div class="gallery-grid">
              <GlassCard
                v-for="image in detail.images"
                :key="image.id"
                :hoverable="true"
              >
                <img
                  :src="galleryUrl(image)"
                  :alt="image.caption || detail.title"
                  class="gallery-image"
                  loading="lazy"
                />
                <p v-if="image.caption" class="gallery-caption">
                  {{ image.caption }}
                </p>
              </GlassCard>
            </div>
          </div>

          <div class="detail-actions">
            <NeonButton to="/portfolio" variant="outline">
              返回作品集
            </NeonButton>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.portfolio-detail-page {
  min-height: 100vh;
}

.state-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  padding: 80px 24px;
  text-align: center;
}

.loading-spinner-ring {
  width: 40px;
  height: 40px;
  border: 2px solid var(--color-neon-dim);
  border-top-color: var(--color-neon);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.state-text {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

.state-error {
  color: #ff6b6b;
}

.detail-hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  align-items: center;
  margin-bottom: 32px;
}

@media (min-width: 768px) {
  .detail-hero {
    grid-template-columns: 1.2fr 1fr;
  }
}

.detail-cover {
  width: 100%;
  max-height: 480px;
  object-fit: cover;
  border-radius: 20px;
}

.detail-heading {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-pill {
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.detail-description {
  margin: 0 0 24px;
  font-size: 1rem;
  line-height: 1.7;
  color: var(--color-text-primary);
}

.detail-content {
  margin-bottom: 40px;
  font-size: 0.95rem;
  line-height: 1.8;
  color: var(--color-text-primary);
}

.detail-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
}

.detail-gallery {
  margin-bottom: 40px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
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

.gallery-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 12px;
}

.gallery-caption {
  margin: 8px 0 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.detail-actions {
  display: flex;
  justify-content: center;
  padding: 8px 0 24px;
}
</style>
