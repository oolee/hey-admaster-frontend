<script setup lang="ts">
defineProps<{
  delay?: number;
}>();
</script>

<template>
  <Transition name="fade" appear>
    <div class="fade-in" :style="{ animationDelay: `${delay ?? 0}s` }">
      <slot></slot>
    </div>
  </Transition>
</template>

<style scoped>
.fade-in {
  opacity: 0;
  animation: fade-in-up 0.8s ease-out forwards;
}

.fade-enter-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
</style>
