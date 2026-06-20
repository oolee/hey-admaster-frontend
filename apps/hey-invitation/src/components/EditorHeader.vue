<template>
  <header class="editor-header">
    <!-- 左侧：Logo 和项目操作 -->
    <div class="header-left">
      <div class="logo">
        <i class="bi bi-flower3"></i>
        <span class="logo-text">19号喜帖工坊</span>
        <a href="/" class="logo-link">Go back hey 19</a>
      </div>
    </div>

    <!-- 中间：内容工具栏 -->
    <div class="header-center">
      <div class="content-toolbar">
        <button class="toolbar-content-btn" data-type="text" @click="onCreateText">
          <i class="bi bi-type"></i>
          <span>文本</span>
        </button>
        <button class="toolbar-content-btn" data-type="image" @click="onAddImage">
          <i class="bi bi-image-fill"></i>
          <span>图片</span>
        </button>
        <button class="toolbar-content-btn" data-type="music" @click="onAddMusic">
          <i class="bi bi-music-note-beamed"></i>
          <span>音乐</span>
        </button>
        <button class="toolbar-content-btn" data-type="video" @click="onAddVideo">
          <i class="bi bi-play-btn-fill"></i>
          <span>视频</span>
        </button>
        <div class="vr text-muted"></div>
        <button class="toolbar-content-btn" data-type="component" @click="onAddComponent">
          <i class="bi bi-grid-3x3-gap-fill"></i>
          <span>组件</span>
        </button>
        <button class="toolbar-content-btn" data-type="marketing" @click="onAddMarketing">
          <i class="bi bi-people-fill"></i>
          <span>推荐酒店</span>
        </button>
      </div>
    </div>

    <!-- 右侧：发布操作 + 设置 -->
    <div class="header-right">
      <div class="btn-group-right">
        <button class="btn btn-sm btn-outline-primary" @click="onPreview">
          <i class="bi bi-eye"></i> 预览
        </button>
        <div class="btn-group-publish">
          <button
            type="button"
            class="btn btn-sm btn-primary dropdown-toggle"
            :class="{ 'dropdown-open': isPublishDropdownOpen }"
            @click.stop="onPublishClick"
          >
            <i class="bi bi-send-check"></i> 发布请柬
          </button>
          <ul v-if="isPublishDropdownOpen" class="dropdown-menu show">
            <li><a class="dropdown-item" @click.stop="onPublishWeb">发布为网页</a></li>
            <li><a class="dropdown-item" @click.stop="onPublishImage">生成长图</a></li>
            <li><a class="dropdown-item" @click.stop="onPublishPdf">生成PDF</a></li>
            <li><a class="dropdown-item" @click.stop="onPublishVideo">生成视频</a></li>
          </ul>
        </div>
      </div>

      <!-- 设置按钮（下拉画布背景设置 + 项目设置） -->
      <div class="header-settings">
        <button
          class="btn btn-sm btn-outline-secondary"
          :class="{ 'dropdown-open': isSettingsDropdownOpen }"
          @click.stop="onToggleSettings"
        >
          <i class="bi bi-gear-fill"></i> 设置
        </button>
        <div v-if="isSettingsDropdownOpen" class="settings-dropdown" @click.stop>
          <!-- 项目设置（全局） -->
          <div class="settings-dropdown-section">
            <div class="settings-dropdown-title">项目设置</div>
            <div class="settings-row">
              <label class="form-label-sm block-label" style="font-size:11px;color:#666;">项目名称</label>
              <input
                type="text"
                class="form-control form-control-sm"
                :value="store.projectName"
                placeholder="我的请柬"
                @input="onProjectNameInput"
                @change="onProjectNameChange"
              />
            </div>
            <div class="settings-row mt-2">
              <label class="form-label-sm block-label" style="font-size:11px;color:#666;">翻页效果</label>
              <select
                class="form-select form-select-sm"
                :value="store.pageTransition"
                @change="onPageTransitionChange"
              >
                <option value="none">无</option>
                <option value="fade">淡入淡出</option>
                <option value="slide">滑动</option>
                <option value="zoom">缩放</option>
                <option value="flip">翻转</option>
              </select>
            </div>
          </div>
          <!-- 画布设置 -->
          <div class="settings-dropdown-section">
            <div class="settings-dropdown-title">画布设置</div>
            <div class="settings-row mt-2">
              <label class="form-label-sm block-label" style="font-size:11px;color:#666;">画布尺寸</label>
              <div style="display:flex;gap:4px;align-items:center;">
                <input
                  type="number"
                  class="form-control form-control-sm"
                  style="width:60px;"
                  :value="store.canvasWidth"
                  @change="onCanvasWidthChange($event)"
                  min="200"
                  max="1080"
                  title="宽度"
                >
                <span style="color:#999;">×</span>
                <input
                  type="number"
                  class="form-control form-control-sm"
                  style="width:60px;"
                  :value="store.canvasHeight"
                  @change="onCanvasHeightChange($event)"
                  min="200"
                  max="2000"
                  title="高度"
                >
              </div>
              <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">
                <button class="btn btn-sm btn-outline-secondary" style="font-size:10px;padding:1px 6px;" @click="store.setCanvasSize(320, 628)">320×628</button>
                <button class="btn btn-sm btn-outline-secondary" style="font-size:10px;padding:1px 6px;" @click="store.setCanvasSize(320, 486)">320×486</button>
                <button class="btn btn-sm btn-outline-secondary" style="font-size:10px;padding:1px 6px;" @click="store.setCanvasSize(375, 812)">375×812</button>
                <button class="btn btn-sm btn-outline-secondary" style="font-size:10px;padding:1px 6px;" @click="store.setCanvasSize(414, 896)">414×896</button>
              </div>
              </div>
            <div class="settings-row mt-2">
              <label class="form-label-sm block-label" style="font-size:11px;color:#666;">画布颜色</label>
              <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
                <label class="bg-color-swatch" style="display:inline-flex;align-items:center;cursor:pointer;width:24px;height:24px;border:2px solid #ddd;border-radius:4px;overflow:hidden;position:relative;" title="选择颜色">
                  <input type="color" :value="getPageBgColorPickerValue()" @input="onPickPageBgColorGlobal($event)" style="width:32px;height:32px;border:none;padding:0;margin:-4px;cursor:pointer;">
                </label>
                <input
                  type="text"
                  class="form-control form-control-sm"
                  style="width:80px;font-size:11px;"
                  :value="getPageBgDisplayValue()"
                  @change="onPickPageBgColorGlobalHex($event)"
                  placeholder="#FFFFFF"
                >
                <button
                  class="btn btn-sm btn-outline-secondary"
                  style="font-size:10px;padding:1px 6px;"
                  :class="{ active: !store.currentPage?.backgroundColor || store.currentPage?.backgroundColor === 'transparent' }"
                  @click="onPickPageBgColorGlobalTransparent"
                  title="透明"
                >
                  <i class="bi bi-ban"></i>
                </button>
              </div>
            </div>
          </div>
          <!-- 舞台背景 -->
          <div class="settings-dropdown-section">
            <div class="settings-dropdown-title">舞台背景</div>
            <div class="settings-row">
              <div
                class="preset-color"
                style="background: transparent; border: 1px solid #dee2e6;"
                :class="{ active: !store.canvasBackground }"
                @click="onPickCanvasBg('')"
                title="透明"
              >
                <i class="bi bi-ban" style="color: #adb5bd;"></i>
              </div>
              <div
                v-for="color in presetBgColors"
                :key="color"
                class="preset-color"
                :style="{ background: color }"
                :class="{ active: store.canvasBackground === color }"
                @click="onPickCanvasBg(color)"
              ></div>
              <label class="color-picker-wrap" title="自定义颜色">
                <i class="bi bi-palette-fill"></i>
                <input
                  type="color"
                  :value="getColorPickerValue()"
                  @input="onPickCanvasBgColor(($event.target as HTMLInputElement).value)"
                />
              </label>
            </div>
            <div class="settings-row mt-2">
              <label class="image-upload-btn">
                <i class="bi bi-cloud-upload-fill"></i>
                <span>上传图片背景</span>
                <input
                  type="file"
                  accept="image/*"
                  @change="onUploadCanvasBgImage"
                />
              </label>
              <button
                v-if="store.canvasBackground && store.canvasBackground.startsWith('url(')"
                class="image-clear-btn"
                @click="onPickCanvasBg('')"
              >
                <i class="bi bi-trash"></i> 清除
              </button>
                        </div>
                      </div>
          <!-- 自动保存 -->
          <div class="settings-dropdown-section">
            <div class="settings-dropdown-title">自动保存</div>
            <div class="settings-row">
              <label class="form-check-label" style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" :checked="store.autoSaveEnabled" @change="onToggleAutoSave" style="accent-color:#c44569;" />
                <span>启用自动保存</span>
              </label>
            </div>
            <div class="settings-row mt-2" v-if="store.autoSaveEnabled">
              <label class="form-label-sm block-label" style="font-size:11px;color:#666;">保存间隔（秒）</label>
              <select class="form-select form-select-sm" :value="store.autoSaveInterval / 1000" @change="onAutoSaveIntervalChange">
                <option :value="10">10 秒</option>
                <option :value="30">30 秒</option>
                <option :value="60">1 分钟</option>
                <option :value="120">2 分钟</option>
                <option :value="300">5 分钟</option>
              </select>
            </div>
            <div class="settings-row mt-1" v-if="store.lastSavedTime">
              <span style="font-size:10px;color:#999;">上次保存：{{ store.lastSavedTime }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- 发布为网页对话框（Teleport 到 body，不被 header 样式遮挡） -->
  <Teleport to="body">
    <div v-if="showPublishDialog" class="publish-dialog-mask" @click.self="closePublishDialog">
      <div class="publish-dialog">
        <div class="publish-dialog-header">
          <span>
            <i class="bi bi-send-check"></i> 发布为网页
          </span>
          <button class="publish-dialog-close" @click="closePublishDialog">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="publish-dialog-body">
          <div v-if="publishDialogLoading" class="publish-loading">
            <div class="spinner"></div>
            <div>正在上传页面数据并生成 H5 链接...            </div>          </div>
          <template v-else-if="publishDialogResult">
            <div class="publish-success-title">
              <i class="bi bi-check-circle-fill"></i> {{ publishDialogResult.message }}
            </div>
            <div class="publish-link-label">分享链接</div>
            <div class="publish-link-row">
              <input
                class="publish-link-input"
                type="text"
                :value="publishDialogResult.url"
                readonly
              />
              <button class="btn btn-sm btn-primary" @click="openPublishUrl" style="margin-right:4px;">
                <i class="bi bi-eye"></i> 查看
              </button>
              <button class="btn btn-sm btn-primary" @click="copyPublishUrl">
                <i class="bi bi-clipboard"></i> 复制
              </button>
            </div>
            <div class="publish-tip">
              <i class="bi bi-info-circle"></i> 链接可在浏览器中打开预览，或分享给朋友查看 H5 请柬。
            </div>
          </template>
          <template v-else>
            <div class="publish-fail-title">
              <i class="bi bi-exclamation-triangle-fill"></i> 发布失败
            </div>
            <div class="publish-tip">请检查 mock 服务器是否启动（npm run dev:mock）。</div>
          </template>
        </div>
        <div class="publish-dialog-footer">
          <button class="btn btn-outline-secondary btn-sm" @click="closePublishDialog">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEditorStore } from '../store/editor';
