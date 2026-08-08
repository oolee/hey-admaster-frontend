<script setup lang="ts">
import type {
  AiRechargeOrderResult,
  AiRechargeRecord,
  AiWallet,
} from '#/api/ai-design';

import { computed, onMounted, ref, watch } from 'vue';

import {
  createRechargeOrder,
  demoMarkRechargePaid,
  fetchMyRechargeRecords,
  fetchMyWallet,
  queryRechargeOrder,
} from '#/api/ai-design';
import { useAuth } from '#/composables/useAuth';

const { isLoggedIn, user } = useAuth();

/** 未登录时跳转登录页 */
function ensureLogin() {
  const redirect = encodeURIComponent(window.location.pathname);
  window.location.href = `/login?redirect=${redirect}`;
}

// ── Tab 切换：充值 / 明细 / 消费 ──
const activeTab = ref<'recharge' | 'records' | 'usage'>('recharge');

// ── 钱包 ──
const wallet = ref<AiWallet | null>(null);
const walletLoading = ref(false);

async function loadWallet() {
  walletLoading.value = true;
  try {
    wallet.value = await fetchMyWallet();
  } finally {
    walletLoading.value = false;
  }
}

// ── 固定金额 + 自定义 ──
const presetAmounts = [5, 10, 20, 50, 100];
const selectedAmount = ref<number>(20);
const customMode = ref(false);
const customAmount = ref<'' | number>('');

const finalAmount = computed<number>(() => {
  if (customMode.value) {
    const v = Number(customAmount.value);
    return Number.isFinite(v) && v >= 1 ? Math.round(v * 100) / 100 : 0;
  }
  return selectedAmount.value;
});

function selectPreset(a: number) {
  customMode.value = false;
  selectedAmount.value = a;
}

function activateCustom() {
  customMode.value = true;
}

// 输入自定义金额时自动切换自定义模式
watch(customAmount, (v) => {
  if (v !== '' && v !== null) {
    customMode.value = true;
  }
});

// ── 支付方式：1微信 2支付宝 ──
const paymentMethod = ref<1 | 2>(1);

// ── 创建订单 / 弹窗 ──
const payingModal = ref(false);
const currentOrder = ref<AiRechargeOrderResult | null>(null);
const creatingOrder = ref(false);
const paying = ref(false);
const orderError = ref('');
const pollTimer = ref<null | number>(null);

// 模拟二维码：使用 伪-QR 网格（不依赖外部库，纯 SVG 视觉占位）
// PayContent 作为显示字符串
const qrDisplayText = computed(() => {
  if (!currentOrder.value) return '';
  const c = currentOrder.value.payContent;
  return c.length > 60 ? `${c.slice(0, 58)}…` : c;
});

async function createOrder() {
  if (!isLoggedIn.value) {
    ensureLogin();
    return;
  }
  if (finalAmount.value < 1) {
    return;
  }
  orderError.value = '';
  creatingOrder.value = true;
  try {
    currentOrder.value = await createRechargeOrder({
      amount: finalAmount.value,
      paymentMethod: paymentMethod.value,
    });
    payingModal.value = true;
    startPolling();
  } catch (error: any) {
    orderError.value = error.message || '创建订单失败';
  } finally {
    creatingOrder.value = false;
  }
}

function startPolling() {
  stopPolling();
  // 每 3 秒查询一次订单状态，最多 5 分钟
  const endAt = Date.now() + 5 * 60 * 1000;
  pollTimer.value = window.setInterval(async () => {
    if (!currentOrder.value) {
      stopPolling();
      return;
    }
    try {
      const r = await queryRechargeOrder(currentOrder.value.orderNo);
      if (r.status === 10 /* Paid */) {
        stopPolling();
        payingModal.value = false;
        currentOrder.value = null;
        await loadWallet();
        await loadRechargeRecords();
      }
    } catch {
      /* ignore */
    }
    if (Date.now() >= endAt) stopPolling();
  }, 3000);
}

