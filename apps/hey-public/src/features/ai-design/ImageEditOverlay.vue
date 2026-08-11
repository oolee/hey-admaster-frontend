<script setup lang="ts">
import type { AiGeneratedImage, RefImage } from '#/store/aiDesignStore';

import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  image: AiGeneratedImage | null;
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  submit: [
    payload: {
      mask: null | RefImage;
      prompt: string;
      referenceImage: RefImage;
    },
  ];
}>();

/** 标注工具：矩形 / 画笔 */
type Tool = 'brush' | 'rect';
const tool = ref<Tool>('rect');
const prompt = ref('');
const submitting = ref(false);
const error = ref('');
const drawing = ref(false);
const startPoint = ref<null | { x: number; y: number }>(null);

const canvasRef = ref<HTMLCanvasElement>();
const imgRef = ref<HTMLImageElement>();

/** 图片自然尺寸（像素）与显示尺寸（CSS px） */
const natural = ref({ width: 0, height: 0 });
const display = ref({ width: 0, height: 0 });
const imgLoaded = ref(false);

/**
 * 单个标注区域：
 * - rect：x/y/w/h（显示坐标）
 * - stroke：points 轨迹（显示坐标）
 * - note：该区域修改要求；appended：已汇总到整体提示词中的文本段（用于编辑时替换）
 */
interface MarkOp {
  id: number;
  kind: 'rect' | 'stroke';
  x: number;
  y: number;
  w: number;
  h: number;
  points: { x: number; y: number }[];
  note: string;
  appended: string;
  /** 气泡被拖动后的位置（显示坐标，null 表示使用默认位置） */
  bubblePos: null | { x: number; y: number };
}

const ops = ref<MarkOp[]>([]);
let nextOpId = 1;
/** 正在编辑要求的标注 id（对应气泡输入框） */
const editingNoteId = ref<null | number>(null);
const noteDraft = ref('');
const noteInputRef = ref<HTMLTextAreaElement>();
/** 当前手势创建的标注（画笔在首次移动时创建；矩形在抬笔时创建） */
let activeStrokeId: null | number = null;

const BRUSH_SIZE = 22;

function getPos(e: PointerEvent): { x: number; y: number } {
  const canvas = canvasRef.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function drawOp(ctx: CanvasRenderingContext2D, op: MarkOp) {
  ctx.save();
  if (op.kind === 'rect') {
    ctx.fillStyle = 'rgba(255, 200, 60, 0.26)';
    ctx.strokeStyle = 'rgba(255, 200, 60, 0.95)';
    ctx.lineWidth = 2;
    ctx.fillRect(op.x, op.y, op.w, op.h);
    ctx.strokeRect(op.x, op.y, op.w, op.h);
  } else {
    ctx.strokeStyle = 'rgba(255, 200, 60, 0.32)';
    ctx.lineWidth = BRUSH_SIZE;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    op.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }
  ctx.restore();
}

function redraw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const op of ops.value) drawOp(ctx, op);
  if (drawing.value && startPoint.value) {
    // 矩形拖拽预览
    const s = startPoint.value;
    const pos = lastPointer.value;
    if (pos && tool.value === 'rect') {
      drawOp(ctx, {
        id: 0,
        kind: 'rect',
        x: Math.min(s.x, pos.x),
        y: Math.min(s.y, pos.y),
        w: Math.abs(pos.x - s.x),
        h: Math.abs(pos.y - s.y),
        points: [],
        note: '',
        appended: '',
        bubblePos: null,
      });
    }
  }
}

const lastPointer = ref<null | { x: number; y: number }>(null);

function onPointerDown(e: PointerEvent) {
  if (!imgLoaded.value) return;
  drawing.value = true;
  const pos = getPos(e);
  startPoint.value = pos;
  lastPointer.value = pos;
  activeStrokeId = null;
  canvasRef.value?.setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!drawing.value) return;
  const pos = getPos(e);
  lastPointer.value = pos;
  if (tool.value === 'brush') {
    const canvas = canvasRef.value;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const last = ops.value.at(-1);
    if (last && last.kind === 'stroke') {
      last.points.push(pos);
      activeStrokeId = last.id;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 200, 60, 0.32)';
      ctx.lineWidth = BRUSH_SIZE;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const p1 = last.points.at(-2);
      if (p1) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      const id = nextOpId++;
      activeStrokeId = id;
      ops.value.push({
        id,
        kind: 'stroke',
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        points: [pos],
        note: '',
        appended: '',
        bubblePos: null,
      });
    }
  } else {
    redraw();
  }
}

