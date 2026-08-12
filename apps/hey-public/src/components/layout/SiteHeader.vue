<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BaseButton from '@/components/ui/BaseButton.vue';
import CommandPalette from '@/components/ui/CommandPalette.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import { useUserStore } from '@/stores/user';
import {
  Bell,
  ChevronDown,
  Command,
  Menu,
  User as UserIcon,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const user = useUserStore();

const mobileOpen = ref(false);
const cmdOpen = ref(false);
const notifOpen = ref(false);
const userOpen = ref(false);

const navs = [
  { label: '首页', to: '/' },
  { label: '案例展示', to: '/cases' },
  { label: '服务与定价', to: '/pricing' },
  { label: '工具箱', to: '/toolbox' },
  { label: 'AI 实验室', to: '/labs' },
  { label: '关于我们', to: '/about' },
];

function isActive(to: string) {
  return route.path === to;
}

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    cmdOpen.value = true;
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <!-- Logo -->
      <router-link to="/" class="brand">
        <span class="brand-mark">H</span>
        <span class="brand-name">Hey&nbsp;19</span>
      </router-link>

      <!-- 主导航 -->
      <nav class="main-nav" :class="{ open: mobileOpen }">
        <router-link
          v-for="n in navs"
          :key="n.to"
          :to="n.to"
          class="nav-item"
          :class="{ active: isActive(n.to) }"
          @click="mobileOpen = false"
        >
          {{ n.label }}
        </router-link>
        <div class="mobile-cta">
          <BaseButton variant="outline" size="md" to="/auth">登录</BaseButton>
          <BaseButton variant="primary" size="md" to="/workspace">
            进入工作台
          </BaseButton>
        </div>
      </nav>

      <!-- 右侧操作 -->
      <div class="header-actions">
        <button
          class="icon-btn cmd-btn"
          aria-label="打开命令面板 (Ctrl+K)"
          @click="cmdOpen = true"
        >
          <Command :size="16" />
          <span class="cmd-hint">K</span>
        </button>

        <ThemeToggle />

        <!-- 通知 -->
        <div class="pop-wrap">
          <button
            class="icon-btn"
            aria-label="通知"
            @click="notifOpen = !notifOpen"
          >
            <Bell :size="17" />
            <span class="notif-dot"></span>
          </button>
          <Transition name="pop">
            <div v-if="notifOpen" class="pop-panel notif-panel">
              <p class="pop-title">通知</p>
              <div class="notif-item" v-for="n in 3" :key="n">
                <span class="notif-dot-sm"></span>
                <div>
                  <p class="notif-name">设计提醒 #{{ n }}</p>
                  <p class="notif-desc">你的创作任务有新进展</p>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 用户 -->
        <template v-if="user.isLoggedIn">
          <div class="pop-wrap">
            <button class="user-chip" @click="userOpen = !userOpen">
              <span class="user-avatar">{{ user.user?.avatar || 'U' }}</span>
              <span class="user-name">{{ user.user?.name || '用户' }}</span>
              <ChevronDown :size="14" class="user-caret" />
            </button>
            <Transition name="pop">
              <div v-if="userOpen" class="pop-panel user-panel">
                <router-link
                  to="/profile"
                  class="pop-link"
                  @click="userOpen = false"
                >
                  <UserIcon :size="15" /> 个人中心
                </router-link>
                <router-link
                  to="/workspace"
                  class="pop-link"
                  @click="userOpen = false"
                >
                  <Command :size="15" /> AI 工作台
                </router-link>
                <button
                  class="pop-link pop-danger"
                  @click="
                    user.logout();
                    userOpen = false;
                  "
                >
                  退出登录
                </button>
              </div>
            </Transition>
          </div>
        </template>
        <template v-else>
          <div class="auth-btns">
            <BaseButton variant="outline" size="sm" to="/auth">登录</BaseButton>
            <BaseButton variant="primary" size="sm" to="/workspace">
              开始创作
            </BaseButton>
          </div>
        </template>

        <!-- 移动端菜单按钮 -->
        <button
          class="icon-btn burger"
          aria-label="菜单"
          @click="mobileOpen = !mobileOpen"
        >
          <Menu :size="20" />
        </button>
      </div>
    </div>

    <CommandPalette v-model:open="cmdOpen" />
  </header>
</template>

<style scoped>
.site-header {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 100;
  height: var(--header-h);
  background: color-mix(in srgb, var(--color-bg) 78%, transparent);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(18px);
}

.header-inner {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.brand {
  display: flex;
  flex-shrink: 0;
  gap: 0.5rem;
  align-items: center;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: 12px;
  box-shadow: var(--shadow-accent);
}

.brand-name {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text-1);
  letter-spacing: -0.02em;
}

.main-nav {
  display: none;
  gap: 0.2rem;
  align-items: center;
}

.nav-item {
  position: relative;
  padding: 0.5rem 0.9rem;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-2);
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.nav-item:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.nav-item.active {
  font-weight: 600;
  color: var(--color-text-1);
}

.nav-item.active::after {
  position: absolute;
  right: 0.9rem;
  bottom: 0.1rem;
  left: 0.9rem;
  height: 2px;
  content: '';
  background: var(--color-accent);
  border-radius: 2px;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.icon-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.icon-btn:hover {
  color: var(--color-text-1);
  border-color: var(--color-border-strong);
  transform: translateY(-1px);
}

.cmd-btn .cmd-hint {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 1px 4px;
  font-size: 8px;
  font-weight: 700;
  color: var(--color-text-3);
  background: var(--color-surface-3);
  border-radius: 4px;
}

.notif-dot {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 7px;
  height: 7px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: breathe 2s ease-in-out infinite;
}

.pop-wrap {
  position: relative;
}

.pop-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 50;
  min-width: 260px;
  padding: 0.8rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-lg);
}

