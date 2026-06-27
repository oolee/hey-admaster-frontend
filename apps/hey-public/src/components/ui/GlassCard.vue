<script setup lang="ts">
defineProps<{
  hoverable?: boolean;
  tag?: string;
}>();
</script>

<template>
  <div
    class="glass-card-component"
    :class="{ hoverable: hoverable !== false }"
    :data-tag="tag"
  >
    <slot></slot>
  </div>
</template>

<style scoped>
.glass-card-component {
  position: relative;
  padding: 32px;
  overflow: hidden;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  backdrop-filter: var(--glass-blur);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1.2);
}

.glass-card-component::before {
  position: absolute;
  inset: 0;
  content: '';
  background: radial-gradient(
    600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    var(--color-neon-glow),
    transparent 40%
  );
  border-radius: 20px;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.glass-card-component.hoverable:hover {
  background: var(--color-bg-card-hover);
  border-color: var(--color-border-hover);
  box-shadow: 0 0 40px var(--color-neon-glow);
  transform: translateY(-4px);
}

.glass-card-component.hoverable:hover::before {
  opacity: 1;
}

.glass-card-component[data-tag]::after {
  position: absolute;
  top: 16px;
  right: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-neon);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  content: attr(data-tag);
  opacity: 0.5;
}
</style>
