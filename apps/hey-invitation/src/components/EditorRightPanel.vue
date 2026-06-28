<script setup lang="ts">
import type { EditorElement } from '../types/editor';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useEditorStore } from '../store/editor';
import FontPicker from './FontPicker.vue';
import LayerTreeItem from './LayerTreeItem.vue';
import PromptDialog from './PromptDialog.vue';

const store = useEditorStore();
const expandedGroups = ref<Record<string, boolean>>({});
const showRenameLayerPrompt = ref(false);
const renameLayerTarget = ref<EditorElement | null>(null);

// 背景预设
const bgPresets = [
  { name: '纯白', bg: '#ffffff' },
  {
    name: '条纹',
    bg: 'repeating-linear-gradient(45deg, #f0f0f0, #f0f0f0 10px, #e0e0e0 10px, #e0e0e0 20px)',
  },
  { name: '渐变紫', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  {
    name: '网格',
    bg: 'repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(0,0,0,0.08) 19px, rgba(0,0,0,0.08) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(0,0,0,0.08) 19px, rgba(0,0,0,0.08) 20px), #ffffff',
  },
  {
    name: '点阵',
    bg: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px), #ffffff',
  },
  {
    name: '水波',
    bg: 'repeating-radial-gradient(circle at 50% 50%, rgba(59,130,246,0.08) 0px, rgba(59,130,246,0.08) 2px, transparent 2px, transparent 12px), #ffffff',
  },
  { name: '柔和', bg: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' },
  { name: '暖粉', bg: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)' },
];

const isBgPresetActive = (bg: string) => {
  return store.currentPage?.backgroundColor === bg;
};

const applyBgPreset = (bg: string) => {
  store.updatePageBackground(bg);
  store.showToast('已应用背景', 'success');
};

const toggleGroupExpand = (id: string) => {
  expandedGroups.value = {
    ...expandedGroups.value,
    [id]: expandedGroups.value[id] === false,
  };
};
const fileInputRef = ref<HTMLInputElement | null>(null);
const fileInputMode = ref<'add' | 'change'>('add');
const rightPanelFontFamily = ref('Microsoft YaHei');

watch(
  () => store.selectedElement,
  (el) => {
    if (el) rightPanelFontFamily.value = el.fontFamily || 'Microsoft YaHei';
  },
  { immediate: true },
);

watch(rightPanelFontFamily, (val) => {
  const el = store.selectedElement;
  if (el && el.type === 'text') store.updateElement(el.id, { fontFamily: val });
});
const musicProgress = ref(0);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);

// 折叠状态：默认音乐管理展开，页面设置和文字属性收起
const collapsed = reactive<{ music: boolean; page: boolean; text: boolean }>({
  music: false,
  page: true,
  text: true,
});

const toggleCollapse = (key: 'music' | 'page' | 'text') => {
  collapsed[key] = !collapsed[key];
};

// 音频元素引用
const audioRef = ref<HTMLAudioElement | null>(null);

const hasAudio = computed(() => !!store.audio.audioId);

// 页面管理状态
const editingPageId = ref<null | string>(null);
const pageNameInput = ref('');
const pageNameInputRef = ref<HTMLInputElement | null>(null);

// 页面拖拽状态
const dragPageFrom = ref<null | number>(null);
const dragPageOver = ref<null | number>(null);

// 图层拖拽状态
const dragLayerFrom = ref<null | string>(null);
const dragLayerOver = ref<null | string>(null);

// 页面管理操作
const onAddPage = () => {
  store.addPage();
};

const onCopyCurrentPage = () => {
  store.copyCurrentPage();
};