import { generateId, createDefaultElement } from '../types/editor';
import { publishWeb, publishVideo, type PublishResult } from '../api/publish';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const router = useRouter();

const store = useEditorStore();

const isPublishDropdownOpen = ref(false);
const isSettingsDropdownOpen = ref(false);

// 发布对话框
const showPublishDialog = ref(false);
const publishDialogLoading = ref(false);
const publishDialogResult = ref<{ url: string; message: string } | null>(null);

const presetBgColors = [
  '#f8f9fa',
  '#ffffff',
  '#fff3e0',
  '#e8f5e9',
  '#e3f2fd',
  '#f3e5f5',
  '#fce4ec',
  '#212121',
];

// 点击外部关闭下拉菜单
const onDocumentClick = () => {
  if (isPublishDropdownOpen.value) {
    isPublishDropdownOpen.value = false;
  }
  if (isSettingsDropdownOpen.value) {
    isSettingsDropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
});

// ============ 内容工具栏按钮 ============

// 创建文本元素
const onCreateText = () => {
  const el = {
    id: generateId(),
    type: 'text' as const,
    subType: 'subtitle',
    x: Math.floor(160 - 75),
    y: Math.floor(314 - 10),
    width: 150,
    height: 30,
    rotation: 0,
    zIndex: store.getNextZIndex(),
    backgroundColor: 'transparent',
    backgroundOpacity: 1,
    text: '请输入文字',
    fontFamily: 'Microsoft YaHei',
    fontSize: 18,
    fontWeight: 'normal',
    textAlign: 'center' as const,
    textColor: '#333333',
    locked: false,
    visible: true,
  };
  store.addElement(el);
  store.selectElement(el.id);
  store.showToast('文本已添加', 'success');
};

