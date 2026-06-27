<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { get } from '#/api/request';
import H5Element from '#/components/H5Element.vue';

const route = useRoute();
const projectName = ref(
  decodeURIComponent((route.params.name as string) || '请柬'),
);
const id = route.params.id as string;

const loading = ref(true);
const error = ref('');
const pages = ref<any[]>([]);
const currentIndex = ref(0);
const canvasWidth = ref(320);
const canvasHeight = ref(628);
const pageTransition = ref<'fade' | 'flip' | 'none' | 'slide' | 'zoom'>(
  'slide',
);

// —— 设备检测 ——
const isMobile = ref(false);
const viewportWidth = ref(
  typeof window === 'undefined' ? 1280 : window.innerWidth,
);
const viewportHeight = ref(
  typeof window === 'undefined' ? 800 : window.innerHeight,
);

const detectDevice = () => {
  const w = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const h = typeof window === 'undefined' ? 800 : window.innerHeight;
  viewportWidth.value = w;
  viewportHeight.value = h;
  const uaMobile =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      navigator.userAgent,
    );
  const touchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || (navigator as any).maxTouchPoints > 0);
  isMobile.value = w < 768 || uaMobile || touchDevice;
};

const onResize = () => detectDevice();

// —— 滑动手势 ——
const touchStartX = ref(0);
const touchStartY = ref(0);
const SWIPE_THRESHOLD = 40;

const onTouchStart = (e: TouchEvent) => {
  const t = e.touches[0];
  touchStartX.value = t.clientX;
  touchStartY.value = t.clientY;
};
const onTouchMove = () => {};
const onTouchEnd = (e: TouchEvent) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX.value;
  const dy = Math.abs(t.clientY - touchStartY.value);
  if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > dy) {
    if (dx < 0 && currentIndex.value < totalPages.value - 1) nextPage();
    else if (dx > 0 && currentIndex.value > 0) prevPage();
  }
};

// —— 键盘支持（PC 调试时友好） ——
const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft' && currentIndex.value > 0) prevPage();
  if (e.key === 'ArrowRight' && currentIndex.value < totalPages.value - 1)
    nextPage();
};

onMounted(async () => {
  detectDevice();
  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKeyDown);

  try {
    const res = await get<any>(`/api/publish/${id}`);
    if (res && res.code === 0 && res.data && res.data.pages) {
      pages.value = res.data.pages;
      if (res.data.canvasWidth) canvasWidth.value = res.data.canvasWidth;
      if (res.data.canvasHeight) canvasHeight.value = res.data.canvasHeight;
      if (res.data.name) projectName.value = res.data.name;
      if (res.data.pageTransition)
        pageTransition.value = res.data.pageTransition;
    } else {
      error.value = (res as any)?.message || '未找到该请柬数据';
    }
  } catch {
    error.value = '加载失败，请稍后再试';
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
  window.removeEventListener('keydown', onKeyDown);
});

// —— 动画控制 ——
const isAnimating = ref(false);
const getAnimationDuration = (type: string) => {
  if (type === 'flip') return 450;
  if (type === 'none') return 30;
  return 350;
};

const totalPages = computed(() => pages.value.length);
const currentPage = computed(() => pages.value[currentIndex.value]);

// 支持"每页独立动效"：如果某页数据里有 transition，就覆盖全局
const currentTransition = computed(() => {
  const page = currentPage.value;
  const perPage = page?.transition;
  if (perPage && ['fade', 'flip', 'none', 'slide', 'zoom'].includes(perPage))
    return perPage;
  return pageTransition.value;
});

const triggerAnimation = () => {
  const t = currentTransition.value;
  if (t === 'none') {
    isAnimating.value = false;
    return;
  }
  isAnimating.value = true;
  setTimeout(() => {
    isAnimating.value = false;
  }, getAnimationDuration(t));
};

