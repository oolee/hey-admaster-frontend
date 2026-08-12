<script setup lang="ts">
import type { V2Plan } from '@/api';

import { onMounted, ref } from 'vue';

import { fetchPlans } from '@/api';
import Badge from '@/components/ui/Badge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import RevealOnScroll from '@/components/ui/RevealOnScroll.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import {
  Check,
  ChevronDown,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-vue-next';

const data = ref<{
  addons: { desc: string; id: string; name: string; price: string }[];
  faqs: { a: string; q: string }[];
  plans: V2Plan[];
}>({ plans: [], addons: [], faqs: [] });
const loading = ref(true);
const yearly = ref(false);
const openFaq = ref(0);

async function load() {
  const res = await fetchPlans();
  if (res.code === 0) data.value = res.data;
  loading.value = false;
}

function price(plan: V2Plan) {
  if (plan.price === null) return '定制';
  return yearly.value ? Math.round(plan.price * 10) : plan.price;
}

function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? -1 : i;
}

onMounted(load);
</script>

<template>
  <div class="pricing-page">
    <!-- 页头 -->
    <header class="pricing-head">
      <RevealOnScroll>
        <div class="container" style="text-align: center">
          <span class="section-eyebrow" style="justify-content: center"
            >服务与定价</span
          >
          <h1 class="display-title">
            为每一种创作需求<br />找到合适的<span class="text-gradient"
              >方案</span
            >
          </h1>
          <p class="section-desc" style="margin: var(--sp-4) auto 0">
            从按需体验到团队协作，灵活的定价让 AI 创意能力触手可及。
          </p>

          <div class="billing-toggle">
            <button :class="{ on: !yearly }" @click="yearly = false">
              按月
            </button>
            <button :class="{ on: yearly }" @click="yearly = true">
              按年 <Badge tone="success" class="save-badge">省 17%</Badge>
            </button>
          </div>
        </div>
      </RevealOnScroll>
    </header>

    <!-- 套餐 -->
    <section class="container" style="padding-bottom: var(--sp-9)">
      <div v-if="loading"><Skeleton :rows="3" :lines="5" /></div>

      <div v-else class="plans-grid">
        <RevealOnScroll
          v-for="(p, i) in data.plans"
          :key="p.id"
          :delay="i * 80"
        >
          <div class="plan-card" :class="{ featured: p.featured }">
            <div v-if="p.featured" class="plan-ribbon">
              <Sparkles :size="14" /> 最受欢迎
            </div>
            <h3>{{ p.name }}</h3>
            <p class="plan-desc">{{ p.desc }}</p>
            <div class="plan-price">
              <span class="cur">¥</span>
              <span class="amount">{{ price(p) }}</span>
              <span class="period"
                >/ {{ yearly && p.price !== null ? '年' : p.period }}</span
              >
            </div>

            <ul class="plan-features">
              <li v-for="f in p.features" :key="f">
                <span class="check"><Check :size="14" /></span> {{ f }}
              </li>
            </ul>

            <BaseButton
              :variant="p.featured ? 'primary' : 'outline'"
              size="lg"
              block
              :to="p.id === 'enterprise' ? '/about' : '/auth'"
            >
              {{ p.cta }}
            </BaseButton>
          </div>
        </RevealOnScroll>
      </div>
    </section>

    <!-- 信任点 -->
    <section class="trust container">
      <div class="trust-item">
        <ShieldCheck :size="22" />
        <div>
          <h4>商用授权保障</h4>
          <p>生成内容可放心商用</p>
        </div>
      </div>
      <div class="trust-item">
        <Zap :size="22" />
        <div>
          <h4>优先生成队列</h4>
          <p>高峰期不排队</p>
        </div>
      </div>
      <div class="trust-item">
        <RefreshCcw :size="22" />
        <div>
          <h4>随时取消</h4>
          <p>积分保留 30 天</p>
        </div>
      </div>
    </section>

    <!-- 附加服务 -->
    <section class="container section">
      <RevealOnScroll>
        <header class="sec-head">
          <span class="section-eyebrow">附加服务</span>
          <h2 class="section-title">按需定制，灵活扩展</h2>
        </header>
      </RevealOnScroll>
      <div class="addon-grid">
        <RevealOnScroll
          v-for="(a, i) in data.addons"
          :key="a.id"
          :delay="i * 60"
        >
          <div class="addon-card">
            <h3>{{ a.name }}</h3>
            <p>{{ a.desc }}</p>
            <span class="addon-price">{{ a.price }}</span>
          </div>
        </RevealOnScroll>
      </div>
    </section>

    <!-- FAQ -->
    <section class="container section">
      <RevealOnScroll>
        <header class="sec-head" style="margin: 0 auto; text-align: center">
          <span class="section-eyebrow" style="justify-content: center"
            >常见问题</span
          >
          <h2 class="section-title">你可能还想知道</h2>
        </header>
      </RevealOnScroll>

      <div class="faq-list">
        <RevealOnScroll v-for="(f, i) in data.faqs" :key="i" :delay="i * 50">
          <div class="faq-item" :class="{ open: openFaq === i }">
            <button class="faq-q" @click="toggleFaq(i)">
              {{ f.q }}
              <ChevronDown :size="18" class="faq-chevron" />
            </button>
            <Transition name="faq">
              <div v-show="openFaq === i" class="faq-a">
                <p>{{ f.a }}</p>
              </div>
            </Transition>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pricing-page {
  padding-top: var(--sp-8);
}

