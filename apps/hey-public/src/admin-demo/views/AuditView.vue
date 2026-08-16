<script setup>
import { ref, onMounted } from 'vue'
import { Check, X, Eye, AlertTriangle } from 'lucide-vue-next'
import ABadge from '@admin-demo/components/ABadge.vue'
import { api } from '@admin-demo/api'
import { toast } from '@admin-demo/utils/toast'

const queue = ref([])
const riskTone = { high: 'error', medium: 'warning', low: 'neutral' }
const riskLabel = { high: '高风险', medium: '中风险', low: '低风险' }
const statusTone = { pending: 'warning', reviewing: 'ai', approved: 'success', rejected: 'error' }
const statusLabel = { pending: '待审核', reviewing: '复核中', approved: '已通过', rejected: '已拒绝' }

onMounted(async () => {
  const res = await api.audit()
  queue.value = res.data.list
})

function decide(item, pass) {
  item.status = pass ? 'approved' : 'rejected'
  toast.success(pass ? '已通过审核' : '已拒绝该内容')
}
</script>

<template>
  <div class="pg">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">内容审核</h1>
        <p class="pg-sub">AI 生成内容合规审核队列</p>
      </div>
    </header>

    <div class="audit-list">
      <div v-for="a in queue" :key="a.id" class="audit-item" :class="{ done: a.status === 'approved' || a.status === 'rejected' }">
        <div class="audit-icon" :class="`risk-${a.risk}`">
          <AlertTriangle :size="18" />
        </div>
        <div class="audit-main">
          <div class="audit-top">
            <span class="audit-id">{{ a.id }}</span>
            <ABadge :tone="riskTone[a.risk]">{{ riskLabel[a.risk] }}</ABadge>
            <ABadge :tone="statusTone[a.status]">{{ statusLabel[a.status] }}</ABadge>
          </div>
          <p class="audit-content">{{ a.content }}</p>
          <p class="audit-meta">{{ a.user }} · {{ a.type }} · {{ a.time }}</p>
        </div>
        <div v-if="a.status === 'pending' || a.status === 'reviewing'" class="audit-actions">
          <button class="decide pass" @click="decide(a, true)"><Check :size="15" /> 通过</button>
          <button class="decide reject" @click="decide(a, false)"><X :size="15" /> 拒绝</button>
          <button class="decide" @click="toast.info('演示：查看原图')"><Eye :size="15" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pg { max-width: 1240px; margin: 0 auto; }
.pg-head { margin-bottom: 20px; }
.pg-title { font-size: var(--text-2xl); }
.pg-sub { font-size: var(--text-sm); color: var(--color-text-3); margin-top: 4px; }

.audit-list { display: flex; flex-direction: column; gap: 12px; }
.audit-item {
  display: flex; align-items: flex-start; gap: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px;
}
.audit-item.done { opacity: 0.6; }
.audit-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.risk-high { background: color-mix(in srgb, var(--color-error) 13%, transparent); color: var(--color-error); }
.risk-medium { background: color-mix(in srgb, var(--color-warning) 13%, transparent); color: var(--color-warning); }
.risk-low { background: color-mix(in srgb, var(--color-success) 13%, transparent); color: var(--color-success); }

.audit-main { flex: 1; min-width: 0; }
.audit-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.audit-id { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-3); }
.audit-content { font-size: var(--text-sm); color: var(--color-text-1); margin-bottom: 6px; }
.audit-meta { font-size: var(--text-xs); color: var(--color-text-3); }

.audit-actions { display: flex; gap: 8px; flex-shrink: 0; }
.decide {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  transition: all var(--dur-fast) ease;
}
.decide.pass:hover { background: var(--color-success); color: #fff; }
.decide.reject:hover { background: var(--color-error); color: #fff; }
</style>