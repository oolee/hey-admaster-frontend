<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';

import { useMouse } from '@vueuse/core';

const props = defineProps({
  strength: { type: Number, default: 0.25 },
});

const el = ref<HTMLElement | null>(null);
const { x, y } = useMouse();
let raf = 0;

function onMove(e: MouseEvent) {
  const target = el.value;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const relX = e.clientX - (rect.left + rect.width / 2);
  const relY = e.clientY - (rect.top + rect.height / 2);
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    target.style.transform = `translate(${relX * props.strength}px, ${relY * props.strength}px)`;
  });
}

function onLeave() {
  cancelAnimationFrame(raf);
  if (el.value) el.value.style.transform = 'translate(0, 0)';
}

onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <div ref="el" class="magnetic" @mousemove="onMove" @mouseleave="onLeave">
    <slot></slot>
  </div>
</template>

<style scoped>
.magnetic {
  display: inline-block;
  transition: transform 0.3s var(--ease-out-expo);
  will-change: transform;
}

@media (pointer: coarse) {
  .magnetic {
    transition: none;
  }
}
</style>