function onPointerUp() {
  if (!drawing.value) return;
  drawing.value = false;
  let createdId: null | number = null;
  if (tool.value === 'rect' && startPoint.value) {
    const s = startPoint.value;
    const pos = lastPointer.value;
    if (pos && (Math.abs(pos.x - s.x) > 4 || Math.abs(pos.y - s.y) > 4)) {
      const id = nextOpId++;
      ops.value.push({
        id,
        kind: 'rect',
        x: Math.min(s.x, pos.x),
        y: Math.min(s.y, pos.y),
        w: Math.abs(pos.x - s.x),
        h: Math.abs(pos.y - s.y),
        points: [],
        note: '',
        appended: '',
        bubblePos: null,
      });
      createdId = id;
    }
  } else if (tool.value === 'brush') {
    createdId = activeStrokeId;
  }
  startPoint.value = null;
  lastPointer.value = null;
  activeStrokeId = null;
  redraw();
  // 标注完成后弹出编号气泡，填写该区域的修改要求
  if (createdId !== null) openNoteForOp(createdId);
}

function setTool(t: Tool) {
  tool.value = t;
}

/** 标注区域边界（显示坐标） */
function opBounds(op: MarkOp): { h: number; w: number; x: number; y: number } {
  if (op.kind === 'rect') return { x: op.x, y: op.y, w: op.w, h: op.h };
  const pts = op.points;
  if (pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

/** 编号徽标位置（区域左上角） */
function badgeStyle(op: MarkOp) {
  const b = opBounds(op);
  return {
    left: `${Math.max(2, b.x - 7)}px`,
    top: `${Math.max(2, b.y - 7)}px`,
  };
}

/** 画布在视口中的位置（气泡用视口坐标，便于拖出图片区域） */
function stageViewportRect() {
  const canvas = canvasRef.value;
  return canvas?.getBoundingClientRect() ?? { left: 0, top: 0 };
}

/** 气泡默认位置：优先放在区域右上方，越界时翻转到左侧，并收敛到视口内 */
function computeBubblePos(op: MarkOp): { x: number; y: number } {
  const rect = stageViewportRect();
  const b = opBounds(op);
  const bw = 250;
  let left = rect.left + b.x + b.w + 10;
  if (left + bw > window.innerWidth) left = rect.left + b.x - bw - 10;
  left = Math.max(6, Math.min(left, Math.max(6, window.innerWidth - bw - 6)));
  let top = rect.top + b.y - 56;
  top = Math.max(6, Math.min(top, Math.max(6, window.innerHeight - 170)));
  return { x: left, y: top };
}

/** 气泡位置：拖动后使用记忆位置（视口坐标），否则使用默认位置。
 * 允许拖出图片区域，仅收敛到视口边缘，便于不遮挡画面。 */
function bubbleStyle(op: MarkOp) {
  const pos = op.bubblePos ?? computeBubblePos(op);
  const bw = 250;
  const x = Math.max(4, Math.min(pos.x, window.innerWidth - bw - 4));
  const y = Math.max(4, Math.min(pos.y, window.innerHeight - 170));
  return { left: `${x}px`, top: `${y}px` };
}

/** 按住气泡标题拖动，可自由移动气泡位置 */
function startDragNote(e: PointerEvent, op: MarkOp) {
  e.preventDefault();
  if (editingNoteId.value !== op.id) return;
  // 点击气泡内按钮（如关闭）时不触发拖动
  if ((e.target as HTMLElement)?.closest('button')) return;
  const startX = e.clientX;
  const startY = e.clientY;
  const orig = op.bubblePos ? { ...op.bubblePos } : computeBubblePos(op);
  op.bubblePos = orig;
  const onMove = (ev: PointerEvent) => {
    op.bubblePos = {
      x: orig.x + (ev.clientX - startX),
      y: orig.y + (ev.clientY - startY),
    };
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

/** 打开某标注的编号气泡（新建或点击编号徽标重新编辑） */
function openNoteForOp(id: number) {
  const op = ops.value.find((o) => o.id === id);
  if (!op) return;
  editingNoteId.value = id;
  noteDraft.value = op.note;
  nextTick(() => noteInputRef.value?.focus());
}

/** 按标注顺序把各区域要求以逗号拼接，重建整体提示词（保留手动输入的基础部分） */
function syncPrompt() {
  let base = prompt.value;
  for (const op of ops.value) {
    if (op.appended) base = base.replace(op.appended, '');
  }
  base = base
    .replaceAll(/，+/g, '，')
    .replaceAll(/^，|，$/g, '')
    .trim();
  const segments: string[] = [];
  for (const op of ops.value) {
    op.appended = op.note ? `标注${ops.value.indexOf(op) + 1}：${op.note}` : '';
    if (op.appended) segments.push(op.appended);
  }
  prompt.value =
    segments.length > 0
      ? base
        ? `${base}，${segments.join('，')}`
        : segments.join('，')
      : base;
}

/** 确认：把该区域的修改要求汇总到下方整体提示词（标注1：…，标注2：…，逗号分隔） */
function confirmNote() {
  if (editingNoteId.value === null) return;
  const id = editingNoteId.value;
  editingNoteId.value = null;
  const op = ops.value.find((o) => o.id === id);
  if (!op) return;
  op.note = noteDraft.value.trim();
  noteDraft.value = '';
  syncPrompt();
}
/** 取消：保留标注区域，但不填写/不更新要求 */
function cancelNote() {
  editingNoteId.value = null;
  noteDraft.value = '';
}

/** 删除单个标注（按编号气泡内的「删除此标注」触发，不要求按顺序） */
function removeOp(id: number) {
  const idx = ops.value.findIndex((o) => o.id === id);
  if (idx === -1) return;
  ops.value.splice(idx, 1);
  if (editingNoteId.value === id) {
    editingNoteId.value = null;
    noteDraft.value = '';
  }
  syncPrompt();
  redraw();
}

function undo() {
  const op = ops.value.pop();
  if (op && editingNoteId.value === op.id) {
    editingNoteId.value = null;
    noteDraft.value = '';
  }
  syncPrompt();
  redraw();
}

function clearAll() {
  ops.value = [];
  editingNoteId.value = null;
  noteDraft.value = '';
  syncPrompt();
  redraw();
}

function onImgLoad() {
  const img = imgRef.value;
  if (!img) return;
  natural.value = { width: img.naturalWidth, height: img.naturalHeight };
  // 尽可能多显示图片：减去顶栏与底部整体要求框的占用空间（提示条已悬浮定位，不占布局空间）
  const maxW = window.innerWidth * 0.92;
  const maxH = Math.max(220, window.innerHeight - 270);
  const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
  display.value = {
    width: Math.max(1, Math.round(img.naturalWidth * scale)),
    height: Math.max(1, Math.round(img.naturalHeight * scale)),
  };
  const canvas = canvasRef.value;
  if (canvas) {
    canvas.width = display.value.width;
    canvas.height = display.value.height;
  }
  imgLoaded.value = true;
  redraw();
}

/**
 * 生成蒙版 PNG（与图片同尺寸，透明区域为重绘区域）：
 * 官方 /images/edits 语义 —— mask 中完全透明的区域表示需要编辑的区域，
 * 不透明区域保持原样。用户在图上标注的区域将写入透明（alpha=0）。
 */
function buildMaskDataUrl(): null | string {
  if (ops.value.length === 0) return null;
  const w = natural.value.width;
  const h = natural.value.height;
  if (!w || !h) return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  // 默认不透明（保持原样）
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  ctx.fillRect(0, 0, w, h);
  const sx = w / display.value.width;
  const sy = h / display.value.height;
  ctx.globalCompositeOperation = 'destination-out';
  for (const op of ops.value) {
    if (op.kind === 'rect') {
      ctx.clearRect(op.x * sx, op.y * sy, op.w * sx, op.h * sy);
    } else {
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      ctx.lineWidth = BRUSH_SIZE * ((sx + sy) / 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      op.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x * sx, p.y * sy);
        else ctx.lineTo(p.x * sx, p.y * sy);
      });
      ctx.stroke();
    }
  }
  return canvas.toDataURL('image/png');
}

/** 将签名 URL 转 dataUrl（作为编辑源图传给后端） */
async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('获取原图失败，请重试');
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string));
    reader.addEventListener('error', () => reject(new Error('读取原图失败')));
    reader.readAsDataURL(blob);
  });
}

