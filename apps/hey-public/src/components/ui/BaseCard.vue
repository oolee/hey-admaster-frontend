<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  hover: { type: Boolean, default: false },
  padding: { type: String, default: 'var(--sp-5)' },
  radius: { type: String, default: 'var(--r-xl)' },
});

const style = computed(() => ({
  padding: props.padding,
  borderRadius: props.radius,
}));
</script>

<template>
  <div class="card" :class="{ 'card--hover': hover }" :style="style">
    <slot></slot>
  </div>
</template>

<style scoped>
.card {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  transition:
    transform 0.35s var(--ease-out-expo),
    box-shadow 0.35s var(--ease-out-expo),
    border-color 0.35s ease;
}

.card--hover:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}
</style>
