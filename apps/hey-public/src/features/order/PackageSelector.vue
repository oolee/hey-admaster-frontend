<script setup lang="ts">
import type { PricingPackage } from '#/types/order'
import GlassCard from '#/components/ui/GlassCard.vue'
import NeonButton from '#/components/ui/NeonButton.vue'

defineProps<{
  packages: PricingPackage[]
}>()

const emit = defineEmits<{
  select: [pkg: PricingPackage]
}>()
</script>

<template>
  <div class="package-selector">
    <div
      v-if="packages.length === 0"
      class="selector-empty"
    >
      <span class="empty-text">暂无可用套餐</span>
    </div>

    <div v-else class="package-grid">
      <GlassCard
        v-for="pkg in packages"
        :key="pkg.id"
        :hoverable="true"
        :class="{ 'package-highlighted': pkg.highlighted }"
      >
        <div class="package-card">
          <div class="package-header">
            <h3 class="package-name">{{ pkg.name }}</h3>
            <p v-if="pkg.description" class="package-desc">{{ pkg.description }}</p>
          </div>

          <div class="package-price">
            <span class="price-currency">{{ pkg.currency === 'CNY' ? '¥' : '$' }}</span>
            <span class="price-amount">{{ pkg.price.toLocaleString() }}</span>
          </div>

          <ul class="package-features">
            <li
              v-for="feature in pkg.features"
              :key="feature"
              class="package-feature-item"
            >
              <span class="feature-check">&#10003;</span>
              {{ feature }}
            </li>
          </ul>

          <NeonButton
            :variant="pkg.highlighted ? 'filled' : 'outline'"
            size="md"
            class="package-select-btn"
            @click="emit('select', pkg)"
          >
            选择此套餐
          </NeonButton>
        </div>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped>
.package-selector {
  width: 100%;
}

.selector-empty {
  text-align: center;
  padding: 40px 0;
}

.empty-text {
  color: #555570;
  font-size: 0.9rem;
}

.package-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 768px) {
  .package-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.package-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.package-highlighted {
  border-color: rgba(200, 255, 0, 0.2) !important;
  box-shadow: 0 0 40px rgba(200, 255, 0, 0.08);
}

.package-header {
  text-align: center;
}

.package-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f0f0f5;
  margin: 0 0 8px;
  font-family: var(--font-sans);
}

.package-desc {
  font-size: 0.85rem;
  color: #8888a0;
  margin: 0;
}

.package-price {
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

.package-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.package-feature-item {
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

.package-select-btn {
  margin-top: auto;
  width: 100%;
  justify-content: center;
}
</style>