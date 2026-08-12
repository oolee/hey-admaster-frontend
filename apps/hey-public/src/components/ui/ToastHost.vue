<script setup lang="ts">
import { toast } from '@/utils/toast';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-vue-next';

const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
</script>

<template>
  <div class="toast-wrap" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="t in toast.state.toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.type}`"
        role="status"
      >
        <span class="toast-icon"
          ><component :is="icons[t.type]" :size="18"
        /></span>
        <span class="toast-text">{{ t.message }}</span>
        <button class="toast-x" aria-label="关闭" @click="toast.dismiss(t.id)">
          <X :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-wrap {
  position: fixed;
  top: calc(var(--header-h) + 16px);
  left: 50%;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  pointer-events: none;
  transform: translateX(-50%);
}

.toast {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 280px;
  max-width: 520px;
  padding: 12px 18px;
  overflow: hidden;
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-text-inverse);
  pointer-events: auto;
  background: var(--color-primary-deep);
  border-radius: var(--r-full);
  box-shadow: var(--shadow-lg);
}

.toast::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  content: '';
}

.toast--success::before {
  background: var(--color-success);
}

.toast--error::before {
  background: var(--color-error);
}

.toast--info::before {
  background: var(--color-accent);
}

.toast-icon {
  display: flex;
  flex-shrink: 0;
}

.toast--success .toast-icon {
  color: var(--color-success);
}

.toast--error .toast-icon {
  color: #ffb4b4;
}

.toast--info .toast-icon {
  color: var(--color-accent);
}

.toast-text {
  flex: 1;
}

.toast-x {
  display: flex;
  padding: 4px;
  color: rgb(255 255 255 / 50%);
  border-radius: 50%;
  transition: all var(--dur-fast) ease;
}

.toast-x:hover {
  color: #fff;
  background: rgb(255 255 255 / 10%);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.32s var(--ease-out-expo);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

@media (max-width: 600px) {
  .toast {
    min-width: auto;
    max-width: calc(100vw - 32px);
  }
}
</style>
