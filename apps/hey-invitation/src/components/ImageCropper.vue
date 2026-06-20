<template>
  <div v-if="visible" class="cropper-overlay" @click.self="emit('close')">
    <div class="cropper-modal">
      <div class="cropper-header">
        <h5><i class="bi bi-crop"></i> 图片裁切</h5>
        <button class="btn-close" @click="emit('close')"></button>
      </div>

      <div class="cropper-main">
        <!-- left: preview (2/3) -->
        <div class="cropper-preview" ref="previewRef">
          <div class="cropper-stage" ref="stageRef">
            <img
              ref="imgRef"
              :src="imageUrl"
              class="cropper-image"
              :style="imgStyle"
              @load="onImgLoad"
              draggable="false"
            />
            <!-- dim overlay: 4 rects -->
            <div v-if="ready" class="cropper-dim">
              <div :style="dimTop"></div>
              <div :style="dimBottom"></div>
              <div :style="dimLeft"></div>
              <div :style="dimRight"></div>
            </div>
            <!-- shape preview overlay -->
            <div v-if="ready && shapeCrop !== 'none'" :style="shapePreviewStyle" class="cropper-shape-preview"></div>
            <!-- crop frame -->
            <div
              v-if="ready"
              class="cropper-frame"
              :style="frameStyle"
              @mousedown.prevent="onFrameMDown"
            >
              <!-- corner handles -->
              <div class="cr-h cr-nw" @mousedown.stop.prevent="onHandle('nw',$event)"></div>
              <div class="cr-h cr-ne" @mousedown.stop.prevent="onHandle('ne',$event)"></div>
              <div class="cr-h cr-sw" @mousedown.stop.prevent="onHandle('sw',$event)"></div>
              <div class="cr-h cr-se" @mousedown.stop.prevent="onHandle('se',$event)"></div>
              <!-- edges -->
              <template v-if="ratio === 'free'">
                <div class="cr-h cr-n" @mousedown.stop.prevent="onHandle('n',$event)"></div>
                <div class="cr-h cr-s" @mousedown.stop.prevent="onHandle('s',$event)"></div>
                <div class="cr-h cr-e" @mousedown.stop.prevent="onHandle('e',$event)"></div>
                <div class="cr-h cr-w" @mousedown.stop.prevent="onHandle('w',$event)"></div>
              </template>
            </div>
          </div>
          <div class="cr-info" v-if="ready">
            裁切区域: {{ cropPxW }} × {{ cropPxH }} px
          </div>
        </div>

        <!-- right: options (1/3) -->
        <div class="cropper-options">
          <div class="cr-section">
            <label class="cr-label">裁切比例</label>
            <div class="cr-ratio-grid">
              <button
                v-for="r in ratios"
                :key="r.value"
                class="btn btn-sm cr-ratio-btn"
                :class="ratio === r.value ? 'btn-primary' : 'btn-outline-secondary'"
                @click="setRatio(r.value)"
              >{{ r.label }}</button>
            </div>
          </div>

          <div class="cr-section">
            <label class="cr-label">形状裁切</label>
            <div class="cr-shape-grid">
              <button
                v-for="s in paginatedShapes"
                :key="s.value"
                class="btn btn-sm cr-shape-btn"
                :class="shapeCrop === s.value ? 'btn-primary' : 'btn-outline-secondary'"
                @click="shapeCrop = s.value"
                :title="s.label"
              >
                <i :class="s.icon"></i>
                <span>{{ s.label }}</span>
              </button>
            </div>
            <div class="cr-pagination" v-if="shapeTotalPages > 1">
              <button class="btn btn-sm btn-outline-secondary" :disabled="shapePage <= 0" @click="shapePage--">&laquo;</button>
              <span class="mx-1">{{ shapePage + 1 }} / {{ shapeTotalPages }}</span>
              <button class="btn btn-sm btn-outline-secondary" :disabled="shapePage >= shapeTotalPages - 1" @click="shapePage++">&raquo;</button>
            </div>
          </div>
        </div>
      </div>

      <div class="cropper-footer">
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="onConfirm" :disabled="!ready">确认</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  imageUrl: string;
  initialCrop?: { x: number; y: number; w: number; h: number } | null;
  initialShape?: string;
}>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', data: { cropX: number; cropY: number; cropW: number; cropH: number; shape: string; imageNaturalW: number; imageNaturalH: number }): void;
}>();

const previewRef = ref<HTMLElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);
const imgRef = ref<HTMLImageElement | null>(null);

const ready = ref(false);
const imgNaturalW = ref(0);
const imgNaturalH = ref(0);
const displayScale = ref(1); // display_px = natural_px * displayScale

