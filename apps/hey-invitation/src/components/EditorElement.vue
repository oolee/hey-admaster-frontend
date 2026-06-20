<template>
  <div
    ref="rootRef"
    class="design-element"
    :element-id="element.id"
    :class="{
      selected: isSelected && !isPreview,
      locked: element.locked,
      hidden: !element.visible,
      'is-text': element.type === 'text',
      'is-decoration': element.type === 'decoration',
      'is-image': element.type === 'image',
      'is-border': element.type === 'border',
      'is-icon': element.type === 'icon',
      'is-group': element.type === 'group',
    }"
    :style="elementStyle"
    @mousedown="onMouseDown"
    @contextmenu.prevent="onContextMenu"
    @click.stop="onClick($event); onTriggerClick()"
    @mouseenter="onTriggerHover(true)"
    @mouseleave="onTriggerHover(false)"
  >
    <!-- 元素内容 -->
    <div class="design-element-body" :style="contentStyle" @dblclick="onDblClick">
      <!-- 文本元素 -->
      <template v-if="element.type === 'text'">
        <div
          class="text-content"
          :contenteditable="isTextEditing ? 'true' : 'false'"
          :class="{ 'editing': isTextEditing }"
          @dblclick.stop="startTextEdit"
          @blur="endTextEdit"
          @keydown="onTextKeydown"
          :style="{
            fontFamily: element.fontFamily || 'Microsoft YaHei',
            fontSize: (element.fontSize || 16) + 'px',
            fontWeight: element.fontWeight || 'normal',
            textAlign: (element.textAlign as any) || 'center',
            justifyContent:
              (element.textAlign as any) === 'left'
                ? 'flex-start'
                : (element.textAlign as any) === 'right'
                  ? 'flex-end'
                  : (element.textAlign as any) === 'justify'
                    ? 'space-between'
                    : 'center',
            color: element.textColor || '#333333',
          }"
        >
          {{ element.text || '请输入文字' }}
        </div>
      </template>

      <!-- 装饰元素 -->
      <template v-if="element.type === 'decoration'">
        <div
          class="decoration-content"
          :style="{
            fontSize: (element.decorationSize || 32) + 'px',
            color: element.decorationColor || '#ff6b6b',
          }"
        >
          <i :class="getDecorationIconClass()"></i>
        </div>
      </template>

      <!-- 图片元素 -->
      <template v-if="element.type === 'image'">
        <div class="image-content" :style="imageContentStyle">
          <img v-if="element.imageUrl" :src="element.imageUrl" :style="imageStyle" draggable="false" />
          <div v-else class="image-placeholder">
            <i class="bi bi-image"></i>
            <p>请添加图片</p>
          </div>
        </div>
      </template>

      <!-- 边框元素 -->
      <template v-if="element.type === 'border'">
        <div
          class="border-content"
          :style="{
            borderColor: (element as any).borderColor || '#4b5563',
            borderWidth: ((element as any).borderWidth || 2) + 'px',
            borderStyle: (element as any).borderStyle || 'solid',
            borderRadius: ((element as any).borderRadius || 0) + 'px',
          }"
        >
          <i :class="getBorderIconClass()"></i>
        </div>
      </template>

      <!-- 图标元素 -->
      <template v-if="element.type === 'icon'">
        <div
          class="icon-content"
          :style="{
            fontSize: ((element as any).iconSize || 32) + 'px',
            color: (element as any).iconColor || '#333333',
          }"
        >
          <i :class="getIconIconClass()"></i>
        </div>
      </template>

      <!-- 组合元素背景/边框 -->
      <div v-if="element.type === 'group'" class="group-overlay" :style="groupOverlayStyle"></div>
      <!-- 组合元素：递归渲染 children -->
      <template v-if="element.type === 'group' && element.children && element.children.length">
        <div
          v-for="child in element.children"
          :key="child.id"
          class="group-child-wrapper"
        >
          <EditorElement :element="child" :preview="preview" />
        </div>
      </template>
    </div>

    <!-- 选中并锁定时：显示小锁图标 -->
    <template v-if="isSelected && element.locked">
      <div class="lock-indicator">
        <i class="bi bi-lock-fill"></i>
      </div>
    </template>

    <!-- 选中时的锚点（缩放 + 旋转） -->
    <template v-if="isSelected && !element.locked">
      <!-- 4 条边线 + 矩形手柄 -->
      <div class="line line-n" @mousedown.stop="startResize('n', $event)">
        <div class="rect"></div>
      </div>
      <div class="line line-s" @mousedown.stop="startResize('s', $event)">
        <div class="rect"></div>
      </div>
      <div class="line line-e" @mousedown.stop="startResize('e', $event)">
        <div class="rect"></div>
      </div>
      <div class="line line-w" @mousedown.stop="startResize('w', $event)">
        <div class="rect"></div>
      </div>

      <!-- 4 个圆形角点 -->
      <div class="circle circle-nw" @mousedown.stop="startResize('nw', $event)"></div>
      <div class="circle circle-ne" @mousedown.stop="startResize('ne', $event)"></div>
      <div class="circle circle-sw" @mousedown.stop="startResize('sw', $event)"></div>
      <div class="circle circle-se" @mousedown.stop="startResize('se', $event)"></div>

      <!-- 旋转连接线 + 居中参考线 + 旋转锚点（仅旋转过程中靠近特殊角度时显示参考线） -->
      <div class="rotate-line"></div>
      <div class="bar-m-line" :style="{ display: isRotating && isSpecialAngle ? 'block' : 'none' }"></div>
      <div class="rotate-circle" @mousedown.stop="startRotate($event)">
        <span class="rotate-icon"></span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useEditorStore } from '../store/editor';
