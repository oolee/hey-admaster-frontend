<script setup lang="ts">
import type { ApiResponse } from '#/types/api';
import type { PricingPackage } from '#/types/order';

import { onMounted, ref } from 'vue';

import { ofetch } from 'ofetch';

import GlassCard from '#/components/ui/GlassCard.vue';
import NeonButton from '#/components/ui/NeonButton.vue';

const packages = ref<PricingPackage[]>([]);
const loading = ref(true);
const error = ref<null | string>(null);

onMounted(async () => {
  try {
    const res = await ofetch<ApiResponse<PricingPackage[]>>('/api/pricing');
    packages.value = res.data;
  } catch (error) {
    const err = error as { value?: string };
    err.value = '加载价格信息失败，请稍后重试';
    console.error('[PricingTable] fetch error:', err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="pricing-table">
    <!-- 加载状态 -->
    <div v-if="loading" class="pricing-loading">
      <div class="loading-spinner-ring"></div>
      <span class="loading-text">正在加载价格方案...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="pricing-error">
      <span class="error-text">{{ error }}</span>
    </div>

    <!-- 价格卡片 -->
    <div v-else class="pricing-grid">
      <GlassCard
        v-for="pkg in packages"
        :key="pkg.id"
        :hoverable="true"
        :class="{ 'pricing-highlighted': pkg.highlighted }"
      >
        <div class="pricing-card">
          <div class="pricing-header">
            <h3 class="pricing-name">{{ pkg.name }}</h3>
            <p v-if="pkg.description" class="pricing-desc">
              {{ pkg.description }}
            </p>
          </div>

          <div class="pricing-price">
            <span class="price-currency">{{
              pkg.currency === 'CNY' ? '¥' : '$'
            }}</span>
            <span class="price-amount">{{ pkg.price.toLocaleString() }}</span>
          </div>

          <ul class="pricing-features">
            <li
              v-for="feature in pkg.features"
              :key="feature"
              class="pricing-feature-item"
            >
              <span class="feature-check">&#10003;</span>
              {{ feature }}
            </li>
          </ul>

          <NeonButton
            :variant="pkg.highlighted ? 'filled' : 'outline'"
            size="md"
            class="pricing-cta"
          >
            {{ pkg.highlighted ? '立即选择' : '了解更多' }}
          </NeonButton>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped>
.pricing-table {
  width: 100%;
}

.pricing-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 768px) {
  .pricing-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.pricing-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pricing-highlighted {
  border-color: var(--color-neon-dim) !important;
  box-shadow: 0 0 40px var(--color-neon-glow);
}

.pricing-header {
  text-align: center;
}

.pricing-name {
  margin: 0 0 8px;
  font-family: var(--font-sans);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.pricing-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.pricing-price {
  padding: 16px 0;
  text-align: center;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.price-currency {
  font-size: 1.2rem;
  font-weight: 600;
  line-height: 1.8;
  vertical-align: top;
  color: var(--color-neon);
}

.price-amount {
  font-family: var(--font-mono);
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--color-neon);
  letter-spacing: -0.02em;
}

.pricing-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.pricing-feature-item {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.feature-check {
  flex-shrink: 0;
  font-weight: 700;
  color: var(--color-neon);
}

.pricing-cta {
  justify-content: center;
  width: 100%;
  margin-top: auto;
}

/* 加载态 */
.pricing-loading {
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

/* 错误态 */
.pricing-error {
  padding: 40px 0;
  text-align: center;
}

.error-text {
  font-size: 0.9rem;
  color: #ff6b6b;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
