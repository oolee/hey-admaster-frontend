<script setup lang="ts">
import type { PublishResult } from '../api/publish';

import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import html2canvas from 'html2canvas';
import { jsPDF as JsFPD } from 'jspdf';

import { publishVideo, publishWeb } from '../api/publish';
import { useEditorStore } from '../store/editor';
import { createDefaultElement, generateId } from '../types/editor';
import PromptDialog from './PromptDialog.vue';

const router = useRouter();

const store = useEditorStore();

const isPublishDropdownOpen = ref(false);
const isSettingsDropdownOpen = ref(false);
const showProjectManager = ref(false);
const showCreateProjectPrompt = ref(false);

// 发布对话框
const showPublishDialog = ref(false);
const publishDialogLoading = ref(false);
const publishDialogResult = ref<null | { message: string; url: string }>(null);

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
  input.addEventListener('change', (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    // oxlint-disable-next-line unicorn/prefer-add-event-listener
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
        imageUrl,
        imageFilter: 'original',
        imageCrop: 'none',
        locked: false,
        visible: true,
      };
      store.addElement(el);
      store.selectElement(el.id);
      store.showToast('图片已添加', 'success');
    };
    // oxlint-disable-next-line unicorn/prefer-blob-reading-methods
    reader.readAsDataURL(file);
  });
  input.click();
};

// 添加音乐
const onAddMusic = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  // oxlint-disable-next-line unicorn/prefer-add-event-listener
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    // oxlint-disable-next-line unicorn/prefer-add-event-listener
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
  // oxlint-disable-next-line unicorn/prefer-add-event-listener
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    // oxlint-disable-next-line unicorn/prefer-add-event-listener
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
        typeof window === 'undefined'
          ? 'http://localhost:5173/'
          : `${window.location.protocol}//${window.location.host}${(import.meta as any).env?.BASE_URL || '/'}`;
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
  } catch (error: any) {
    store.showToast(`发布失败: ${error?.message || String(error)}`, 'error');
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
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    store.showToast('链接已复制到剪贴板', 'success');
  } catch {
    store.showToast('复制失败，请手动复制', 'warning');
  }
};

// ============ 导出画布截图（修复 Bug1: 非当前页灰蒙蒙 / Bug8: linear-gradient 不支持） ============
// html2canvas 不支持 linear-gradient / radial-gradient 等复杂 CSS 颜色函数，
// 会抛出 "Attempting to parse an unsupported color function" 错误。
// 解决方案：截图前临时将 gradient 背景替换为纯色，截图后恢复。
const capturePageCanvasHeader = async (
  pageId: string,
  opts?: { backgroundColor?: string; scale?: number },
): Promise<HTMLCanvasElement> => {
  // 切页
  store.selectPage(pageId);
  // 等一帧 DOM 更新
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  // 根据翻页类型等待动画完全结束（与 EditorCanvas.vue 中一致）
  let animMs = 350;
  if (store.pageTransition === 'flip') {
    animMs = 450;
  } else if (store.pageTransition === 'none') {
    animMs = 50;
  }
  await new Promise<void>((r) => setTimeout(() => r(), animMs + 20));
  // 最后再等一帧，确保动画结束后的静态渲染完成
  await new Promise<void>((r) => requestAnimationFrame(() => r()));

  const bg =
    opts?.backgroundColor ||
    store.pages.find((p) => p.id === pageId)?.backgroundColor ||
    '#ffffff';
  const scale = opts?.scale ?? 2;
  const screenEl = document.querySelector(
    '.device-screen',
  ) as HTMLElement | null;
  const targetEl = screenEl || document.body;

  // Bug8: 临时移除 linear-gradient / radial-gradient 等 html2canvas 不支持的属性
  const savedStyles: Array<{
    bg: null | string;
    color: null | string;
    el: HTMLElement;
  }> = [];
  const gradientRegex =
    /linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient/i;

  const collectGradientElements = (root: Element) => {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      null,
    );
    const node: Node | null = walker.currentNode;
    // 从 root 开始遍历
    const all: HTMLElement[] = [];
    const stack: Element[] = [root];
    while (stack.length > 0) {
      // oxlint-disable typescript/no-non-null-assertion
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
        if (
          !bgColor ||
          bgColor === 'transparent' ||
          bgColor === 'rgba(0, 0, 0, 0)'
        ) {
          el.style.setProperty('background-color', '#ffffff', 'important');
          // 标记在 savedStyles 中区分
          savedStyles[savedStyles.length - 1].bg =
            `${curBg || '__NOBG__'}|COLOR:${bgColor || 'transparent'}`;
        }
        patched = true;
      }

      // 2. color 中的 gradient （极少见，但保险起见）
      let animMs = 350;
      if (store.pageTransition === 'flip') {
        animMs = 450;
      } else if (store.pageTransition === 'none') {
        animMs = 50;
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
  if (pages.length === 0) {
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
      document.body.append(a);
      a.click();
      a.remove();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      store.showToast('长图生成成功，已开始下载', 'success');
    }, 'image/png');
  } catch (error: any) {
    console.error(error);
    store.showToast(
      `长图生成失败: ${error?.message || String(error)}`,
      'error',
    );
  } finally {
    if (originalPageId) store.selectPage(originalPageId);
  }
};

