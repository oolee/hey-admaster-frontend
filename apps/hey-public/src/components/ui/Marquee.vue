<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  duration: { type: Number, default: 30 },
  reverse: { type: Boolean, default: false },
});

const track = ref<HTMLElement | null>(null);
let paused = false;

onMounted(() => {
  const target = track.value;
  if (!target) return;
  target.style.animationDuration = `${props.duration}s`;
  if (props.reverse) target.style.animationDirection = 'reverse';
});

function togglePause() {
  paused = !paused;
  if (track.value)
    track.value.style.animationPlayState = paused ? 'paused' : 'running';
}

onBeforeUnmount(() => (paused = false));
</script>

<template>
  <div class="marquee" @mouseenter="togglePause" @mouseleave="togglePause">
    <div ref="track" class="marquee-track">
      <slot></slot>
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.marquee {
  width: 100%;
  overflow: hidden;
}

.marquee-track {
  display: flex;
  gap: var(--sp-6);
  width: max-content;
  animation-name: marquee;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes marquee {
  to {
    transform: translateX(-50%);
  }
}
</style>
