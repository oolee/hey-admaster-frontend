<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import CardCarousel from '#/components/ui/CardCarousel.vue';
import NeonButton from '#/components/ui/NeonButton.vue';

const videoARef = ref<HTMLVideoElement | null>(null);
const videoBRef = ref<HTMLVideoElement | null>(null);
const videoAOpacity = ref(1);
const videoBOpacity = ref(0);

let activeVideo: 'A' | 'B' = 'A';
let switching = false;
const crossfadeDuration = 1200;
const preloadAhead = 1.5;

function getActive() {
  return activeVideo === 'A' ? videoARef.value : videoBRef.value;
}

function getStandby() {
  return activeVideo === 'A' ? videoBRef.value : videoARef.value;
}

function setStandbyOpacity(v: number) {
  if (activeVideo === 'A') videoBOpacity.value = v;
  else videoAOpacity.value = v;
}

function setActiveOpacity(v: number) {
  if (activeVideo === 'A') videoAOpacity.value = v;
  else videoBOpacity.value = v;
}

function crossfade() {
  if (switching) return;
  switching = true;

  const standby = getStandby();
  if (!standby) return;

  standby.currentTime = 0;
  standby.play();

  const checkReady = () => {
    if (standby.readyState >= 3) {
      const startTime = performance.now();

      function step() {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / crossfadeDuration, 1);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        setActiveOpacity(1 - eased);
        setStandbyOpacity(eased);

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          const oldActive = getActive();
          oldActive?.pause();
          if (oldActive) {
            oldActive.currentTime = 0;
          }

          setActiveOpacity(0);
          setStandbyOpacity(1);
          activeVideo = activeVideo === 'A' ? 'B' : 'A';
          switching = false;
        }
      }
      requestAnimationFrame(step);
    } else {
      setTimeout(checkReady, 100);
    }
  };

  checkReady();
}

function onTimeUpdate() {
  const active = getActive();
  if (!active || switching) return;

  if (active.currentTime >= active.duration - preloadAhead) {
    crossfade();
  }
}

onMounted(() => {
  const a = videoARef.value;
  const b = videoBRef.value;
  if (a) {
    a.playbackRate = 0.6;
    a.addEventListener('timeupdate', onTimeUpdate);
  }
  if (b) {
    b.playbackRate = 0.6;
  }
});

onUnmounted(() => {
  videoARef.value?.removeEventListener('timeupdate', onTimeUpdate);
});
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
    ></video>
    <video
      ref="videoBRef"
      class="hero-video"
      :style="{ opacity: videoBOpacity }"
      src="/isiland.mp4"
      muted
      playsinline
      preload="auto"
    ></video>

    <!-- Enhanced overlay for better text readability -->
    <div class="hero-overlay"></div>
    <div class="hero-overlay-dark"></div>

    <!-- 主内容：响应式居中，桌面端右对齐 -->
    <div class="hero-content">
      <div class="hero-badge">AI赋能广告设计</div>
      <h1 class="hero-title animate-fade-in-up">
        为企业提供门头店招、海报设计、宣传单DM制作一站式服务
      </h1>
      <p class="hero-subtitle animate-fade-in-up delay-200">
        免费AI设计工具，高效获客
      </p>
      <div class="hero-cta animate-fade-in-up delay-400">
        <NeonButton to="/studio" variant="filled" size="lg">
          开始制作
        </NeonButton>
        <NeonButton to="/services" variant="outline" size="lg">
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
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100svh;
  overflow: hidden;
  background: #0a0a0f;
}

.hero-video {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.05s linear;
  will-change: opacity;
}

/* Layered overlays for text readability */
.hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgb(10 10 15 / 55%) 0%,
    rgb(10 10 15 / 25%) 25%,
    rgb(10 10 15 / 15%) 45%,
    rgb(10 10 15 / 45%) 70%,
    rgb(10 10 15 / 85%) 100%
  );
}

.hero-overlay-dark {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(
    ellipse 80% 60% at 70% 40%,
    rgb(10 10 15 / 50%) 0%,
    transparent 70%
  );
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  max-width: 1400px;
  padding: 0 clamp(24px, 5vw, 80px);
  text-align: right;
}

.hero-badge {
  display: inline-block;
  padding: 6px 18px;
  margin-bottom: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-neon);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
  backdrop-filter: blur(8px);
}

.hero-title {
  max-width: 700px;
  margin-bottom: 16px;
  font-size: clamp(1.8rem, 4vw, 3.2rem);
  font-weight: 800;
  line-height: 1.15;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  text-shadow:
    0 2px 20px rgb(0 0 0 / 15%),
    0 4px 40px rgb(0 0 0 / 10%);
}

.hero-subtitle {
  max-width: 650px;
  margin-bottom: 36px;
  font-size: clamp(1rem, 1.8vw, 1.3rem);
  font-weight: 400;
  line-height: 1.6;
  color: var(--color-text-secondary);
  text-shadow: 0 2px 12px rgb(0 0 0 / 8%);
}

.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.hero-carousel {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  width: 100%;
  padding-bottom: 30px;
  overflow: hidden;
}

/* Mobile: center align */
@media (max-width: 768px) {
  .hero-content {
    align-items: center;
    padding: 0 24px;
    text-align: center;
  }

  .hero-title {
    font-size: clamp(1.6rem, 6vw, 2.2rem);
  }

  .hero-cta {
    justify-content: center;
  }
}
</style>
