<script setup lang="ts">
import type { OrderRequest, PricingPackage } from '#/types/order';

import { onMounted, ref } from 'vue';

import SectionTitle from '#/components/ui/SectionTitle.vue';
import { useOrderFlow } from '#/composables/useOrderFlow';
import OrderForm from '#/features/order/OrderForm.vue';
import OrderSummary from '#/features/order/OrderSummary.vue';
import PackageSelector from '#/features/order/PackageSelector.vue';
import { fetchPricing } from '#/utils/api';

const { placeOrder, isLoading, error, currentOrder } = useOrderFlow();

const pricingPackages = ref<PricingPackage[]>([]);
const pricingLoading = ref(false);
const pricingError = ref<null | string>(null);

const selectedPackage = ref<null | PricingPackage>(null);
const orderStep = ref<'form' | 'select' | 'summary'>('select');

onMounted(async () => {
  pricingLoading.value = true;
  try {
    const res = await fetchPricing();
    pricingPackages.value = res.data;
  } catch (error) {
    pricingError.value = (error as Error).message;
  } finally {
    pricingLoading.value = false;
  }
});

function handlePackageSelect(pkg: PricingPackage) {
  selectedPackage.value = pkg;
  orderStep.value = 'form';
}

function handleBackToSelect() {
  selectedPackage.value = null;
  orderStep.value = 'select';
}

async function handleOrderSubmit(formData: Omit<OrderRequest, 'packageId'>) {
  if (!selectedPackage.value) return;
  try {
    const orderData: OrderRequest = {
      packageId: selectedPackage.value.id,
      ...formData,
    };
    await placeOrder(orderData);
    orderStep.value = 'summary';
  } catch {
    // error is handled by useOrderFlow
  }
}

function handleNewOrder() {
  selectedPackage.value = null;
  orderStep.value = 'select';
}
</script>

<template>
  <div class="order-page">
    <!-- Hero Section -->
    <section class="section">
      <div class="container-custom">
        <SectionTitle
          title="在线下单"
          subtitle="选择套餐，填写需求，即可开启你的创意项目"
        />
      </div>
    </section>

    <!-- Step Indicator -->
    <section class="section step-section">
      <div class="container-custom">
        <div class="step-indicator">
          <div
            class="step"
            :class="{
              active: orderStep === 'select',
              done: orderStep !== 'select',
            }"
          >
            <div class="step-number">1</div>
            <span class="step-label">选择套餐</span>
          </div>
          <div
            class="step-line"
            :class="{ done: orderStep !== 'select' }"
          ></div>
          <div
            class="step"
            :class="{
              active: orderStep === 'form',
              done: orderStep === 'summary',
            }"
          >
            <div class="step-number">2</div>
            <span class="step-label">填写需求</span>
          </div>
          <div
            class="step-line"
            :class="{ done: orderStep === 'summary' }"
          ></div>
          <div class="step" :class="{ active: orderStep === 'summary' }">
            <div class="step-number">3</div>
            <span class="step-label">确认下单</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Step 1: Package Selector -->
    <section v-if="orderStep === 'select'" class="section">
      <div class="container-custom">
        <!-- Loading -->
        <div v-if="pricingLoading" class="loading-state">
          <div class="skeleton-card" v-for="n in 3" :key="n"></div>
        </div>

        <!-- Error -->
        <div v-else-if="pricingError" class="error-state">
          <p class="error-text">加载套餐失败：{{ pricingError }}</p>
          <button class="btn-neon" @click="onMounted">重试</button>
        </div>

        <!-- Packages -->
        <PackageSelector
          v-else
          :packages="pricingPackages"
          :selected-id="selectedPackage?.id ?? null"
          @select="handlePackageSelect"
        />
      </div>
    </section>

    <!-- Step 2: Order Form -->
    <section v-if="orderStep === 'form' && selectedPackage" class="section">
      <div class="container-custom">
        <div class="selected-package-badge">
          已选套餐：<span class="text-neon">{{ selectedPackage.name }}</span>
          &nbsp;&mdash;&nbsp;{{ selectedPackage.currency }}
          {{ selectedPackage.price }}
          <button class="badge-change" @click="handleBackToSelect">更换</button>
        </div>
        <OrderForm
          :is-loading="isLoading"
          :error="error"
          @submit="handleOrderSubmit"
          @back="handleBackToSelect"
        />
      </div>
    </section>

    <!-- Step 3: Order Summary -->
    <section v-if="orderStep === 'summary' && currentOrder" class="section">
      <div class="container-custom">
        <OrderSummary :order="currentOrder" :package="selectedPackage!" />
        <div class="summary-actions">
          <button class="btn-neon" @click="handleNewOrder">创建新订单</button>
          <RouterLink to="/" class="btn-neon-outline">返回首页</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.order-page {
  min-height: 100vh;
}

/* Step Indicator */
.step-section {
  padding-top: 0;
  padding-bottom: 0;
}

.step-indicator {
  display: flex;
  gap: 0;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
}

.step {
  display: flex;
  gap: 10px;
  align-items: center;
  opacity: 0.4;
  transition: opacity 0.3s ease;
}

.step.active {
  opacity: 1;
}

.step.done {
  opacity: 0.7;
}

.step-number {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  border: 2px solid var(--color-text-muted);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.step.active .step-number {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
}

.step.done .step-number {
  color: var(--color-neon);
  background: var(--color-neon-dim);
  border-color: var(--color-neon);
}

.step-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.step.active .step-label {
  color: var(--color-text-primary);
}

.step-line {
  flex: 1;
  min-width: 40px;
  height: 2px;
  margin: 0 16px;
  background: var(--color-text-muted);
  transition: background 0.3s ease;
}

.step-line.done {
  background: var(--color-neon-dim);
}

/* Selected Package Badge */
.selected-package-badge {
  padding: 12px 20px;
  margin-bottom: 28px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  text-align: center;
  background: var(--glass-bg);
  border: 1px solid var(--color-neon-dim);
  border-radius: 12px;
}

.badge-change {
  padding: 0;
  margin-left: 8px;
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--color-neon);
  text-decoration: underline;
  cursor: pointer;
  background: none;
  border: none;
}

.badge-change:hover {
  color: #d4ff2e;
}

/* Loading & Error */
.loading-state {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 768px) {
  .loading-state {
    grid-template-columns: repeat(3, 1fr);
  }
}

.skeleton-card {
  height: 320px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.3;
  }

  50% {
    opacity: 0.6;
  }
}

.error-state {
  padding: 48px 24px;
  text-align: center;
}

.error-text {
  margin-bottom: 20px;
  color: #f66;
}

/* Summary Actions */
.summary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  margin-top: 40px;
}

.btn-neon-outline {
  padding: 12px 28px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: 100px;
  transition: all 0.3s ease;
}

.btn-neon-outline:hover {
  color: var(--color-text-primary);
  border-color: var(--color-neon-dim);
}
</style>
