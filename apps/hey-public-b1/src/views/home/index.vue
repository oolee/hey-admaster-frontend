<script setup lang="ts">
import type {
  CarouselItem,
  DailyPrompt,
  FeaturedPortfolio,
  ServiceItem,
  StatItem,
} from '#/types/api';

import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import BentoGrid from '#/components/ui/BentoGrid.vue';
import NeonButton from '#/components/ui/NeonButton.vue';
import ScrollReveal from '#/components/ui/ScrollReveal.vue';
import SectionTitle from '#/components/ui/SectionTitle.vue';
import HeroSection from '#/features/hero/HeroSection.vue';
import PortfolioCard from '#/features/portfolio/PortfolioCard.vue';
import ServiceCard from '#/features/services/ServiceCard.vue';
import { fetchHomepage } from '#/utils/api';

const services = ref<ServiceItem[]>([]);
const dailyPrompts = ref<DailyPrompt[]>([]);
const carouselItems = ref<CarouselItem[]>([]);
const featuredPortfolios = ref<FeaturedPortfolio[]>([]);
const stats = ref<StatItem[]>([]);
const loading = ref(true);
const fetchError = ref<null | string>(null);

onMounted(async () => {
  try {
    const data = await fetchHomepage();
    services.value = data.services;
    dailyPrompts.value = data.dailyPrompts;
    carouselItems.value = data.carouselItems;
    featuredPortfolios.value = data.featuredPortfolios ?? [];
    stats.value = data.stats;
  } catch (error) {
    console.error('[HomePage] fetch error:', error);
    fetchError.value = '加载首页数据失败，请稍后重试';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="home-page">
    <!-- Hero（不需要遮罩，直接显示） -->
    <HeroSection :carousel-items="carouselItems" />

    <!-- Services Section -->
    <ScrollReveal>
      <section class="section">
        <div class="container-custom">
          <div class="reveal-stagger">
            <SectionTitle
              title="一站式创意解决方案"
              subtitle="从策略到执行，我们提供完整的品牌创意服务"
            />
            <BentoGrid :cols="4">
              <ServiceCard
                v-for="(svc, i) in services"
                :key="svc.tag"
                v-bind="svc"
                :style="{ transitionDelay: `${0.1 + i * 0.1}s` }"
              />
            </BentoGrid>
          </div>
        </div>
      </section>
    </ScrollReveal>

    <!-- Daily Inspiration -->
    <ScrollReveal>
      <section class="section inspo-section">
        <div class="container-custom">
          <div class="reveal-stagger">
            <SectionTitle
              title="每日灵感"
              subtitle="精选AI创意Prompt，激发你的创作灵感"
            />
            <div class="inspo-grid">
              <div
                v-for="(item, i) in dailyPrompts"
                :key="i"
                class="inspo-card glass-card glass-card-hover"
                :style="{ transitionDelay: `${0.1 + i * 0.15}s` }"
              >
                <span class="inspo-label">{{ item.label }}</span>
                <p class="inspo-prompt">{{ item.prompt }}</p>
                <RouterLink to="/studio" class="inspo-try btn-neon">
                  试试这个
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>

    <!-- Portfolio Preview -->
    <ScrollReveal>
      <section class="section">
        <div class="container-custom">
          <div class="reveal-stagger">
            <SectionTitle
              title="精选案例"
              subtitle="用作品说话，看看我们为品牌做了什么"
            />
            <BentoGrid :cols="3" gap="24px">
              <PortfolioCard
                v-for="(item, index) in featuredPortfolios"
                :key="item.id"
                :item="item"
                :tag="String(index + 1).padStart(2, '0')"
              />
            </BentoGrid>
            <div class="text-center mt-8">
              <NeonButton to="/portfolio" variant="outline">
                查看全部案例
              </NeonButton>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>

    <!-- Stats -->
    <ScrollReveal>
      <section class="section stats-section">
        <div class="container-custom">
          <div class="stats-grid reveal-stagger">
            <div
              v-for="(stat, i) in stats"
              :key="stat.label"
              class="stat-item"
              :style="{ transitionDelay: `${0.1 + i * 0.1}s` }"
            >
              <span class="stat-number text-neon">{{ stat.number }}</span>
              <span class="stat-label">{{ stat.label }}</span>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>

    <!-- CTA -->
    <ScrollReveal>
      <section class="section cta-section">
        <div class="cta-content reveal-stagger">
          <h2 class="cta-title">
            准备好让你的品牌<span class="text-neon">脱颖而出</span>？
          </h2>
          <p class="cta-subtitle" style="transition-delay: 0.15s">
            从AI创意到全案执行，我们为你提供一站式解决方案
          </p>
          <div class="cta-actions" style="transition-delay: 0.3s">
            <NeonButton to="/studio" variant="filled" size="lg">
              免费试用AI创作
            </NeonButton>
            <NeonButton to="/order" variant="outline" size="lg">
              在线下单
            </NeonButton>
          </div>
        </div>
      </section>
    </ScrollReveal>
  </div>
</template>

<style scoped>
.inspo-section {
  background: var(--color-bg-secondary);
}

.inspo-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 768px) {
  .inspo-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.inspo-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 28px;
}

.inspo-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-neon);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.7;
}

.inspo-prompt {
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.inspo-try {
  align-self: flex-start;
  padding: 8px 18px;
  font-size: 0.8rem;
}

.stats-section {
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.stat-number {
  font-family: var(--font-mono);
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.cta-section {
  padding: 80px 24px;
  text-align: center;
}

.cta-content {
  max-width: 800px;
  margin: 0 auto;
}

.cta-title {
  margin-bottom: 16px;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.15;
}

.cta-subtitle {
  margin-bottom: 32px;
  font-size: 1.1rem;
  color: var(--color-text-secondary);
}

.cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}
</style>
