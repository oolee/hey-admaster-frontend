<script setup lang="ts">
import FloatingIsland from '#/components/three/FloatingIsland.vue'
import ParticleField from '#/components/three/ParticleField.vue'
import { ref, onMounted, onUnmounted } from 'vue'

const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div class="hero-canvas">
    <template v-if="!isMobile">
      <ParticleField />
      <FloatingIsland />
    </template>
    <div v-else class="hero-fallback">
      <div class="fallback-glow" />
    </div>
  </div>
</template>

<style scoped>
.hero-canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.hero-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fallback-glow {
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200, 255, 0, 0.1) 0%, transparent 70%);
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}
</style>