// selection in display pixels
const sel = reactive({ x: 0, y: 0, w: 100, h: 100 });
const ratio = ref('free');
const shapeCrop = ref('none');

const ratios = [
  { value: 'free', label: '自由' },
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '16:9', label: '16:9' },
  { value: '3:5', label: '3:5' },
];

const allShapes = [
  // 第一页：常用形状（与元素操作面板一致）
  { value: 'none', label: '原图', icon: 'bi bi-square' },
  { value: 'circle', label: '圆形', icon: 'bi bi-circle' },
  { value: 'square', label: '正方形', icon: 'bi bi-square-fill' },
  { value: 'rectangle', label: '矩形', icon: 'bi bi-layout-sidebar' },
  { value: 'triangle', label: '三角形', icon: 'bi bi-triangle' },
  { value: 'hexagon', label: '六边形', icon: 'bi bi-hexagon' },
  // 第二页起：更多形状
  { value: 'rounded', label: '圆角', icon: 'bi bi-rounded-corner' },
  { value: 'portrait', label: '竖矩形', icon: 'bi bi-layout-split' },
  { value: 'diamond', label: '菱形', icon: 'bi bi-gem' },
  { value: 'star', label: '星形', icon: 'bi bi-star-fill' },
  { value: 'heart', label: '心形', icon: 'bi bi-heart-fill' },
  { value: 'ellipse', label: '椭圆', icon: 'bi bi-circle-half' },
  { value: 'pentagon', label: '五边形', icon: 'bi bi-pentagon' },
  { value: 'flower', label: '花形', icon: 'bi bi-flower1' },
];
const SHAPES_PER_PAGE = 6;
const shapePage = ref(0);
const shapeTotalPages = computed(() => Math.ceil(allShapes.length / SHAPES_PER_PAGE));
const paginatedShapes = computed(() =>
  allShapes.slice(shapePage.value * SHAPES_PER_PAGE, (shapePage.value + 1) * SHAPES_PER_PAGE)
);

const dispW = computed(() => Math.round(imgNaturalW.value * displayScale.value));
const dispH = computed(() => Math.round(imgNaturalH.value * displayScale.value));

const imgStyle = computed(() => ({
  width: dispW.value + 'px',
  height: dispH.value + 'px',
}));

// crop output sizes in original image pixels
const cropPxW = computed(() => Math.round(sel.w / displayScale.value));
const cropPxH = computed(() => Math.round(sel.h / displayScale.value));

const frameStyle = computed(() => ({
  left: sel.x + 'px', top: sel.y + 'px',
  width: sel.w + 'px', height: sel.h + 'px',
}));

// 形状裁切预览叠加层
const shapePreviewStyle = computed(() => {
  if (shapeCrop.value === 'none') return { display: 'none' };
  const base: Record<string, string> = {
    position: 'absolute',
    left: sel.x + 'px',
    top: sel.y + 'px',
    width: sel.w + 'px',
    height: sel.h + 'px',
    pointerEvents: 'none',
    zIndex: '5',
    boxSizing: 'border-box',
    border: '2px dashed #e94560',
  };
  if (shapeCrop.value === 'circle' || shapeCrop.value === 'ellipse') {
    base.borderRadius = '50%';
  } else if (shapeCrop.value === 'rounded') {
    base.borderRadius = '12px';
  } else if (shapeCrop.value === 'flower') {
    base.borderRadius = '40% 60% 30% 70% / 60% 40% 70% 30%';
  } else if (shapeCrop.value === 'heart') {
    base.clipPath = 'path("M 50,30 A 20,20 0 0,1 90,30 A 20,20 0 0,1 50,85 A 20,20 0 0,1 10,30 A 20,20 0 0,1 50,30 Z")';
    base.background = 'rgba(233,69,96,0.15)';
  } else if (shapeCrop.value === 'diamond') {
    base.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    base.background = 'rgba(233,69,96,0.15)';
  } else if (shapeCrop.value === 'star') {
    base.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
    base.background = 'rgba(233,69,96,0.15)';
  } else if (shapeCrop.value === 'pentagon') {
    base.clipPath = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
    base.background = 'rgba(233,69,96,0.15)';
  } else if (shapeCrop.value === 'triangle') {
    base.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
    base.background = 'rgba(233,69,96,0.15)';
  } else if (shapeCrop.value === 'hexagon') {
    base.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    base.background = 'rgba(233,69,96,0.15)';
  }
  return base;
});

const dimTop = computed(() => ({ top: '0', left: '0', width: '100%', height: sel.y + 'px' }));
const dimBottom = computed(() => ({ top: (sel.y + sel.h) + 'px', left: '0', width: '100%', bottom: '0' }));
const dimLeft = computed(() => ({ top: sel.y + 'px', left: '0', width: sel.x + 'px', height: sel.h + 'px' }));
const dimRight = computed(() => ({ top: sel.y + 'px', left: (sel.x + sel.w) + 'px', right: '0', height: sel.h + 'px' }));

