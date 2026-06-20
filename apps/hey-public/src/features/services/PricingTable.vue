<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ofetch } from 'ofetch'
import type { ApiResponse } from '#/types/api'
import type { PricingPackage } from '#/types/order'
import GlassCard from '#/components/ui/GlassCard.vue'
import NeonButton from '#/components/ui/NeonButton.vue'

const packages = ref<PricingPackage[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const res = await ofetch<ApiResponse<PricingPackage[]>>('/api/pricing')
    packages.value = res.data
  } catch (e) {
    error.value = '加载价格信息失败，请稍后重试'
    console.error('[PricingTable] fetch error:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="pricing-table">
    <!-- 加载状态 -->
    <div v-if="loading" class="pricing-loading">
      <div class="loading-spinner-ring" />
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
            <p v-if="pkg.description" class="pricing-desc">{{ pkg.description }}</p>
          </div>

          <div class="pricing-price">
            <span class="price-currency">{{ pkg.currency === 'CNY' ? '¥' : '$' }}</span>
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
  border-color: rgba(200, 255, 0, 0.2) !important;
  box-shadow: 0 0 40px rgba(200, 255, 0, 0.08);
}

.pricing-header {
  text-align: center;
}

.pricing-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f0f0f5;
  margin: 0 0 8px;
  font-family: var(--font-sans);
}

.pricing-desc {
  font-size: 0.85rem;
  color: #8888a0;
  margin: 0;
}

.pricing-price {
  text-align: center;
  padding: 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.price-currency {
  font-size: 1.2rem;
  color: #C8FF00;
  font-weight: 600;
  vertical-align: top;
  line-height: 1.8;
}

.price-amount {
  font-size: 2.5rem;
  font-weight: 800;
  color: #C8FF00;
  font-family: var(--font-mono);
  letter-spacing: -0.02em;
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pricing-feature-item {
  font-size: 0.9rem;
  color: #8888a0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.feature-check {
  color: #C8FF00;
  font-weight: 700;
  flex-shrink: 0;
}

.pricing-cta {
  margin-top: auto;
  width: 100%;
  justify-content: center;
}

/* 加载态 */
.pricing-loading {
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

/* 错误态 */
.pricing-error {
  text-align: center;
  padding: 40px 0;
}

.error-text {
  color: #ff6b6b;
  font-size: 0.9rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>