import type { EditorElement } from '../types/editor';

const props = defineProps<{ element: EditorElement; preview?: boolean }>();

const store = useEditorStore();
const isPreview = computed(() => !!props.preview);
const isSelected = computed(() => store.isElementSelected(props.element.id));
const isTextEditing = ref(false);
const isMultiDrag = ref(false);

// 特殊角度列表
const SPECIAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const SNAP_THRESHOLD = 5;

// 是否为特殊角度（0/45/90/135/180/225/270/315）
const isSpecialAngle = computed(() => {
  const r = Math.round(props.element.rotation || 0);
  return SPECIAL_ANGLES.includes(r);
});

// 双击进入文本编辑
const startTextEdit = () => {
  if (props.element.type !== 'text') return;
  isTextEditing.value = true;
  setTimeout(() => {
    const el = document.querySelector(`.design-element[element-id="${props.element.id}"] .text-content`) as HTMLElement;
    if (el && el.focus) el.focus();
  }, 0);
};

// 结束文本编辑
const endTextEdit = () => {
  if (!isTextEditing.value) return;
  isTextEditing.value = false;
  const el = document.querySelector(`.design-element[element-id="${props.element.id}"] .text-content`) as HTMLElement;
  if (el) {
    const newText = el.innerText || el.textContent || '';
    if (newText !== props.element.text) {
      store.updateElement(props.element.id, { text: newText });
    }
  }
};

// 文本编辑按键处理：Enter 保存，Esc 取消
const onTextKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    endTextEdit();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    isTextEditing.value = false;
  }
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const elementStyle = computed(() => {
  const bg = props.element.backgroundColor || 'transparent';
  const opacity = props.element.backgroundOpacity ?? 1;
  const isTemporaryTop = store.temporaryTopElementId === props.element.id;
  let backgroundColor: string = bg;
  if (bg && bg !== 'transparent') {
    const rgb = hexToRgb(bg);
    if (rgb) {
      backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    } else if (bg.startsWith('rgb(') || bg.startsWith('rgba(')) {
      backgroundColor = bg;
    }
  }
  const sx = props.element.flip?.horizontal ? -1 : 1;
  const sy = props.element.flip?.vertical ? -1 : 1;
  // 动画样式：仅在预览模式下自动应用
  let animationCss = '';
  if (isPreview.value && props.element.animation && props.element.animation.type !== 'none') {
    const a = props.element.animation;
    animationCss = `${a.type} ${a.duration}s ${a.easing} ${a.delay}s both`;
  }
  return {
    position: 'absolute' as const,
    left: props.element.x + 'px',
    top: props.element.y + 'px',
    width: props.element.width + 'px',
    height: props.element.height + 'px',
    transform: `rotate(${props.element.rotation}deg)`,
    zIndex: isTemporaryTop ? 2147483647 : props.element.zIndex,
    backgroundColor,
    opacity: props.element.visible ? 1 : 0,
    visibility: (props.element.visible ? 'visible' : 'hidden') as any,
    animation: animationCss || undefined,
    borderColor: props.element.borderColor || undefined,
    borderWidth: props.element.borderWidth ? props.element.borderWidth + 'px' : undefined,
    borderStyle: props.element.borderStyle || undefined,
    borderRadius: props.element.borderRadius ? props.element.borderRadius + 'px' : undefined,
  };
});

