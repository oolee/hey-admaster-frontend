<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';

import { X } from 'lucide-vue-next';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '520px' },
  closable: { type: Boolean, default: true },
});

const emit = defineEmits(['update:open', 'close']);

function close() {
  if (!props.closable) return;
  emit('update:open', false);
  emit('close');
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) close();
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      document.addEventListener('keydown', onKeydown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', onKeydown);
      document.body.style.overflow = '';
    }
  },
);

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-mask" @click.self="close">
        <div
          class="modal-panel"
          :style="{ maxWidth: width }"
          role="dialog"
          aria-modal="true"
        >
          <header v-if="title || closable" class="modal-head">
            <h3>{{ title }}</h3>
            <button
              v-if="closable"
              class="modal-close"
              aria-label="关闭"
              @click="close"
            >
              <X :size="18" />
            </button>
          </header>
          <div class="modal-body">
            <slot></slot>
          </div>
          <footer v-if="$slots.footer" class="modal-foot">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgb(7 23 20 / 55%);
  backdrop-filter: blur(8px);
}

.modal-panel {
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-2xl);
  box-shadow: var(--shadow-lg);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.4rem 1.6rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-head h3 {
  font-size: var(--text-lg);
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--color-text-2);
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.modal-close:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.modal-body {
  padding: 1.6rem;
}

.modal-foot {
  padding: 1.2rem 1.6rem;
  border-top: 1px solid var(--color-border);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s var(--ease-out-expo);
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 0.3s var(--ease-spring);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel {
  transform: translateY(24px) scale(0.96);
}

.modal-leave-to .modal-panel {
  transform: translateY(24px) scale(0.96);
}
</style>
