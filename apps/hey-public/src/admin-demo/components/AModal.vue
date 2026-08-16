<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '480px' }
})
const emit = defineEmits(['update:open', 'close'])

function close() {
  emit('update:open', false)
  emit('close')
}
watch(() => props.open, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})
onBeforeUnmount(() => { document.body.style.overflow = '' })
</script>

<template>
  <Teleport to="body">
    <Transition name="am">
      <div v-if="open" class="am-mask" @click.self="close">
        <div class="am-panel" :style="{ maxWidth: width }">
          <header class="am-head">
            <h3>{{ title }}</h3>
            <button class="am-x" @click="close"><X :size="16" /></button>
          </header>
          <div class="am-body"><slot /></div>
          <footer v-if="$slots.footer" class="am-foot"><slot name="footer" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.am-mask {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(7, 23, 20, 0.55);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
}
.am-panel {
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
}
.am-head { display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 1.4rem; border-bottom: 1px solid var(--color-border); }
.am-head h3 { font-size: var(--text-base); }
.am-x { display: flex; padding: 6px; border-radius: var(--r-md); color: var(--color-text-3); }
.am-x:hover { background: var(--color-surface-2); color: var(--color-text-1); }
.am-body { padding: 1.4rem; }
.am-foot { padding: 1rem 1.4rem; border-top: 1px solid var(--color-border); display: flex; justify-content: flex-end; gap: 10px; }

.am-enter-active, .am-leave-active { transition: opacity 0.25s var(--ease-out-expo); }
.am-enter-active .am-panel, .am-leave-active .am-panel { transition: transform 0.25s var(--ease-spring); }
.am-enter-from, .am-leave-to { opacity: 0; }
.am-enter-from .am-panel { transform: translateY(16px) scale(0.97); }
.am-leave-to .am-panel { transform: translateY(16px) scale(0.97); }
</style>