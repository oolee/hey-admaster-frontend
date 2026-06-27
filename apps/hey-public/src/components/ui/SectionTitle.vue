<script setup lang="ts">
defineProps<{
  align?: 'center' | 'left';
  subtitle?: string;
  title: string;
}>();
</script>

<template>
  <div class="section-title-wrapper" :class="`align-${align || 'center'}`">
    <h2 class="section-title-text text-neon">{{ title }}</h2>
    <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.section-title-wrapper {
  margin-bottom: 48px;
}

.align-center {
  text-align: center;
}

.align-left {
  text-align: left;
}

.section-title-text {
  margin-bottom: 0;
  font-family: var(--font-sans);
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 700;
  line-height: 1.1;
}

.section-subtitle {
  max-width: 600px;
  margin-top: 12px;
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.align-center .section-subtitle {
  margin-right: auto;
  margin-left: auto;
}
</style>
