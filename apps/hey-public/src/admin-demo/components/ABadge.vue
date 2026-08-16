<script setup>
defineProps({
  tone: { type: String, default: 'neutral' } // accent | ai | success | warning | error | neutral
})
</script>

<template>
  <span class="ab" :class="`ab--${tone}`">
    <slot />
  </span>
</template>

<style scoped>
.ab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: var(--r-full);
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
}
.ab--accent { background: var(--color-accent-soft); color: var(--color-accent); }
.ab--ai { background: var(--color-ai-soft); color: var(--color-ai); }
.ab--success { background: color-mix(in srgb, var(--color-success) 13%, transparent); color: var(--color-success); }
.ab--warning { background: color-mix(in srgb, var(--color-warning) 13%, transparent); color: var(--color-warning); }
.ab--error { background: color-mix(in srgb, var(--color-error) 13%, transparent); color: var(--color-error); }
.ab--neutral { background: var(--color-surface-2); color: var(--color-text-2); border: 1px solid var(--color-border); }
</style>