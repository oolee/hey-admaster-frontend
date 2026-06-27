<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import html2canvas from 'html2canvas';

import { useEditorStore } from '../store/editor';
import EditorElement from './EditorElement.vue';
import RightToolbar from './RightToolbar.vue';

const props = defineProps<{ preview?: boolean }>();
const isPreview = computed(() => !!props.preview);

const store = useEditorStore();
const audioRef = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);
const isPageTurning = ref(false);
const deviceScreenRef = ref<HTMLElement | null>(null);
const canvasWrapperRef = ref<HTMLElement | null>(null);
let debounceTimer: any = null;

// ===== 布局常量：所有 guide/phone-frame 相对 canvas-wrapper 的 padding box 定位 =====
// canvas-wrapper padding
const WRAPPER_PAD_X = 0;
const WRAPPER_PAD_Y = 0;
// 画布外框虚线向外延伸 8px
const GUIDE_BORDER_OUTSET = 0;
// 安全区参考线左右延伸 24px
const GUIDE_LINE_OUTSET = 24;
// 手机边框厚度
const PHONE_BORDER_THICKNESS = 12;

// device-mockup：固定 canvasWidth × canvasHeight，纯内容容器，不产生层叠上下文
// （它自身的 position: relative 仅服务于内部的元素、marquee 等子元素定位，不设 z-index）
const deviceMockupStyle = computed(() => ({
  width: `${store.canvasWidth}px`,
  height: `${store.canvasHeight}px`,
  background:
    store.currentPage?.backgroundColor &&
    store.currentPage.backgroundColor !== 'transparent'
      ? store.currentPage.backgroundColor
      : '#ffffff',
  overflow: 'visible' as const,
}));

// 手机边框装饰层：比画布大一圈（向外 12px），独立于内容，不遮挡元素
// sortedCanvasElements zIndex
const sortedCanvasElements = computed(() =>
  [...(store.currentPage?.elements || [])].toSorted(
    (a, b) => b.zIndex - a.zIndex,
  ),
);

const phoneFrameStyle = computed(() => ({
  position: 'absolute' as const,
  left: `${WRAPPER_PAD_X - PHONE_BORDER_THICKNESS}px`,
  top: `${WRAPPER_PAD_Y - PHONE_BORDER_THICKNESS}px`,
  width: `${store.canvasWidth + PHONE_BORDER_THICKNESS * 2}px`,
  height: `${store.canvasHeight + PHONE_BORDER_THICKNESS * 2}px`,
  border: `${PHONE_BORDER_THICKNESS}px solid #1a1a1a`,
  borderRadius: '20px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
  pointerEvents: 'none' as const,
  boxSizing: 'border-box' as const,
  zIndex: 5, // 在 guide-border 之上，但在画布内容之下
}));

// 画布外框虚线（淡红色）：比画布大一圈（向外 8px），精准框出 320×628 区域
const guideBorderStyle = computed(() => ({
  position: 'absolute' as const,
  left: `${WRAPPER_PAD_X - GUIDE_BORDER_OUTSET}px`,
  top: `${WRAPPER_PAD_Y - GUIDE_BORDER_OUTSET}px`,
  width: `${store.canvasWidth + GUIDE_BORDER_OUTSET * 2}px`,
  height: `${store.canvasHeight + GUIDE_BORDER_OUTSET * 2}px`,
  pointerEvents: 'none' as const,
  boxSizing: 'border-box' as const,
  zIndex: 100, // 最上层，始终可见，不遮挡任何内容
}));

// 小屏安全区上参考线（灰色）
const safeLineTopStyle = computed(() => ({
  position: 'absolute' as const,
  left: `${WRAPPER_PAD_X - GUIDE_LINE_OUTSET}px`,
  top: `${(store.canvasHeight - store.safeAreaHeight) / 2 + WRAPPER_PAD_Y}px`,
  width: `${store.canvasWidth + GUIDE_LINE_OUTSET * 2}px`,
  height: '0px',
  pointerEvents: 'none' as const,
  zIndex: 100, // 画布下方但略高于外框虚线，视觉层次清晰
}));

