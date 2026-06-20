<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  align?: 'left' | 'center'
}>()
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
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 700;
  font-family: var(--font-sans);
  line-height: 1.1;
  margin-bottom: 0;
}

.section-subtitle {
  margin-top: 12px;
  font-size: 1rem;
  color: #8888a0;
  max-width: 600px;
}

.align-center .section-subtitle {
  margin-left: auto;
  margin-right: auto;
}
</style>