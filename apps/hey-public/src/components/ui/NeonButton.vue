<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{
  to?: string
  href?: string
  variant?: 'outline' | 'filled'
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <component
    :is="to ? RouterLink : href ? 'a' : 'button'"
    :to="to"
    :href="href"
    class="neon-button"
    :class="[
      `variant-${variant || 'outline'}`,
      `size-${size || 'md'}`,
    ]"
  >
    <slot />
  </component>
</template>

<style scoped>
.neon-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 9999px;
  font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1.2);
  text-decoration: none;
  border: none;
  outline: none;
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
  border: 1px solid rgba(200, 255, 0, 0.3);
  color: #C8FF00;
  background: transparent;
}

.variant-outline:hover {
  background: rgba(200, 255, 0, 0.1);
  box-shadow: 0 0 30px rgba(200, 255, 0, 0.2);
  transform: translateY(-1px);
}

/* Variant: filled */
.variant-filled {
  background: #C8FF00;
  color: #0a0a0f;
  border: none;
}

.variant-filled:hover {
  box-shadow: 0 0 40px rgba(200, 255, 0, 0.4);
  transform: scale(1.03);
}
</style>