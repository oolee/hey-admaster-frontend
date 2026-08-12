<script setup lang="ts">
import type { Component } from 'vue';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useThemeStore } from '@/stores/theme';
import { useUserStore } from '@/stores/user';
import {
  ArrowRight,
  CaseSensitive,
  FlaskConical,
  LayoutGrid,
  LogOut,
  Search,
  Settings,
  Sparkles,
  User,
  Wrench,
} from 'lucide-vue-next';

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['update:open']);

const router = useRouter();
const user = useUserStore();
const theme = useThemeStore();

interface CmdItem {
  label: string;
  icon: Component;
  to?: string;
  action?: string;
}

interface CmdGroup {
  group: string;
  list: CmdItem[];
}

const query = ref('');
const activeIdx = ref(0);

const items = computed<CmdGroup[]>(() => {
  const kw = query.value.toLowerCase();
  const base = [
    {
      group: '导航',
      list: [
        { label: '首页', icon: LayoutGrid, to: '/' },
        { label: '案例展示', icon: CaseSensitive, to: '/cases' },
        { label: '服务与定价', icon: Sparkles, to: '/pricing' },
        { label: 'AI 设计工作台', icon: LayoutGrid, to: '/workspace' },
        { label: '工具箱', icon: Wrench, to: '/toolbox' },
        { label: 'AI 实验室', icon: FlaskConical, to: '/labs' },
        { label: '关于我们', icon: User, to: '/about' },
      ],
    },
    {
      group: '操作',
      list: [
        { label: '个人中心', icon: User, to: '/profile' },
        { label: '切换主题', icon: Settings, action: 'theme' },
        { label: '退出登录', icon: LogOut, action: 'logout' },
      ],
    },
  ];
  if (!kw) return base;
  return base
    .map((g) => ({
      ...g,
      list: g.list.filter((i) => i.label.toLowerCase().includes(kw)),
    }))
    .filter((g) => g.list.length);
});

const flatList = computed(() => items.value.flatMap((g) => g.list));

function run(item: CmdItem) {
  if (item.action === 'theme') {
    theme.toggleMode();
    emit('update:open', false);
    return;
  }
  if (item.action === 'logout') {
    user.logout();
    router.push('/');
    emit('update:open', false);
    return;
  }
  if (item.to) router.push(item.to);
  emit('update:open', false);
}

function onEnter() {
  const it = flatList.value[activeIdx.value];
  if (it) run(it);
}

function onKeydown(e: KeyboardEvent) {
  if (!props.open) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIdx.value = (activeIdx.value + 1) % flatList.value.length;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIdx.value =
      (activeIdx.value - 1 + flatList.value.length) % flatList.value.length;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const it = flatList.value[activeIdx.value];
    if (it) run(it);
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

watch(
  () => props.open,
  (v) => {
    if (v) {
      query.value = '';
      activeIdx.value = 0;
      document.body.style.overflow = 'hidden';
    } else document.body.style.overflow = '';
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="cmd">
      <div
        v-if="open"
        class="cmd-mask"
        @click.self="emit('update:open', false)"
      >
        <div
          class="cmd-panel"
          role="dialog"
          aria-modal="true"
          aria-label="命令面板"
        >
          <div class="cmd-input">
            <Search :size="20" />
            <input
              v-model="query"
              placeholder="输入命令或搜索页面…"
              autofocus
              @keydown.down.prevent="
                activeIdx = (activeIdx + 1) % flatList.length
              "
              @keydown.up.prevent="
                activeIdx = (activeIdx - 1 + flatList.length) % flatList.length
              "
              @keydown.enter.prevent="onEnter"
            />
            <span class="cmd-kbd">ESC</span>
          </div>

          <div class="cmd-body">
            <div v-for="group in items" :key="group.group" class="cmd-group">
              <p class="cmd-group-title">{{ group.group }}</p>
              <button
                v-for="item in group.list"
                :key="item.label"
                class="cmd-item"
                :class="{ active: flatList.indexOf(item) === activeIdx }"
                @mouseenter="activeIdx = flatList.indexOf(item)"
                @click="run(item)"
              >
                <component :is="item.icon" :size="17" />
                <span>{{ item.label }}</span>
                <ArrowRight class="cmd-arrow" :size="14" />
              </button>
            </div>
            <p v-if="!flatList.length" class="cmd-empty">没有匹配的结果</p>
          </div>

          <footer class="cmd-foot">
            <span><span class="kbd">↑↓</span> 导航</span>
            <span><span class="kbd">↵</span> 确认</span>
            <span><span class="kbd">esc</span> 关闭</span>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cmd-mask {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  justify-content: center;
  padding: 12vh 16px 16px;
  background: rgb(7 23 20 / 50%);
  backdrop-filter: blur(10px);
}

.cmd-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 600px;
  height: fit-content;
  max-height: 70vh;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-2xl);
  box-shadow: var(--shadow-lg);
}

.cmd-input {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  padding: 1.1rem 1.3rem;
  color: var(--color-text-3);
  border-bottom: 1px solid var(--color-border);
}

.cmd-input input {
  flex: 1;
  font-size: var(--text-lg);
  color: var(--color-text-1);
  background: transparent;
}

.cmd-input input::placeholder {
  color: var(--color-text-3);
}

.cmd-kbd,
.kbd {
  padding: 2px 8px;
  font-size: var(--text-xs);
  color: var(--color-text-3);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.cmd-body {
  padding: 0.8rem;
  overflow-y: auto;
}

.cmd-group {
  margin-bottom: 0.4rem;
}

.cmd-group-title {
  padding: 0.5rem 0.8rem;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.cmd-item {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  width: 100%;
  padding: 0.7rem 0.9rem;
  font-size: var(--text-sm);
  color: var(--color-text-2);
  text-align: left;
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.cmd-item.active {
  color: var(--color-text-1);
  background: var(--color-accent-soft);
}

.cmd-item.active .cmd-arrow {
  opacity: 1;
  transform: translateX(0);
}

.cmd-arrow {
  margin-left: auto;
  color: var(--color-accent);
  opacity: 0;
  transform: translateX(-4px);
  transition: all var(--dur-fast) ease;
}

.cmd-empty {
  padding: 1.5rem;
  color: var(--color-text-3);
  text-align: center;
}

.cmd-foot {
  display: flex;
  gap: 1.2rem;
  padding: 0.7rem 1.3rem;
  font-size: var(--text-xs);
  color: var(--color-text-3);
  border-top: 1px solid var(--color-border);
}

.cmd-enter-active,
.cmd-leave-active {
  transition: opacity 0.25s var(--ease-out-expo);
}

.cmd-enter-active .cmd-panel,
.cmd-leave-active .cmd-panel {
  transition: transform 0.3s var(--ease-spring);
}

.cmd-enter-from,
.cmd-leave-to {
  opacity: 0;
}

.cmd-enter-from .cmd-panel {
  transform: translateY(-20px) scale(0.97);
}

.cmd-leave-to .cmd-panel {
  transform: translateY(-20px) scale(0.97);
}
</style>