const onImgLoad = () => {
  const img = imgRef.value;
  if (!img) return;
  imgNaturalW.value = img.naturalWidth;
  imgNaturalH.value = img.naturalHeight;

  // fit image to preview area
  const stage = stageRef.value;
  const area = previewRef.value;
  if (area && stage) {
    const maxW = area.clientWidth - 20;
    const maxH = Math.min(550, window.innerHeight - 250);
    displayScale.value = Math.min(maxW / imgNaturalW.value, maxH / imgNaturalH.value, 1);
  }

  // init selection from existing crop or default
  if (props.initialCrop && props.initialCrop.w > 0) {
    sel.x = props.initialCrop.x * dispW.value;
    sel.y = props.initialCrop.y * dispH.value;
    sel.w = props.initialCrop.w * dispW.value;
    sel.h = props.initialCrop.h * dispH.value;
  } else {
    initDefaultSel();
  }

  if (props.initialShape) shapeCrop.value = props.initialShape;
  shapePage.value = allShapes.findIndex(s => s.value === (props.initialShape || 'none'));
  if (shapePage.value < 0) shapePage.value = 0;
  else shapePage.value = Math.floor(shapePage.value / SHAPES_PER_PAGE);
  ready.value = true;
};

const initDefaultSel = () => {
  const dw = dispW.value;
  const dh = dispH.value;
  const m = 0.03;
  if (ratio.value === 'free') {
    sel.x = dw * m; sel.y = dh * m;
    sel.w = dw * 0.94; sel.h = dh * 0.94;
  } else {
    const [rw, rh] = ratio.value.split(':').map(Number);
    let w = dw * 0.9;
    let h = w * rh / rw;
    if (h > dh * 0.9) { h = dh * 0.9; w = h * rw / rh; }
    sel.x = (dw - w) / 2; sel.y = (dh - h) / 2;
    sel.w = w; sel.h = h;
  }
};

const setRatio = (r: string) => {
  ratio.value = r;
  if (r !== 'free') initDefaultSel();
};

// drag / resize state
let drag = false, doResize = false, dir = '';
let smx = 0, smy = 0;
let ss = { x: 0, y: 0, w: 0, h: 0 };
const MIN = 30;

const clamp = () => {
  sel.x = Math.max(0, Math.min(dispW.value - sel.w, sel.x));
  sel.y = Math.max(0, Math.min(dispH.value - sel.h, sel.y));
  sel.w = Math.max(MIN, Math.min(dispW.value - sel.x, sel.w));
  sel.h = Math.max(MIN, Math.min(dispH.value - sel.y, sel.h));
};

const onFrameMDown = (e: MouseEvent) => {
  drag = true; doResize = false;
  smx = e.clientX; smy = e.clientY;
  ss = { ...sel };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};

const onHandle = (d: string, e: MouseEvent) => {
  doResize = true; drag = false; dir = d;
  smx = e.clientX; smy = e.clientY;
  ss = { ...sel };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};

const onMove = (e: MouseEvent) => {
  const dx = e.clientX - smx;
  const dy = e.clientY - smy;
  if (drag) {
    sel.x = ss.x + dx;
    sel.y = ss.y + dy;
    clamp();
  } else if (doResize) {
    applyResize(dx, dy);
  }
};

const applyResize = (dx: number, dy: number) => {
  const r = ratio.value;
  if (r === 'free') {
    if (dir.includes('e')) sel.w = Math.max(MIN, ss.w + dx);
    if (dir.includes('w')) { sel.w = Math.max(MIN, ss.w - dx); sel.x = ss.x + dx; }
    if (dir.includes('s')) sel.h = Math.max(MIN, ss.h + dy);
    if (dir.includes('n')) { sel.h = Math.max(MIN, ss.h - dy); sel.y = ss.y + dy; }
  } else {
    const [rw, rh] = r.split(':').map(Number);
    const asp = rw / rh;
    if (dir === 'se') {
      sel.w = Math.max(MIN, ss.w + dx); sel.h = sel.w / asp;
    } else if (dir === 'nw') {
      sel.w = Math.max(MIN, ss.w - dx); sel.h = sel.w / asp;
      sel.x = ss.x + ss.w - sel.w; sel.y = ss.y + ss.h - sel.h;
    } else if (dir === 'ne') {
      sel.w = Math.max(MIN, ss.w + dx); sel.h = sel.w / asp;
      sel.y = ss.y + ss.h - sel.h;
    } else if (dir === 'sw') {
      sel.w = Math.max(MIN, ss.w - dx); sel.h = sel.w / asp;
      sel.x = ss.x + ss.w - sel.w;
    } else if (dir === 'e' || dir === 'w') {
      sel.w = Math.max(MIN, dir === 'e' ? ss.w + dx : ss.w - dx);
      if (dir === 'w') sel.x = ss.x + ss.w - sel.w;
      sel.h = sel.w / asp;
      sel.y = ss.y + (ss.h - sel.h) / 2;
    } else {
      sel.h = Math.max(MIN, dir === 's' ? ss.h + dy : ss.h - dy);
      if (dir === 'n') sel.y = ss.y + ss.h - sel.h;
      sel.w = sel.h * asp;
      sel.x = ss.x + (ss.w - sel.w) / 2;
    }
  }
  clamp();
};