async function handleSubmit() {
  const text = prompt.value.trim();
  if (!text || submitting.value || !props.image) return;
  submitting.value = true;
  error.value = '';
  try {
    const sourceDataUrl = await urlToDataUrl(props.image.url);
    const maskDataUrl = buildMaskDataUrl();
    const stamp = Date.now();
    emit('submit', {
      prompt: text,
      referenceImage: {
        id: `edit-src-${stamp}`,
        dataUrl: sourceDataUrl,
        fileName: `edit-src-${stamp}.png`,
        label: '编辑原图',
        tag: 'edit-source',
      },
      mask: maskDataUrl
        ? {
            id: `mask-${stamp}`,
            dataUrl: maskDataUrl,
            fileName: `mask-${stamp}.png`,
            label: '修改区域蒙版',
            tag: 'mask',
          }
        : null,
    });
  } catch (error) {
    error.value = error instanceof Error ? error.message : '提交失败，请重试';
  } finally {
    submitting.value = false;
  }
}

function resetState() {
  prompt.value = '';
  error.value = '';
  ops.value = [];
  editingNoteId.value = null;
  noteDraft.value = '';
  drawing.value = false;
  startPoint.value = null;
  lastPointer.value = null;
  activeStrokeId = null;
  imgLoaded.value = false;
  tool.value = 'rect';
}

