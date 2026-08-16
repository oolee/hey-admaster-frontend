<script setup lang="ts">
import { computed, ref } from 'vue';

const mode = ref<'image' | 'text'>('text');
const dragOver = ref(false);

// 文本模式
const rawText = ref('');
const b64Text = ref('');
const snippet = ref<'css' | 'html' | 'js' | 'md'>('html');

// 图片模式
type ImgData = {
  base64Only: string;
  dataUrl: string;
  fileSize: number;
  height: number;
  mime: string;
  width: number;
};
const imgData = ref<ImgData | null>(null);
const imgInput = ref<HTMLInputElement | null>(null);
const pastedB64 = ref('');
const restoredUrl = ref('');
const restoredMime = ref('image/png');

const b64Valid = computed(() => {
  if (!b64Text.value.trim()) return true;
  const s = b64Text.value.replaceAll(/\s+/g, '');
  return /^[A-Za-z0-9+/]*={0,2}$/.test(s) && s.length % 4 === 0;
});

const ratio = computed(() => {
  if (rawText.value.length === 0) return 0;
  const orig = utf8Bytes(rawText.value).length;
  const enc = b64Text.value.length;
  return orig ? Math.round(((enc - orig) / orig) * 100) : 0;
});

const previewDataUrl = computed(() => {
  if (!imgData.value) return '';
  const d = imgData.value.dataUrl;
  if (d.length <= 420) return d;
  return `${d.slice(0, 200)}\n... （中间省略） ...\n${d.slice(-200)}\n\n共 ${d.length} 字符，点击复制获取完整内容。`;
});

const snippetCode = computed(() => {
  if (!imgData.value) return '';
  const u = imgData.value.dataUrl;
  switch (snippet.value) {
    case 'css': {
      return `.bg {\n  background-image: url("${u}");\n  background-size: cover;\n}`;
    }
    case 'html': {
      return `<img src="${u}" alt="embedded" />`;
    }
    case 'js': {
      return `const img = new Image();\nimg.src = \`${u}\`;\ndocument.body.appendChild(img);`;
    }
    case 'md': {
      return `![embedded](${u})`;
    }
  }
});

function utf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function doEncode() {
  try {
    const bytes = utf8Bytes(rawText.value);
    // Uint8Array → binary string → btoa
    let bin = '';
    for (let i = 0; i < bytes.length; i++)
      bin += String.fromCodePoint(bytes[i]);
    b64Text.value = btoa(bin);
  } catch (error) {
    alert('编码失败：' + (error as Error).message);
  }
}

function doDecode() {
  try {
    const s = b64Text.value.replaceAll(/\s+/g, '');
    if (!s) {
      rawText.value = '';
      return;
    }
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4 !== 0) {
      alert('Base64 格式不合法（包含非法字符或长度不对）');
      return;
    }
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.codePointAt(i);
    rawText.value = utf8Decode(bytes);
  } catch (error) {
    alert('解码失败：' + (error as Error).message);
  }
}

function fillSample() {
  rawText.value = 'Hey 19 霓虹绿 · 2026 年 3 月 18 日 · 让 AI 重新定义创意 🚀';
  b64Text.value = '';
}

function wrapLines() {
  const s = b64Text.value.replaceAll(/\s+/g, '');
  const chunks: string[] = [];
  for (let i = 0; i < s.length; i += 76) chunks.push(s.slice(i, i + 76));
  b64Text.value = chunks.join('\n');
}

function unwrapLines() {
  b64Text.value = b64Text.value.replaceAll(/\s+/g, '');
}

function copyTxt(text: string) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(
    () => flash('已复制到剪贴板'),
    () => {
      // 兼容兜底
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      flash('已复制到剪贴板');
    },
  );
}