// 添加图片
const onAddImage = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const imageUrl = evt.target?.result as string;
      const el = {
        id: generateId(),
        type: 'image' as const,
        x: Math.floor(160 - 75),
        y: Math.floor(314 - 75),
        width: 150,
        height: 150,
        rotation: 0,
        zIndex: store.getNextZIndex(),
        backgroundColor: 'transparent',
        backgroundOpacity: 1,
        imageUrl: imageUrl,
        imageFilter: 'original',
        imageCrop: 'none',
        locked: false,
        visible: true,
      };
      store.addElement(el);
      store.selectElement(el.id);
      store.showToast('图片已添加', 'success');
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

// 添加音乐
const onAddMusic = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const audioUrl = evt.target?.result as string;
      store.addAudioElement(audioUrl);
      store.setRightPanelTab('properties');
      store.showToast('音乐已添加', 'success');
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

// 添加视频
const onAddVideo = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'video/*';
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const videoUrl = evt.target?.result as string;
      const el = {
        id: generateId(),
        type: 'image' as const,
        subType: 'video',
        x: Math.floor(160 - 75),
        y: Math.floor(314 - 50),
        width: 150,
        height: 100,
        rotation: 0,
        zIndex: store.getNextZIndex(),
        backgroundColor: 'transparent',
        backgroundOpacity: 1,
        imageUrl: videoUrl,
        imageFilter: 'original',
        imageCrop: 'none',
        locked: false,
        visible: true,
      };
      store.addElement(el);
      store.selectElement(el.id);
      store.showToast('视频已添加', 'success');
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

