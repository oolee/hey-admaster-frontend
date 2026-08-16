<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, Users, ShoppingCart, Coins, Cpu, BarChart3, FolderOpen,
  LayoutGrid, ShieldCheck, Settings, LogOut, ChevronDown, PanelLeftClose,
  PanelLeft, Bell, Search, ChevronRight, History, Sparkles
} from 'lucide-vue-next'
import ThemeToggle from '@admin-demo/admin-layout/ThemeToggle.vue'
import { useAdminStore } from '@admin-demo/stores/admin'
import { toast } from '@admin-demo/utils/toast'

const route = useRoute()
const router = useRouter()
const admin = useAdminStore()

const collapsed = ref(false)
const mobileOpen = ref(false)
const userMenuOpen = ref(false)

function onDocClick() { userMenuOpen.value = false }
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

const groups = [
  { label: '总览', items: [ { path: '/admin-demo/dashboard', label: '数据看板', icon: LayoutDashboard } ] },
  { label: '经营', items: [
    { path: '/admin-demo/users', label: '用户管理', icon: Users },
    { path: '/admin-demo/orders', label: '订单管理', icon: ShoppingCart },
    { path: '/admin-demo/credits', label: '积分与计费', icon: Coins }
  ] },
  { label: '模型', items: [
    { path: '/admin-demo/models', label: '模型管理', icon: Cpu },
    { path: '/admin-demo/skills', label: '技能管理', icon: Sparkles },
    { path: '/admin-demo/usage', label: '用量与利润', icon: BarChart3 },
    { path: '/admin-demo/records', label: '调用记录', icon: History }
  ] },
  { label: '内容', items: [
    { path: '/admin-demo/cases', label: '案例管理', icon: FolderOpen },
    { path: '/admin-demo/templates', label: '模板管理', icon: LayoutGrid }
  ] },
  { label: '审核', items: [ { path: '/admin-demo/audit', label: '内容审核', icon: ShieldCheck } ] },
  { label: '系统', items: [ { path: '/admin-demo/settings', label: '系统设置', icon: Settings } ] }
]

const currentTitle = computed(() => route.meta.title || '后台管理')
const notifCount = 3

function logout() {
  admin.logout()
  toast.success('已退出登录')
  router.push('/workspace')
}
</script>

