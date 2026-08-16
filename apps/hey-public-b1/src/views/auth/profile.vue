<script setup lang="ts">
import type {
  AiDesignSession,
  AiRechargeRecord,
  AiUsageRecord,
  AiWallet,
} from '#/api/ai-design';

import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import {
  fetchAiSessions,
  fetchMyRechargeRecords,
  fetchMyUsageRecords,
  fetchMyWallet,
} from '#/api/ai-design';
import { useAuth } from '#/composables/useAuth';

const { user, isLoggedIn, fetchUserInfo } = useAuth();

const wallet = ref<AiWallet | null>(null);
const records = ref<AiUsageRecord[]>([]);
const recordsTotal = ref(0);
const rechargeRecords = ref<AiRechargeRecord[]>([]);
const rechargeTotal = ref(0);
const sessions = ref<AiDesignSession[]>([]);
const loading = ref(false);

/** 充值记录状态文案 */
function rechargeStatusText(status: number): string {
  switch (status) {
    case 0: {
      return '待支付';
    }
    case 10: {
      return '已支付';
    }
    case 20: {
      return '已取消';
    }
    case 30: {
      return '失败';
    }
    default: {
      return '未知';
    }
  }
}

/** 支付方式文案 */
function rechargeMethodText(method: number): string {
  switch (method) {
    case 1: {
      return '微信支付';
    }
    case 2: {
      return '支付宝';
    }
    case 99: {
      return '后台调整';
    }
    default: {
      return '未知';
    }
  }
}

/** 消费记录状态文案 */
function recordStatusText(record: AiUsageRecord): string {
  switch (record.status) {
    case 0: {
      return '待结算';
    }
    case 10: {
      return '已扣费';
    }
    case 20: {
      return '未扣费';
    }
    default: {
      return '未知';
    }
  }
}

