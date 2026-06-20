<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { BasicShadowMap, SRGBColorSpace, NoToneMapping, Color } from 'three'
import { ref } from 'vue'

const gl = {
  clearColor: 'transparent',
  shadows: true,
  alpha: true,
  shadowMapType: BasicShadowMap,
  outputColorSpace: SRGBColorSpace,
  toneMapping: NoToneMapping,
}

const neonColor = new Color('#C8FF00')
const islandRotation = ref(0)
</script>

<template>
  <TresCanvas
    v-bind="gl"
    class="floating-island-canvas"
    render-mode="on-demand"
    :window-size="true"
  >
    <TresPerspectiveCamera
      :position="[0, 2, 12]"
      :fov="50"
      :near="0.1"
      :far="100"
    />
    <OrbitControls
      :enable-zoom="false"
      :enable-pan="false"
      :auto-rotate="true"
      :auto-rotate-speed="0.2"
      :enable-damping="true"
      :damping-factor="0.05"
    />
    <TresAmbientLight :intensity="0.4" />
    <TresDirectionalLight
      :position="[5, 8, 5]"
      :intensity="1.2"
      :color="neonColor"
    />
    <TresPointLight
      :position="[-3, 2, 3]"
      :intensity="0.6"
      :color="neonColor"
      :distance="15"
    />

    <!-- Main floating island -->
    <TresGroup :position="[0, -1, 0]">
      <!-- Island base - large disc -->
      <TresMesh :position="[0, 0, 0]" :rotation="[-Math.PI / 2, 0, 0]">
        <TresCylinderGeometry :args="[3, 2.5, 0.4, 32]" />
        <TresMeshStandardMaterial
          :color="new Color('#1a1a2e')"
          :roughness="0.7"
          :metalness="0.3"
          :emissive="neonColor"
          :emissive-intensity="0.05"
        />
      </TresMesh>

      <!-- Top surface -->
      <TresMesh :position="[0, 0.2, 0]" :rotation="[-Math.PI / 2, 0, 0]">
        <TresCylinderGeometry :args="[2.8, 2.8, 0.05, 32]" />
        <TresMeshStandardMaterial
          :color="new Color('#2a2a3e')"
          :roughness="0.5"
          :emissive="neonColor"
          :emissive-intensity="0.03"
        />
      </TresMesh>

      <!-- Crystal structures on top -->
      <TresMesh v-for="i in 5" :key="'crystal-' + i"
        :position="[
          Math.cos((i / 5) * Math.PI * 2) * 1.5,
          0.8 + Math.random() * 0.6,
          Math.sin((i / 5) * Math.PI * 2) * 1.5
        ]"
        :rotation="[Math.random() * 0.5, Math.random() * Math.PI, 0]"
      >
        <TresOctahedronGeometry :args="[0.2 + Math.random() * 0.3, 0]" />
        <TresMeshStandardMaterial
          :color="neonColor"
          :roughness="0.2"
          :metalness="0.8"
          :emissive="neonColor"
          :emissive-intensity="0.4"
          :wireframe="Math.random() > 0.5"
        />
      </TresMesh>

      <!-- Small floating rocks -->
      <TresMesh v-for="i in 8" :key="'rock-' + i"
        :position="[
          Math.cos((i / 8) * Math.PI * 2) * (2.5 + Math.random() * 1.5),
          Math.random() * 0.5 - 0.5,
          Math.sin((i / 8) * Math.PI * 2) * (2.5 + Math.random() * 1.5)
        ]"
        :rotation="[Math.random() * Math.PI, Math.random() * Math.PI, 0]"
      >
        <TresIcosahedronGeometry :args="[0.15 + Math.random() * 0.25, 1]" />
        <TresMeshStandardMaterial
          :color="new Color('#2a2a3e')"
          :roughness="0.6"
          :emissive="neonColor"
          :emissive-intensity="0.02"
        />
      </TresMesh>
    </TresGroup>

    <!-- Orbital ring -->
    <TresGroup>
      <TresMesh :rotation="[Math.PI / 2.5, 0, 0]">
        <TresTorusGeometry :args="[4.5, 0.03, 16, 120]" />
        <TresMeshBasicMaterial
          :color="neonColor"
          :transparent="true"
          :opacity="0.4"
        />
      </TresMesh>
      <TresMesh :rotation="[Math.PI / 2.5, 0, Math.PI / 3]">
        <TresTorusGeometry :args="[4.5, 0.02, 16, 120]" />
        <TresMeshBasicMaterial
          :color="neonColor"
          :transparent="true"
          :opacity="0.2"
        />
      </TresMesh>
    </TresGroup>
  </TresCanvas>
</template>

<style scoped>
.floating-island-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
</style>