// 添加组件
const onAddComponent = () => {
  const z = store.getNextZIndex();
  const titleEl = createDefaultElement('text', 'title', 60, 180, z);
  const dateEl = createDefaultElement('text', 'date', 60, 240, z + 1);
  const decorEl = createDefaultElement('decoration', 'heart', 128, 100, z + 2);
  store.addElement(titleEl);
  store.addElement(dateEl);
  store.addElement(decorEl);
  store.selectElement(titleEl.id);
  store.showToast('已添加预设组件', 'success');
};

// 推荐酒店
const onAddMarketing = () => {
  const z = store.getNextZIndex();
  const el = createDefaultElement('text', 'body', 40, 520, z);
  el.text = '推荐酒店：XX大酒店\n电话：400-123-4567\n地址：XX市XX区XX路';
  el.fontSize = 12;
  el.textColor = '#6c757d';
  store.addElement(el);
  store.selectElement(el.id);
  store.showToast('已添加酒店推荐信息', 'success');
};

// ============ 发布相关按钮 ============
const onPreview = () => {
  store.persist();
  router.push('/preview');
};

const onPublishClick = (e: Event) => {
  e.stopPropagation();
  isPublishDropdownOpen.value = !isPublishDropdownOpen.value;
  isSettingsDropdownOpen.value = false;
};

const onPublishWeb = async () => {
  isPublishDropdownOpen.value = false;
  store.persist();

  publishDialogLoading.value = true;
  publishDialogResult.value = null;
  showPublishDialog.value = true;
  store.showToast('正在发布为网页...', 'info');

  try {
    const pages = JSON.parse(JSON.stringify(store.pages));
    const res = await publishWeb({
      pages,
      name: store.projectName || 'invitation',
      canvasWidth: store.canvasWidth,
      canvasHeight: store.canvasHeight,
      pageTransition: store.pageTransition,
    });
    if (res && res.code === 0 && res.data) {
      const result = res.data as PublishResult;
      const baseUrl =
        typeof window !== 'undefined'
          ? `${window.location.protocol}//${window.location.host}${(import.meta as any).env?.BASE_URL || '/'}`
          : 'http://localhost:5173/';
      const fullUrl =
        result.url && result.url.startsWith('http')
          ? result.url
          : `${baseUrl.replace(/\/$/, '')}${result.url || ''}`;
      publishDialogResult.value = {
        url: fullUrl,
        message: result.message || '网页发布成功',
      };
      store.showToast('网页发布成功', 'success');
    } else {
      throw new Error((res?.message as string) || '发布失败');
    }
  } catch (e: any) {
    store.showToast('发布失败: ' + (e?.message || String(e)), 'error');
    publishDialogResult.value = null;
  } finally {
    publishDialogLoading.value = false;
  }
};