function stopPolling() {
  if (pollTimer.value !== null) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

async function demoPay() {
  if (!currentOrder.value) return;
  paying.value = true;
  try {
    await demoMarkRechargePaid(currentOrder.value.orderNo);
    stopPolling();
    payingModal.value = false;
    currentOrder.value = null;
    await loadWallet();
    await loadRechargeRecords();
  } catch (error: any) {
    orderError.value = error.message || '模拟支付失败';
  } finally {
    paying.value = false;
  }
}

function closePayModal() {
  payingModal.value = false;
  stopPolling();
  currentOrder.value = null;
}

// ── 充值记录 ──
const rechargeRecords = ref<AiRechargeRecord[]>([]);
const rechargeTotal = ref(0);
const rechargeLoading = ref(false);
const rechargeSkip = ref(0);
const rechargePageSize = 10;
const hasMoreRecharge = computed(
  () => rechargeRecords.value.length < rechargeTotal.value,
);

async function loadRechargeRecords(reset = false) {
  if (!isLoggedIn.value) return;
  if (reset) {
    rechargeSkip.value = 0;
    rechargeRecords.value = [];
  }
  rechargeLoading.value = true;
  try {
    const r = await fetchMyRechargeRecords(
      rechargeSkip.value,
      rechargePageSize,
    );
    rechargeTotal.value = r.totalCount;
    if (rechargeSkip.value === 0) {
      rechargeRecords.value = r.items;
    } else {
      rechargeRecords.value.push(...r.items);
    }
    rechargeSkip.value += r.items.length;
  } finally {
    rechargeLoading.value = false;
  }
}

// ── 消费记录（简单复用，不在此页面重点）──
const usageRecords = ref<any[]>([]);
const usageLoading = ref(false);

async function loadUsageRecords() {
  if (!isLoggedIn.value) return;
  usageLoading.value = true;
  try {
    const { fetchMyUsageRecords } = await import('#/api/ai-design');
    const r = await fetchMyUsageRecords(0, 10);
    usageRecords.value = r.items;
  } finally {
    usageLoading.value = false;
  }
}

// 格式化
function fmtMoney(n: null | number | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return '0.00';
  return Number(n).toFixed(2);
}
function fmtDate(t?: null | string) {
  if (!t) return '—';
  const d = new Date(t);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function statusColor(s: number) {
  // 0待支付 10已支付 20已取消 30失败
  switch (s) {
    case 10: {
      return 'var(--color-success)';
    }
    case 20:
    case 30: {
      return 'var(--color-text-secondary)';
    }
    default: {
      return 'var(--color-warning)';
    }
  }
}

onMounted(async () => {
  if (isLoggedIn.value) {
    await Promise.all([loadWallet(), loadRechargeRecords()]);
  }
});

watch(isLoggedIn, (v) => {
  if (v) {
    loadWallet();
    loadRechargeRecords();
  }
});

// tab 切换按需加载
watch(activeTab, (t) => {
  if (t === 'usage' && usageRecords.value.length === 0) {
    loadUsageRecords();
  }
});
</script>

<script lang="ts">
// 伪二维码 dot 生成：基于 seed 生成可重现的 0/1 点阵
import { defineComponent, h } from 'vue';
function hashStr(s: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.codePointAt(i);
    h = Math.imul(h, 16_777_619) >>> 0;
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
const PseudoQrDots = defineComponent({
  name: 'PseudoQrDots',
  props: { seed: { type: String, required: true } },
  setup(props) {
    return () => {
      const cells: any[] = [];
      // 可绘制区域：x/y 从 72 到 148 排除中心 40 像素方块；外围 0~64 也可画（排除三个角 0~64 范围）
      const size = 10;
      const step = 8;
      const rand = mulberry32(hashStr(props.seed));
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const px = 72 + x * step;
          const py = 72 + y * step;
          // 排除中心 24x24
          if (px >= 98 && px <= 122 && py >= 98 && py <= 122) continue;
          if (rand() > 0.45) {
            cells.push(
              h('rect', {
                x: px,
                y: py,
                width: 6,
                height: 6,
                fill: '#111',
                rx: 1,
              }),
            );
          }
        }
      }
      // 外围额外随机散点
      for (let y = 0; y < 18; y++) {
        for (let x = 0; x < 18; x++) {
          const px = 12 + x * 11;
          const py = 12 + y * 11;
          // 跳过三个角
          if (
            (px < 72 && py < 72) ||
            (px > 148 && py < 72) ||
            (px < 72 && py > 148)
          )
            continue;
          if (rand() > 0.55) {
            cells.push(
              h('rect', {
                x: px,
                y: py,
                width: 7,
                height: 7,
                fill: '#111',
                rx: 1,
              }),
            );
          }
        }
      }
      return h('g', cells);
    };
  },
});
export default { components: { PseudoQrDots } };
</script>

<template>
  <div class="recharge-page">
    <!-- Header -->
    <header class="recharge-header">
      <a href="/" class="back-home">← 返回首页</a>
      <div class="header-title">钱包充值中心</div>
      <div class="header-user">
        <template v-if="isLoggedIn && user">
          <span class="user-name">{{ user.username || user.email }}</span>
        </template>
        <template v-else>
          <button class="mini-btn" @click="ensureLogin()">登录</button>
        </template>
      </div>
    </header>

    <main class="recharge-main">
      <!-- 钱包卡片 -->
      <section class="wallet-card glass-card">
        <div class="wallet-left">
          <div class="wallet-label">当前余额（元）</div>
          <div class="wallet-amount">
            <span class="currency">¥</span>
            <span v-if="!walletLoading && wallet">{{
              fmtMoney(wallet.balance)
            }}</span>
            <span v-else class="wallet-loading">—</span>
          </div>
          <div class="wallet-sub">
            <span
              >累计消费 ¥<b>{{ fmtMoney(wallet?.totalCharged) }}</b></span
            >
            <span
              >累计退款 ¥<b>{{ fmtMoney(wallet?.totalRefunded) }}</b></span
            >
            <span
              >当前单价 ¥<b>{{ fmtMoney(wallet?.unitPrice) }}</b> / 张</span
            >
          </div>
        </div>
        <div class="wallet-right">
          <div class="wallet-bg-deco"></div>
        </div>
      </section>

      <!-- Tab nav -->
      <nav class="tab-nav">
        <button
          class="tab-btn" :class="[activeTab === 'recharge' && 'active']"
          @click="activeTab = 'recharge'"
        >
          立即充值
        </button>
        <button
          class="tab-btn" :class="[activeTab === 'records' && 'active']"
          @click="activeTab = 'records'"
        >
          充值明细
          <span class="tab-count" v-if="rechargeTotal">{{
            rechargeTotal
          }}</span>
        </button>
        <button
          class="tab-btn" :class="[activeTab === 'usage' && 'active']"
          @click="activeTab = 'usage'"
        >
          消费记录
        </button>
      </nav>

      <!-- 充值面板 -->
      <section v-if="activeTab === 'recharge'" class="panel glass-card">
        <div class="panel-title">
          <h2>选择充值金额</h2>
          <span class="panel-hint">1 元 ≈ 可生成 1 张图，具体以单价为准</span>
        </div>

        <div class="amount-grid">
          <button
            v-for="a in presetAmounts"
            :key="a"
            class="amount-card" :class="[
              !customMode && selectedAmount === a && 'selected',
            ]"
            @click="selectPreset(a)"
          >
            <span class="amount-num">¥{{ a }}</span>
          </button>
          <button
            class="amount-card" :class="[customMode && 'selected']"
            @click="activateCustom()"
          >
            <input
              v-model="customAmount"
              type="number"
              min="1"
              max="5000"
              step="1"
              class="custom-input"
              placeholder="自定义"
              @focus="activateCustom()"
              @click.stop
            />
            <span class="custom-suffix">元</span>
          </button>
        </div>

        <div class="amount-info-row">
          <span class="amount-hint">
            <template v-if="finalAmount >= 1">
              实付金额：<b>¥ {{ fmtMoney(finalAmount) }}</b
              >，到账余额：<b>¥ {{ fmtMoney(finalAmount) }}</b>
            </template>
            <template v-else class="text-warn">
              请选择或输入不低于 1 元的金额
            </template>
          </span>
        </div>

        <div class="panel-title payment-title">
          <h2>选择支付方式</h2>
        </div>
        <div class="payment-row">
          <button
            class="pay-card" :class="[paymentMethod === 1 && 'selected']"
            @click="paymentMethod = 1"
          >
            <div class="pay-icon wechat-icon">
              <svg
                viewBox="0 0 32 32"
                width="32"
                height="32"
                fill="currentColor"
              >
                <path
                  d="M20.9 8c-4.9 0-8.9 3.3-8.9 7.3 0 2.3 1.2 4.3 3.1 5.6l-.5 1.5 1.8-.9c1.5.4 3 .6 4.5.6.3 0 .6 0 .9-.1-.3-1.2-.2-2.4.2-3.6 2-1.2 3.4-3.2 3.4-5.4 0-4-4-7.3-4.5-7.3zm-2.5 3.6c.5 0 .9.4.9.9 0 .5-.4.9-.9.9-.5 0-.9-.4-.9-.9 0-.5.4-.9.9-.9zm5.2 0c.5 0 .9.4.9.9 0 .5-.4.9-.9.9-.5 0-.9-.4-.9-.9 0-.5.4-.9.9-.9zM9.8 15.4c-4 0-7.2 2.6-7.2 5.9 0 1.9 1 3.6 2.5 4.7l-.4 1.2 1.5-.7c1.1.3 2.3.4 3.5.4.3 0 .6 0 .8-.1-.2-1-.2-2 .2-2.9 1.6-1 2.7-2.5 2.7-4.6 0-3.3-3.3-5.9-3.6-5.9zm-2 2.7c.4 0 .7.3.7.7 0 .4-.3.7-.7.7-.4 0-.7-.3-.7-.7 0-.4.3-.7.7-.7zm3.9 0c.4 0 .7.3.7.7 0 .4-.3.7-.7.7-.4 0-.7-.3-.7-.7 0-.4.3-.7.7-.7z"
                />
              </svg>
            </div>
            <div class="pay-meta">
              <div class="pay-name">微信支付</div>
              <div class="pay-sub">扫码支付 · 安全便捷</div>
            </div>
            <div class="pay-check" v-if="paymentMethod === 1">✓</div>
          </button>

          <button
            class="pay-card" :class="[paymentMethod === 2 && 'selected']"
            @click="paymentMethod = 2"
          >
            <div class="pay-icon alipay-icon">
              <svg
                viewBox="0 0 32 32"
                width="32"
                height="32"
                fill="currentColor"
              >
                <path
                  d="M24.8 8.8c-1.3-1-3.3-2.2-5.5-2.7-1-.2-2-.4-2.9-.5l-.5-.1v-.1c0-.1 0-.1.1-.1 3.6-.4 6.4-2.1 6.4-2.1L21.9 1 20 2.3s-2.9 1.8-6.7 2.3c-.2 0-.5 0-.7.1L11.5 5l2.7 1.1c3.5.6 5.5 1.8 6.8 2.7 1.6 1.1 2.6 2.3 2.6 4.1 0 2.8-3 5.3-7.4 6.7-.8-.9-1.6-1.8-2.3-2.7-1.2 1.1-2.6 2.1-4 3.1l-3 1.7L7.7 25l1.9-1 2.3-1.2c3.2-1.7 6.2-3.7 7.9-6 2-2.6.5-4.7-.3-5.3-1-.7-2.5-1.3-5.2-1.5L8.3 9.7 7.7 7.6l4.3.1h.3c.8 0 1.6.1 2.4.2 1.3.1 2.8.4 4.1.9 2.2.9 3.8 2 4.5 2.8.4.5.7 1 .7 1.6 0 .5-.1.9-.2 1.2h5.9v-1.5l-.7.2c-.4-2.4-1.5-3.8-2-4.1zM4.5 6.4v2.6H7c.1.5.2 1 .4 1.4l-4 6.1c1.4.9 3.3 1.9 5.6 2-.5-.7-1-1.4-1.6-2.2L11 14.6l.6-.8c2-2.3 3.6-3 4.9-3-2-.9-3.5-1.7-3.9-2.2H4.5z"
                />
              </svg>
            </div>
            <div class="pay-meta">
              <div class="pay-name">支付宝</div>
              <div class="pay-sub">扫码支付 · 即时到账</div>
            </div>
            <div class="pay-check" v-if="paymentMethod === 2">✓</div>
          </button>
        </div>

        <button
          class="pay-btn"
          :disabled="creatingOrder || finalAmount < 1"
          @click="createOrder"
        >
          <template v-if="creatingOrder">创建订单中…</template>
          <template v-else>立即支付 ¥ {{ fmtMoney(finalAmount) }}</template>
        </button>
        <div v-if="orderError" class="pay-error">{{ orderError }}</div>
      </section>

      <!-- 充值明细 -->
      <section v-else-if="activeTab === 'records'" class="panel glass-card">
        <div class="panel-title">
          <h2>充值明细</h2>
          <span class="panel-hint">共 {{ rechargeTotal }} 条</span>
        </div>

        <div v-if="!isLoggedIn" class="empty-tip">
          请先
          <button class="link-btn" @click="ensureLogin()">登录</button>
          查看充值记录
        </div>

        <div
          v-else-if="!rechargeLoading && rechargeRecords.length === 0"
          class="empty-tip"
        >
          暂无充值记录，去
          <button class="link-btn" @click="activeTab = 'recharge'">
            立即充值
          </button>
          吧
        </div>

        <div v-else class="records-list">
          <div v-for="r in rechargeRecords" :key="r.id" class="record-row">
            <div class="record-left">
              <div class="record-title-row">
                <span class="record-title">
                  {{
                    r.paymentMethodLabel ||
                    (r.paymentMethod === 1
                      ? '微信支付'
                      : r.paymentMethod === 2
                        ? '支付宝'
                        : '后台调整')
                  }}
                </span>
                <span
                  class="record-status"
                  :style="{ color: statusColor(r.status) }"
                >
                  {{
                    r.statusLabel ||
                    (r.status === 10
                      ? '已支付'
                      : r.status === 20
                        ? '已取消'
                        : r.status === 30
                          ? '失败'
                          : '待支付')
                  }}
                </span>
              </div>
              <div class="record-sub-row">
                <span>订单号 {{ r.orderNo }}</span>
                <span>{{ fmtDate(r.paidAt || r.creationTime) }}</span>
              </div>
            </div>
            <div class="record-right">
              <div class="record-amount" :class="[r.status === 10 && 'success']">
                +¥{{ fmtMoney(r.creditedAmount) }}
              </div>
              <div class="record-amount-sub">
                实付 ¥{{ fmtMoney(r.amount) }}
              </div>
            </div>
          </div>

          <div v-if="rechargeLoading" class="load-tip">加载中…</div>
          <button
            v-else-if="hasMoreRecharge"
            class="load-more"
            @click="loadRechargeRecords()"
          >
            加载更多
          </button>
        </div>
      </section>

      <!-- 消费记录 -->
      <section v-else-if="activeTab === 'usage'" class="panel glass-card">
        <div class="panel-title">
          <h2>最近消费记录</h2>
        </div>
        <div v-if="!isLoggedIn" class="empty-tip">
          请先
          <button class="link-btn" @click="ensureLogin()">登录</button>
          查看消费记录
        </div>
        <div v-else-if="usageLoading" class="load-tip">加载中…</div>
        <div v-else-if="usageRecords.length === 0" class="empty-tip">
          暂无消费记录
        </div>
        <div v-else class="records-list">
          <div v-for="r in usageRecords" :key="r.id" class="record-row">
            <div class="record-left">
              <div class="record-title-row">
                <span class="record-title"
                  >{{ r.model }} · {{ r.quantity }} 张</span
                >
                <span
                  class="record-status"
                  :style="{
                    color:
                      r.status === 2
                        ? 'var(--color-success)'
                        : r.status === 3
                          ? 'var(--color-error)'
                          : 'var(--color-warning)',
                  }"
                >
                  {{
                    r.status === 2
                      ? '已成功'
                      : r.status === 3
                        ? '失败'
                        : r.status === 4
                          ? '已取消'
                          : '处理中'
                  }}
                </span>
              </div>
              <div class="record-sub-row">
                <span>任务 {{ (r.taskId || '').slice(0, 8) }}…</span>
                <span>{{ fmtDate(r.creationTime) }}</span>
              </div>
            </div>
            <div class="record-right">
              <div class="record-amount deduct">-¥{{ fmtMoney(r.amount) }}</div>
              <div class="record-amount-sub">
                单价 ¥{{ fmtMoney(r.unitPrice) }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 支付弹窗 -->
    <Teleport to="body">
      <div v-if="payingModal" class="pay-modal-mask" @click="closePayModal">
        <div class="pay-modal glass-card" @click.stop>
          <button class="close-x" @click="closePayModal">×</button>
          <div class="pm-head">
            <div class="pm-title" v-if="currentOrder">
              {{ paymentMethod === 1 ? '微信扫码支付' : '支付宝扫码支付' }}
            </div>
            <div class="pm-amount" v-if="currentOrder">
              <span class="currency">¥</span>{{ fmtMoney(currentOrder.amount) }}
            </div>
          </div>

          <div class="qr-wrap" v-if="currentOrder">
            <div class="qr-inner">
              <!-- 纯视觉伪二维码：SVG dot grid，不依赖外部库 -->
              <svg
                class="pseudo-qr"
                viewBox="0 0 220 220"
                width="220"
                height="220"
                aria-label="支付二维码"
              >
                <!-- 三个定位角 -->
                <rect
                  x="8"
                  y="8"
                  width="56"
                  height="56"
                  fill="#fff"
                  stroke="#111"
                  stroke-width="4"
                />
                <rect x="18" y="18" width="36" height="36" fill="#111" />
                <rect x="28" y="28" width="16" height="16" fill="#fff" />

                <rect
                  x="156"
                  y="8"
                  width="56"
                  height="56"
                  fill="#fff"
                  stroke="#111"
                  stroke-width="4"
                />
                <rect x="166" y="18" width="36" height="36" fill="#111" />
                <rect x="176" y="28" width="16" height="16" fill="#fff" />

                <rect
                  x="8"
                  y="156"
                  width="56"
                  height="56"
                  fill="#fff"
                  stroke="#111"
                  stroke-width="4"
                />
                <rect x="18" y="166" width="36" height="36" fill="#111" />
                <rect x="28" y="176" width="16" height="16" fill="#fff" />
              </svg>
              <!-- 伪矩阵：根据 orderNo hash 生成伪随机图案 -->
              <svg
                class="pseudo-qr-mask"
                viewBox="0 0 220 220"
                width="220"
                height="220"
                aria-hidden="true"
              >
                <PseudoQrDots :seed="currentOrder.orderNo" />
              </svg>

              <!-- 中心 logo -->
              <div
                class="qr-logo" :class="[
                  paymentMethod === 1 ? 'wechat-logo' : 'alipay-logo',
                ]"
              >
                <span v-if="paymentMethod === 1">微</span>
                <span v-else>支</span>
              </div>
            </div>
            <div class="qr-hint">
              打开
              {{ paymentMethod === 1 ? '微信' : '支付宝' }} 扫一扫，完成支付
            </div>
            <div class="qr-code-text" title="支付地址">
              {{ qrDisplayText }}
            </div>
          </div>

          <div v-if="currentOrder?.isDemoMode" class="demo-box">
            <div class="demo-title">演示模式 · 真实 SDK 未接入</div>
            <div class="demo-hint">
              实际生产需配置微信/支付宝商户号后替换二维码内容。点击下方按钮模拟「用户已支付」回调。
            </div>
            <button class="demo-pay-btn" :disabled="paying" @click="demoPay">
              {{ paying ? '处理中…' : '模拟支付成功' }}
            </button>
          </div>

          <div v-if="orderError" class="pay-error">{{ orderError }}</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.recharge-page {
  min-height: 100vh;
  color: var(--color-text-primary);
  background:
    radial-gradient(
      1200px 600px at 80% -10%,
      rgb(12 80 255 / 14%),
      transparent 60%
    ),
    radial-gradient(
      900px 500px at -10% 20%,
      rgb(255 60 120 / 10%),
      transparent 60%
    ),
    linear-gradient(
      180deg,
      var(--color-bg-secondary),
      var(--color-bg-primary) 40%
    );
}

