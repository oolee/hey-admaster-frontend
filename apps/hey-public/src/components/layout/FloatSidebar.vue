<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const showBackTop = ref(false);
const showWechat = ref(false);
const showPhone = ref(false);

function onScroll() {
  showBackTop.value = window.scrollY > 400;
}

function backToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>

<template>
  <div class="float-sidebar">
    <!-- 微信 -->
    <div
      class="float-item"
      @mouseenter="showWechat = true"
      @mouseleave="showWechat = false"
    >
      <div class="float-icon wechat">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path
            d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"
          />
        </svg>
      </div>
      <Transition name="tooltip">
        <div v-if="showWechat" class="float-tooltip">
          <div class="qr-title">微信扫码咨询</div>
          <div class="qr-placeholder">微信二维码</div>
        </div>
      </Transition>
    </div>

    <!-- 电话 -->
    <div
      class="float-item"
      @mouseenter="showPhone = true"
      @mouseleave="showPhone = false"
    >
      <div class="float-icon phone">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path
            d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
          />
        </svg>
      </div>
      <Transition name="tooltip">
        <div v-if="showPhone" class="float-tooltip">
          <div class="phone-number">137 6916 6043</div>
          <div class="phone-tip">点击拨打</div>
        </div>
      </Transition>
    </div>

    <!-- 留言 -->
    <a href="mailto:342831363@qq.com" class="float-item">
      <div class="float-icon message">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path
            d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
          />
        </svg>
      </div>
    </a>

    <!-- 回到顶部 -->
    <Transition name="fade">
      <div v-if="showBackTop" class="float-item" @click="backToTop">
        <div class="float-icon backtop">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
          </svg>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.float-sidebar {
  position: fixed;
  right: 20px;
  bottom: 100px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.float-item {
  position: relative;
  cursor: pointer;
}

.float-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: #fff;
  border-radius: 50%;
  box-shadow: 0 4px 15px rgb(0 0 0 / 20%);
  transition: all 0.3s ease;
}

.float-icon:hover {
  transform: scale(1.1);
}

.float-icon.wechat {
  background: #07c160;
}

.float-icon.phone {
  color: var(--color-bg-primary);
  background: var(--color-neon);
}

.float-icon.message {
  background: #7a6aff;
}

.float-icon.backtop {
  color: var(--color-neon);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
}

.float-tooltip {
  position: absolute;
  top: 50%;
  right: 60px;
  min-width: 160px;
  padding: 16px;
  text-align: center;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgb(0 0 0 / 20%);
  backdrop-filter: blur(10px);
  transform: translateY(-50%);
}

.qr-title {
  margin-bottom: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-neon);
}

.qr-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  margin: 0 auto;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-bg-primary);
  border-radius: 8px;
}

.phone-number {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-neon);
  white-space: nowrap;
}

.phone-tip {
  margin-top: 4px;
  font-size: 0.75rem;
  color: #8888a0;
}

/* Tooltip animation */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.3s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(10px);
}

/* Fade animation */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 768px) {
  .float-sidebar {
    right: 12px;
    bottom: 80px;
    gap: 8px;
  }

  .float-icon {
    width: 40px;
    height: 40px;
  }

  .float-icon svg {
    width: 16px;
    height: 16px;
  }

  .float-tooltip {
    right: 52px;
    min-width: 130px;
    padding: 12px;
  }

  .qr-placeholder {
    width: 100px;
    height: 100px;
  }
}
</style>
