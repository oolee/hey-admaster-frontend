<script setup lang="ts">
import { TresCanvas } from '@tresjs/core';
import { BufferAttribute, BufferGeometry, Color } from 'three';

const starCount = 200;
const positions = new Float32Array(starCount * 3);

for (let i = 0; i < starCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 30;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 15 - 5;
}

const geometry = new BufferGeometry();
geometry.setAttribute('position', new BufferAttribute(positions, 3));

const gl = {
  clearColor: '#0a0a0f',
  alpha: false,
};
</script>

<template>
  <TresCanvas v-bind="gl" class="scene-bg-canvas" render-mode="on-demand">
    <TresPerspectiveCamera :position="[0, 0, 10]" :fov="75" />
    <TresPoints>
      <TresBufferGeometry :position="geometry.attributes.position" />
      <TresPointsMaterial
        :size="0.03"
        :color="new Color('#C8FF00')"
        :transparent="true"
        :opacity="0.3"
        :depth-write="false"
      />
    </TresPoints>
  </TresCanvas>
</template>

<style scoped>
.scene-bg-canvas {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
</style>