<template>
  <div class="al-shell" :class="{ collapsed }">
    <!-- 侧边栏 -->
    <aside class="al-side" :class="{ 'mobile-open': mobileOpen }">
      <div class="al-logo">
        <span class="al-logo-mark">H</span>
        <span v-if="!collapsed" class="al-logo-name">Hey 19 Admin</span>
      </div>

      <nav class="al-nav">
        <div v-for="g in groups" :key="g.label" class="al-group">
          <p v-if="!collapsed" class="al-group-label">{{ g.label }}</p>
          <router-link
            v-for="item in g.items"
            :key="item.path"
            :to="item.path"
            class="al-item"
            :class="{ active: route.path === item.path }"
            :title="collapsed ? item.label : ''"
            @click="mobileOpen = false"
          >
            <item.icon :size="17" />
            <span v-if="!collapsed" class="al-item-label">{{ item.label }}</span>
          </router-link>
        </div>
      </nav>

      <div class="al-side-foot">
        <button class="al-item" @click="logout" :title="collapsed ? '退出登录' : ''">
          <LogOut :size="17" />
          <span v-if="!collapsed" class="al-item-label">退出登录</span>
        </button>
      </div>
    </aside>

    <!-- 移动端遮罩 -->
    <div v-if="mobileOpen" class="al-mask" @click="mobileOpen = false"></div>

    <!-- 主区域 -->
    <div class="al-main">
      <!-- 顶栏 -->
      <header class="al-top">
        <div class="al-top-left">
          <button class="al-icon-btn" @click="collapsed = !collapsed" :title="collapsed ? '展开' : '收起'">
            <PanelLeftClose v-if="!collapsed" :size="17" />
            <PanelLeft v-else :size="17" />
          </button>
          <button class="al-icon-btn mobile-only" @click="mobileOpen = true">
            <PanelLeft :size="17" />
          </button>
          <div class="al-breadcrumb">
            <span class="al-crumb">{{ route.meta.group }}</span>
            <ChevronRight :size="13" class="al-crumb-chev" />
            <span class="al-crumb-current">{{ currentTitle }}</span>
          </div>
        </div>
        <div class="al-top-right">
          <div class="al-search">
            <Search :size="15" />
            <input placeholder="搜索…" />
          </div>
          <ThemeToggle />
          <button class="al-icon-btn pos-rel" title="通知">
            <Bell :size="17" />
            <span v-if="notifCount" class="al-dot">{{ notifCount }}</span>
          </button>
          <div class="al-user-wrap">
            <button class="al-user" @click="userMenuOpen = !userMenuOpen">
              <span class="al-avatar">{{ admin.admin?.avatar || 'A' }}</span>
              <span class="al-user-info">
                <span class="al-user-name">{{ admin.admin?.name || '管理员' }}</span>
                <span class="al-user-role">{{ admin.admin?.role || '管理员' }}</span>
              </span>
              <ChevronDown :size="14" />
            </button>
            <Transition name="pop">
              <div v-if="userMenuOpen" class="al-user-menu" @click.stop>
                <div class="al-um-head">
                  <span class="al-um-avatar">{{ admin.admin?.avatar || 'A' }}</span>
                  <div>
                    <p class="al-um-name">{{ admin.admin?.name || '管理员' }}</p>
                    <p class="al-um-mail">{{ admin.admin?.email || '' }}</p>
                  </div>
                </div>
                <button class="al-um-item" @click="router.push('/settings')">
                  <Settings :size="15" /> 个人设置
                </button>
                <button class="al-um-item danger" @click="logout">
                  <LogOut :size="15" /> 退出登录
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <!-- 内容 -->
      <main class="al-content">
        <router-view v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.al-shell {
  /* AdminDemo 自包含设计令牌（warm 亮色），避免依赖宿主主题变量 */
  --color-bg: #faf6ee; --color-bg-deep: #fdfbf7; --color-surface: #ffffff;
  --color-surface-2: #f3ecdf; --color-surface-3: #e5dac6;
  --color-border: rgba(31, 42, 38, 0.10); --color-border-strong: rgba(31, 42, 38, 0.22);
  --color-text-1: #0f2e2c; --color-text-2: #4d5f59; --color-text-3: #8a9992;
  --color-text-inverse: #fdfbf7; --color-accent: #ff6b35; --color-accent-hover: #e85320;
  --color-accent-soft: #fff3ee; --color-ai: #7c5cff; --color-ai-soft: rgba(124, 92, 255, 0.10);
  --color-success: #2e9e5b; --color-warning: #f5a623; --color-error: #d64545; --color-info: #3d7bd9;
  --shadow-lg: 0 20px 48px rgba(15, 46, 44, 0.16); --shadow-accent: 0 8px 24px rgba(255, 107, 53, 0.30);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1); --dur-fast: 150ms;
  --font-display: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  --text-xs: 0.75rem; --text-sm: 0.875rem; --text-base: 1rem;
  --header-h: 72px; --r-md: 0.75rem; --r-full: 9999px; --r-lg: 1.125rem; --r-xl: 1.5rem;
  display: flex; min-height: 100vh; background: var(--color-bg);
}

/* 侧边栏 */
.al-side {
  width: 232px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  position: fixed;
  top: 0; bottom: 0; left: 0;
  z-index: 40;
  transition: width 0.25s var(--ease-out-expo);
}
.al-shell.collapsed .al-side { width: 64px; }

.al-logo {
  display: flex; align-items: center; gap: 10px;
  height: var(--header-h);
  padding: 0 18px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.al-logo-mark {
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  border-radius: 10px;
  flex-shrink: 0;
}
.al-logo-name { font-family: var(--font-display); font-weight: 700; font-size: var(--text-base); color: var(--color-text-1); white-space: nowrap; }

.al-nav { flex: 1; overflow-y: auto; padding: 10px 10px 20px; }
.al-group { margin-bottom: 4px; }
.al-group-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--color-text-3);
  padding: 12px 10px 6px;
  white-space: nowrap;
}
.al-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px;
  margin-bottom: 2px;
  border-radius: 10px;
  color: var(--color-text-2);
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  transition: all var(--dur-fast) ease;
  text-decoration: none;
}
.al-item:hover { background: var(--color-surface-2); color: var(--color-text-1); }
.al-item.active { background: var(--color-accent-soft); color: var(--color-accent); font-weight: 600; }
.al-item-label { overflow: hidden; text-overflow: ellipsis; }
.al-side-foot { border-top: 1px solid var(--color-border); padding: 10px; flex-shrink: 0; }

