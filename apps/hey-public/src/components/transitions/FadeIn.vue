<script setup lang="ts">
defineProps<{
  delay?: number
}>()
</script>

<template>
  <Transition name="fade" appear>
    <div class="fade-in" :style="{ animationDelay: `${delay ?? 0}s` }">
      <slot />
    </div>
  </Transition>
</template>

<style scoped>
.fade-in {
  animation: fadeInUp 0.8s ease-out forwards;
  opacity: 0;
}

.fade-enter-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
</style>