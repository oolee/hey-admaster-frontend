<script setup lang="ts">
import type { PromptVariant } from '@/utils/prompt';

import type { Component } from 'vue';

import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { prompt } from '@/utils/prompt';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  XCircle,
} from 'lucide-vue-next';

const icons: Record<PromptVariant, Component> = {
  confirm: HelpCircle,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const cancelBtn = ref<HTMLButtonElement | null>(null);
const okBtn = ref<HTMLButtonElement | null>(null);

/* 打开时锁滚动并聚焦“最不具破坏性”的按钮（有取消先聚焦取消） */
watch(
  () => prompt.state.open,
  async (open) => {
    if (open) {
      document.body.style.overflow = 'hidden';
      await nextTick();
      (cancelBtn.value ?? okBtn.value)?.focus();
    } else {
      document.body.style.overflow = '';
    }
  },
);

function onKeydown(e: KeyboardEvent) {
  if (!prompt.state.open) return;
  if (e.key === 'Escape') prompt.settle(false);
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="prompt">
      <div
        v-if="prompt.state.open"
        class="prompt-mask"
        @click.self="prompt.settle(false)"
      >
        <div
          class="prompt-panel"
          role="alertdialog"
          aria-modal="true"
          :aria-label="prompt.state.title"
        >
          <div
            class="prompt-accent"
            :class="`prompt-accent--${prompt.state.variant}`"
          ></div>
          <div class="prompt-head">
            <span
              class="prompt-icon"
              :class="`prompt-icon--${prompt.state.variant}`"
            >
              <component :is="icons[prompt.state.variant]" :size="22" />
            </span>
            <h3 class="prompt-title">{{ prompt.state.title }}</h3>
          </div>
          <div class="prompt-body">
            <p class="prompt-message">{{ prompt.state.message }}</p>
          </div>
          <div class="prompt-foot">
            <button
              v-if="prompt.state.variant === 'confirm'"
              ref="cancelBtn"
              class="pbtn pbtn--ghost"
              @click="prompt.settle(false)"
            >
              {{ prompt.state.cancelText }}
            </button>
            <button
              ref="okBtn"
              class="pbtn"
              :class="prompt.state.danger ? 'pbtn--danger' : 'pbtn--primary'"
              @click="prompt.settle(true)"
            >
              {{ prompt.state.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.prompt-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgb(7 23 20 / 55%);
  backdrop-filter: blur(8px);
}

.prompt-panel {
  position: relative;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-2xl);
  box-shadow: var(--shadow-lg);
}

/* 顶部变体强调线（同 toast 的左条语言，改成顶部细线） */
.prompt-accent {
  width: 100%;
  height: 3px;
}

.prompt-accent--confirm {
  background: var(--color-accent);
}

.prompt-accent--info {
  background: var(--color-info);
}

.prompt-accent--success {
  background: var(--color-success);
}

.prompt-accent--warning {
  background: var(--color-warning);
}

.prompt-accent--error {
  background: var(--color-error);
}

.prompt-head {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 1.5rem 1.5rem 0;
}

.prompt-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--r-full);
}

.prompt-icon--confirm {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
}

.prompt-icon--info {
  color: var(--color-info);
  background: color-mix(in srgb, var(--color-info) 14%, transparent);
}

.prompt-icon--success {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 14%, transparent);
}

.prompt-icon--warning {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 14%, transparent);
}

.prompt-icon--error {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 14%, transparent);
}

.prompt-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text-1);
}

.prompt-body {
  padding: 1rem 1.5rem 1.5rem;
}

.prompt-message {
  font-size: var(--text-base);
  line-height: 1.7;
  color: var(--color-text-2);
  overflow-wrap: anywhere;
  white-space: pre-line;
}

.prompt-foot {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.1rem 1.5rem;
  background: var(--color-surface-2);
  border-top: 1px solid var(--color-border);
}

.pbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  padding: 0.6rem 1.4rem;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  border-radius: var(--r-full);
  transition: all var(--dur-fast) var(--ease-out-expo);
}

.pbtn:active {
  transform: scale(0.97);
}

.pbtn--ghost {
  color: var(--color-text-2);
  background: transparent;
  border: 1.5px solid var(--color-border-strong);
}

.pbtn--ghost:hover {
  color: var(--color-text-1);
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.pbtn--primary {
  color: var(--color-text-inverse);
  background: var(--color-accent);
  box-shadow: var(--shadow-accent);
}

.pbtn--primary:hover {
  background: var(--color-accent-hover);
  box-shadow: 0 12px 28px var(--glow-accent);
  transform: translateY(-1px);
}

.pbtn--danger {
  color: #fff;
  background: var(--color-error);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--color-error) 35%, transparent);
}

.pbtn--danger:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.pbtn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.prompt-enter-active,
.prompt-leave-active {
  transition: opacity 0.3s var(--ease-out-expo);
}

.prompt-enter-active .prompt-panel,
.prompt-leave-active .prompt-panel {
  transition: transform 0.3s var(--ease-spring);
}

.prompt-enter-from,
.prompt-leave-to {
  opacity: 0;
}

.prompt-enter-from .prompt-panel {
  transform: translateY(24px) scale(0.96);
}

.prompt-leave-to .prompt-panel {
  transform: translateY(24px) scale(0.96);
}

@media (max-width: 600px) {
  .prompt-panel {
    max-width: calc(100vw - 32px);
  }

  .prompt-foot {
    flex-direction: column-reverse;
  }

  .pbtn {
    width: 100%;
  }
}
</style>
