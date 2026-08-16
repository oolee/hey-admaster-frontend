<script setup lang="ts">
defineProps<{
  size?: 'lg' | 'md' | 'sm';
}>();
</script>

<template>
  <div class="loading-spinner" :class="`size-${size || 'md'}`">
    <div class="spinner-ring"></div>
  </div>
</template>

<style scoped>
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-ring {
  border: 2px solid var(--color-neon-dim);
  border-top-color: var(--color-neon);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.size-sm .spinner-ring {
  width: 20px;
  height: 20px;
}

.size-md .spinner-ring {
  width: 40px;
  height: 40px;
}

.size-lg .spinner-ring {
  width: 60px;
  height: 60px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