const onPublishPdf = async () => {
  isPublishDropdownOpen.value = false;
  store.showToast('正在生成 PDF...', 'info');

  const originalPageId = store.currentPageId;
  const pages = store.pages || [];
  if (pages.length === 0) {
    store.showToast('没有可导出的页面', 'warning');
    return;
  }

  try {
    // 先取一页的 device-screen 尺寸
    store.selectPage(pages[0].id);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    const firstScreen = document.querySelector(
      '.device-screen',
    ) as HTMLElement | null;
    const pw = firstScreen?.clientWidth || 375;
    const ph = firstScreen?.clientHeight || 628;
    const pdf = new JsFPD({
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
    pdf.save(
      `${store.projectName || 'invitation'}_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.pdf`,
    );
    store.showToast('PDF 生成成功，已开始下载', 'success');
  } catch (error: any) {
    console.error(error);
    store.showToast(
      `PDF 生成失败: ${error?.message || String(error)}`,
      'error',
    );
  } finally {
    if (originalPageId) store.selectPage(originalPageId);
  }
};

const onPublishVideo = async () => {
  isPublishDropdownOpen.value = false;
  store.showToast('正在生成视频序列帧...', 'info');

  const originalPageId = store.currentPageId;
  const pages = store.pages || [];
  if (pages.length === 0) {
    store.showToast('没有可导出的页面', 'warning');
    return;
  }

  try {
    const frameBlobs: { blob: Blob; name: string }[] = [];
    for (let i = 0; i < pages.length; i++) {
      const canvas = await capturePageCanvasHeader(pages[i].id, { scale: 2 });
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/png',
        );
      });
      frameBlobs.push({
        name: `page_${String(i + 1).padStart(3, '0')}.png`,
        blob,
      });
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
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);

    try {
      const res = await publishVideo({
        pages: [],
        name: store.projectName || 'invitation',
      });
      if (res && res.code === 0 && res.data?.fileUrl) {
        store.showToast(
          `视频序列帧 ZIP 已下载；模拟视频链接：${res.data.fileUrl}`,
          'success',
        );
      } else {
        store.showToast(
          '视频序列帧 ZIP 已下载（mp4 编码请联系后端）',
          'success',
        );
      }
    } catch (error) {
      console.warn('video mock api call failed:', error);
      store.showToast('视频序列帧 ZIP 已下载（后端服务未启动）', 'success');
    }
  } catch (error: any) {
    console.error(error);
    store.showToast(
      `视频生成失败: ${error?.message || String(error)}`,
      'error',
    );
  } finally {
    if (originalPageId) store.selectPage(originalPageId);
  }
};

// ============= 轻量 ZIP 构建（Store 0 + DEFLATE 0 纯拼接，兼容浏览器） ============
// 说明：为避免引入 jsziz 等额外依赖，这里实现一个最简 ZIP 构建器：每个 entry 以 local file header + data descriptor 方式写入。
function crc32(bytes: Uint8Array): number {
  let crc = 0xff_ff_ff_ff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xed_b8_83_20 : 0);
    }
  }
  return Math.trunc(crc ^ 0xff_ff_ff_ff);
}

function writeUint16LE(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value & 0xff_ff, true);
}
function writeUint32LE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, Math.trunc(value), true);
}