const prevPage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    triggerAnimation();
  }
};
const nextPage = () => {
  if (currentIndex.value < totalPages.value - 1) {
    currentIndex.value++;
    triggerAnimation();
  }
};

const pageStyle = computed(() => ({
  width: `${canvasWidth.value}px`,
  height: `${canvasHeight.value}px`,
  backgroundColor: currentPage.value?.backgroundColor || '#ffffff',
}));

// —— 移动端缩放：把 320×640 的画布按比例缩放到屏幕 ——
const mobileScaleStyle = computed(() => {
  const cw = canvasWidth.value;
  const ch = canvasHeight.value;
  const vw = viewportWidth.value;
  const vh = viewportHeight.value;
  const scale = Math.min(vw / cw, vh / ch);
  return {
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
  };
});
</script>

<template>
  <div class="h5-viewport" :class="{ 'h5-mobile': isMobile }">
    <div v-if="loading" class="h5-loading">
      <i class="bi bi-arrow-repeat"></i>
      <span>加载中...</span>
    </div>

    <div v-else-if="error" class="h5-error">
      <i class="bi bi-exclamation-triangle"></i>
      <span>{{ error }}</span>
    </div>

    <template v-else>
      <!-- ========== PC 端：带手机框的预览 ========== -->
      <div v-if="!isMobile" class="h5-pc-wrap">
        <div class="h5-pc-header">
          <div class="h5-pc-title">
            <i class="bi bi-suit-heart-fill"></i>
            <span>{{ projectName }}</span>
          </div>
          <div class="h5-pc-hint">
            <i class="bi bi-phone"></i>
            <span>手机扫码或打开获得最佳体验</span>
          </div>
        </div>

        <div class="h5-pc-canvas-area">
          <div class="h5-device-frame">
            <div
              class="h5-page"
              :key="currentIndex"
              :class="[isAnimating ? `page-turning-${currentTransition}` : '']"
              :style="pageStyle"
            >
              <template
                v-for="element in currentPage?.elements || []"
                :key="element.id"
              >
                <H5Element :element="element" />
              </template>
            </div>
          </div>

          <button
            v-if="totalPages > 1"
            class="h5-page-btn h5-page-left"
            :disabled="currentIndex <= 0"
            @click="prevPage"
          >
            <i class="bi bi-chevron-left"></i>
          </button>
          <button
            v-if="totalPages > 1"
            class="h5-page-btn h5-page-right"
            :disabled="currentIndex >= totalPages - 1"
            @click="nextPage"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>

        <div v-if="totalPages > 1" class="h5-pagination">
          <span>{{ currentIndex + 1 }} / {{ totalPages }}</span>
        </div>
      </div>

      <!-- ========== 手机端：全屏直出，滑动翻页 ========== -->
      <div
        v-else
        class="h5-mobile-wrap"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div class="h5-mobile-scale" :style="mobileScaleStyle">
          <div
            class="h5-mobile-page"
            :key="currentIndex"
            :class="[isAnimating ? `page-turning-${currentTransition}` : '']"
            :style="pageStyle"
          >
            <template
              v-for="element in currentPage?.elements || []"
              :key="element.id"
            >
              <H5Element :element="element" />
            </template>
          </div>
        </div>

        <div v-if="totalPages > 1" class="h5-mobile-indicator">
          <!--prettier-ignore-->
          <span class="h5-mobile-pagination">{{ currentIndex + 1 }} / {{ totalPages }}</span>
          <span class="h5-mobile-hint">← 左右滑动翻页 →</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ========== 公共：加载/错误 ========== */
.h5-viewport {
  min-height: 100vh;
  background: linear-gradient(180deg, #fdf6f0 0%, #f5e6e0 100%);
}

.h5-loading,
.h5-error {
  position: fixed;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  font-size: 14px;
  color: #999;
  transform: translate(-50%, -50%);
}

.h5-loading i {
  font-size: 28px;
  color: #e94560;
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.h5-error i {
  font-size: 32px;
  color: #e94560;
}

/* ========== PC 端 ========== */
.h5-pc-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 24px 20px 28px;
}

.h5-pc-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  width: 100%;
  max-width: 480px;
  margin-bottom: 20px;
}