const onUp = () => {
  drag = false; doResize = false;
  document.removeEventListener('mousemove', onMove);
  document.removeEventListener('mouseup', onUp);
};

const onConfirm = () => {
  // emit crop fractions (0-1 of original image)
  emit('confirm', {
    cropX: sel.x / dispW.value,
    cropY: sel.y / dispH.value,
    cropW: sel.w / dispW.value,
    cropH: sel.h / dispH.value,
    shape: shapeCrop.value,
    imageNaturalW: imgNaturalW.value,
    imageNaturalH: imgNaturalH.value,
  });
  emit('close');
};

// auto-load if image already cached
watch(() => props.visible, (v) => {
  if (v && imgRef.value?.complete) onImgLoad();
});

onMounted(() => {
  if (props.visible && imgRef.value?.complete) onImgLoad();
});

onUnmounted(() => {
  document.removeEventListener('mousemove', onMove);
  document.removeEventListener('mouseup', onUp);
});
</script>

<style scoped>
.cropper-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 1100;
}
.cropper-modal {
  background: #fff; border-radius: 10px; width: 95vw; max-width: 1000px;
  max-height: 92vh; display: flex; flex-direction: column;
}
.cropper-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; border-bottom: 1px solid #eee;
}
.cropper-header h5 { margin: 0; display: flex; align-items: center; gap: 8px; }

.cropper-main { display: flex; flex: 1; min-height: 0; }

/* left preview (2/3) */
.cropper-preview {
  flex: 2; padding: 16px; display: flex; flex-direction: column;
  align-items: center; background: #f8f9fa; overflow: auto;
}
.cropper-stage {
  position: relative; display: inline-block;
  background-image: linear-gradient(45deg, #ddd 25%, transparent 25%),
    linear-gradient(-45deg, #ddd 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ddd 75%),
    linear-gradient(-45deg, transparent 75%, #ddd 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  border-radius: 4px;
}
.cropper-image { display: block; user-select: none; -webkit-user-drag: none; }
.cropper-dim { position: absolute; inset: 0; pointer-events: none; }
.cropper-dim > div { position: absolute; background: rgba(0,0,0,0.45); }

.cropper-frame {
  position: absolute; cursor: move;
  outline: 2px dashed #7ab8e0; outline-offset: -1px;
}
.cr-h {
  position: absolute; width: 10px; height: 10px;
  background: #fff; border: 2px solid #5b9bd5; border-radius: 2px;
}
.cr-nw { top: -5px; left: -5px; cursor: nwse-resize; }
.cr-ne { top: -5px; right: -5px; cursor: nesw-resize; }
.cr-sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
.cr-se { bottom: -5px; right: -5px; cursor: nwse-resize; }
.cr-n { top: -5px; left: 50%; margin-left: -5px; cursor: ns-resize; }
.cr-s { bottom: -5px; left: 50%; margin-left: -5px; cursor: ns-resize; }
.cr-e { right: -5px; top: 50%; margin-top: -5px; cursor: ew-resize; }
.cr-w { left: -5px; top: 50%; margin-top: -5px; cursor: ew-resize; }

.cr-info { margin-top: 8px; font-size: 12px; color: #888; }

/* right options (1/3) */
.cropper-options {
  flex: 1; padding: 16px; border-left: 1px solid #eee;
  overflow-y: auto; max-width: 280px;
}
.cr-section { margin-bottom: 20px; }
.cr-label { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px; display: block; }
.cr-ratio-grid { display: flex; flex-direction: column; gap: 4px; }
.cr-ratio-btn { text-align: left; }
.cr-shape-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.cr-shape-btn { display: flex; align-items: center; gap: 4px; font-size: 12px; }
.cr-shape-btn i { font-size: 14px; }

.cropper-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 12px 20px; border-top: 1px solid #eee;
}
.cr-pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 4px; margin-top: 8px; font-size: 12px; color: #888;
}
</style>
