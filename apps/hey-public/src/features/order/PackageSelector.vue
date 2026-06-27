<script setup lang="ts">
import type { PricingPackage } from '#/types/order';

import GlassCard from '#/components/ui/GlassCard.vue';
import NeonButton from '#/components/ui/NeonButton.vue';

defineProps<{
  packages: PricingPackage[];
}>();

const emit = defineEmits<{
  select: [pkg: PricingPackage];
}>();
</script>

<template>
  <div class="package-selector">
    <div v-if="packages.length === 0" class="selector-empty">
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
            <p v-if="pkg.description" class="package-desc">
              {{ pkg.description }}
            </p>
          </div>

          <div class="package-price">
            <span class="price-currency">{{
              pkg.currency === 'CNY' ? '¥' : '$'
            }}</span>
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
  padding: 40px 0;
  text-align: center;
}

.empty-text {
  font-size: 0.9rem;
  color: var(--color-text-muted);
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
  border-color: var(--color-neon-dim) !important;
  box-shadow: 0 0 40px var(--color-neon-glow);
}

.package-header {
  text-align: center;
}

.package-name {
  margin: 0 0 8px;
  font-family: var(--font-sans);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.package-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.package-price {
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

.package-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.package-feature-item {
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

.package-select-btn {
  justify-content: center;
  width: 100%;
  margin-top: auto;
}
</style>