function downloadTxt(text: string, name: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

let _flashT = 0;
function flash(msg: string) {
  clearTimeout(_flashT);
  let el = document.querySelector('#__toast') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = '__toast';
    Object.assign(el.style, {
      position: 'fixed',
      left: '50%',
      bottom: '48px',
      transform: 'translateX(-50%)',
      background: 'var(--neon, #DFFE00)',
      color: '#0b0d0c',
      padding: '10px 18px',
      borderRadius: '10px',
      fontWeight: '800',
      fontSize: '13px',
      zIndex: '9999',
      boxShadow: '0 10px 30px rgba(0,0,0,.2)',
    });
    document.body.append(el);
  }
  el.textContent = msg;
  _flashT = window.setTimeout(() => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }, 1600);
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function onDropImage(e: DragEvent) {
  dragOver.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (f && f.type.startsWith('image/')) loadImageFile(f);
}

function onImageFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) loadImageFile(f);
}

function loadImageFile(file: File) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target?.result as string;
    const comma = dataUrl.indexOf(',');
    const base64Only = comma !== -1 ? dataUrl.slice(comma + 1) : dataUrl;
    const mime = file.type || 'image/png';
    const im = new Image();
    im.onload = () => {
      imgData.value = {
        mime,
        dataUrl,
        base64Only,
        width: im.naturalWidth,
        height: im.naturalHeight,
        fileSize: file.size,
      };
    };
    im.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function resetImage() {
  imgData.value = null;
  if (imgInput.value) imgInput.value.value = '';
}