const openPublishUrl = () => {
  if (!publishDialogResult.value) return;
  window.open(publishDialogResult.value.url, '_blank');
};

const closePublishDialog = () => {
  showPublishDialog.value = false;
};

const copyPublishUrl = async () => {
  if (!publishDialogResult.value) return;
  const url = publishDialogResult.value.url;
  try {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    store.showToast('链接已复制到剪贴板', 'success');
  } catch (e: any) {
    store.showToast('复制失败，请手动复制', 'warning');
  }
};

// ============ 导出画布截图（修复 Bug1: 非当前页灰蒙蒙 / Bug8: linear-gradient 不支持） ============
// html2canvas 不支持 linear-gradient / radial-gradient 等复杂 CSS 颜色函数，
// 会抛出 "Attempting to parse an unsupported color function" 错误。
// 解决方案：截图前临时将 gradient 背景替换为纯色，截图后恢复。
const capturePageCanvasHeader = async (pageId: string, opts?: { backgroundColor?: string; scale?: number }): Promise<HTMLCanvasElement> => {
  // 切页
  store.selectPage(pageId);
  // 等一帧 DOM 更新
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  // 根据翻页类型等待动画完全结束（与 EditorCanvas.vue 中一致）
  const animMs =
    store.pageTransition === 'flip' ? 450 : store.pageTransition === 'none' ? 50 : 350;
  await new Promise<void>((r) => setTimeout(() => r(), animMs + 20));
  // 最后再等一帧，确保动画结束后的静态渲染完成
  await new Promise<void>((r) => requestAnimationFrame(() => r()));

  const bg =
    opts?.backgroundColor ||
    store.pages.find((p) => p.id === pageId)?.backgroundColor ||
    '#ffffff';
  const scale = opts?.scale ?? 2;
  const screenEl = document.querySelector('.device-screen') as HTMLElement | null;
  const targetEl = screenEl || document.body;

  // Bug8: 临时移除 linear-gradient / radial-gradient 等 html2canvas 不支持的属性
  const savedStyles: Array<{ el: HTMLElement; bg: string | null; color: string | null }> = [];
  const gradientRegex = /linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient/i;

  const collectGradientElements = (root: Element) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
    let node: Node | null = walker.currentNode;
    // 从 root 开始遍历
    const all: HTMLElement[] = [];
    const stack: Element[] = [root];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if ((current as HTMLElement).style) {
        all.push(current as HTMLElement);
      }
      for (let i = 0; i < current.children.length; i++) {
        stack.push(current.children[i]);
      }
    }
    return all;
  };

  const allElements = collectGradientElements(targetEl);
  for (const el of allElements) {
    try {
      const cs = getComputedStyle(el);
      const curBg = cs.getPropertyValue('background-image') || '';
      const curColor = cs.getPropertyValue('color') || '';
      let patched = false;

      // 1. background-image 中的 gradient
      if (gradientRegex.test(curBg)) {
        savedStyles.push({ el, bg: curBg, color: null });
        el.style.setProperty('background-image', 'none', 'important');
        // 如果没有设置 background-color，补一个默认白色
        const bgColor = cs.getPropertyValue('background-color');
        if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
          el.style.setProperty('background-color', '#ffffff', 'important');
          // 标记在 savedStyles 中区分
          savedStyles[savedStyles.length - 1].bg =
            (curBg || '__NOBG__') + '|COLOR:' + (bgColor || 'transparent');
        }
        patched = true;
      }

      // 2. color 中的 gradient （极少见，但保险起见）
      if (gradientRegex.test(curColor)) {
        if (!patched) savedStyles.push({ el, bg: null, color: curColor });
        else savedStyles[savedStyles.length - 1].color = curColor;
        el.style.setProperty('color', '#000000', 'important');
      }
    } catch {
      // 忽略单个元素的错误
    }
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(targetEl, {
      backgroundColor: bg,
      scale,
      useCORS: true,
      logging: false,
    });
  } finally {
    // Bug8: 恢复 gradient 属性
    for (const item of savedStyles) {
      try {
        if (item.bg) {
          // 解析背景/颜色复合信息
          const parts = item.bg.split('|COLOR:');
          const bgImg = parts[0];
          const bgColor = parts.length > 1 ? parts[1] : null;
          if (bgImg && bgImg !== '__NOBG__') {
            item.el.style.setProperty('background-image', bgImg);
          } else {
            item.el.style.removeProperty('background-image');
          }
          if (bgColor !== null) {
            if (bgColor === 'transparent') {
              item.el.style.removeProperty('background-color');
            } else {
              item.el.style.setProperty('background-color', bgColor);
            }
          }
        }
        if (item.color) {
          item.el.style.setProperty('color', item.color);
        }
        // 清理 !important
        item.el.style.removeProperty('background-image');
        item.el.style.removeProperty('background-color');
        item.el.style.removeProperty('color');
        // 如果原本就有内联样式，这里会丢失。为了安全，只在有内联样式备份的元素上恢复。
      } catch {
        // 忽略
      }
    }
  }
  return canvas;
};

