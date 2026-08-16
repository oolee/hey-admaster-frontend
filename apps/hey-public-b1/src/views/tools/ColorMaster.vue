<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

// ================= Types =================
type HarmonyKey = 'analogous' | 'complementary' | 'mono' | 'split' | 'triadic';
interface Swatch {
  hex: string;
  name: string;
}
interface PresetColor {
  key: string;
  name: string;
  hex: string;
}

// ================= Utility: color math =================
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isNaN(n) ? min : n));
}
function hex2rgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  h = h.padEnd(6, '0').slice(0, 6);
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
}
function rgb2hex(r: number, g: number, b: number): string {
  const h = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}
function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case b: {
        h = (r - g) / d + 4;
        break;
      }
      case g: {
        h = (b - r) / d + 2;
        break;
      }
      case r: {
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      }
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hue2rgb(p, q, h + 1 / 3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1 / 3) * 255,
  ];
}
function rgb2cmyk(
  r: number,
  g: number,
  b: number,
): [number, number, number, number] {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const K = 1 - Math.max(R, G, B);
  if (K === 1) return [0, 0, 0, 100];
  const C = (1 - R - K) / (1 - K);
  const M = (1 - G - K) / (1 - K);
  const Y = (1 - B - K) / (1 - K);
  return [
    Math.round(C * 100),
    Math.round(M * 100),
    Math.round(Y * 100),
    Math.round(K * 100),
  ];
}
function cmyk2rgb(
  c: number,
  m: number,
  y: number,
  k: number,
): [number, number, number] {
  c /= 100;
  m /= 100;
  y /= 100;
  k /= 100;
  return [
    255 * (1 - c) * (1 - k),
    255 * (1 - m) * (1 - k),
    255 * (1 - y) * (1 - k),
  ];
}
function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hex2rgb(hex1);
  const [r2, g2, b2] = hex2rgb(hex2);
  const L1 = luminance(r1, g1, b1);
  const L2 = luminance(r2, g2, b2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ================= Config =================
const PRESET_COLORS: PresetColor[] = [
  { key: 'neon', name: '霓虹绿', hex: '#CCFF00' },
  { key: 'brand-red', name: '品牌红', hex: '#E11D48' },
  { key: 'biz-blue', name: '商务蓝', hex: '#2563EB' },
  { key: 'milktea', name: '奶茶棕', hex: '#C89F7E' },
  { key: 'morandi', name: '莫兰迪灰', hex: '#9A8C98' },
  { key: 'sun', name: '落日橙', hex: '#F97316' },
  { key: 'forest', name: '森林绿', hex: '#15803D' },
  { key: 'violet', name: '紫罗兰', hex: '#7C3AED' },
  { key: 'gold', name: '皇家金', hex: '#C8794A' },
  { key: 'rose', name: '樱花粉', hex: '#FDA4AF' },
  { key: 'ocean', name: '深海蓝', hex: '#0EA5E9' },
  { key: 'ebony', name: '墨黑', hex: '#0B0D0C' },
];

// ================= State =================
const hexStr = ref<string>('#CCFF00');
const rgb = ref<[number, number, number]>([204, 255, 0]);
const hsl = ref<[number, number, number]>([72, 100, 50]);
const cmyk = ref<[number, number, number, number]>([20, 0, 100, 0]);
const harmonyKey = ref<HarmonyKey>('mono');
const copiedField = ref<string>('');
const syncFromHex = false;

// ================= Derived =================
const hex = computed(() => rgb2hex(...rgb.value));
watch(hex, (v) => {
  hexStr.value = v;
});
const formattedRgb = computed(
  () => `rgb(${rgb.value[0]}, ${rgb.value[1]}, ${rgb.value[2]})`,
);
const formattedHsl = computed(
  () => `hsl(${hsl.value[0]}, ${hsl.value[1]}%, ${hsl.value[2]}%)`,
);
const formattedCmyk = computed(
  () =>
    `cmyk(${cmyk.value[0]}%, ${cmyk.value[1]}%, ${cmyk.value[2]}%, ${cmyk.value[3]}%)`,
);

const onWhiteRatio = computed(() => contrastRatio(hex.value, '#FFFFFF'));
const onBlackRatio = computed(() => contrastRatio(hex.value, '#000000'));
const wcagWhite = computed(() => {
  const r = onWhiteRatio.value;
  const aaa = r >= 7;
  const aa = r >= 4.5;
  const aalarge = r >= 3;
  return { aaa, aa, aalarge, ratio: r };
});
const wcagBlack = computed(() => {
  const r = onBlackRatio.value;
  const aaa = r >= 7;
  const aa = r >= 4.5;
  const aalarge = r >= 3;
  return { aaa, aa, aalarge, ratio: r };
});

// Tints / Shades 5-stop Monochrome Palette
const shades = computed<Swatch[]>(() => {
  const [h, s, l] = hsl.value;
  const stops: [string, number][] = [
    ['95% 极浅', 0.95],
    ['80% 浅', 0.8],
    ['50% 原色', l / 100],
    ['30% 深', 0.3],
    ['12% 极深', 0.12],
  ];
  return stops.map(([name, lv]) => ({
    name,
    hex: rgb2hex(...hsl2rgb(h, s, lv * 100)),
  }));
});

// Harmonies
function rotateHue(deg: number, delta: number): number {
  return (deg + delta + 360) % 360;
}
interface Harmony {
  label: string;
  colors: Swatch[];
}
const harmony = computed((): Harmony => {
  const [h, s, l] = hsl.value;
  switch (harmonyKey.value) {
    case 'analogous': {
      const deltas = [-30, -15, 0, 15, 30];
      return {
        label: 'Analogous · 邻近色',
        colors: deltas.map((d) => ({
          name: `${d > 0 ? '+' : ''}${d}°`,
          hex: rgb2hex(...hsl2rgb(rotateHue(h, d), s, l)),
        })),
      };
    }
    case 'complementary': {
      const deltas = [-15, 0, 180, 180 - 15, 180 + 15];
      return {
        label: 'Complementary · 互补色',
        colors: deltas.map((d) => ({
          name:
            d === 0 ? '原色' : d === 180 ? '互补' : `${d > 0 ? '+' : ''}${d}°`,
          hex: rgb2hex(...hsl2rgb(rotateHue(h, d), s, l)),
        })),
      };
    }
    case 'mono': {
      return {
        label: 'Monochrome · 单色阶',
        colors: shades.value,
      };
    }
    case 'triadic': {
      const deltas = [0, 120, 240];
      return {
        label: 'Triadic · 三色三角',
        colors: [
          { name: '120°', hex: rgb2hex(...hsl2rgb(rotateHue(h, 120), s, l)) },
          { name: '原色', hex: hex.value },
          { name: '240°', hex: rgb2hex(...hsl2rgb(rotateHue(h, 240), s, l)) },
        ],
      };
    }
    case 'split':
    default: {
      const deltas = [0, 150, 210, 180];
      return {
        label: 'Split-Comp · 分裂互补',
        colors: deltas.map((d) => ({
          name: d === 0 ? '原色' : `${d}°`,
          hex: rgb2hex(...hsl2rgb(rotateHue(h, d), s, l)),
        })),
      };
    }
  }
});

// ================= Sync =================
function setFromHex(v: string) {
  const cleaned = v.startsWith('#') ? v : `#${v}`;
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cleaned)) return;
  const rgbV = hex2rgb(cleaned);
  rgb.value = rgbV;
  hsl.value = rgb2hsl(...rgbV);
  cmyk.value = rgb2cmyk(...rgbV);
}
watch(hexStr, (v) => setFromHex(v));

