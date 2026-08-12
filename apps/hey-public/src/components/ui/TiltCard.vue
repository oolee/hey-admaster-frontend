<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
  max: { type: Number, default: 10 },
});

const el = ref<HTMLElement | null>(null);

function onMove(e: MouseEvent) {
  const target = el.value;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width - 0.5;
  const py = (e.clientY - rect.top) / rect.height - 0.5;
  target.style.transform = `perspective(800px) rotateY(${px * props.max}deg) rotateX(${-py * props.max}deg) translateY(-4px)`;
}

function onLeave() {
  if (el.value)
    el.value.style.transform =
      'perspective(800px) rotateY(0) rotateX(0) translateY(0)';
}
</script>

<template>
  <div ref="el" class="tilt" @mousemove="onMove" @mouseleave="onLeave">
    <slot></slot>
  </div>
</template>

<style scoped>
.tilt {
  transform-style: preserve-3d;
  transition: transform 0.4s var(--ease-out-expo);
  will-change: transform;
}

@media (pointer: coarse) {
  .tilt {
    transition: none;
  }
}
</style>