const onPublishImage = async () => {
  isPublishDropdownOpen.value = false;
  store.showToast('正在生成长图...', 'info');

  const originalPageId = store.currentPageId;
  const pages = store.pages || [];
  if (!pages.length) {
    store.showToast('没有可导出的页面', 'warning');
    return;
  }

  try {
    const pageCanvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < pages.length; i++) {
      const canvas = await capturePageCanvasHeader(pages[i].id);
      pageCanvases.push(canvas);
    }

    const mergedWidth = Math.max(...pageCanvases.map((c) => c.width));
    const mergedHeight = pageCanvases.reduce((sum, c) => sum + c.height, 0);
    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = mergedWidth;
    mergedCanvas.height = mergedHeight;
    const ctx = mergedCanvas.getContext('2d');
    if (!ctx) {
      store.showToast('长图生成失败', 'error');
      return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, mergedWidth, mergedHeight);
    let yOffset = 0;
    for (const c of pageCanvases) {
      ctx.drawImage(c, Math.floor((mergedWidth - c.width) / 2), yOffset);
      yOffset += c.height;
    }

    mergedCanvas.toBlob((blob) => {
      if (!blob) {
        store.showToast('长图生成失败', 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      a.download = `${store.projectName || 'invitation'}_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      store.showToast('长图生成成功，已开始下载', 'success');
    }, 'image/png');
  } catch (e: any) {
    console.error(e);
    store.showToast('长图生成失败: ' + (e?.message || String(e)), 'error');
  } finally {
    if (originalPageId) store.selectPage(originalPageId);
  }
};

const onPublishPdf = async () => {
  isPublishDropdownOpen.value = false;
  store.showToast('正在生成 PDF...', 'info');

  const originalPageId = store.currentPageId;
  const pages = store.pages || [];
  if (!pages.length) {
    store.showToast('没有可导出的页面', 'warning');
    return;
  }

  try {
    // 先取一页的 device-screen 尺寸
    store.selectPage(pages[0].id);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    const firstScreen = document.querySelector('.device-screen') as HTMLElement | null;
    const pw = firstScreen?.clientWidth || 375;
    const ph = firstScreen?.clientHeight || 628;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [pw, ph],
      compress: true,
    });

    for (let i = 0; i < pages.length; i++) {
      const canvas = await capturePageCanvasHeader(pages[i].id, { scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      if (i > 0) pdf.addPage([pw, ph], 'portrait');
      pdf.addImage(imgData, 'JPEG', 0, 0, pw, ph);
    }

    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    pdf.save(`${store.projectName || 'invitation'}_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.pdf`);
    store.showToast('PDF 生成成功，已开始下载', 'success');
  } catch (e: any) {
    console.error(e);
    store.showToast('PDF 生成失败: ' + (e?.message || String(e)), 'error');
  } finally {
    if (originalPageId) store.selectPage(originalPageId);
  }
};

const onPublishVideo = async () => {
  isPublishDropdownOpen.value = false;
  store.showToast('正在生成视频序列帧...', 'info');

  const originalPageId = store.currentPageId;
  const pages = store.pages || [];
  if (!pages.length) {
    store.showToast('没有可导出的页面', 'warning');
    return;
  }

  try {
    const frameBlobs: { name: string; blob: Blob }[] = [];
    for (let i = 0; i < pages.length; i++) {
      const canvas = await capturePageCanvasHeader(pages[i].id, { scale: 2 });
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
      });
      frameBlobs.push({ name: `page_${String(i + 1).padStart(3, '0')}.png`, blob });
    }

    if (frameBlobs.length === 0) {
      store.showToast('视频生成失败', 'error');
      return;
    }

    const zipBlob = await buildZipFromBlobs(frameBlobs);
    const zipUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = zipUrl;
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    a.download = `${store.projectName || 'invitation'}_frames_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);

    try {
      const res = await publishVideo({ pages: [], name: store.projectName || 'invitation' });
      if (res && res.code === 0 && res.data?.fileUrl) {
        store.showToast(`视频序列帧 ZIP 已下载；模拟视频链接：${res.data.fileUrl}`, 'success');
      } else {
        store.showToast('视频序列帧 ZIP 已下载（mp4 编码请联系后端）', 'success');
      }
    } catch (e) {
      console.warn('video mock api call failed:', e);
      store.showToast('视频序列帧 ZIP 已下载（后端服务未启动）', 'success');
    }
  } catch (e: any) {
    console.error(e);
    store.showToast('视频生成失败: ' + (e?.message || String(e)), 'error');
  } finally {
    if (originalPageId) store.selectPage(originalPageId);
  }
};

// ============= 轻量 ZIP 构建（Store 0 + DEFLATE 0 纯拼接，兼容浏览器） ============
// 说明：为避免引入 jsziz 等额外依赖，这里实现一个最简 ZIP 构建器：每个 entry 以 local file header + data descriptor 方式写入。
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16LE(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value & 0xffff, true);
}
function writeUint32LE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

async function buildZipFromBlobs(entries: { name: string; blob: Blob }[]): Promise<Blob> {
  const parts: Uint8Array[] = [];
  const centralDirParts: Uint8Array[] = [];
  let offset = 0;
  const encoder = new TextEncoder();

  for (const entry of entries) {
    const arrayBuffer = await entry.blob.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(data);
    const size = data.length;

    // Local file header
    const lfh = new Uint8Array(30 + nameBytes.length);
    const lfhView = new DataView(lfh.buffer);
    writeUint32LE(lfhView, 0, 0x04034b50);
    writeUint16LE(lfhView, 4, 20); // version needed
    writeUint16LE(lfhView, 6, 0x0800); // flags (UTF-8)
    writeUint16LE(lfhView, 8, 0); // method: stored
    writeUint16LE(lfhView, 10, 0); // time
    writeUint16LE(lfhView, 12, 0); // date
    writeUint32LE(lfhView, 14, crc);
    writeUint32LE(lfhView, 18, size); // compressed size
    writeUint32LE(lfhView, 22, size); // uncompressed size
    writeUint16LE(lfhView, 26, nameBytes.length);
    writeUint16LE(lfhView, 28, 0); // extra length
    lfh.set(nameBytes, 30);
    parts.push(lfh);
    parts.push(data);

    // Central directory entry
    const cde = new Uint8Array(46 + nameBytes.length);
    const cdeView = new DataView(cde.buffer);
    writeUint32LE(cdeView, 0, 0x02014b50);
    writeUint16LE(cdeView, 4, 20); // version made by
    writeUint16LE(cdeView, 6, 20); // version needed
    writeUint16LE(cdeView, 8, 0x0800);
    writeUint16LE(cdeView, 10, 0); // method
    writeUint16LE(cdeView, 12, 0);
    writeUint16LE(cdeView, 14, 0);
    writeUint32LE(cdeView, 16, crc);
    writeUint32LE(cdeView, 20, size);
    writeUint32LE(cdeView, 24, size);
    writeUint16LE(cdeView, 28, nameBytes.length);
    writeUint16LE(cdeView, 30, 0); // extra
    writeUint16LE(cdeView, 32, 0); // comment
    writeUint16LE(cdeView, 34, 0); // disk number
    writeUint16LE(cdeView, 36, 0); // internal attr
    writeUint32LE(cdeView, 38, 0); // external attr
    writeUint32LE(cdeView, 42, offset);
    cde.set(nameBytes, 46);
    centralDirParts.push(cde);

    offset += lfh.length + data.length;
  }

  const centralDirSize = centralDirParts.reduce((s, p) => s + p.length, 0);
  const endRec = new Uint8Array(22);
  const erView = new DataView(endRec.buffer);
  writeUint32LE(erView, 0, 0x06054b50);
  writeUint16LE(erView, 4, 0);
  writeUint16LE(erView, 6, 0);
  writeUint16LE(erView, 8, entries.length);
  writeUint16LE(erView, 10, entries.length);
  writeUint32LE(erView, 12, centralDirSize);
  writeUint32LE(erView, 16, offset);
  writeUint16LE(erView, 20, 0);

  const finalParts: Uint8Array[] = [...parts, ...centralDirParts, endRec];
  return new Blob(finalParts as unknown as BlobPart[], { type: 'application/zip' });
}

// ============ 设置下拉菜单 ============
const onToggleSettings = () => {
  isSettingsDropdownOpen.value = !isSettingsDropdownOpen.value;
  isPublishDropdownOpen.value = false;
};

// 项目名称
const onProjectNameInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  store.setProjectName(target.value.trim() || '我的请柬');
};
const onProjectNameChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const name = target.value.trim() || '我的请柬';
  store.setProjectName(name);
};