function formatMoney(value: null | number | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTime(value?: null | string): string {
  if (!value) return '-';
  const d = new Date(value);
  return isNaN(d.getTime())
    ? '-'
    : d.toLocaleString('zh-CN', { hour12: false });
}

async function loadAll() {
  loading.value = true;
  try {
    await fetchUserInfo();
    const [w, recordPage, rechargePage, sessionList] = await Promise.all([
      fetchMyWallet().catch(() => null),
      fetchMyUsageRecords(0, 20).catch(() => null),
      fetchMyRechargeRecords(0, 20).catch(() => null),
      fetchAiSessions().catch(() => [] as AiDesignSession[]),
    ]);
    wallet.value = w;
    if (recordPage) {
      records.value = recordPage.items;
      recordsTotal.value = recordPage.totalCount;
    }
    if (rechargePage) {
      rechargeRecords.value = rechargePage.items;
      rechargeTotal.value = rechargePage.totalCount;
    }
    sessions.value = sessionList;
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);
</script>

<template>
  <div class="profile-page">
    <div class="container-custom">
      <div class="profile-header">
        <RouterLink to="/" class="back-link">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回首页
        </RouterLink>
        <h1 class="profile-title">个人中心</h1>
        <p class="profile-subtitle">账户信息 · 创作钱包 · 我的 AI 会话</p>
      </div>

      <div v-if="isLoggedIn && user" class="profile-grid">
        <!-- 用户信息 -->
        <section class="glass-card panel">
          <div class="panel-head">
            <h2>账户信息</h2>
          </div>
          <div class="profile-avatar-section">
            <div class="profile-avatar">
              <img
                v-if="user.avatar"
                :src="user.avatar"
                :alt="user.realName"
                class="avatar-img"
              />
              <span v-else class="avatar-placeholder">
                {{ (user.realName || user.username).charAt(0).toUpperCase() }}
              </span>
            </div>
            <h2 class="profile-name">{{ user.realName || user.username }}</h2>
            <p class="profile-username">@{{ user.username }}</p>
          </div>
          <div class="profile-info">
            <div class="info-item">
              <span class="info-label">邮箱</span>
              <span class="info-value">{{ user.email || '未设置' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">手机号</span>
              <span class="info-value">{{ user.phoneNumber || '未设置' }}</span>
            </div>
          </div>
        </section>

        <!-- 钱包 -->
        <section class="glass-card panel wallet-panel">
          <div class="panel-head">
            <h2>创作钱包</h2>
            <div class="panel-actions">
              <RouterLink to="/ai-design" class="panel-link"
                >
去创作 →
</RouterLink
              >
              <RouterLink to="/recharge" class="panel-link panel-link-primary"
                >
去充值 →
</RouterLink
              >
            </div>
          </div>

          <div v-if="wallet" class="wallet-body">
            <div class="wallet-balance">
              <span class="wallet-label">当前余额（元）</span>
              <span class="wallet-amount">{{
                formatMoney(wallet.balance)
              }}</span>
            </div>
            <div class="wallet-stats">
              <div class="stat-item">
                <span class="stat-label">累计消费</span>
                <span class="stat-value">{{
                  formatMoney(wallet.totalCharged)
                }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">当前单价（元/张）</span>
                <span class="stat-value">{{
                  formatMoney(wallet.unitPrice)
                }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">消费记录</span>
                <span class="stat-value">{{ recordsTotal }} 条</span>
              </div>
            </div>
          </div>
          <div v-else class="wallet-empty">余额加载失败，请稍后重试</div>
        </section>

        <!-- 我的 AI 会话 -->
        <section class="glass-card panel">
          <div class="panel-head">
            <h2>我的 AI 会话</h2>
            <RouterLink to="/ai-design" class="panel-link"
              >
新建会话 →
</RouterLink
            >
          </div>
          <div v-if="sessions.length" class="session-list">
            <RouterLink
              v-for="s in sessions"
              :key="s.id"
              to="/ai-design"
              class="session-item"
            >
              <div class="session-main">
                <span class="session-title">{{ s.title || '未命名会话' }}</span>
                <span class="session-meta">
                  {{ formatTime(s.lastActivityTime || s.creationTime) }}
                </span>
              </div>
              <span class="session-count">{{ s.totalImageCount }} 张图</span>
            </RouterLink>
          </div>
          <div v-else class="empty-hint">
            还没有 AI 会话，去
            <RouterLink to="/ai-design" class="inline-link">AI 创作</RouterLink>
            开始第一张作品吧
          </div>
        </section>

        <!-- 充值记录 -->
        <section class="glass-card panel records-panel">
          <div class="panel-head">
            <h2>充值记录</h2>
            <RouterLink to="/recharge" class="panel-link panel-link-primary"
              >
去充值 →
</RouterLink
            >
          </div>
          <div v-if="rechargeRecords.length" class="records-table-wrap">
            <table class="records-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>支付方式</th>
                  <th>充值金额（元）</th>
                  <th>到账金额（元）</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rechargeRecords" :key="r.id">
                  <td>{{ formatTime(r.creationTime) }}</td>
                  <td>{{ rechargeMethodText(r.paymentMethod) }}</td>
                  <td>{{ formatMoney(r.amount) }}</td>
                  <td>{{ formatMoney(r.creditedAmount) }}</td>
                  <td>
                    <span class="record-status" :class="`status-${ r.status}`">
                      {{ rechargeStatusText(r.status) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-hint">暂无充值记录</div>
        </section>

        <!-- 消费记录 -->
        <section class="glass-card panel records-panel">
          <div class="panel-head">
            <h2>消费记录</h2>
            <span class="panel-hint">成功生成才扣费</span>
          </div>
          <div v-if="records.length" class="records-table-wrap">
            <table class="records-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>模型</th>
                  <th>数量</th>
                  <th>单价</th>
                  <th>金额（元）</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in records" :key="r.id">
                  <td>{{ formatTime(r.creationTime) }}</td>
                  <td>{{ r.model }}</td>
                  <td>{{ r.quantity }}</td>
                  <td>{{ formatMoney(r.unitPrice) }}</td>
                  <td>{{ formatMoney(r.amount) }}</td>
                  <td>
                    <span class="record-status" :class="`status-${ r.status}`">
                      {{ recordStatusText(r) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-hint">暂无消费记录</div>
        </section>
      </div>

      <div v-else class="profile-empty">
        <p>请先登录以查看个人中心</p>
        <RouterLink to="/login" class="btn-neon-filled">去登录</RouterLink>
      </div>

      <div v-if="loading" class="loading-hint">加载中…</div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: 120px 0 80px;
  background: var(--color-bg-primary);
}

.profile-header {
  margin-bottom: 32px;
}

.back-link {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 20px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--color-neon);
}

.profile-title {
  margin-bottom: 6px;
  font-size: 1.7rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.profile-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.panel {
  padding: 28px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.panel-head h2 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.panel-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-neon);
  text-decoration: none;
}

.panel-link:hover {
  text-decoration: underline;
}

.panel-actions {
  display: flex;
  gap: 14px;
  align-items: center;
}

.panel-link-primary {
  padding: 5px 14px;
  color: var(--color-bg-primary);
  background: linear-gradient(135deg, var(--color-neon), rgb(122 158 0 / 94%));
  border-radius: 9999px;
  box-shadow: 0 4px 14px var(--color-neon-glow);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.panel-link-primary:hover {
  text-decoration: none;
  box-shadow: 0 6px 18px var(--color-neon-glow);
  transform: translateY(-1px);
}

.panel-hint {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

/* 用户信息 */
.profile-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

.profile-avatar {
  width: 88px;
  height: 88px;
  margin-bottom: 16px;
  overflow: hidden;
  border: 2px solid var(--color-neon-dim);
  border-radius: 50%;
  box-shadow: 0 0 20px var(--color-neon-glow);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.profile-name {
  margin-bottom: 4px;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.profile-username {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.info-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.info-value {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* 钱包 */
.wallet-balance {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--color-neon-glow), transparent 70%);
  border: 1px solid var(--color-neon-dim);
  border-radius: 14px;
}

.wallet-label {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.wallet-amount {
  font-size: 2.4rem;
  font-weight: 800;
  line-height: 1;
  color: var(--color-neon);
  text-shadow: 0 0 24px var(--color-neon-glow);
}

.wallet-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.wallet-empty {
  padding: 40px 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  text-align: center;
}

/* 会话列表 */
.session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.session-item {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  text-decoration: none;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.2s;
}

.session-item:hover {
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.session-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.session-title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.session-meta {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.session-count {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-neon);
}

/* 消费记录 */
.records-panel {
  grid-column: 1 / -1;
}

.records-table-wrap {
  overflow-x: auto;
}

.records-table {
  width: 100%;
  font-size: 0.85rem;
  border-collapse: collapse;
}

.records-table th,
.records-table td {
  padding: 10px 14px;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--color-border);
}

.records-table th {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-bg-card);
}

.records-table td {
  color: var(--color-text-primary);
}

.record-status {
  padding: 3px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
}

.status-10 {
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.status-0 {
  color: #d4a017;
  background: rgb(212 160 23 / 12%);
}

.status-20 {
  color: var(--color-text-muted);
  background: var(--color-bg-card);
}

.empty-hint {
  padding: 36px 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  text-align: center;
}

.inline-link {
  color: var(--color-neon);
  text-decoration: none;
}

.profile-empty {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  padding: 80px 0;
  text-align: center;
}

.profile-empty p {
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.profile-empty .btn-neon-filled {
  padding: 12px 32px;
  font-size: 1rem;
  text-decoration: none;
  border-radius: 9999px;
}

.loading-hint {
  margin-top: 24px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-align: center;
}

@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
