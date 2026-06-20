<script setup lang="ts">
import type { Order } from '#/types/order'
import GlassCard from '#/components/ui/GlassCard.vue'

defineProps<{
  order: Order
}>()

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: '待处理', class: 'status-pending' },
  processing: { label: '处理中', class: 'status-processing' },
  completed: { label: '已完成', class: 'status-completed' },
  cancelled: { label: '已取消', class: 'status-cancelled' },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <GlassCard :hoverable="false">
    <div class="order-summary">
      <div class="summary-header">
        <h3 class="summary-title">订单详情</h3>
        <span
          class="summary-status"
          :class="STATUS_MAP[order.status]?.class || 'status-pending'"
        >
          {{ STATUS_MAP[order.status]?.label || order.status }}
        </span>
      </div>

      <div class="summary-body">
        <div class="summary-row">
          <span class="summary-label">订单编号</span>
          <span class="summary-value font-mono">{{ order.id }}</span>
        </div>

        <div class="summary-row">
          <span class="summary-label">套餐 ID</span>
          <span class="summary-value">{{ order.packageId }}</span>
        </div>

        <div class="summary-row">
          <span class="summary-label">创建时间</span>
          <span class="summary-value">{{ formatDate(order.createdAt) }}</span>
        </div>

        <div class="summary-row">
          <span class="summary-label">联系人</span>
          <span class="summary-value">{{ order.contactName }}</span>
        </div>

        <div class="summary-row">
          <span class="summary-label">联系邮箱</span>
          <span class="summary-value">{{ order.contactEmail }}</span>
        </div>

        <div v-if="order.contactPhone" class="summary-row">
          <span class="summary-label">联系电话</span>
          <span class="summary-value">{{ order.contactPhone }}</span>
        </div>

        <div class="summary-divider" />

        <div class="summary-section">
          <span class="summary-label">项目需求</span>
          <p class="summary-requirements">{{ order.requirements }}</p>
        </div>
      </div>
    </div>
  </GlassCard>
</template>

<style scoped>
.order-summary {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.summary-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f0f0f5;
  margin: 0;
  font-family: var(--font-sans);
}

.summary-status {
  padding: 4px 14px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-pending {
  color: #f0a030;
  background: rgba(240, 160, 48, 0.1);
  border: 1px solid rgba(240, 160, 48, 0.2);
}

.status-processing {
  color: #4da6ff;
  background: rgba(77, 166, 255, 0.1);
  border: 1px solid rgba(77, 166, 255, 0.2);
}

.status-completed {
  color: #C8FF00;
  background: rgba(200, 255, 0, 0.1);
  border: 1px solid rgba(200, 255, 0, 0.2);
}

.status-cancelled {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.2);
}

.summary-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 0.85rem;
  color: #8888a0;
  font-weight: 500;
}

.summary-value {
  font-size: 0.9rem;
  color: #f0f0f5;
  font-weight: 500;
}

.font-mono {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: #C8FF00;
}

.summary-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 4px 0;
}

.summary-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-requirements {
  font-size: 0.9rem;
  color: #f0f0f5;
  line-height: 1.7;
  margin: 0;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  white-space: pre-wrap;
}
</style>