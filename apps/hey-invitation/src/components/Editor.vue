<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';

import { useEditorStore } from '../store/editor';
import EditorCanvas from './EditorCanvas.vue';
import EditorElementToolbar from './EditorElementToolbar.vue';
import EditorFooter from './EditorFooter.vue';
import EditorHeader from './EditorHeader.vue';
import EditorRightPanel from './EditorRightPanel.vue';
import EditorSidebar from './EditorSidebar.vue';
import HistoryPanel from './HistoryPanel.vue';

const store = useEditorStore();

// 初始化
onMounted(() => {
  store.restore();
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeyDown);
  // Bug7: 全页面禁用默认右键菜单（使用我们自己的右键菜单）
  document.addEventListener('contextmenu', onGlobalContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('contextmenu', onGlobalContextMenu);
});

// Bug7: 全局禁用浏览器默认右键菜单，在 canvas 区域使用我们自定义的菜单
const onGlobalContextMenu = (e: MouseEvent) => {
  // 允许输入框内有正常右键（例如粘贴等）
  const target = e.target as HTMLElement;
  if (target.tagName && target.tagName.match(/INPUT|TEXTAREA|SELECT/)) return;
  e.preventDefault();
};

// Bug4: 是否为多选状态
const hasMultiSelection = computed(() => {
  return store.selectedElementIds && store.selectedElementIds.length > 1;
});

const onDocumentClick = () => {
  // 点击空白处隐藏右键菜单
  if (store.contextMenu.visible) {
    store.hideContextMenu();
  }
};

// ============ 精简快捷键体系（只保留必要的） ============
// 核心：删除 / 全选 / 复制 / 撤销 / 重做 / ESC 关闭菜单弹窗 / Alt+K 打开说明
// 所有编辑器快捷键都在输入态（input/textarea/select）下禁用
const onKeyDown = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement;
  const isEditing =
    target.tagName && target.tagName.match(/INPUT|TEXTAREA|SELECT/);
  if (isEditing) return;

  // 阻止与浏览器默认行为冲突的快捷键（Ctrl+S 保存页面、Ctrl+P 打印、Ctrl+F 搜索等）
  const ctrl = e.ctrlKey || e.metaKey;
  const alt = e.altKey;
  const key = e.key;

  // 阻止浏览器默认快捷键：Ctrl+S/P/F/B/I/U/J/H/O/N/T
  if (ctrl) {
    const k = key.toLowerCase();
    if (
      [
        'b',
        'd',
        'f',
        'g',
        'h',
        'i',
        'j',
        'n',
        'o',
        'p',
        's',
        't',
        'u',
      ].includes(k)
    )
      e.preventDefault();
  }

  // Ctrl+S: 保存
  if (ctrl && key.toLowerCase() === 's') {
    store.persist();
    store.showToast('已保存', 'success');
    e.preventDefault();
    return;
  }

  // ESC: 关闭弹窗或右键菜单
  if (key === 'Escape') {
    if (store.showKeyboardShortcuts) {
      store.setKeyboardShortcuts(false);
      e.preventDefault();
    } else if (store.contextMenu.visible) {
      store.hideContextMenu();
      e.preventDefault();
    }
    return;
  }

  // Delete / Backspace: 删除选中元素
  if (key === 'Delete' || key === 'Backspace') {
    if (
      store.selectedElementId ||
      (store.selectedElementIds && store.selectedElementIds.length > 0)
    ) {
      (store as any).deleteSelected();
      e.preventDefault();
    }
    return;
  }

  // Ctrl+A: 全选元素
  if (ctrl && key.toLowerCase() === 'a') {
    store.selectAllElements();
    e.preventDefault();
    return;
  }

  // Ctrl+D: 复制选中元素
  if (ctrl && key.toLowerCase() === 'd') {
    if (store.selectedElement) {
      store.duplicateElement(store.selectedElement.id);
    }
    e.preventDefault();
    return;
  }

  // Ctrl+Shift+G: 解组（必须在 Ctrl+G 之前，否则 Ctrl+G 会先匹配）
  if (ctrl && e.shiftKey && key.toLowerCase() === 'g') {
    unGroupSelected();
    e.preventDefault();
    return;
  }

  // Ctrl+G: 组合选中元素
  if (ctrl && key.toLowerCase() === 'g') {
    groupSelected();
    e.preventDefault();
    return;
  }

  // Ctrl+Z: 撤销
  if (ctrl && key.toLowerCase() === 'z') {
    store.undo();
    e.preventDefault();
    return;
  }

  // Ctrl+Y 或 Ctrl+Shift+Z: 重做
  if (
    (ctrl && key.toLowerCase() === 'y') ||
    (ctrl && e.shiftKey && key.toLowerCase() === 'z')
  ) {
    store.redo();
    e.preventDefault();
    return;
  }

  // Alt+K: 打开/关闭快捷键说明弹窗
  if (alt && key.toLowerCase() === 'k') {
    store.toggleKeyboardShortcuts();
    e.preventDefault();
    return;
  }

  // Ctrl+↑: 上移一层
  if (ctrl && key === 'ArrowUp') {
    store.bringForward();
    e.preventDefault();
    return;
  }

  // Ctrl+↓: 下移一层
  if (ctrl && key === 'ArrowDown') {
    store.sendBackward();
    e.preventDefault();
    return;
  }

  // Arrow keys: 移动选中元素（每次移动5px）
  if (
    !ctrl &&
    !alt &&
    ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(key)
  ) {
    if (store.selectedElement) {
      const el = store.selectedElement;
      let dx = 0;
      let dy = 0;
      if (key === 'ArrowUp') dy = -5;
      else if (key === 'ArrowDown') dy = 5;
      else if (key === 'ArrowLeft') dx = -5;
      else if (key === 'ArrowRight') dx = 5;
      store.updateElement(el.id, { x: el.x + dx, y: el.y + dy });
      store.saveHistory('移动元素');
    }
    e.preventDefault();
  }
};

