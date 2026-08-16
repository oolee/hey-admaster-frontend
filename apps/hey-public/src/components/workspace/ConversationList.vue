<script setup lang="ts">
import { computed, ref } from 'vue';

import { deleteConversation, fetchChatMessages } from '@/api';
import { useWorkspaceStore } from '@/stores/workspace';
import { prompt } from '@/utils/prompt';
import { toast } from '@/utils/toast';
import {
  ImagePlus,
  LayoutTemplate,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  PencilRuler,
  Pin,
  Plus,
  Presentation,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next';

const store = useWorkspaceStore();
const search = ref('');

/* 小屏判定 */
const isMobile = ref(false);
function updateMobile() {
  isMobile.value = window.innerWidth < 1024;
}
if (typeof window !== 'undefined') {
  updateMobile();
  window.addEventListener('resize', updateMobile);
}

const conversations = computed(() => store.conversations);

const categories = [
  { id: 'image-gen', label: '文生图', icon: ImagePlus, count: 12 },
  { id: 'image-edit', label: '改图', icon: PencilRuler, count: 4 },
  { id: 'ppt', label: 'HTML PPT', icon: Presentation, count: 3 },
  { id: 'web', label: '网页', icon: LayoutTemplate, count: 5 },
  { id: 'chat', label: '聊天', icon: MessageSquare, count: 18 },
];

const filteredConvs = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return conversations.value;
  return conversations.value.filter((c) => c.title.toLowerCase().includes(q));
});

async function selectConv(id: string) {
  store.selectConv(id);
  /* 本地临时会话（未落库）没有后端消息 */
  if (id.startsWith('local-')) return;
  /* 拉取真实消息历史（已加载过的会话跳过） */
  if (!store.messagesByConv[id]?.length) {
    try {
      const res = await fetchChatMessages(id);
      if (res.code === 0 && res.data?.list) {
        store.messagesByConv[id] = res.data.list.map((m) => ({
          id: m.id,
          role: m.role === 'user' ? ('user' as const) : ('ai' as const),
          content: m.content,
          task: m.task || undefined,
          model: m.model || undefined,
          cost: m.cost ?? undefined,
          streaming: false,
          artifact: m.artifact as never,
        }));
      }
    } catch {
      /* 后端不可用：保持空消息 */
    }
  }
  /* 小屏下点击会话后自动收起抽屉 */
  if (isMobile.value) store.closeConvPanel();
}

function newChat() {
  /* 新对话不落库：仅本地临时会话（local-*）；发送首条消息时才创建后端会话（空对话不入库） */
  const id = `local-${Date.now()}`;
  store.addConversation({
    id,
    title: '新对话',
    time: '刚刚',
    type: 'chat',
    active: false,
    preview: '新对话',
    task: 'chat',
    model: 'auto',
  });
  toast.info('新对话（发送首条消息后保存）');
  if (isMobile.value) store.closeConvPanel();
}

