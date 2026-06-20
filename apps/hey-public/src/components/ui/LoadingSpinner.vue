<script setup lang="ts">
defineProps<{
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <div class="loading-spinner" :class="`size-${size || 'md'}`">
    <div class="spinner-ring" />
  </div>
</template>

<style scoped>
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-ring {
  border-radius: 50%;
  border: 2px solid rgba(200, 255, 0, 0.15);
  border-top-color: #C8FF00;
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
  to { transform: rotate(360deg); }
}
</style>