// 小屏安全区下参考线（灰色）
const safeLineBottomStyle = computed(() => ({
  position: 'absolute' as const,
  left: `${WRAPPER_PAD_X - GUIDE_LINE_OUTSET}px`,
  top: `${
    (store.canvasHeight - store.safeAreaHeight) / 2 +
    store.safeAreaHeight +
    WRAPPER_PAD_Y
  }px`,
  width: `${store.canvasWidth + GUIDE_LINE_OUTSET * 2}px`,
  height: '0px',
  pointerEvents: 'none' as const,
  zIndex: 100,
}));

// ===== 框选 (marquee selection) =====
const isMarqueeActive = ref(false);
const marqueeStartX = ref(0);
const marqueeStartY = ref(0);
const marqueeCurrentX = ref(0);
const marqueeCurrentY = ref(0);
let marqueeActuallyDragged = false;
let marqueeJustFinished = false;
let marqueeWrapperRect: null | {
  height: number;
  left: number;
  top: number;
  width: number;
} = null;

const marqueeStyle = computed(() => {
  if (!marqueeWrapperRect) return { display: 'none' };
  const left =
    Math.min(marqueeStartX.value, marqueeCurrentX.value) -
    marqueeWrapperRect.left;
  const top =
    Math.min(marqueeStartY.value, marqueeCurrentY.value) -
    marqueeWrapperRect.top;
  const width = Math.abs(marqueeCurrentX.value - marqueeStartX.value);
  const height = Math.abs(marqueeCurrentY.value - marqueeStartY.value);
  return {
    position: 'absolute' as const,
    left: `${left}px`,
    top: `${top}px`,
    width: `${Math.max(2, width)}px`,
    height: `${Math.max(2, height)}px`,
    pointerEvents: 'none' as const,
    zIndex: 9999,
  };
});

const onMarqueeStart = (e: MouseEvent) => {
  if (isPreview.value) return;
  if (e.button !== 0) return;
  const target = e.target as HTMLElement;
  if (target.closest('.design-element')) return;
  if (target.closest('.audio-icon-container')) return;

  marqueeStartX.value = e.clientX;
  marqueeStartY.value = e.clientY;
  marqueeCurrentX.value = marqueeStartX.value;
  marqueeCurrentY.value = marqueeStartY.value;
  marqueeActuallyDragged = false;

  const wrapper =
    canvasWrapperRef.value ||
    ((e.currentTarget as HTMLElement).querySelector(
      '.canvas-wrapper',
    ) as HTMLElement);
  if (wrapper) {
    const rect = wrapper.getBoundingClientRect();
    marqueeWrapperRect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  } else {
    marqueeWrapperRect = { left: 0, top: 0, width: 0, height: 0 };
  }

  isMarqueeActive.value = true;
  document.addEventListener('mousemove', onMarqueeMove);
  document.addEventListener('mouseup', onMarqueeUp);
  e.preventDefault();
};

const onMarqueeMove = (e: MouseEvent) => {
  if (!isMarqueeActive.value) return;
  marqueeCurrentX.value = e.clientX;
  marqueeCurrentY.value = e.clientY;

  const dist =
    Math.abs(marqueeCurrentX.value - marqueeStartX.value) +
    Math.abs(marqueeCurrentY.value - marqueeStartY.value);
  if (dist < 3) return;
  marqueeActuallyDragged = true;

  const mLeft = Math.min(marqueeStartX.value, marqueeCurrentX.value);
  const mTop = Math.min(marqueeStartY.value, marqueeCurrentY.value);
  const mRight = Math.max(marqueeStartX.value, marqueeCurrentX.value);
  const mBottom = Math.max(marqueeStartY.value, marqueeCurrentY.value);

  const page = store.currentPage;
  if (!page) return;

  const elementsDom = document.querySelectorAll('.design-element');
  const selectedIds: string[] = [];
  for (let i = 0; i < elementsDom.length; i++) {
    const el = elementsDom[i] as HTMLElement;
    const rect = el.getBoundingClientRect();
    if (
      rect.right < mLeft ||
      rect.left > mRight ||
      rect.bottom < mTop ||
      rect.top > mBottom
    )
      continue;
    const id = el.getAttribute('element-id');
    if (id) selectedIds.push(id);
  }
  store.selectElements(selectedIds);
};