// group style overlay
const groupOverlayStyle = computed(() => {
  if (props.element.type !== 'group') return {};
  const el = props.element;
  const style: Record<string, string> = {};
  if (el.groupBackgroundColor && el.groupBackgroundColor !== 'transparent') {
    style.backgroundColor = el.groupBackgroundColor;
  }
  const bs = el.groupBorderStyle || 'none';
  if (bs !== 'none') {
    style.border = (el.groupBorderWidth || 1) + 'px ' + bs + ' ' + (el.groupBorderColor || '#0d6efd');
  }
  return style;
});

const contentStyle = computed(() => {
  const sx = props.element.flip?.horizontal ? -1 : 1;
  const sy = props.element.flip?.vertical ? -1 : 1;
  // 图片的翻转已在 imageStyle 的 <img> 上处理，此处不重复
  const isImage = props.element.type === 'image';
  return {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative' as const,
    transform: isImage ? undefined : `scaleX(${sx}) scaleY(${sy})`,
  };
});

// ========== 图片元素（形状裁切作用在容器上，而非img上）==========
// 形状裁切（border-radius / clip-path）应用在 .image-content 容器上，
// 确保裁切工具裁切过的图片，形状效果正确作用在裁切区域内
const imageContentStyle = computed(() => {
  const el = props.element;
  const subType = el.subType;
  if (subType === 'frame') {
    return { padding: '10px', border: '3px solid #d4a574' } as any;
  }
  if (subType === 'gallery') {
    return { padding: '6px', border: '2px solid #8b7355', background: '#fafafa' } as any;
  }

  const crop = el.imageCrop || 'none';
  let borderRadius = '0';
  let clipPath = '';
  if (crop === 'circle' || crop === 'ellipse') borderRadius = '50%';
  else if (crop === 'rounded') borderRadius = '12px';
  else if (crop === 'flower') borderRadius = '40% 60% 30% 70% / 60% 40% 70% 30%';
  else if (crop === 'heart') clipPath = 'path("M 50,30 A 20,20 0 0,1 90,30 A 20,20 0 0,1 50,85 A 20,20 0 0,1 10,30 A 20,20 0 0,1 50,30 Z")';
  else if (crop === 'diamond') clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
  else if (crop === 'star') clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
  else if (crop === 'pentagon') clipPath = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
  else if (crop === 'triangle') clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
  else if (crop === 'hexagon') clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';

  return {
    overflow: 'hidden',
    position: 'relative' as const,
    borderRadius: borderRadius,
    clipPath: clipPath || undefined,
  };
});

const imageStyle = computed(() => {
  const el = props.element;
  const sx = el.flip?.horizontal ? -1 : 1;
  const sy = el.flip?.vertical ? -1 : 1;
  const filter = el.imageFilter || 'original';
  let filterCss = 'none';
  if (filter === 'grayscale') filterCss = 'grayscale(1)';
  else if (filter === 'sepia') filterCss = 'sepia(0.8)';
  else if (filter === 'blur') filterCss = 'blur(2px)';
  else if (filter === 'brightness') filterCss = 'brightness(1.3)';
  else if (filter === 'contrast') filterCss = 'contrast(1.3)';

  // mask: non-destructive crop region (image positioned inside wrapper)
  if (el.cropW && el.cropW > 0 && el.cropW < 0.99) {
    const cropW = el.cropW;
    const cropH = (el.cropH && el.cropH > 0) ? el.cropH : cropW;
    const cropX = el.cropX || 0;
    const cropY = el.cropY || 0;
    const fullW = 100 / cropW;
    const fullH = 100 / cropH;
    const left = -(cropX) / cropW * 100;
    const top = -(cropY) / cropH * 100;
    return {
      position: 'absolute' as const,
      left: left + '%',
      top: top + '%',
      width: fullW + '%',
      height: fullH + '%',
      display: 'block' as const,
      transform: `scale(${sx}, ${sy})`,
      filter: filterCss,
    };
  }

  return {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block' as const,
    transform: `scale(${sx}, ${sy})`,
    filter: filterCss,
  };
});