/* 主区域 */
.al-main { flex: 1; margin-left: 232px; min-width: 0; transition: margin-left 0.25s var(--ease-out-expo); display: flex; flex-direction: column; }
.al-shell.collapsed .al-main { margin-left: 64px; }

.al-top {
  height: var(--header-h);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px;
  background: color-mix(in srgb, var(--color-surface) 80%, transparent);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--color-border);
  position: sticky; top: 0; z-index: 30;
}
.al-top-left, .al-top-right { display: flex; align-items: center; gap: 12px; }
.al-icon-btn {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px;
  color: var(--color-text-2);
  transition: all var(--dur-fast) ease;
}
.al-icon-btn:hover { background: var(--color-surface-2); color: var(--color-text-1); }
.pos-rel { position: relative; }
.al-dot {
  position: absolute; top: 6px; right: 5px;
  min-width: 15px; height: 15px;
  padding: 0 4px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  background: var(--color-accent);
  color: #fff;
  font-size: 9px; font-weight: 700;
}
.al-breadcrumb { display: flex; align-items: center; gap: 8px; font-size: var(--text-sm); }
.al-crumb { color: var(--color-text-3); }
.al-crumb-chev { color: var(--color-text-3); }
.al-crumb-current { font-weight: 600; color: var(--color-text-1); }

.al-search {
  display: flex; align-items: center; gap: 8px;
  padding: 0 12px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-surface-2);
  color: var(--color-text-3);
  width: 200px;
}
.al-search input { flex: 1; background: transparent; font-size: var(--text-sm); color: var(--color-text-1); }

.al-user {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px 4px 4px;
  border-radius: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  transition: all var(--dur-fast) ease;
  cursor: pointer;
}
.al-user:hover { border-color: var(--color-border-strong); }
.al-user-wrap { position: relative; }
.al-user-menu {
  position: absolute; top: calc(100% + 8px); right: 0;
  width: 220px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  padding: 6px;
  z-index: 100;
}
.al-um-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--color-border); margin-bottom: 6px; }
.al-um-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 700;
}
.al-um-name { font-size: var(--text-sm); font-weight: 700; color: var(--color-text-1); }
.al-um-mail { font-size: var(--text-xs); color: var(--color-text-3); margin-top: 2px; }
.al-um-item {
  width: 100%; display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; border-radius: 8px;
  font-size: var(--text-sm); color: var(--color-text-2);
  transition: background var(--dur-fast) ease;
}
.al-um-item:hover { background: var(--color-surface-2); color: var(--color-text-1); }
.al-um-item.danger { color: var(--color-error); }
.al-um-item.danger:hover { background: color-mix(in srgb, var(--color-error) 10%, transparent); }
.pop-enter-active, .pop-leave-active { transition: all 0.15s var(--ease-out-expo); }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-4px); }
.al-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-xs); font-weight: 700;
}
.al-user-info { display: flex; flex-direction: column; line-height: 1.2; text-align: left; }
.al-user-name { font-size: var(--text-sm); font-weight: 600; color: var(--color-text-1); }
.al-user-role { font-size: 10px; color: var(--color-text-3); }

.al-content { flex: 1; padding: 24px; overflow-x: hidden; }

.al-mask {
  position: fixed; inset: 0; z-index: 39;
  background: rgba(7, 23, 20, 0.5);
  backdrop-filter: blur(4px);
}

@media (max-width: 1023px) {
  .al-side { transform: translateX(-100%); }
  .al-side.mobile-open { transform: translateX(0); }
  .al-main, .al-shell.collapsed .al-main { margin-left: 0; }
  .mobile-only { display: flex !important; }
  .al-search { display: none; }
  .al-user-info { display: none; }
}
.mobile-only { display: none; }
</style>