const onMarqueeUp = () => {
  if (!isMarqueeActive.value) return;
  isMarqueeActive.value = false;
  document.removeEventListener('mousemove', onMarqueeMove);
  document.removeEventListener('mouseup', onMarqueeUp);
  if (marqueeActuallyDragged) {
    marqueeJustFinished = true;
    setTimeout(() => {
      marqueeJustFinished = false;
    }, 0);
    marqueeActuallyDragged = false;
  }
};

// 生成当前页缩略图（防抖）
const generateThumbnail = () => {
  if (!deviceScreenRef.value) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    if (!deviceScreenRef.value || !store.currentPageId) return;
    try {
      const canvas = await html2canvas(deviceScreenRef.value, {
        backgroundColor: store.currentPage?.backgroundColor || '#ffffff',
        scale: 0.5,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png', 0.8);
      store.updatePageThumbnail(store.currentPageId, dataUrl);
    } catch {
      // 缩略图生成失败不影响主流程
    }
  }, 300);
};

// 监听页面切换动画
watch(
  () => store.currentPageId,
  () => {
    isPageTurning.value = true;
    // 根据翻页效果类型动态设置动画时长
    const t =
      store.pageTransition === 'flip'
        ? 450
        : store.pageTransition === 'none'
          ? 50
          : 350;
    setTimeout(() => {
      isPageTurning.value = false;
    }, t);
    // 切页后生成新页缩略图
    nextTick(() => generateThumbnail());
  },
);

// 监听元素变化（增删），更新缩略图
watch(
  () => store.currentPage?.elements.length || 0,
  () => {
    nextTick(() => generateThumbnail());
  },
);

// 监听背景色变化
watch(
  () => store.currentPage?.backgroundColor,
  () => {
    nextTick(() => generateThumbnail());
  },
);

onMounted(() => {
  // 首次挂载时捕获 device-screen 并生成缩略图
  const el = document.querySelector('.device-screen') as HTMLElement | null;
  deviceScreenRef.value = el;
  nextTick(() => generateThumbnail());
});

// 切换播放/暂停
const togglePlay = () => {
  if (!audioRef.value) return;
  if (isPlaying.value) {
    audioRef.value.pause();
  } else {
    audioRef.value.play().catch(() => {});
  }
};

// 音乐图标拖拽
const onAudioIconMouseDown = (e: MouseEvent) => {
  if (store.audio.locked) return;
  if (e.button !== 0) return;
  const startX = e.clientX;
  const startY = e.clientY;
  const origX = store.audio.x;
  const origY = store.audio.y;
  const onMove = (ev: MouseEvent) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    const newX = Math.max(
      0,
      Math.min(origX + dx, store.canvasWidth - store.audio.width),
    );
    const newY = Math.max(
      0,
      Math.min(origY + dy, store.canvasHeight - store.audio.height),
    );
    store.updateAudioPosition(newX, newY);
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
};

const onPlay = () => {
  isPlaying.value = true;
};

const onPause = () => {
  isPlaying.value = false;
};

const onEnded = () => {
  isPlaying.value = false;
};

// 当自动播放开关变化时，同步音频播放
watch(
  () => store.audio.autoPlay,
  (val) => {
    if (val && audioRef.value && !store.audio.designMode) {
      audioRef.value.play().catch(() => {});
    } else if (!val && audioRef.value) {
      audioRef.value.pause();
    }
  },
);

// 当设计模式变化时，切换静音
watch(
  () => store.audio.designMode,
  (val) => {
    if (audioRef.value) {
      audioRef.value.muted = val;
    }
  },
);