.pop-title {
  padding: 0.4rem 0.6rem 0.8rem;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-1);
}

.notif-item {
  display: flex;
  gap: 0.7rem;
  padding: 0.6rem;
  border-radius: var(--r-md);
  transition: background var(--dur-fast) ease;
}

.notif-item:hover {
  background: var(--color-surface-2);
}

.notif-dot-sm {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 6px;
  background: var(--color-accent);
  border-radius: 50%;
}

.notif-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-1);
}

.notif-desc {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.user-chip {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.3rem 0.7rem 0.3rem 0.3rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.user-chip:hover {
  border-color: var(--color-border-strong);
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-inverse);
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  border-radius: 50%;
}

.user-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-1);
}

.user-caret {
  color: var(--color-text-3);
}

.user-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 180px;
}

.pop-link {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  padding: 0.6rem 0.7rem;
  font-size: var(--text-sm);
  color: var(--color-text-2);
  text-align: left;
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.pop-link:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.pop-danger {
  color: var(--color-error);
}

.pop-danger:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.burger {
  display: flex;
}

@media (min-width: 1024px) {
  .main-nav {
    display: flex;
  }

  .burger {
    display: none;
  }

  .mobile-cta {
    display: none;
  }
}

@media (max-width: 1023px) {
  .user-name,
  .cmd-btn {
    display: none;
  }

  .brand-name {
    display: none;
  }

  .auth-btns {
    display: none;
  }

  .main-nav {
    position: fixed;
    top: var(--header-h);
    right: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    max-height: calc(100vh - var(--header-h));
    padding: 1rem;
    overflow-y: auto;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    transform: translateY(-120%);
    transition: transform 0.35s var(--ease-out-expo);
  }

  .main-nav.open {
    transform: translateY(0);
  }

  .nav-item {
    padding: 0.8rem 1rem;
    font-size: var(--text-base);
  }

  .nav-item.active::after {
    display: none;
  }

  .nav-item.active {
    background: var(--color-accent-soft);
  }

  .mobile-cta {
    display: flex;
    gap: 0.6rem;
    padding: 0.8rem 0 0.4rem;
  }

  .mobile-cta .btn {
    flex: 1;
  }
}

.pop-enter-active,
.pop-leave-active {
  transition: all 0.2s var(--ease-out-expo);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}
</style>
