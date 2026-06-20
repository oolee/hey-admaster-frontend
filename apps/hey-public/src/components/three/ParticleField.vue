<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { Color, BufferGeometry, BufferAttribute, PointsMaterial, AdditiveBlending } from 'three'
import { ref, onMounted, onUnmounted } from 'vue'

const particleCount = 300
const positions = new Float32Array(particleCount * 3)
const colors = new Float32Array(particleCount * 3)
const neonColor = new Color('#C8FF00')

for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 20
  positions[i * 3 + 1] = (Math.random() - 0.5) * 20
  positions[i * 3 + 2] = (Math.random() - 0.5) * 10

  const c = neonColor.clone()
  c.offsetHSL(0, 0, (Math.random() - 0.5) * 0.3)
  colors[i * 3] = c.r
  colors[i * 3 + 1] = c.g
  colors[i * 3 + 2] = c.b
}

const geometry = new BufferGeometry()
geometry.setAttribute('position', new BufferAttribute(positions, 3))
geometry.setAttribute('color', new BufferAttribute(colors, 3))

const gl = {
  clearColor: 'transparent',
  alpha: true,
}
</script>

<template>
  <TresCanvas v-bind="gl" class="particle-canvas" render-mode="on-demand">
    <TresPerspectiveCamera :position="[0, 0, 10]" :fov="60" />
    <TresPoints>
      <TresBufferGeometry :position="geometry.attributes.position" :color="geometry.attributes.color" />
      <TresPointsMaterial
        :size="0.04"
        :vertex-colors="true"
        :blending="AdditiveBlending"
        :depth-write="false"
        :transparent="true"
        :opacity="0.6"
      />
    </TresPoints>
  </TresCanvas>
</template>

<style scoped>
.particle-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
</style>