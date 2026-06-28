<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';

import { useEditorStore } from '../store/editor';
import { getElementTypeName } from '../types/editor';
import FontPicker from './FontPicker.vue';
import ImageCropper from './ImageCropper.vue';

const store = useEditorStore();

const showImageCropper = ref(false);
const cropperImageUrl = ref('');
const cutoutMenuOpen = ref(false);
const showAICutoutModal = ref(false);
const aiModel = ref('gpt-4o');
const aiPrompt = ref('');

// click outside to close cutout dropdown
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (cutoutMenuOpen.value && !target.closest('.btn-group-sm')) {
    cutoutMenuOpen.value = false;
  }
});

// 类型图标
const typeIcon = computed(() => {
  const el = store.selectedElement;
  if (!el) return 'bi bi-square-fill';
  switch (el.type) {
    case 'decoration': {
      return 'bi bi-stars';
    }
    case 'image': {
      return 'bi bi-image';
    }
    case 'text': {
      return 'bi bi-type';
    }
    default: {
      return 'bi bi-square-fill';
    }
  }
});

const typeLabel = computed(() => {
  const el = store.selectedElement;
  if (!el) return '';
  return getElementTypeName(el.type, el.subType);
});

// 折叠状态
const bgCollapsed = ref(false);
const posCollapsed = ref(false);
const sizeCollapsed = ref(false);
const layerCollapsed = ref(false);

// 预设
const textColorPresets = [
  '#333333',
  '#d63384',
  '#fd7e14',
  '#ffc107',
  '#198754',
  '#0d6efd',
  '#6f42c1',
  '#dc3545',
];
const decorationColorPresets = [
  '#ff6b6b',
  '#ffd93d',
  '#6bcf7f',
  '#4d96ff',
  '#9d4edd',
];
const bgColorPresets = [
  '#ffffff',
  '#f8f9fa',
  '#e9ecef',
  '#dee2e6',
  '#ced4da',
  '#adb5bd',
  '#6c757d',
  '#495057',
  '#343a40',
  '#212529',
  '#d63384',
  '#fd7e14',
  '#ffc107',
  '#198754',
  '#0d6efd',
  '#6f42c1',
  '#dc3545',
];

const shapeOptions = [
  { value: 'none', label: '原图', icon: 'bi bi-square' },
  { value: 'circle', label: '圆形', icon: 'bi bi-circle' },
  { value: 'square', label: '正方形', icon: 'bi bi-square' },
  { value: 'rectangle', label: '矩形', icon: 'bi bi-rectangle-horizontal' },
  { value: 'triangle', label: '三角形', icon: 'bi bi-caret-down' },
  { value: 'hexagon', label: '六边形', icon: 'bi bi-hexagon' },
];

const filterOptions = [
  { value: 'original', label: '原图' },
  { value: 'grayscale', label: '黑白' },
  { value: 'sepia', label: '复古' },
  { value: 'blur', label: '模糊' },
  { value: 'brightness', label: '明亮' },
  { value: 'contrast', label: '对比度' },
];

// 本地属性
const textContent = ref('');
const textFontFamily = ref('Microsoft YaHei');
const textFontSize = ref(16);
const textColorValue = ref('#333333');
const bgColorValue = ref('#ffffff');
const bgOpacityValue = ref(1);
const widthValue = ref(200);
const heightValue = ref(200);
const rotationValue = ref(0);
const decorationType = ref('heart');
const decorationSizeValue = ref(32);

// 动画本地状态
const animType = ref('none');
const animDuration = ref(0.8);
const animDelay = ref(0);
const animEasing = ref('ease');

// 触发本地状态
const triggerType = ref('none');
const triggerAction = ref('playAnimation');

// 监听选中元素变化，同步本地值
watch(
  () => store.selectedElement,
  (el) => {
    if (!el) return;
    textContent.value = el.text || '';
    textFontFamily.value = el.fontFamily || 'Microsoft YaHei';
    textFontSize.value = el.fontSize || 16;
    textColorValue.value = el.textColor || '#333333';
    bgColorValue.value =
      el.backgroundColor === 'transparent' ? '#ffffff' : el.backgroundColor;
    bgOpacityValue.value = el.backgroundOpacity;
    widthValue.value = el.width;
    heightValue.value = el.height;
    rotationValue.value = Math.round(el.rotation);
    decorationType.value = el.subType || 'heart';
    decorationSizeValue.value = el.decorationSize || 32;
    // 同步动画状态
    animType.value = el.animation?.type || 'none';
    animDuration.value = el.animation?.duration || 0.8;
    animDelay.value = el.animation?.delay || 0;
    animEasing.value = el.animation?.easing || 'ease';
    // 同步触发状态
    triggerType.value = el.trigger?.type || 'none';
    triggerAction.value = el.trigger?.action || 'playAnimation';
  },
  { immediate: true, deep: true },
);

// ============ 工具栏拖动 & 位置约束 ============
const toolbarStyle = computed(() => {
  return {
    left: `${store.elementToolbarPosition.left}px`,
    top: '0px',
    bottom: '0px',
    width: '320px',
  };
});

const isDragging = ref(false);
let dragStartX = 0;
let dragStartLeft = 0;

const onDragHandleMouseDown = (e: MouseEvent) => {
  e.preventDefault();
  startDrag(e);
};

const onHeaderMouseDown = (e: MouseEvent) => {
  // 如果点击的是关闭按钮（或其内部的 i），不触发拖动
  const target = e.target as HTMLElement;
  if (target.closest('.btn-close-toolbar')) return;
  e.preventDefault();
  startDrag(e);
};

