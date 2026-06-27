<script setup lang="ts">
import { ref } from 'vue';

import { useEditorStore } from '../store/editor';

const store = useEditorStore();
const showGridSettings = ref(false);

const onUndo = () => store.undo();
const onRedo = () => store.redo();
const onHistory = () => store.toggleHistoryPanel();
const onPreview = () => {
  store.persist();
  store.showToast('已保存，可在手机端预览', 'info');
};
const onCopyPage = () => {
  store.copyCurrentPage();
  store.showToast('已复制当前页面', 'success');
};
const onLockPage = () => {
  store.toggleLockPage();
  store.showToast(
    store.currentPage?.locked ? '页面已锁定' : '页面已解锁',
    'info',
  );
};
const onImportPS = () => {
  store.showToast('导入PS功能开发中', 'warning');
};
const onKeyboardShortcuts = () => {
  store.toggleKeyboardShortcuts();
};
const onGridSettings = () => {
  showGridSettings.value = !showGridSettings.value;
};
const onToggleMobileBorder = () => {
  store.setShowMobileBorder(!store.showMobileBorder);
};
const onZoomIn = () => {
  store.setZoom(Math.min(200, store.zoom + 10));
};
const onZoomOut = () => {
  store.setZoom(Math.max(50, store.zoom - 10));
};
const onToggleOverflow = () => {
  store.setShowOverflow(!store.showOverflow);
};
const onToggleGuides = () => {
  store.setShowGuides(!store.showGuides);
};
const onSave = () => {
  store.persist();
  store.showToast('保存成功！', 'success');
};
</script>

