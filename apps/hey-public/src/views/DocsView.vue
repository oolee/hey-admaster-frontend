<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';

import { request } from '@/api/request';

interface DocsNode {
  type: 'dir' | 'file';
  name: string;
  path: string;
  children?: DocsNode[];
}

interface DocsContent {
  path: string;
  title: string;
  content: string;
  html: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const tree = ref<DocsNode[]>([]);
const content = ref<DocsContent | null>(null);
const toc = ref<TocItem[]>([]);
const loading = ref(false);
const error = ref('');
const activePath = ref('');
const expanded = ref<Set<string>>(new Set());

async function loadTree() {
  try {
    const raw = await request<any>('/docs/tree');
    tree.value = raw?.result ?? raw ?? [];
    // 默认展开第一层目录
    tree.value.filter((n) => n.type === 'dir').forEach((n) => expanded.value.add(n.path));
    // 默认打开第一篇文档
    const first = firstDoc(tree.value);
    if (first) await openDoc(first.path);
  } catch (error) {
    error.value = error instanceof Error ? error.message : '加载文档目录失败';
  }
}

function firstDoc(nodes: DocsNode[]): DocsNode | null {
  for (const n of nodes) {
    if (n.type === 'file') return n;
    if (n.children) {
      const f = firstDoc(n.children);
      if (f) return f;
    }
  }
  return null;
}

function toggleDir(node: DocsNode) {
  if (expanded.value.has(node.path)) expanded.value.delete(node.path);
  else expanded.value.add(node.path);
}

async function openDoc(path: string) {
  loading.value = true;
  error.value = '';
  activePath.value = path;
  try {
    content.value = (await request<any>(
      `/docs/content?path=${encodeURIComponent(path)}`,
    ))?.result ?? null;
    await nextTick();
    buildToc();
    highlightCode();
  } catch (error) {
    error.value = error instanceof Error ? error.message : '加载文档失败';
  } finally {
    loading.value = false;
  }
}

function buildToc() {
  const container = document.querySelector('.docs-content');
  toc.value = [];
  if (!container) return;
  container.querySelectorAll('h1, h2, h3').forEach((h, i) => {
    const id = h.id || `md-h-${i}`;
    h.id = id;
    toc.value.push({
      id,
      text: h.textContent?.trim() || '',
      level: Number(h.tagName.slice(1)),
    });
  });
}

function highlightCode() {
  const w = window as any;
  if (w.hljs) {
    w.hljs.highlightAll();
    return;
  }
  // 动态加载 highlight.js（CDN，避免前端依赖安装）
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css';
  document.head.append(link);
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/highlight.js@11/lib/highlight.min.js';
  script.onload = () => w.hljs?.highlightAll();
  document.head.append(script);
}

const crumbs = computed(() => {
  if (!content.value) return [];
  return content.value.path.split('/');
});

onMounted(loadTree);
</script>

<template>
  <div class="docs-shell">
    <!-- 左侧文档树 -->
    <aside class="docs-sidebar">
      <div class="docs-sidebar-title">文档</div>
      <div v-if="!tree.length" class="docs-empty">加载中…</div>
      <ul class="docs-tree">
        <template v-for="node in tree" :key="node.path">
          <li v-if="node.type === 'dir'" class="tree-dir">
            <button class="tree-dir-btn" @click="toggleDir(node)">
              <span class="tree-arrow">{{ expanded.has(node.path) ? '▾' : '▸' }}</span>
              {{ node.name }}
            </button>
            <ul v-if="expanded.has(node.path)" class="tree-children">
              <template v-for="child in node.children" :key="child.path">
                <li v-if="child.type === 'file'" class="tree-file">
                  <button
                    class="tree-file-btn"
                    :class="{ active: activePath === child.path }"
                    @click="openDoc(child.path)"
                  >
                    {{ child.name }}
                  </button>
                </li>
                <li v-else class="tree-dir">
                  <button class="tree-dir-btn" @click="toggleDir(child)">
                    <span class="tree-arrow">{{
                      expanded.has(child.path) ? '▾' : '▸'
                    }}</span>
                    {{ child.name }}
                  </button>
                  <ul v-if="expanded.has(child.path)" class="tree-children">
                    <li
                      v-for="leaf in child.children"
                      :key="leaf.path"
                      class="tree-file"
                    >
                      <button
                        v-if="leaf.type === 'file'"
                        class="tree-file-btn"
                        :class="{ active: activePath === leaf.path }"
                        @click="openDoc(leaf.path)"
                      >
                        {{ leaf.name }}
                      </button>
                    </li>
                  </ul>
                </li>
              </template>
            </ul>
          </li>
          <li v-else class="tree-file">
            <button
              class="tree-file-btn"
              :class="{ active: activePath === node.path }"
              @click="openDoc(node.path)"
            >
              {{ node.name }}
            </button>
          </li>
        </template>
      </ul>
    </aside>