// 装饰图标映射
const getDecorationIconClass = () => {
  const map: Record<string, string> = {
    heart: 'bi bi-heart-fill',
    flower: 'bi bi-flower1',
    ring: 'bi bi-circle',
    star: 'bi bi-star-fill',
    music: 'bi bi-music-note-beamed',
    bell: 'bi bi-bell-fill',
  };
  return map[props.element.subType || 'heart'] || 'bi bi-heart-fill';
};

// 边框图标映射
const getBorderIconClass = () => {
  const map: Record<string, string> = {
    simple: 'bi bi-rectangle',
    ornate: 'bi bi-square',
    rounded: 'bi bi-circle',
  };
  return map[props.element.subType || 'simple'] || 'bi bi-rectangle';
};

// 图标元素映射
const getIconIconClass = () => {
  const map: Record<string, string> = {
    map: 'bi bi-geo-alt-fill',
    time: 'bi bi-clock-fill',
    qr: 'bi bi-upc-scan',
    phone: 'bi bi-telephone-fill',
  };
  return map[props.element.subType || 'map'] || 'bi bi-geo-alt-fill';
};

// 选中元素
const onClick = (e: MouseEvent) => {
  if (isPreview.value) return;
  // 如果元素是组内子元素，向上走到顶层父组
  const found = store.findElement(props.element.id);
  let topGroup = found.parentEl;
  while (topGroup && topGroup.type === 'group') {
    const next = store.findElement(topGroup.id);
    if (next.parentEl && next.parentEl.type === 'group') {
      topGroup = next.parentEl;
    } else {
      break;
    }
  }
  if (topGroup && topGroup.type === 'group') {
    // Ctrl+click: toggle top group instead of single-select
    if (e && (e.ctrlKey || e.metaKey)) {
      store.toggleSelectElement(topGroup.id);
    } else {
      store.selectElement(topGroup.id);
    }
    return;
  }
  // Alt+click: 基于鼠标位置穿透选择
  if (e && e.altKey) {
    store.selectElementAtPosition(props.element.id, e.clientX, e.clientY);
  } else if (e && (e.ctrlKey || e.metaKey)) {
    store.temporaryTopElementId = null;
    // Ctrl+click: 切换多选
    store.toggleSelectElement(props.element.id);
  } else {
    store.temporaryTopElementId = null;
    store.selectElement(props.element.id);
  }
};

// 双击编辑文本（通用 fallback）
const onDblClick = () => {
  if (isPreview.value) return;
  if (props.element.type === 'text') {
    startTextEdit();
  }
};

// 右键菜单（修复 Bug4: 多选时右键不清除其他选中元素）
const onContextMenu = (e: MouseEvent) => {
  if (isPreview.value) return;
  // 如果当前已经是多选状态且此元素在多选中：保持选中集合不变，仅显示右键菜单
  const isInMultiSelection =
    store.selectedElementIds.length > 1 && store.isElementSelected(props.element.id);
  if (!isInMultiSelection) {
    store.selectElement(props.element.id);
  }
  store.showContextMenu(e.clientX, e.clientY, props.element.id);
};

// ========== 元素拖动 ==========
const isDragging = ref(false);
let dragHasMoved = false;
let dragStartX = 0;
let dragStartY = 0;
let elementStartX = 0;
let elementStartY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let redirectedGroupId: string | null = null; // 记录点击组内子元素时重定向到的父组 ID

