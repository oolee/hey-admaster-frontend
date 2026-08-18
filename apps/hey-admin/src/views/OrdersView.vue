<script setup>
import { computed, onMounted, ref } from 'vue';

import { Search } from 'lucide-vue-next';

import { api } from '#/api/demo';
import ABadge from '#/components/admin/ABadge.vue';

const orders = ref([]);
const keyword = ref('');
const statusFilter = ref('all');

const statusMeta = {
  paid: { tone: 'success', label: '已支付' },
  pending: { tone: 'warning', label: '待支付' },
  refunded: { tone: 'error', label: '已退款' },
  failed: { tone: 'neutral', label: '失败' },
};

const filtered = computed(() => {
  let list = orders.value;
  if (statusFilter.value !== 'all')
    list = list.filter((o) => o.status === statusFilter.value);
  const kw = keyword.value.toLowerCase();
  if (kw)
    list = list.filter(
      (o) =>
        String(o.user || '')
          .toLowerCase()
          .includes(kw) ||
        String(o.id || '')
          .toLowerCase()
          .includes(kw),
    );
  return list;
});
const totalRevenue = computed(() =>
  orders.value
    .filter((o) => o.status === 'paid')
    .reduce((s, o) => s + Number(o.amount || 0), 0),
);

onMounted(async () => {
  const res = await api.orders();
  // 兼容真实 API（customer/createdAt/status）与 mock 数据（user/date）
  orders.value = (res.data.list || []).map((o) => ({
    id: o.id || o.orderId || '-',
    user: o.customer || o.user || '—',
    item: o.name || o.item || o.planName || '订单',
    amount: Number(o.amount || 0),
    payMethod: o.pay_method || o.payMethod || '—',
    date: fmtDate(o.createdAt || o.date || o.created_at),
    status: o.status || 'pending',
  }));
});
function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d) ? String(iso) : d.toLocaleString('zh-CN');
}
function statusMetaOf(status) {
  return statusMeta[status] || { tone: 'neutral', label: status || '未知' };
}
</script>

<template>
  <div class="pg">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">订单管理</h1>
        <p class="pg-sub">
          已支付金额合计 ¥{{ totalRevenue.toLocaleString() }}
        </p>
      </div>
    </header>

    <div class="toolbar">
      <div class="search-box">
        <Search :size="15" />
        <input v-model="keyword" placeholder="搜索订单号 / 用户…" />
      </div>
      <div class="filter-tabs">
        <button
          :class="{ on: statusFilter === 'all' }"
          @click="statusFilter = 'all'"
        >
          全部
        </button>
        <button
          :class="{ on: statusFilter === 'paid' }"
          @click="statusFilter = 'paid'"
        >
          已支付
        </button>
        <button
          :class="{ on: statusFilter === 'pending' }"
          @click="statusFilter = 'pending'"
        >
          待支付
        </button>
        <button
          :class="{ on: statusFilter === 'refunded' }"
          @click="statusFilter = 'refunded'"
        >
          已退款
        </button>
      </div>
    </div>

    <div class="card table-card">
      <table class="tbl">
        <thead>
          <tr>
            <th>订单号</th>
            <th>用户</th>
            <th>商品</th>
            <th>金额</th>
            <th>支付方式</th>
            <th>时间</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in filtered" :key="o.id">
            <td class="mono">{{ o.id }}</td>
            <td class="strong">{{ o.user }}</td>
            <td>{{ o.item }}</td>
            <td class="num">¥{{ o.amount.toLocaleString() }}</td>
            <td class="muted">{{ o.payMethod }}</td>
            <td class="muted">{{ o.date }}</td>
            <td>
              <ABadge :tone="statusMetaOf(o.status).tone">
                {{ statusMetaOf(o.status).label }}
              </ABadge>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filtered.length" class="tbl-empty">没有匹配的订单</div>
    </div>
  </div>
</template>

<style scoped>
.pg {
  max-width: 1240px;
  margin: 0 auto;
}

.pg-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
}

.pg-title {
  font-size: var(--text-2xl);
}

.pg-sub {
  margin-top: 4px;
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.search-box {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 240px;
  height: 38px;
  padding: 0 12px;
  color: var(--color-text-3);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
}

.search-box:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--glow-accent);
}

.search-box input {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-text-1);
  background: transparent;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  background: var(--color-surface-2);
  border-radius: 10px;
}

.filter-tabs button {
  padding: 0.4rem 0.9rem;
  font-size: var(--text-sm);
  color: var(--color-text-3);
  border-radius: 8px;
}

.filter-tabs button.on {
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
}

.table-card {
  overflow-x: auto;
}

.tbl {
  width: 100%;
  font-size: var(--text-sm);
  border-collapse: collapse;
}

.tbl th {
  padding: 12px 16px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-3);
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  border-bottom: 1px solid var(--color-border);
}

.tbl td {
  padding: 12px 16px;
  color: var(--color-text-2);
  border-bottom: 1px dashed var(--color-border);
}

.tbl tr:last-child td {
  border-bottom: none;
}

.tbl tr:hover td {
  background: var(--color-surface-2);
}

.num {
  font-family: var(--font-display);
  font-weight: 600;
}

.muted {
  color: var(--color-text-3);
}

.mono {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.strong {
  font-weight: 600;
  color: var(--color-text-1);
}

.tbl-empty {
  padding: 40px;
  color: var(--color-text-3);
  text-align: center;
}
</style>