    <!-- 中间内容 -->
    <main class="docs-main">
      <div v-if="crumbs.length" class="docs-crumbs">
        <span v-for="(c, i) in crumbs" :key="i">
          {{ c }}<span v-if="i < crumbs.length - 1"> / </span>
        </span>
      </div>
      <div v-if="loading" class="docs-loading">加载中…</div>
      <div v-else-if="error" class="docs-error">{{ error }}</div>
      <div v-else-if="content" class="docs-content" v-html="content.html"></div>
      <div v-else class="docs-empty">从左侧选择文档</div>
    </main>

    <!-- 右侧目录（单文档子目录） -->
    <aside class="docs-toc">
      <div class="docs-toc-title">本页</div>
      <nav v-if="toc.length">
        <a
          v-for="t in toc"
          :key="t.id"
          :href="`#${t.id}`"
          :style="{ paddingLeft: `${(t.level - 1) * 12}px` }"
        >
          {{ t.text }}
        </a>
      </nav>
      <div v-else class="docs-empty">—</div>
    </aside>
  </div>
</template>

<style scoped>
.docs-shell {
  display: grid;
  grid-template-columns: 260px 1fr 220px;
  min-height: calc(100vh - var(--header-height, 64px));
  max-width: 1400px;
  margin: 0 auto;
  gap: 0;
}

/* 侧栏与目录：玻璃卡片 */
.docs-sidebar,
.docs-toc {
  position: sticky;
  top: calc(var(--header-height, 64px) + 16px);
  align-self: start;
  max-height: calc(100vh - var(--header-height, 64px) - 32px);
  overflow-y: auto;
  padding: 1.25rem;
  margin: 1rem;
  border-radius: var(--radius-lg, 16px);
  background: var(--glass-bg, rgba(15, 46, 44, 0.55));
  border: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
}

.docs-sidebar-title,
.docs-toc-title {
  margin-bottom: 0.75rem;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-3);
}

.docs-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tree-children {
  list-style: none;
  margin: 0;
  padding-left: 0.85rem;
}

.tree-dir-btn,
.tree-file-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: none;
  background: none;
  color: var(--color-text-2);
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-sm, 6px);
}

.tree-dir-btn:hover,
.tree-file-btn:hover {
  color: var(--color-accent, #2fe6c8);
  background: rgba(255, 255, 255, 0.04);
}

.tree-file-btn.active {
  color: var(--color-accent, #2fe6c8);
  background: rgba(47, 230, 200, 0.1);
}

.tree-arrow {
  font-size: 0.7rem;
  opacity: 0.7;
}

/* 主内容 */
.docs-main {
  padding: 1.5rem 2rem;
  min-width: 0;
}

.docs-crumbs {
  margin-bottom: 1rem;
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.docs-content {
  line-height: 1.75;
  color: var(--color-text-1);
}

.docs-loading,
.docs-empty,
.docs-error {
  padding: 2rem;
  color: var(--color-text-3);
  text-align: center;
}

.docs-error {
  color: var(--color-danger, #ff6b6b);
}

/* 文档内排版（v-html 内容） */
.docs-content :deep(h1),
.docs-content :deep(h2),
.docs-content :deep(h3) {
  margin: 1.5em 0 0.6em;
  line-height: 1.3;
  color: var(--color-text-1);
  scroll-margin-top: calc(var(--header-height, 64px) + 16px);
}

.docs-content :deep(h1) {
  font-size: 1.8rem;
}
.docs-content :deep(h2) {
  font-size: 1.4rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.3em;
}
.docs-content :deep(h3) {
  font-size: 1.15rem;
}

.docs-content :deep(p) {
  margin: 0.8em 0;
}

.docs-content :deep(a) {
  color: var(--color-accent, #2fe6c8);
}

.docs-content :deep(code) {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.9em;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.15em 0.4em;
  border-radius: 4px;
}

.docs-content :deep(pre) {
  padding: 1rem;
  border-radius: var(--radius-md, 10px);
  background: #0d1117;
  overflow-x: auto;
  margin: 1em 0;
}

.docs-content :deep(pre code) {
  background: none;
  padding: 0;
  color: #e6edf3;
}

.docs-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}
.docs-content :deep(th),
.docs-content :deep(td) {
  border: 1px solid var(--color-border);
  padding: 0.5em 0.75em;
  text-align: left;
}
.docs-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 3px solid var(--color-accent, #2fe6c8);
  background: rgba(255, 255, 255, 0.03);
}

/* 右侧目录 */
.docs-toc a {
  display: block;
  padding: 0.3rem 0;
  font-size: var(--text-sm);
  color: var(--color-text-2);
  text-decoration: none;
}
.docs-toc a:hover {
  color: var(--color-accent, #2fe6c8);
}

@media (max-width: 1024px) {
  .docs-shell {
    grid-template-columns: 220px 1fr;
  }
  .docs-toc {
    display: none;
  }
}
@media (max-width: 768px) {
  .docs-shell {
    grid-template-columns: 1fr;
  }
  .docs-sidebar {
    position: static;
    max-height: none;
  }
}
</style>