.recharge-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
  background: color-mix(in oklab, var(--color-bg-secondary) 70%, transparent);
  border-bottom: 1px solid
    color-mix(in oklab, var(--color-border) 60%, transparent);
  backdrop-filter: blur(18px) saturate(150%);
}

.back-home {
  font-size: 13px;
  color: var(--color-text-secondary);
  letter-spacing: 0.2px;
  text-decoration: none;
}

.back-home:hover {
  color: var(--color-primary);
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.mini-btn {
  padding: 6px 14px;
  font-size: 13px;
  color: var(--color-text-primary);
  cursor: pointer;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  transition: all 0.15s ease;
}

.mini-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.user-name {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.recharge-main {
  max-width: 980px;
  padding: 32px 24px 80px;
  margin: 0 auto;
}

.glass-card {
  background: var(--color-bg-secondary);
  border: 1px solid color-mix(in oklab, var(--color-border) 70%, transparent);
  border-radius: 20px;
  box-shadow: 0 18px 50px rgb(0 0 0 / 12%);
  backdrop-filter: blur(24px) saturate(150%);
}

/* Wallet card */
.wallet-card {
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  padding: 26px 28px;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(
    135deg,
    rgb(54 127 255 / 95%),
    rgb(119 69 255 / 92%) 55%,
    rgb(255 107 166 / 88%)
  );
  border: none;
}

.wallet-left {
  position: relative;
  z-index: 2;
  flex: 1;
}

.wallet-label {
  font-size: 13px;
  letter-spacing: 1px;
  opacity: 0.85;
}

.wallet-amount {
  display: flex;
  gap: 4px;
  align-items: baseline;
  margin-top: 6px;
  font-weight: 700;
}

.wallet-amount .currency {
  font-size: 24px;
  line-height: 1;
}

.wallet-amount span:not(.currency),
.wallet-amount .wallet-loading {
  font-size: 48px;
  line-height: 1;
  letter-spacing: -1px;
}

.wallet-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  margin-top: 18px;
  font-size: 13px;
  opacity: 0.9;
}

.wallet-sub b {
  font-weight: 600;
  color: #fff;
  opacity: 1;
}

.wallet-bg-deco {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 260px;
  height: 260px;
  background: radial-gradient(
    circle at 30% 30%,
    rgb(255 255 255 / 35%),
    transparent 55%
  );
  border-radius: 50%;
  filter: blur(2px);
}

.wallet-right {
  position: relative;
  width: 220px;
}

/* Tabs */
.tab-nav {
  display: flex;
  gap: 6px;
  width: fit-content;
  padding: 4px;
  margin: 24px 2px 14px;
  background: color-mix(in oklab, var(--color-bg-secondary) 80%, transparent);
  border: 1px solid color-mix(in oklab, var(--color-border) 55%, transparent);
  border-radius: 14px;
}

.tab-btn {
  position: relative;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 9px 20px;
  font-size: 14px;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 10px;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--color-text-primary);
}

