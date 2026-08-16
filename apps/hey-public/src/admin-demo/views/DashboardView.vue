<script setup>
import { ref, onMounted } from 'vue'
import { Coins, ShoppingCart, Users, Sparkles, TrendingUp, Wallet, Download, RefreshCw } from 'lucide-vue-next'
import MiniChart from '@admin-demo/components/MiniChart.vue'
import { api } from '@admin-demo/api'
import { toast } from '@admin-demo/utils/toast'

const data = ref({ stats: [], revenueTrend: [], modelUsage: [] })
const loading = ref(true)

const statIcons = { yuan: Coins, orders: ShoppingCart, users: Users, gen: Sparkles, profit: TrendingUp, cost: Wallet }

onMounted(async () => {
  const res = await api.dashboard()
  data.value = res.data
  loading.value = false
})
</script>

<template>
  <div class="pg">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">数据看板</h1>
        <p class="pg-sub">Hey 19 平台经营概况 · 数据截至今日 04:00</p>
      </div>
      <div class="pg-actions">
        <button class="act-btn" @click="toast.info('已导出 CSV')"><Download :size="15" /> 导出</button>
        <button class="act-btn" @click="toast.info('刷新成功')"><RefreshCw :size="15" /> 刷新</button>
      </div>
    </header>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div v-for="s in data.stats" :key="s.key" class="stat-card">
        <div class="stat-icon" :class="s.up ? 'up' : 'down'">
          <component :is="statIcons[s.icon]" :size="18" />
        </div>
        <div class="stat-main">
          <span class="stat-label">{{ s.label }}</span>
          <span class="stat-value">{{ s.value }}</span>
        </div>
        <span class="stat-trend" :class="s.up ? 'up' : 'down'">{{ s.trend }}</span>
      </div>
    </div>

    <div class="chart-grid">
      <!-- 营收趋势 -->
      <div class="card chart-wide">
        <div class="card-head">
          <h3>营收与成本趋势</h3>
          <span class="card-hint">近 7 个月</span>
        </div>
        <MiniChart
          :points="data.revenueTrend.map(r => ({ label: r.label, value: r.revenue }))"
          :series2="data.revenueTrend.map(r => ({ label: r.label, value: r.cost }))"
          type="area"
          series2-label="营收"
        />
      </div>

      <!-- 模型调用量 -->
      <div class="card">
        <div class="card-head">
          <h3>模型调用 TOP 6</h3>
          <span class="card-hint">今日</span>
        </div>
        <div class="model-rank">
          <div v-for="m in data.modelUsage" :key="m.model" class="rank-row">
            <span class="rank-name">{{ m.model }}</span>
            <div class="rank-bar">
              <div class="rank-fill" :style="{ width: (m.calls / data.modelUsage[0].calls * 100) + '%' }"></div>
            </div>
            <span class="rank-val">{{ m.calls.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pg { max-width: 1240px; margin: 0 auto; }
.pg-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 20px; }
.pg-title { font-size: var(--text-2xl); }
.pg-sub { font-size: var(--text-sm); color: var(--color-text-3); margin-top: 4px; }
.pg-actions { display: flex; gap: 10px; }
.act-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-2);
  font-size: var(--text-sm);
  font-weight: 500;
  transition: all var(--dur-fast) ease;
}
.act-btn:hover { border-color: var(--color-accent); color: var(--color-accent); }

.stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 20px; }
@media (min-width: 1024px) { .stat-grid { grid-template-columns: repeat(6, 1fr); } }
.stat-card {
  display: flex; flex-direction: column; gap: 8px;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  position: relative;
}
.stat-icon {
  width: 34px; height: 34px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.stat-icon.up { background: var(--color-accent-soft); color: var(--color-accent); }
.stat-icon.down { background: color-mix(in srgb, var(--color-success) 13%, transparent); color: var(--color-success); }
.stat-main { display: flex; flex-direction: column; }
.stat-label { font-size: var(--text-xs); color: var(--color-text-3); }
.stat-value { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; color: var(--color-text-1); }
.stat-trend { position: absolute; top: 16px; right: 16px; font-size: var(--text-xs); font-weight: 700; }
.stat-trend.up { color: var(--color-success); }
.stat-trend.down { color: var(--color-error); }

.chart-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 1024px) { .chart-grid { grid-template-columns: 1.4fr 1fr; } }
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 18px;
}
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.card-head h3 { font-size: var(--text-base); }
.card-hint { font-size: var(--text-xs); color: var(--color-text-3); }

.model-rank { display: flex; flex-direction: column; gap: 12px; }
.rank-row { display: flex; align-items: center; gap: 10px; }
.rank-name { width: 110px; font-size: var(--text-xs); color: var(--color-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
.rank-bar { flex: 1; height: 8px; border-radius: 4px; background: var(--color-surface-2); overflow: hidden; }
.rank-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--color-accent), var(--color-ai)); }
.rank-val { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-1); min-width: 52px; text-align: right; }
</style>