const onCopyPage = (pageId: string) => {
  const page = store.pages.find((p) => p.id === pageId);
  if (!page) return;
  const idx = store.pages.findIndex((p) => p.id === pageId);
  const newPage = {
    id: `page_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: `${page.name} 副本`,
    backgroundColor: page.backgroundColor,
    elements: JSON.parse(JSON.stringify(page.elements || [])),
    locked: false,
  };
  store.pages.splice(idx + 1, 0, newPage);
  store.currentPageId = newPage.id;
  store.showToast('页面已复制', 'success');
};

const onRenamePage = (pageId: string) => {
  const page = store.pages.find((p) => p.id === pageId);
  if (!page) return;
  editingPageId.value = pageId;
  pageNameInput.value = page.name;
  setTimeout(() => {
    if (pageNameInputRef.value) {
      pageNameInputRef.value.focus();
      pageNameInputRef.value.select();
    }
  }, 50);
};

const onRenameSubmit = (pageId: string) => {
  if (!editingPageId.value) return;
  const page = store.pages.find((p) => p.id === pageId);
  if (!page) return;
  const newName = pageNameInput.value.trim();
  if (newName && newName !== page.name) {
    page.name = newName;
    store.showToast('页面已重命名', 'success');
  }
  editingPageId.value = null;
};

const onDeletePage = (pageId: string) => {
  if (store.pages.length <= 1) return;
  const page = store.pages.find((p) => p.id === pageId);
  if (!page) return;
  store.deletePage(pageId);
  store.showToast(`已删除页面"${page.name}"`, 'success');
};

const onPageTransitionChange = (e: Event) => {
  const target = e.target as HTMLSelectElement;
  store.setPageTransition(
    target.value as 'fade' | 'flip' | 'none' | 'slide' | 'zoom',
  );
};

const onHiddenModeChange = (e: Event) => {
  const target = e.target as HTMLSelectElement;
  store.setHiddenMode(target.value as 'hide' | 'opacity');
};

const onPrevPage = () => {
  const idx = store.currentPageIndex;
  if (idx > 0) {
    store.currentPageId = store.pages[idx - 1].id;
  }
};

const onNextPage = () => {
  const idx = store.currentPageIndex;
  if (idx < store.pages.length - 1) {
    store.currentPageId = store.pages[idx + 1].id;
  }
};

// ============ 每页单独翻页动效（Bug 8） ============
const onPageTransitionChangePerPage = (pageId: string, e: Event) => {
  const target = e.target as HTMLSelectElement;
  const val = target.value;
  if (val === '__default__') {
    store.setPageTransitionForPage(pageId, undefined);
  } else {
    store.setPageTransitionForPage(
      pageId,
      val as 'fade' | 'flip' | 'none' | 'slide' | 'zoom',
    );
  }
};

// ============ 页面拖拽排序（Bug 9） ============
const onPageDragStart = (index: number, e: DragEvent) => {
  dragPageFrom.value = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }
};
const onPageDragOver = (index: number) => {
  if (dragPageFrom.value !== null && dragPageFrom.value !== index) {
    dragPageOver.value = index;
  }
};
const onPageDragLeave = (index: number) => {
  if (dragPageOver.value === index) dragPageOver.value = null;
};
const onPageDrop = (index: number) => {
  const from = dragPageFrom.value;
  if (from === null || from === index) return;
  store.movePageOrder(from, index);
  dragPageFrom.value = null;
  dragPageOver.value = null;
};
const onPageDragEnd = () => {
  dragPageFrom.value = null;
  dragPageOver.value = null;
};

// ============ 图层拖拽排序（Bug 10） ============
const onLayerDragStart = (id: string, e: DragEvent) => {
  dragLayerFrom.value = id;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }
};
const onLayerDragOver = (id: string) => {
  if (dragLayerFrom.value !== null && dragLayerFrom.value !== id) {
    dragLayerOver.value = id;
  }
};
const onLayerDragLeave = (id: string) => {
  if (dragLayerOver.value === id) dragLayerOver.value = null;
};
const onLayerDrop = (id: string) => {
  const from = dragLayerFrom.value;
  if (!from || from === id) return;
  store.moveElementOrder(from, id);
  dragLayerFrom.value = null;
  dragLayerOver.value = null;
};
const onLayerDragEnd = () => {
  dragLayerFrom.value = null;
  dragLayerOver.value = null;
};

// ============ 纯色背景（Bug 1: 透明背景 + 实时颜色更新）============
// 使用 store.updatePageBackground 触发响应式更新，确保画布实时变色
const onPickPageBgColor = (color: string) => {
  if (store.currentPage && store.currentPage.backgroundColor !== color) {
    store.updatePageBackground(color);
  }
};

// @input: 颜色选择器拖动时实时更新（通过 store.updatePageBackground）
const onPickPageBgColorFromInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (store.currentPage && store.currentPage.backgroundColor !== target.value) {
    store.updatePageBackground(target.value);
  }
};

// 手动输入 HEX 颜色值
const onPickPageBgColorFromHexInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  let value = target.value.trim();
  if (!value) return;
  if (!value.startsWith('#')) value = `#${value}`;
  // 简单校验 #RRGGBB 格式
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    store.updatePageBackground(value);
  }
};

// 颜色工具：把 backgroundColor 转为 input[type=color] 能接受的值
const toColorPickerValue = (bgColor: string | undefined): string => {
  if (!bgColor || bgColor === 'transparent' || !bgColor.startsWith('#'))
    return '#ffffff';
  return bgColor;
};

// 颜色工具：显示用的颜色文本
const displayBgColor = (bgColor: string | undefined): string => {
  if (!bgColor || bgColor === 'transparent') return 'TRANSPARENT';
  return bgColor.toUpperCase();
};

// 复制当前页颜色
const onCopyCurrentColor = async () => {
  const color = displayBgColor(store.currentPage?.backgroundColor);
  try {
    await navigator.clipboard.writeText(color);
    store.showToast(`已复制 ${color}`, 'success');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = color;
    document.body.append(ta);
    ta.select();
    try {
      document.execCommand('copy');
      store.showToast(`已复制 ${color}`, 'success');
    } catch {
      store.showToast('复制失败', 'error');
    }
    ta.remove();
  }
};