.tab-btn.active {
  color: #fff;
  background: linear-gradient(
    135deg,
    var(--color-primary),
    color-mix(in oklab, var(--color-primary) 70%, rgb(112 0 255))
  );
  box-shadow: 0 8px 22px
    color-mix(in oklab, var(--color-primary) 40%, transparent);
}

.tab-count {
  padding: 0 7px;
  font-size: 11px;
  background: rgb(255 255 255 / 18%);
  border-radius: 999px;
}

/* Panel */
.panel {
  padding: 24px 26px 26px;
}

.panel-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}

.panel-title h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.panel-hint {
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.payment-title {
  margin-top: 18px;
}

/* Amount grid */
.amount-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

@media (min-width: 600px) {
  .amount-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.amount-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 84px;
  padding: 22px 10px;
  cursor: pointer;
  background: var(--color-bg-primary);
  border: 1.5px solid var(--color-border);
  border-radius: 14px;
  transition: all 0.18s ease;
}

.amount-card:hover {
  border-color: color-mix(
    in oklab,
    var(--color-primary) 60%,
    var(--color-border)
  );
  transform: translateY(-1px);
}

.amount-card.selected {
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--color-primary) 10%, var(--color-bg-primary)),
    var(--color-bg-primary)
  );
  border-color: var(--color-primary);
  box-shadow:
    0 0 0 3px color-mix(in oklab, var(--color-primary) 18%, transparent),
    0 8px 22px color-mix(in oklab, var(--color-primary) 22%, transparent);
}

