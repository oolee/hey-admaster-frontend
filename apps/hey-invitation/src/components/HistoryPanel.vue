<template>
  <Transition name="history-panel">
    <div v-if="store.historyPanelVisible" class="history-panel-container">
      <div class="history-panel-overlay" @click="store.setHistoryPanelVisible(false)"></div>
      <div class="history-panel">
        <div class="history-panel-header">
          <span class="history-panel-title">
            <i class="bi bi-clock-history"></i> 历史记录
          </span>
          <div class="history-panel-actions">
            <span class="history-info">共 {{ store.history.length }} 步 (当前: {{ store.historyIndex + 1 }})</span>
            <button class="btn btn-sm btn-outline-secondary" @click="onUndo" :disabled="store.historyIndex <= 0">
              <i class="bi bi-arrow-counterclockwise"></i> 撤销
            </button>
            <button class="btn btn-sm btn-outline-secondary" @click="onRedo" :disabled="store.historyIndex >= store.history.length - 1">
              <i class="bi bi-arrow-clockwise"></i> 重做
            </button>
            <button class="btn-close-small" @click="store.setHistoryPanelVisible(false)">
              <i class="bi bi-x"></i>
            </button>
          </div>
        </div>
        <div class="history-panel-list">
          <div
            v-for="(item, index) in reversedHistory"
            :key="index"
            class="history-item"
            :class="{
              active: item.realIndex === store.historyIndex,
              future: item.realIndex > store.historyIndex,
              past: item.realIndex < store.historyIndex,
            }"
            @click="onGoTo(item.realIndex)"
          >
            <div class="history-item-icon">
              <i v-if="item.realIndex === store.historyIndex" class="bi bi-dot"></i>
              <i v-else-if="item.realIndex < store.historyIndex" class="bi bi-check-circle"></i>
              <i v-else class="bi bi-circle"></i>
            </div>
            <div class="history-item-content">
              <div class="history-item-label">{{ item.label }}</div>
              <div class="history-item-time">{{ formatTime(item.timestamp) }}</div>
            </div>
            <div class="history-item-index">#{{ item.realIndex + 1 }}</div>
          </div>
          <div v-if="store.history.length === 0" class="history-empty">
            <i class="bi bi-inbox"></i>
            <p>暂无历史记录</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '../store/editor';

const store = useEditorStore();

// 反转列表：最新的在上方
const reversedHistory = computed(() => {
  const list: { label: string; timestamp: number; realIndex: number }[] = [];
  for (let i = store.history.length - 1; i >= 0; i--) {
    const h: any = store.history[i];
    list.push({
      label: h.label || '操作',
      timestamp: h.timestamp || 0,
      realIndex: i,
    });
  }
  return list;
});

const formatTime = (ts: number) => {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const onUndo = () => store.undo();
const onRedo = () => store.redo();
const onGoTo = (index: number) => store.goToHistory(index);
</script>
