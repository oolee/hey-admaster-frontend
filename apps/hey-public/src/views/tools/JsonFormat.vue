<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// ================= Types =================
type Indent = '2' | '4' | 'tab';
type SortKey = 'asc' | 'desc' | 'none';

// ================= Config =================
const SAMPLES: { label: string; value: string }[] = [
  {
    label: '示例：产品',
    value: JSON.stringify(
      {
        id: 1024,
        name: '霓虹绿联名 T 恤',
        sku: 'NEON-TEE-2026-CCFF00',
        price: { amount: 199, currency: 'CNY' },
        tags: ['新品', '限量', '夏季'],
        stock: { S: 42, M: 128, L: 67, XL: 11 },
        onSale: true,
        launchAt: '2026-06-18T00:00:00+08:00',
      },
      null,
      2,
    ),
  },
  {
    label: '示例：分页列表',
    value: JSON.stringify(
      {
        code: 0,
        message: 'OK',
        data: {
          page: 1,
          pageSize: 20,
          total: 128,
          items: [
            { id: 1, title: '第一则', createdAt: 1_719_936_000_000 },
            { id: 2, title: '第二则', createdAt: 1_719_939_600_000 },
          ],
        },
      },
      null,
      2,
    ),
  },
  {
    label: '示例：错误 JSON',
    value: `{
  "name": "测试",
  "broken": ,
  "nested": { a: 1 }
}`,
  },
];

// ================= State =================
const raw = ref<string>('');
const indent = ref<Indent>('2');
const sortKeys = ref<SortKey>('none');
const escapeUnicode = ref(false);
const copied = ref(false);
const fileName = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

let toastTimer: null | number = null;
const toast = ref<null | { text: string; type: 'err' | 'ok'; }>(null);
function showToast(type: 'err' | 'ok', text: string) {
  toast.value = { type, text };
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.value = null), 2200);
}
onBeforeUnmount(() => {
  if (toastTimer) window.clearTimeout(toastTimer);
});

// ================= Computed =================
const indentStr = computed(() =>
  indent.value === 'tab' ? '\t' : ' '.repeat(Number.parseInt(indent.value, 10)),
);

interface ParseResult {
  ok: boolean;
  value: unknown;
  error?: { column: number; line: number; message: string };
}
const parsed = computed<ParseResult>(() => {
  const src = raw.value;
  if (!src.trim()) return { ok: true, value: undefined };
  try {
    const v = JSON.parse(src);
    return { ok: true, value: v };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const posMatch = /position\s+(\d+)/i.exec(msg);
    let line = 1;
    let column = 0;
    if (posMatch) {
      const pos = Number.parseInt(posMatch[1], 10);
      const upTo = src.slice(0, pos);
      const lines = upTo.split('\n');
      line = lines.length;
      column = (lines[lines.length - 1]?.length ?? 0) + 1;
    }
    return {
      ok: false,
      value: undefined,
      error: { line, column, message: msg },
    };
  }
});

const stats = computed(() => {
  const src = raw.value;
  const bytes = new Blob([src]).size;
  const lines = src ? src.split('\n').length : 0;
  let depth = 0;
  let maxDepth = 0;
  let inStr = false;
  let prev = '';
  for (const ch of src) {
    if (inStr) {
      if (ch === '"' && prev !== '\\') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{' || ch === '[') {
        depth++;
        maxDepth = Math.max(maxDepth, depth);
      } else if (ch === '}' || ch === ']') depth = Math.max(0, depth - 1);
    }
    prev = ch;
  }
  let count = 0;
  if (parsed.value.ok && parsed.value.value != null) {
    const walk = (v: unknown) => {
      count++;
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object')
        Object.values(v as object).forEach(walk);
    };
    walk(parsed.value.value);
  }
  return {
    chars: src.length,
    bytes,
    lines,
    depth: maxDepth,
    nodes: count,
  };
});

const formatted = computed<string>(() => {
  if (!parsed.value.ok || parsed.value.value === undefined) return '';
  const replacer: ((_: string, v: unknown) => unknown) | undefined =
    sortKeys.value === 'none'
      ? undefined
      : (_k: string, v: unknown) => {
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            const entries = Object.entries(v as Record<string, unknown>);
            const dir = sortKeys.value === 'asc' ? 1 : -1;
            entries.sort((a, b) =>
              a[0] < b[0] ? -dir : a[0] > b[0] ? dir : 0,
            );
            return Object.fromEntries(entries);
          }
          return v;
        };
  let s = JSON.stringify(parsed.value.value, replacer, indentStr.value);
  if (escapeUnicode.value) {
    s = s.replaceAll(/[\u007F-\uFFFF]/g, (c) => {
      const hex = c.codePointAt(0).toString(16).padStart(4, '0');
      return `\\u${hex}`;
    });
  }
  return s;
});