const onMouseDown = (e: MouseEvent) => {
  if (isPreview.value) return;
  if (props.element.locked) return;
  if (e.button !== 0) return;
  redirectedGroupId = null;
  // Ctrl/Alt+click 时不重置选择，让 onClick 处理
  if (e.ctrlKey || e.metaKey || e.altKey) {
    isMultiDrag.value = store.selectedElementIds.length > 0;
  } else {
    // 如果当前元素是组内子元素，向上走到顶层父组
    const found = store.findElement(props.element.id);
    let topGroup = found.parentEl;
    while (topGroup && topGroup.type === 'group') {
      const next = store.findElement(topGroup.id);
      if (next.parentEl && next.parentEl.type === 'group') {
        topGroup = next.parentEl;
      } else {
        break;
      }
    }
    if (topGroup && topGroup.type === 'group') {
      store.selectElement(topGroup.id);
      redirectedGroupId = topGroup.id;
      // 使用父组的位置作为拖拽起点
      elementStartX = topGroup.x;
      elementStartY = topGroup.y;
    } else if (!store.isElementSelected(props.element.id)) {
      store.selectElement(props.element.id);
      isMultiDrag.value = false;
      elementStartX = props.element.x;
      elementStartY = props.element.y;
    } else {
      isMultiDrag.value = store.selectedElementIds.length > 1;
      elementStartX = props.element.x;
      elementStartY = props.element.y;
    }
  }
  if (!redirectedGroupId) {
    elementStartX = props.element.x;
    elementStartY = props.element.y;
  }
  isDragging.value = true;
  dragHasMoved = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  document.addEventListener('mousemove', onElementDrag);
  document.addEventListener('mouseup', onElementDragEnd);
};

const onElementDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  dragHasMoved = true;
  const targetId = redirectedGroupId || props.element.id;
  if (isMultiDrag.value) {
    // 多元素拖动：按增量移动所有选中元素
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    store.moveSelectedElements(dx, dy);
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  } else {
    // 单元素拖动：不再限制边界，允许拖出画布
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const newX = elementStartX + dx;
    const newY = elementStartY + dy;
    store.updateElement(targetId, { x: newX, y: newY });
  }
};

const onElementDragEnd = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onElementDrag);
  document.removeEventListener('mouseup', onElementDragEnd);
  if (dragHasMoved) {
    dragHasMoved = false;
    const label = isMultiDrag.value ? '移动多个元素' : '移动元素';
    store.saveHistory(label);
  }
  isMultiDrag.value = false;
};

// ========== 元素缩放（严格参考 JS 代码：editor-elements.js 2520-2769 行 setupSelectorResize）==========
// JS 参考算法核心（严格对齐，行号对应 JS 源文件）：
// 2530: resizePoints = [
//         { selector: '.line-n', edges: { top: true } },
//         { selector: '.line-e', edges: { right: true } },
//         { selector: '.line-s', edges: { bottom: true } },
//         { selector: '.line-w', edges: { left: true } },
//         { selector: '.circle-nw', edges: { top: true, left: true } },
//         { selector: '.circle-ne', edges: { top: true, right: true } },
//         { selector: '.circle-se', edges: { bottom: true, right: true } },
//         { selector: '.circle-sw', edges: { bottom: true, left: true } }
//       ]
// 2542: if (elementData.type === 'text') → 保留角点，过滤掉上下边锚点（只保留左右边）
// 2649: isProportionalResize = Object.keys(edges).length === 2  // 2条边=角点=等比例
// 2655: if (isProportionalResize && element.type !== 'text') {
//         scaleX = (startWidth + (right ? deltaX : -deltaX)) / startWidth  // 2660-2661
//         scaleY = (startHeight + (bottom ? deltaY : -deltaY)) / startHeight // 2663-2664
//         scale = Math.max(scaleX, scaleY)                                    // 2668
//         newWidth = startWidth * scale                                        // 2671
//         newHeight = startHeight * scale                                      // 2672
//         if (left) newX = startX - (newWidth - startWidth)                   // 2675-2676
//         if (top)  newY = startY - (newHeight - startHeight)                 // 2678-2679
//       } else {
// 2684:   if (left)   { newWidth -= deltaX; newX += deltaX; }
// 2688:   if (right)  { newWidth += deltaX; }
// 2691:   if (top)    { newHeight -= deltaY; newY += deltaY; }
// 2695:   if (bottom) { newHeight += deltaY; }
//       }
// 2754: newWidth = Math.max(20, newWidth)   // 最小尺寸在所有计算完成后应用
// 2755: newHeight = Math.max(20, newHeight)
//
// 关键点（与之前错误实现的差异）：
//   - Math.max(0.1, scale) 不要在中间做，让 scale 自然计算
//   - Math.max(20, newWidth) 必须在所有 width/height/position 计算完成之后再做
//   - 角点(nw/ne/sw/se)对所有非文本元素做等比例缩放
//   - 边点(n/s/e/w) + 文本元素角点：自由缩放
//   - 从左/上调整时，同步更新 x/y 以保持对侧顶点不动
//   - 图片元素：img style.object-fit = 'cover'，图片完整填满容器
const isResizing = ref(false);
let resizeHasMoved = false;
let resizeDirection = '';
let resizeStartWidth = 0;
let resizeStartHeight = 0;
let resizeStartX = 0;
let resizeStartY = 0;
let mouseStartX = 0;
let mouseStartY = 0;

