<script setup>
import { onMounted, ref } from 'vue';

import { DollarSign, PieChart, TrendingUp, Wallet } from 'lucide-vue-next';

import { api } from '#/api/demo';
import MiniChart from '#/components/admin/MiniChart.vue';

const data = ref({ stats: [], usage: [] });
const icons = { [Symbol.for('')]: Wallet };

const statIcons = [Wallet, TrendingUp, DollarSign, PieChart];

onMounted(async () => {
  const res = await api.usage();
  data.value = res.data;
});
</script>

<template>
  <div class="pg">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">用量与利润</h1>
        <p class="pg-sub">模型成本核算 · 毛利分析 · 用量监控</p>
      </div>
    </header>

    <div class="profit-grid">
      <div v-for="(s, i) in data.stats" :key="s.label" class="profit-card">
        <span class="p-icon"><component :is="statIcons[i]" :size="18" /></span>
        <div class="p-main">
          <span class="p-value">{{ s.value }}</span>
          <span class="p-label">{{ s.label }}</span>
        </div>
        <span class="p-note">{{ s.note }}</span>
      </div>
    </div>

    <div class="chart-grid">
      <div class="card">
        <div class="card-head">
          <h3>模型调用分布</h3>
          <span class="card-hint">近 30 日</span>
        </div>
        <MiniChart
          :points="
            data.usage.map((u) => ({
              label: u.model.split(' ')[0],
              value: u.calls,
            }))
          "
          type="bar"
        />
      </div>

      <div class="card">
        <div class="card-head"><h3>模型明细</h3></div>
        <div class="usage-table">
          <div v-for="u in data.usage" :key="u.model" class="usage-row">
            <span class="u-name">{{ u.model }}</span>
            <span class="u-calls">{{ u.calls.toLocaleString() }} 次</span>
            <span class="u-tokens">{{ u.tokens }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pg {
  max-width: 1240px;
  margin: 0 auto;
}

.pg-head {
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

.profit-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

@media (min-width: 1024px) {
  .profit-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.profit-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
}

.p-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-radius: 10px;
}

.p-main {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.p-value {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text-1);
}

.p-label {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.p-note {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-2);
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 1024px) {
  .chart-grid {
    grid-template-columns: 1.3fr 1fr;
  }
}

.card {
  padding: 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.card-head h3 {
  font-size: var(--text-base);
}

.card-hint {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.usage-table {
  display: flex;
  flex-direction: column;
}

.usage-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px dashed var(--color-border);
}

.usage-row:last-child {
  border-bottom: none;
}

.u-name {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-1);
}

.u-calls {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
}

.u-tokens {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}
</style>
