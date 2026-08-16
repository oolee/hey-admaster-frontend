<script setup lang="ts">
defineProps<{
  artifact: {
    code?: string;
    label?: string;
  };
}>();
</script>

<template>
  <pre class="code-block"><code>{{ artifact.code }}</code></pre>
</template>

<style scoped>
.code-block {
  max-height: 320px;
  padding: 0.9rem 1rem;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.6;
  color: var(--color-text-1);
  background: var(--color-surface-2);
  border-radius: var(--r-lg);
}
</style>