function setRgb(r: number, g: number, b: number) {
  const rr = clamp(Math.round(r), 0, 255);
  const gg = clamp(Math.round(g), 0, 255);
  const bb = clamp(Math.round(b), 0, 255);
  if (syncFromHex) return;
  rgb.value = [rr, gg, bb];
  hsl.value = rgb2hsl(rr, gg, bb);
  cmyk.value = rgb2cmyk(rr, gg, bb);
}
function setHsl(h: number, s: number, l: number) {
  const hh = clamp(Math.round(h), 0, 360);
  const ss = clamp(Math.round(s), 0, 100);
  const ll = clamp(Math.round(l), 0, 100);
  const rgbV = hsl2rgb(hh, ss, ll);
  rgb.value = rgbV;
  hsl.value = [hh, ss, ll];
  cmyk.value = rgb2cmyk(...rgbV);
}
function setCmyk(c: number, m: number, y: number, k: number) {
  const cc = clamp(Math.round(c), 0, 100);
  const mm = clamp(Math.round(m), 0, 100);
  const yy = clamp(Math.round(y), 0, 100);
  const kk = clamp(Math.round(k), 0, 100);
  const rgbV = cmyk2rgb(cc, mm, yy, kk);
  rgb.value = rgbV;
  hsl.value = rgb2hsl(...rgbV);
  cmyk.value = [cc, mm, yy, kk];
}
function onRgbField(i: number, e: Event) {
  const v = Number.parseInt((e.target as HTMLInputElement).value, 10);
  const copy = [...rgb.value] as [number, number, number];
  copy[i] = clamp(v);
  setRgb(...copy);
}
function onHslField(i: number, e: Event) {
  const v = Number.parseInt((e.target as HTMLInputElement).value, 10);
  const copy = [...hsl.value] as [number, number, number];
  copy[i] = v;
  setHsl(...copy);
}
function onCmykField(i: number, e: Event) {
  const v = Number.parseInt((e.target as HTMLInputElement).value, 10);
  const copy = [...cmyk.value] as [number, number, number, number];
  copy[i] = v;
  setCmyk(...copy);
}