// ============ 画布尺寸 ============
const onCanvasWidthChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const w = Number.parseInt(target.value, 10);
  if (w && w >= 200 && w <= 1080) store.setCanvasSize(w, store.canvasHeight);
};
const onCanvasHeightChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const h = Number.parseInt(target.value, 10);
  if (h && h >= 200 && h <= 2000) store.setCanvasSize(store.canvasWidth, h);
};
const onCanvasPreset = (w: number, h: number) => {
  store.setCanvasSize(w, h);
};

const getLayerIcon = (type: string) => {
  const map: Record<string, string> = {
    text: 'bi bi-type',
    decoration: 'bi bi-stars',
    image: 'bi bi-image',
    border: 'bi bi-square',
    icon: 'bi bi-emoji-smile',
    group: 'bi bi-collection-fill',
  };
  return map[type] || 'bi bi-dash-circle';
};

const getElementDisplay = (element: EditorElement) => {
  const defaultName = element.name || '';
  if (element.type === 'text') return defaultName || element.text || '文本元素';
  if (element.type === 'decoration') return defaultName || '装饰元素';
  if (element.type === 'image') return defaultName || '图片元素';
  if (element.type === 'border') return defaultName || '边框元素';
  if (element.type === 'icon') return defaultName || '图标元素';
  if (element.type === 'group')
    return defaultName || `组合（${(element.children || []).length}项）`;
  return defaultName || '元素';
};

const renameLayer = (element: EditorElement) => {
  renameLayerTarget.value = element;
  showRenameLayerPrompt.value = true;
};

const onConfirmRenameLayer = (newName: string) => {
  if (renameLayerTarget.value && newName.trim()) {
    store.updateElement(renameLayerTarget.value.id, {
      name: newName.trim(),
    } as any);
    store.showToast('图层已重命名', 'success');
  }
  renameLayerTarget.value = null;
};

const sortedElements = computed(() => {
  return [...(store.currentPage?.elements || [])].toSorted(
    (a, b) => b.zIndex - a.zIndex,
  );
});

const toggleAllVisibility = () => {
  const page = store.currentPage;
  if (!page) return;
  const allVisible = page.elements.every((el) => el.visible);
  for (const el of page.elements) {
    if (allVisible) store.toggleVisibility(el.id);
    else if (!el.visible) store.toggleVisibility(el.id);
  }
};

const toggleAllLock = () => {
  const page = store.currentPage;
  if (!page) return;
  const allLocked = page.elements.every((el) => el.locked);
  for (const el of page.elements) {
    if (allLocked) store.toggleLock(el.id);
    else if (!el.locked) store.toggleLock(el.id);
  }
};

// 记录图层面板最后点击的元素 id（用于 Shift+范围选择）
const lastClickedLayerId = ref<null | string>(null);

// 图层面板点击：支持 Ctrl/Shift 多选
const onLayerItemClick = (id: string, e?: MouseEvent) => {
  if (e && (e.ctrlKey || e.metaKey)) {
    // Ctrl+click：切换选中状态
    store.toggleSelectElement(id);
    lastClickedLayerId.value = id;
    return;
  }
  if (e && e.shiftKey && lastClickedLayerId.value) {
    // Shift+click：范围选择（按图层顺序）
    const allIds = sortedElements.value
      .filter((el) => !el.parentGroupId)
      .map((el) => el.id);
    const fromIdx = allIds.indexOf(lastClickedLayerId.value);
    const toIdx = allIds.indexOf(id);
    if (fromIdx !== -1 && toIdx !== -1) {
      const [start, end] =
        fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      const rangeIds = allIds.slice(start, end + 1);
      store.selectElements(rangeIds);
    }
    return;
  }
  store.selectElement(id);
  lastClickedLayerId.value = id;
};

const onBulkDuplicate = () => {
  store.bulkDuplicate();
};

const onBulkToggleVisibility = () => {
  store.bulkToggleVisibility();
};

const onBulkToggleLock = () => {
  store.bulkToggleLock();
};

const onBulkDelete = () => {
  const count = store.selectedElementIds.length;
  store.bulkDelete();
  store.showToast(`已删除 ${count} 个元素`, 'success');
};

const getContrastTextColor = (bgColor: string): string => {
  if (!bgColor) return '#333333';
  const hex = bgColor.replace('#', '');
  if (hex.length < 6) return '#333333';
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#333333' : '#ffffff';
};

const formatTime = (seconds: number) => {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const onAutoPlayChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  store.setAudioAutoPlay(target.checked);
  if (audioRef.value) {
    audioRef.value.autoplay = target.checked;
    if (target.checked) {
      audioRef.value.play().catch(() => {});
    }
  }
};

const onDesignModeChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  store.setAudioDesignMode(target.checked);
  if (audioRef.value) {
    audioRef.value.muted = target.checked;
  }
  store.showToast(
    target.checked
      ? '设计模式已开启，音乐已静音'
      : '设计模式已关闭，音乐已恢复',
    'info',
  );
};

const onVolumeChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const vol = Number.parseInt(target.value);
  store.setAudioVolume(vol);
  if (audioRef.value) {
    audioRef.value.volume = vol / 100;
  }
};

const onProgressInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const val = Number.parseInt(target.value);
  if (audioRef.value && audioRef.value.duration > 0) {
    audioRef.value.currentTime = (val / 100) * audioRef.value.duration;
  }
};

const onAddMusic = () => {
  fileInputMode.value = 'add';
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
};

const onChangeMusic = () => {
  if (!hasAudio.value) {
    store.showToast('没有音频元素可更换', 'warning');
    return;
  }
  fileInputMode.value = 'change';
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
};

const onTogglePlayPause = () => {
  if (!hasAudio.value) return;
  const audio = audioRef.value;
  if (!audio || !audio.src) return;
  if (isPlaying.value) {
    audio.pause();
    isPlaying.value = false;
  } else {
    audio.play().catch(() => {});
    isPlaying.value = true;
  }
};

const onResetPosition = () => {
  if (!hasAudio.value) return;
  const audio = audioRef.value;
  if (!audio) {
    store.showToast('未找到音频', 'error');
    return;
  }
  audio.currentTime = 0;
  musicProgress.value = 0;
  store.showToast('已复位到开头', 'success');
};

const onToggleLock = () => {
  if (!hasAudio.value) {
    store.showToast('没有音频元素可锁定', 'warning');
    return;
  }
  store.toggleAudioLock();
  store.showToast(
    `音乐位置已${store.audio.locked ? '锁定' : '解锁'}`,
    'success',
  );
};

const onDeleteMusic = () => {
  if (!hasAudio.value) {
    store.showToast('没有音频元素可删除', 'warning');
    return;
  }
  store.deleteAudio();
  if (audioRef.value) {
    audioRef.value.pause();
    audioRef.value.src = '';
    audioRef.value = null;
  }
  musicProgress.value = 0;
  currentTime.value = 0;
  duration.value = 0;
  store.showToast('音乐已删除', 'success');
};

const onFileSelected = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener('load', (event) => {
    const audioUrl = (event.target as FileReader).result as string;
    if (fileInputMode.value === 'add') {
      store.addAudioElement(audioUrl);
      store.showToast('音乐已添加', 'success');
    } else {
      store.updateAudioSrc(audioUrl);
      store.showToast('音乐已更换', 'success');
    }
    if (audioRef.value) {
      audioRef.value.src = audioUrl;
    } else {
      const audio = new Audio(audioUrl);
      audio.volume = store.audio.volume / 100;
      audio.muted = store.audio.designMode;
      audio.autoplay = store.audio.autoPlay;
      audio.addEventListener('loadedmetadata', () => {
        duration.value = audio.duration;
      });
      audio.addEventListener('play', () => {
        isPlaying.value = true;
      });
      audio.addEventListener('pause', () => {
        isPlaying.value = false;
      });
      audio.addEventListener('ended', () => {
        isPlaying.value = false;
      });
      audio.addEventListener('timeupdate', () => {
        currentTime.value = audio.currentTime;
        if (audio.duration > 0) {
          musicProgress.value = (audio.currentTime / audio.duration) * 100;
        }
      });
      audioRef.value = audio;
      if (store.audio.autoPlay) {
        audio.play().catch(() => {});
      }
    }
  });
  reader.readAsDataURL(file);
};

