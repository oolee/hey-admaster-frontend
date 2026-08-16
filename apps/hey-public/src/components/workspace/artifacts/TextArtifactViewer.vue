<script setup lang="ts">
defineProps<{
  artifact: {
    label?: string;
    text?: string;
  };
}>();
</script>

<template>
  <p v-if="artifact.text" class="text-viewer">{{ artifact.text }}</p>
  <p v-else-if="artifact.label" class="text-viewer">{{ artifact.label }}</p>
</template>

<style scoped>
.text-viewer {
  font-size: var(--text-base);
  line-height: 1.8;
  white-space: pre-line;
}
</style>
