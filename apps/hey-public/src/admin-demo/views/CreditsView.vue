<script setup>
import { ref, onMounted } from 'vue'
import { Plus, TrendingDown } from 'lucide-vue-next'
import ABadge from '@admin-demo/components/ABadge.vue'
import { api } from '@admin-demo/api'
import { toast } from '@admin-demo/utils/toast'

const data = ref({ plans: [], tiers: [], logs: [] })
const logTone = { consume: 'neutral', recharge: 'success', refund: 'warning' }

onMounted(async () => {
  const res = await api.credits()
  data.value = res.data
})
</script>

<template>
  <div class="pg">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">积分与计费</h1>
        <p class="pg-sub">套餐管理 · 阶梯定价 · 积分流水</p>
      </div>
    </header>

    <!-- 套餐卡片 -->
    <p class="sec-label">订阅套餐</p>
    <div class="plan-grid">
      <div v-for="p in data.plans" :key="p.id" class="plan-card">
        <div class="plan-top">
          <span class="plan-name">{{ p.name }}</span>
          <span class="plan-price">{{ p.price == null ? '定制' : '¥' + Number(p.price).toLocaleString() }}</span>
        </div>
        <p class="plan-desc">{{ p.desc || p.description || '' }}</p>
        <p class="plan-credits">
          <template v-if="p.credits">{{ Number(p.credits).toLocaleString() }} 积分 / {{ (p.desc || '').includes('年') ? '年' : '期' }}</template>
          <template v-else>按需报价</template>
        </p>
        <button class="plan-edit" @click="toast.info('演示：编辑套餐')">编辑</button>
      </div>
      <button class="plan-add" @click="toast.info('演示：新增套餐')"><Plus :size="20" /> 新增套餐</button>
    </div>

    <!-- 阶梯定价 -->
    <p class="sec-label">阶梯定价（生成张数）</p>
    <div class="tier-card">
      <div v-for="t in data.tiers" :key="t.label" class="tier">
        <span class="tier-rate">{{ Math.round(t.rate * 100) }}%</span>
        <div>
          <p class="tier-label">{{ t.label }}</p>
          <p class="tier-desc">{{ t.desc }}</p>
        </div>
        <TrendingDown :size="16" class="tier-icon" />
      </div>
    </div>

    <!-- 积分流水 -->
    <p class="sec-label">最近积分流水</p>
    <div class="card table-card">
      <table class="tbl">
        <thead><tr><th>用户</th><th>类型</th><th>变动</th><th>场景</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="l in data.logs" :key="l.id">
            <td class="strong">{{ l.user }}</td>
            <td><ABadge :tone="logTone[l.type]">{{ { consume: '消耗', recharge: '充值', refund: '退还' }[l.type] }}</ABadge></td>
            <td class="num" :class="l.amount < 0 ? 'neg' : 'pos'">{{ l.amount > 0 ? '+' : '' }}{{ l.amount }}</td>
            <td class="muted">{{ l.scene }}</td>
            <td class="muted">{{ l.time }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.pg { max-width: 1240px; margin: 0 auto; }
.pg-head { margin-bottom: 20px; }
.pg-title { font-size: var(--text-2xl); }
.pg-sub { font-size: var(--text-sm); color: var(--color-text-3); margin-top: 4px; }
.sec-label { font-size: var(--text-sm); font-weight: 700; margin: 20px 0 12px; color: var(--color-text-1); }

.plan-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 1024px) { .plan-grid { grid-template-columns: repeat(3, 1fr); } }
.plan-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px;
  position: relative;
}
.plan-top { display: flex; align-items: center; justify-content: space-between; }
.plan-name { font-weight: 700; color: var(--color-text-1); font-size: var(--text-base); }
.plan-price { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; color: var(--color-accent); }
.plan-desc { font-size: var(--text-xs); color: var(--color-text-3); margin: 6px 0; }
.plan-credits { font-size: var(--text-sm); font-weight: 500; color: var(--color-text-2); }
.plan-edit {
  position: absolute; top: 14px; right: 14px;
  font-size: var(--text-xs); color: var(--color-accent);
  padding: 2px 8px; border-radius: var(--r-full); background: var(--color-accent-soft);
}
.plan-add {
  border: 2px dashed var(--color-border-strong);
  border-radius: 14px;
  color: var(--color-text-3);
  font-size: var(--text-sm);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  min-height: 100px;
  transition: all var(--dur-fast) ease;
}
.plan-add:hover { border-color: var(--color-accent); color: var(--color-accent); }

.tier-card { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (min-width: 1024px) { .tier-card { grid-template-columns: repeat(4, 1fr); } }
.tier {
  display: flex; align-items: center; gap: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px;
}
.tier-rate { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 800; color: var(--color-accent); }
.tier-label { font-size: var(--text-sm); font-weight: 600; color: var(--color-text-1); }
.tier-desc { font-size: var(--text-xs); color: var(--color-text-3); }
.tier-icon { margin-left: auto; color: var(--color-text-3); }

.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 14px; }
.table-card { overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
.tbl th { text-align: left; padding: 12px 16px; font-size: var(--text-xs); color: var(--color-text-3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--color-border); }
.tbl td { padding: 12px 16px; border-bottom: 1px dashed var(--color-border); color: var(--color-text-2); }
.tbl tr:last-child td { border-bottom: none; }
.strong { font-weight: 600; color: var(--color-text-1); }
.muted { color: var(--color-text-3); }
.num { font-family: var(--font-display); font-weight: 700; }
.num.neg { color: var(--color-error); }
.num.pos { color: var(--color-success); }
</style>