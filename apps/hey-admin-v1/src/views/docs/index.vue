<script setup lang="ts">
import type { DocsContentDto, DocsNodeDto } from '#/api/docs';

import { computed, onMounted, ref } from 'vue';

import { Button, Input, message, Modal, Tag } from 'ant-design-vue';

import { useDocsApi } from '#/api/docs';

defineOptions({ name: 'DocsManagement' });

const { getTree, getContent, saveContent, move } = useDocsApi();

const tree = ref<DocsNodeDto[]>([]);
const current = ref<DocsContentDto | null>(null);
const editing = ref('');
const loading = ref(false);
const saving = ref(false);
const expanded = ref<Set<string>>(new Set());
const moveVisible = ref(false);
const moveTarget = ref('');

async function loadTree() {
  try {
    tree.value = (await getTree()) ?? [];
    tree.value
      .filter((n) => n.type === 'dir')
      .forEach((n) => expanded.value.add(n.path));
  } catch {
    message.error('加载文档目录失败');
  }
}

function toggleDir(node: DocsNodeDto) {
  if (expanded.value.has(node.path)) expanded.value.delete(node.path);
  else expanded.value.add(node.path);
}

async function openDoc(path: string) {
  loading.value = true;
  try {
    current.value = await getContent(path);
    editing.value = current.value?.content ?? '';
  } catch {
    message.error('加载文档失败');
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!current.value) return;
  saving.value = true;
  try {
    await saveContent(current.value.path, editing.value);
    message.success('已保存');
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

function openMove() {
  if (!current.value) return;
  moveTarget.value = current.value.path;
  moveVisible.value = true;
}

async function doMove() {
  if (!current.value || !moveTarget.value) return;
  try {
    await move(current.value.path, moveTarget.value);
    message.success('已移动');
    moveVisible.value = false;
    await loadTree();
    await openDoc(moveTarget.value);
  } catch {
    message.error('移动失败');
  }
}

const dirty = computed(() => current.value?.content !== editing.value);

onMounted(loadTree);
</script>

<template>
  <div class="docs-admin">
    <!-- 左侧文档树 -->
    <aside class="docs-tree-panel">
      <div class="panel-title">文档目录</div>
      <ul class="tree">
        <template v-for="node in tree" :key="node.path">
          <li v-if="node.type === 'dir'" class="dir">
            <button class="dir-btn" @click="toggleDir(node)">
              <span>{{ expanded.has(node.path) ? '▾' : '▸' }}</span>
              {{ node.name }}
            </button>
            <ul v-if="expanded.has(node.path)" class="children">
              <li v-for="child in node.children" :key="child.path" class="file">
                <button
                  v-if="child.type === 'file'"
                  class="file-btn"
                  :class="{ active: current?.path === child.path }"
                  @click="openDoc(child.path)"
                >
                  {{ child.name }}
                </button>
              </li>
            </ul>
          </li>
          <li v-else class="file">
            <button
              class="file-btn"
              :class="{ active: current?.path === node.path }"
              @click="openDoc(node.path)"
            >
              {{ node.name }}
            </button>
          </li>
        </template>
      </ul>
    </aside>

    <!-- 右侧编辑器 -->
    <main class="docs-editor">
      <div class="toolbar">
        <div class="toolbar-title">
          {{ current?.title ?? '未选择文档' }}
          <Tag v-if="current" color="cyan">{{ current.path }}</Tag>
        </div>
        <div class="toolbar-actions">
          <Button :disabled="!current" @click="openMove">移动</Button>
          <Button
            type="primary"
            :loading="saving"
            :disabled="!current || !dirty"
            @click="save"
          >
            保存
          </Button>
        </div>
      </div>

      <div v-if="loading" class="hint">加载中…</div>
      <div v-else-if="!current" class="hint">从左侧选择文档进行编辑</div>
      <Input.TextArea
        v-else
        v-model:value="editing"
        class="editor"
        :auto-size="false"
        spellcheck="false"
      />
    </main>

    <!-- 移动弹窗 -->
    <Modal
      v-model:open="moveVisible"
      title="移动文档"
      ok-text="移动"
      cancel-text="取消"
      @ok="doMove"
    >
      <p style="margin-bottom: 8px">目标路径（相对 docs 根，需以 .md 结尾）：</p>
      <Input v-model:value="moveTarget" placeholder="如 guides/xxx.md" />
    </Modal>
  </div>
</template>

<style scoped>
.docs-admin {
  display: grid;
  grid-template-columns: 280px 1fr;
  height: 100%;
  min-height: calc(100vh - 120px);
}

.docs-tree-panel {
  border-right: 1px solid var(--ant-color-border);
  padding: 16px;
  overflow-y: auto;
}

.panel-title {
  font-weight: 600;
  margin-bottom: 12px;
}

.tree,
.children {
  list-style: none;
  margin: 0;
  padding: 0;
}

.children {
  padding-left: 18px;
}

.dir-btn,
.file-btn {
  display: flex;
  gap: 4px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  border-radius: 6px;
  color: var(--ant-color-text);
}

.dir-btn:hover,
.file-btn:hover {
  background: var(--ant-color-fill-tertiary);
}

.file-btn.active {
  color: var(--ant-color-primary);
  background: var(--ant-color-primary-bg);
}

.docs-editor {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ant-color-border);
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.hint {
  padding: 40px;
  text-align: center;
  color: var(--ant-color-text-secondary);
}

.editor {
  flex: 1;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
}
</style>
