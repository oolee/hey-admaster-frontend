<script setup lang="ts">
import { computed, ref } from 'vue';

import { useAiDesignStore } from '#/store/aiDesignStore';

defineProps<{
  collapsed: boolean;
}>();

const emit = defineEmits<{
  deleteSession: [id: string];
  newSession: [];
  selectSession: [id: string];
  toggle: [];
}>();

const store = useAiDesignStore();

const searchQuery = ref('');
const showRecentPopover = ref(false);

const filteredSessions = computed(() => {
  if (!searchQuery.value.trim()) return store.sessions;
  const q = searchQuery.value.trim().toLowerCase();
  return store.sessions.filter((s) => s.title.toLowerCase().includes(q));
});

const recentSessions = computed(() => store.sessions.slice(0, 8));

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function selectAndClose(id: string) {
  emit('selectSession', id);
  showRecentPopover.value = false;
}
</script>

<template>
  <aside class="ai-sidebar" :class="{ collapsed }">
    <!-- Top bar: brand + collapse toggle -->
    <div class="sidebar-top">
      <div class="sidebar-brand" :class="{ compact: collapsed }">
        <div class="brand-mark">H</div>
        <span v-show="!collapsed" class="brand-name">Hey AI 创作</span>
      </div>
      <button
        class="sidebar-collapse"
        @click="emit('toggle')"
        :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
      >
        <svg
          class="collapse-icon"
          :class="{ rotated: collapsed }"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline v-if="!collapsed" points="15 18 9 12 15 6" />
          <polyline v-else points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>

    <!-- Collapsed rail: 3 icon buttons -->
    <div v-if="collapsed" class="rail-actions">
      <button class="rail-btn" title="新对话" @click="emit('newSession')">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button class="rail-btn" title="搜索对话" @click="emit('toggle')">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </button>
      <div class="rail-btn-wrap">
        <button
          class="rail-btn"
          :class="{ active: showRecentPopover }"
          title="最近对话"
          @click="showRecentPopover = !showRecentPopover"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
            />
          </svg>
        </button>
        <!-- Recent popover -->
        <div v-if="showRecentPopover" class="recent-popover">
          <div class="recent-popover-title">最近对话</div>
          <div v-if="recentSessions.length === 0" class="recent-popover-empty">
            暂无对话
          </div>
          <button
            v-for="s in recentSessions"
            :key="s.id"
            class="recent-popover-item"
            :class="{ active: s.id === store.activeSessionId }"
            @click="selectAndClose(s.id)"
          >
            <span class="recent-popover-title-text">{{ s.title }}</span>
            <span class="recent-popover-time">{{
              timeLabel(s.updatedAt)
            }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Expanded body -->
    <div v-show="!collapsed" class="sidebar-body">
      <!-- New chat -->
      <button class="new-chat-btn" @click="emit('newSession')">
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>新对话</span>
      </button>

      <!-- Search -->
      <div class="sidebar-search">
        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="搜索对话记录..."
        />
        <button
          v-if="searchQuery"
          class="search-clear"
          @click="searchQuery = ''"
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Sessions -->
      <div class="sessions-scroll">
        <div class="sessions">
          <div class="sessions-title">
            {{
              searchQuery ? `搜索结果 (${filteredSessions.length})` : '对话记录'
            }}
          </div>
          <div
            v-if="filteredSessions.length === 0 && store.sessions.length > 0"
            class="sessions-empty"
          >
            未找到匹配的对话
          </div>
          <div v-else-if="store.sessions.length === 0" class="sessions-empty">
            暂无对话，点击「新对话」开始创作
          </div>
          <button
            v-for="s in filteredSessions"
            :key="s.id"
            class="session-item"
            :class="{ active: s.id === store.activeSessionId }"
            @click="emit('selectSession', s.id)"
          >
            <svg
              class="session-icon"
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              />
            </svg>
            <span class="session-meta">
              <span class="session-title">{{ s.title }}</span>
              <span class="session-time">{{ timeLabel(s.updatedAt) }}</span>
            </span>
            <span
              class="session-delete"
              title="删除对话"
              @click.stop="emit('deleteSession', s.id)"
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.ai-sidebar {
  position: fixed;
  top: 60px;
  bottom: 0;
  left: 0;
  z-index: 40;
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 264px;
  overflow: hidden;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  box-shadow: 4px 0 32px rgb(0 0 0 / 6%);
  transition:
    width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.28s ease;
}

:global(.dark) .ai-sidebar {
  box-shadow: 4px 0 32px rgb(0 0 0 / 28%);
}

.ai-sidebar.collapsed {
  width: 60px;
}

/* ── Top bar ── */
.sidebar-top {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 8px 0 14px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-brand {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.sidebar-brand.compact {
  gap: 0;
}

.brand-mark {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--color-bg-primary);
  background: var(--color-neon);
  border-radius: 8px;
}

.brand-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.sidebar-collapse {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--color-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 8px;
  transition: all 0.2s;
}

.sidebar-collapse:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.collapse-icon {
  flex-shrink: 0;
  transition: transform 0.22s;
}

.collapse-icon.rotated {
  transform: rotate(180deg);
}

/* ── Rail actions (collapsed) ── */
.rail-actions {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  padding: 12px 0;
}

.rail-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 10px;
  transition: all 0.2s;
}

.rail-btn:hover,
.rail-btn.active {
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.rail-btn-wrap {
  position: relative;
}

/* Recent popover */
.recent-popover {
  position: absolute;
  top: 0;
  left: 48px;
  z-index: 100;
  width: 240px;
  max-height: 360px;
  padding: 8px;
  overflow-y: auto;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgb(0 0 0 / 24%);
  backdrop-filter: blur(16px);
}

.recent-popover::-webkit-scrollbar {
  width: 4px;
}

.recent-popover::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.recent-popover-title {
  padding: 6px 8px;
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
}

.recent-popover-empty {
  padding: 12px 8px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.recent-popover-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 8px;
  transition: all 0.15s;
}

.recent-popover-item:hover,
.recent-popover-item.active {
  color: var(--color-text-primary);
  background: var(--color-neon-glow);
}

.recent-popover-title-text {
  flex: 1;
  margin-right: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-popover-time {
  flex-shrink: 0;
  font-size: 0.62rem;
  color: var(--color-text-muted);
}

/* ── Expanded body ── */
.sidebar-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 0 10px;
  overflow: hidden;
}

/* New chat */
.new-chat-btn {
  position: relative;
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px;
  margin: 10px 0;
  overflow: hidden;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-primary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 11px;
  transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.new-chat-btn::before {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(135deg, var(--color-neon) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.22s;
}

.new-chat-btn:hover {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
  box-shadow: 0 6px 18px var(--color-neon-glow);
  transform: translateY(-1px);
}

.new-chat-btn:hover::before {
  opacity: 0.08;
}

.new-chat-btn:active {
  transform: translateY(0);
}

/* Search */
.sidebar-search {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  margin-bottom: 8px;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 34px;
  padding: 0 30px 0 32px;
  font-size: 0.75rem;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--color-neon-dim);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.search-clear {
  position: absolute;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--color-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 4px;
  transition: all 0.2s;
}

.search-clear:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
}

/* Sessions scroll area */
.sessions-scroll {
  flex: 1;
  overflow-y: auto;
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 12px,
    #000 calc(100% - 12px),
    transparent 100%
  );
}

.sessions-scroll::-webkit-scrollbar {
  width: 3px;
}

.sessions-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sessions-scroll::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
  transition: background 0.2s;
}

.sessions-scroll:hover::-webkit-scrollbar-thumb {
  background: var(--color-neon-dim);
}

.sessions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sessions-title {
  padding: 6px 8px 4px;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
}

.sessions-empty {
  padding: 10px 8px;
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.session-item {
  position: relative;
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 8px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 8px;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.session-item::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 3px;
  height: 60%;
  content: '';
  background: var(--color-neon);
  border-radius: 0 3px 3px 0;
  transform: translateY(-50%) scaleY(0);
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.session-item:hover {
  background: var(--color-bg-card);
  transform: translateX(2px);
}

.session-item.active {
  color: var(--color-text-primary);
  background: var(--color-neon-glow);
}

.session-item.active::before {
  transform: translateY(-50%) scaleY(1);
}

.session-icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.session-item.active .session-icon {
  color: var(--color-neon);
}

.session-meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.session-title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.78rem;
  font-weight: 500;
  white-space: nowrap;
}

.session-time {
  font-size: 0.62rem;
  color: var(--color-text-muted);
}

.session-delete {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--color-text-muted);
  border-radius: 6px;
  opacity: 0;
  transition: all 0.15s;
}

.session-item:hover .session-delete,
.session-item.active .session-delete {
  opacity: 1;
}

.session-delete:hover {
  color: #f55;
  background: rgb(255 85 85 / 10%);
}
</style>
