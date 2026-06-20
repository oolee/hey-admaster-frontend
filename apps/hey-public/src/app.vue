<script setup lang="ts">
import CursorGlow from '#/components/ui/CursorGlow.vue';
import NoiseOverlay from '#/components/ui/NoiseOverlay.vue';
</script>

<template>
  <NoiseOverlay />
  <CursorGlow />
  <RouterView />
</template>
