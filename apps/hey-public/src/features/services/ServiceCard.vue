<script setup lang="ts">
import { Icon } from '@iconify/vue';

import GlassCard from '#/components/ui/GlassCard.vue';

defineProps<{
  description: string;
  features: string[];
  icon: string;
  tag: string;
  title: string;
}>();
</script>

<template>
  <GlassCard :tag="tag" :hoverable="true">
    <div class="service-card">
      <Icon :icon="icon" class="service-icon" />

      <h3 class="service-title">{{ title }}</h3>

      <p class="service-description">{{ description }}</p>

      <div class="service-features">
        <span v-for="feature in features" :key="feature" class="feature-pill">
          {{ feature }}
        </span>
      </div>
    </div>
  </GlassCard>
</template>

<style scoped>
.service-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.service-icon {
  font-size: 2rem;
  line-height: 1;
  color: var(--color-neon);
}

.service-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.service-description {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.service-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.feature-pill {
  display: inline-block;
  padding: 4px 12px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
  transition: all 0.3s ease;
}

.feature-pill:hover {
  background: var(--color-neon-dim);
  border-color: var(--color-neon);
}
</style>
