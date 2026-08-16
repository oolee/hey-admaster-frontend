<script setup lang="ts">
import Badge from '@/components/ui/Badge.vue';

defineProps<{
  artifact: {
    html?: string;
    label?: string;
  };
}>();
</script>

<template>
  <div class="web-frame">
    <iframe
      v-if="artifact.html"
      :srcdoc="artifact.html"
      sandbox="allow-scripts"
      loading="lazy"
      class="web-iframe"
    ></iframe>
  </div>
  <div class="artifact-bar">
    <Badge tone="ai">单页响应式</Badge>
  </div>
</template>

<style scoped>
.web-frame {
  position: relative;
  height: 360px;
  overflow: hidden;
  background: #faf7f2;
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

.web-iframe {
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