function restoreImage() {
  let s = pastedB64.value.trim();
  if (!s) return;
  let mime = 'image/png';
  // 如果是 data URI
  const m = /^data:([\w.+-]+\/[\w.+-]+);base64,(.*)$/s.exec(s);
  if (m) {
    mime = m[1];
    s = m[2];
  } else {
    // 纯 base64，尝试从头部嗅探
    if (s.startsWith('/9j/')) mime = 'image/jpeg';
    else if (s.startsWith('iVBORw0KGgo')) mime = 'image/png';
    else if (s.startsWith('UklGR')) mime = 'image/webp';
    else if (s.startsWith('R0lGOD')) mime = 'image/gif';
    else if (
      s.startsWith('PHN2Zy') ||
      s.startsWith('PD94bWwg') ||
      s.startsWith('Cjw/') ||
      s.startsWith('PCFET0NUWVBFIHN2Z')
    )
      mime = 'image/svg+xml';
  }
  try {
    const bin = atob(s.replaceAll(/\s+/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.codePointAt(i);
    const blob = new Blob([bytes], { type: mime });
    if (restoredUrl.value) URL.revokeObjectURL(restoredUrl.value);
    restoredUrl.value = URL.createObjectURL(blob);
    restoredMime.value = mime;
    flash('还原成功');
  } catch (error) {
    alert('还原失败，可能不是合法 Base64：' + (error as Error).message);
  }
}

function downloadRestored() {
  if (!restoredUrl.value) return;
  const a = document.createElement('a');
  a.href = restoredUrl.value;
  const ext =
    restoredMime.value === 'image/jpeg'
      ? 'jpg'
      : restoredMime.value === 'image/png'
        ? 'png'
        : restoredMime.value === 'image/webp'
          ? 'webp'
          : restoredMime.value === 'image/gif'
            ? 'gif'
            : restoredMime.value === 'image/svg+xml'
              ? 'svg'
              : 'img';
  a.download = `restored.${Date.now()}.${ext}`;
  document.body.append(a);
  a.click();
  document.body.removeChild(a);
}
</script>

<template>
  <div class="tool-page">
    <div class="tool-topbar">
      <router-link to="/tools" class="back-btn">← 返回工具箱</router-link>
      <div class="tool-title-block">
        <h1 class="tool-title">Base64 编解码</h1>
        <p class="tool-subtitle">
          本地处理 · 文本 / 图片双模式 · UTF-8 安全 · 邮件嵌入 / CSS 背景 /
          数据传输一把梭
        </p>
      </div>
      <div class="filler"></div>
    </div>

    <div class="tool-body">
      <!-- 模式切换 -->
      <div class="glass-card">
        <h2 class="card-title">工作模式</h2>
        <div class="seg-row">
          <button
            class="seg-btn"
            :class="{ active: mode === 'text' }"
            @click="mode = 'text'"
          >
            文本编解码
          </button>
          <button
            class="seg-btn"
            :class="{ active: mode === 'image' }"
            @click="mode = 'image'"
          >
            图片 ↔ Base64
          </button>
        </div>
      </div>

      <!-- 文本模式 -->
      <template v-if="mode === 'text'">
        <div class="glass-card">
          <h2 class="card-title">
            原文
            <span class="stat-inline" v-if="rawText"
              >{{ rawText.length }} 字符 ·
              {{ utf8Bytes(rawText).length }} B</span
            >
          </h2>
          <textarea
            v-model="rawText"
            placeholder="在此输入或粘贴要编码的文本（支持中文 UTF-8），例如：Hey19 霓虹绿 2026"
            rows="7"
            spellcheck="false"
          ></textarea>
          <div class="action-row split">
            <div class="seg-row">
              <button class="seg-btn" @click="fillSample">填入示例</button>
              <button
                class="seg-btn"
                @click="
                  rawText = '';
                  b64Text = '';
                "
              >
                清空
              </button>
            </div>
            <div class="seg-row">
              <button
                class="seg-btn active"
                
                @click="doEncode"
              >
                → 编码 Base64
              </button>
              <button
                class="seg-btn active"
                
                @click="doDecode"
              >
                ← 解码为文本
              </button>
            </div>
          </div>
        </div>

        <div class="glass-card">
          <h2 class="card-title">
            Base64 结果
            <span class="stat-inline" v-if="b64Text"
              >{{ b64Text.length }} 字符 · 膨胀 {{ ratio }}%</span
            >
            <span class="chip-ok" v-if="b64Valid && b64Text">合法 Base64</span>
            <span class="chip-err" v-else-if="b64Text && !b64Valid"
              >解码将失败</span
            >
          </h2>
          <textarea
            v-model="b64Text"
            placeholder="在此输入或粘贴 Base64，点击左侧 ← 解码为文本"
            rows="7"
            spellcheck="false"
            class="mono"
          ></textarea>
          <div class="action-row split">
            <div class="seg-row">
              <button
                class="seg-btn"
                :disabled="!b64Text"
                @click="copyTxt(b64Text)"
              >
                复制
              </button>
              <button
                class="seg-btn"
                :disabled="!b64Text"
                @click="downloadTxt(b64Text, 'base64.txt')"
              >
                下载 .txt
              </button>
            </div>
            <div class="seg-row">
              <button class="seg-btn" :disabled="!b64Text" @click="wrapLines">
                按 76 列换行
              </button>
              <button class="seg-btn" :disabled="!b64Text" @click="unwrapLines">
                去除换行
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- 图片模式 -->
      <template v-else>
        <div class="glass-card">
          <h2 class="card-title">原始图片</h2>
          <div
            class="drop-zone"
            :class="{ active: dragOver, has: !!imgData }"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="onDropImage"
            @click="$refs.imgInput.click()"
          >
            <template v-if="!imgData">
              <div class="dz-title">拖拽图片到此 或 点击选择文件</div>
              <div class="dz-sub">
                支持 JPG / PNG / WebP / GIF / SVG 等 · 输出带 MIME 的 Data URI
              </div>
            </template>
            <template v-else>
              <img :src="imgData.dataUrl" alt="" @click.stop />
            </template>
            <input
              ref="imgInput"
              type="file"
              accept="image/*"
              @change="onImageFile"
              hidden
            />
          </div>

          <div class="info-strip" v-if="imgData">
            <div class="info-item">
              <span class="lbl">格式</span
              ><span class="val mono">{{ imgData.mime }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">尺寸</span
              ><span class="val"
                >{{ imgData.width }} × {{ imgData.height }}</span
              >
            </div>
            <div class="info-item">
              <span class="lbl">原始体积</span
              ><span class="val">{{ fmtBytes(imgData.fileSize) }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Base64 长度</span
              ><span class="val">{{ fmtBytes(imgData.dataUrl.length) }}</span>
            </div>
          </div>
        </div>

        <div class="glass-card" v-if="imgData">
          <h2 class="card-title">
            完整 Data URI
            <span class="stat-inline mono"
              >data:{{ imgData.mime }};base64,....</span
            >
          </h2>
          <div class="code-wrap">
            <pre class="code-block mono">{{ previewDataUrl }}</pre>
          </div>
          <div class="action-row">
            <button class="btn-primary" @click="copyTxt(imgData.dataUrl)">
              复制完整 Data URI
            </button>
            <button class="btn-ghost" @click="copyTxt(imgData.base64Only)">
              只复制纯 Base64
            </button>
          </div>

          <h3 class="card-subtitle">快速嵌入模板</h3>
          <div class="seg-row">
            <button
              class="seg-btn"
              :class="{ active: snippet === 'html' }"
              @click="snippet = 'html'"
            >
              HTML &lt;img&gt;
            </button>
            <button
              class="seg-btn"
              :class="{ active: snippet === 'css' }"
              @click="snippet = 'css'"
            >
              CSS background
            </button>
            <button
              class="seg-btn"
              :class="{ active: snippet === 'md' }"
              @click="snippet = 'md'"
            >
              Markdown
            </button>
            <button
              class="seg-btn"
              :class="{ active: snippet === 'js' }"
              @click="snippet = 'js'"
            >
              JS Image src
            </button>
          </div>
          <div class="code-wrap small">
            <pre class="code-block mono">{{ snippetCode }}</pre>
          </div>
          <div class="action-row">
            <button class="btn-ghost" @click="copyTxt(snippetCode)">
              复制模板代码
            </button>
            <button class="btn-ghost" @click="resetImage">换一张</button>
          </div>
        </div>

        <div class="glass-card">
          <h2 class="card-title">从 Base64 还原图片</h2>
          <textarea
            v-model="pastedB64"
            placeholder="粘贴 Data URI（data:image/...;base64,XXXX）或纯 Base64 字符串，自动识别还原"
            rows="5"
            spellcheck="false"
            class="mono"
          ></textarea>
          <div class="action-row">
            <button
              class="btn-primary"
              :disabled="!pastedB64.trim()"
              @click="restoreImage"
            >
              还原并预览
            </button>
            <button class="btn-ghost" @click="pastedB64 = ''">清空</button>
          </div>
          <div class="preview-stage" v-if="restoredUrl">
            <img :src="restoredUrl" alt="" class="stage-img" />
          </div>
          <div class="action-row" v-if="restoredUrl">
            <button class="btn-ghost" @click="downloadRestored">
              下载还原图片
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tool-page {
  padding-top: 60px;
  padding-bottom: 64px;
}

.tool-topbar {
  position: sticky;
  top: 56px;
  z-index: 10;
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 14px 28px;
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  backdrop-filter: blur(18px);
}

.back-btn {
  padding: 8px 14px;
  font-size: 13px;
  color: var(--color-text-primary);
  white-space: nowrap;
  text-decoration: none;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  transition: all 0.2s;
}

.back-btn:hover {
  color: var(--neon);
  border-color: var(--neon);
}

.tool-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.tool-subtitle {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  opacity: 0.9;
}

.filler {
  flex: 1;
}

.tool-body {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
  max-width: 1440px;
  padding: 24px 28px 0;
  margin: 0 auto;
}

.glass-card {
  grid-column: span 12;
  padding: 22px 24px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  backdrop-filter: blur(18px);
}

@media (min-width: 960px) {
  body[data-mode='text'] .glass-card:nth-of-type(2) {
    grid-column: span 6;
  }

  body[data-mode='text'] .glass-card:nth-of-type(3) {
    grid-column: span 6;
  }
}

.card-title {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.card-subtitle {
  margin: 18px 0 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat-inline {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  opacity: 0.9;
}

.chip-ok {
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 800;
  color: #30d158;
  background: color-mix(in srgb, #34c759 15%, transparent);
  border: 1px solid color-mix(in srgb, #34c759 40%, transparent);
  border-radius: 999px;
}

.chip-err {
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 800;
  color: #ff453a;
  background: color-mix(in srgb, #ff3b30 15%, transparent);
  border: 1px solid color-mix(in srgb, #ff3b30 40%, transparent);
  border-radius: 999px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--color-text-primary);
  resize: vertical;
  outline: none;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  transition: border-color 0.15s;
}

textarea:focus {
  border-color: var(--neon);
}

.code-wrap {
  overflow: hidden;
  background: color-mix(in srgb, #000 14%, var(--glass-bg));
  border: 1px solid var(--glass-border);
  border-radius: 12px;
}

.code-wrap.small {
  max-height: 220px;
}

.code-block {
  max-height: 320px;
  padding: 14px 16px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-primary);
  word-break: break-all;
  white-space: pre-wrap;
}

.seg-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.seg-btn {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  transition: all 0.15s;
}

.seg-btn:hover:not(:disabled) {
  border-color: var(--neon);
}

.seg-btn.active {
  color: #0b0d0c;
  background: var(--neon);
  border-color: var(--neon);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--neon) 20%, transparent);
}

.seg-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.action-row.split {
  justify-content: space-between;
}

.btn-primary {
  padding: 11px 20px;
  font-size: 14px;
  font-weight: 800;
  color: #0b0d0c;
  cursor: pointer;
  background: var(--neon);
  border: 1px solid var(--neon);
  border-radius: 12px;
  box-shadow: 0 6px 20px color-mix(in srgb, var(--neon) 28%, transparent);
  transition: all 0.15s;
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 10px 28px color-mix(in srgb, var(--neon) 35%, transparent);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-ghost {
  padding: 11px 18px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  transition: all 0.15s;
}

.btn-ghost:hover:not(:disabled) {
  color: var(--neon);
  border-color: var(--neon);
}

.btn-ghost:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 18px;
  text-align: center;
  cursor: pointer;
  border: 2px dashed var(--glass-border);
  border-radius: 16px;
  transition: all 0.2s;
}

.drop-zone:hover {
  border-color: var(--neon);
}

.drop-zone.active {
  background: color-mix(in srgb, var(--neon) 6%, transparent);
  border-color: var(--neon);
}

.drop-zone.has img {
  max-width: 100%;
  max-height: 260px;
  object-fit: contain;
  border-radius: 10px;
}

.dz-title {
  font-size: 15px;
  font-weight: 700;
}

.dz-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  opacity: 0.9;
}

.info-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 12px 14px;
  margin-top: 14px;
  background: color-mix(in srgb, var(--neon) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--neon) 22%, transparent);
  border-radius: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-item .lbl {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.info-item .val {
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 720px) {
  .info-strip {
    grid-template-columns: 1fr 1fr;
  }
}

.preview-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 180px;
  padding: 12px;
  margin-top: 14px;
  background:
    linear-gradient(45deg, rgb(127 127 127 / 12%) 25%, transparent 25%),
    linear-gradient(-45deg, rgb(127 127 127 / 12%) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgb(127 127 127 / 12%) 75%),
    linear-gradient(-45deg, transparent 75%, rgb(127 127 127 / 12%) 75%);
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
  background-size: 20px 20px;
  border-radius: 14px;
}

.stage-img {
  max-width: 100%;
  max-height: 420px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgb(0 0 0 / 20%);
}
</style>
