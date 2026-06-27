import type {
  ContextMenuState,
  EditorElement,
  ElementToolbarPosition,
  Page,
  ToastState,
} from '../types/editor';
import type { FontItem } from '../utils/fonts';

import { defineStore } from 'pinia';

import { createDefaultElement, generateId } from '../types/editor';
import { defaultFreeFonts } from '../utils/fonts';

const FONTS_STORAGE_KEY = 'invitation_editor_custom_fonts_v1';

const STORAGE_KEY = 'invitation_editor_state_v1';

interface HistorySnapshot {
  label: string;
  timestamp: number;
  projectName: string;
  pages: Page[];
  currentPageId: string;
  selectedElementId: null | string;
  zoom: number;
}

function createDefaultPage(index = 1): Page {
  return {
    id: generateId(),
    name: `第${index}页`,
    backgroundColor: '#ffffff',
    elements: [],
    thumbnail: null,
    transition: undefined,
  };
}

export const useEditorStore = defineStore('editor', {
  state: () => ({
    projectName: '我的请柬',
    pages: [createDefaultPage(1)] as Page[],
    currentPageId: '' as string,
    selectedElementId: null as null | string,
    selectedElementIds: [] as string[],
    history: [] as HistorySnapshot[],
    historyIndex: -1,
    historyPanelVisible: false,
    temporaryTopElementId: null as null | string,
    zoom: 100,
    showMobileBorder: true,
    showOverflow: false,
    showGuides: true, // 显示画布外框虚线和小屏安全区域参考线
    // 网格系统
    showGrid: false,
    gridSize: 10, // 默认 10px 间距
    gridColor: 'rgba(0, 0, 0, 0.06)', // 网格线颜色
    gridSnap: true, // 默认开启网格吸附
    gridSnapThreshold: 5, // 吸附阈值（px）
    canvasWidth: 320, // 画布宽度（CSS像素基准）
    canvasHeight: 628, // 画布高度（CSS像素基准）
    safeAreaHeight: 486, // 小屏手机安全区域高度（参考线用）
    pageTransition: 'slide' as 'fade' | 'flip' | 'none' | 'slide' | 'zoom',
    hiddenMode: 'opacity' as 'hide' | 'opacity',
    musicSettings: {
      autoPlay: true,
      designMode: false,
      volume: 50,
      currentTime: 0,
      duration: 0,
    },
    audio: {
      audioId: null as null | string,
      src: null as null | string,
      x: 280,
      y: 10,
      width: 24,
      height: 24,
      autoPlay: true,
      designMode: false,
      volume: 50,
      locked: true,
      iconClass: 'bi bi-music-note' as string,
      animation: 'spin' as string, // 'spin' | 'pulse' | 'bounce' | 'none'
    },
    elementToolbarTab: 'style',
    elementToolbarVisible: false,
    elementToolbarPosition: { left: 0, top: 0 } as ElementToolbarPosition,
    rightPanelTab: 'pages',
    sidebarTab: 'elements',
    canvasBackground: '' as string,
    settingsPanelVisible: false,
    lastSavedTime: '' as string,
    autoSaveEnabled: true,
    autoSaveInterval: 30_000, // 默认 30秒
    autoSaveTimerId: null as null | number,
    leftSidebarCollapsed: false,
    rightSidebarCollapsed: false,
    contextMenu: {
      visible: false,
      x: 0,
      y: 0,
      elementId: null,
    } as ContextMenuState,
    toast: {
      visible: false,
      message: '',
      type: 'info' as 'error' | 'info' | 'success' | 'warning',
    } as ToastState,
    toastTimer: null as any,
    showKeyboardShortcuts: false,
    historyCounter: 0,
    customFonts: [] as FontItem[],
    // 项目管理
    projects: [] as Array<{
      id: string;
      lastSaved: string;
      name: string;
      thumbnail?: string;
    }>,
    currentProjectId: '' as string,
    hasUnsavedChanges: false as boolean,
  }),

  getters: {
    currentPageIndex(state): number {
      return Math.max(
        0,
        state.pages.findIndex((p) => p.id === state.currentPageId),
      );
    },
    currentPage(state): null | Page {
      return (
        state.pages.find((p) => p.id === state.currentPageId) ||
        state.pages[0] ||
        null
      );
    },
    selectedElement(state): EditorElement | null {
      if (!state.selectedElementId) return null;
      const page = state.pages.find((p) => p.id === state.currentPageId);
      return (
        page?.elements.find((el) => el.id === state.selectedElementId) || null
      );
    },
    isElementSelected(state): (id: string) => boolean {
      return (id: string) => state.selectedElementIds.includes(id);
    },
    allFonts(state): FontItem[] {
      return [...defaultFreeFonts, ...state.customFonts];
    },
  },

  actions: {
    // ===== 初始化 =====
    initIfNeeded() {
      if (!this.currentPageId || this.pages.length === 0) {
        const page = createDefaultPage(1);
        this.pages = [page];
        this.currentPageId = page.id;
      }
      if (this.history.length === 0) {
        this.saveHistory();
      }
      try {
        const saved = localStorage.getItem(FONTS_STORAGE_KEY);
        if (saved) {
          this.customFonts = JSON.parse(saved);
          // 重新注入 @font-face，确保页面刷新后用户字体仍可用
          this.customFonts.forEach((font) => {
            if (font.url && font.type === 'user') {
              const existing = document.querySelector(
                `style[data-font="${font.family}"]`,
              );
              if (!existing) {
                const style = document.createElement('style');
                style.dataset.font = font.family;
                style.textContent = `
                  @font-face {
                    font-family: "${font.family}";
                    src: url("${font.url}") format("truetype");
                    font-weight: normal;
                    font-style: normal;
                    font-display: swap;
                  }
                `;
                document.head.append(style);
              }
            }
          });
        }
      } catch {}
    },

    // ===== 历史记录 =====
    saveHistory(label = '操作') {
      const snapshot: HistorySnapshot = {
        label,
        timestamp: Date.now(),
        projectName: this.projectName,
        pages: JSON.parse(JSON.stringify(this.pages)),
        currentPageId: this.currentPageId,
        selectedElementId: this.selectedElementId,
        zoom: this.zoom,
      };
      // 清除当前位置之后的历史
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(snapshot);
      this.historyIndex = this.history.length - 1;
      // 限制历史记录长度
      if (this.history.length > 100) {
        this.history = this.history.slice(-100);
        this.historyIndex = this.history.length - 1;
      }
      this.hasUnsavedChanges = true;
    },

    undo() {
      if (this.historyIndex <= 0) {
        this.showToast('没有可撤销的操作', 'info');
        return;
      }
      this.historyIndex--;
      this._applySnapshot(this.history[this.historyIndex]);
      this.showToast('已撤销', 'info');
    },

    redo() {
      if (this.historyIndex >= this.history.length - 1) {
        this.showToast('没有可重做的操作', 'info');
        return;
      }
      this.historyIndex++;
      this._applySnapshot(this.history[this.historyIndex]);
      this.showToast('已重做', 'info');
    },

    goToHistory(index: number) {
      if (index < 0 || index >= this.history.length) return;
      this.historyIndex = index;
      this._applySnapshot(this.history[index]);
      this.showToast('已跳转到历史记录', 'info');
    },

    toggleHistoryPanel() {
      this.historyPanelVisible = !this.historyPanelVisible;
    },

    setHistoryPanelVisible(v: boolean) {
      this.historyPanelVisible = v;
    },

    _applySnapshot(s: HistorySnapshot) {
      this.projectName = s.projectName;
      this.pages = JSON.parse(JSON.stringify(s.pages));
      this.currentPageId = s.currentPageId;
      this.selectedElementId = s.selectedElementId;
      this.zoom = s.zoom;
    },

    // ===== 项目操作 =====
    setProjectName(name: string) {
      this.projectName = name;
      this.saveHistory('修改项目名称');
    },

    // ===== 页面操作 =====
    // Bug6: Alt+点击循环选择重叠元素（按 zIndex 排序，选择下一个更低层的元素）
    selectElementBelow(currentId: string) {
      const page = this.currentPage;
      if (!page || page.elements.length === 0) return;
      const sorted = [...page.elements].toSorted((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((e) => e.id === currentId);
      if (idx === -1) return;
      const nextIdx = idx <= 0 ? sorted.length - 1 : idx - 1;
      const next = sorted[nextIdx];
      if (next) this.selectElement(next.id);
    },

    selectPage(id: string) {
      this.temporaryTopElementId = null;
      this.currentPageId = id;
      this.selectedElementId = null;
      this.elementToolbarVisible = false;
    },

    addPage() {
      const idx = this.pages.length + 1;
      const page = createDefaultPage(idx);
      this.pages.push(page);
      this.currentPageId = page.id;
      this.saveHistory('添加页面');
      this.showToast('已添加新页面', 'success');
    },

    copyCurrentPage() {
      const page = this.currentPage;
      if (!page) return;
      // const idx = this.pages.length + 1;
      const newPage: Page = {
        id: generateId(),
        name: `${page.name} 副本`,
        backgroundColor: page.backgroundColor,
        elements: page.elements.map((el) => ({
          ...el,
          id: generateId(),
          x: el.x + 10,
          y: el.y + 10,
        })),
        locked: false,
      };
      this.pages.push(newPage);
      this.currentPageId = newPage.id;
      this.saveHistory('复制页面');
    },

    toggleLockPage() {
      const page = this.currentPage;
      if (!page) return;
      page.locked = !page.locked;
      this.saveHistory('锁定/解锁页面');
    },

    deletePage(id: string) {
      if (this.pages.length <= 1) return;
      const idx = this.pages.findIndex((p) => p.id === id);
      if (idx === -1) return;
      this.pages.splice(idx, 1);
      if (this.currentPageId === id) {
        this.currentPageId = this.pages[Math.max(0, idx - 1)].id;
      }
      this.saveHistory('删除页面');
      this.showToast('已删除页面', 'success');
    },

    updatePageBackground(color: string) {
      const page = this.currentPage;
      if (page) {
        page.backgroundColor = color;
        this.saveHistory('修改页面背景色');
      }
    },

    // ===== 元素操作 =====
    selectElement(id: null | string) {
      if (id !== this.selectedElementId) {
        this.temporaryTopElementId = null;
      }
      this.selectedElementId = id;
      this.selectedElementIds = id ? [id] : [];
      this.elementToolbarVisible = !!id;
    },

    selectElements(ids: string[]) {
      this.temporaryTopElementId = null;
      this.selectedElementIds = ids;
      this.selectedElementId = ids.length === 1 ? ids[0] : null;
      this.elementToolbarVisible = ids.length > 0;
    },
    toggleSelectElement(id: string) {
      const idx = this.selectedElementIds.indexOf(id);
      if (idx === -1) {
        // 不存在：添加
        this.selectedElementIds.push(id);
        this.selectedElementId = id;
      } else {
        // 存在：移除
        this.selectedElementIds.splice(idx, 1);
        if (this.selectedElementIds.length === 1) {
          this.selectedElementId = this.selectedElementIds[0];
        } else if (this.selectedElementIds.length === 0) {
          this.selectedElementId = null;
        }
      }
      this.elementToolbarVisible = this.selectedElementIds.length > 0;
    },

    clearSelection() {
      this.temporaryTopElementId = null;
      this.selectedElementId = null;
      this.selectedElementIds = [];
      this.elementToolbarVisible = false;
    },

    toggleElementSelection(id: string) {
      const idx = this.selectedElementIds.indexOf(id);
      if (idx === -1) {
        // 不存在该id，执行新增
        this.selectedElementIds.push(id);
        if (!this.selectedElementId) this.selectedElementId = id;
      } else {
        // 存在该id，执行删除
        this.selectedElementIds.splice(idx, 1);
        if (this.selectedElementId === id) {
          this.selectedElementId =
            this.selectedElementIds.length === 1
              ? this.selectedElementIds[0]
              : null;
        }
      }
      this.elementToolbarVisible = this.selectedElementIds.length > 0;
    },

    // 递归查找元素（支持组内嵌套），同时返回父数组
    findElement(id: string): {
      el: EditorElement | null;
      parent: EditorElement[] | null;
      parentEl: EditorElement | null;
    } {
      const page = this.currentPage;
      if (!page) return { el: null, parent: null, parentEl: null };
      const find = (
        list: EditorElement[],
        parentEl: EditorElement | null,
      ): any => {
        for (const item of list) {
          if (item.id === id) return { el: item, parent: list, parentEl };
          if (item.children && item.children.length > 0) {
            const r = find(item.children, item);
            if (r && r.el) return r;
          }
        }
        return null;
      };
      const r = find(page.elements, null);
      return r || { el: null, parent: null, parentEl: null };
    },

    // 收集元素 ID（含组内嵌套）
    collectElementIds(): string[] {
      const page = this.currentPage;
      if (!page) return [];
      const ids: string[] = [];
      const walk = (list: EditorElement[]) => {
        for (const el of list) {
          ids.push(el.id);
          if (el.children && el.children.length > 0) walk(el.children);
        }
      };
      walk(page.elements);
      return ids;
    },

    // 收集某个组内的元素 ID（不含组本身）
    collectGroupElementIds(groupId: string): string[] {
      const found = this.findElement(groupId);
      if (!found.el || !found.el.children) return [];
      const ids: string[] = [];
      const walk = (list: EditorElement[]) => {
        for (const el of list) {
          ids.push(el.id);
          if (el.children && el.children.length > 0) walk(el.children);
        }
      };
      walk(found.el.children);
      return ids;
    },

    moveSelectedElements(dx: number, dy: number) {
      const page = this.currentPage;
      if (!page || this.selectedElementIds.length === 0) return;
      const ids = new Set(this.selectedElementIds);
      const walk = (list: EditorElement[]) => {
        for (const el of list) {
          if (ids.has(el.id) && !el.locked) {
            el.x += dx;
            el.y += dy;
            if (el.children && el.children.length > 0) {
              // 若为组，同步移动所有子元素相对位置不变——这里只需更新子元素坐标
              const walkChildren = (children: EditorElement[]) => {
                for (const c of children) {
                  c.x += dx;
                  c.y += dy;
                  if (c.children && c.children.length > 0)
                    walkChildren(c.children);
                }
              };
              walkChildren(el.children);
            }
          } else if (el.children && el.children.length > 0) {
            walk(el.children);
          }
        }
      };
      walk(page.elements);
    },

    bulkToggleVisibility() {
      const page = this.currentPage;
      if (!page || this.selectedElementIds.length === 0) return;
      const ids = [...this.selectedElementIds];
      // 如果全都是显示的就全部隐藏，否则全部显示
      const allVisible = ids.every((id) => {
        const el = page.elements.find((e) => e.id === id);
        return el?.visible;
      });
      for (const el of page.elements) {
        if (ids.includes(el.id)) el.visible = !allVisible;
      }
      this.saveHistory('批量显示/隐藏');
    },

    bulkToggleLock() {
      const page = this.currentPage;
      if (!page || this.selectedElementIds.length === 0) return;
      const ids = [...this.selectedElementIds];
      const allLocked = ids.every((id) => {
        const el = page.elements.find((e) => e.id === id);
        return el?.locked;
      });
      for (const el of page.elements) {
        if (ids.includes(el.id)) el.locked = !allLocked;
      }
      this.saveHistory('批量锁定/解锁');
    },

    bulkDelete() {
      const page = this.currentPage;
      if (!page || this.selectedElementIds.length === 0) return;
      const ids = new Set(this.selectedElementIds);
      page.elements = page.elements.filter((el) => !ids.has(el.id));
      this.selectedElementId = null;
      this.selectedElementIds = [];
      this.elementToolbarVisible = false;
      this.saveHistory('批量删除');
      this.showToast(`已删除 ${ids.size} 个元素`, 'success');
    },

    bulkDuplicate() {
      const page = this.currentPage;
      if (!page || this.selectedElementIds.length === 0) return;
      const ids = [...this.selectedElementIds];
      const newIds: string[] = [];
      for (const id of ids) {
        const { el } = this.findElement(id);
        if (!el) continue;
        const copy = JSON.parse(JSON.stringify(el)) as EditorElement;
        copy.id = `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        // 递归重新生成子元素 id（如果是组）
        const reassignIds = (node: EditorElement) => {
          if (node.children && node.children.length > 0) {
            for (const c of node.children) {
              c.id = `el_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`;
              reassignIds(c);
            }
          }
        };
        reassignIds(copy);
        copy.x += 12;
        copy.y += 12;
        page.elements.push(copy);
        newIds.push(copy.id);
      }
      this.selectedElementIds = newIds;
      this.selectedElementId = newIds.length === 1 ? newIds[0] : null;
      this.elementToolbarVisible = newIds.length > 0;
      this.saveHistory('批量复制');
      this.showToast(`已复制 ${newIds.length} 个元素`, 'success');
    },

    addElement(element: EditorElement) {
      const page = this.currentPage;
      if (!page) return;
      page.elements.push(element);
      this.selectedElementId = element.id;
      this.elementToolbarVisible = true;
      this.saveHistory('添加元素');
    },

    addElementFromDrag(type: string, subType: string, x: number, y: number) {
      const z = this.getNextZIndex();
      const el = createDefaultElement(type as any, subType, x, y, z);
      this.addElement(el);
    },

    getNextZIndex(): number {
      const page = this.currentPage;
      if (!page || page.elements.length === 0) return 1;
      let max = 0;
      for (const el of page.elements) {
        if (el.zIndex > max) max = el.zIndex;
      }
      return max + 1;
    },

    // normalize zIndex: fix duplicate zIndex and reassign sequential values
    normalizeZIndex() {
      const page = this.currentPage;
      if (!page || page.elements.length === 0) return;
      const all: EditorElement[] = [];
      const walk = (list: EditorElement[]) => {
        for (const e of list) {
          all.push(e);
          if (e.children && e.children.length > 0) walk(e.children);
        }
      };
      walk(page.elements);
      const sorted = [...all].toSorted((a, b) => a.zIndex - b.zIndex);
      sorted.forEach((el, i) => {
        el.zIndex = i + 1;
      });
    },

    async addImageElement(imageUrl: string) {
      const z = (this.currentPage?.elements.length || 0) + 1;
      const el = createDefaultElement('image', 'upload', 50, 100, z);
      (el as any).imageUrl = imageUrl;
      this.addElement(el);
      // 异步加载图片获取原始尺寸，按比例调整元素大小
      try {
        const img = new Image();
        img.src = imageUrl;
        await new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve());
          img.addEventListener('error', () => resolve());
        });
        if (img.naturalWidth && img.naturalHeight) {
          const MAX_W = 280;
          const MAX_H = 350;
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          if (w > MAX_W || h > MAX_H) {
            const scale = Math.min(MAX_W / w, MAX_H / h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          this.updateElement(el.id, { width: w, height: h } as any);
        }
      } catch {
        // 获取尺寸失败，使用默认200x200
      }
    },

    updateElement(id: string, changes: Partial<EditorElement>) {
      const { el } = this.findElement(id);
      if (!el) return;
      Object.assign(el, changes);
    },

    deleteElement(id: string) {
      const page = this.currentPage;
      if (!page) return;
      const { el, parent } = this.findElement(id);
      if (!el || !parent) return;
      const idx = parent.indexOf(el);
      if (idx === -1) return;
      parent.splice(idx, 1);
      if (this.selectedElementId === id) {
        this.selectedElementId = null;
        this.elementToolbarVisible = false;
      }
      const sIdx = this.selectedElementIds.indexOf(id);
      if (sIdx !== -1) this.selectedElementIds.splice(sIdx, 1);
      this.saveHistory('删除元素');
      this.showToast('已删除元素', 'success');
    },

    // Bug4: 删除多选元素
    deleteSelected() {
      const page = this.currentPage;
      if (!page) return;
      let ids: string[] = [];
      if (this.selectedElementIds && this.selectedElementIds.length > 0) {
        ids = [...this.selectedElementIds];
      } else if (this.selectedElementId) {
        ids = [this.selectedElementId];
      }
      if (ids.length === 0) return;
      page.elements = page.elements.filter((el) => !ids.includes(el.id));
      this.selectedElementId = null;
      this.selectedElementIds = [];
      this.elementToolbarVisible = false;
      this.saveHistory('删除选中元素');
      if (ids.length > 1)
        this.showToast(`已删除 ${ids.length} 个元素`, 'success');
      else this.showToast('已删除元素', 'success');
    },

    duplicateElement(id: string) {
      const page = this.currentPage;
      if (!page) return;
      const el = page.elements.find((e) => e.id === id);
      if (!el) return;
      const copy = JSON.parse(JSON.stringify(el)) as EditorElement;
      copy.id = generateId();
      copy.x = el.x + 20;
      copy.y = el.y + 20;
      copy.zIndex = (page.elements.length || 0) + 1;
      page.elements.push(copy);
      this.selectedElementId = copy.id;
      this.elementToolbarVisible = true;
      this.saveHistory('复制元素');
      this.showToast('已复制元素', 'success');
    },

    toggleLock(id: string) {
      const { el } = this.findElement(id);
      if (!el) return;
      el.locked = !el.locked;
    },

    toggleVisibility(id: string) {
      const { el } = this.findElement(id);
      if (!el) return;
      el.visible = !el.visible;
    },

    moveElementUp(id: string) {
      const page = this.currentPage;
      if (!page || page.elements.length === 0) return;
      const all: EditorElement[] = [];
      const walk = (list: EditorElement[]) => {
        for (const e of list) all.push(e);
      };
      walk(page.elements);
      const sorted = [...all].toSorted((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((e) => e.id === id);
      if (idx === -1 || idx === sorted.length - 1) return;
      const next = sorted[idx + 1];
      const current = sorted[idx];
      const tmp = current.zIndex;
      current.zIndex = next.zIndex;
      next.zIndex = tmp;
      this.selectedElementId = id;
    },

    moveElementDown(id: string) {
      const page = this.currentPage;
      if (!page || page.elements.length === 0) return;
      const all: EditorElement[] = [];
      const walk = (list: EditorElement[]) => {
        for (const e of list) all.push(e);
      };
      walk(page.elements);
      const sorted = [...all].toSorted((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((e) => e.id === id);
      if (idx === -1 || idx === 0) return;
      const prev = sorted[idx - 1];
      const current = sorted[idx];
      const tmp = current.zIndex;
      current.zIndex = prev.zIndex;
      prev.zIndex = tmp;
      this.selectedElementId = id;
    },

    bringToFront() {
      const page = this.currentPage;
      if (!page || !this.selectedElementId) return;
      const maxZ = Math.max(...page.elements.map((e) => e.zIndex), 0);
      const el = page.elements.find((e) => e.id === this.selectedElementId);
      if (el) el.zIndex = maxZ + 1;
    },

    // ========== 重置为新页面集合（用于应用模板） ==========
    setPages(
      newPages: {
        backgroundColor: string;
        elements: unknown[];
        id: string;
        name: string;
        thumbnail: null | string;
      }[],
    ) {
      this.pages = newPages.map((p) => ({
        id: p.id,
        name: p.name || '页面',
        backgroundColor: p.backgroundColor || '#ffffff',
        elements: (p.elements as any[]) || [],
        thumbnail: p.thumbnail ?? null,
      }));
      if (this.pages.length > 0) this.currentPageId = this.pages[0].id;
      this.selectedElementId = null;
      this.saveHistory('应用模板');
    },

    sendToBack() {
      const page = this.currentPage;
      if (!page || !this.selectedElementId) return;
      const minZ = Math.min(...page.elements.map((e) => e.zIndex), 0);
      const el = page.elements.find((e) => e.id === this.selectedElementId);
      if (el) el.zIndex = minZ - 1;
    },

    bringForward() {
      const page = this.currentPage;
      if (!page || !this.selectedElementId) return;
      const el = page.elements.find((e) => e.id === this.selectedElementId);
      if (el) el.zIndex += 1;
    },

    sendBackward() {
      const page = this.currentPage;
      if (!page || !this.selectedElementId) return;
      const el = page.elements.find((e) => e.id === this.selectedElementId);
      if (el) el.zIndex -= 1;
    },

    // 全选元素
    selectAllElements() {
      this.selectedElementIds = this.collectElementIds();
      this.selectedElementId = null;
      this.elementToolbarVisible = false;
    },

    // 组合元素：创建一个 group 元素包裹选中的子元素，删除原位置
    groupElements() {
      const page = this.currentPage;
      if (!page) return;
      let ids: string[] = [];
      if (this.selectedElementIds.length > 0) {
        ids = [...this.selectedElementIds];
      } else if (this.selectedElementId) {
        ids = [this.selectedElementId];
      }
      if (ids.length < 2) {
        this.showToast('请先选择两个或以上的元素', 'warning');
        return;
      }
      const idSet = new Set(ids);
      const removed: EditorElement[] = [];
      // 从顶层列表中移除
      const removeFrom = (list: EditorElement[]) => {
        for (let i = list.length - 1; i >= 0; i--) {
          if (idSet.has(list[i].id)) {
            removed.push(list[i]);
            list.splice(i, 1);
          } else if (
            list[i].children &&
            (list[i].children as EditorElement[]).length > 0
          ) {
            removeFrom(list[i].children as EditorElement[]);
          }
        }
      };
      removeFrom(page.elements);
      if (removed.length === 0) return;
      // 计算组包围盒
      let maxX = -Infinity;
      let maxY = -Infinity;
      let maxZ = -Infinity;
      let minX = Infinity;
      let minY = Infinity;
      for (const el of removed) {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
        maxZ = Math.max(maxZ, el.zIndex);
      }
      const group: EditorElement = {
        id: `g_${generateId()}`,
        type: 'group',
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        rotation: 0,
        zIndex: maxZ + 1,
        backgroundColor: 'transparent',
        backgroundOpacity: 1,
        locked: false,
        visible: true,
        name: `组合${page.elements.filter((e) => e.type === 'group').length + 1}`,
        children: removed.map((el) => {
          const copy: EditorElement = { ...el };
          copy.x = el.x - minX;
          copy.y = el.y - minY;
          return copy;
        }),
      };
      page.elements.push(group);
      this.selectedElementId = group.id;
      this.selectedElementIds = [group.id];
      this.elementToolbarVisible = true;
      this.saveHistory('组合元素');
      this.showToast(`已组合 ${removed.length} 个元素`, 'success');
    },

    // 取消组合：把组的 children 放回父数组，删除组元素
    unGroupElements() {
      const page = this.currentPage;
      if (!page) return;

      let ids: string[] = [];
      if (this.selectedElementIds.length > 0) {
        ids = [...this.selectedElementIds];
      } else if (this.selectedElementId) {
        ids = [this.selectedElementId];
      }
      const toUngroup = ids
        .map((id) => this.findElement(id).el)
        .filter((el: any): el is EditorElement => !!el && el.type === 'group');
      if (toUngroup.length === 0) {
        // 如果当前选中的不是组，但属于某个组，则把它从组中拆出
        const sel = this.findElement(this.selectedElementId || '');
        if (sel.el && sel.parentEl) {
          // 从父组中移出
          const parent = sel.parentEl;
          // oxlint-disable typescript-eslint/no-non-null-assertion
          const idx = parent.children!.indexOf(sel.el);
          if (idx !== -1) parent.children!.splice(idx, 1);
          // 按父组坐标转换回页面坐标
          sel.el.x += parent.x;
          sel.el.y += parent.y;
          page.elements.push(sel.el);
          this.saveHistory('从组中移出');
          this.showToast('已从组中移出', 'success');
          return;
        }
        this.showToast('当前选中元素中没有组合', 'warning');
        return;
      }
      const newTopIds: string[] = [];
      const ungroupOne = (
        g: EditorElement,
        targetParentArr: EditorElement[],
        offsetX: number,
        offsetY: number,
        targetZ: number,
      ) => {
        for (const c of g.children || []) {
          c.x += offsetX;
          c.y += offsetY;
          if (c.zIndex < targetZ) c.zIndex = targetZ;
          targetParentArr.push(c);
          newTopIds.push(c.id);
        }
      };
      for (const g of toUngroup) {
        const { parent, parentEl } = this.findElement(g.id);
        if (!parent) continue;
        const idx = parent.indexOf(g);
        if (idx === -1) continue;
        parent.splice(idx, 1);
        // 子元素变换到父坐标
        const ox = parentEl ? 0 : 0; // 相对于画布坐标
        // parent 是 page.elements 时，元素坐标以画布为基准；parent 是其他组 children 时，以组为基准
        // g.x / g.y 相对其父容器。
        // 若 g 的父是 page.elements，则把 children 坐标转为 page 坐标 +g.x / +g.y
        // 若 g 嵌在组中，则 children 坐标加上 g.x / g.y 放在同一父数组
        const targetArr = parent;
        ungroupOne(g, targetArr, g.x, g.y + ox, g.zIndex);
      }
      if (newTopIds.length > 0) {
        this.selectedElementIds = newTopIds;
        this.selectedElementId = newTopIds[0];
        this.elementToolbarVisible = false;
      }
      this.saveHistory('取消组合');
      this.showToast('已取消组合', 'success');
    },

    // flip element horizontally or vertically
    flipElement(direction: 'horizontal' | 'vertical') {
      const el = this.selectedElement;
      if (!el) return;
      const current = el.flip || { horizontal: false, vertical: false };
      if (direction === 'horizontal') {
        current.horizontal = !current.horizontal;
      } else {
        current.vertical = !current.vertical;
      }
      this.updateElement(el.id, { flip: { ...current } });
      this.showToast(
        direction === 'horizontal' ? '已水平翻转' : '已垂直翻转',
        'success',
      );
      this.saveHistory('翻转元素');
    },

    // cutout image: flood fill from corners (connected background removal)
    cutoutImage() {
      const el = this.selectedElement;
      if (!el || el.type !== 'image' || !el.imageUrl) return;
      this.showToast('正在处理抠图...', 'info');
      const img = new Image();
      img.addEventListener('load', () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        let imageData;
        try {
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch {
          this.showToast('抠图失败：无法读取图片数据，请使用本地图片', 'error');
          return;
        }
        const data = imageData.data;
        const w = canvas.width;
        const h = canvas.height;

        // sample 4 corners for background seed color (median of each corner)
        const cornerSize = Math.min(10, w, h);
        const corners: Array<[number, number, number]> = [];
        const sampleCorners = [
          [0, 0],
          [w - 1, 0],
          [0, h - 1],
          [w - 1, h - 1],
        ];
        for (const [cx, cy] of sampleCorners) {
          const samples: number[] = [];
          for (let dy = 0; dy < cornerSize && cy + dy < h; dy++) {
            for (let dx = 0; dx < cornerSize && cx + dx < w; dx++) {
              const ix = Math.min(cx + dx, w - 1);
              const iy = Math.min(cy + dy, h - 1);
              const i = (iy * w + ix) * 4;
              samples.push(data[i], data[i + 1], data[i + 2]);
            }
          }
          samples.sort((a, b) => a - b);
          const mid = Math.floor(samples.length / 3);
          corners.push([samples[mid], samples[mid + 1], samples[mid + 2]]);
        }
        // average the 4 corner medians
        let bgB = 0;
        let bgG = 0;
        let bgR = 0;
        for (const c of corners) {
          bgR += c[0];
          bgG += c[1];
          bgB += c[2];
        }
        bgR = Math.round(bgR / corners.length);
        bgG = Math.round(bgG / corners.length);
        bgB = Math.round(bgB / corners.length);

        const tolerance = 65;
        const colorMatch = (idx: number) => {
          const db = data[idx + 2] - bgB;
          const dg = data[idx + 1] - bgG;
          const dr = data[idx] - bgR;
          // return Math.sqrt(dr * dr + dg * dg + db * db) < tolerance;
          return Math.hypot(dr, dg, db) < tolerance;
        };

        // BFS flood fill from all 4 corner edges
        const visited = new Uint8Array(w * h);
        const queue: number[] = [];
        const mark = (x: number, y: number) => {
          if (x < 0 || x >= w || y < 0 || y >= h) return;
          const idx = y * w + x;
          if (visited[idx]) return;
          const pi = idx * 4;
          if (!colorMatch(pi)) return;
          visited[idx] = 1;
          queue.push(x, y);
        };
        // seed from all 4 edges (corners + edges)
        for (let x = 0; x < w; x++) {
          mark(x, 0);
          mark(x, h - 1);
        }
        for (let y = 1; y < h - 1; y++) {
          mark(0, y);
          mark(w - 1, y);
        }

        while (queue.length > 0) {
          const y = queue.pop()!;
          const x = queue.pop()!;
          mark(x + 1, y);
          mark(x - 1, y);
          mark(x, y + 1);
          mark(x, y - 1);
        }

        // set visited (background) pixels to transparent
        for (let i = 0; i < visited.length; i++) {
          if (visited[i]) {
            data[i * 4 + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const resultUrl = canvas.toDataURL('image/png');
        this.updateElement(el.id, { imageUrl: resultUrl });
        this.saveHistory('抠图');
        this.showToast('抠图完成', 'success');
      });
      img.addEventListener('error', () => {
        this.showToast('抠图失败，请重试', 'error');
      });
      img.src = el.imageUrl;
    },

    // AI cutout: placeholder for future AI API integration
    cutoutImageAI() {
      this.showToast('AI抠图功能即将上线，敬请期待', 'info');
    },

    // 重命名页面或元素
    renameSelected() {
      const page = this.currentPage;
      if (!page) return;
      if (this.selectedElementId) {
        const el = page.elements.find((e) => e.id === this.selectedElementId);
        // oxlint-disable-next-line no-alert
        const newName = prompt('请输入元素名称', el?.name || '');
        if (newName !== null && el) {
          el.name = newName;
          this.showToast('元素已重命名', 'success');
        }
      } else {
        // oxlint-disable-next-line no-alert
        const newName = prompt('请输入页面名称', page.name || '');
        if (newName !== null) {
          page.name = newName;
          this.showToast('页面已重命名', 'success');
        }
      }
    },

    // 新建文本元素
    newTextElement() {
      const el = createDefaultElement('text');
      this.autoNameElement(el);
      this.addElement(el);
      this.showToast('已创建文本元素', 'success');
    },

    // 对齐选中元素
    alignSelected(
      type: 'bottom' | 'center' | 'left' | 'middle' | 'right' | 'top',
    ) {
      const page = this.currentPage;
      if (!page) return;
      const ids =
        this.selectedElementIds.length > 0
          ? this.selectedElementIds
          : this.selectedElementId
            ? [this.selectedElementId]
            : [];
      if (ids.length < 2) {
        this.showToast('请先选择两个或以上的元素', 'warning');
        return;
      }
      const els = page.elements.filter((e) => ids.includes(e.id));
      const xs = els.map((e) => e.x);
      const ys = els.map((e) => e.y);
      const ws = els.map((e) => e.width);
      const hs = els.map((e) => e.height);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs.map((x, i) => x + ws[i]));
      const maxY = Math.max(...ys.map((y, i) => y + hs[i]));
      for (const el of els) {
        if (type === 'top') el.y = minY;
        else if (type === 'bottom') el.y = maxY - el.height;
        else if (type === 'middle') el.y = (minY + maxY) / 2 - el.height / 2;
        else if (type === 'left') el.x = minX;
        else if (type === 'right') el.x = maxX - el.width;
        else if (type === 'center') el.x = (minX + maxX) / 2 - el.width / 2;
      }
      this.saveHistory('对齐元素');
      this.showToast(
        `已按${
          (
            {
              top: '顶部',
              middle: '垂直居中',
              bottom: '底部',
              left: '左侧',
              center: '水平居中',
              right: '右侧',
            } as any
          )[type]
        }对齐`,
        'success',
      );
    },

    // 等间距分布选中元素
    distributeSelected(direction: 'horizontal' | 'vertical') {
      const page = this.currentPage;
      if (!page) return;
      let ids: string[] = [];
      if (this.selectedElementIds.length > 0) {
        ids = this.selectedElementIds;
      } else if (this.selectedElementId) {
        ids = [this.selectedElementId];
      }
      if (ids.length < 3) {
        this.showToast('请至少选择三个元素进行等间距分布', 'warning');
        return;
      }
      const els = page.elements.filter((e) => ids.includes(e.id));
      if (direction === 'horizontal') {
        els.sort((a, b) => a.x - b.x);
        const totalWidth =
          els[els.length - 1].x + els[els.length - 1].width - els[0].x;
        const totalElWidth = els.reduce((sum, e) => sum + e.width, 0);
        const gap = (totalWidth - totalElWidth) / (els.length - 1);
        let cursor = els[0].x;
        for (const el of els) {
          el.x = cursor;
          cursor += el.width + gap;
        }
      } else {
        els.sort((a, b) => a.y - b.y);
        const totalHeight =
          els[els.length - 1].y + els[els.length - 1].height - els[0].y;
        const totalElHeight = els.reduce((sum, e) => sum + e.height, 0);
        const gap = (totalHeight - totalElHeight) / (els.length - 1);
        let cursor = els[0].y;
        for (const el of els) {
          el.y = cursor;
          cursor += el.height + gap;
        }
      }
      this.saveHistory('等间距分布');
      this.showToast(
        direction === 'horizontal' ? '已水平等间距分布' : '已垂直等间距分布',
        'success',
      );
    },

    flipImage(direction: 'horizontal' | 'vertical') {
      const page = this.currentPage;
      if (!page || !this.selectedElementId) return;
      const el = page.elements.find((e) => e.id === this.selectedElementId);
      if (!el) return;
      if (!el.flip) el.flip = { horizontal: false, vertical: false };
      if (direction === 'horizontal') el.flip.horizontal = !el.flip.horizontal;
      else el.flip.vertical = !el.flip.vertical;
      this.showToast(
        `${direction === 'horizontal' ? '水平' : '垂直'}翻转已应用`,
        'success',
      );
      this.saveHistory('翻转图片');
    },

    // ===== 元素动画 =====
    setElementAnimation(
      animation: NonNullable<typeof this.selectedElement>['animation'],
    ) {
      const el = this.selectedElement;
      if (!el) return;
      el.animation = animation;
      this.saveHistory('设置动画');
    },

    previewAnimation() {
      const el = this.selectedElement;
      if (!el || !el.animation) return;
      // 通过触发自定义事件通知 EditorElement 重放动画
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('preview-animation', {
            detail: { elementId: el.id },
          }),
        );
      }
    },

    // ===== 元素工具栏位置 =====
    setElementToolbarTab(tab: string) {
      this.elementToolbarTab = tab;
    },

    selectElementAtPosition(
      elementId: string,
      clientX: number,
      clientY: number,
    ) {
      const page = this.currentPage;
      if (!page || page.elements.length === 0) {
        this.selectElement(elementId);
        return;
      }

      const screen = document.querySelector(
        '.device-screen',
      ) as HTMLElement | null;
      if (!screen) {
        this.selectElementBelow(elementId);
        return;
      }

      const rect = screen.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        this.selectElementBelow(elementId);
        return;
      }

      const x = ((clientX - rect.left) / rect.width) * this.canvasWidth;
      const y = ((clientY - rect.top) / rect.height) * this.canvasHeight;

      const containsPoint = (el: EditorElement) => {
        if (!el.visible) return false;
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const angle = -((el.rotation || 0) * Math.PI) / 180;
        const dx = x - cx;
        const dy = y - cy;
        const localX =
          dx * Math.cos(angle) - dy * Math.sin(angle) + el.width / 2;
        const localY =
          dx * Math.sin(angle) + dy * Math.cos(angle) + el.height / 2;
        return (
          localX >= 0 &&
          localX <= el.width &&
          localY >= 0 &&
          localY <= el.height
        );
      };

      const candidates = page.elements
        .map((el, index) => ({ el, index }))
        .filter(({ el }) => containsPoint(el))
        .toSorted((a, b) => {
          if (b.el.zIndex !== a.el.zIndex) return b.el.zIndex - a.el.zIndex;
          return b.index - a.index;
        })
        .map(({ el }) => el);

      if (candidates.length === 0) {
        this.selectElement(null);
        return;
      }

      const currentId = this.selectedElementId || elementId;
      const currentIndex = candidates.findIndex((el) => el.id === currentId);
      const next =
        candidates[
          currentIndex === -1 ? 0 : (currentIndex + 1) % candidates.length
        ];

      this.selectedElementId = next.id;
      this.selectedElementIds = [next.id];
      this.elementToolbarVisible = true;
      this.temporaryTopElementId = next.id;
    },

    resetElementPosition() {
      const el = this.selectedElement;
      if (!el) return;
      this.updateElement(el.id, { x: 0, y: 0 });
      this.showToast('已重置位置', 'success');
    },

    exportElementAsImage() {
      // 由 EditorElementToolbar 中的按钮触发，实际导出逻辑在 export.ts 中
      this.showToast('导出元素为图片功能开发中', 'info');
    },

    setElementToolbarVisible(visible: boolean) {
      this.elementToolbarVisible = visible;
    },

    // 关键：工具栏拖动边界约束（参考系：editor-canvas-wrapper）
    setElementToolbarPosition(
      pos: ElementToolbarPosition,
      containerWidth: number,
      // containerHeight: number,
    ) {
      const TOOLBAR_WIDTH = 320;
      const MIN_LEFT = 0;
      const MAX_LEFT = Math.max(MIN_LEFT, containerWidth - TOOLBAR_WIDTH);
      const clamped = {
        left: Math.max(MIN_LEFT, Math.min(MAX_LEFT, pos.left)),
        top: 0,
      };
      this.elementToolbarPosition = clamped;
    },

    // ===== 音频/音乐方法 =====
    setAudioAutoPlay(val: boolean) {
      this.audio.autoPlay = val;
      this.musicSettings.autoPlay = val;
    },
    setAudioDesignMode(val: boolean) {
      this.audio.designMode = val;
      this.musicSettings.designMode = val;
    },
    setAudioVolume(val: number) {
      this.audio.volume = val;
      this.musicSettings.volume = val;
    },
    addAudioElement(src: string) {
      const id = `audio_${Date.now()}`;
      this.audio.audioId = id;
      this.audio.src = src;
      this.showToast('音乐已添加', 'success');
    },
    updateAudioSrc(src: string) {
      this.audio.src = src;
    },
    resetAudioPosition() {
      if (!this.audio.audioId) return;
      this.audio.x = 280;
      this.audio.y = 10;
      this.showToast('音乐位置已复位', 'success');
    },
    toggleAudioLock() {
      this.audio.locked = !this.audio.locked;
    },
    updateAudioPosition(x: number, y: number) {
      this.audio.x = x;
      this.audio.y = y;
    },
    setAudioIcon(iconClass: string) {
      this.audio.iconClass = iconClass;
    },
    setAudioAnimation(anim: string) {
      this.audio.animation = anim;
    },
    deleteAudio() {
      if (!this.audio.audioId) return;
      this.audio = {
        audioId: null,
        src: null,
        x: 280,
        y: 10,
        width: 24,
        height: 24,
        autoPlay: true,
        designMode: false,
        volume: 50,
        locked: true,
        iconClass: 'bi bi-music-note',
        animation: 'spin',
      };
    },

    // ============ 每页单独翻页动效（Bug 8） ============
    setPageTransitionForPage(
      pageId: string,
      transition: 'fade' | 'flip' | 'none' | 'slide' | 'zoom' | undefined,
    ) {
      const page = this.pages.find((p) => p.id === pageId);
      if (page) {
        page.transition = transition;
        this.saveHistory('设置翻页动效');
      }
    },

    // ============ 页面拖拽排序（Bug 9） ============
    movePageOrder(fromIndex: number, toIndex: number) {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= this.pages.length ||
        toIndex >= this.pages.length
      )
        return;
      if (fromIndex === toIndex) return;
      const [item] = this.pages.splice(fromIndex, 1);
      this.pages.splice(toIndex, 0, item);
      this.saveHistory('页面排序');
    },

    // ============ 图层拖拽排序（Bug 10） ============
    // auto-name new element: type + sequence count
    autoNameElement(el: EditorElement) {
      const page = this.currentPage;
      if (!page) return;
      const typeNames: Record<string, string> = {
        text: '文本元素',
        image: '图片元素',
        decoration: '装饰元素',
        border: '边框元素',
        icon: '图标元素',
      };
      const baseName = typeNames[el.type] || '元素';
      let count = 0;
      const walk = (list: EditorElement[]) => {
        for (const e of list) {
          if (e.type === el.type) count++;
          if (e.children && e.children.length > 0) walk(e.children);
        }
      };
      walk(page.elements);
      el.name = count > 1 ? baseName + count : baseName;
    },

    moveElementOrder(fromId: string, toId: string) {
      const page = this.currentPage;
      if (!page) return;
      const fromIdx = page.elements.findIndex((e) => e.id === fromId);
      const toIdx = page.elements.findIndex((e) => e.id === toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
      // 从数组中移除 from 元素，插入到 to 位置
      const [moved] = page.elements.splice(fromIdx, 1);
      page.elements.splice(toIdx, 0, moved);
      // 重新按数组顺序分配 zIndex，保证渲染顺序一致
      page.elements.forEach((el, i) => {
        el.zIndex = i;
      });
      this.saveHistory('图层排序');
    },

    // 拖动时临时位置（不持久化）
    setElementToolbarPositionDragging(
      pos: ElementToolbarPosition,
      containerWidth: number,
      // containerHeight: number,
    ) {
      const TOOLBAR_WIDTH = 320;
      const MIN_LEFT = 0;
      const MAX_LEFT = Math.max(MIN_LEFT, containerWidth - TOOLBAR_WIDTH);
      this.elementToolbarPosition = {
        left: Math.max(MIN_LEFT, Math.min(MAX_LEFT, pos.left)),
        top: 0,
      };
    },

    // ===== 右侧面板 =====
    setRightPanelTab(tab: string) {
      this.rightPanelTab = tab;
    },

    setSidebarTab(tab: string) {
      this.sidebarTab = tab;
    },

    // ===== 右键菜单 =====
    showContextMenu(x: number, y: number, elementId: null | string) {
      this.contextMenu = { visible: true, x, y, elementId };
    },
    hideContextMenu() {
      this.contextMenu.visible = false;
    },

    // ===== Toast =====
    showToast(
      message: string,
      type: 'error' | 'info' | 'success' | 'warning' = 'info',
    ) {
      this.toast = { visible: true, message, type };
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toast.visible = false;
      }, 2000);
    },

    // ===== 键盘快捷键弹窗 =====
    toggleKeyboardShortcuts() {
      this.showKeyboardShortcuts = !this.showKeyboardShortcuts;
    },
    setKeyboardShortcuts(v: boolean) {
      this.showKeyboardShortcuts = v;
    },

    toggleLeftSidebar() {
      this.leftSidebarCollapsed = !this.leftSidebarCollapsed;
    },

    toggleRightSidebar() {
      this.rightSidebarCollapsed = !this.rightSidebarCollapsed;
    },

    // ===== 缩放 =====
    setZoom(z: number) {
      this.zoom = z;
    },

    setShowOverflow(v: boolean) {
      this.showOverflow = v;
    },

    setCanvasBackground(v: string) {
      this.canvasBackground = v;
    },

    toggleSettingsPanel() {
      this.settingsPanelVisible = !this.settingsPanelVisible;
    },

    setSettingsPanelVisible(v: boolean) {
      this.settingsPanelVisible = v;
    },

    setShowMobileBorder(v: boolean) {
      this.showMobileBorder = v;
      this.persist();
    },

    setShowGuides(v: boolean) {
      this.showGuides = v;
      this.persist();
    },

    // ===== 网格系统 =====
    toggleGrid() {
      this.showGrid = !this.showGrid;
    },
    setGridSize(size: number) {
      this.gridSize = Math.max(1, Math.min(100, size));
    },
    setGridColor(color: string) {
      this.gridColor = color;
    },
    toggleGridSnap() {
      this.gridSnap = !this.gridSnap;
    },
    setGridSnapThreshold(threshold: number) {
      this.gridSnapThreshold = Math.max(1, Math.min(50, threshold));
    },
    // 网格吸附：将坐标吸附到最近的网格线
    snapToGrid(value: number): number {
      if (!this.showGrid || !this.gridSnap) return value;
      const gridSize = this.gridSize;
      const threshold = this.gridSnapThreshold;
      const remainder = value % gridSize;
      if (remainder <= threshold) {
        return value - remainder;
      } else if (remainder >= gridSize - threshold) {
        return value + (gridSize - remainder);
      }
      return value;
    },

    setPageTransition(v: 'fade' | 'flip' | 'none' | 'slide' | 'zoom') {
      this.pageTransition = v;
    },

    // Bug5: 设置画布尺寸
    setCanvasSize(w: number, h: number) {
      this.canvasWidth = Math.max(100, Math.round(w));
      this.canvasHeight = Math.max(100, Math.round(h));
    },

    setHiddenMode(v: 'hide' | 'opacity') {
      this.hiddenMode = v;
      this.persist();
    },

    updatePageThumbnail(pageId: string, thumbnail: null | string) {
      const page = this.pages.find((p) => p.id === pageId);
      if (page) {
        page.thumbnail = thumbnail;
      }
    },

    // ===== 持久化（兼容别名） =====
    persist() {
      this.saveToLocal();
    },

    // ===== 自动保存 =====
    startAutoSave() {
      this.stopAutoSave();
      if (!this.autoSaveEnabled || this.autoSaveInterval <= 0) return;
      this.autoSaveTimerId = window.setInterval(() => {
        this.persist();
      }, this.autoSaveInterval);
    },

    stopAutoSave() {
      if (this.autoSaveTimerId !== null) {
        clearInterval(this.autoSaveTimerId);
        this.autoSaveTimerId = null;
      }
    },

    toggleAutoSave(enabled: boolean) {
      this.autoSaveEnabled = enabled;
      if (enabled) {
        this.startAutoSave();
      } else {
        this.stopAutoSave();
      }
    },

    setAutoSaveInterval(ms: number) {
      this.autoSaveInterval = Math.max(10_000, Math.min(300_000, ms)); // 10秒 ~ 5分钟
      if (this.autoSaveEnabled) {
        this.startAutoSave(); // 重启定时器
      }
    },

    // ===== 恢复（兼容别名） =====
    restore() {
      this.loadFromLocal();
    },

    restoreFromObject(data: any) {
      if (data.projectName) this.projectName = data.projectName;
      if (data.pages && data.pages.length > 0) {
        this.pages = JSON.parse(JSON.stringify(data.pages));
        this.currentPageId = data.currentPageId || this.pages[0].id;
        this.normalizeZIndex();
      }
      if (data.zoom) this.zoom = data.zoom;
      if (data.elementToolbarPosition)
        this.elementToolbarPosition = data.elementToolbarPosition;
      if (data.rightPanelTab) this.rightPanelTab = data.rightPanelTab;
      if (data.sidebarTab) this.sidebarTab = data.sidebarTab;
      this.initIfNeeded();
      this.saveHistory();
    },

    // ===== 自定义字体 =====
    addCustomFont(font: FontItem) {
      const exists = this.customFonts.some((f) => f.family === font.family);
      if (exists) {
        this.showToast('该字体已存在', 'warning');
        return false;
      }
      this.customFonts.push(font);
      try {
        localStorage.setItem(
          FONTS_STORAGE_KEY,
          JSON.stringify(this.customFonts),
        );
      } catch {}
      this.showToast('字体添加成功', 'success');
      return true;
    },
    deleteCustomFont(family: string) {
      const idx = this.customFonts.findIndex((f) => f.family === family);
      if (idx !== -1) {
        this.customFonts.splice(idx, 1);
        try {
          localStorage.setItem(
            FONTS_STORAGE_KEY,
            JSON.stringify(this.customFonts),
          );
        } catch {}
        this.showToast('已删除字体', 'success');
      }
    },

    // ===== 项目管理 =====
    saveProject() {
      this.saveToLocal();
      const project = {
        id: this.currentProjectId || generateId(),
        name: this.projectName,
        lastSaved: new Date().toLocaleString('zh-CN'),
      };
      if (!this.currentProjectId) {
        this.currentProjectId = project.id;
      }
      const idx = this.projects.findIndex((p) => p.id === project.id);
      if (idx === -1) {
        this.projects.push(project);
      } else {
        this.projects[idx] = project;
      }
      // 持久化项目列表
      localStorage.setItem(
        'invitation_editor_projects_v1',
        JSON.stringify(this.projects),
      );
      localStorage.setItem(
        'invitation_editor_current_project_v1',
        this.currentProjectId,
      );
      this.lastSavedTime = project.lastSaved;
    },

    loadProject(projectId: string) {
      // 先保存当前项目
      if (
        this.currentProjectId &&
        this.pages.some((p) => p.elements.length > 0)
      ) {
        this.saveProject();
      }
      // 加载目标项目
      const storageKey = `invitation_editor_project_${projectId}_v1`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          this.pages = data.pages || [];
          this.currentPageId = data.currentPageId || '';
          this.projectName = data.projectName || '未命名项目';
          this.currentProjectId = projectId;
          this.history = [];
          this.historyIndex = -1;
          this.saveHistory();
          this.showToast(`已切换到项目：${this.projectName}`, 'success');
        } catch {
          this.showToast('项目加载失败', 'error');
        }
      }
    },

    createNewProject(name?: string) {
      // 先保存当前项目
      if (
        this.currentProjectId &&
        this.pages.some((p) => p.elements.length > 0)
      ) {
        this.saveProject();
      }
      // 创建新项目
      const page = createDefaultPage(1);
      this.pages = [page];
      this.currentPageId = page.id;
      this.projectName = name || '未命名项目';
      this.currentProjectId = generateId();
      this.history = [];
      this.historyIndex = -1;
      this.saveHistory();
      this.saveProject();
      this.showToast('已创建新项目', 'success');
    },

    deleteProject(projectId: string) {
      this.projects = this.projects.filter((p) => p.id !== projectId);
      localStorage.setItem(
        'invitation_editor_projects_v1',
        JSON.stringify(this.projects),
      );
      localStorage.removeItem(`invitation_editor_project_${projectId}_v1`);
      if (this.currentProjectId === projectId) {
        if (this.projects.length > 0) {
          this.loadProject(this.projects[0].id);
        } else {
          this.createNewProject();
        }
      }
      this.showToast('项目已删除', 'success');
    },

    initProjects() {
      // 初始化时加载项目列表
      const saved = localStorage.getItem('invitation_editor_projects_v1');
      if (saved) {
        try {
          this.projects = JSON.parse(saved);
        } catch {
          this.projects = [];
        }
      }
      const currentId = localStorage.getItem(
        'invitation_editor_current_project_v1',
      );
      if (currentId) {
        this.currentProjectId = currentId;
      }
    },

    saveToLocal() {
      const key = this.currentProjectId
        ? `invitation_editor_project_${this.currentProjectId}_v1`
        : STORAGE_KEY;
      try {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        this.lastSavedTime = `${hh}:${mm}:${ss}`;
        const data = {
          projectName: this.projectName,
          pages: this.pages,
          currentPageId: this.currentPageId,
          zoom: this.zoom,
          showMobileBorder: this.showMobileBorder,
          showOverflow: this.showOverflow,
          showGuides: this.showGuides,
          pageTransition: this.pageTransition,
          hiddenMode: this.hiddenMode,
          elementToolbarPosition: this.elementToolbarPosition,
          rightPanelTab: this.rightPanelTab,
          sidebarTab: this.sidebarTab,
          canvasBackground: this.canvasBackground,
          lastSavedTime: this.lastSavedTime,
          autoSaveEnabled: this.autoSaveEnabled,
          autoSaveInterval: this.autoSaveInterval,
        };
        localStorage.setItem(key, JSON.stringify(data));
        this.hasUnsavedChanges = false;
      } catch (error) {
        console.error('Persist failed:', error);
      }
    },

    loadFromLocal() {
      const key = this.currentProjectId
        ? `invitation_editor_project_${this.currentProjectId}_v1`
        : STORAGE_KEY;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) {
          this.initIfNeeded();
          return;
        }
        const data = JSON.parse(raw);
        this.projectName = data.projectName || '我的请柬';
        this.pages = data.pages || [createDefaultPage(1)];
        this.currentPageId = data.currentPageId || this.pages[0].id;
        this.normalizeZIndex();
        this.zoom = data.zoom || 100;
        this.showMobileBorder = data.showMobileBorder !== false;
        this.showOverflow = data.showOverflow === true;
        this.showGuides = data.showGuides !== false;
        this.pageTransition = (data.pageTransition as any) || 'slide';
        this.hiddenMode = (data.hiddenMode as any) || 'opacity';
        this.elementToolbarPosition = data.elementToolbarPosition || {
          left: 0,
          top: 0,
        };
        this.rightPanelTab = data.rightPanelTab || 'pages';
        this.sidebarTab = data.sidebarTab || 'elements';
        this.canvasBackground = data.canvasBackground || '';
        this.lastSavedTime = data.lastSavedTime || '';
        this.autoSaveEnabled = data.autoSaveEnabled !== false;
        this.autoSaveInterval = data.autoSaveInterval || 30_000;
        this.initIfNeeded();
        this.startAutoSave();
      } catch (error) {
        console.error('Restore failed:', error);
        this.initIfNeeded();
      }
    },
  },
});