// 当音量变化时，同步音频音量
watch(
  () => store.audio.volume,
  (val) => {
    if (audioRef.value) {
      audioRef.value.volume = val / 100;
    }
  },
);

// 当音频源变化时，重置播放器
watch(
  () => store.audio.src,
  (newSrc) => {
    isPlaying.value = false;
    if (audioRef.value && newSrc) {
      audioRef.value.volume = store.audio.volume / 100;
      audioRef.value.muted = !!store.audio.designMode;
      if (store.audio.autoPlay && !store.audio.designMode) {
        audioRef.value.play().catch(() => {});
      }
    }
  },
);

onMounted(() => {
  if (audioRef.value && store.audio.src) {
    audioRef.value.volume = store.audio.volume / 100;
    audioRef.value.muted = !!store.audio.designMode;
    if (store.audio.autoPlay && !store.audio.designMode) {
      audioRef.value.play().catch(() => {});
    }
  }
});

// ========== 元素截图（修复 Bug1: 切页动画结束后再截图） ==========
// 页面切换动画时长（与 watch 中 setTimeout 一致）
const PAGE_TURN_FADE_MS = 350;
const PAGE_TURN_FLIP_MS = 450;
const PAGE_TURN_NONE_MS = 50;

const getPageTurnDuration = (t?: null | string) => {
  if (!t || t === 'slide' || t === 'fade' || t === 'zoom')
    return PAGE_TURN_FADE_MS;
  if (t === 'flip') return PAGE_TURN_FLIP_MS;
  return PAGE_TURN_NONE_MS;
};

// 切换到指定页并等待翻页动画结束，返回 device-screen 元素
const switchPageAndWait = async (
  pageId: string,
): Promise<HTMLElement | null> => {
  // 切换到目标页
  store.selectPage(pageId);
  // 强制触发一次 DOM 更新
  await nextTick();
  // 等待翻页动画完全结束
  const duration = getPageTurnDuration(store.pageTransition);
  // 额外加 20ms 以确保动画结束后的渲染
  await new Promise<void>((resolve) =>
    setTimeout(() => resolve(), duration + 20),
  );
  // 再次 nextTick 确保 DOM 已稳定
  await nextTick();
  const el = document.querySelector('.device-screen') as HTMLElement | null;
  return el;
};

// 截图当前 device-screen，返回 canvas 元素（修复 Bug1: 非当前页灰蒙蒙）
const capturePageCanvas = async (
  pageId: string,
  options?: { backgroundColor?: string; scale?: number },
): Promise<HTMLCanvasElement> => {
  const screenEl = await switchPageAndWait(pageId);
  const bg =
    options?.backgroundColor ||
    store.pages.find((p) => p.id === pageId)?.backgroundColor ||
    '#ffffff';
  const scale = options?.scale ?? 2;

  // 注意：这里必须使用 html2canvas，不能依赖外层 device-mockup 的 overflow: hidden
  // 因为截图对象是 device-screen，不是外层 wrapper
  const canvas = await html2canvas(screenEl || document.body, {
    backgroundColor: bg,
    scale,
    useCORS: true,
    logging: false,
  });
  return canvas;
};

// 对外暴露：供 EditorHeader / EditorFooter 调用
defineExpose({
  getDeviceScreen: () => deviceScreenRef.value,
  getCanvasBackground: () => store.canvasBackground,
  capturePageCanvas,
  switchPageAndWait,
  getPageTurnDuration,
});

// Bug2: 编辑时显示溢出区域以使选中锚点可见，非编辑时遵循用户设置
const effectiveOverflow = computed(() => {
  if (isPreview.value) return 'hidden';
  if (
    store.selectedElementId ||
    (store.selectedElementIds && store.selectedElementIds.length > 0)
  )
    return 'visible';
  return store.showOverflow ? 'visible' : 'hidden';
});

const gridOverlayStyle = computed(() => {
  const size = store.gridSize;
  const color = store.gridColor;
  return {
    backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
    backgroundSize: `${size}px ${size}px`,
  };
});

