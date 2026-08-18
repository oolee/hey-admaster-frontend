<script setup>
import { useModel } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  icon: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue', 'enter']);
const value = useModel(props, 'modelValue', emit);
</script>

<template>
  <label class="afield">
    <span v-if="label" class="afield-label">{{ label }}</span>
    <div class="afield-control">
      <slot name="prefix"></slot>
      <input
        :type="type"
        :value="value"
        :placeholder="placeholder"
        v-bind="$attrs"
        @input="emit('update:modelValue', $event.target.value)"
        @keydown.enter="emit('enter')"
      />
      <slot name="suffix"></slot>
    </div>
  </label>
</template>

<style scoped>
.afield {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.afield-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-2);
}

.afield-control {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 0 10px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  transition:
    border-color var(--dur-fast) ease,
    box-shadow var(--dur-fast) ease;
}

.afield-control:focus-within {
  border-color: var(--color-border-strong);
  box-shadow: 0 0 0 3px var(--glow-accent);
}

.afield-control input {
  width: 100%;
  padding: 0.55rem 0;
  color: var(--color-text-1);
  caret-color: var(--color-accent);
  outline: none;
  background: transparent;
  border: none;
}

.afield-control input::placeholder {
  color: var(--color-text-3);
}
</style>
