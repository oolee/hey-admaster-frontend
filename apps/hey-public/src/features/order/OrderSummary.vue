<script setup lang="ts">
import type { Order } from '#/types/order';

import GlassCard from '#/components/ui/GlassCard.vue';

defineProps<{
  order: Order;
}>();

const STATUS_MAP: Record<string, { class: string; label: string }> = {
  pending: { label: '待处理', class: 'status-pending' },
  processing: { label: '处理中', class: 'status-processing' },
  completed: { label: '已完成', class: 'status-completed' },
  cancelled: { label: '已取消', class: 'status-cancelled' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

        <div class="summary-divider"></div>

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
  margin: 0;
  font-family: var(--font-sans);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.summary-status {
  padding: 4px 14px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 9999px;
}

.status-pending {
  color: #f0a030;
  background: rgb(240 160 48 / 10%);
  border: 1px solid rgb(240 160 48 / 20%);
}

.status-processing {
  color: #4da6ff;
  background: rgb(77 166 255 / 10%);
  border: 1px solid rgb(77 166 255 / 20%);
}

.status-completed {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
}

.status-cancelled {
  color: #ff6b6b;
  background: rgb(255 107 107 / 10%);
  border: 1px solid rgb(255 107 107 / 20%);
}

.summary-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.summary-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.summary-value {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.font-mono {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-neon);
}

.summary-divider {
  height: 1px;
  margin: 4px 0;
  background: var(--color-border);
}

.summary-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-requirements {
  padding: 14px 16px;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--color-text-primary);
  white-space: pre-wrap;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}
</style>
