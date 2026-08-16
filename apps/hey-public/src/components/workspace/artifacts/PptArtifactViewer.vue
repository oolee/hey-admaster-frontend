<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue';

defineProps<{
  artifact: {
    html?: string;
    label?: string;
    pages?: number;
  };
}>();
</script>

<template>
  <div class="ppt-frame">
    <iframe
      v-if="artifact.html"
      :srcdoc="artifact.html"
      sandbox="allow-scripts"
      loading="lazy"
      class="ppt-iframe"
    ></iframe>
  </div>
  <div class="artifact-bar">
    <Badge tone="ai"> {{ artifact.pages || 5 }} 页 · 自动动效 </Badge>
  </div>
</template>

<style scoped>
.ppt-frame {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: #0f2e2c;
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

.ppt-iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.artifact-bar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
}
</style>
