<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import NeonButton from '#/components/ui/NeonButton.vue'
import CardCarousel from '#/components/ui/CardCarousel.vue'

const videoARef = ref<HTMLVideoElement | null>(null)
const videoBRef = ref<HTMLVideoElement | null>(null)
const videoAOpacity = ref(1)
const videoBOpacity = ref(0)

let activeVideo: 'A' | 'B' = 'A'
let switching = false
const crossfadeDuration = 1200
const preloadAhead = 1.5

function getActive() {
  return activeVideo === 'A' ? videoARef.value : videoBRef.value
}

function getStandby() {
  return activeVideo === 'A' ? videoBRef.value : videoARef.value
}

function setStandbyOpacity(v: number) {
  if (activeVideo === 'A') videoBOpacity.value = v
  else videoAOpacity.value = v
}

function setActiveOpacity(v: number) {
  if (activeVideo === 'A') videoAOpacity.value = v
  else videoBOpacity.value = v
}

function crossfade() {
  if (switching) return
  switching = true

  const standby = getStandby()
  if (!standby) return

  standby.currentTime = 0
  standby.play()

  const checkReady = () => {
    if (standby.readyState >= 3) {
      const startTime = performance.now()

      function step() {
        const elapsed = performance.now() - startTime
        const t = Math.min(elapsed / crossfadeDuration, 1)
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

        setActiveOpacity(1 - eased)
        setStandbyOpacity(eased)

        if (t < 1) {
          requestAnimationFrame(step)
        } else {
          const oldActive = getActive()
          oldActive?.pause()
          if (oldActive) {
            oldActive.currentTime = 0
          }

          setActiveOpacity(0)
          setStandbyOpacity(1)
          activeVideo = activeVideo === 'A' ? 'B' : 'A'
          switching = false
        }
      }
      requestAnimationFrame(step)
    } else {
      setTimeout(checkReady, 100)
    }
  }

  checkReady()
}

function onTimeUpdate() {
  const active = getActive()
  if (!active || switching) return

  if (active.currentTime >= active.duration - preloadAhead) {
    crossfade()
  }
}

onMounted(() => {
  const a = videoARef.value
  const b = videoBRef.value
  if (a) {
    a.playbackRate = 0.6
    a.addEventListener('timeupdate', onTimeUpdate)
  }
  if (b) {
    b.playbackRate = 0.6
  }
})

onUnmounted(() => {
  videoARef.value?.removeEventListener('timeupdate', onTimeUpdate)
})
</script>

<template>
  <section class="hero-section">
    <video
      ref="videoARef"
      class="hero-video"
      :style="{ opacity: videoAOpacity }"
      src="/isiland.mp4"
      autoplay
      muted
      playsinline
    />
    <video
      ref="videoBRef"
      class="hero-video"
      :style="{ opacity: videoBOpacity }"
      src="/isiland.mp4"
      muted
      playsinline
      preload="auto"
    />

    <div class="hero-overlay" />

    <!-- 主内容：响应式居中，桌面端右对齐 -->
    <div class="hero-content">
      <h1 class="hero-title animate-fade-in-up">
        用AI重新定义创意
      </h1>
      <p class="hero-subtitle animate-fade-in-up delay-200">
        品牌策略 × AI图像生成 = 无限创意可能
      </p>
      <div class="hero-cta animate-fade-in-up delay-400">
        <NeonButton to="/studio" variant="filled" size="lg">
          开始创作
        </NeonButton>
        <NeonButton to="/order" variant="outline" size="lg">
          了解更多
        </NeonButton>
      </div>
    </div>

    <div class="hero-carousel">
      <CardCarousel />
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  position: relative;
  width: 100%;
  height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  background: #0a0a0f;
}

.hero-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  transition: opacity 0.05s linear;
  will-change: opacity;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 10, 15, 0.25) 0%,
    rgba(10, 10, 15, 0.05) 20%,
    rgba(10, 10, 15, 0.0) 40%,
    rgba(10, 10, 15, 0.3) 75%,
    rgba(10, 10, 15, 0.7) 100%
  );
  z-index: 1;
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1400px;
  padding: 0 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: right;
  align-items: flex-end;
}

.hero-title {
  font-size: clamp(2.2rem, 5vw, 4.5rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: #C8FF00;
  text-shadow:
    0 0 20px rgba(200, 255, 0, 0.15),
    0 0 40px rgba(200, 255, 0, 0.15);
  animation: neonPulse 2s ease-in-out infinite;
  margin-bottom: 16px;
  max-width: 650px;
}

.hero-subtitle {
  font-size: clamp(0.95rem, 1.8vw, 1.25rem);
  color: #000000;
  font-weight: 400;
  line-height: 1.6;
  margin-bottom: 32px;
  max-width: 650px;
}

.hero-cta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.hero-carousel {
  position: relative;
  z-index: 2;
  width: 100%;
  overflow: hidden;
  flex-shrink: 0;
  padding-bottom: 30px;
}
</style>