async function buildZipFromBlobs(
  entries: { blob: Blob; name: string }[],
): Promise<Blob> {
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
    writeUint32LE(lfhView, 0, 0x04_03_4b_50);
    writeUint16LE(lfhView, 4, 20); // version needed
    writeUint16LE(lfhView, 6, 0x08_00); // flags (UTF-8)
    writeUint16LE(lfhView, 8, 0); // method: stored
    writeUint16LE(lfhView, 10, 0); // time
    writeUint16LE(lfhView, 12, 0); // date
    writeUint32LE(lfhView, 14, crc);
    writeUint32LE(lfhView, 18, size); // compressed size
    writeUint32LE(lfhView, 22, size); // uncompressed size
    writeUint16LE(lfhView, 26, nameBytes.length);
    writeUint16LE(lfhView, 28, 0); // extra length
    lfh.set(nameBytes, 30);
    parts.push(lfh, data);

    // Central directory entry
    const cde = new Uint8Array(46 + nameBytes.length);
    const cdeView = new DataView(cde.buffer);
    writeUint32LE(cdeView, 0, 0x02_01_4b_50);
    writeUint16LE(cdeView, 4, 20); // version made by
    writeUint16LE(cdeView, 6, 20); // version needed
    writeUint16LE(cdeView, 8, 0x08_00);
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
  writeUint32LE(erView, 0, 0x06_05_4b_50);
  writeUint16LE(erView, 4, 0);
  writeUint16LE(erView, 6, 0);
  writeUint16LE(erView, 8, entries.length);
  writeUint16LE(erView, 10, entries.length);
  writeUint32LE(erView, 12, centralDirSize);
  writeUint32LE(erView, 16, offset);
  writeUint16LE(erView, 20, 0);

  const finalParts: Uint8Array[] = [...parts, ...centralDirParts, endRec];
  return new Blob(finalParts as unknown as BlobPart[], {
    type: 'application/zip',
  });
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
  const w = Number.parseInt(target.value);
  if (w && w >= 200 && w <= 1080) store.setCanvasSize(w, store.canvasHeight);
};

const onCanvasHeightChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const h2 = Number.parseInt(target.value);
  if (h2 && h2 >= 200 && h2 <= 2000) store.setCanvasSize(store.canvasWidth, h2);
};