.amount-num {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.custom-input {
  width: 100%;
  max-width: 110px;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
  letter-spacing: -0.5px;
  appearance: textfield;
  outline: none;
  background: transparent;
  border: none;
}

.custom-input::-webkit-outer-spin-button,
.custom-input::-webkit-inner-spin-button {
  margin: 0;
  appearance: none;
}

.custom-suffix {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.amount-info-row {
  padding: 12px 16px;
  margin-top: 14px;
  background: color-mix(in oklab, var(--color-bg-primary) 70%, transparent);
  border: 1px dashed color-mix(in oklab, var(--color-border) 80%, transparent);
  border-radius: 12px;
}

.amount-hint {
  font-size: 13.5px;
  color: var(--color-text-secondary);
}

.amount-hint b {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
}

/* Payment cards */
.payment-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 600px) {
  .payment-row {
    grid-template-columns: 1fr 1fr;
  }
}

.pay-card {
  position: relative;
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px 18px;
  cursor: pointer;
  background: var(--color-bg-primary);
  border: 1.5px solid var(--color-border);
  border-radius: 14px;
  transition: all 0.18s ease;
}

.pay-card:hover {
  transform: translateY(-1px);
}

.pay-card.selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px
    color-mix(in oklab, var(--color-primary) 16%, transparent);
}