.pricing-head {
  padding: var(--sp-8) 0 var(--sp-8);
}

.billing-toggle {
  display: inline-flex;
  gap: 4px;
  padding: 5px;
  margin-top: var(--sp-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
}

.billing-toggle button {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.5rem 1.2rem;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-3);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.billing-toggle button.on {
  color: var(--color-text-inverse);
  background: var(--color-primary-deep);
}

.save-badge {
  padding: 2px 8px;
  font-size: 10px;
}

.plans-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-5);
}

@media (min-width: 768px) {
  .plans-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .plans-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--sp-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  transition: all var(--dur-med) var(--ease-out-expo);
}

.plan-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-5px);
}

.plan-card.featured {
  border: 2px solid var(--color-accent);
  box-shadow: var(--shadow-accent);
}

.plan-ribbon {
  position: absolute;
  top: -13px;
  left: 50%;
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 0.3rem 0.9rem;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-inverse);
  white-space: nowrap;
  background: var(--color-accent);
  border-radius: var(--r-full);
  transform: translateX(-50%);
}

.plan-card h3 {
  margin-bottom: var(--sp-2);
  font-size: var(--text-lg);
}

.plan-desc {
  min-height: 40px;
  margin-bottom: var(--sp-5);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.plan-price {
  display: flex;
  gap: 4px;
  align-items: baseline;
  margin-bottom: var(--sp-5);
}

.plan-price .cur {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-1);
}

.plan-price .amount {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--color-text-1);
  letter-spacing: -0.02em;
}

.plan-price .period {
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.plan-features {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.7rem;
  margin-bottom: var(--sp-6);
}

.plan-features li {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  font-size: var(--text-sm);
  color: var(--color-text-2);
}

.check {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-radius: 50%;
}

.trust {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
  padding-bottom: var(--sp-9);
}

@media (min-width: 768px) {
  .trust {
    grid-template-columns: repeat(3, 1fr);
  }
}

.trust-item {
  display: flex;
  gap: var(--sp-4);
  align-items: center;
  padding: var(--sp-5);
  color: var(--color-accent);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
}

.trust-item h4 {
  margin-bottom: 2px;
  font-size: var(--text-sm);
  color: var(--color-text-1);
}

.trust-item p {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.section {
  padding-top: var(--sp-9);
  padding-bottom: var(--sp-9);
}

.sec-head {
  margin-bottom: var(--sp-6);
}

.addon-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
}

@media (min-width: 640px) {
  .addon-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .addon-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.addon-card {
  padding: var(--sp-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  transition: all var(--dur-med) ease;
}

.addon-card:hover {
  border-color: var(--color-border-strong);
  transform: translateY(-3px);
}

.addon-card h3 {
  margin-bottom: var(--sp-2);
  font-size: var(--text-base);
}

.addon-card p {
  margin-bottom: var(--sp-4);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.addon-price {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-accent);
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  max-width: 760px;
  margin: 0 auto;
}

.faq-item {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  transition: border-color var(--dur-fast) ease;
}

.faq-item.open {
  border-color: var(--color-border-strong);
}

.faq-q {
  display: flex;
  gap: var(--sp-4);
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--sp-5);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-1);
  text-align: left;
}

.faq-chevron {
  flex-shrink: 0;
  color: var(--color-text-3);
  transition: transform 0.3s var(--ease-out-expo);
}

.faq-item.open .faq-chevron {
  color: var(--color-accent);
  transform: rotate(180deg);
}

.faq-a {
  padding: 0 var(--sp-5) var(--sp-5);
}

.faq-a p {
  font-size: var(--text-sm);
  line-height: 1.8;
}

.faq-enter-active,
.faq-leave-active {
  transition: all 0.3s var(--ease-out-expo);
}

.faq-enter-from,
.faq-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