const updateAudioRefFromCanvas = () => {
  if (store.audio.audioId && !audioRef.value) {
    // 优先从画布上的 <audio> 元素获取
    const el = document.querySelector<HTMLAudioElement>(
      `#${store.audio.audioId}`,
    ) as HTMLAudioElement | null;
    if (el) {
      audioRef.value = el;
      el.volume = store.audio.volume / 100;
      el.muted = store.audio.designMode;
      el.autoplay = store.audio.autoPlay;
      el.addEventListener('loadedmetadata', () => {
        duration.value = el.duration;
      });
      el.addEventListener('play', () => {
        isPlaying.value = true;
      });
      el.addEventListener('pause', () => {
        isPlaying.value = false;
      });
      el.addEventListener('ended', () => {
        isPlaying.value = false;
      });
      el.addEventListener('timeupdate', () => {
        currentTime.value = el.currentTime;
        if (el.duration > 0) {
          musicProgress.value = (el.currentTime / el.duration) * 100;
        }
      });
    } else if (store.audio.src) {
      // 画布上没有 <audio> 元素（如从顶部按钮添加音乐），则创建新的
      const audio = new Audio(store.audio.src);
      audio.volume = store.audio.volume / 100;
      audio.muted = store.audio.designMode;
      audio.autoplay = store.audio.autoPlay;
      audio.loop = true;
      audio.addEventListener('loadedmetadata', () => {
        duration.value = audio.duration;
      });
      audio.addEventListener('play', () => {
        isPlaying.value = true;
      });
      audio.addEventListener('pause', () => {
        isPlaying.value = false;
      });
      audio.addEventListener('ended', () => {
        isPlaying.value = false;
      });
      audio.addEventListener('timeupdate', () => {
        currentTime.value = audio.currentTime;
        if (audio.duration > 0) {
          musicProgress.value = (audio.currentTime / audio.duration) * 100;
        }
      });
      audioRef.value = audio;
      if (store.audio.autoPlay) {
        audio.play().catch(() => {});
      }
    }
  }
};

onMounted(() => {
  updateAudioRefFromCanvas();
});

watch(
  () => store.audio.audioId,
  () => {
    updateAudioRefFromCanvas();
  },
);
</script>

