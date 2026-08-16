<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const pos = ref({ x: 0, y: 0 });
const visible = ref(false);

function onMouseMove(e: MouseEvent) {
  pos.value = { x: e.clientX, y: e.clientY };
  visible.value = true;
}

function onMouseLeave() {
  visible.value = false;
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseleave', onMouseLeave);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseleave', onMouseLeave);
});
</script>

<template>
  <div
    class="cursor-glow"
    :class="{ visible }"
    :style="{
      left: `${pos.x}px`,
      top: `${pos.y}px`,
    }"
    aria-hidden="true"
  ></div>
</template>

<style scoped>
.cursor-glow {
  position: fixed;
  z-index: 9998;
  width: 300px;
  height: 300px;
  pointer-events: none;
  background: radial-gradient(
    circle,
    var(--color-neon-glow) 0%,
    transparent 70%
  );
  border-radius: 50%;
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: opacity 0.3s ease;
}

.cursor-glow.visible {
  opacity: 1;
}
</style>