const startDrag = (e: MouseEvent) => {
  isDragging.value = true;
  dragStartX = e.clientX;
  dragStartLeft = store.elementToolbarPosition.left;
  document.addEventListener('mousemove', onDragging);
  document.addEventListener('mouseup', onDragEnd);
};

const onDragging = (e: MouseEvent) => {
  if (!isDragging.value) return;
  const deltaX = e.clientX - dragStartX;
  const newLeft = dragStartLeft + deltaX;

  // 边界约束：在 editor-main 区域内移动
  const wrapperEl = document.querySelector('.editor-main') as HTMLElement;
  const containerWidth = wrapperEl?.clientWidth || window.innerWidth;
  const MIN_LEFT = 0;
  const MAX_LEFT = Math.max(MIN_LEFT, containerWidth - 320);

  const clamped = Math.max(MIN_LEFT, Math.min(MAX_LEFT, newLeft));
  store.elementToolbarPosition.left = clamped;
};

const onDragEnd = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  store.persist();
  document.removeEventListener('mousemove', onDragging);
  document.removeEventListener('mouseup', onDragEnd);
};

onUnmounted(() => {
  document.removeEventListener('mousemove', onDragging);
  document.removeEventListener('mouseup', onDragEnd);
});

// 关闭
const onClose = () => {
  store.setElementToolbarVisible(false);
  store.selectElement(null);
};

// ============ 文本操作 ============
const onTextContentChange = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { text: textContent.value });
};

const onTextFontFamilyChange = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { fontFamily: textFontFamily.value });
};

const increaseFontSize = () => {
  textFontSize.value = Math.min(72, textFontSize.value + 1);
  onFontSizeChange();
};

const decreaseFontSize = () => {
  textFontSize.value = Math.max(8, textFontSize.value - 1);
  onFontSizeChange();
};

const onFontSizeChange = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { fontSize: textFontSize.value });
};

const setFontWeight = (weight: string) => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { fontWeight: weight });
};

const setTextAlign = (align: 'center' | 'justify' | 'left' | 'right') => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { textAlign: align });
};

const setTextColor = (color: string) => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { textColor: color });
  textColorValue.value = color;
};

const onTextColorInput = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { textColor: textColorValue.value });
};

// ============ 装饰元素 ============
const onDecorationTypeChange = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { subType: decorationType.value });
};

const setDecorationColor = (color: string) => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { decorationColor: color });
};

const onDecorationSizeInput = () => {
  const el = store.selectedElement;
  if (el)
    store.updateElement(el.id, { decorationSize: decorationSizeValue.value });
};

// ============ 图片元素 ============
const onChangeImage = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file && store.selectedElement) {
      const imageUrl = await file.text();
      // oxlint-disable typescript-eslint/no-non-null-assertion
      store.updateElement(store.selectedElement!.id, {
        imageUrl,
      });
    }
  });
  input.click();
};

const cropInitialData = ref<null | {
  h: number;
  w: number;
  x: number;
  y: number;
}>(null);
const cropInitialShape = ref('none');

const onCropImage = () => {
  const el = store.selectedElement;
  if (el && el.type === 'image' && el.imageUrl) {
    cropperImageUrl.value = el.imageUrl;
    // load existing crop as initial data
    cropInitialData.value =
      el.cropW && el.cropW > 0
        ? {
            x: el.cropX || 0,
            y: el.cropY || 0,
            w: el.cropW,
            h: el.cropH || 0,
          }
        : null;
    cropInitialShape.value = el.imageCrop || 'none';
    showImageCropper.value = true;
  }
};

const onCropConfirm = (data: {
  cropH: number;
  cropW: number;
  cropX: number;
  cropY: number;
  imageNaturalH: number;
  imageNaturalW: number;
  shape: string;
}) => {
  const el = store.selectedElement;
  if (!el || el.type !== 'image') return;
  store.updateElement(el.id, {
    cropX: data.cropX,
    cropY: data.cropY,
    cropW: data.cropW,
    cropH: data.cropH,
    imageCrop: data.shape,
  } as any);
  // 裁切区域的真实像素宽高比 = (cropW * 原图宽) / (cropH * 原图高)
  const cropPixelW = data.cropW * data.imageNaturalW;
  const cropPixelH = data.cropH * data.imageNaturalH;
  const cropPixelRatio = cropPixelW / cropPixelH;
  // 以当前宽度为基准，按裁切区域像素比计算高度
  let newW = el.width;
  let newH = Math.round(newW / cropPixelRatio);
  const MAX = 600;
  const MIN = 40;
  if (newH > MAX) {
    newH = MAX;
    newW = Math.round(MAX * cropPixelRatio);
  }
  if (newW > MAX) {
    newW = MAX;
    newH = Math.round(MAX / cropPixelRatio);
  }
  if (newW < MIN) newW = MIN;
  if (newH < MIN) newH = MIN;
  store.updateElement(el.id, { width: newW, height: newH } as any);
  store.saveHistory('裁切图片');
  store.showToast('裁切已应用', 'success');
  showImageCropper.value = false;
};

const onImageCropped = (croppedUrl: string) => {
  const el = store.selectedElement;
  if (el && el.type === 'image') {
    // get cropped image dimensions
    const tempImg = new Image();
    tempImg.addEventListener('load', () => {
      store.updateElement(el.id, {
        imageUrl: croppedUrl,
        width: tempImg.width,
        height: tempImg.height,
      });
      store.saveHistory('裁切图片');
      store.showToast('图片已裁切', 'success');
    });
    tempImg.src = croppedUrl;
  }
};

const onCutoutImage = () => {
  store.cutoutImage();
};

const onCutoutImageAI = () => {
  showAICutoutModal.value = true;
};

const onFlipHorizontal = () => {
  store.flipElement('horizontal');
};