const canvasBgStyle = computed(() => {
  if (!store.canvasBackground) return 'transparent';
  // url(...) -> 图片背景；其他值 -> 颜色背景
  if (store.canvasBackground.startsWith('url(')) {
    return `${store.canvasBackground} center/cover no-repeat`;
  }
  return store.canvasBackground;
});

const onCanvasClick = () => {
  if (isPreview.value) return;
  // 如果刚刚完成了框选（有实际拖动），click 事件不应清除选中结果
  if (marqueeJustFinished) return;
  store.selectElement(null);
};

const onCanvasContextMenu = (e: MouseEvent) => {
  if (isPreview.value) return;
  store.showContextMenu(e.clientX, e.clientY, null);
  e.stopPropagation();
};

const onDragOver = (e: DragEvent) => {
  if (isPreview.value) return;
  if (!e.dataTransfer) return;
  e.dataTransfer.dropEffect = 'copy';
};

const onDrop = (e: DragEvent) => {
  if (isPreview.value) return;
  if (!e.dataTransfer) return;

  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    // 计算在device-screen中的相对位置
    const deviceScreen = (e.currentTarget as HTMLElement).querySelector(
      '.device-screen',
    ) as HTMLElement;
    const rect = deviceScreen.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(e.clientX - rect.left - 40, store.canvasWidth - 80),
    );
    const y = Math.max(
      0,
      Math.min(e.clientY - rect.top - 20, store.canvasHeight - 40),
    );

    store.addElementFromDrag(data.type, data.subType, x, y);
  } catch (error) {
    console.error('Drop error:', error);
  }
};

// ============ 响应式画布缩放 ============
const canvasScale = ref(1);

const updateCanvasScale = () => {
  const container = document.querySelector(
    '.canvas-container',
  ) as HTMLElement | null;
  if (!container) return;
  const containerW = container.clientWidth;
  const containerH = container.clientHeight;
  const scaleX = (containerW - 40) / store.canvasWidth;
  const scaleY = (containerH - 40) / store.canvasHeight;
  canvasScale.value = Math.min(1, Math.min(scaleX, scaleY));
};

const canvasScaleStyle = computed(() => ({
  transform: `scale(${canvasScale.value})`,
  transformOrigin: 'center center',
}));

onMounted(() => {
  updateCanvasScale();
  window.addEventListener('resize', updateCanvasScale);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasScale);
});
</script>

