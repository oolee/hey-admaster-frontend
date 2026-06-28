<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

const props = defineProps<{
  defaultValue?: string;
  message: string;
  modelValue: boolean;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'confirm', value: string): void;
  (e: 'update:modelValue', value: boolean): void;
}>();

const inputValue = ref(props.defaultValue || '');
const inputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      inputValue.value = props.defaultValue || '';
      await nextTick();
      inputRef.value?.focus();
      inputRef.value?.select();
    }
  },
);

const onConfirm = () => {
  const trimmed = inputValue.value.trim();
  if (trimmed) {
    emit('confirm', trimmed);
    emit('update:modelValue', false);
  }
};

const onCancel = () => {
  emit('update:modelValue', false);
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') onConfirm();
  if (e.key === 'Escape') onCancel();
};
</script>

<template>
  <div v-if="modelValue" class="prompt-dialog-mask" @click.self="onCancel">
    <div class="prompt-dialog">
      <div class="prompt-dialog-header">
        <span>{{ message }}</span>
        <button class="prompt-dialog-close" @click="onCancel">&times;</button>
      </div>
      <div class="prompt-dialog-body">
        <input
          ref="inputRef"
          v-model="inputValue"
          class="prompt-dialog-input"
          type="text"
          :placeholder="placeholder || ''"
          @keydown="onKeydown"
        />
      </div>
      <div class="prompt-dialog-footer">
        <button class="prompt-btn prompt-btn-cancel" @click="onCancel">
          取消
        </button>
        <button
          class="prompt-btn prompt-btn-confirm"
          :disabled="!inputValue.trim()"
          @click="onConfirm"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prompt-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(15 23 42 / 55%);
}

.prompt-dialog {
  display: flex;
  flex-direction: column;
  width: 380px;
  max-width: calc(100% - 32px);
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 18px 50px rgb(15 23 42 / 25%);
}

.prompt-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #eef2f7;
}

.prompt-dialog-close {
  padding: 4px 8px;
  font-size: 18px;
  color: #6b7280;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
}

.prompt-dialog-close:hover {
  color: #111827;
  background: #f3f4f6;
}

.prompt-dialog-body {
  padding: 18px;
}

.prompt-dialog-input {
  box-sizing: border-box;
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  color: #1f2937;
  outline: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.prompt-dialog-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgb(99 102 241 / 15%);
}

.prompt-dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 1px solid #eef2f7;
}

.prompt-btn {
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  border-radius: 6px;
}

.prompt-btn-cancel {
  color: #374151;
  background: #f3f4f6;
}

.prompt-btn-cancel:hover {
  background: #e5e7eb;
}

.prompt-btn-confirm {
  color: #fff;
  background: #6366f1;
}

.prompt-btn-confirm:hover {
  background: #4f46e5;
}

.prompt-btn-confirm:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