const onFlipVertical = () => {
  store.flipElement('vertical');
};

const setImageCrop = (shape: string) => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { imageCrop: shape });
};

const setImageFilter = (filter: string) => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { imageFilter: filter });
};

// close dropdown on outside click
const onCutoutMenuBlur = () => {
  setTimeout(() => {
    cutoutMenuOpen.value = false;
  }, 200);
};

// ============ 背景 ============
const onAICutoutConfirm = () => {
  store.showToast('暂未接入AI大模型，请使用简单抠图', 'info');
  showAICutoutModal.value = false;
};

const setBgColor = (color: string) => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { backgroundColor: color });
  if (color !== 'transparent') bgColorValue.value = color;
};

const onBgColorInput = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { backgroundColor: bgColorValue.value });
};

const onBgOpacityInput = () => {
  const el = store.selectedElement;
  if (el)
    store.updateElement(el.id, { backgroundOpacity: bgOpacityValue.value });
};

// ============ 元素边框样式 ============
const setElementBorderStyle = (style: string) => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { borderStyle: style } as any);
};
const setElementBorderColor = (color: string) => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { borderColor: color } as any);
};
const setElementBorderWidth = (width: number) => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { borderWidth: width } as any);
};
const setElementBorderRadius = (r: number) => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { borderRadius: r } as any);
};

// ============ 组合样式 ============
const setGroupBg = (color: string) => {
  const el = store.selectedElement;
  if (el && el.type === 'group')
    store.updateElement(el.id, { groupBackgroundColor: color } as any);
};
const setGroupBorderStyle = (style: string) => {
  const el = store.selectedElement;
  if (el && el.type === 'group')
    store.updateElement(el.id, { groupBorderStyle: style } as any);
};
const setGroupBorderColor = (color: string) => {
  const el = store.selectedElement;
  if (el && el.type === 'group')
    store.updateElement(el.id, { groupBorderColor: color } as any);
};
const setGroupBorderWidth = (width: number) => {
  const el = store.selectedElement;
  if (el && el.type === 'group')
    store.updateElement(el.id, { groupBorderWidth: width } as any);
};

// ============ 位置移动 ============
const moveUp = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { y: Math.max(0, el.y - 5) });
};
const moveDown = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { y: el.y + 5 });
};
const moveLeft = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { x: Math.max(0, el.x - 5) });
};
const moveRight = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { x: el.x + 5 });
};

const alignCanvasLeft = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { x: 0 });
};
const alignCanvasCenter = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { x: Math.floor((320 - el.width) / 2) });
};
const alignCanvasRight = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { x: 320 - el.width });
};
const alignCanvasTop = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { y: 0 });
};
const alignCanvasMiddle = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { y: Math.floor((628 - el.height) / 2) });
};
const alignCanvasBottom = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { y: 628 - el.height });
};
const alignCanvasFull = () => {
  const el = store.selectedElement;
  if (el)
    store.updateElement(el.id, {
      x: Math.floor((320 - el.width) / 2),
      y: Math.floor((628 - el.height) / 2),
    });
};

// ============ 尺寸旋转 ============
const onWidthChange = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { width: widthValue.value });
};
const onHeightChange = () => {
  const el = store.selectedElement;
  if (el) store.updateElement(el.id, { height: heightValue.value });
};
const onRotationInput = () => {
  const el = store.selectedElement;
  if (el)
    store.updateElement(el.id, { rotation: Math.round(rotationValue.value) });
};

// ============ 层级 ============
const onBringFront = () => {
  store.bringToFront();
  store.showToast('已置顶', 'success');
};
const onSendToBack = () => {
  store.sendToBack();
  store.showToast('已置底', 'success');
};
const onBringForward = () => {
  store.bringForward();
};
const onSendBackward = () => {
  store.sendBackward();
};

// ============ 快速操作 ============
const onDuplicate = () => {
  const el = store.selectedElement;
  if (el) store.duplicateElement(el.id);
};
const onDelete = () => {
  const el = store.selectedElement;
  if (el) store.deleteElement(el.id);
};
const onToggleLock = () => {
  const el = store.selectedElement;
  if (el) store.toggleLock(el.id);
};
const onToggleVisible = () => {
  const el = store.selectedElement;
  if (el) store.toggleVisibility(el.id);
};

// ============ 动画相关 ============
const syncAnimation = () => {
  store.setElementAnimation({
    type: animType.value as any,
    duration: animDuration.value,
    delay: animDelay.value,
    easing: animEasing.value as any,
  });
};
const onAnimTypeChange = () => syncAnimation();
const onAnimDurationChange = () => syncAnimation();
const onAnimDelayChange = () => syncAnimation();
const onAnimEasingChange = () => syncAnimation();
const onPreviewAnimation = () => store.previewAnimation();

// ============ 触发相关 ============
const syncTrigger = () => {
  const el = store.selectedElement;
  if (!el) return;
  el.trigger = {
    type: triggerType.value as any,
    action: triggerAction.value as any,
  };
  store.saveHistory();
};
const onTriggerTypeChange = () => syncTrigger();
const onTriggerActionChange = () => syncTrigger();
</script>