const minified = computed<string>(() => {
  if (!parsed.value.ok || parsed.value.value === undefined) return '';
  return JSON.stringify(parsed.value.value);
});

const minifiedBytes = computed(() => new Blob([minified.value]).size);
const savedPct = computed(() => {
  if (stats.value.bytes === 0 || minifiedBytes.value === 0) return 0;
  return Math.round(
    ((stats.value.bytes - minifiedBytes.value) / stats.value.bytes) * 100,
  );
});

// ================= Actions =================
function loadSample(s: string) {
  raw.value = s;
  showToast('ok', '示例已加载');
}
function doClear() {
  raw.value = '';
  fileName.value = '';
  showToast('ok', '已清空');
}
function doFormat() {
  if (!raw.value.trim()) {
    showToast('err', '请先输入 JSON');
    return;
  }
  if (!parsed.value.ok) {
    showToast('err', 'JSON 格式错误，无法格式化');
    return;
  }
  raw.value = formatted.value;
  showToast('ok', '已格式化');
}
function doMinify() {
  if (!parsed.value.ok) {
    showToast('err', 'JSON 格式错误，无法压缩');
    return;
  }
  raw.value = minified.value;
  showToast('ok', `已压缩 · 节省 ${savedPct.value}%`);
}
function doEscape() {
  if (!parsed.value.ok) return;
  raw.value = JSON.stringify(raw.value);
  showToast('ok', '已转义为字符串');
}
function doUnescape() {
  if (!raw.value.trim()) return;
  try {
    const unescaped = JSON.parse(raw.value);
    if (typeof unescaped !== 'string') throw new Error('解析结果不是字符串');
    raw.value = unescaped;
    showToast('ok', '已取消转义');
  } catch {
    showToast('err', '无法解析为转义字符串');
  }
}
function doBase64Encode() {
  if (!raw.value) return;
  try {
    raw.value = btoa(unescape(encodeURIComponent(raw.value)));
    showToast('ok', '已 Base64 编码');
  } catch {
    showToast('err', 'Base64 编码失败');
  }
}
function doBase64Decode() {
  if (!raw.value) return;
  try {
    raw.value = decodeURIComponent(escape(atob(raw.value.trim())));
    showToast('ok', '已 Base64 解码');
  } catch {
    showToast('err', '无效的 Base64 文本');
  }
}
async function copyOutput(text: string) {
  if (!text) {
    showToast('err', '无可复制内容');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    window.setTimeout(() => (copied.value = false), 1400);
    showToast('ok', '已复制到剪贴板');
  } catch {
    showToast('err', '复制失败，请手动复制');
  }
}
function triggerFile() {
  fileInput.value?.click();
}
function onFilePicked(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  fileName.value = f.name;
  const reader = new FileReader();
  reader.onload = () => {
    raw.value = String(reader.result ?? '');
    showToast('ok', `已读取 ${f.name}`);
  };
  reader.onerror = () => showToast('err', '文件读取失败');
  reader.readAsText(f, 'utf8');
  if (fileInput.value) fileInput.value.value = '';
}
function downloadJson(content: string, suffix: string) {
  if (!content) return;
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const base = fileName.value ? fileName.value.replace(/\.json$/i, '') : 'data';
  const a = document.createElement('a');
  a.href = url;
  a.download = `${base}.${suffix}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('ok', '已下载');
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}
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
          <h1>JSON 工作台</h1>
          <p>本地处理 · 格式化 / 压缩 / 校检 / 转义 / Base64 · 全键盘可用</p>
        </div>
        <span class="pill-format">RFC 8259 · UTF-8</span>
      </div>
    </header>

    <main class="container-custom main-grid">
      <!-- ========= 左侧：设置卡 ========= -->
      <section class="glass-card card-settings">
        <div class="card-head">
          <h2>处理参数</h2>
          <span class="head-hint">立即生效</span>
        </div>

        <div class="field-row">
          <label class="field-label">缩进</label>
          <div class="seg">
            <button
              v-for="v in ['2', '4', 'tab'] as Indent[]"
              :key="v"
              class="seg-btn"
              :class="{ active: indent === v }"
              @click="indent = v"
              type="button"
            >
              {{ v === 'tab' ? 'Tab' : `${v } 空格` }}
            </button>
          </div>
        </div>

        <div class="field-row">
          <label class="field-label">键排序</label>
          <div class="seg">
            <button
              v-for="v in ['none', 'asc', 'desc'] as SortKey[]"
              :key="v"
              class="seg-btn"
              :class="{ active: sortKeys === v }"
              @click="sortKeys = v"
              type="button"
            >
              {{ v === 'none' ? '保持原样' : v === 'asc' ? 'A → Z' : 'Z → A' }}
            </button>
          </div>
        </div>

        <div class="field-row">
          <label class="field-label">Unicode 转义</label>
          <button
            class="switch"
            :class="{ on: escapeUnicode }"
            type="button"
            @click="escapeUnicode = !escapeUnicode"
            :aria-checked="escapeUnicode"
            role="switch"
          >
            <span class="knob"></span>
            <span class="switch-label">{{
              escapeUnicode ? '开启' : '关闭'
            }}</span>
          </button>
        </div>

        <div class="divider"></div>

        <div class="card-head">
          <h2>示例数据</h2>
          <span class="head-hint">点击加载</span>
        </div>
        <div class="samples">
          <button
            v-for="s in SAMPLES"
            :key="s.label"
            type="button"
            class="sample-btn"
            @click="loadSample(s.value)"
          >
            {{ s.label }}
          </button>
        </div>
      </section>

      <!-- ========= 中部：输入输出 ========= -->
      <section class="glass-card card-editor">
        <div class="editor-head">
          <div>
            <h2>原始 JSON</h2>
            <p v-if="parsed.ok" class="status status-ok">
              格式正确 · {{ stats.lines }} 行 · {{ fmtBytes(stats.bytes) }} ·
              深度 {{ stats.depth }} · {{ stats.nodes }} 节点
            </p>
            <p v-else class="status status-err">
              第 {{ parsed.error?.line }} 行 第
              {{ parsed.error?.column }} 列出错 · {{ parsed.error?.message }}
            </p>
          </div>
          <div class="btn-row">
            <button type="button" class="btn btn-ghost" @click="triggerFile">
              打开文件
            </button>
            <input
              ref="fileInput"
              type="file"
              accept=".json,.txt,application/json"
              style="display: none"
              @change="onFilePicked"
            />
            <button type="button" class="btn btn-ghost" @click="doClear">
              清空
            </button>
            <button
              type="button"
              class="btn btn-neon"
              :disabled="!raw.trim()"
              @click="doFormat"
            >
              格式化
            </button>
          </div>
        </div>
        <textarea
          v-model="raw"
          spellcheck="false"
          class="editor-textarea"
          :class="{ 'has-error': !parsed.ok && raw.trim() }"
          placeholder="在此粘贴或输入 JSON，例如 {&quot;name&quot;:&quot;Hey&quot;}"
        ></textarea>

        <div class="ops-row">
          <button
            type="button"
            class="op-btn"
            :disabled="!parsed.ok"
            @click="doMinify"
          >
            压缩为单行
          </button>
          <button
            type="button"
            class="op-btn"
            :disabled="!parsed.ok"
            @click="doEscape"
          >
            转义为字符串
          </button>
          <button type="button" class="op-btn" @click="doUnescape">
            取消转义
          </button>
          <button
            type="button"
            class="op-btn"
            :disabled="!raw"
            @click="doBase64Encode"
          >
            Base64 编码
          </button>
          <button
            type="button"
            class="op-btn"
            :disabled="!raw"
            @click="doBase64Decode"
          >
            Base64 解码
          </button>
        </div>
      </section>

      <!-- ========= 右侧：预览 + 统计 ========= -->
      <section class="glass-card card-preview">
        <div class="card-head">
          <h2>格式化预览</h2>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :disabled="!formatted"
            @click="copyOutput(formatted)"
          >
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>
        <textarea
          v-if="formatted"
          readonly
          class="preview-textarea"
          :value="formatted"
        ></textarea>
        <div v-else class="preview-empty">
          <p>在左侧输入合法 JSON 后，此处实时显示格式化结果</p>
        </div>

        <div class="divider"></div>

        <div class="card-head">
          <h2>压缩预览</h2>
          <div class="btn-row">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              :disabled="!minified"
              @click="copyOutput(minified)"
            >
              复制
            </button>
            <button
              type="button"
              class="btn btn-neon btn-sm"
              :disabled="!minified"
              @click="downloadJson(minified, 'min')"
            >
              下载
            </button>
          </div>
        </div>
        <div v-if="minified" class="min-box">
          <code
            >{{ minified.slice(0, 260)
            }}{{ minified.length > 260 ? '…' : '' }}</code
          >
          <div class="min-meta">
            <span>{{ fmtBytes(minifiedBytes) }}</span>
            <span class="chip-saved" v-if="savedPct > 0"
              >体积减少 {{ savedPct }}%</span
            >
            <span class="chip-saved chip-flat" v-else>体积不变</span>
          </div>
        </div>
        <div v-else class="preview-empty preview-empty-sm">
          <p>压缩后的单行 JSON 会显示在这里</p>
        </div>

        <div class="divider"></div>

        <div class="card-head">
          <h2>导出</h2>
        </div>
        <div class="btn-col">
          <button
            type="button"
            class="btn btn-ghost full"
            :disabled="!formatted"
            @click="downloadJson(formatted, 'pretty')"
          >
            下载格式化 JSON
          </button>
          <button
            type="button"
            class="btn btn-neon full"
            :disabled="!formatted"
            @click="downloadJson(minified, 'min')"
          >
            下载压缩 JSON
          </button>
        </div>
      </section>
    </main>

    <!-- ========= Toast ========= -->
    <transition name="toast-fade">
      <div v-if="toast" class="toast" :class="toast.type">
        {{ toast.text }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.tool-page {
  position: relative;
  min-height: 100vh;
  padding-top: 60px;
  padding-bottom: 80px;
  background: var(--color-bg-primary);
}

.topbar {
  position: sticky;
  top: 56px;
  z-index: 20;
  background: color-mix(in srgb, var(--color-bg-primary) 82%, transparent);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: saturate(180%) blur(14px);
  backdrop-filter: saturate(180%) blur(14px);
}

.topbar-inner {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  height: 54px;
}

.topbar-back {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  transition: all 0.2s ease;
}

.topbar-back:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.topbar-title h1 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
  letter-spacing: 0.02em;
}

.topbar-title p {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-align: center;
  opacity: 0.85;
}

.pill-format {
  padding: 6px 14px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-neon);
  letter-spacing: 0.02em;
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
}

.main-grid {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
  margin-top: 24px;
}

@media (max-width: 1120px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

.glass-card {
  padding: 22px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.card-head {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-head h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
}

.head-hint {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.divider {
  height: 1px;
  margin: 20px 0;
  background: var(--color-border);
  opacity: 0.85;
}

/* ====== 设置卡 ====== */
.field-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.field-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.seg {
  display: inline-flex;
  padding: 3px;
  background: var(--color-bg-elevated-2);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.seg-btn {
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
  transition: all 0.18s ease;
}

.seg-btn:hover {
  color: var(--color-text-primary);
}

.seg-btn.active {
  color: #0b0d0c;
  background: var(--color-neon);
}

.switch {
  --w: 68px;
  --h: 30px;

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: var(--w);
  height: var(--h);
  padding: 0 10px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-elevated-2);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  transition: all 0.2s ease;
}

.switch.on {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.switch .knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(var(--h) - 6px);
  height: calc(var(--h) - 6px);
  background: var(--color-text-secondary);
  border-radius: 50%;
  opacity: 0.8;
  transition: all 0.2s ease;
}

.switch.on .knob {
  left: calc(var(--w) - var(--h) + 3px);
  background: var(--color-neon);
  opacity: 1;
}

.switch-label {
  position: relative;
  z-index: 1;
  width: 100%;
  text-align: right;
}

.switch:not(.on) .switch-label {
  padding-left: calc(var(--h) - 2px);
  text-align: left;
}

.samples {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sample-btn {
  padding: 10px 14px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  background: var(--color-bg-elevated-2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.18s ease;
}

.sample-btn:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

/* ====== 编辑区 ====== */
.editor-head {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.editor-head h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
}

.status {
  margin: 6px 0 0;
  font-size: 0.76rem;
  font-weight: 600;
}

.status-ok {
  color: var(--color-neon);
}

.status-err {
  color: #fb7185;
}

.btn-row {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 16px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 10px;
  transition: all 0.18s ease;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.76rem;
  border-radius: 8px;
}

.btn.full {
  width: 100%;
}

.btn-ghost {
  color: var(--color-text-primary);
  background: var(--color-bg-elevated-2);
  border-color: var(--color-border);
}

.btn-ghost:hover:not(:disabled) {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
}

.btn-neon {
  color: #0b0d0c;
  background: var(--color-neon);
  border-color: transparent;
  box-shadow: 0 6px 24px -10px var(--color-neon);
}

.btn-neon:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.editor-textarea,
.preview-textarea {
  width: 100%;
  min-height: 420px;
  padding: 16px;
  font-family:
    'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  resize: vertical;
  outline: none;
  background: var(--color-bg-elevated-2);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.editor-textarea:focus,
.preview-textarea:focus {
  border-color: var(--color-neon-dim);
  box-shadow: 0 0 0 3px var(--color-neon-glow);
}

.editor-textarea.has-error {
  border-color: rgb(251 113 133 / 70%);
  box-shadow: 0 0 0 3px color-mix(in srgb, #fb7185 22%, transparent);
}

.preview-textarea {
  min-height: 260px;
}

.ops-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.op-btn {
  padding: 8px 14px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  transition: all 0.18s ease;
}

.op-btn:hover:not(:disabled) {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
  border-style: solid;
}

.op-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

/* ====== 预览卡 ====== */
.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  padding: 24px;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  text-align: center;
  background: var(--color-bg-elevated-2);
  border: 1px dashed var(--color-border);
  border-radius: 14px;
}

.preview-empty-sm {
  min-height: 110px;
}

.min-box {
  padding: 14px;
  background: var(--color-bg-elevated-2);
  border: 1px solid var(--color-border);
  border-radius: 14px;
}

.min-box code {
  display: block;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  line-height: 1.55;
  color: var(--color-text-primary);
  word-break: break-all;
}

.min-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.chip-saved {
  padding: 3px 10px;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
}

.chip-saved.chip-flat {
  color: var(--color-text-secondary);
  background: transparent;
  border-color: var(--color-border);
}

.btn-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ====== Toast ====== */
.toast {
  position: fixed;
  bottom: 42px;
  left: 50%;
  z-index: 100;
  padding: 10px 18px;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: 9999px;
  backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  transform: translateX(-50%);
}

.toast.ok {
  color: #0b0d0c;
  background: color-mix(in srgb, var(--color-neon) 92%, white);
  border: 1px solid var(--color-neon);
  box-shadow: 0 12px 40px -18px var(--color-neon);
}

.toast.err {
  color: #fff1f2;
  background: color-mix(in srgb, #fb7185 86%, transparent);
  border: 1px solid #fb7185;
  box-shadow: 0 12px 40px -18px #fb7185;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