const onPageTransitionChange = (e: Event) => {
  const target = e.target as HTMLSelectElement;
  store.setPageTransition(
    target.value as 'fade' | 'flip' | 'none' | 'slide' | 'zoom',
  );
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
  reader.addEventListener('load', (evt) => {
    const dataUrl = (evt.target as FileReader).result as string;
    store.setCanvasBackground(`url(${dataUrl})`);
    store.showToast('已应用图片背景', 'success');
  });
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
  if (!value.startsWith('#')) value = `#${value}`;
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

// ============ 项目管理 ============
const onProjectManager = () => {
  showProjectManager.value = true;
  isSettingsDropdownOpen.value = false;
};

const onCreateProject = () => {
  showCreateProjectPrompt.value = true;
};

const onConfirmCreateProject = (name: string) => {
  store.createNewProject(name);
  showProjectManager.value = false;
  store.showToast('已创建新项目', 'success');
};

const onSwitchProject = (projectId: string) => {
  if (projectId === store.currentProjectId) {
    showProjectManager.value = false;
    return;
  }
  store.saveToLocal();
  store.loadProject(projectId);
  showProjectManager.value = false;
  store.showToast('已切换项目', 'success');
};

const onDeleteProject = (projectId: string) => {
  store.deleteProject(projectId);
  store.showToast('项目已删除', 'success');
};
</script>

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
        <button
          class="toolbar-content-btn"
          data-type="text"
          @click="onCreateText"
        >
          <i class="bi bi-type"></i>
          <span>文本</span>
        </button>
        <button
          class="toolbar-content-btn"
          data-type="image"
          @click="onAddImage"
        >
          <i class="bi bi-image-fill"></i>
          <span>图片</span>
        </button>
        <button
          class="toolbar-content-btn"
          data-type="music"
          @click="onAddMusic"
        >
          <i class="bi bi-music-note-beamed"></i>
          <span>音乐</span>
        </button>
        <button
          class="toolbar-content-btn"
          data-type="video"
          @click="onAddVideo"
        >
          <i class="bi bi-play-btn-fill"></i>
          <span>视频</span>
        </button>
        <div class="vr text-muted"></div>
        <button
          class="toolbar-content-btn"
          data-type="component"
          @click="onAddComponent"
        >
          <i class="bi bi-grid-3x3-gap-fill"></i>
          <span>组件</span>
        </button>
        <button
          class="toolbar-content-btn"
          data-type="marketing"
          @click="onAddMarketing"
        >
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
            <li>
              <a class="dropdown-item" @click.stop="onPublishWeb">发布为网页</a>
            </li>
            <li>
              <a class="dropdown-item" @click.stop="onPublishImage">生成长图</a>
            </li>
            <li>
              <a class="dropdown-item" @click.stop="onPublishPdf">生成PDF</a>
            </li>
            <li>
              <a class="dropdown-item" @click.stop="onPublishVideo">生成视频</a>
            </li>
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
        <div
          v-if="isSettingsDropdownOpen"
          class="settings-dropdown"
          @click.stop
        >
          <!-- 项目设置（全局） -->
          <div class="settings-dropdown-section">
            <div class="settings-dropdown-title">项目设置</div>
            <div class="settings-row">
              <label
                class="form-label-sm block-label"
                style="font-size: 11px; color: #666"
                >项目名称</label
              >
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
              <label
                class="form-label-sm block-label"
                style="font-size: 11px; color: #666"
                >翻页效果</label
              >
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
              <label
                class="form-label-sm block-label"
                style="font-size: 11px; color: #666"
                >画布尺寸</label
              >
              <div style="display: flex; gap: 4px; align-items: center">
                <input
                  type="number"
                  class="form-control form-control-sm"
                  style="width: 60px"
                  :value="store.canvasWidth"
                  @change="onCanvasWidthChange($event)"
                  min="200"
                  max="1080"
                  title="宽度"
                />
                <span style="color: #999">×</span>
                <input
                  type="number"
                  class="form-control form-control-sm"
                  style="width: 60px"
                  :value="store.canvasHeight"
                  @change="onCanvasHeightChange($event)"
                  min="200"
                  max="2000"
                  title="高度"
                />
              </div>
              <div
                style="
                  display: flex;
                  flex-wrap: wrap;
                  gap: 4px;
                  margin-top: 4px;
                "
              >
                <button
                  class="btn btn-sm btn-outline-secondary"
                  style="padding: 1px 6px; font-size: 10px"
                  @click="store.setCanvasSize(320, 628)"
                >
                  320×628
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary"
                  style="padding: 1px 6px; font-size: 10px"
                  @click="store.setCanvasSize(320, 486)"
                >
                  320×486
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary"
                  style="padding: 1px 6px; font-size: 10px"
                  @click="store.setCanvasSize(375, 812)"
                >
                  375×812
                </button>
                <button
                  class="btn btn-sm btn-outline-secondary"
                  style="padding: 1px 6px; font-size: 10px"
                  @click="store.setCanvasSize(414, 896)"
                >
                  414×896
                </button>
              </div>
            </div>
            <div class="settings-row mt-2">
              <label
                class="form-label-sm block-label"
                style="font-size: 11px; color: #666"
                >画布颜色</label
              >
              <div
                style="
                  display: flex;
                  flex-wrap: wrap;
                  gap: 4px;
                  align-items: center;
                "
              >
                <label
                  class="bg-color-swatch"
                  style="
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    width: 24px;
                    height: 24px;
                    overflow: hidden;
                    cursor: pointer;
                    border: 2px solid #ddd;
                    border-radius: 4px;
                  "
                  title="选择颜色"
                >
                  <input
                    type="color"
                    :value="getPageBgColorPickerValue()"
                    @input="onPickPageBgColorGlobal($event)"
                    style="
                      width: 32px;
                      height: 32px;
                      padding: 0;
                      margin: -4px;
                      cursor: pointer;
                      border: none;
                    "
                  />
                </label>
                <input
                  type="text"
                  class="form-control form-control-sm"
                  style="width: 80px; font-size: 11px"
                  :value="getPageBgDisplayValue()"
                  @change="onPickPageBgColorGlobalHex($event)"
                  placeholder="#FFFFFF"
                />
                <button
                  class="btn btn-sm btn-outline-secondary"
                  style="padding: 1px 6px; font-size: 10px"
                  :class="{
                    active:
                      !store.currentPage?.backgroundColor ||
                      store.currentPage?.backgroundColor === 'transparent',
                  }"
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
                style="background: transparent; border: 1px solid #dee2e6"
                :class="{ active: !store.canvasBackground }"
                @click="onPickCanvasBg('')"
                title="透明"
              >
                <i class="bi bi-ban" style="color: #adb5bd"></i>
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
                  @input="
                    onPickCanvasBgColor(
                      ($event.target as HTMLInputElement).value,
                    )
                  "
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
                v-if="
                  store.canvasBackground &&
                  store.canvasBackground.startsWith('url(')
                "
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
              <label
                class="form-check-label"
                style="
                  display: flex;
                  gap: 6px;
                  align-items: center;
                  font-size: 12px;
                  cursor: pointer;
                "
              >
                <input
                  type="checkbox"
                  :checked="store.autoSaveEnabled"
                  @change="onToggleAutoSave"
                  style="accent-color: #c44569"
                />
                <span>启用自动保存</span>
              </label>
            </div>
            <div class="settings-row mt-2" v-if="store.autoSaveEnabled">
              <label
                class="form-label-sm block-label"
                style="font-size: 11px; color: #666"
                >保存间隔（秒）</label
              >
              <select
                class="form-select form-select-sm"
                :value="store.autoSaveInterval / 1000"
                @change="onAutoSaveIntervalChange"
              >
                <option :value="10">10 秒</option>
                <option :value="30">30 秒</option>
                <option :value="60">1 分钟</option>
                <option :value="120">2 分钟</option>
                <option :value="300">5 分钟</option>
              </select>
            </div>
            <div class="settings-row mt-1" v-if="store.lastSavedTime">
              <span style="font-size: 10px; color: #999"
                >上次保存：{{ store.lastSavedTime }}</span
              >
            </div>
          </div>
          <!-- 项目管理 -->
          <div
            class="settings-dropdown-section"
            style="
              padding-top: 8px;
              margin-top: 4px;
              border-top: 1px solid #e5e7eb;
            "
          >
            <div
              class="settings-item"
              @click="onProjectManager"
              style="
                display: flex;
                gap: 8px;
                align-items: center;
                padding: 6px 8px;
                font-size: 12px;
                color: #374151;
                cursor: pointer;
                border-radius: 6px;
                transition: background 0.15s;
              "
              onmouseover="this.style.background = '#eef2ff';"
              onmouseout="this.style.background = 'transparent';"
            >
              <i class="bi bi-folder2-open" style="color: #4f46e5"></i>
              <span>项目管理</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- 发布为网页对话框（Teleport 到 body，不被 header 样式遮挡） -->
  <Teleport to="body">
    <div
      v-if="showPublishDialog"
      class="publish-dialog-mask"
      @click.self="closePublishDialog"
    >
      <div class="publish-dialog">
        <div class="publish-dialog-header">
          <span> <i class="bi bi-send-check"></i> 发布为网页 </span>
          <button class="publish-dialog-close" @click="closePublishDialog">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="publish-dialog-body">
          <div v-if="publishDialogLoading" class="publish-loading">
            <div class="spinner"></div>
            <div>正在上传页面数据并生成 H5 链接...</div>
          </div>
          <template v-else-if="publishDialogResult">
            <div class="publish-success-title">
              <i class="bi bi-check-circle-fill"></i>
              {{ publishDialogResult.message }}
            </div>
            <div class="publish-link-label">分享链接</div>
            <div class="publish-link-row">
              <input
                class="publish-link-input"
                type="text"
                :value="publishDialogResult.url"
                readonly
              />
              <button
                class="btn btn-sm btn-primary"
                @click="openPublishUrl"
                style="margin-right: 4px"
              >
                <i class="bi bi-eye"></i> 查看
              </button>
              <button class="btn btn-sm btn-primary" @click="copyPublishUrl">
                <i class="bi bi-clipboard"></i> 复制
              </button>
            </div>
            <div class="publish-tip">
              <i class="bi bi-info-circle"></i>
              链接可在浏览器中打开预览，或分享给朋友查看 H5 请柬。
            </div>
          </template>
          <template v-else>
            <div class="publish-fail-title">
              <i class="bi bi-exclamation-triangle-fill"></i> 发布失败
            </div>
            <div class="publish-tip">
              请检查 mock 服务器是否启动（npm run dev:mock）。
            </div>
          </template>
        </div>
        <div class="publish-dialog-footer">
          <button
            class="btn btn-outline-secondary btn-sm"
            @click="closePublishDialog"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 项目管理弹窗 -->
  <Teleport to="body">
    <div
      v-if="showProjectManager"
      class="project-manager-mask"
      @click.self="showProjectManager = false"
    >
      <div class="project-manager-panel">
        <div class="project-manager-header">
          <span><i class="bi bi-folder2-open"></i> 项目管理</span>
          <button
            class="project-manager-close"
            @click="showProjectManager = false"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="project-manager-body">
          <div class="project-manager-actions">
            <button class="pm-btn pm-btn-primary" @click="onCreateProject">
              <i class="bi bi-plus-lg"></i> 新建项目
            </button>
          </div>
          <div class="project-list">
            <div
              v-for="proj in store.projects"
              :key="proj.id"
              class="project-item"
              :class="{ active: proj.id === store.currentProjectId }"
              @click="onSwitchProject(proj.id)"
            >
              <div class="project-item-info">
                <i class="bi bi-file-earmark-text"></i>
                <div>
                  <span class="project-item-name">{{ proj.name }}</span>
                  <span class="project-item-time">{{ proj.lastSaved }}</span>
                </div>
              </div>
              <div class="project-item-actions">
                <button
                  class="pm-icon-btn"
                  title="切换"
                  @click.stop="onSwitchProject(proj.id)"
                >
                  <i class="bi bi-arrow-right-circle"></i>
                </button>
                <button
                  class="pm-icon-btn pm-icon-btn-danger"
                  title="删除"
                  @click.stop="onDeleteProject(proj.id)"
                >
                  <i class="bi bi-trash3"></i>
                </button>
              </div>
            </div>
            <div v-if="!store.projects.length" class="project-empty">
              <i class="bi bi-inbox"></i>
              <p>暂无项目，点击"新建项目"开始创作</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 创建项目弹窗 -->
  <PromptDialog
    v-model="showCreateProjectPrompt"
    message="新建项目"
    placeholder="请输入项目名称"
    default-value="我的请柬"
    @confirm="onConfirmCreateProject"
  />