<template>
  <aside class="editor-sidebar sidebar-right">
    <div class="sidebar-tabs">
      <ul class="nav nav-tabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button
            class="nav-link"
            :class="{ active: store.rightPanelTab === 'properties' }"
            @click="store.setRightPanelTab('properties')"
            role="tab"
          >
            <i class="bi bi-sliders"></i>
            <span class="d-none d-lg-inline">属性</span>
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button
            class="nav-link"
            :class="{ active: store.rightPanelTab === 'pages' }"
            @click="store.setRightPanelTab('pages')"
            role="tab"
          >
            <i class="bi bi-file-earmark"></i>
            <span class="d-none d-lg-inline">页面</span>
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button
            class="nav-link"
            :class="{ active: store.rightPanelTab === 'layers' }"
            @click="store.setRightPanelTab('layers')"
            role="tab"
          >
            <i class="bi bi-layers"></i>
            <span class="d-none d-lg-inline">图层</span>
          </button>
        </li>
      </ul>

      <div class="tab-content">
        <!-- 属性设置 -->
        <div
          v-if="store.rightPanelTab === 'properties'"
          class="tab-pane active"
          id="tabProperties"
          role="tabpanel"
        >
          <!-- 音乐管理（可折叠） -->
          <div class="collapsible-section">
            <div class="section-header" @click="toggleCollapse('music')">
              <h6 class="section-title">音乐管理</h6>
              <i
                class="bi"
                :class="
                  collapsed.music ? 'bi-chevron-right' : 'bi-chevron-down'
                "
              ></i>
            </div>
            <div v-if="!collapsed.music" class="section-body">
              <div class="music-control-group">
                <div class="music-control-row">
                  <div class="music-control-item">
                    <label class="form-label-sm">自动播放</label>
                    <div class="form-check form-switch">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :checked="store.audio.autoPlay"
                        @change="onAutoPlayChange"
                      />
                    </div>
                  </div>
                  <div class="music-control-item">
                    <label class="form-label-sm">设计模式</label>
                    <div class="form-check form-switch">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :checked="store.audio.designMode"
                        @change="onDesignModeChange"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="music-progress-group">
                <div class="d-flex align-items-center mb-2">
                  <label class="form-label-sm mb-0">默认音量</label>
                  <input
                    type="range"
                    class="form-range flex-grow-1 ms-2"
                    min="0"
                    max="100"
                    :value="store.audio.volume"
                    @input="onVolumeChange"
                  />
                  <span class="form-value ms-2">{{ store.audio.volume }}%</span>
                </div>
                <div class="d-flex align-items-center">
                  <label class="form-label-sm mb-0">播放进度</label>
                  <input
                    type="range"
                    class="form-range flex-grow-1 ms-2"
                    min="0"
                    max="100"
                    :value="musicProgress"
                    :disabled="!hasAudio"
                    @input="onProgressInput"
                  />
                  <span class="form-value ms-2"
                    >{{ formatTime(currentTime) }}/{{
                      formatTime(duration)
                    }}</span
                  >
                </div>
              </div>

              <div class="music-action-group">
                <label class="form-label-sm block-label">操作</label>
                <div
                  class="btn-grid"
                  style="display: flex; flex-direction: column; gap: 4px"
                >
                  <div style="display: flex; gap: 4px">
                    <button
                      class="btn btn-primary btn-sm action-btn"
                      style="flex: 1; padding: 1px 8px; font-size: 10px"
                      @click="onAddMusic"
                    >
                      <i class="bi bi-music-note"></i> 添加
                    </button>
                    <button
                      class="btn btn-outline-secondary btn-sm action-btn"
                      style="flex: 1; padding: 1px 8px; font-size: 10px"
                      :disabled="!hasAudio"
                      @click="onChangeMusic"
                    >
                      <i class="bi bi-music-note-beamed"></i> 更换
                    </button>
                  </div>
                  <div style="display: flex; gap: 4px">
                    <button
                      class="btn btn-outline-secondary btn-sm action-btn"
                      style="flex: 1; padding: 1px 8px; font-size: 10px"
                      :disabled="!hasAudio"
                      @click="onTogglePlayPause"
                    >
                      <i
                        :class="
                          isPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill'
                        "
                      ></i>
                      {{ isPlaying ? '暂停' : '播放' }}
                    </button>
                    <button
                      class="btn btn-outline-secondary btn-sm action-btn"
                      style="flex: 1; padding: 1px 8px; font-size: 10px"
                      :disabled="!hasAudio"
                      @click="onResetPosition"
                    >
                      <i class="bi bi-arrow-repeat"></i> 复位
                    </button>
                  </div>
                  <div style="display: flex; gap: 4px">
                    <button
                      class="btn btn-sm action-btn"
                      style="flex: 1; padding: 1px 8px; font-size: 10px"
                      :class="
                        store.audio.locked
                          ? 'btn-outline-success'
                          : 'btn-outline-secondary'
                      "
                      :disabled="!hasAudio"
                      @click="onToggleLock"
                    >
                      <i
                        :class="
                          store.audio.locked ? 'bi bi-unlock' : 'bi bi-lock'
                        "
                      ></i>
                      {{ store.audio.locked ? '解锁' : '锁定' }}
                    </button>
                    <button
                      class="btn btn-outline-danger btn-sm action-btn"
                      style="flex: 1; padding: 1px 8px; font-size: 10px"
                      :disabled="!hasAudio"
                      @click="onDeleteMusic"
                    >
                      <i class="bi bi-trash"></i> 删除
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 音乐图标设置 -->
            <div class="music-icon-settings">
              <label class="form-label-sm block-label">图标样式</label>
              <div class="icon-grid">
                <button
                  class="btn btn-sm"
                  :class="
                    store.audio.iconClass === 'bi bi-music-note'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  "
                  @click="store.setAudioIcon('bi bi-music-note')"
                  title="音符"
                >
                  <i class="bi bi-music-note"></i>
                </button>
                <button
                  class="btn btn-sm"
                  :class="
                    store.audio.iconClass === 'bi bi-music-note-beamed'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  "
                  @click="store.setAudioIcon('bi bi-music-note-beamed')"
                  title="双音符"
                >
                  <i class="bi bi-music-note-beamed"></i>
                </button>
                <button
                  class="btn btn-sm"
                  :class="
                    store.audio.iconClass === 'bi bi-vinyl'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  "
                  @click="store.setAudioIcon('bi bi-vinyl')"
                  title="唱片"
                >
                  <i class="bi bi-vinyl"></i>
                </button>
                <button
                  class="btn btn-sm"
                  :class="
                    store.audio.iconClass === 'bi bi-disc'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  "
                  @click="store.setAudioIcon('bi bi-disc')"
                  title="光盘"
                >
                  <i class="bi bi-disc"></i>
                </button>
                <button
                  class="btn btn-sm"
                  :class="
                    store.audio.iconClass === 'bi bi-boombox'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  "
                  @click="store.setAudioIcon('bi bi-boombox')"
                  title="音响"
                >
                  <i class="bi bi-boombox"></i>
                </button>
                <button
                  class="btn btn-sm"
                  :class="
                    store.audio.iconClass === 'bi bi-speaker'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  "
                  @click="store.setAudioIcon('bi bi-speaker')"
                  title="喇叭"
                >
                  <i class="bi bi-speaker"></i>
                </button>
              </div>
              <label class="form-label-sm block-label mt-2">动画效果</label>
              <div class="btn-group btn-group-sm w-100">
                <button
                  class="btn btn-sm"
                  :class="
                    store.audio.animation === 'spin'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  "
                  @click="store.setAudioAnimation('spin')"
                >
                  旋转
                </button>
                <button
                  class="btn btn-sm"
                  :class="
                    store.audio.animation === 'pulse'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  "
                  @click="store.setAudioAnimation('pulse')"
                >
                  脉冲
                </button>
                <button
                  class="btn btn-sm"
                  :class="
                    store.audio.animation === 'bounce'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  "
                  @click="store.setAudioAnimation('bounce')"
                >
                  弹跳
                </button>
                <button
                  class="btn btn-sm"
                  :class="
                    store.audio.animation === 'blink'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  "
                  @click="store.setAudioAnimation('blink')"
                >
                  闪烁
                </button>
              </div>
            </div>
          </div>

          <!-- 页面设置（可折叠） -->
          <div class="collapsible-section">
            <div class="section-header" @click="toggleCollapse('page')">
              <h6 class="section-title">页面设置</h6>
              <i
                class="bi"
                :class="collapsed.page ? 'bi-chevron-right' : 'bi-chevron-down'"
              ></i>
            </div>
            <div v-if="!collapsed.page" class="section-body">
              <!-- 背景预设 -->
              <div class="setting-group">
                <label class="setting-label">背景预设</label>
                <div class="bg-presets-grid">
                  <div
                    v-for="(t, idx) in bgPresets"
                    :key="idx"
                    class="bg-preset-item"
                    :class="{ active: isBgPresetActive(t.bg) }"
                    :style="{ background: t.bg }"
                    :title="t.name"
                    @click="applyBgPreset(t.bg)"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 文字属性（可折叠） -->
          <div class="collapsible-section">
            <div class="section-header" @click="toggleCollapse('text')">
              <h6 class="section-title">文字属性</h6>
              <i
                class="bi"
                :class="collapsed.text ? 'bi-chevron-right' : 'bi-chevron-down'"
              ></i>
            </div>
            <div v-if="!collapsed.text" class="section-body">
              <div class="form-group">
                <label class="form-label-sm block-label">字体</label>
                <FontPicker v-model="rightPanelFontFamily" />
              </div>
              <div class="form-group">
                <label class="form-label-sm block-label">字号</label>
                <div class="d-flex align-items-center">
                  <input
                    type="range"
                    class="form-range flex-grow-1"
                    min="12"
                    max="72"
                    value="24"
                  />
                  <span class="form-value ms-2" style="min-width: 40px"
                    >24px</span
                  >
                </div>
              </div>
              <div class="form-group">
                <label class="form-label-sm block-label">颜色</label>
                <input
                  type="color"
                  class="form-control form-control-color"
                  value="#d63384"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 页面管理 -->
        <div
          v-if="store.rightPanelTab === 'pages'"
          class="tab-pane active"
          id="tabPages"
          role="tabpanel"
        >
          <div class="pages-manager">
            <div class="pages-toolbar mb-3">
              <div class="d-flex gap-1 mb-2">
                <button
                  class="btn btn-sm btn-outline-primary flex-grow-1"
                  @click="onAddPage"
                >
                  <i class="bi bi-plus-lg"></i> 添加
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary flex-grow-1"
                  @click="onCopyCurrentPage"
                >
                  <i class="bi bi-files"></i> 复制
                </button>
              </div>
              <div
                class="d-flex gap-1 align-items-center justify-content-between"
              >
                <button
                  class="btn btn-sm btn-outline-secondary flex-grow-1"
                  :disabled="store.currentPageIndex <= 0"
                  @click="onPrevPage"
                >
                  <i class="bi bi-chevron-left"></i> 上一页
                </button>
                <span class="page-indicator"
                  >{{ store.currentPageIndex + 1 }}/{{
                    store.pages.length
                  }}</span
                >
                <button
                  class="btn btn-sm btn-outline-secondary flex-grow-1"
                  :disabled="store.currentPageIndex >= store.pages.length - 1"
                  @click="onNextPage"
                >
                  下一页 <i class="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>

            <div class="pages-list">
              <div
                v-for="(page, index) in store.pages"
                :key="page.id"
                class="page-item"
                :class="{
                  active: store.currentPageId === page.id,
                  dragging: dragPageFrom === index,
                  'drag-over': dragPageOver === index,
                }"
                draggable="true"
                @dragstart="onPageDragStart(index, $event)"
                @dragover.prevent="onPageDragOver(index)"
                @dragleave="onPageDragLeave(index)"
                @drop="onPageDrop(index)"
                @dragend="onPageDragEnd"
                @click="store.selectPage(page.id)"
              >
                <div class="page-drag-handle" title="拖动排序">
                  <i class="bi bi-grip-vertical"></i>
                </div>
                <div
                  class="page-thumb"
                  :style="{
                    backgroundImage: page.thumbnail
                      ? `url(${page.thumbnail})`
                      : 'none',
                    backgroundColor: page.backgroundColor,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: getContrastTextColor(page.backgroundColor),
                  }"
                >
                  <span class="page-thumb-number">{{ index + 1 }}</span>
                </div>
                <div class="page-info">
                  <div
                    v-if="editingPageId === page.id"
                    class="page-name-editor"
                    @click.stop
                  >
                    <input
                      ref="pageNameInputRef"
                      v-model="pageNameInput"
                      class="form-control form-control-sm"
                      @keyup.enter="onRenameSubmit(page.id)"
                      @blur="onRenameSubmit(page.id)"
                    />
                  </div>
                  <span v-else class="page-name">{{ page.name }}</span>
                  <span class="page-elements"
                    >{{ page.elements.length }} 元素</span
                  >
                  <div class="page-transition-row" @click.stop>
                    <span class="page-transition-label">翻页效果:</span>
                    <select
                      class="form-select form-select-sm page-transition-select"
                      :value="page.transition || '__default__'"
                      @change="onPageTransitionChangePerPage(page.id, $event)"
                      title="翻页动效"
                    >
                      <option value="__default__">默认</option>
                      <option value="none">无</option>
                      <option value="fade">淡入淡出</option>
                      <option value="slide">滑动</option>
                      <option value="zoom">缩放</option>
                      <option value="flip">翻转</option>
                    </select>
                  </div>
                </div>
                <div class="page-actions">
                  <button
                    class="page-action-btn"
                    @click.stop="onRenamePage(page.id)"
                    title="重命名"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    class="page-action-btn"
                    @click.stop="onCopyPage(page.id)"
                    title="复制"
                  >
                    <i class="bi bi-files"></i>
                  </button>
                  <button
                    class="page-action-btn page-action-danger"
                    @click.stop="onDeletePage(page.id)"
                    v-if="store.pages.length > 1"
                    title="删除"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 图层管理 -->
        <div
          v-if="store.rightPanelTab === 'layers'"
          class="tab-pane active"
          id="tabLayers"
          role="tabpanel"
        >
          <div class="layers-manager" @click.self="store.clearSelection()">
            <div class="layers-toolbar">
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="toggleAllVisibility"
              >
                <i class="bi bi-eye"></i>
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="toggleAllLock"
              >
                <i class="bi bi-lock"></i>
              </button>
            </div>

            <!-- 多选批量操作栏（仅在有选中且数量 > 1 时显示） -->
            <div
              v-if="store.selectedElementIds.length > 1"
              class="bulk-action-bar"
            >
              <span class="bulk-count"
                >已选中 {{ store.selectedElementIds.length }} 个</span
              >
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="onBulkDuplicate"
                title="复制所有选中元素"
              >
                <i class="bi bi-copy"></i>
                复制
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="onBulkToggleVisibility"
                title="显示/隐藏所有选中元素"
              >
                <i class="bi bi-eye"></i>
                显示
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="onBulkToggleLock"
                title="锁定/解锁所有选中元素"
              >
                <i class="bi bi-lock"></i>
                锁定
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                @click="onBulkDelete"
                title="删除所有选中元素"
              >
                <i class="bi bi-trash"></i>
                删除
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="store.clearSelection"
                title="清空选择"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <div class="layers-list" v-if="store.currentPage?.elements.length">
              <LayerTreeItem
                :elements="sortedElements"
                :depth="0"
                :expanded-groups="expandedGroups"
                :drag-layer-from="dragLayerFrom"
                :drag-layer-over="dragLayerOver"
                @move-up="(id: string) => store.moveElementUp(id)"
                @move-down="(id: string) => store.moveElementDown(id)"
                @rename="renameLayer"
                @ungroup="store.unGroupElements()"
                @toggle-vis="(id: string) => store.toggleVisibility(id)"
                @toggle-lock="(id: string) => store.toggleLock(id)"
                @select="onLayerItemClick"
                @drag-start="onLayerDragStart"
                @drag-over="onLayerDragOver"
                @drag-leave="onLayerDragLeave"
                @drop-item="onLayerDrop"
                @drag-end="onLayerDragEnd"
                @toggle-expand="toggleGroupExpand"
              />
            </div>
            <div v-else class="empty-layers">
              <i class="bi bi-layers-half"></i>
              <p>暂无图层</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件选择 input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="audio/*"
      style="display: none"
      @change="onFileSelected"
    />
  </aside>

  <!-- 重命名图层弹窗 -->
  <PromptDialog
    v-model="showRenameLayerPrompt"
    message="重命名图层"
    placeholder="请输入图层名称"
    :default-value="renameLayerTarget?.name || ''"
    @confirm="onConfirmRenameLayer"
  />
</template>

<style scoped>
.layers-manager {
  user-select: none;
}

.layer-item {
  cursor: pointer;
  user-select: none;
}

.layer-item-child {
  user-select: none;
}

.layer-btn {
  padding: 2px 4px;
  font-size: 13px;
  line-height: 1;
  color: #666;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 3px;
}

.layer-btn:hover {
  color: #0d6efd;
  background: rgb(13 110 253 / 8%);
}

.layer-btn i {
  font-size: 14px;
}

.bg-presets-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 4px;
}

.bg-preset-item {
  width: 100%;
  aspect-ratio: 1;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 6px;
  transition:
    border-color 0.15s,
    transform 0.15s;
}

.bg-preset-item:hover {
  border-color: #c7d2fe;
  transform: scale(1.05);
}

.bg-preset-item.active {
  border-color: #4f46e5;
}
</style>
