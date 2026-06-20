<script setup lang="ts">
import { Icon } from '@iconify/vue'
import GlassCard from '#/components/ui/GlassCard.vue'

defineProps<{
  tag: string
  icon: string
  title: string
  description: string
  features: string[]
}>()
</script>

<template>
  <GlassCard :tag="tag" :hoverable="true">
    <div class="service-card">
      <Icon :icon="icon" class="service-icon" />

      <h3 class="service-title">{{ title }}</h3>

      <p class="service-description">{{ description }}</p>

      <div class="service-features">
        <span
          v-for="feature in features"
          :key="feature"
          class="feature-pill"
        >
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
  color: #C8FF00;
  line-height: 1;
}

.service-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f0f0f5;
  font-family: var(--font-sans);
  margin: 0;
}

.service-description {
  font-size: 0.95rem;
  color: #8888a0;
  line-height: 1.6;
  margin: 0;
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
  font-size: 0.75rem;
  font-weight: 500;
  color: #C8FF00;
  background: rgba(200, 255, 0, 0.08);
  border: 1px solid rgba(200, 255, 0, 0.15);
  border-radius: 9999px;
  font-family: var(--font-sans);
  transition: all 0.3s ease;
}

.feature-pill:hover {
  background: rgba(200, 255, 0, 0.15);
  border-color: rgba(200, 255, 0, 0.3);
}
</style>