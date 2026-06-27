<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import { Color } from 'three';

const neonColor = new Color('#C8FF00');

const gl = {
  clearColor: 'transparent',
  alpha: true,
};
</script>

<template>
  <TresCanvas v-bind="gl" class="torus-knot-canvas" render-mode="on-demand">
    <TresPerspectiveCamera :position="[0, 0, 6]" :fov="45" />
    <TresAmbientLight :intensity="0.3" />
    <TresPointLight :position="[3, 3, 3]" :intensity="1" :color="neonColor" />

    <TresMesh :rotation="[0, 0, 0]">
      <TresTorusKnotGeometry :args="[1.2, 0.3, 100, 16]" />
      <TresMeshStandardMaterial
        :color="new Color('#1a1a2e')"
        :roughness="0.3"
        :metalness="0.7"
        :wireframe="true"
        :emissive="neonColor"
        :emissive-intensity="0.15"
      />
    </TresMesh>
  </TresCanvas>
</template>

<style scoped>
.torus-knot-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>
