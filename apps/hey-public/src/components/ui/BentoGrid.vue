<script setup lang="ts">
defineProps<{
  cols?: number
  gap?: string
}>()
</script>

<template>
  <div class="bento-grid" :style="{ '--bento-cols': cols || 3, '--bento-gap': gap || '20px' }">
    <slot />
  </div>
</template>

<style scoped>
.bento-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--bento-gap);
}

@media (min-width: 640px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(var(--bento-cols), 1fr);
  }
}
</style>