const startResize = (direction: string, e: MouseEvent) => {
  if (props.element.locked) return;
  if (isPreview.value) return;
  e.preventDefault();
  e.stopPropagation();
  isResizing.value = true;
  resizeHasMoved = false;
  resizeDirection = direction;
  mouseStartX = e.clientX;
  mouseStartY = e.clientY;
  resizeStartWidth = props.element.width;
  resizeStartHeight = props.element.height;
  resizeStartX = props.element.x;
  resizeStartY = props.element.y;
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', onResizeEnd);
};

const onResizeMove = (e: MouseEvent) => {
  if (!isResizing.value) return;
  resizeHasMoved = true;

  // 2640-2641: deltaX = e.clientX - resizeStartX; deltaY = e.clientY - resizeStartY
  const deltaX = e.clientX - mouseStartX;
  const deltaY = e.clientY - mouseStartY;

  // 2643-2646: 初始化新值为起始值
  let newWidth = resizeStartWidth;
  let newHeight = resizeStartHeight;
  let newX = resizeStartX;
  let newY = resizeStartY;

  // 2649: 角点 = 2 条边同时调整 = 等比例
  // map direction → edges（与 JS resizePoints 一一对应）
  const edges: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean } = {};
  if (resizeDirection.includes('w')) edges.left = true;
  if (resizeDirection.includes('e')) edges.right = true;
  if (resizeDirection.includes('n')) edges.top = true;
  if (resizeDirection.includes('s')) edges.bottom = true;
  const isProportionalResize = Object.keys(edges).length === 2;

  // 2655: 等比例缩放（角点 + 非文本元素）
  if (isProportionalResize && props.element.type !== 'text') {
    // 2660-2661: 计算 scaleX
    let scaleX = 1;
    let scaleY = 1;
    if (edges.left || edges.right) {
      scaleX = (resizeStartWidth + (edges.right ? deltaX : -deltaX)) / resizeStartWidth;
    }
    // 2663-2664: 计算 scaleY
    if (edges.top || edges.bottom) {
      scaleY = (resizeStartHeight + (edges.bottom ? deltaY : -deltaY)) / resizeStartHeight;
    }
    // 2668: 使用最大缩放比例（注意：JS 无 Math.max(0.1, …)，直接用 max(scaleX, scaleY)）
    const scale = Math.max(scaleX, scaleY);
    // 2671-2672: 计算新宽高
    newWidth = resizeStartWidth * scale;
    newHeight = resizeStartHeight * scale;
    // 2675-2676: 如果是左边，调整 x 位置保持右侧顶点不动
    if (edges.left) {
      newX = resizeStartX - (newWidth - resizeStartWidth);
    }
    // 2678-2679: 如果是上边，调整 y 位置保持底部顶点不动
    if (edges.top) {
      newY = resizeStartY - (newHeight - resizeStartHeight);
    }
  } else {
    // 2682: 自由缩放（边点 + 文本元素角点）
    // 2684-2686: left → 宽度减 dx，位置加 dx（保持右边缘不动）
    if (edges.left) {
      newWidth -= deltaX;
      newX += deltaX;
    }
    // 2688-2689: right → 宽度加 dx
    if (edges.right) {
      newWidth += deltaX;
    }
    // 2691-2693: top → 高度减 dy，位置加 dy
    if (edges.top) {
      newHeight -= deltaY;
      newY += deltaY;
    }
    // 2695-2696: bottom → 高度加 dy
    if (edges.bottom) {
      newHeight += deltaY;
    }
  }

  // 2754-2755: 最小尺寸限制 — 在所有位置计算完成后应用
  newWidth = Math.max(20, newWidth);
  newHeight = Math.max(20, newHeight);

  // 2766-2769: 更新数据
  store.updateElement(props.element.id, {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  });
};