// 操作方法（Bug4: 支持多选元素）
const duplicateSelected = () => {
  // 多选：复制所有选中的元素
  if (hasMultiSelection.value) {
    for (const id of store.selectedElementIds) {
      store.duplicateElement(id);
    }
  } else if (store.selectedElement) {
    store.duplicateElement(store.selectedElement.id);
  }
  store.hideContextMenu();
};
const bringToFront = () => {
  store.bringToFront();
  store.hideContextMenu();
};
const sendToBack = () => {
  store.sendToBack();
  store.hideContextMenu();
};
const lockSelected = () => {
  // 多选：锁定所有选中的元素
  if (hasMultiSelection.value) {
    for (const id of store.selectedElementIds) {
      store.toggleLock(id);
    }
  } else if (store.selectedElement) {
    store.toggleLock(store.selectedElement.id);
  }
  store.hideContextMenu();
};
const toggleVisible = () => {
  // 多选：切换所有选中元素的可见性
  if (hasMultiSelection.value) {
    for (const id of store.selectedElementIds) {
      store.toggleVisibility(id);
    }
  } else if (store.selectedElement) {
    store.toggleVisibility(store.selectedElement.id);
  }
  store.hideContextMenu();
};
const deleteSelected = () => {
  // 统一使用 deleteSelected 支持多选/单选
  store.deleteSelected();
  store.hideContextMenu();
};
const addNewPage = () => {
  store.addPage();
  store.hideContextMenu();
};

// 多选元素菜单：组合
const groupSelected = () => {
  store.groupElements();
  store.hideContextMenu();
};

// 单选元素菜单：解组（选中组时可用）
const unGroupSelected = () => {
  store.unGroupElements();
  store.hideContextMenu();
};

// 多选元素菜单：对齐
const alignMenu = (
  direction: 'bottom' | 'center' | 'left' | 'middle' | 'right' | 'top',
) => {
  store.alignSelected(direction);
  store.hideContextMenu();
};

// 多选元素菜单：等间距分布
const distributeMenu = (direction: 'horizontal' | 'vertical') => {
  store.distributeSelected(direction);
  store.hideContextMenu();
};

