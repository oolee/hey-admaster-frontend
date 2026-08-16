<script setup lang="ts"></script>

<template>
  <Transition name="page" mode="out-in">
    <slot></slot>
  </Transition>
</template>

<style scoped>
.page-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}

.page-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
