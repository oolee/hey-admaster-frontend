<script setup lang="ts">
import { FileText } from 'lucide-vue-next';

defineProps<{
  artifact: {
    label?: string;
    url?: string;
  };
}>();
</script>

<template>
  <div class="fallback-viewer">
    <FileText :size="20" />
    <span>{{ artifact.label || '产物' }}</span>
    <a
      v-if="artifact.url"
      :href="artifact.url"
      target="_blank"
      rel="noreferrer"
    >
      打开
    </a>
  </div>
</template>

<style scoped>
.fallback-viewer {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem 1rem;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border-radius: var(--r-lg);
}

.fallback-viewer a {
  font-weight: 600;
  color: var(--color-accent);
}
</style>