</template>

<style scoped>
.publish-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(15 23 42 / 55%);
}

.publish-dialog {
  display: flex;
  flex-direction: column;
  width: 440px;
  max-width: calc(100% - 32px);
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 18px 50px rgb(15 23 42 / 25%);
}

.publish-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #eef2f7;
}

.publish-dialog-close {
  padding: 4px 8px;
  font-size: 16px;
  color: #6b7280;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
}

.publish-dialog-close:hover {
  color: #111827;
  background: #f3f4f6;
}

.publish-dialog-body {
  padding: 18px;
  font-size: 13px;
  color: #374151;
}

.publish-loading {
  display: flex;
  gap: 12px;
  align-items: center;
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
  font-weight: 600;
  color: #047857;
}

.publish-fail-title {
  font-size: 14px;
  font-weight: 600;
  color: #b91c1c;
}

.publish-link-label {
  margin-top: 14px;
  font-size: 12px;
  color: #6b7280;
}

.publish-link-row {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.publish-link-input {
  flex: 1;
  padding: 8px 10px;
  font-size: 12px;
  color: #111827;
  outline: none;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.publish-tip {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.6;
  color: #6b7280;
}

.publish-dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 18px;
  background: #fafbfc;
  border-top: 1px solid #eef2f7;
}

/* 项目管理弹窗 */
.project-manager-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(15 23 42 / 30%);
}