<template>
  <div
    v-if="store.elementToolbarVisible && store.selectedElement"
    class="element-toolbar-container visible"
    :class="{ dragging: isDragging }"
    :style="toolbarStyle"
  >
    <!-- 左侧拖动把手 -->
    <div class="drag-handle" @mousedown="onDragHandleMouseDown">
      <i class="bi bi-grip-vertical"></i>
    </div>

    <!-- 工具栏主体 -->
    <div class="element-toolbar">
      <!-- 头部（仅图标 + 标题 + 关闭按钮，保持干净的拖动区） -->
      <div class="toolbar-header" @mousedown="onHeaderMouseDown">
        <i :class="typeIcon"></i>
        <span class="element-type">{{ typeLabel }}</span>
        <button class="btn-close-toolbar" @click.stop="onClose">
          <i class="bi bi-x"></i>
        </button>
      </div>

      <!-- 标签页切换 -->
      <div class="toolbar-tabs">
        <button
          class="tab-btn"
          :class="{ active: store.elementToolbarTab === 'style' }"
          @click.stop="store.setElementToolbarTab('style')"
        >
          样式
        </button>
        <button
          class="tab-btn"
          :class="{ active: store.elementToolbarTab === 'animation' }"
          @click.stop="store.setElementToolbarTab('animation')"
        >
          动画
        </button>
        <button
          class="tab-btn"
          :class="{ active: store.elementToolbarTab === 'trigger' }"
          @click.stop="store.setElementToolbarTab('trigger')"
        >
          触发
        </button>
      </div>

      <!-- 标签页内容 -->
      <div class="tab-content">
        <!-- 样式标签页 -->
        <div v-if="store.elementToolbarTab === 'style'">
          <!-- 文本样式 -->
          <div
            v-if="store.selectedElement?.type === 'text'"
            class="toolbar-section"
          >
            <h6 class="section-title section-title-blue">
              <i class="bi bi-type"></i> 文字样式
            </h6>
            <div class="style-control-group">
              <label>字体</label>
              <FontPicker
                v-model="textFontFamily"
                @update:model-value="onTextFontFamilyChange"
              />
            </div>

            <div class="style-control-group">
              <label>字号/字重</label>
              <div class="font-size-row">
                <div class="font-size-input-wrap">
                  <div class="font-size-stepper">
                    <button
                      class="btn btn-xs btn-outline-secondary"
                      @click="increaseFontSize"
                    >
                      <i class="bi bi-caret-up-fill"></i>
                    </button>
                    <button
                      class="btn btn-xs btn-outline-secondary"
                      @click="decreaseFontSize"
                    >
                      <i class="bi bi-caret-down-fill"></i>
                    </button>
                  </div>
                  <input
                    type="number"
                    class="form-control form-control-sm"
                    v-model.number="textFontSize"
                    min="8"
                    max="72"
                    @change="onFontSizeChange"
                  />
                  <span class="font-size-unit">px</span>
                </div>
                <div class="btn-group btn-group-sm">
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    :class="{
                      active: store.selectedElement.fontWeight === 'normal',
                    }"
                    @click="setFontWeight('normal')"
                  >
                    常规
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    :class="{
                      active: store.selectedElement.fontWeight === 'bold',
                    }"
                    @click="setFontWeight('bold')"
                  >
                    加粗
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    :class="{
                      active: store.selectedElement.fontWeight === 'lighter',
                    }"
                    @click="setFontWeight('lighter')"
                  >
                    细体
                  </button>
                </div>
              </div>
            </div>

            <div class="style-control-group">
              <label>文本内容</label>
              <textarea
                class="form-control form-control-sm"
                rows="3"
                v-model="textContent"
                @change="onTextContentChange"
              ></textarea>
            </div>

            <div class="style-control-group">
              <label>文字颜色</label>
              <div class="color-picker-mini">
                <div class="color-presets">
                  <div
                    v-for="color in textColorPresets"
                    :key="color"
                    class="color-option-mini"
                    :class="{
                      active: store.selectedElement.textColor === color,
                    }"
                    :style="{ background: color }"
                    @click="setTextColor(color)"
                  ></div>
                </div>
                <input
                  type="color"
                  class="form-control-color"
                  v-model="textColorValue"
                  @input="onTextColorInput"
                />
              </div>
            </div>
          </div>

          <!-- 装饰元素样式 -->
          <div
            v-if="store.selectedElement?.type === 'decoration'"
            class="toolbar-section"
          >
            <h6 class="section-title section-title-blue">
              <i class="bi bi-stars"></i> 装饰样式
            </h6>
            <div class="style-control-group">
              <label>装饰类型</label>
              <select
                class="form-select form-select-sm"
                v-model="decorationType"
                @change="onDecorationTypeChange"
              >
                <option value="heart">爱心</option>
                <option value="flower">花朵</option>
                <option value="ring">戒指</option>
                <option value="star">星星</option>
                <option value="music">音符</option>
                <option value="bell">铃铛</option>
              </select>
            </div>
            <div class="style-control-group">
              <label>颜色</label>
              <div class="color-picker-mini">
                <div class="color-presets">
                  <div
                    v-for="color in decorationColorPresets"
                    :key="color"
                    class="color-option-mini"
                    :class="{
                      active: store.selectedElement.decorationColor === color,
                    }"
                    :style="{ background: color }"
                    @click="setDecorationColor(color)"
                  ></div>
                </div>
              </div>
            </div>
            <div class="style-control-group">
              <label>大小</label>
              <input
                type="range"
                class="form-range"
                v-model.number="decorationSizeValue"
                min="16"
                max="100"
                @input="onDecorationSizeInput"
              />
              <span>{{ store.selectedElement.decorationSize || 32 }} px</span>
            </div>
          </div>

          <!-- 图片元素样式 -->
          <div
            v-if="store.selectedElement?.type === 'image'"
            class="toolbar-section"
          >
            <h6 class="section-title section-title-blue">
              <i class="bi bi-image"></i> 图片样式
            </h6>
            <div class="style-control-group">
              <div class="image-preview-container">
                <div class="image-thumbnail">
                  <div class="image-wrapper">
                    <img
                      v-if="store.selectedElement.imageUrl"
                      :src="store.selectedElement.imageUrl"
                    />
                    <div v-else class="image-placeholder">
                      <i
                        class="bi bi-image"
                        style="font-size: 32px; color: #ccc"
                      ></i>
                      <p style="font-size: 12px; color: #999">暂无图片</p>
                    </div>
                  </div>
                </div>
                <div class="image-actions">
                  <div class="action-row">
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      @click="onChangeImage"
                    >
                      <i class="bi bi-image"></i>
                      <span>更换</span>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      @click="onDelete"
                    >
                      <i class="bi bi-trash"></i>
                      <span>删除</span>
                    </button>
                  </div>
                  <div class="action-row">
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      @click="onFlipHorizontal"
                    >
                      <i class="bi bi-arrow-left-right"></i>
                      <span>水平翻转</span>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      @click="onFlipVertical"
                    >
                      <i class="bi bi-arrows-vertical"></i>
                      <span>垂直翻转</span>
                    </button>
                  </div>
                  <div class="action-row">
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      @click="onCropImage"
                    >
                      <i class="bi bi-crop"></i>
                      <span>裁切</span>
                    </button>
                    <div
                      class="btn-group btn-group-sm"
                      style="position: relative"
                    >
                      <button
                        class="btn btn-outline-secondary"
                        @click.stop="cutoutMenuOpen = !cutoutMenuOpen"
                      >
                        <i class="bi bi-scissors"></i>
                        <span>抠图</span>
                        <i
                          class="bi ms-1"
                          :class="
                            cutoutMenuOpen ? 'bi-chevron-up' : 'bi-chevron-down'
                          "
                          style="font-size: 10px"
                        ></i>
                      </button>
                      <div
                        v-if="cutoutMenuOpen"
                        class="dropdown-menu show"
                        style="
                          position: absolute;
                          top: 100%;
                          left: 0;
                          z-index: 1050;
                        "
                      >
                        <!--presttier-ignore-->
                        <a
                          class="dropdown-item"
                          href="#"
                          @click.prevent="
                            cutoutMenuOpen = false;
                            onCutoutImage();
                          "
                        >
                          简单抠图
                        </a>
                        <a
                          class="dropdown-item"
                          href="#"
                          @click.prevent="
                            cutoutMenuOpen = false;
                            showAICutoutModal = true;
                          "
                        >
                          AI 抠图</a
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="style-control-group">
              <label>滤镜</label>
              <div class="filter-options">
                <button
                  v-for="filter in filterOptions"
                  :key="filter.value"
                  class="btn btn-sm btn-outline-secondary filter-option"
                  :class="{
                    active: store.selectedElement.imageFilter === filter.value,
                  }"
                  @click="setImageFilter(filter.value)"
                >
                  {{ filter.label }}
                </button>
              </div>
            </div>
            <div class="style-control-group">
              <label>形状裁切</label>
              <div class="shape-crop-options">
                <button
                  v-for="shape in shapeOptions"
                  :key="shape.value"
                  class="btn btn-sm btn-outline-secondary shape-option"
                  :class="{
                    active: store.selectedElement.imageCrop === shape.value,
                  }"
                  @click="setImageCrop(shape.value)"
                >
                  <i :class="shape.icon"></i> {{ shape.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- 通用 - 背景设置 -->
          <div
            class="toolbar-section collapsible"
            :class="{ collapsed: bgCollapsed }"
          >
            <h6
              class="section-title section-title-blue"
              @click="bgCollapsed = !bgCollapsed"
            >
              <span><i class="bi bi-palette-fill"></i> 背景设置</span>
              <i
                :class="
                  bgCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-down'
                "
              ></i>
            </h6>
            <div v-if="!bgCollapsed" class="section-content">
              <div class="style-control-group">
                <label>背景颜色</label>
                <div class="color-picker-mini">
                  <div class="color-presets">
                    <div
                      class="color-option-mini transparent-preset"
                      :class="{
                        active:
                          store.selectedElement.backgroundColor ===
                          'transparent',
                      }"
                      @click="setBgColor('transparent')"
                    ></div>
                    <div
                      v-for="color in bgColorPresets"
                      :key="color"
                      class="color-option-mini"
                      :class="{
                        active: store.selectedElement.backgroundColor === color,
                      }"
                      :style="{
                        background: color,
                        border: color === '#ffffff' ? '1px solid #ccc' : 'none',
                      }"
                      @click="setBgColor(color)"
                    ></div>
                  </div>
                  <input
                    type="color"
                    class="form-control-color"
                    v-model="bgColorValue"
                    @input="onBgColorInput"
                  />
                </div>
              </div>
              <div class="style-control-group">
                <label>背景透明度</label>
                <div class="d-flex align-items-center gap-2">
                  <input
                    type="range"
                    class="form-range flex-grow-1"
                    :disabled="
                      store.selectedElement.backgroundColor === 'transparent'
                    "
                    v-model.number="bgOpacityValue"
                    min="0"
                    max="1"
                    step="0.1"
                    @input="onBgOpacityInput"
                  />
                  <span
                    >{{
                      Math.round(
                        (store.selectedElement.backgroundOpacity || 1) * 100,
                      )
                    }}%</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- 元素边框样式（所有元素通用） -->
          <div class="toolbar-section">
            <h6 class="section-title section-title-blue">
              <i class="bi bi-border"></i> 边框样式
            </h6>
            <div class="style-control-group">
              <label>边框</label>
              <select
                class="form-select form-select-sm"
                :value="store.selectedElement?.borderStyle || 'none'"
                @change="
                  (e: Event) =>
                    setElementBorderStyle((e.target as HTMLSelectElement).value)
                "
              >
                <option value="none">无边框</option>
                <option value="solid">实线</option>
                <option value="dashed">虚线</option>
                <option value="dotted">点线</option>
              </select>
            </div>
            <div
              class="style-control-group"
              v-if="(store.selectedElement?.borderStyle || 'none') !== 'none'"
            >
              <label>边框颜色</label>
              <input
                type="color"
                class="form-control-color"
                :value="store.selectedElement?.borderColor || '#4b5563'"
                @input="
                  (e: Event) =>
                    setElementBorderColor((e.target as HTMLInputElement).value)
                "
              />
            </div>
            <div
              class="style-control-group"
              v-if="(store.selectedElement?.borderStyle || 'none') !== 'none'"
            >
              <label>边框宽度</label>
              <input
                type="range"
                class="form-range"
                :value="store.selectedElement?.borderWidth || 1"
                min="1"
                max="10"
                step="1"
                @input="
                  (e: Event) =>
                    setElementBorderWidth(
                      Number((e.target as HTMLInputElement).value),
                    )
                "
              />
              <span>{{ store.selectedElement?.borderWidth || 1 }}px</span>
            </div>
            <div
              class="style-control-group"
              v-if="(store.selectedElement?.borderStyle || 'none') !== 'none'"
            >
              <label>圆角</label>
              <input
                type="range"
                class="form-range"
                :value="store.selectedElement?.borderRadius || 0"
                min="0"
                max="50"
                step="1"
                @input="
                  (e: Event) =>
                    setElementBorderRadius(
                      Number((e.target as HTMLInputElement).value),
                    )
                "
              />
              <span>{{ store.selectedElement?.borderRadius || 0 }}px</span>
            </div>
          </div>

          <!-- 组合样式 -->
          <div
            v-if="store.selectedElement?.type === 'group'"
            class="toolbar-section"
          >
            <h6 class="section-title section-title-blue">
              <i class="bi bi-collection"></i> 组合样式
            </h6>
            <div class="style-control-group">
              <label>背景颜色</label>
              <div class="d-flex gap-2 align-items-center">
                <input
                  type="color"
                  class="form-control-color"
                  :value="
                    store.selectedElement?.groupBackgroundColor || '#ffffff00'
                  "
                  @input="
                    (e: Event) =>
                      setGroupBg((e.target as HTMLInputElement).value)
                  "
                />
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="setGroupBg('transparent')"
                >
                  透明
                </button>
              </div>
            </div>
            <div class="style-control-group">
              <label>边框样式</label>
              <select
                class="form-select form-select-sm"
                :value="store.selectedElement?.groupBorderStyle || 'none'"
                @change="
                  (e: Event) =>
                    setGroupBorderStyle((e.target as HTMLSelectElement).value)
                "
              >
                <option value="none">无边框</option>
                <option value="solid">实线</option>
                <option value="dashed">虚线</option>
                <option value="dotted">点线</option>
              </select>
            </div>
            <div
              class="style-control-group"
              v-if="
                (store.selectedElement?.groupBorderStyle || 'none') !== 'none'
              "
            >
              <label>边框颜色</label>
              <input
                type="color"
                class="form-control-color"
                :value="store.selectedElement?.groupBorderColor || '#0d6efd'"
                @input="
                  (e: Event) =>
                    setGroupBorderColor((e.target as HTMLInputElement).value)
                "
              />
            </div>
            <div
              class="style-control-group"
              v-if="
                (store.selectedElement?.groupBorderStyle || 'none') !== 'none'
              "
            >
              <label>边框宽度</label>
              <input
                type="range"
                class="form-range"
                :value="store.selectedElement?.groupBorderWidth || 1"
                min="1"
                max="10"
                step="1"
                @input="
                  (e: Event) =>
                    setGroupBorderWidth(
                      Number((e.target as HTMLInputElement).value),
                    )
                "
              />
              <span>{{ store.selectedElement?.groupBorderWidth || 1 }}px</span>
            </div>
          </div>

          <!-- 位置与对齐 -->
          <div
            class="toolbar-section collapsible"
            :class="{ collapsed: posCollapsed }"
          >
            <h6
              class="section-title section-title-blue"
              @click="posCollapsed = !posCollapsed"
            >
              <span><i class="bi bi-arrows-move"></i> 位置与对齐</span>
              <i
                :class="
                  posCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-down'
                "
              ></i>
            </h6>
            <div v-if="!posCollapsed" class="section-content">
              <div class="align-grid">
                <div class="align-row">
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="moveUp"
                  >
                    <i class="bi bi-arrow-up"></i> 上移
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="moveDown"
                  >
                    <i class="bi bi-arrow-down"></i> 下移
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="moveLeft"
                  >
                    <i class="bi bi-arrow-left"></i> 左移
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="moveRight"
                  >
                    <i class="bi bi-arrow-right"></i> 右移
                  </button>
                </div>
                <div class="align-row">
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="alignCanvasLeft"
                  >
                    <i class="bi bi-align-start"></i> 左对齐
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="alignCanvasCenter"
                  >
                    <i class="bi bi-align-center"></i> 水平居中
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="alignCanvasRight"
                  >
                    <i class="bi bi-align-end"></i> 右对齐
                  </button>
                </div>
                <div class="align-row">
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="alignCanvasTop"
                  >
                    <i class="bi bi-align-top"></i> 顶对齐
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="alignCanvasMiddle"
                  >
                    <i class="bi bi-align-middle"></i> 垂直居中
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="alignCanvasBottom"
                  >
                    <i class="bi bi-align-bottom"></i> 底对齐
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="alignCanvasFull"
                  >
                    <i class="bi bi-square-fill"></i> 完全居中
                  </button>
                </div>
                <div
                  v-if="store.selectedElement?.type === 'text'"
                  class="align-row"
                >
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="setTextAlign('left')"
                  >
                    <i class="bi bi-text-left"></i> 左
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="setTextAlign('center')"
                  >
                    <i class="bi bi-text-center"></i> 中
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="setTextAlign('right')"
                  >
                    <i class="bi bi-text-right"></i> 右
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="setTextAlign('justify')"
                  >
                    <i class="bi bi-justify"></i> 两端
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 尺寸旋转 -->
          <div
            class="toolbar-section collapsible"
            :class="{ collapsed: sizeCollapsed }"
          >
            <h6
              class="section-title section-title-blue"
              @click="sizeCollapsed = !sizeCollapsed"
            >
              <span><i class="bi bi-aspect-ratio"></i> 尺寸与旋转</span>
              <i
                :class="
                  sizeCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-down'
                "
              ></i>
            </h6>
            <div v-if="!sizeCollapsed" class="section-content">
              <div class="dimension-controls">
                <div class="dimension-input-group">
                  <label>宽度</label>
                  <div class="input-group input-group-sm">
                    <input
                      type="number"
                      class="form-control form-control-sm"
                      v-model.number="widthValue"
                      min="10"
                      step="5"
                      @change="onWidthChange"
                    />
                    <span class="input-group-text">px</span>
                  </div>
                </div>
                <div class="dimension-input-group">
                  <label>高度</label>
                  <div class="input-group input-group-sm">
                    <input
                      type="number"
                      class="form-control form-control-sm"
                      v-model.number="heightValue"
                      min="10"
                      step="5"
                      @change="onHeightChange"
                    />
                    <span class="input-group-text">px</span>
                  </div>
                </div>
              </div>
              <div class="style-control-group">
                <label>旋转角度</label>
                <div class="d-flex align-items-center gap-2">
                  <input
                    type="range"
                    class="form-range flex-grow-1"
                    v-model.number="rotationValue"
                    min="0"
                    max="360"
                    @input="onRotationInput"
                  />
                  <span>{{ Math.round(store.selectedElement.rotation) }}°</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 层级操作 -->
          <div
            class="toolbar-section collapsible"
            :class="{ collapsed: layerCollapsed }"
          >
            <h6
              class="section-title section-title-blue"
              @click="layerCollapsed = !layerCollapsed"
            >
              <span><i class="bi bi-layers"></i> 层级操作</span>
              <i
                :class="
                  layerCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-down'
                "
              ></i>
            </h6>
            <div v-if="!layerCollapsed" class="section-content">
              <div class="align-row">
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="onBringFront"
                >
                  <i class="bi bi-arrow-bar-up"></i> 置顶
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="onBringForward"
                >
                  <i class="bi bi-arrow-up"></i> 上移
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="onSendBackward"
                >
                  <i class="bi bi-arrow-down"></i> 下移
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="onSendToBack"
                >
                  <i class="bi bi-arrow-bar-down"></i> 置底
                </button>
              </div>
            </div>
          </div>

          <!-- 快速操作 -->
          <div class="toolbar-section quick-actions">
            <h6 class="section-title section-title-blue">
              <i class="bi bi-lightning-charge"></i> 快速操作
            </h6>
            <div class="quick-actions-grid">
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="store.undo"
              >
                <i class="bi bi-arrow-left"></i> 撤销
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="store.redo"
              >
                <i class="bi bi-arrow-right"></i> 重做
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="onFlipHorizontal"
              >
                <i
                  class="bi bi-arrows-vertical"
                  style="display: inline-block; transform: rotate(90deg)"
                ></i>
                水平翻转
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="onFlipVertical"
              >
                <i class="bi bi-arrows-vertical"></i> 垂直翻转
              </button>
            </div>
            <div class="quick-actions-grid mt-2">
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="store.resetElementPosition"
              >
                <i class="bi bi-arrow-counterclockwise"></i> 重置位置
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="store.selectAllElements"
              >
                <i class="bi bi-check2-all"></i> 全选
              </button>
              <button
                class="btn btn-sm btn-outline-primary"
                @click="onDuplicate"
              >
                <i class="bi bi-copy"></i> 复制
              </button>
              <button class="btn btn-sm btn-outline-danger" @click="onDelete">
                <i class="bi bi-trash"></i> 删除
              </button>
            </div>
            <div class="quick-actions-grid mt-2">
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="onToggleLock"
              >
                <i
                  :class="
                    store.selectedElement.locked ? 'bi bi-unlock' : 'bi bi-lock'
                  "
                ></i>
                {{ store.selectedElement.locked ? '解锁' : '锁定' }}
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="onToggleVisible"
              >
                <i
                  :class="
                    store.selectedElement.visible
                      ? 'bi bi-eye'
                      : 'bi bi-eye-slash'
                  "
                ></i>
                {{ store.selectedElement.visible ? '隐藏' : '显示' }}
              </button>
              <button
                class="btn btn-sm btn-outline-success"
                @click="store.exportElementAsImage"
              >
                <i class="bi bi-download"></i> 导出
              </button>
            </div>
          </div>
        </div>

        <!-- 动画标签页 -->
        <div
          v-if="store.elementToolbarTab === 'animation'"
          class="toolbar-section"
        >
          <h6 class="section-title section-title-blue">
            <i class="bi bi-film"></i> 动画效果
          </h6>
          <div class="style-control-group">
            <label>动画类型</label>
            <select
              class="form-select form-select-sm"
              v-model="animType"
              @change="onAnimTypeChange"
            >
              <option value="none">无动画</option>
              <option value="fade-in">淡入</option>
              <option value="slide-up">上滑进入</option>
              <option value="slide-left">左滑进入</option>
              <option value="scale-in">缩放进入</option>
              <option value="rotate-in">旋转进入</option>
              <option value="bounce-in">弹入</option>
            </select>
          </div>
          <div class="style-control-group">
            <label>动画时长: {{ animDuration }}s</label>
            <input
              type="range"
              class="form-range"
              v-model.number="animDuration"
              min="0.2"
              max="3"
              step="0.1"
              @input="onAnimDurationChange"
            />
          </div>
          <div class="style-control-group">
            <label>延迟时间: {{ animDelay }}s</label>
            <input
              type="range"
              class="form-range"
              v-model.number="animDelay"
              min="0"
              max="2"
              step="0.1"
              @input="onAnimDelayChange"
            />
          </div>
          <div class="style-control-group">
            <label>缓动函数</label>
            <select
              class="form-select form-select-sm"
              v-model="animEasing"
              @change="onAnimEasingChange"
            >
              <option value="ease">ease（默认）</option>
              <option value="ease-in">ease-in（加速）</option>
              <option value="ease-out">ease-out（减速）</option>
              <option value="ease-in-out">ease-in-out（平滑）</option>
              <option value="linear">linear（线性）</option>
            </select>
          </div>
          <div class="style-control-group">
            <button
              class="btn btn-sm btn-outline-primary w-100"
              @click="onPreviewAnimation"
            >
              <i class="bi bi-play-fill"></i> 预览动画
            </button>
          </div>
        </div>

        <!-- 触发标签页 -->
        <div
          v-if="store.elementToolbarTab === 'trigger'"
          class="toolbar-section"
        >
          <h6 class="section-title section-title-blue">
            <i class="bi bi-bell-fill"></i> 触发条件
          </h6>
          <div class="style-control-group">
            <label>触发类型</label>
            <select
              class="form-select form-select-sm"
              v-model="triggerType"
              @change="onTriggerTypeChange"
            >
              <option value="none">无触发</option>
              <option value="load">页面加载时</option>
              <option value="click">点击时</option>
              <option value="hover">悬停时</option>
            </select>
          </div>
          <div class="style-control-group" v-if="triggerType !== 'none'">
            <label>触发动作</label>
            <select
              class="form-select form-select-sm"
              v-model="triggerAction"
              @change="onTriggerActionChange"
            >
              <option value="playAnimation">播放动画</option>
              <option value="show">显示元素</option>
              <option value="toggle">切换显示/隐藏</option>
            </select>
          </div>
          <div class="style-control-group" v-if="triggerType !== 'none'">
            <p class="text-muted" style="font-size: 11px">
              <i class="bi bi-info-circle"></i>
              触发效果在预览模式下生效。编辑模式下不触发。
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- AI 抠图弹窗 -->
  <div
    v-if="showAICutoutModal"
    class="ai-cutout-overlay"
    @click.self="showAICutoutModal = false"
  >
    <div class="ai-cutout-modal">
      <div class="ai-cutout-header">
        <h5><i class="bi bi-magic"></i> AI 智能抠图</h5>
        <button class="btn-close" @click="showAICutoutModal = false"></button>
      </div>
      <div class="ai-cutout-body">
        <div class="mb-3">
          <label class="form-label">AI 模型</label>
          <select class="form-select" v-model="aiModel">
            <option value="gpt-4o">GPT-4o (推荐)</option>
            <option value="removebg-api">remove.bg API</option>
            <option value="clipdrop">ClipDrop</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">提示词（可选）</label>
          <textarea
            class="form-control"
            v-model="aiPrompt"
            rows="3"
            placeholder="例如：仅保留人物，移除背景..."
          ></textarea>
        </div>
        <div class="ai-preview-area">
          <div class="text-center text-muted py-4">
            <i class="bi bi-image" style="font-size: 48px"></i>
            <p class="mt-2">选择图片后将在此处预览</p>
          </div>
        </div>
      </div>
      <div class="ai-cutout-footer">
        <button class="btn btn-secondary" @click="showAICutoutModal = false">
          取消
        </button>
        <button class="btn btn-primary" @click="onAICutoutConfirm">
          <i class="bi bi-magic"></i> 开始抠图
        </button>
      </div>
    </div>
  </div>

  <ImageCropper
    v-if="showImageCropper"
    :visible="showImageCropper"
    :image-url="cropperImageUrl"
    :initial-crop="cropInitialData"
    :initial-shape="cropInitialShape"
    @confirm="onCropConfirm"
    @close="showImageCropper = false"
  />
  <!-- 多选工具栏 -->
  <div
    v-if="store.elementToolbarVisible && store.selectedElementIds.length > 1"
    class="element-toolbar-container visible"
    :style="toolbarStyle"
  >
    <div class="drag-handle" @mousedown="onDragHandleMouseDown">
      <i class="bi bi-grip-vertical"></i>
    </div>
    <div class="element-toolbar">
      <div class="toolbar-header" @mousedown="onHeaderMouseDown">
        <i class="bi bi-collection"></i>
        <span class="element-type"
          >多选（{{ store.selectedElementIds.length }} 个元素）</span
        >
        <button class="btn-close-toolbar" @click.stop="onClose">
          <i class="bi bi-x"></i>
        </button>
      </div>
      <div class="toolbar-content" style="padding: 8px">
        <div class="d-flex gap-2 flex-wrap">
          <button
            class="btn btn-sm btn-outline-secondary"
            @click="store.groupElements()"
          >
            <i class="bi bi-collection-plus"></i> 组合
          </button>
          <button
            class="btn btn-sm btn-outline-secondary"
            @click="store.bulkDelete()"
          >
            <i class="bi bi-trash2"></i> 批量删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
