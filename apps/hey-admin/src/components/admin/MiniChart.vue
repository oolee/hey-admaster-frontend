<script setup>
import { computed } from 'vue';

const props = defineProps({
  points: { type: Array, required: true }, // [{ label, value }]
  type: { type: String, default: 'line' }, // line | bar | area
  height: { type: Number, default: 200 },
  series2: { type: Array, default: null }, // 第二系列（对比）
  series2Label: { type: String, default: '' },
});

const W = 600;
const H = 220;
const PAD = { top: 24, right: 16, bottom: 32, left: 44 };

const maxVal = computed(() => {
  const vals = props.points.map((p) => p.value);
  if (props.series2) vals.push(...props.series2.map((p) => p.value));
  return Math.max(...vals, 1) * 1.15;
});

const coords = computed(() =>
  props.points.map((p, i) => {
    const x =
      PAD.left + (i / (props.points.length - 1)) * (W - PAD.left - PAD.right);
    const y =
      PAD.top + (1 - p.value / maxVal.value) * (H - PAD.top - PAD.bottom);
    return { x, y, ...p };
  }),
);

const series2Coords = computed(() => {
  if (!props.series2) return [];
  return props.series2.map((p, i) => {
    const x =
      PAD.left + (i / (props.series2.length - 1)) * (W - PAD.left - PAD.right);
    const y =
      PAD.top + (1 - p.value / maxVal.value) * (H - PAD.top - PAD.bottom);
    return { x, y };
  });
});

const linePath = computed(() => {
  if (coords.value.length < 2) return '';
  return coords.value
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
});
const areaPath = computed(() => {
  if (!linePath.value) return '';
  const last = coords.value[coords.value.length - 1];
  const first = coords.value[0];
  return `${linePath.value} L${last.x},${H - PAD.bottom} L${first.x},${H - PAD.bottom} Z`;
});
const series2Path = computed(() => {
  if (series2Coords.value.length < 2) return '';
  return series2Coords.value
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
});

const gridLines = computed(() => {
  const lines = [];
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (i / 4) * (H - PAD.top - PAD.bottom);
    const v = Math.round(maxVal.value * (1 - i / 4));
    lines.push({ y, v });
  }
  return lines;
});
</script>

<template>
  <div class="mc">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      :style="{ height: `${height}px` }"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- 网格 -->
      <g v-for="g in gridLines" :key="g.y">
        <line
          :x1="PAD.left"
          :x2="W - PAD.right"
          :y1="g.y"
          :y2="g.y"
          stroke="var(--color-border)"
          stroke-width="1"
          stroke-dasharray="4 4"
        />
        <text
          :x="PAD.left - 8"
          :y="g.y + 4"
          text-anchor="end"
          font-size="10"
          fill="var(--color-text-3)"
        >
          {{ g.v.toLocaleString() }}
        </text>
      </g>

      <!-- area -->
      <path
        v-if="type === 'area' && areaPath"
        :d="areaPath"
        fill="var(--color-accent)"
        opacity="0.12"
      />
      <!-- 第二系列（虚线） -->
      <path
        v-if="series2Path"
        :d="series2Path"
        fill="none"
        stroke="var(--color-ai)"
        stroke-width="2"
        stroke-dasharray="5 5"
      />

      <!-- 柱状 -->
      <template v-if="type === 'bar'">
        <rect
          v-for="c in coords"
          :key="c.label"
          :x="c.x - 16"
          :y="c.y"
          width="32"
          :height="H - PAD.bottom - c.y"
          rx="5"
          fill="var(--color-accent)"
          opacity="0.85"
        >
          <title>{{ c.label }}: {{ c.value.toLocaleString() }}</title>
        </rect>
      </template>

      <!-- 折线 -->
      <path
        v-else
        :d="linePath"
        fill="none"
        stroke="var(--color-accent)"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- 点 -->
      <g v-for="c in coords" :key="c.label">
        <circle
          :cx="c.x"
          :cy="c.y"
          r="4"
          fill="var(--color-surface)"
          stroke="var(--color-accent)"
          stroke-width="2"
        />
        <text
          :x="c.x"
          :y="H - 12"
          text-anchor="middle"
          font-size="10"
          fill="var(--color-text-3)"
        >
          {{ c.label }}
        </text>
      </g>

      <!-- 图例 -->
      <g v-if="series2">
        <line
          :x1="PAD.left"
          :x2="PAD.left + 20"
          :y1="10"
          :y2="10"
          stroke="var(--color-accent)"
          stroke-width="2"
        />
        <text
          :x="PAD.left + 26"
          :y="13"
          font-size="10"
          fill="var(--color-text-3)"
        >
          {{ props.series2Label || '系列1' }}
        </text>
        <line
          :x1="PAD.left + 80"
          :x2="PAD.left + 100"
          :y1="10"
          :y2="10"
          stroke="var(--color-ai)"
          stroke-width="2"
          stroke-dasharray="5 5"
        />
        <text
          :x="PAD.left + 106"
          :y="13"
          font-size="10"
          fill="var(--color-text-3)"
        >
          成本
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.mc {
  width: 100%;
}

.mc svg {
  width: 100%;
}
</style>