async function deleteConv(id: string, e: MouseEvent) {
  e.stopPropagation();
  const isLocal = id.startsWith('local-');
  /* 已落库会话删除不可恢复，需用户确认；本地临时会话（未入库）直接删除 */
  if (!isLocal) {
    const ok = await prompt.confirm({
      title: '删除会话',
      message: '删除后无法恢复，是否确认删除该会话？',
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
  }
  try {
    if (!isLocal) await deleteConversation(id);
  } catch {
    /* 后端不可用时本地删除 */
  }
  store.removeConversation(id);
  toast.info('会话已删除');
}

function togglePin(id: string, e: MouseEvent) {
  e.stopPropagation();
  /* 置顶暂未接入服务端（API 无 pinned 字段写），本地提示 */
  toast.info('置顶功能即将上线');
}

/* 面板打开状态：桌面看 collapsed，小屏看 convPanelOpen */
function togglePanel() {
  if (isMobile.value) store.toggleConvPanel();
  else store.sidebarCollapsed = !store.sidebarCollapsed;
}
</script>

<template>
  <aside
    class="conv-panel"
    :class="{
      collapsed: !isMobile && store.sidebarCollapsed,
      'mobile-open': isMobile && store.convPanelOpen,
    }"
  >
    <!-- 顶部 -->
    <div class="conv-head">
      <div v-if="!store.sidebarCollapsed || isMobile" class="conv-head-row">
        <h3>会话列表</h3>
        <div class="head-actions">
          <button
            v-if="isMobile"
            class="mini-icon-btn"
            title="关闭"
            @click="store.closeConvPanel()"
          >
            <X :size="15" />
          </button>
          <button
            v-else
            class="mini-icon-btn"
            title="收起"
            @click="store.sidebarCollapsed = true"
          >
            <PanelLeftClose :size="14" />
          </button>
        </div>
      </div>
      <button
        v-else
        class="expand-btn"
        @click="store.sidebarCollapsed = false"
        title="展开"
      >
        <PanelLeft :size="16" />
      </button>
    </div>

    <!-- 新对话 -->
    <button
      class="new-chat"
      :class="{ collapsed: !isMobile && store.sidebarCollapsed }"
      @click="newChat"
    >
      <Plus :size="!isMobile && store.sidebarCollapsed ? 18 : 14" />
      <span v-if="isMobile || !store.sidebarCollapsed">新对话</span>
    </button>

    <!-- 搜索 -->
    <div v-if="isMobile || !store.sidebarCollapsed" class="conv-search">
      <Search :size="14" />
      <input v-model="search" placeholder="搜索会话…" />
    </div>

    <div class="conv-body">
      <!-- 分类（展开态） -->
      <div v-if="isMobile || !store.sidebarCollapsed" class="conv-group">
        <p class="group-title">创意分类</p>
        <button v-for="cat in categories" :key="cat.id" class="cat-item">
          <span class="cat-icon"><component :is="cat.icon" :size="14" /></span>
          <span class="cat-label">{{ cat.label }}</span>
          <span class="cat-count">{{ cat.count }}</span>
        </button>
      </div>

      <!-- 收起态图标列（仅桌面折叠） -->
      <div v-else class="collapsed-icons">
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="collapsed-icon"
          :title="cat.label"
        >
          <component :is="cat.icon" :size="16" />
        </button>
      </div>

      <!-- 会话列表 -->
      <div v-if="isMobile || !store.sidebarCollapsed" class="conv-group">
        <p class="group-title">最近会话</p>
        <button
          v-for="c in filteredConvs"
          :key="c.id"
          class="conv-item"
          :class="{ active: store.activeConvId === c.id }"
          @click="selectConv(c.id)"
        >
          <span class="conv-icon"><MessageSquare :size="14" /></span>
          <div class="conv-meta">
            <p class="conv-title">{{ c.title }}</p>
            <p class="conv-time">{{ c.time }}</p>
          </div>
          <span class="conv-actions">
            <button
              class="mini-icon-btn xs"
              :title="c.pinned ? '取消置顶' : '置顶'"
              @click.stop="togglePin(c.id, $event)"
            >
              <Pin :size="12" :fill="c.pinned ? 'currentColor' : 'none'" />
            </button>
            <button
              class="mini-icon-btn xs"
              title="删除"
              @click.stop="deleteConv(c.id, $event)"
            >
              <Trash2 :size="12" />
            </button>
          </span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.conv-panel {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 264px;
  overflow: hidden;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  transition:
    width 0.3s var(--ease-out-expo),
    transform 0.3s var(--ease-out-expo);
}

.conv-panel.collapsed {
  width: 64px;
}

/* ---- 小屏：覆盖式抽屉 ---- */
@media (max-width: 1023px) {
  .conv-panel {
    position: fixed;
    top: var(--header-h);
    bottom: 0;
    left: 0;
    z-index: 60;
    width: 264px !important;
    box-shadow: var(--shadow-lg);
    transform: translateX(-100%);
  }

  .conv-panel.mobile-open {
    transform: translateX(0);
  }
}

.conv-head {
  padding: var(--sp-3);
  border-bottom: 1px solid var(--color-border);
}

.conv-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conv-head h3 {
  font-size: var(--text-sm);
  font-weight: 700;
}

.head-actions {
  display: flex;
  align-items: center;
}

.mini-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--color-text-3);
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.mini-icon-btn:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.mini-icon-btn.xs {
  width: 24px;
  height: 24px;
}

.mini-icon-btn.xs:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 36px;
  color: var(--color-text-2);
  border-radius: var(--r-md);
}

.expand-btn:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.new-chat {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.9rem;
  margin: var(--sp-3);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-accent);
  transition: all var(--dur-fast) ease;
}

.new-chat:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}

.new-chat.collapsed {
  height: 40px;
  padding: 0;
}

.conv-search {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.45rem 0.7rem;
  margin: 0 var(--sp-3) var(--sp-3);
  color: var(--color-text-3);
  background: var(--color-surface-2);
  border-radius: var(--r-md);
}

.conv-search input {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-text-1);
  outline: none;
  background: transparent;
  border: none;
}

.conv-body {
  flex: 1;
  padding: 0 var(--sp-2) var(--sp-3);
  overflow-y: auto;
}

.conv-group {
  margin-bottom: var(--sp-3);
}

.group-title {
  padding: var(--sp-2) var(--sp-2) 6px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
}

.cat-item {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  width: 100%;
  padding: 0.5rem var(--sp-2);
  font-size: var(--text-sm);
  color: var(--color-text-2);
  text-align: left;
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.cat-item:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.cat-icon {
  display: flex;
  width: 18px;
}

.cat-label {
  flex: 1;
}

.cat-count {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.conv-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  width: 100%;
  padding: 0.55rem 0.6rem;
  margin-bottom: 2px;
  font-size: var(--text-sm);
  color: var(--color-text-2);
  text-align: left;
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.conv-item:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.conv-item.active {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.conv-icon {
  flex-shrink: 0;
  color: var(--color-text-3);
}

.conv-item.active .conv-icon {
  color: var(--color-accent);
}

.conv-meta {
  flex: 1;
  min-width: 0;
}

.conv-title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
}

.conv-time {
  font-size: 11px;
  color: var(--color-text-3);
}

.conv-actions {
  display: flex;
  gap: 2px;
  align-items: center;
  opacity: 0;
  transition: opacity var(--dur-fast) ease;
}

.conv-item:hover .conv-actions {
  opacity: 1;
}

@media (max-width: 1023px) {
  .conv-actions {
    opacity: 1;
  }
}

.collapsed-icons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: var(--sp-2);
}

.collapsed-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 0 auto;
  color: var(--color-text-2);
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.collapsed-icon:hover {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}
</style>
