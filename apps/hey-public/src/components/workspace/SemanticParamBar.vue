<script setup lang="ts">
import type { ParamSpec } from '@/api/agent';

/**
 * L1 语义参数栏（§8 / P0-3）：元数据驱动，渲染当前能力的 paramSchema 基本层参数
 * （比例 / 张数 / 清晰度），并实时联动平台价。霓虹玻璃风，复用 composer 的技能色变量。
 * 仅存「非默认值」到 params，保持报文干净；transient 参数不跨轮继承（每次发送读当前值）。
 */
import { computed, ref, watch } from 'vue';

import { useAgentStore } from '@/stores/agent';

const props = defineProps<{
  capabilityId: string;
  modelValue: Record<string, unknown>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: Record<string, unknown>): void;
}>();

const agent = useAgentStore();

const schema = computed<ParamSpec[]>(
  () => agent.capabilityById.get(props.capabilityId)?.paramSchema ?? [],
);

// L1 主行：可见 + 基本层（level=0/Basic）
const basicParams = computed(() =>
  schema.value.filter((p) => p.userVisible && (p.level ?? 0) === 0),
);

const hasParams = computed(() => basicParams.value.length > 0);

function defaultOf(spec: ParamSpec): unknown {
  if (spec.default !== undefined && spec.default !== null) return spec.default;
  if (spec.type === 4 /* Enum */ && spec.options?.length)
    return spec.options[0];
  if (spec.type === 1 /* Integer */) return spec.constraints?.min ?? 1;
  return undefined;
}

function currentValue(spec: ParamSpec): unknown {
  if (props.modelValue[spec.key] !== undefined)
    return props.modelValue[spec.key];
  return defaultOf(spec);
}

function labelOf(spec: ParamSpec, option: string): string {
  return spec.optionLabels?.[option] ?? option;
}

function constraintsOf(spec: ParamSpec): { max?: number; min?: number; } {
  const c = spec.constraints ?? {};
  return {
    min: typeof c.min === 'number' ? c.min : undefined,
    max: typeof c.max === 'number' ? c.max : undefined,
  };
}

function isDefault(spec: ParamSpec, val: unknown): boolean {
  const d = defaultOf(spec);
  if (val === undefined || val === null || val === '')
    return d === undefined || d === null || d === '';
  return String(val) === String(d);
}

function setParam(spec: ParamSpec, val: unknown) {
  const next: Record<string, unknown> = { ...props.modelValue };
  if (isDefault(spec, val)) {
    delete next[spec.key];
  } else {
    next[spec.key] = val;
  }
  emit('update:modelValue', next);
}

function stepInt(spec: ParamSpec, delta: number) {
  const { min, max } = constraintsOf(spec);
  const cur = Number(currentValue(spec)) || 1;
  let v = cur + delta;
  if (min !== undefined) v = Math.max(min, v);
  if (max !== undefined) v = Math.min(max, v);
  setParam(spec, v);
}

/* 实时价：平台基础价 × 张数（count 影响计费，§16.2） */
const basePrice = computed(() => agent.basePriceOf(props.capabilityId));
const countSpec = computed(() =>
  basicParams.value.find((p) => p.key === 'count'),
);
const livePrice = computed(() => {
  if (basePrice.value === undefined) return undefined;
  const count = countSpec.value
    ? Number(currentValue(countSpec.value)) || 1
    : 1;
  return Math.round(basePrice.value * count * 100) / 100;
});

// 离开图像类技能时清空（transient 不跨轮）
const empty = ref(false);
watch(
  () => props.capabilityId,
  () => {
    if (!hasParams.value) {
      empty.value = true;
      emit('update:modelValue', {});
    }
  },
);
</script>

<template>
  <div v-if="hasParams" class="spbar" :class="{ 'spbar--empty': empty }">
    <div class="spbar-row">
      <template v-for="spec in basicParams" :key="spec.key">
        <!-- 枚举：霓虹芯片组 -->
        <div v-if="spec.type === 4" class="sp-field">
          <span class="sp-label">{{ spec.displayName || spec.key }}</span>
          <div class="sp-chips">
            <button
              v-for="opt in spec.options"
              :key="opt"
              type="button"
              class="sp-chip"
              :class="{ on: String(currentValue(spec)) === String(opt) }"
              @click="setParam(spec, opt)"
            >
              {{ labelOf(spec, opt) }}
            </button>
          </div>
        </div>

        <!-- 整数：紧凑步进器 -->
        <div v-else-if="spec.type === 1" class="sp-field">
          <span class="sp-label">{{ spec.displayName || spec.key }}</span>
          <div class="sp-stepper">
            <button
              type="button"
              class="sp-step"
              :disabled="
                constraintsOf(spec).min !== undefined &&
                Number(currentValue(spec)) <= constraintsOf(spec).min!
              "
              @click="stepInt(spec, -1)"
            >
              −
            </button>
            <span class="sp-num">{{ currentValue(spec) }}</span>
            <button
              type="button"
              class="sp-step"
              :disabled="
                constraintsOf(spec).max !== undefined &&
                Number(currentValue(spec)) >= constraintsOf(spec).max!
              "
              @click="stepInt(spec, 1)"
            >
              +
            </button>
          </div>
        </div>
      </template>

      <!-- 实时价 -->
      <div v-if="livePrice !== undefined" class="sp-price">
        <span class="sp-price-label">预估</span>
        <span class="sp-price-num">¥{{ livePrice.toFixed(2) }}</span>
        <span class="sp-price-unit">/次</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spbar {
  max-width: 820px;
  padding: 0.6rem 0.9rem;
  margin: 0 auto var(--sp-3);
  background: color-mix(in srgb, var(--color-surface) 72%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  animation: sp-in 0.28s var(--ease-out-expo);
}

@keyframes sp-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.spbar-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-4);
  align-items: center;
}

.sp-field {
  display: flex;
  gap: var(--sp-2);
  align-items: center;
}

.sp-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-3);
  white-space: nowrap;
}

.sp-chips {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  background: var(--color-surface-2);
  border-radius: 999px;
}

.sp-chip {
  padding: 0.32rem 0.8rem;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-2);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 999px;
  transition: all var(--dur-fast) ease;
}

.sp-chip:hover {
  color: var(--color-text-1);
}

.sp-chip.on {
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  box-shadow: 0 2px 10px var(--glow-accent, rgb(124 92 255 / 35%));
}

.sp-stepper {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  padding: 2px;
  background: var(--color-surface-2);
  border-radius: 999px;
}

.sp-step {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: var(--text-base);
  color: var(--color-text-2);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 50%;
  transition: all var(--dur-fast) ease;
}

.sp-step:hover:not(:disabled) {
  color: #fff;
  background: var(--color-accent);
}

.sp-step:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.sp-num {
  min-width: 22px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-1);
  text-align: center;
}

.sp-price {
  display: inline-flex;
  gap: 4px;
  align-items: baseline;
  padding: 0.3rem 0.75rem;
  margin-left: auto;
  background: var(--color-accent-soft);
  border-radius: 999px;
}

.sp-price-label {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.sp-price-num {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-accent);
}

.sp-price-unit {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}
</style>
