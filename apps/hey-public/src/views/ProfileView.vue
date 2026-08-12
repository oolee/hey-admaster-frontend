<script setup lang="ts">
import type { V2ProfileData } from '@/api';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { fetchProfileData } from '@/api';
import Badge from '@/components/ui/Badge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import { useUserStore } from '@/stores/user';
import { toast } from '@/utils/toast';
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  CreditCard,
  Heart,
  LogOut,
  Package,
  Plus,
  Settings,
  Sparkles,
  TrendingUp,
} from 'lucide-vue-next';

const router = useRouter();
const user = useUserStore();

const data = ref<V2ProfileData>({
  notifications: [],
  orders: [],
  favorites: [],
  usage: null,
});
const loading = ref(true);
const tab = ref('overview');

const tabs = [
  { id: 'overview', label: '总览', icon: TrendingUp },
  { id: 'orders', label: '订单', icon: Package },
  { id: 'favorites', label: '收藏', icon: Heart },
  { id: 'notifications', label: '通知', icon: Bell },
  { id: 'settings', label: '设置', icon: Settings },
];

const chartH = ref(0);
const chartW = ref(0);
const chartPath = computed(() => {
  const d = data.value.usage;
  if (!d || d.charts.length === 0)
    return { line: '', area: '', pts: [], max: 0 };
  const w = chartW.value || 500;
  const h = chartH.value || 160;
  const max = Math.max(...d.charts.map((c) => c.value)) * 1.15;
  const pts: [number, number][] = d.charts.map((c, i) => {
    const x = (i / (d.charts.length - 1)) * w;
    const y = h - (c.value / max) * h;
    return [x, y];
  });
  const line = pts
    .map(
      (p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`,
    )
    .join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return { line, area, pts, max };
});

async function load() {
  const res = await fetchProfileData();
  if (res.code === 0) data.value = res.data;
  loading.value = false;
  requestAnimationFrame(() => {
    const el = document.querySelector('.usage-chart');
    if (el) {
      chartW.value = el.clientWidth;
      chartH.value = 160;
    }
  });
}

function logout() {
  user.logout();
  toast.success('已退出登录');
  router.push('/');
}

function goHome() {
  router.push('/');
}

onMounted(load);
</script>

<template>
  <div class="profile">
    <!-- 顶部条（含返回首页） -->
    <header class="profile-top">
      <div class="profile-top-inner">
        <button class="back-home" @click="goHome">
          <ArrowLeft :size="16" />
          <span>返回首页</span>
        </button>
        <router-link to="/" class="ws-logo">
          <span class="ws-logo-mark">H</span>
          <span class="ws-logo-text">Hey 19</span>
        </router-link>
        <span class="ws-title">个人中心</span>
        <div class="top-actions">
          <ThemeToggle />
        </div>
      </div>
    </header>

    <div class="profile-container">
      <!-- 侧边导航 -->
      <aside class="profile-nav">
        <div class="me-card">
          <div class="me-avatar">{{ user.user?.avatar || 'U' }}</div>
          <h3>{{ user.user?.name || '未登录用户' }}</h3>
          <Badge tone="accent">{{ user.user?.level || '体验版' }}</Badge>
        </div>

        <nav class="pn-nav">
          <button
            v-for="t in tabs"
            :key="t.id"
            class="pn-item"
            :class="{ active: tab === t.id }"
            @click="tab = t.id"
          >
            <component :is="t.icon" :size="16" /> {{ t.label }}
          </button>
        </nav>

        <button class="logout-btn" @click="logout">
          <LogOut :size="16" /> 退出登录
        </button>
      </aside>

      <!-- 主内容 -->
      <main class="profile-main">
        <div v-if="loading"><Skeleton :rows="4" :lines="3" /></div>

        <template v-else>
          <!-- 总览 -->
          <section v-if="tab === 'overview'">
            <div class="stats-cards">
              <div class="stat-card">
                <span class="sc-icon accent"><Sparkles :size="18" /></span>
                <div>
                  <span class="sc-value">{{ user.user?.credits ?? 6970 }}</span
                  ><span class="sc-label">可用积分</span>
                </div>
                <BaseButton
                  variant="ghost"
                  size="sm"
                  @click="toast.info('充值为演示功能')"
                >
                  <Plus :size="13" /> 充值
                </BaseButton>
              </div>
              <div class="stat-card">
                <span class="sc-icon ai"><CreditCard :size="18" /></span>
                <div>
                  <span class="sc-value">¥{{ user.user?.balance ?? 68.7 }}</span
                  ><span class="sc-label">账户余额</span>
                </div>
                <BaseButton
                  variant="ghost"
                  size="sm"
                  @click="toast.info('提现为演示功能')"
                >
                  提现
                </BaseButton>
              </div>
              <div class="stat-card">
                <span class="sc-icon green"><Package :size="18" /></span>
                <div>
                  <span class="sc-value">{{ data.orders.length }}</span
                  ><span class="sc-label">历史订单</span>
                </div>
                <BaseButton variant="ghost" size="sm" @click="tab = 'orders'">
                  查看
                </BaseButton>
              </div>
            </div>

            <div class="panel">
              <div class="panel-head">
                <h3>积分使用趋势</h3>
                <span class="panel-hint"
                  >本月 {{ data.usage?.month }} /
                  {{ data.usage?.monthLimit }} 积分</span
                >
              </div>
              <div class="usage-chart">
                <svg
                  :viewBox="`0 0 ${chartW || 500} ${chartH || 160}`"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stop-color="var(--color-accent)"
                        stop-opacity="0.35"
                      />
                      <stop
                        offset="100%"
                        stop-color="var(--color-accent)"
                        stop-opacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    v-if="chartPath.area"
                    :d="chartPath.area"
                    fill="url(#areaGrad)"
                  />
                  <path
                    v-if="chartPath.line"
                    :d="chartPath.line"
                    fill="none"
                    stroke="var(--color-accent)"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  />
                  <circle
                    v-for="(p, i) in chartPath.pts || []"
                    :key="i"
                    :cx="p[0]"
                    :cy="p[1]"
                    r="4"
                    fill="var(--color-surface)"
                    stroke="var(--color-accent)"
                    stroke-width="2"
                  />
                </svg>
                <div class="chart-x">
                  <span v-for="c in data.usage?.charts || []" :key="c.label">{{
                    c.label
                  }}</span>
                </div>
              </div>
            </div>

            <div class="panel">
              <div class="panel-head">
                <h3>最近订单</h3>
                <button class="link-btn" @click="tab = 'orders'">
                  全部 <ChevronRight :size="14" />
                </button>
              </div>
              <div class="order-list">
                <div
                  v-for="o in data.orders.slice(0, 3)"
                  :key="o.id"
                  class="order-item"
                >
                  <div class="order-main">
                    <span class="order-name">{{ o.name }}</span>
                    <span class="order-id">{{ o.id }} · {{ o.date }}</span>
                  </div>
                  <Badge
                    :tone="
                      o.status === '已支付'
                        ? 'success'
                        : o.status === '服务中'
                          ? 'ai'
                          : 'neutral'
                    "
                  >
                    {{ o.status }}
                  </Badge>
                  <span class="order-amount"
                    >¥{{ o.amount.toLocaleString() }}</span
                  >
                </div>
              </div>
            </div>
          </section>

          <section v-if="tab === 'orders'">
            <div class="panel">
              <div class="panel-head"><h3>全部订单</h3></div>
              <div class="order-list">
                <div v-for="o in data.orders" :key="o.id" class="order-item">
                  <div class="order-main">
                    <span class="order-name">{{ o.name }}</span>
                    <span class="order-id"
                      >{{ o.id }} · {{ o.date }} · {{ o.type }}</span
                    >
                  </div>
                  <Badge
                    :tone="
                      o.status === '已支付'
                        ? 'success'
                        : o.status === '服务中'
                          ? 'ai'
                          : 'neutral'
                    "
                  >
                    {{ o.status }}
                  </Badge>
                  <span class="order-amount"
                    >¥{{ o.amount.toLocaleString() }}</span
                  >
                </div>
              </div>
            </div>
          </section>

          <section v-if="tab === 'favorites'">
            <div class="panel">
              <div class="panel-head"><h3>我的收藏</h3></div>
              <div class="fav-grid">
                <div
                  v-for="f in data.favorites"
                  :key="f.id"
                  class="fav-card"
                  :style="{ background: f.gradient }"
                >
                  <Heart :size="18" class="fav-heart" />
                  <span class="fav-name">{{ f.name }}</span>
                  <Badge tone="neutral">{{ f.type }}</Badge>
                </div>
              </div>
            </div>
          </section>

          <section v-if="tab === 'notifications'">
            <div class="panel">
              <div class="panel-head"><h3>消息通知</h3></div>
              <div class="notif-list">
                <div
                  v-for="n in data.notifications"
                  :key="n.id"
                  class="notif-item"
                  :class="{ unread: n.unread }"
                >
                  <span class="notif-dot"></span>
                  <div class="notif-main">
                    <p class="notif-title">{{ n.title }}</p>
                    <p class="notif-desc">{{ n.desc }}</p>
                  </div>
                  <span class="notif-time">{{ n.time }}</span>
                </div>
              </div>
            </div>
          </section>

          <section v-if="tab === 'settings'">
            <div class="panel">
              <div class="panel-head"><h3>账户设置</h3></div>
              <div class="settings-list">
                <div class="set-item">
                  <span>头像</span
                  ><button
                    class="set-value"
                    @click="toast.info('上传为演示功能')"
                  >
                    修改
                  </button>
                </div>
                <div class="set-item">
                  <span>昵称</span
                  ><button
                    class="set-value"
                    @click="toast.info('修改为演示功能')"
                  >
                    {{ user.user?.name || '未设置' }}
                    <ChevronRight :size="14" />
                  </button>
                </div>
                <div class="set-item">
                  <span>绑定手机</span
                  ><button
                    class="set-value"
                    @click="toast.info('绑定为演示功能')"
                  >
                    未绑定 <ChevronRight :size="14" />
                  </button>
                </div>
                <div class="set-item">
                  <span>通知偏好</span
                  ><button
                    class="set-value"
                    @click="toast.info('偏好为演示功能')"
                  >
                    站内 + 邮件 <ChevronRight :size="14" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
.profile {
  min-height: 100vh;
  background: var(--color-bg);
}

/* 顶部条 */
.profile-top {
  position: sticky;
  top: 0;
  z-index: 30;
  height: var(--header-h);
  background: color-mix(in srgb, var(--color-surface) 78%, transparent);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(14px);
}

.profile-top-inner {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
  max-width: 1120px;
  height: 100%;
  padding: 0 var(--sp-5);
  margin: 0 auto;
}

.back-home {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 0.4rem 0.8rem;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.back-home:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  transform: translateX(-2px);
}

.ws-logo {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-1);
}

.ws-logo-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-weight: 700;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: 8px;
}

.ws-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-3);
}

.top-actions {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
  margin-left: auto;
}

@media (max-width: 640px) {
  .ws-logo-text,
  .ws-title {
    display: none;
  }

  .back-home span {
    display: none;
  }

  .back-home {
    padding: 0.4rem 0.6rem;
  }

  .profile-top-inner {
    padding: 0 var(--sp-4);
  }
}

/* 容器 */
.profile-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-5);
  max-width: 1120px;
  padding: var(--sp-6) var(--sp-5);
  margin: 0 auto;
}

@media (min-width: 1024px) {
  .profile-container {
    grid-template-columns: 240px 1fr;
  }
}

.profile-nav {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

@media (min-width: 1024px) {
  .profile-nav {
    position: sticky;
    top: calc(var(--header-h) + var(--sp-4));
    height: fit-content;
  }
}

.me-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  align-items: center;
  padding: var(--sp-6);
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
}

.me-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  border-radius: 50%;
  box-shadow: var(--shadow-accent);
}

.me-card h3 {
  font-size: var(--text-lg);
}

.pn-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--sp-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
}

.pn-item {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  padding: 0.7rem 0.9rem;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-2);
  text-align: left;
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.pn-item:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.pn-item.active {
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.logout-btn {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  padding: 0.8rem;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-error);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  transition: all var(--dur-fast) ease;
}

.logout-btn:hover {
  background: color-mix(in srgb, var(--color-error) 8%, transparent);
  border-color: var(--color-error);
}

.profile-main {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  min-width: 0;
}

.stats-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
}

@media (min-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

.stat-card {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
  padding: var(--sp-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
}

.sc-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: var(--r-lg);
}

.sc-icon.accent {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.sc-icon.ai {
  color: var(--color-ai);
  background: var(--color-ai-soft);
}

.sc-icon.green {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 12%, transparent);
}

.stat-card > div {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.sc-value {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text-1);
}

.sc-label {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.panel {
  padding: var(--sp-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-4);
}

.panel-head h3 {
  font-size: var(--text-base);
}

.panel-hint {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.link-btn {
  display: inline-flex;
  align-items: center;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-accent);
}

.usage-chart {
  padding-top: var(--sp-2);
}

.usage-chart svg {
  width: 100%;
  height: 160px;
}

.chart-x {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}

.chart-x span {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.order-list {
  display: flex;
  flex-direction: column;
}

.order-item {
  display: flex;
  gap: var(--sp-4);
  align-items: center;
  padding: var(--sp-4) 0;
  border-bottom: 1px dashed var(--color-border);
}

.order-item:last-child {
  border-bottom: none;
}

.order-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.order-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-1);
}

.order-id {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.order-amount {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-1);
}

.fav-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-3);
}

@media (min-width: 768px) {
  .fav-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.fav-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: flex-end;
  aspect-ratio: 4/3;
  padding: var(--sp-4);
  overflow: hidden;
  color: #fff;
  border-radius: var(--r-lg);
  transition: transform var(--dur-med) var(--ease-out-expo);
}

.fav-card:hover {
  transform: translateY(-3px) scale(1.02);
}

.fav-heart {
  position: absolute;
  top: 10px;
  right: 10px;
}

.fav-name {
  font-size: var(--text-sm);
  font-weight: 700;
  text-shadow: 0 1px 3px rgb(0 0 0 / 30%);
}

.notif-list {
  display: flex;
  flex-direction: column;
}

.notif-item {
  display: flex;
  gap: var(--sp-3);
  align-items: flex-start;
  padding: var(--sp-4) 0;
  border-bottom: 1px dashed var(--color-border);
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 7px;
  background: var(--color-border-strong);
  border-radius: 50%;
}

.notif-item.unread .notif-dot {
  background: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.notif-main {
  flex: 1;
}

.notif-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-1);
}

.notif-desc {
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.notif-time {
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.settings-list {
  display: flex;
  flex-direction: column;
}

.set-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) 0;
  font-size: var(--text-sm);
  color: var(--color-text-2);
  border-bottom: 1px dashed var(--color-border);
}

.set-item:last-child {
  border-bottom: none;
}

.set-value {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-weight: 500;
  color: var(--color-text-1);
}

.set-value:hover {
  color: var(--color-accent);
}
</style>
