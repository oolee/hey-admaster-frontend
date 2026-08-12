<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | ghost | outline | danger
  size: { type: String, default: 'md' }, // sm | md | lg | xl
  block: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  to: { type: String, default: '' },
  href: { type: String, default: '' },
});

const emit = defineEmits(['click']);

const classes = computed(() => [
  'btn',
  `btn--${props.variant}`,
  `btn--${props.size}`,
  { 'btn--block': props.block, 'is-loading': props.loading },
]);

function handleClick(e: MouseEvent) {
  if (props.disabled || props.loading) return;
  emit('click', e);
}
</script>

<template>
  <component
    :is="to ? 'router-link' : href ? 'a' : 'button'"
    :to="to || undefined"
    :href="href || undefined"
    :class="classes"
    :disabled="(!to && !href && (disabled || loading)) || undefined"
    :aria-disabled="disabled || loading ? 'true' : undefined"
    @click="handleClick"
  >
    <span v-if="loading" class="btn-spinner" aria-hidden="true"></span>
    <slot></slot>
  </component>
</template>

<style scoped>
.btn {
  position: relative;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  border-radius: var(--r-full);
  transition: all var(--dur-fast) var(--ease-out-expo);
}

.btn:active:not(.is-loading) {
  transform: scale(0.97);
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentcolor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn--primary {
  color: var(--color-text-inverse);
  background: var(--color-accent);
  box-shadow: var(--shadow-accent);
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
  box-shadow: 0 12px 28px var(--glow-accent);
  transform: translateY(-1px);
}

.btn--secondary {
  color: var(--color-text-inverse);
  background: var(--color-primary-deep);
}

.btn--secondary:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}

.btn--outline {
  color: var(--color-text-1);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border-strong);
}

.btn--outline:hover:not(:disabled) {
  color: var(--color-accent);
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.btn--ghost {
  color: var(--color-text-2);
  background: transparent;
}

.btn--ghost:hover:not(:disabled) {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

/* 用于彩色背景上的半透明白底按钮 */
.btn--outline-light {
  color: #fff;
  background: rgb(255 255 255 / 15%);
  border: 1.5px solid rgb(255 255 255 / 60%);
  backdrop-filter: blur(8px);
}

.btn--outline-light:hover:not(:disabled) {
  color: #fff;
  background: rgb(255 255 255 / 25%);
  border-color: #fff;
  transform: translateY(-1px);
}

.btn--danger {
  color: #fff;
  background: var(--color-error);
}

.btn--danger:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.btn--sm {
  padding: 0.55rem 1rem;
  font-size: var(--text-sm);
}

.btn--md {
  padding: 0.7rem 1.4rem;
  font-size: var(--text-sm);
}

.btn--lg {
  padding: 0.95rem 1.9rem;
  font-size: var(--text-base);
}

.btn--xl {
  padding: 1.1rem 2.4rem;
  font-size: var(--text-lg);
}

.btn--block {
  width: 100%;
}

.btn:disabled,
.btn[aria-disabled='true'] {
  pointer-events: none;
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