.pay-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
}

.wechat-icon {
  color: #07c160;
  background: color-mix(in oklab, #07c160 14%, transparent);
}

.alipay-icon {
  color: #1677ff;
  background: color-mix(in oklab, #1677ff 14%, transparent);
}

.pay-meta {
  flex: 1;
  text-align: left;
}

.pay-name {
  font-size: 15px;
  font-weight: 600;
}

.pay-sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.pay-check {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--color-primary);
  border-radius: 50%;
}

.pay-btn {
  width: 100%;
  padding: 15px 18px;
  margin-top: 22px;
  font-size: 15.5px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.3px;
  cursor: pointer;
  background: linear-gradient(
    135deg,
    var(--color-primary),
    color-mix(in oklab, var(--color-primary) 65%, rgb(120 20 255))
  );
  border: none;
  border-radius: 14px;
  box-shadow: 0 12px 26px
    color-mix(in oklab, var(--color-primary) 32%, transparent);
  transition: all 0.15s ease;
}

.pay-btn:hover:not(:disabled) {
  filter: brightness(1.03);
  transform: translateY(-1px);
}

.pay-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.pay-error {
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-error);
}

/* Records */
.empty-tip {
  padding: 56px 20px;
  font-size: 14px;
  color: var(--color-text-secondary);
  text-align: center;
}

