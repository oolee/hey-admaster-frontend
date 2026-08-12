<script setup lang="ts">
import { computed } from 'vue';

/**
 * 抽象艺术画布：用 SVG 生成不依赖外部图片的装饰图形
 * 变体：poster(海报) | store(门头) | vi(品牌) | flyer(传单) | space(室内) | logo | social
 */
const props = defineProps({
  variant: { type: String, default: 'poster' },
  seed: { type: [Number, String], default: 0 },
  label: { type: String, default: '' },
});

const themes = {
  poster: { from: '#ff6b35', to: '#ffc24b', soft: 'rgba(255,107,53,0.14)' },
  store: { from: '#e85320', to: '#7c5cff', soft: 'rgba(232,83,32,0.14)' },
  vi: { from: '#7c5cff', to: '#2a6a5e', soft: 'rgba(124,92,255,0.14)' },
  flyer: { from: '#3d7bd9', to: '#7cd0c4', soft: 'rgba(61,123,217,0.14)' },
  space: { from: '#2a6a5e', to: '#ffc24b', soft: 'rgba(42,106,94,0.14)' },
  logo: { from: '#e85320', to: '#7c5cff', soft: 'rgba(255,107,53,0.12)' },
  social: { from: '#7c5cff', to: '#ff6b35', soft: 'rgba(124,92,255,0.14)' },
};

const t = computed(
  () => themes[props.variant as keyof typeof themes] || themes.poster,
);
const uid = computed(() => `art-${props.variant}-${String(props.seed)}`);
</script>

