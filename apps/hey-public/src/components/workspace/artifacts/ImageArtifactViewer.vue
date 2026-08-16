<script setup lang="ts">
import ArtCanvas from '@/components/ui/ArtCanvas.vue';

defineProps<{
  artifact: {
    images?: Array<{ seed?: number; url: string }>;
    label?: string;
  };
  messageId: string;
}>();
</script>

<template>
  <div class="image-viewer">
    <template v-if="artifact.images?.length">
      <img
        v-for="img in artifact.images"
        :key="img.url"
        :src="img.url"
        class="artifact-img"
        alt="AI 生成图像"
      />
    </template>
    <ArtCanvas
      v-else
      variant="poster"
      :seed="messageId"
      :label="artifact.label"
    />
  </div>
</template>

<style scoped>
.image-viewer {
  padding: var(--sp-3);
  background: var(--color-bg-deep);
}

.artifact-img {
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: contain;
  background: var(--color-surface-2);
  border-radius: var(--r-lg);
}

.artifact-img + .artifact-img {
  margin-top: var(--sp-2);
}
</style>