<template>
  <div class="editor-canvas-container">
    <!-- 画布中心区域 -->
    <div
      class="canvas-container"
      :style="{ background: canvasBgStyle }"
      :class="{ preview: isPreview }"
      @click="onCanvasClick"
      @contextmenu.prevent="onCanvasContextMenu"
      @dragover.prevent="onDragOver"
      @drop="onDrop"
      @mousedown="onMarqueeStart"
    >
      <div
        class="canvas-wrapper"
        ref="canvasWrapperRef"
        :style="canvasScaleStyle"
      >
        <!-- 画布外框虚线（guide-border）：淡红色虚线，比画布大一圈（向外8px），标识准确尺寸 -->
        <div
          v-if="!isPreview && store.showGuides"
          class="guide guide-border"
          :style="guideBorderStyle"
        >
          <span
            class="guide-help-icon"
            :title="`画布尺寸 ${store.canvasWidth}×${
              store.canvasHeight
            }px。H5 将按此尺寸渲染并等比缩放适配屏幕。`"
          >
            <i class="bi bi-question-circle-fill"></i>
          </span>
        </div>

        <!-- 小屏安全区上参考线：灰色虚线，左右延伸 24px -->
        <div
          v-if="!isPreview && store.showGuides"
          class="guide guide-line guide-line-top"
          :style="safeLineTopStyle"
        >
          <span
            class="guide-help-icon"
            :title="`小屏手机安全区域（${store.canvasWidth}×${
              store.safeAreaHeight
            }px）。上下两条虚线之间为安全区，关键内容放置在此区域可避免在小屏手机上被裁切。`"
          >
            <i class="bi bi-question-circle-fill"></i>
          </span>
        </div>

        <!-- 小屏安全区下参考线：灰色虚线，左右延伸 24px -->
        <div
          v-if="!isPreview && store.showGuides"
          class="guide guide-line guide-line-bottom"
          :style="safeLineBottomStyle"
        ></div>

        <!-- 手机边框装饰层：在画布外围 12px，独立于画布内容，不影响内容尺寸 -->
        <div
          v-if="!isPreview && store.showMobileBorder"
          class="phone-frame"
          :style="phoneFrameStyle"
        ></div>

        <!-- 画布内容容器：固定 canvasWidth × canvasHeight，永不随任何开关变化 -->
        <div class="device-mockup" :style="deviceMockupStyle">
          <div class="device-frame" :style="{ overflow: effectiveOverflow }">
            <!-- 手机屏幕内容区：精确 canvasWidth × canvasHeight -->
            <div
              ref="deviceScreenRef"
              class="device-screen"
              :class="[
                isPageTurning ? `page-turning-${store.pageTransition}` : '',
              ]"
              :style="{
                width: `${store.canvasWidth}px`,
                height: `${store.canvasHeight}px`,
                background:
                  store.currentPage?.backgroundColor &&
                  store.currentPage.backgroundColor !== 'transparent'
                    ? store.currentPage.backgroundColor
                    : '#ffffff',
                overflow: effectiveOverflow,
              }"
            >
              <!-- 元素列表 -->
              <div v-for="element in sortedCanvasElements" :key="element.id">
                <EditorElement :element="element" :preview="isPreview" />
              </div>

              <!-- 音乐图标（audio-icon） -->
              <div
                v-if="store.audio.audioId && store.audio.src"
                class="audio-icon-container"
                :class="{ 'audio-icon-draggable': !store.audio.locked }"
                :style="{
                  left: `${store.audio.x}px`,
                  top: `${store.audio.y}px`,
                  width: `${store.audio.width}px`,
                  height: `${store.audio.height}px`,
                  cursor: store.audio.locked ? 'pointer' : 'grab',
                }"
                @mousedown.stop="onAudioIconMouseDown"
              >
                <div
                  class="audio-icon"
                  :class="{
                    'anim-spin': isPlaying && store.audio.animation === 'spin',
                    'anim-pulse':
                      isPlaying && store.audio.animation === 'pulse',
                    'anim-bounce':
                      isPlaying && store.audio.animation === 'bounce',
                    'anim-blink':
                      isPlaying && store.audio.animation === 'blink',
                  }"
                  @click.stop="togglePlay"
                >
                  <i :class="store.audio.iconClass || 'bi bi-music-note'"></i>
                </div>
                <audio
                  ref="audioRef"
                  :id="store.audio.audioId"
                  :src="store.audio.src"
                  loop
                  :muted="store.audio.designMode"
                  @play="onPlay"
                  @pause="onPause"
                  @ended="onEnded"
                ></audio>
              </div>

              <!-- 空画布提示 -->
              <div
                v-if="!store.currentPage?.elements.length"
                class="empty-canvas-hint"
              >
                <i class="bi bi-arrow-left-circle"></i>
                <p>从左侧拖入元素</p>
              </div>

              <!-- 网格层 -->
              <div
                v-if="!isPreview && store.showGrid"
                class="grid-overlay"
                :style="gridOverlayStyle"
              ></div>
            </div>
          </div>
        </div>

        <!-- 框选矩形（固定定位，使用 client 坐标，可在画布外显示） -->
        <div
          v-if="isMarqueeActive"
          class="marquee-rectangle"
          :style="marqueeStyle"
        ></div>
      </div>
    </div>

    <!-- 右侧工具栏（垂直按钮组，和右侧面板并排，靠在一起） -->
    <RightToolbar v-if="!isPreview" />
  </div>
</template>

<style scoped>
.grid-overlay {
  position: absolute;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}
</style>