const adjustedMenuStyle = computed(() => {
  const x = store.contextMenu.x;
  const y = store.contextMenu.y;
  const mw = 220;
  const mh = 340;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    left: `${Math.min(x, vw - mw - 8)}px`,
    top: `${Math.min(y, vh - mh - 8)}px`,
  };
});

const toastIcon = computed(() => {
  switch (store.toast.type) {
    case 'error': {
      return 'bi bi-x-circle';
    }
    case 'success': {
      return 'bi bi-check-circle';
    }
    case 'warning': {
      return 'bi bi-exclamation-triangle';
    }
    default: {
      return 'bi bi-info-circle';
    }
  }
});
</script>

<template>
  <div class="editor-container">
    <EditorHeader />

    <div class="editor-main">
      <!-- 左侧：设计元素库 -->
      <EditorSidebar />

      <!-- 中间：画布区域（自适应，flex-grow） -->
      <div class="editor-canvas-wrapper">
        <!-- 手机画布 + 右侧工具栏/面板 -->
        <EditorCanvas />

        <!-- 全局右键菜单（Bug4: 支持多选元素 + Bug7: 全页面禁用浏览器默认右键） -->
        <div
          v-if="store.contextMenu.visible"
          class="context-menu"
          :style="adjustedMenuStyle"
          @contextmenu.prevent
        >
          <!-- 多选元素操作 -->
          <template v-if="hasMultiSelection">
            <button class="context-menu-item" @click="duplicateSelected">
              <i class="bi bi-files"></i> 复制
              {{ store.selectedElementIds.length }} 个元素
            </button>
            <button class="context-menu-item" @click="groupSelected">
              <i class="bi bi-bounding-box-circles"></i> 组合元素
            </button>
            <div class="context-menu-divider"></div>
            <button class="context-menu-item" @click="alignMenu('top')">
              <i class="bi bi-align-top"></i> 顶部对齐
            </button>
            <button class="context-menu-item" @click="alignMenu('middle')">
              <i class="bi bi-align-middle"></i> 垂直居中
            </button>
            <button class="context-menu-item" @click="alignMenu('bottom')">
              <i class="bi bi-align-bottom"></i> 底部对齐
            </button>
            <button class="context-menu-item" @click="alignMenu('left')">
              <i class="bi bi-align-start"></i> 左侧对齐
            </button>
            <button class="context-menu-item" @click="alignMenu('center')">
              <i class="bi bi-align-center"></i> 水平居中
            </button>
            <button class="context-menu-item" @click="alignMenu('right')">
              <i class="bi bi-align-end"></i> 右侧对齐
            </button>
            <div class="context-menu-divider"></div>
            <button
              class="context-menu-item"
              @click="distributeMenu('horizontal')"
            >
              <i class="bi bi-columns"></i> 水平等距
            </button>
            <button
              class="context-menu-item"
              @click="distributeMenu('vertical')"
            >
              <i class="bi bi-rows"></i> 垂直等距
            </button>
            <button class="context-menu-item danger" @click="deleteSelected">
              <i class="bi bi-trash"></i> 删除
              {{ store.selectedElementIds.length }} 个元素
            </button>
          </template>
          <!-- 单选元素操作 -->
          <template v-else-if="store.selectedElement">
            <button class="context-menu-item" @click="duplicateSelected">
              <i class="bi bi-files"></i> 复制元素
            </button>
            <button class="context-menu-item" @click="bringToFront">
              <i class="bi bi-layers"></i> 置于顶层
            </button>
            <button class="context-menu-item" @click="sendToBack">
              <i class="bi bi-layers-fill"></i> 置于底层
            </button>
            <button
              v-if="store.selectedElement.type === 'group'"
              class="context-menu-item"
              @click="unGroupSelected"
            >
              <i class="bi bi-box-arrow-in-right"></i> 解组
            </button>
            <button class="context-menu-item" @click="lockSelected">
              <i
                :class="
                  store.selectedElement.locked ? 'bi bi-unlock' : 'bi bi-lock'
                "
              ></i>
              {{ store.selectedElement.locked ? '解锁' : '锁定' }}
            </button>
            <button class="context-menu-item" @click="toggleVisible">
              <i
                :class="
                  store.selectedElement.visible
                    ? 'bi bi-eye'
                    : 'bi bi-eye-slash'
                "
              ></i>
              {{ store.selectedElement.visible ? '隐藏' : '显示' }}
            </button>
            <button class="context-menu-item danger" @click="deleteSelected">
              <i class="bi bi-trash"></i> 删除
            </button>
          </template>
          <!-- 空白区域 -->
          <template v-else>
            <button class="context-menu-item" @click="addNewPage">
              <i class="bi bi-plus-circle"></i> 添加新页面
            </button>
          </template>
        </div>
      </div>

      <!-- 右侧：属性/页面/图层 管理面板 -->
      <EditorRightPanel />

      <!-- 元素属性浮动工具栏（绝对定位，可拖动，范围：editor-main） -->
      <EditorElementToolbar />
    </div>

    <EditorFooter />

    <!-- Toast 消息 -->
    <Transition name="toast">
      <div
        v-if="store.toast.visible"
        class="toast-message"
        :class="store.toast.type"
      >
        <i :class="toastIcon"></i>
        <span>{{ store.toast.message }}</span>
      </div>
    </Transition>

    <!-- 历史记录面板 -->
    <HistoryPanel />

    <!-- 键盘快捷键弹窗 -->
    <div
      v-if="store.showKeyboardShortcuts"
      class="modal-backdrop"
      @click.self="store.setKeyboardShortcuts(false)"
    >
      <div class="modal-panel">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-keyboard-fill"></i> 键盘快捷键
          </h5>
          <button class="btn-close" @click="store.setKeyboardShortcuts(false)">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-body keyboard-shortcuts-compact">
          <div class="shortcut-group">
            <span class="shortcut-group-title">编辑操作</span>
          </div>
          <div class="keyboard-row">
            <!--prettier-ignore-->
            <span class="kbd-group"><kbd>Ctrl</kbd> + <kbd>Z</kbd></span>
            <span class="kbd-desc">撤销</span>
          </div>
          <div class="keyboard-row">
            <!--prettier-ignore-->
            <span class="kbd-group"><kbd>Ctrl</kbd> + <kbd>Y</kbd></span>
            <span class="kbd-desc">重做</span>
          </div>
          <div class="keyboard-row">
            <span class="kbd-group"><kbd>Ctrl</kbd> + <kbd>D</kbd></span>
            <span class="kbd-desc">复制选中元素</span>
          </div>
          <div class="keyboard-row">
            <span class="kbd-group"><kbd>Ctrl</kbd> + <kbd>G</kbd></span>
            <span class="kbd-desc">组合选中元素</span>
          </div>
          <div class="keyboard-row">
            <!--prettier-ignore-->
            <span class="kbd-group"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>G</kbd></span>
            <span class="kbd-desc">取消组合</span>
          </div>
          <div class="keyboard-row">
            <!--prettier-ignore-->
            <span class="kbd-group"><kbd>Delete</kbd> / <kbd>Backspace</kbd></span>
            <span class="kbd-desc">删除选中元素</span>
          </div>
          <div class="shortcut-group">
            <span class="shortcut-group-title">选择与导航</span>
          </div>
          <div class="keyboard-row">
            <span class="kbd-group"><kbd>Ctrl</kbd> + <kbd>A</kbd></span>
            <span class="kbd-desc">全选所有元素</span>
          </div>
          <div class="keyboard-row">
            <span class="kbd-group"><kbd>Alt</kbd> + <kbd>点击</kbd></span>
            <span class="kbd-desc">循环选择重叠元素</span>
          </div>
          <div class="keyboard-row">
            <span class="kbd-group"><kbd>Esc</kbd></span>
            <span class="kbd-desc">关闭弹窗 / 右键菜单</span>
          </div>
          <div class="shortcut-group">
            <span class="shortcut-group-title">视图</span>
          </div>
          <div class="keyboard-row">
            <span class="kbd-group"><kbd>Alt</kbd> + <kbd>K</kbd></span>
            <span class="kbd-desc">打开 / 关闭快捷键面板</span>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-sm btn-primary"
            @click="store.setKeyboardShortcuts(false)"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
