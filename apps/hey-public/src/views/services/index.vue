<script setup lang="ts">
import { ref } from 'vue';

import BentoGrid from '#/components/ui/BentoGrid.vue';
import SectionTitle from '#/components/ui/SectionTitle.vue';
import PricingTable from '#/features/services/PricingTable.vue';
import ServiceCard from '#/features/services/ServiceCard.vue';

const services = [
  {
    tag: '01',
    icon: 'mdi:lightbulb-on-outline',
    title: '品牌策略',
    description:
      '从市场洞察到品牌定位，构建完整的品牌基因体系，让你的品牌在竞争中脱颖而出。',
    features: ['品牌定位', '视觉识别', '传播策略', '竞品分析'],
  },
  {
    tag: '02',
    icon: 'mdi:robot-outline',
    title: 'AI创意设计',
    description:
      'GPT-image2驱动的视觉内容生产，从海报到社交媒体素材，AI赋能创意无限。',
    features: ['AI生图', '模板定制', '批量生产', '风格迁移'],
  },
  {
    tag: '03',
    icon: 'mdi:video-outline',
    title: '视频制作',
    description: '从创意脚本到后期成片，全流程视频制作服务，打造品牌视觉故事。',
    features: ['创意脚本', '拍摄制作', '后期剪辑', '3D动画'],
  },
  {
    tag: '04',
    icon: 'mdi:chart-line',
    title: '数字营销',
    description: '数据驱动的精准投放与优化，让每一分预算都花在刀刃上。',
    features: ['SEM/SEO', '信息流投放', '数据分析', 'A/B测试'],
  },
];

const activeTab = ref<'pricing' | 'services'>('services');
</script>

<template>
  <div class="services-page">
    <!-- Hero Section -->
    <section class="section">
      <div class="container-custom">
        <SectionTitle
          title="我们的服务"
          subtitle="从品牌策略到AI创意执行，一站式解决方案助力品牌成长"
        />
      </div>
    </section>

    <!-- Tab Navigation -->
    <section class="section tab-section">
      <div class="container-custom">
        <div class="tab-nav">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'services' }"
            @click="activeTab = 'services'"
          >
            服务内容
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'pricing' }"
            @click="activeTab = 'pricing'"
          >
            套餐价格
          </button>
        </div>
      </div>
    </section>

    <!-- Services Tab -->
    <section v-if="activeTab === 'services'" class="section">
      <div class="container-custom">
        <BentoGrid :cols="4">
          <ServiceCard v-for="svc in services" :key="svc.tag" v-bind="svc" />
        </BentoGrid>
      </div>
    </section>

    <!-- Pricing Tab -->
    <section v-if="activeTab === 'pricing'" class="section">
      <div class="container-custom">
        <div class="pricing-intro">
          <h3 class="pricing-title">透明定价，灵活选择</h3>
          <p class="pricing-subtitle">
            根据你的需求选择合适的套餐，所有套餐均包含专业创意服务
          </p>
        </div>
        <PricingTable />
      </div>
    </section>

    <!-- CTA -->
    <section class="section cta-section">
      <div class="cta-content">
        <h2 class="cta-title">
          找到适合你的<span class="text-neon">创意方案</span>
        </h2>
        <p class="cta-subtitle">不确定哪个方案适合你？联系我们获取定制化方案</p>
        <RouterLink to="/order" class="btn-neon">立即下单</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.services-page {
  min-height: 100vh;
}

.tab-section {
  padding-top: 0;
  padding-bottom: 0;
}

.tab-nav {
  display: flex;
  gap: 4px;
  justify-content: center;
  width: fit-content;
  padding: 6px;
  margin: 0 auto;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 100px;
}

.tab-btn {
  padding: 10px 28px;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 100px;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  color: var(--color-text-primary);
}

.tab-btn.active {
  font-weight: 600;
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.pricing-intro {
  margin-bottom: 40px;
  text-align: center;
}

.pricing-title {
  margin-bottom: 8px;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.pricing-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

.cta-section {
  padding: 80px 24px;
  text-align: center;
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-border);
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
}

.cta-title {
  margin-bottom: 12px;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  line-height: 1.15;
}

.cta-subtitle {
  margin-bottom: 28px;
  font-size: 1rem;
  color: var(--color-text-secondary);
}
</style>