<template>
  <div class="right-toolbar">
    <button class="toolbar-btn" data-tooltip="撤销 (Ctrl+Z)" @click="onUndo">
      <i class="bi bi-arrow-counterclockwise"></i>
    </button>
    <button class="toolbar-btn" data-tooltip="前进 (Ctrl+Y)" @click="onRedo">
      <i class="bi bi-arrow-clockwise"></i>
    </button>
    <button class="toolbar-btn" data-tooltip="历史记录" @click="onHistory">
      <i class="bi bi-clock-history"></i>
    </button>
    <button class="toolbar-btn" data-tooltip="预览" @click="onPreview">
      <i class="bi bi-play-fill"></i>
    </button>
    <button class="toolbar-btn" data-tooltip="复制页面" @click="onCopyPage">
      <i class="bi bi-copy"></i>
    </button>
    <button class="toolbar-btn" data-tooltip="锁定页面" @click="onLockPage">
      <i class="bi bi-lock-fill"></i>
    </button>
    <button class="toolbar-btn" data-tooltip="导入PS" @click="onImportPS">
      <i class="bi bi-file-image-fill"></i>
    </button>
    <button
      class="toolbar-btn"
      data-tooltip="键盘快捷键"
      @click="onKeyboardShortcuts"
    >
      <i class="bi bi-keyboard-fill"></i>
    </button>
    <button
      class="toolbar-btn"
      data-tooltip="网格设置"
      :class="{ active: store.showGrid }"
      @click="onGridSettings"
    >
      <i class="bi bi-border-all"></i>
    </button>
    <button
      class="toolbar-btn"
      data-tooltip="手机边框"
      :class="{ active: store.showMobileBorder }"
      @click="onToggleMobileBorder"
    >
      <i class="bi bi-phone-fill"></i>
    </button>

    <!-- 缩放控制 -->
    <div class="zoom-control-group">
      <button class="zoom-btn" data-tooltip="放大" @click="onZoomIn">
        <i class="bi bi-zoom-in"></i>
      </button>
      <span class="zoom-value">{{ store.zoom }}%</span>
      <button class="zoom-btn" data-tooltip="缩小" @click="onZoomOut">
        <i class="bi bi-zoom-out"></i>
      </button>
    </div>

    <button
      class="toolbar-btn"
      data-tooltip="显示/隐藏画布外元素"
      :class="{ active: store.showOverflow }"
      @click="onToggleOverflow"
    >
      <i :class="store.showOverflow ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
    </button>

    <button
      class="toolbar-btn"
      data-tooltip="显示/隐藏参考线"
      :class="{ active: store.showGuides }"
      @click="onToggleGuides"
    >
      <i class="bi bi-grid-3x3-gap-fill"></i>
    </button>

    <button
      class="toolbar-btn"
      data-tooltip="保存"
      :style="{ color: store.hasUnsavedChanges ? '#d63384' : '' }"
      @click="onSave"
    >
      <i class="bi bi-floppy-fill"></i>
    </button>
  </div>

  <!-- 网格设置弹窗 -->
  <Teleport to="body">
    <div
      v-if="showGridSettings"
      class="grid-settings-mask"
      @click.self="showGridSettings = false"
    >
      <div class="grid-settings-panel">
        <div class="grid-settings-header">
          <span><i class="bi bi-border-all"></i> 网格设置</span>
          <button class="grid-settings-close" @click="showGridSettings = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="grid-settings-body">
          <div class="grid-setting-row">
            <label>显示网格</label>
            <button
              class="toggle-btn"
              :class="{ active: store.showGrid }"
              @click="store.toggleGrid()"
            >
              <i
                :class="store.showGrid ? 'bi bi-toggle-on' : 'bi bi-toggle-off'"
              ></i>
            </button>
          </div>
          <div class="grid-setting-row">
            <label>网格大小</label>
            <div class="grid-setting-control">
              <input
                type="range"
                min="1"
                max="100"
                :value="store.gridSize"
                @input="
                  store.setGridSize(
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              />
              <span class="grid-setting-value">{{ store.gridSize }}px</span>
            </div>
          </div>
          <div class="grid-setting-row">
            <label>网格颜色</label>
            <input
              type="color"
              :value="store.gridColor"
              @input="
                store.setGridColor(($event.target as HTMLInputElement).value)
              "
              class="grid-color-picker"
            />
          </div>
          <div class="grid-setting-row">
            <label>吸附到网格</label>
            <button
              class="toggle-btn"
              :class="{ active: store.gridSnap }"
              @click="store.toggleGridSnap()"
            >
              <i
                :class="store.gridSnap ? 'bi bi-toggle-on' : 'bi bi-toggle-off'"
              ></i>
            </button>
          </div>
          <div class="grid-setting-row">
            <label>吸附阈值</label>
            <div class="grid-setting-control">
              <input
                type="range"
                min="1"
                max="50"
                :value="store.gridSnapThreshold"
                @input="
                  store.setGridSnapThreshold(
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              />
              <!-- prettier-ignore -->
              <span class="grid-setting-value">{{ store.gridSnapThreshold }}px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 网格设置弹窗 */
.grid-settings-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(15 23 42 / 30%);
}

.grid-settings-panel {
  width: 320px;
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgb(0 0 0 / 15%);
}

.grid-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #e5e7eb;
}

.grid-settings-header i {
  margin-right: 6px;
  color: #4f46e5;
}

.grid-settings-close {
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  background: transparent;
  border: none;
}

.grid-settings-body {
  padding: 12px 14px;
}

.grid-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 12px;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}

.grid-setting-row:last-child {
  border-bottom: none;
}

.grid-setting-control {
  display: flex;
  gap: 8px;
  align-items: center;
}

.grid-setting-control input[type='range'] {
  width: 120px;
  accent-color: #4f46e5;
}

.grid-setting-value {
  min-width: 36px;
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  text-align: right;
}

.grid-color-picker {
  width: 32px;
  height: 24px;
  padding: 0;
  cursor: pointer;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.toggle-btn {
  font-size: 18px;
  color: #9ca3af;
  cursor: pointer;
  background: transparent;
  border: none;
  transition: color 0.15s;
}

.toggle-btn.active {
  color: #4f46e5;
}
</style>
