<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  delay: { type: Number, default: 0 },
  y: { type: Number, default: 24 },
  once: { type: Boolean, default: true },
});

const el = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  const target = el.value;
  if (!target) return;
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.isIntersecting) {
        target.classList.add('revealed');
        if (props.once) observer?.disconnect();
      } else if (!props.once) {
        target.classList.remove('revealed');
      }
    },
    { threshold: 0.12 },
  );
  observer.observe(target);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div
    ref="el"
    class="reveal"
    :style="{ transitionDelay: `${delay}ms`, '--reveal-y': `${y}px` }"
  >
    <slot></slot>
  </div>
</template>

<style scoped>
.reveal {
  opacity: 0;
  transform: translateY(var(--reveal-y));
  transition:
    opacity 0.8s var(--ease-out-expo),
    transform 0.8s var(--ease-out-expo);
}

.reveal.revealed {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
  }
}
</style>
