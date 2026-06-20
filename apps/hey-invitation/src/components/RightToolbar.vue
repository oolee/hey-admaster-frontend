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
    <button class="toolbar-btn" data-tooltip="键盘快捷键" @click="onKeyboardShortcuts">
      <i class="bi bi-keyboard-fill"></i>
    </button>
    <button class="toolbar-btn" data-tooltip="网格设置" @click="onGridSettings">
      <i class="bi bi-grid-1x2-fill"></i>
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
      style="color: #d63384;"
      @click="onSave"
    >
      <i class="bi bi-save2-fill"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '../store/editor';

const store = useEditorStore();

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
  store.showToast(store.currentPage?.locked ? '页面已锁定' : '页面已解锁', 'info');
};
const onImportPS = () => {
  store.showToast('导入PS功能开发中', 'warning');
};
const onKeyboardShortcuts = () => {
  store.toggleKeyboardShortcuts();
};
const onGridSettings = () => {
  store.showToast('网格设置功能开发中', 'warning');
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