.h5-pc-title {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 18px;
  font-weight: 500;
  color: #8a3a4a;
  letter-spacing: 2px;
}

.h5-pc-title i {
  color: #e94560;
}

.h5-pc-hint {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  color: #999;
  background: rgb(255 255 255 / 70%);
  border-radius: 20px;
}

.h5-pc-canvas-area {
  position: relative;
}

.h5-device-frame {
  position: relative;
  padding: 14px;
  background: #2a1f3d;
  border-radius: 40px;
  box-shadow: 0 12px 48px rgb(0 0 0 / 18%);
}

.h5-page {
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  box-shadow: 0 4px 20px rgb(0 0 0 / 10%);
}

.h5-page-btn {
  position: absolute;
  top: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 18px;
  color: #e94560;
  cursor: pointer;
  background: rgb(255 255 255 / 95%);
  border: 1px solid rgb(233 69 96 / 30%);
  border-radius: 50%;
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
  transform: translateY(-50%);
  transition: all 0.2s ease;
}

.h5-page-btn:hover:not(:disabled) {
  color: #fff;
  background: #e94560;
}

.h5-page-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.h5-page-left {
  left: -60px;
}

.h5-page-right {
  right: -60px;
}

.h5-pagination {
  margin-top: 20px;
  font-size: 13px;
  color: #999;
  letter-spacing: 1px;
}

/* ========== 移动端 ========== */
.h5-viewport.h5-mobile {
  padding: 0;
  margin: 0;
  overflow: hidden;
  background: #000;
}

.h5-mobile-wrap {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  touch-action: pan-y;
}

.h5-mobile-scale {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center center;
  will-change: transform;
}

.h5-mobile-page {
  position: relative;
  overflow: hidden;
  background: #fff;
}

.h5-mobile-indicator {
  position: absolute;
  right: 0;
  bottom: 20px;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  color: rgb(255 255 255 / 85%);
  pointer-events: none;
}

.h5-mobile-pagination {
  padding: 3px 12px;
  font-size: 13px;
  letter-spacing: 2px;
  background: rgb(0 0 0 / 40%);
  border-radius: 20px;
}

.h5-mobile-hint {
  margin-top: 4px;
  font-size: 11px;
  color: rgb(255 255 255 / 60%);
}

/* ========== 元素渲染：两端通用 ========== */
.h5-element {
  position: absolute;
  transform-origin: center center;
}

.h5-text {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.h5-decoration {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.h5-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.h5-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 32px;
  color: #ccc;
  background: #f5f5f5;
}

.h5-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.h5-border {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border: 2px solid #e94560;
  border-radius: 8px;
}

.h5-shape {
  width: 100%;
  height: 100%;
}

/* ========== 翻页动效：与编辑器保持一致 ========== */
.page-turning-slide {
  animation: turn-slide 0.35s ease;
}

@keyframes turn-slide {
  0% {
    opacity: 0;
    transform: translateX(80px);
  }

  60% {
    opacity: 0.7;
    transform: translateX(-6px);
  }

  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.page-turning-fade {
  animation: turn-fade 0.35s ease;
}

@keyframes turn-fade {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

.page-turning-zoom {
  animation: turn-zoom 0.35s ease;
}

@keyframes turn-zoom {
  0% {
    opacity: 0;
    transform: scale(0.7);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.page-turning-flip {
  transform-origin: center center;
  perspective: 800px;
  animation: turn-flip 0.45s ease;
}

@keyframes turn-flip {
  0% {
    opacity: 0;
    transform: rotateY(-90deg);
  }

  60% {
    opacity: 0.7;
    transform: rotateY(15deg);
  }

  100% {
    opacity: 1;
    transform: rotateY(0deg);
  }
}
</style>
