<script setup lang="ts">
defineProps<{
  tag?: string
  hoverable?: boolean
}>()
</script>

<template>
  <div
    class="glass-card-component"
    :class="{ 'hoverable': hoverable !== false }"
    :data-tag="tag"
  >
    <slot />
  </div>
</template>

<style scoped>
.glass-card-component {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 32px;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1.2);
  position: relative;
  overflow: hidden;
}

.glass-card-component::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(200, 255, 0, 0.04), transparent 40%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.glass-card-component.hoverable:hover {
  background: rgba(25, 25, 40, 0.7);
  border-color: var(--color-border-hover);
  box-shadow: 0 0 40px var(--color-neon-glow);
  transform: translateY(-4px);
}

.glass-card-component.hoverable:hover::before {
  opacity: 1;
}

.glass-card-component[data-tag]::after {
  content: attr(data-tag);
  position: absolute;
  top: 16px;
  right: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #C8FF00;
  opacity: 0.5;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
</style>