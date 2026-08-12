<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  tone: { type: String, default: 'accent' }, // accent | ai | neutral | success | warning | error
  dot: { type: Boolean, default: false },
});

const cls = computed(() => `badge badge--${props.tone}`);
</script>

<template>
  <span class="badge" :class="cls">
    <span v-if="dot" class="badge-dot"></span>
    <slot></slot>
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  padding: 0.3rem 0.7rem;
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  border-radius: var(--r-full);
}

.badge-dot {
  width: 6px;
  height: 6px;
  background: currentcolor;
  border-radius: 50%;
}

.badge--accent {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.badge--ai {
  color: var(--color-ai);
  background: var(--color-ai-soft);
}

.badge--neutral {
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.badge--success {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 12%, transparent);
}

.badge--warning {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 12%, transparent);
}

.badge--error {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 12%, transparent);
}
</style>