// ================= Actions =================
async function copyToClipboard(text: string, field: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedField.value = field;
    setTimeout(() => {
      if (copiedField.value === field) copiedField.value = '';
    }, 1400);
  } catch {
    /* ignore */
  }
}
function pickPreset(p: PresetColor) {
  setFromHex(p.hex);
}
function pickSwatch(sw: Swatch) {
  setFromHex(sw.hex);
}
function randomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  setRgb(r, g, b);
}
function downloadPalette() {
  const lines: string[] = [];
  lines.push(
    `/* Hey-AdMaster · 色板导出 */`,
    `/* 主色: ${hex.value} */`,
    `--color-primary: ${hex.value};`,
    `--color-primary-rgb: ${formattedRgb.value.replace(/[rgb()\s]/g, '')};`,
  );
  lines.push(
    `--color-primary-hsl: ${formattedHsl.value};`,
    `--color-primary-cmyk: ${formattedCmyk.value};`,
    '',
    '/* 单色阶 Shades */',
  );
  shades.value.forEach((s, i) =>
    lines.push(
      `--color-${['lightest', 'light', 'DEFAULT', 'dark', 'darkest'][i]}: ${s.hex};`,
    ),
  );
  lines.push('', `/* 和谐色盘: ${harmony.value.label} */`);
  harmony.value.colors.forEach((c) =>
    lines.push(`--color-${c.name.replaceAll(/[^a-z0-9]/gi, '-')}: ${c.hex};`),
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/css;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `palette-${hex.value.slice(1)}.css`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

onMounted(() => {
  setFromHex(hexStr.value);
});
</script>

<template>
  <div class="tool-page">
    <!-- ========= Topbar (sticky) ========= -->
    <header class="topbar">
      <div class="topbar-inner container-custom">
        <RouterLink to="/tools" class="topbar-back" title="返回工具箱">
          <span>返回工具箱</span>
        </RouterLink>
        <div class="topbar-title">
          <h1>调色大师</h1>
          <p>
            本地处理 · HEX / RGB / HSL / CMYK 实时互转 · 搭配和谐色板 · WCAG
            对比度检查
          </p>
        </div>
        <span class="pill-format">HEX · RGB · HSL · CMYK</span>
      </div>
    </header>

    <!-- ========= Workspace ========= -->
    <main class="tool-workspace container-custom">
      <!-- 卡片 1: 设置：预览 + 预设色 + 随机 -->
      <section class="glass-card card-preview">
        <div class="preview-top">
          <div class="swatch-main">
            <div class="swatch-color" :style="{ background: hex }">
              <div class="swatch-split" style="color: #000">A a 文 Aa</div>
              <div
                class="swatch-split"
                style="
                  color: #fff;
                  background: linear-gradient(
                    to top,
                    rgb(0 0 0 / 38%),
                    transparent 60%
                  );
                "
              >
                A a 文 Aa
              </div>
            </div>
            <div class="swatch-info">
              <div class="sw-main-hex">{{ hex }}</div>
              <div class="swatch-actions">
                <button
                  class="btn-ghost"
                  @click="copyToClipboard(hex, 'hex-main')"
                >
                  {{ copiedField === 'hex-main' ? '已复制' : '复制 HEX' }}
                </button>
                <button class="btn-ghost" @click="randomColor()">换一个</button>
                <button class="btn-download sm" @click="downloadPalette()">
                  导出色板
                </button>
              </div>
              <div class="contrast">
                <div class="contrast-row">
                  <span class="contrast-label">白底文字</span>
                  <span
                    class="contrast-swatch"
                    style=" color: {{ hex }};background:#fff"
                    >Aa 示例</span
                  >
                  <div class="wcag-tags">
                    <span class="tag ok" v-if="wcagWhite.aaa">AAA</span>
                    <span class="tag ok" v-else-if="wcagWhite.aa">AA</span>
                    <span class="tag warn" v-else-if="wcagWhite.aalarge"
                      >AA 大字体</span
                    >
                    <span class="tag bad" v-else>不通过</span>
                    <span class="ratio"
                      >{{ wcagWhite.ratio.toFixed(2) }} : 1</span
                    >
                  </div>
                </div>
                <div class="contrast-row">
                  <span class="contrast-label">黑底文字</span>
                  <span
                    class="contrast-swatch"
                    style=" color: {{ hex }};background:#000"
                    >Aa 示例</span
                  >
                  <div class="wcag-tags">
                    <span class="tag ok" v-if="wcagBlack.aaa">AAA</span>
                    <span class="tag ok" v-else-if="wcagBlack.aa">AA</span>
                    <span class="tag warn" v-else-if="wcagBlack.aalarge"
                      >AA 大字体</span
                    >
                    <span class="tag bad" v-else>不通过</span>
                    <span class="ratio"
                      >{{ wcagBlack.ratio.toFixed(2) }} : 1</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="preset-row">
          <div class="preset-title">预设色板</div>
          <div class="preset-grid">
            <button
              v-for="p in PRESET_COLORS"
              :key="p.key"
              class="preset-chip"
              :class="{ active: p.hex.toUpperCase() === hex }"
              @click="pickPreset(p)"
            >
              <span class="pc-color" :style="{ background: p.hex }"></span>
              <span class="pc-name">{{ p.name }}</span>
              <span class="pc-hex">{{ p.hex }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 卡片 2: 互转输入 -->
      <section class="glass-card card-convert">
        <div class="convert-grid">
          <!-- HEX -->
          <div class="convert-col">
            <div class="col-head">
              <label>HEX</label>
              <button class="btn-mini" @click="copyToClipboard(hex, 'hex')">
                {{ copiedField === 'hex' ? '✓' : '复制' }}
              </button>
            </div>
            <input
              type="text"
              class="convert-input"
              v-model="hexStr"
              maxlength="7"
              spellcheck="false"
            />
            <div class="col-out" title="HEX大写">{{ hex }}</div>
          </div>
          <!-- RGB -->
          <div class="convert-col">
            <div class="col-head">
              <label>RGB</label>
              <button
                class="btn-mini"
                @click="copyToClipboard(formattedRgb, 'rgb')"
              >
                {{ copiedField === 'rgb' ? '✓' : '复制' }}
              </button>
            </div>
            <div class="rgb-row">
              <div class="rgb-field">
                <label>R</label
                ><input
                  type="number"
                  min="0"
                  max="255"
                  :value="rgb[0]"
                  @input="onRgbField(0, $event)"
                />
              </div>
              <div class="rgb-field">
                <label>G</label
                ><input
                  type="number"
                  min="0"
                  max="255"
                  :value="rgb[1]"
                  @input="onRgbField(1, $event)"
                />
              </div>
              <div class="rgb-field">
                <label>B</label
                ><input
                  type="number"
                  min="0"
                  max="255"
                  :value="rgb[2]"
                  @input="onRgbField(2, $event)"
                />
              </div>
            </div>
            <div class="col-out">{{ formattedRgb }}</div>
          </div>
          <!-- HSL -->
          <div class="convert-col">
            <div class="col-head">
              <label>HSL</label>
              <button
                class="btn-mini"
                @click="copyToClipboard(formattedHsl, 'hsl')"
              >
                {{ copiedField === 'hsl' ? '✓' : '复制' }}
              </button>
            </div>
            <div class="rgb-row">
              <div class="rgb-field">
                <label>H°</label
                ><input
                  type="number"
                  min="0"
                  max="360"
                  :value="hsl[0]"
                  @input="onHslField(0, $event)"
                />
              </div>
              <div class="rgb-field">
                <label>S%</label
                ><input
                  type="number"
                  min="0"
                  max="100"
                  :value="hsl[1]"
                  @input="onHslField(1, $event)"
                />
              </div>
              <div class="rgb-field">
                <label>L%</label
                ><input
                  type="number"
                  min="0"
                  max="100"
                  :value="hsl[2]"
                  @input="onHslField(2, $event)"
                />
              </div>
            </div>
            <div class="col-out">{{ formattedHsl }}</div>
          </div>
          <!-- CMYK -->
          <div class="convert-col">
            <div class="col-head">
              <label>CMYK</label>
              <button
                class="btn-mini"
                @click="copyToClipboard(formattedCmyk, 'cmyk')"
              >
                {{ copiedField === 'cmyk' ? '✓' : '复制' }}
              </button>
            </div>
            <div class="cmyk-row">
              <div class="cmyk-field">
                <label>C</label
                ><input
                  type="number"
                  min="0"
                  max="100"
                  :value="cmyk[0]"
                  @input="onCmykField(0, $event)"
                />
              </div>
              <div class="cmyk-field">
                <label>M</label
                ><input
                  type="number"
                  min="0"
                  max="100"
                  :value="cmyk[1]"
                  @input="onCmykField(1, $event)"
                />
              </div>
              <div class="cmyk-field">
                <label>Y</label
                ><input
                  type="number"
                  min="0"
                  max="100"
                  :value="cmyk[2]"
                  @input="onCmykField(2, $event)"
                />
              </div>
              <div class="cmyk-field">
                <label>K</label
                ><input
                  type="number"
                  min="0"
                  max="100"
                  :value="cmyk[3]"
                  @input="onCmykField(3, $event)"
                />
              </div>
            </div>
            <div class="col-out">{{ formattedCmyk }}</div>
          </div>
        </div>
      </section>

      <!-- 卡片 3: 和谐色盘 -->
      <section class="glass-card card-harmony">
        <div class="harmony-head">
          <div class="mode-tabs small">
            <button
              class="mode-tab"
              :class="{ active: harmonyKey === 'mono' }"
              @click="harmonyKey = 'mono'"
            >
              <span>单色阶</span>
            </button>
            <button
              class="mode-tab"
              :class="{ active: harmonyKey === 'analogous' }"
              @click="harmonyKey = 'analogous'"
            >
              <span>邻近色</span>
            </button>
            <button
              class="mode-tab"
              :class="{ active: harmonyKey === 'complementary' }"
              @click="harmonyKey = 'complementary'"
            >
              <span>互补色</span>
            </button>
            <button
              class="mode-tab"
              :class="{ active: harmonyKey === 'triadic' }"
              @click="harmonyKey = 'triadic'"
            >
              <span>三色三角</span>
            </button>
            <button
              class="mode-tab"
              :class="{ active: harmonyKey === 'split' }"
              @click="harmonyKey = 'split'"
            >
              <span>分裂互补</span>
            </button>
          </div>
          <div class="harmony-name">{{ harmony.label }}</div>
        </div>
        <div
          class="palette-grid"
          :class="{
            'palette-5': harmony.colors.length === 5,
            'palette-3': harmony.colors.length === 3,
          }"
        >
          <button
            v-for="(c, i) in harmony.colors"
            :key="c.hex + i"
            class="palette-item"
            @click="pickSwatch(c)"
            :title="`点击使用此色: ${ c.hex}`"
          >
            <div class="palette-color" :style="{ background: c.hex }"></div>
            <div class="palette-meta">
              <span class="pal-name">{{ c.name }}</span>
              <span class="pal-hex">{{ c.hex }}</span>
              <button
                class="btn-mini pal-copy"
                @click.stop="copyToClipboard(c.hex, `p${ i}`)"
              >
                {{ copiedField === `p${ i}` ? '✓' : '复制' }}
              </button>
            </div>
          </button>
        </div>
      </section>

      <!-- 卡片 4: 实际应用效果预览 -->
      <section class="glass-card card-showcase">
        <div class="show-head"><div class="sh-title">应用效果预览</div></div>
        <div class="showcase-grid">
          <div
            class="show-tile light-bg"
            :style="{
              background: '#ffffff',
              color:
                harmony.colors.length > 2
                  ? harmony.colors[harmony.colors.length - 1].hex
                  : hex,
            }"
          >
            <div class="tile-title">浅色模式 · 标题 H1</div>
            <div class="tile-sub">副标题 / Subtitle Line</div>
            <div class="tile-body">
              这是一段正文文字。正文内容展示，正文内容展示，检查在浅色模式下的对比度表现。
            </div>
            <div class="tile-cta" :style="{ background: hex, color: '#000' }">
              立即注册
            </div>
          </div>
          <div
            class="show-tile dark-bg"
            :style="{ background: '#0B0D0C', color: harmony.colors[0].hex }"
          >
            <div class="tile-title">深色模式 · 标题 H1</div>
            <div class="tile-sub">副标题 / Subtitle Line</div>
            <div class="tile-body">
              这是一段正文文字。正文内容展示，检查深色模式下的对比度表现。
            </div>
            <div class="tile-cta" :style="{ background: hex, color: '#000' }">
              了解更多
            </div>
          </div>
          <div
            class="show-tile brand-bg"
            :style="{
              background: hex,
              color: onWhiteRatio >= onBlackRatio ? '#000' : '#fff',
            }"
          >
            <div class="tile-title">品牌色作主色</div>
            <div class="tile-sub">按钮 / 强调 / 边框</div>
            <div class="tile-body">将当前颜色作为品牌色使用时的视觉效果。</div>
            <div
              class="tile-cta"
              style="
                color: inherit;
                background: color-mix(in srgb, #fff 86%, transparent);
              "
            >
              查看详情
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
:root {
  --color-neon: #cf0;
  --color-neon-dim: rgb(204 255 0 / 35%);
  --color-neon-glow: rgb(204 255 0 / 16%);
  --color-bg-primary: #0b0d0c;
  --color-bg-card: #131615;
  --color-border: rgb(255 255 255 / 8%);
  --color-border-hover: rgb(255 255 255 / 16%);
  --color-text-primary: #e9f2ee;
  --color-text-secondary: #a7b3ac;
  --color-text-muted: #6c7872;
}

@media (prefers-color-scheme: light) {
  :root {
    --color-bg-primary: #f7f9f6;
    --color-bg-card: #fff;
    --color-border: rgb(0 0 0 / 7%);
    --color-border-hover: rgb(0 0 0 / 14%);
    --color-text-primary: #0f1714;
    --color-text-secondary: #4b5650;
    --color-text-muted: #7a867f;
  }
}

.tool-page {
  min-height: 100vh;
  padding-top: 96px;
  background:
    radial-gradient(
      circle at 10% -10%,
      var(--color-neon-glow),
      transparent 45%
    ),
    radial-gradient(
      circle at 110% 120%,
      var(--color-neon-glow),
      transparent 40%
    ),
    var(--color-bg-primary);
  background-attachment: fixed;
}

/* ========= Topbar ========= */
.topbar {
  position: sticky;
  top: 56px;
  z-index: 50;
  background: color-mix(in srgb, var(--color-bg-primary) 82%, transparent);
  border-bottom: 1px solid var(--color-border);
  border-radius: 12px 12px 0 0;
  backdrop-filter: saturate(180%) blur(14px);
  backdrop-filter: saturate(180%) blur(14px);
}

.topbar-inner {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  max-width: 1080px;
  padding: 11px 20px;
  margin: 0 auto;
}

.topbar-back {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.2s;
}

.topbar-back:hover {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
}

.topbar-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  min-width: 0;
}