.project-manager-panel {
  display: flex;
  flex-direction: column;
  width: 420px;
  max-height: 500px;
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgb(0 0 0 / 15%);
}

.project-manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #e5e7eb;
}

.project-manager-header i {
  margin-right: 6px;
  color: #4f46e5;
}

.project-manager-close {
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  background: transparent;
  border: none;
}

.project-manager-body {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
}

.project-manager-actions {
  margin-bottom: 12px;
}

.pm-btn {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 6px 14px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.15s;
}

.pm-btn:hover {
  background: #f3f4f6;
}

.pm-btn-primary {
  color: #fff;
  background: #4f46e5;
  border-color: #4f46e5;
}

.pm-btn-primary:hover {
  background: #4338ca;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  background: #f9fafb;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.15s;
}

.project-item:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
}

.project-item.active {
  background: #eef2ff;
  border-color: #4f46e5;
}

.project-item-info {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.project-item-info > i {
  font-size: 18px;
  color: #4f46e5;
}

.project-item-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.project-item-time {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: #9ca3af;
}

.project-item-actions {
  display: flex;
  gap: 4px;
}

.pm-icon-btn {
  padding: 4px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: all 0.15s;
}

.pm-icon-btn:hover {
  color: #4f46e5;
  background: #eef2ff;
}

.pm-icon-btn-danger:hover {
  color: #dc2626;
  background: #fef2f2;
}

.project-empty {
  padding: 30px;
  color: #9ca3af;
  text-align: center;
}

.project-empty i {
  display: block;
  margin-bottom: 8px;
  font-size: 32px;
}

.project-empty p {
  margin: 0;
  font-size: 12px;
}
</style>
