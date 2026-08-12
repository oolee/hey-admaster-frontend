<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  icon: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'enter']);

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') emit('enter', e);
}

function onInput(e: Event) {
  const target = e.target as HTMLInputElement | null;
  emit('update:modelValue', target?.value ?? '');
}
</script>

<template>
  <div class="field">
    <label v-if="label" class="field-label" :for="`f-${label}`">{{
      label
    }}</label>
    <div
      class="field-control"
      :class="{ 'has-error': error, 'is-focus': false }"
    >
      <slot name="prefix"></slot>
      <input
        :id="`f-${label}`"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        v-bind="$attrs"
        @input="onInput"
        @keydown="onKeydown"
      />
      <slot name="suffix"></slot>
    </div>
    <p v-if="error" class="field-error">{{ error }}</p>
    <p v-else-if="hint" class="field-hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-1);
}

.field-control {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  padding: 0.2rem 0.9rem;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--r-md);
  transition:
    border-color var(--dur-fast) ease,
    box-shadow var(--dur-fast) ease,
    background var(--dur-fast) ease;
}

/* 聚焦时只外发光，不改边框颜色，避免双层叠加的视觉错觉 */
.field-control:focus-within {
  background: var(--color-surface);
  border-color: var(--color-border-strong);
  box-shadow: 0 0 0 4px var(--glow-accent);
}

.field-control:hover:not(:focus-within) {
  border-color: var(--color-border-strong);
}

.field-control.has-error {
  border-color: var(--color-error);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-error) 12%, transparent);
}

.field-control input {
  width: 100%;
  padding: 0.7rem 0;
  color: var(--color-text-1);
  caret-color: var(--color-accent);
  outline: none;
  background: transparent;
  border: none;
  box-shadow: 0 0 0 1000px var(--color-surface) inset !important;

  /* 防止浏览器自动填充时改变背景色 */
  -webkit-text-fill-color: var(--color-text-1);
}

.field-control input:-webkit-autofill {
  -webkit-text-fill-color: var(--color-text-1) !important;
  transition: background-color 5000s ease-in-out 0s;
}

.field-control input::placeholder {
  color: var(--color-text-3);
}

.field-error {
  font-size: var(--text-xs);
  color: var(--color-error);
}

.field-hint {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}
</style>