.topbar-title h1 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1;
  color: var(--color-neon);
  letter-spacing: 0.01em;
}

.topbar-title p {
  max-width: 640px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.74rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  opacity: 0.9;
}

.pill-format {
  display: inline-flex;
  align-items: center;
  padding: 5px 13px;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
  white-space: nowrap;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
}

@media (max-width: 720px) {
  .topbar-title p,
  .pill-format {
    display: none;
  }
}

/* ========= Workspace ========= */
.tool-workspace {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1080px;
  padding: 18px 20px 40px;
  margin: 0 auto;
}

.glass-card {
  padding: 16px 18px;
  background: color-mix(in srgb, var(--color-bg-card) 86%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  transition: border-color 0.2s;
}

.glass-card:hover {
  border-color: var(--color-border-hover);
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  padding: 7px 13px;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  white-space: nowrap;
  cursor: pointer;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 9px;
  transition: all 0.2s;
}

.btn-ghost:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.btn-download {
  display: inline-flex;
  align-items: center;
  padding: 9px 18px;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--color-bg-primary);
  letter-spacing: 0.01em;
  cursor: pointer;
  background: var(--color-neon);
  border: none;
  border-radius: 11px;
  box-shadow: 0 8px 18px var(--color-neon-glow);
  transition: all 0.2s;
}