.link-btn {
  padding: 0 2px;
  font-size: inherit;
  color: var(--color-primary);
  cursor: pointer;
  background: none;
  border: none;
}

.link-btn:hover {
  text-decoration: underline;
}

.records-list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--color-border) 70%, transparent);
  border-radius: 14px;
}

.record-row {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--color-bg-primary);
  border-bottom: 1px solid
    color-mix(in oklab, var(--color-border) 50%, transparent);
  transition: background 0.15s ease;
}

.record-row:last-child {
  border-bottom: none;
}

.record-row:hover {
  background: color-mix(
    in oklab,
    var(--color-primary) 5%,
    var(--color-bg-primary)
  );
}

.record-left {
  flex: 1;
  min-width: 0;
}

.record-title-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  font-size: 14.5px;
  font-weight: 600;
}

.record-status {
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 500;
}

.record-sub-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 5px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.record-right {
  flex-shrink: 0;
  text-align: right;
}

.record-amount {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.2px;
}

.record-amount.success {
  color: var(--color-success);
}

.record-amount.deduct {
  color: var(--color-text-primary);
}

.record-amount-sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.load-tip {
  padding: 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: center;
  border-top: 1px solid
    color-mix(in oklab, var(--color-border) 50%, transparent);
}

.load-more {
  width: 100%;
  padding: 12px;
  font-size: 13px;
  color: var(--color-primary);
  cursor: pointer;
  background: var(--color-bg-primary);
  border: none;
  border-top: 1px solid
    color-mix(in oklab, var(--color-border) 50%, transparent);
}