const onResizeEnd = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
  if (resizeHasMoved) {
    resizeHasMoved = false;
    store.saveHistory('调整元素尺寸');
  }
};

// ========== 元素旋转 ==========
const isRotating = ref(false);
let rotateHasMoved = false;
let rotateStartAngle = 0;
let rotateStartRotation = 0;
let rotateCenterX = 0;
let rotateCenterY = 0;

const startRotate = (e: MouseEvent) => {
  if (props.element.locked) return;
  e.preventDefault();
  e.stopPropagation();
  isRotating.value = true;
  rotateHasMoved = false;
  const target = e.target as HTMLElement;
  const parent = target.closest('.design-element') as HTMLElement;
  const rect = parent.getBoundingClientRect();
  rotateCenterX = rect.left + rect.width / 2;
  rotateCenterY = rect.top + rect.height / 2;
  rotateStartAngle = Math.atan2(e.clientY - rotateCenterY, e.clientX - rotateCenterX) * (180 / Math.PI);
  rotateStartRotation = props.element.rotation;
  document.addEventListener('mousemove', onRotateMove);
  document.addEventListener('mouseup', onRotateEnd);
};

const onRotateMove = (e: MouseEvent) => {
  if (!isRotating.value) return;
  rotateHasMoved = true;
  const currentAngle = Math.atan2(e.clientY - rotateCenterY, e.clientX - rotateCenterX) * (180 / Math.PI);
  let newRotation = rotateStartRotation + (currentAngle - rotateStartAngle);
  newRotation = Math.round(((newRotation % 360) + 360) % 360);

  // 特殊角度吸附（吸附阈值：SNAP_THRESHOLD 度）
  for (const sa of SPECIAL_ANGLES) {
    const diff = Math.min(
      Math.abs(newRotation - sa),
      Math.abs(newRotation - sa + 360),
      Math.abs(newRotation - sa - 360)
    );
    if (diff <= SNAP_THRESHOLD) {
      newRotation = sa;
      break;
    }
  }

  store.updateElement(props.element.id, { rotation: newRotation });
};

const onRotateEnd = () => {
  isRotating.value = false;
  document.removeEventListener('mousemove', onRotateMove);
  document.removeEventListener('mouseup', onRotateEnd);
  if (rotateHasMoved) {
    rotateHasMoved = false;
    store.saveHistory('旋转元素');
  }
};

// ============ 预览动画事件 ============
const handlePreviewAnimation = (e: Event) => {
  const customEvt = e as CustomEvent;
  if (customEvt.detail?.elementId === props.element.id) {
    const el = rootRef.value;
    if (el && props.element.animation && props.element.animation.type !== 'none') {
      const a = props.element.animation;
      const anim = `${a.type} ${a.duration}s ${a.easing} ${a.delay}s both`;
      el.style.animation = 'none';
      el.offsetHeight; // 强制回流
      el.style.animation = anim;
    }
  }
};

onMounted(() => {
  window.addEventListener('preview-animation', handlePreviewAnimation);
});

onUnmounted(() => {
  window.removeEventListener('preview-animation', handlePreviewAnimation);
});

const rootRef = ref<HTMLElement | null>(null);

// ============ 触发逻辑 ============
const onTriggerClick = () => {
  if (!isPreview.value) return;
  const el = props.element;
  if (el.trigger?.type === 'click') {
    if (el.trigger.action === 'playAnimation') {
      const dom = rootRef.value;
      if (dom && el.animation && el.animation.type !== 'none') {
        const a = el.animation;
        const anim = `${a.type} ${a.duration}s ${a.easing} ${a.delay}s both`;
        dom.style.animation = 'none';
        dom.offsetHeight;
        dom.style.animation = anim;
      }
    }
  }
};

const onTriggerHover = (entering: boolean) => {
  if (!isPreview.value) return;
  const el = props.element;
  if (el.trigger?.type === 'hover') {
    if (el.trigger.action === 'show') {
      store.updateElement(el.id, { visible: entering });
    }
  }
};
</script>