watch(
  () => props.visible,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : '';
    if (v) {
      resetState();
      nextTick(() => {
        // 图片可能已缓存，onload 不会触发：显式同步一次
        const img = imgRef.value;
        if (img && img.complete && img.naturalWidth > 0) onImgLoad();
      });
    }
  },
);

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) emit('close');
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div v-if="visible && image" class="edit-overlay">
      <!-- 顶部栏 -->
      <div class="edit-topbar">
        <div class="edit-title">局部修改 — {{ image.title }}</div>
        <button class="edit-close" title="关闭" @click="emit('close')">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 右上角标注工具 -->
      <div class="edit-tools">
        <button
          class="edit-tool-btn"
          :class="{ active: tool === 'rect' }"
          @click="setTool('rect')"
          title="矩形标注：拖拽框选需要修改的区域"
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect
              x="4"
              y="4"
              width="16"
              height="16"
              rx="1.5"
              stroke-dasharray="3 2"
            />
          </svg>
          矩形
        </button>
        <button
          class="edit-tool-btn"
          :class="{ active: tool === 'brush' }"
          @click="setTool('brush')"
          title="画笔标注：涂抹需要修改的区域"
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          画笔
        </button>
        <span class="edit-tools-sep"></span>
        <button
          class="edit-tool-btn"
          :disabled="ops.length === 0"
          @click="undo"
        >
          撤销
        </button>
        <button
          class="edit-tool-btn"
          :disabled="ops.length === 0"
          @click="clearAll"
        >
          清空
        </button>
      </div>

      <!-- 操作提示：移到图片之外，暗红警示色 -->
      <div class="edit-stage-hint">
        标注区域，在编号气泡中填写修改要求，确认后自动汇总到下方；气泡可拖出图片区域
      </div>

      <!-- 图片 + 标注画布 + 编号徽标（裁剪容器内） -->
      <div
        class="edit-stage"
        :style="{
          width: `${display.width}px`,
          height: `${display.height}px`,
        }"
      >
        <div class="edit-stage-clip">
          <img
            ref="imgRef"
            :src="image.url"
            :alt="image.title"
            class="edit-img"
            @load="onImgLoad"
          />
          <canvas
            ref="canvasRef"
            class="edit-canvas"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          ></canvas>
          <template v-for="(op, index) in ops" :key="op.id">
            <!-- 编号徽标：点击可重新编辑该区域要求 -->
            <span
              class="mark-badge"
              :class="{ editing: editingNoteId === op.id }"
              :style="badgeStyle(op)"
              @mousedown.stop
              @click.stop="openNoteForOp(op.id)"
              :title="
                op.note
                  ? `标注${index + 1}：${op.note}`
                  : `标注${index + 1}（未填写要求）`
              "
              >{{ index + 1 }}</span
            >
          </template>
        </div>

        <!-- 编号气泡：视口坐标，可拖出图片区域，支持删除单个标注 -->
        <template v-for="(op, index) in ops" :key="op.id">
          <div
            v-if="editingNoteId === op.id"
            class="mark-bubble"
            :style="bubbleStyle(op)"
            @mousedown.stop
            @click.stop
          >
            <div
              class="mark-bubble-head"
              title="按住拖动可移动气泡"
              @pointerdown="startDragNote($event, op)"
            >
              <span class="mark-bubble-num">标注{{ index + 1 }}</span>
              <button
                class="mark-bubble-close"
                title="取消"
                @click="cancelNote"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <textarea
              ref="noteInputRef"
              v-model="noteDraft"
              class="mark-bubble-input"
              rows="2"
              placeholder="输入该区域的修改要求，回车确认"
              @keydown.enter.stop.prevent="confirmNote"
              @keydown.esc.stop="cancelNote"
            ></textarea>
            <div class="mark-bubble-actions">
              <button class="mark-bubble-del" @click="removeOp(op.id)">
                删除此标注
              </button>
              <button class="mark-bubble-ok" @click="confirmNote">确定</button>
            </div>
          </div>
        </template>
      </div>

      <!-- 底部整体要求框 -->
      <div class="edit-footer">
        <textarea
          v-model="prompt"
          class="edit-textarea"
          rows="3"
          placeholder="整体修改要求：各区域标注要求会自动汇总到这里，也可手动补充全局修改说明…"
        ></textarea>
        <div class="edit-footer-actions">
          <span class="edit-count">
            {{
              ops.length > 0
                ? `已标注 ${ops.length} 个区域`
                : '未标注区域（整图重绘）'
            }}
          </span>
          <span v-if="error" class="edit-error">{{ error }}</span>
          <button class="edit-cancel" @click="emit('close')">取消</button>
          <button
            class="edit-submit"
            :disabled="!prompt.trim() || submitting"
            @click="handleSubmit"
          >
            {{ submitting ? '提交中…' : '生成修改' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.edit-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgb(8 10 14 / 96%);
  backdrop-filter: blur(16px);
}

.edit-topbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px 24px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.edit-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
}

