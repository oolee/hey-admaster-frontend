<script setup>
defineProps({
  tone: { type: String, default: 'neutral' }, // accent | ai | success | warning | error | neutral
});
</script>

<template>
  <span class="ab" :class="`ab--${tone}`">
    <slot></slot>
  </span>
</template>

<style scoped>
.ab {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 2px 9px;
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  border-radius: var(--r-full);
}

.ab--accent {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.ab--ai {
  color: var(--color-ai);
  background: var(--color-ai-soft);
}

.ab--success {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 13%, transparent);
}

.ab--warning {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 13%, transparent);
}

.ab--error {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 13%, transparent);
}

.ab--neutral {
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}
</style>
