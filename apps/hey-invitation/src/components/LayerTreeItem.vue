<template>
  <template v-for="element in elements" :key="element.id">
    <div
      class="layer-item"
      :class="{
        active: store.isElementSelected(element.id),
        locked: element.locked,
        hidden: !element.visible,
        'layer-dragging': dragLayerFrom === element.id,
        'layer-drag-over': dragLayerOver === element.id,
        'layer-item-child': depth > 0,
      }"
      :style="{ paddingLeft: (12 + depth * 20) + 'px' }"
      draggable="true"
      @dragstart="onDragStart(element.id, $event)"
      @dragover.prevent="onDragOver(element.id)"
      @dragleave="onDragLeave(element.id)"
      @drop="onDrop(element.id)"
      @dragend="onDragEnd"
      @click="onItemClick(element.id, $event)"
    >
      <i class="bi bi-grip-vertical layer-drag-handle" data-drag-handle title="拖动排序"></i>
      <i
        v-if="element.type === 'group' && hasChildren(element)"
        class="layer-expand"
        :class="getExpanded(element.id) ? 'bi bi-dash-square' : 'bi bi-plus-square'"
        @click.stop="toggleExpand(element.id)"
        title="展开/折叠组"
      ></i>
      <i v-else class="layer-drag-handle-placeholder"></i>
      <i :class="getLayerIcon(element.type)"></i>
      <span class="layer-name">{{ getElementDisplay(element) }}</span>
      <div class="layer-actions">
        <button class="layer-btn" @click.stop="emit('moveUp', element.id)" title="上移一层">
          <i class="bi bi-arrow-up"></i>
        </button>
        <button class="layer-btn" @click.stop="emit('moveDown', element.id)" title="下移一层">
          <i class="bi bi-arrow-down"></i>
        </button>
        <button class="layer-btn" @click.stop="emit('rename', element)" title="重命名">
          <i class="bi bi-pencil"></i>
        </button>
        <button
          v-if="element.type === 'group'"
          class="layer-btn"
          @click.stop="emit('ungroup')"
          title="取消组合"
        >
          <i class="bi bi-box-arrow-in-right"></i>
        </button>
        <button class="layer-btn" @click.stop="emit('toggleVis', element.id)">
          <i :class="element.visible ? 'bi bi-eye' : 'bi bi-eye-slash'"></i>
        </button>
        <button class="layer-btn" @click.stop="emit('toggleLock', element.id)">
          <i :class="element.locked ? 'bi bi-lock-fill' : 'bi bi-unlock'"></i>
        </button>
      </div>
    </div>
    <!-- recursive children for groups -->
    <LayerTreeItem
      v-if="element.type === 'group' && hasChildren(element) && getExpanded(element.id)"
      :elements="[...element.children!].reverse()"
      :depth="depth + 1"
      :expanded-groups="expandedGroups"
      :drag-layer-from="dragLayerFrom"
      :drag-layer-over="dragLayerOver"
      @move-up="(id: string) => emit('moveUp', id)"
      @move-down="(id: string) => emit('moveDown', id)"
      @rename="(el: EditorElement) => emit('rename', el)"
      @ungroup="emit('ungroup')"
      @toggle-vis="(id: string) => emit('toggleVis', id)"
      @toggle-lock="(id: string) => emit('toggleLock', id)"
      @select="(id: string, ev: MouseEvent) => emit('select', id, ev)"
      @drag-start="(id: string, ev: DragEvent) => emit('dragStart', id, ev)"
      @drag-over="(id: string) => emit('dragOver', id)"
      @drag-leave="(id: string) => emit('dragLeave', id)"
      @drop-item="(id: string) => emit('dropItem', id)"
      @drag-end="emit('dragEnd')"
      @toggle-expand="(id: string) => emit('toggleExpand', id)"
    />
  </template>
</template>

<script setup lang="ts">
import type { EditorElement } from '../types/editor';
import { useEditorStore } from '../store/editor';

defineOptions({ name: 'LayerTreeItem' });

const props = defineProps<{
  elements: EditorElement[];
  depth: number;
  expandedGroups: Record<string, boolean>;
  dragLayerFrom?: string | null;
  dragLayerOver?: string | null;
}>();

const emit = defineEmits<{
  (e: 'moveUp', id: string): void;
  (e: 'moveDown', id: string): void;
  (e: 'rename', el: EditorElement): void;
  (e: 'ungroup'): void;
  (e: 'toggleVis', id: string): void;
  (e: 'toggleLock', id: string): void;
  (e: 'select', id: string, ev: MouseEvent): void;
  (e: 'dragStart', id: string, ev: DragEvent): void;
  (e: 'dragOver', id: string): void;
  (e: 'dragLeave', id: string): void;
  (e: 'dropItem', id: string): void;
  (e: 'dragEnd'): void;
  (e: 'toggleExpand', id: string): void;
}>();

const store = useEditorStore();

const hasChildren = (el: EditorElement) => !!(el.children && el.children.length);
const getExpanded = (id: string) => props.expandedGroups[id] !== false;

const getLayerIcon = (type: string) => {
  const icons: Record<string, string> = {
    text: 'bi bi-type',
    image: 'bi bi-image',
    decoration: 'bi bi-stars',
    border: 'bi bi-border-all',
    icon: 'bi bi-gem',
    group: 'bi bi-collection',
  };
  return icons[type] || 'bi bi-square';
};

const getElementDisplay = (el: EditorElement) => {
  const name = el.name || '';
  if (el.type === 'text') return name || el.text || '文本元素';
  if (el.type === 'image') return name || '图片元素';
  if (el.type === 'group') return name || '组合';
  if (el.type === 'decoration') return name || '装饰元素';
  if (el.type === 'border') return name || '边框元素';
  if (el.type === 'icon') return name || '图标元素';
  return name || '元素';
};

const toggleExpand = (id: string) => {
  emit('toggleExpand', id);
};

// Pass-through event handlers
const onDragStart = (id: string, e: DragEvent) => emit('dragStart', id, e);
const onDragOver = (id: string) => emit('dragOver', id);
const onDragLeave = (id: string) => emit('dragLeave', id);
const onDrop = (id: string) => emit('dropItem', id);
const onDragEnd = () => emit('dragEnd');
const onItemClick = (id: string, e: MouseEvent) => emit('select', id, e);
</script>

<style scoped>
.layer-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  gap: 4px;
  font-size: 13px;
  user-select: none;
}
.layer-item:hover { background: #f0f0f0; }
.layer-item.active { background: #e3f2fd; }
.layer-item.locked { opacity: 0.6; }
.layer-item.hidden { opacity: 0.4; }
.layer-item-child { opacity: 0.85; }
.layer-spacer { width: 14px; display: inline-block; flex-shrink: 0; }
.layer-drag-handle-placeholder { width: 14px; display: inline-block; flex-shrink: 0; }
.layer-expand { cursor: pointer; width: 14px; flex-shrink: 0; font-size: 12px; }
.layer-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.layer-actions { display: flex; gap: 2px; flex-shrink: 0; }
.layer-btn {
  background: none; border: none; cursor: pointer; padding: 2px 4px;
  font-size: 12px; color: #666; border-radius: 3px;
}
.layer-btn:hover { background: #e0e0e0; color: #333; }
.layer-drag-handle { cursor: grab; color: #999; font-size: 12px; flex-shrink: 0; }
.layer-dragging { opacity: 0.5; }
.layer-drag-over { border-top: 2px solid #0d6efd; }
</style>