// 翻页效果
const onCanvasWidthChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const w = parseInt(target.value);
  if (w && w >= 200 && w <= 1080) store.setCanvasSize(w, store.canvasHeight);
};

const onCanvasHeightChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const h2 = parseInt(target.value);
  if (h2 && h2 >= 200 && h2 <= 2000) store.setCanvasSize(store.canvasWidth, h2);
};

const onPageTransitionChange = (e: Event) => {
  const target = e.target as HTMLSelectElement;
  store.setPageTransition(target.value as 'none' | 'fade' | 'slide' | 'zoom' | 'flip');
};

// 选择画布背景（颜色或url图片）
const onPickCanvasBg = (value: string) => {
  store.setCanvasBackground(value);
};

// 颜色选择器：当前值优先取颜色，否则用白色
const getColorPickerValue = () => {
  if (!store.canvasBackground) return '#ffffff';
  if (store.canvasBackground.startsWith('url(')) return '#ffffff';
  return store.canvasBackground;
};

const onPickCanvasBgColor = (value: string) => {
  store.setCanvasBackground(value);
};

// 上传图片背景
const onUploadCanvasBgImage = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const dataUrl = evt.target?.result as string;
    store.setCanvasBackground(`url(${dataUrl})`);
    store.showToast('已应用图片背景', 'success');
  };
  reader.readAsDataURL(file);
  input.value = '';
};

