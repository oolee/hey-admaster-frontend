<script setup>
/* ChipInput · 通用多值输入（chip 列表 + 输入框 + Enter 添加） */
import { ref } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: '回车添加' }
})
const emit = defineEmits(['update:modelValue'])

const input = ref('')
function add() {
  const v = input.value.trim()
  if (!v) return
  if (props.modelValue.includes(v)) { input.value = ''; return }
  emit('update:modelValue', [...props.modelValue, v])
  input.value = ''
}
function remove(i) {
  const next = [...props.modelValue]
  next.splice(i, 1)
  emit('update:modelValue', next)
}
function onKey(e) {
  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
  else if (e.key === 'Backspace' && !input.value && props.modelValue.length) {
    remove(props.modelValue.length - 1)
  }
}
</script>

<template>
  <div class="chip-input">
    <span v-for="(v, i) in modelValue" :key="v + i" class="chip">
      {{ v }}
      <button type="button" class="chip-x" @click="remove(i)" :title="`移除 ${v}`"><X :size="11" /></button>
    </span>
    <input
      v-model="input"
      class="chip-text"
      :placeholder="modelValue.length ? '' : placeholder"
      @keydown="onKey"
      @blur="add"
    />
  </div>
</template>

<style scoped>
.chip-input {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  padding: 6px 8px; min-height: 38px;
  background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px;
  transition: border-color var(--dur-fast) ease;
}
.chip-input:focus-within { border-color: var(--color-accent); }
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 6px;
  background: var(--color-accent-soft); color: var(--color-accent);
  font-size: 11px; font-weight: 600;
  font-family: var(--font-mono);
}
.chip-x {
  width: 14px; height: 14px; border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--color-accent); opacity: 0.6;
}
.chip-x:hover { opacity: 1; background: rgba(255,255,255,0.18); }
.chip-text {
  flex: 1; min-width: 120px; border: 0; outline: none;
  background: transparent; font-size: 12px; color: var(--color-text-1);
  font-family: var(--font-mono);
}
</style>
