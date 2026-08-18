<script setup>
defineProps({
  variant: { type: String, default: 'primary' }, // primary | outline | ghost | danger
  size: { type: String, default: 'md' },
  block: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['click']);
</script>

<template>
  <button
    class="abtn"
    :class="[
      `abtn--${variant}`,
      `abtn--${size}`,
      { block, 'is-loading': loading },
    ]"
    :disabled="disabled || loading"
    @click="emit('click', $event)"
  >
    <span v-if="loading" class="abtn-spinner"></span>
    <slot></slot>
  </button>
</template>

<style scoped>
.abtn {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  border-radius: 10px;
  transition: all var(--dur-fast) var(--ease-out-expo);
}

.abtn:active:not(:disabled) {
  transform: scale(0.97);
}

.abtn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentcolor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: a-spin 0.7s linear infinite;
}

@keyframes a-spin {
  to {
    transform: rotate(360deg);
  }
}

.abtn--primary {
  color: var(--color-text-inverse);
  background: var(--color-accent);
  box-shadow: var(--shadow-accent);
}

.abtn--primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}

.abtn--outline {
  color: var(--color-text-1);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border-strong);
}

.abtn--outline:hover:not(:disabled) {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.abtn--ghost {
  color: var(--color-text-2);
  background: transparent;
}

.abtn--ghost:hover:not(:disabled) {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.abtn--danger {
  color: #fff;
  background: var(--color-error);
}

.abtn--danger:hover:not(:disabled) {
  filter: brightness(1.08);
}

.abtn--sm {
  padding: 0.45rem 0.85rem;
  font-size: var(--text-xs);
}

.abtn--md {
  padding: 0.6rem 1.1rem;
}

.abtn--lg {
  padding: 0.85rem 1.6rem;
  font-size: var(--text-base);
}

.block {
  width: 100%;
}

.abtn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