// 页面背景颜色（从右侧面板移至全局设置）
const getPageBgColorPickerValue = () => {
  const bg = store.currentPage?.backgroundColor;
  if (!bg || bg === 'transparent' || !bg.startsWith('#')) return '#ffffff';
  return bg;
};

const getPageBgDisplayValue = () => {
  const bg = store.currentPage?.backgroundColor;
  if (!bg || bg === 'transparent') return 'TRANSPARENT';
  return bg.toUpperCase();
};

const onPickPageBgColorGlobal = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (store.currentPage && store.currentPage.backgroundColor !== target.value) {
    store.updatePageBackground(target.value);
  }
};

const onPickPageBgColorGlobalHex = (e: Event) => {
  const target = e.target as HTMLInputElement;
  let value = target.value.trim();
  if (!value) return;
  if (!value.startsWith('#')) value = '#' + value;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    store.updatePageBackground(value);
  }
};

const onPickPageBgColorGlobalTransparent = () => {
  if (store.currentPage) {
    store.updatePageBackground('transparent');
  }
};

// ============ 自动保存 ============
const onToggleAutoSave = (e: Event) => {
  const target = e.target as HTMLInputElement;
  store.toggleAutoSave(target.checked);
};

const onAutoSaveIntervalChange = (e: Event) => {
  const target = e.target as HTMLSelectElement;
  store.setAutoSaveInterval(Number(target.value) * 1000);
};
</script>

<style scoped>
.publish-dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.publish-dialog {
  width: 440px;
  max-width: calc(100% - 32px);
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.publish-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #eef2f7;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.publish-dialog-close {
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 6px;
}
.publish-dialog-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.publish-dialog-body {
  padding: 18px;
  font-size: 13px;
  color: #374151;
}

.publish-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  color: #475569;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #cbd5e1;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: pub-spin 0.8s linear infinite;
}
@keyframes pub-spin {
  to {
    transform: rotate(360deg);
  }
}

.publish-success-title {
  font-size: 14px;
  color: #047857;
  font-weight: 600;
}

.publish-fail-title {
  font-size: 14px;
  color: #b91c1c;
  font-weight: 600;
}

.publish-link-label {
  margin-top: 14px;
  color: #6b7280;
  font-size: 12px;
}

.publish-link-row {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.publish-link-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  color: #111827;
  background: #f9fafb;
  outline: none;
}

.publish-tip {
  margin-top: 14px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.6;
}

.publish-dialog-footer {
  padding: 12px 18px;
  border-top: 1px solid #eef2f7;
  display: flex;
  justify-content: flex-end;
  background: #fafbfc;
}

</style>