.edit-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  color: rgb(255 255 255 / 70%);
  cursor: pointer;
  background: rgb(255 255 255 / 8%);
  border: none;
  border-radius: 50%;
  transition: all 0.2s;
}

.edit-close:hover {
  color: #fff;
  background: rgb(255 255 255 / 16%);
}

/* ── 标注工具（右上角） ── */
.edit-tools {
  position: absolute;
  top: 76px;
  right: 24px;
  z-index: 20;
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px;
  background: rgb(255 255 255 / 8%);
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 12px;
  backdrop-filter: blur(12px);
}

.edit-tool-btn {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 7px 10px;
  font-size: 0.76rem;
  font-weight: 600;
  color: rgb(255 255 255 / 78%);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 8px;
  transition: all 0.15s;
}

.edit-tool-btn:hover:not(:disabled) {
  color: #fff;
  background: rgb(255 255 255 / 12%);
}

.edit-tool-btn.active {
  color: #101418;
  background: var(--color-neon, #d4ff3f);
}

.edit-tool-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.edit-tools-sep {
  width: 1px;
  height: 18px;
  background: rgb(255 255 255 / 12%);
}

/* ── 图片舞台 ── */
.edit-stage {
  position: relative;
  flex-shrink: 0;
  margin-top: 16px;

  /* 允许标注气泡拖出图片区域：裁剪只作用于图片/画布/徽标所在的 clip 容器 */
  overflow: visible;
  border-radius: 14px;
  box-shadow: 0 24px 80px rgb(0 0 0 / 55%);
}

.edit-stage-clip {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 14px;
}

.edit-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.edit-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}

