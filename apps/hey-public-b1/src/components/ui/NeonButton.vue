<script setup lang="ts">
import { RouterLink } from 'vue-router';

defineProps<{
  href?: string;
  size?: 'lg' | 'md' | 'sm';
  to?: string;
  variant?: 'filled' | 'outline';
}>();
</script>

<template>
  <component
    :is="to ? RouterLink : href ? 'a' : 'button'"
    :to="to"
    :href="href"
    class="neon-button"
    :class="[`variant-${variant || 'outline'}`, `size-${size || 'md'}`]"
  >
    <slot></slot>
  </component>
</template>

<style scoped>
.neon-button {
  position: relative;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-family: var(--font-sans);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  outline: none;
  border: none;
  border-radius: 9999px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1.2);
}

/* Sizes */
.size-sm {
  padding: 8px 18px;
  font-size: 0.85rem;
}

.size-md {
  padding: 12px 28px;
  font-size: 0.95rem;
}

.size-lg {
  padding: 16px 36px;
  font-size: 1.05rem;
}

/* Variant: outline */
.variant-outline {
  color: var(--color-neon);
  background: transparent;
  border: 1px solid var(--color-neon-dim);
}

.variant-outline:hover {
  background: var(--color-neon-glow);
  box-shadow: 0 0 30px var(--color-neon-glow);
  transform: translateY(-1px);
}

/* Variant: filled */
.variant-filled {
  color: var(--color-bg-primary);
  background: var(--color-neon);
  border: none;
}

.variant-filled:hover {
  box-shadow: 0 0 40px var(--color-neon-glow);
  transform: scale(1.03);
}
</style>