.load-more:hover {
  background: color-mix(
    in oklab,
    var(--color-primary) 5%,
    var(--color-bg-primary)
  );
}

/* Pay modal */
.pay-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: rgb(10 12 30 / 52%);
  backdrop-filter: blur(10px) saturate(140%);
  animation: mask-in 0.18s ease;
}

@keyframes mask-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.pay-modal {
  position: relative;
  width: min(420px, 92vw);
  padding: 28px 26px 26px;
  animation: modal-pop 0.24s cubic-bezier(0.2, 1.2, 0.3, 1);
}

@keyframes modal-pop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.close-x {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 30px;
  height: 30px;
  font-size: 22px;
  line-height: 1;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 50%;
  transition: all 0.15s;
}

.close-x:hover {
  color: var(--color-text-primary);
  background: color-mix(in oklab, var(--color-text-secondary) 12%, transparent);
}

.pm-head {
  text-align: center;
}

.pm-title {
  font-size: 14.5px;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
}

.pm-amount {
  display: inline-flex;
  gap: 3px;
  align-items: baseline;
  margin-top: 6px;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.pm-amount .currency {
  font-size: 22px;
}

.qr-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 22px;
}

.qr-inner {
  position: relative;
  padding: 16px;
  background: #fff;
  border-radius: 18px;
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 6%) inset,
    0 18px 40px rgb(0 0 0 / 10%);
}

.pseudo-qr,
.pseudo-qr-mask {
  display: block;
}

.pseudo-qr-mask {
  position: absolute;
  top: 16px;
  left: 16px;
}

.qr-logo {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  border-radius: 10px;
  box-shadow:
    0 0 0 4px #fff,
    0 6px 18px rgb(0 0 0 / 16%);
  transform: translate(-50%, -50%);
}

.wechat-logo {
  background: #07c160;
}

.alipay-logo {
  background: #1677ff;
}

.qr-hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.qr-code-text {
  max-width: 100%;
  max-width: 360px;
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  opacity: 0.7;
}

.demo-box {
  padding: 14px 16px;
  margin-top: 20px;
  background: linear-gradient(
    180deg,
    color-mix(in oklab, rgb(255 180 40) 10%, var(--color-bg-primary)),
    var(--color-bg-primary)
  );
  border: 1px solid
    color-mix(in oklab, rgb(255 180 40) 35%, var(--color-border));
  border-radius: 14px;
}

.demo-title {
  font-size: 13.5px;
  font-weight: 600;
  color: rgb(200 130 0);
}

.demo-hint {
  margin-top: 4px;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--color-text-secondary);
}

.demo-pay-btn {
  padding: 10px 16px;
  margin-top: 10px;
  font-size: 13.5px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, rgb(255 160 40), rgb(255 90 60));
  border: none;
  border-radius: 10px;
  transition: filter 0.15s;
}

.demo-pay-btn:hover:not(:disabled) {
  filter: brightness(1.05);
}

.demo-pay-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