<template>
  <div
    class="art"
    :style="{ '--from': t.from, '--to': t.to, '--soft': t.soft }"
  >
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      :aria-label="label || '设计示例图'"
    >
      <defs>
        <linearGradient :id="`${uid}-bg`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="t.from" :stop-opacity="0.9" />
          <stop offset="100%" :stop-color="t.to" :stop-opacity="0.75" />
        </linearGradient>
        <linearGradient :id="`${uid}-soft`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="t.soft" />
          <stop
            offset="100%"
            stop-color="var(--color-surface)"
            stop-opacity="0"
          />
        </linearGradient>
      </defs>

      <!-- 背景 -->
      <rect width="400" height="300" fill="var(--color-surface-2)" />
      <rect width="400" height="300" :fill="`url(#${uid}-bg)`" />

      <!-- 装饰圆 -->
      <circle cx="330" cy="40" r="90" :fill="t.soft" />
      <circle cx="40" cy="270" r="70" :fill="t.soft" />

      <!-- 主图形：随变体变化 -->
      <template v-if="variant === 'poster'">
        <rect
          x="46"
          y="44"
          width="120"
          height="190"
          rx="10"
          fill="rgba(255,255,255,0.88)"
        />
        <rect x="62" y="68" width="88" height="14" rx="7" fill="#1e3a33" />
        <rect
          x="62"
          y="94"
          width="70"
          height="8"
          rx="4"
          fill="rgba(30,58,51,0.5)"
        />
        <rect
          x="62"
          y="110"
          width="82"
          height="8"
          rx="4"
          fill="rgba(30,58,51,0.32)"
        />
        <circle cx="106" cy="160" r="26" fill="#ff6b35" />
        <path
          d="M96 160l7 7 14-14"
          stroke="#fff"
          stroke-width="3"
          fill="none"
          stroke-linecap="round"
        />
        <rect
          x="190"
          y="30"
          width="160"
          height="230"
          rx="14"
          fill="rgba(255,255,255,0.2)"
          stroke="rgba(255,255,255,0.6)"
        />
        <text
          x="270"
          y="170"
          text-anchor="middle"
          font-size="56"
          font-weight="700"
          fill="#fff"
          opacity="0.9"
          font-family="Space Grotesk"
        >
          HEY19
        </text>
      </template>

      <template v-else-if="variant === 'store'">
        <rect
          x="50"
          y="120"
          width="300"
          height="90"
          rx="12"
          fill="rgba(255,255,255,0.92)"
        />
        <rect x="70" y="145" width="120" height="12" rx="6" fill="#1e3a33" />
        <rect
          x="70"
          y="168"
          width="180"
          height="7"
          rx="3.5"
          fill="rgba(30,58,51,0.45)"
        />
        <rect
          x="200"
          y="30"
          width="80"
          height="90"
          fill="rgba(255,255,255,0.25)"
          stroke="rgba(255,255,255,0.5)"
        />
        <rect
          x="215"
          y="45"
          width="50"
          height="34"
          fill="rgba(255,255,255,0.5)"
        />
        <rect
          x="260"
          y="210"
          width="40"
          height="90"
          fill="rgba(255,255,255,0.3)"
        />
        <rect
          x="100"
          y="210"
          width="40"
          height="90"
          fill="rgba(255,255,255,0.3)"
        />
        <path
          d="M330 120q0 -40 -30 -55"
          stroke="rgba(255,255,255,0.7)"
          stroke-width="3"
          fill="none"
        />
      </template>

      <template v-else-if="variant === 'vi'">
        <circle cx="200" cy="150" r="86" fill="rgba(255,255,255,0.85)" />
        <circle cx="200" cy="150" r="60" :fill="t.soft" />
        <text
          x="200"
          y="165"
          text-anchor="middle"
          font-size="64"
          font-weight="700"
          fill="#1e3a33"
          font-family="Space Grotesk"
        >
          H19
        </text>
        <rect
          x="40"
          y="250"
          width="70"
          height="10"
          rx="5"
          fill="rgba(255,255,255,0.6)"
        />
        <rect
          x="120"
          y="250"
          width="46"
          height="10"
          rx="5"
          fill="rgba(255,255,255,0.4)"
        />
      </template>

      <template v-else-if="variant === 'flyer'">
        <rect
          x="110"
          y="26"
          width="180"
          height="248"
          rx="12"
          fill="rgba(255,255,255,0.92)"
        />
        <rect
          x="132"
          y="48"
          width="136"
          height="70"
          rx="8"
          fill="var(--color-surface-3)"
        />
        <circle cx="200" cy="83" r="18" :fill="t.from" opacity="0.7" />
        <rect
          x="132"
          y="136"
          width="120"
          height="8"
          rx="4"
          fill="rgba(30,58,51,0.6)"
        />
        <rect
          x="132"
          y="152"
          width="96"
          height="8"
          rx="4"
          fill="rgba(30,58,51,0.35)"
        />
        <rect
          x="132"
          y="168"
          width="108"
          height="8"
          rx="4"
          fill="rgba(30,58,51,0.35)"
        />
        <rect x="132" y="200" width="60" height="22" rx="11" fill="#ff6b35" />
        <rect
          x="200"
          y="210"
          width="50"
          height="6"
          rx="3"
          fill="rgba(255,255,255,0.8)"
        />
      </template>

      <template v-else-if="variant === 'space'">
        <rect
          x="0"
          y="180"
          width="400"
          height="120"
          fill="rgba(255,255,255,0.15)"
        />
        <rect
          x="60"
          y="90"
          width="110"
          height="130"
          fill="rgba(255,255,255,0.75)"
        />
        <rect
          x="76"
          y="108"
          width="78"
          height="56"
          fill="rgba(255,255,255,0.4)"
        />
        <rect
          x="80"
          y="210"
          width="70"
          height="6"
          rx="3"
          fill="rgba(30,58,51,0.5)"
        />
        <rect
          x="230"
          y="130"
          width="120"
          height="90"
          fill="rgba(255,255,255,0.75)"
        />
        <rect
          x="246"
          y="148"
          width="88"
          height="50"
          fill="rgba(255,255,255,0.4)"
        />
        <rect
          x="250"
          y="210"
          width="80"
          height="6"
          rx="3"
          fill="rgba(30,58,51,0.5)"
        />
        <path
          d="M20 60l10 14M14 68l22-8"
          stroke="rgba(255,255,255,0.8)"
          stroke-width="2"
        />
      </template>

      <template v-else-if="variant === 'logo'">
        <rect
          x="120"
          y="80"
          width="160"
          height="140"
          rx="24"
          fill="rgba(255,255,255,0.9)"
        />
        <path d="M160 190l40-80 40 80z" fill="#ff6b35" />
        <circle cx="200" cy="120" r="12" fill="#1e3a33" />
        <text
          x="200"
          y="235"
          text-anchor="middle"
          font-size="20"
          font-weight="600"
          fill="#1e3a33"
          font-family="Space Grotesk"
        >
          HEY 19
        </text>
      </template>

      <template v-else>
        <rect
          x="36"
          y="60"
          width="100"
          height="100"
          rx="10"
          fill="rgba(255,255,255,0.85)"
        />
        <rect
          x="150"
          y="60"
          width="100"
          height="100"
          rx="10"
          fill="rgba(255,255,255,0.65)"
        />
        <rect
          x="264"
          y="60"
          width="100"
          height="100"
          rx="10"
          fill="rgba(255,255,255,0.45)"
        />
        <rect
          x="36"
          y="174"
          width="100"
          height="100"
          rx="10"
          fill="rgba(255,255,255,0.55)"
        />
        <rect
          x="150"
          y="174"
          width="100"
          height="100"
          rx="10"
          fill="rgba(255,255,255,0.35)"
        />
        <rect
          x="264"
          y="174"
          width="100"
          height="100"
          rx="10"
          fill="rgba(255,255,255,0.25)"
        />
      </template>
    </svg>
  </div>
</template>

<style scoped>
.art {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.art svg {
  width: 100%;
  height: 100%;
}
</style>