/* ── 编号徽标 ── */
.mark-badge {
  position: absolute;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 0.7rem;
  font-weight: 800;
  color: #101418;
  cursor: pointer;
  background: var(--color-neon, #d4ff3f);
  border: 2px solid rgb(255 255 255 / 85%);
  border-radius: 50%;
  box-shadow: 0 2px 10px rgb(0 0 0 / 45%);
  transition: transform 0.15s;
}

.mark-badge:hover,
.mark-badge.editing {
  transform: scale(1.15);
}

/* ── 编号气泡 ── */
.mark-bubble {
  position: fixed;
  z-index: 40;
  width: 250px;
  padding: 10px 10px 8px;
  background: rgb(18 22 30 / 96%);
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 12px;
  box-shadow: 0 12px 36px rgb(0 0 0 / 55%);
  backdrop-filter: blur(12px);
}

.mark-bubble-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  touch-action: none;
  cursor: grab;
  user-select: none;
}

.mark-bubble-head:active {
  cursor: grabbing;
}

.mark-bubble-num {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-neon, #d4ff3f);
}

.mark-bubble-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: rgb(255 255 255 / 55%);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 5px;
}

.mark-bubble-close:hover {
  color: #fff;
  background: rgb(255 255 255 / 10%);
}

.mark-bubble-input {
  width: 100%;
  padding: 8px 10px;
  font-size: 0.78rem;
  line-height: 1.5;
  color: #fff;
  resize: none;
  outline: none;
  background: rgb(0 0 0 / 35%);
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 8px;
}

.mark-bubble-input:focus {
  border-color: var(--color-neon, #d4ff3f);
}

.mark-bubble-input::placeholder {
  color: rgb(255 255 255 / 35%);
}

.mark-bubble-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  margin-top: 8px;
}

.mark-bubble-del {
  padding: 5px 12px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #e0665e;
  cursor: pointer;
  background: rgb(224 102 94 / 10%);
  border: 1px solid rgb(224 102 94 / 40%);
  border-radius: 8px;
  transition: all 0.15s;
}

.mark-bubble-del:hover {
  color: #fff;
  background: rgb(192 57 43 / 80%);
  border-color: rgb(192 57 43 / 80%);
}

.mark-bubble-ok {
  padding: 5px 14px;
  font-size: 0.74rem;
  font-weight: 700;
  color: #101418;
  cursor: pointer;
  background: var(--color-neon, #d4ff3f);
  border: none;
  border-radius: 8px;
  transition: all 0.15s;
}

.mark-bubble-ok:hover {
  filter: brightness(1.08);
}

.edit-stage-hint {
  position: absolute;
  top: 132px;
  right: 24px;
  z-index: 21;
  padding: 6px 14px;
  font-size: 0.72rem;
  color: #e0665e;
  white-space: nowrap;
  background: rgb(192 57 43 / 16%);
  border: 1px solid rgb(224 102 94 / 35%);
  border-radius: 999px;
}

/* ── 底部整体要求框 ── */
.edit-footer {
  width: min(720px, 92vw);
  padding: 14px;
  margin-top: 20px;
  background: rgb(255 255 255 / 7%);
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 16px;
  backdrop-filter: blur(14px);
}

.edit-textarea {
  width: 100%;
  padding: 12px 14px;
  font-size: 0.86rem;
  line-height: 1.55;
  color: #fff;
  resize: none;
  outline: none;
  background: rgb(0 0 0 / 30%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 10px;
  transition: border-color 0.2s;
}

.edit-textarea:focus {
  border-color: var(--color-neon, #d4ff3f);
}

.edit-textarea::placeholder {
  color: rgb(255 255 255 / 35%);
}

.edit-footer-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 12px;
}

.edit-count {
  flex: 1;
  font-size: 0.72rem;
  color: rgb(255 255 255 / 45%);
}

.edit-error {
  font-size: 0.74rem;
  color: #ff7a7a;
}

.edit-cancel {
  padding: 9px 18px;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgb(255 255 255 / 78%);
  cursor: pointer;
  background: rgb(255 255 255 / 8%);
  border: none;
  border-radius: 10px;
  transition: all 0.2s;
}

.edit-cancel:hover {
  color: #fff;
  background: rgb(255 255 255 / 14%);
}

.edit-submit {
  padding: 9px 22px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #101418;
  cursor: pointer;
  background: var(--color-neon, #d4ff3f);
  border: none;
  border-radius: 10px;
  transition: all 0.2s;
}

.edit-submit:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.edit-submit:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>