.btn-download:hover {
  transform: translateY(-1px);
}

.btn-download.sm {
  padding: 7px 14px;
  font-size: 0.76rem;
}

.btn-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 10px;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 7px;
  transition: all 0.15s;
}

.btn-mini:hover {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
}

/* =============== Card 1: Preview =============== */
.card-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-top {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 18px;
  align-items: stretch;
}

@media (max-width: 820px) {
  .preview-top {
    grid-template-columns: 1fr;
  }
}

.swatch-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.swatch-color {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  aspect-ratio: 16 / 7;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 14px 40px -20px rgb(0 0 0 / 50%);
}

.swatch-split {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.swatch-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: space-between;
}

.sw-main-hex {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 2.4rem;
  font-weight: 900;
  line-height: 1;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
}

.swatch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.contrast {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.contrast-row {
  display: grid;
  grid-template-columns: 72px 120px 1fr;
  gap: 10px;
  align-items: center;
  padding: 7px 10px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.contrast-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.contrast-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  font-size: 0.78rem;
  font-weight: 800;
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.wcag-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  border: 1px solid transparent;
  border-radius: 9999px;
}

.tag.ok {
  color: #15803d;
  background: rgb(34 197 94 / 12%);
  border-color: rgb(34 197 94 / 25%);
}

.tag.warn {
  color: #a16207;
  background: rgb(234 179 8 / 14%);
  border-color: rgb(234 179 8 / 30%);
}

.tag.bad {
  color: #b91c1c;
  background: rgb(239 68 68 / 12%);
  border-color: rgb(239 68 68 / 25%);
}

.ratio {
  margin-left: auto;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.preset-row {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.preset-title {
  padding-left: 2px;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.preset-chip {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 9px;
  align-items: center;
  padding: 7px 10px;
  text-align: left;
  cursor: pointer;
  background: var(--color-bg-primary);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.2s;
}

.preset-chip:hover:not(.active) {
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
}

.preset-chip.active {
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
  box-shadow: 0 0 0 2px var(--color-neon-glow);
}

.pc-color {
  display: inline-block;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: 7px;
}

.pc-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.74rem;
  font-weight: 800;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.preset-chip.active .pc-name {
  color: var(--color-neon);
}

.pc-hex {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

/* =============== Card 2: Convert =============== */
.convert-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 720px) {
  .convert-grid {
    grid-template-columns: 1fr;
  }
}

.convert-col {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px 13px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.col-head label {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.convert-input {
  padding: 10px 12px;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 1.02rem;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
  outline: none;
  background: var(--color-bg-card);
  border: 1.5px solid var(--color-border);
  border-radius: 9px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.convert-input:focus {
  border-color: var(--color-neon);
  box-shadow: 0 0 0 3px var(--color-neon-glow);
}

.rgb-row,
.cmyk-row {
  display: grid;
  gap: 7px;
}

.rgb-row {
  grid-template-columns: repeat(3, 1fr);
}

.cmyk-row {
  grid-template-columns: repeat(4, 1fr);
}

.rgb-field,
.cmyk-field {
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 5px;
  align-items: center;
}

.rgb-field label,
.cmyk-field label {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--color-text-muted);
  text-align: center;
}

.rgb-field input,
.cmyk-field input {
  width: 100%;
  padding: 8px 10px;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-card);
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  transition: border-color 0.2s;
}

.rgb-field input:focus,
.cmyk-field input:focus {
  border-color: var(--color-neon);
  box-shadow: 0 0 0 2px var(--color-neon-glow);
}

.col-out {
  padding: 6px 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  white-space: nowrap;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 7px;
}

/* =============== Card 3: Harmony =============== */
.card-harmony {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.harmony-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.harmony-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
}

.mode-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.mode-tabs.small {
  padding: 3px;
  border-radius: 10px;
}

.mode-tab {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 7px 10px;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 8px;
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.mode-tabs.small .mode-tab {
  flex: 0 auto;
  padding: 6px 11px;
  font-size: 0.72rem;
}

.mode-tab:hover:not(.active) {
  color: var(--color-text-primary);
  background: var(--color-bg-card);
}

.mode-tab.active {
  font-weight: 800;
  color: var(--color-bg-primary);
  background: var(--color-neon);
}

.palette-grid {
  display: grid;
  gap: 10px;
}

.palette-5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.palette-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 820px) {
  .palette-5 {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .palette-5 {
    grid-template-columns: repeat(2, 1fr);
  }

  .palette-3 {
    grid-template-columns: 1fr;
  }
}

.palette-item {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 9px;
  text-align: left;
  cursor: pointer;
  background: var(--color-bg-primary);
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.22s;
}

.palette-item:hover {
  border-color: var(--color-border-hover);
  transform: translateY(-2px);
}

.palette-color {
  width: 100%;
  aspect-ratio: 5 / 3;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.palette-meta {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 0 2px;
}

.pal-name {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.pal-hex {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 0.78rem;
  font-weight: 900;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
}

.pal-copy {
  position: absolute;
  top: 1px;
  right: 0;
}

/* =============== Card 4: Showcase =============== */
.card-showcase {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.show-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sh-title {
  font-size: 0.74rem;
  font-weight: 800;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.showcase-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 820px) {
  .showcase-grid {
    grid-template-columns: 1fr;
  }
}

.show-tile {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 200px;
  padding: 18px 18px 16px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  transition: transform 0.2s;
}

.show-tile:hover {
  transform: translateY(-2px);
}

.tile-title {
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1.2;
}

.tile-sub {
  font-size: 0.82rem;
  font-weight: 600;
  opacity: 0.8;
}

.tile-body {
  flex: 1;
  font-size: 0.82rem;
  line-height: 1.5;
  opacity: 0.92;
}

.tile-cta {
  align-self: flex-start;
  padding: 8px 14px;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: default;
  user-select: none;
  border-radius: 9px;
}
</style>
