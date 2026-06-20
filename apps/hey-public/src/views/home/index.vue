<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import HeroSection from '#/features/hero/HeroSection.vue'
import ServiceCard from '#/features/services/ServiceCard.vue'
import SectionTitle from '#/components/ui/SectionTitle.vue'
import NeonButton from '#/components/ui/NeonButton.vue'
import BentoGrid from '#/components/ui/BentoGrid.vue'
import PortfolioGrid from '#/features/portfolio/PortfolioGrid.vue'
import ScrollReveal from '#/components/ui/ScrollReveal.vue'

const services = [
  {
    tag: '01',
    icon: 'mdi:lightbulb-on-outline',
    title: '品牌策略',
    description: '从市场洞察到品牌定位，构建完整的品牌基因体系，让你的品牌在竞争中脱颖而出。',
    features: ['品牌定位', '视觉识别', '传播策略', '竞品分析'],
  },
  {
    tag: '02',
    icon: 'mdi:robot-outline',
    title: 'AI创意设计',
    description: 'GPT-image2驱动的视觉内容生产，从海报到社交媒体素材，AI赋能创意无限。',
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
]

const dailyPrompts = [
  { prompt: '赛博朋克风格的咖啡品牌Logo，霓虹灯管效果，深色背景', label: '品牌Logo' },
  { prompt: '极简主义护肤品海报，白色大理石纹理背景，产品居中悬浮', label: '产品海报' },
  { prompt: '科技公司年度峰会主视觉，粒子流线汇聚成品牌标志', label: '活动主视觉' },
]
</script>

<template>
  <div class="home-page">
    <!-- Hero（不需要遮罩，直接显示） -->
    <HeroSection />

    <!-- Services Section -->
    <ScrollReveal>
      <section class="section">
        <div class="container-custom">
          <div class="reveal-stagger">
            <SectionTitle
              title="一站式创意解决方案"
              subtitle="从策略到执行，我们提供完整的品牌创意服务"
            />
            <BentoGrid :cols="4">
              <ServiceCard
                v-for="(svc, i) in services"
                :key="svc.tag"
                v-bind="svc"
                :style="{ transitionDelay: `${0.1 + i * 0.1}s` }"
              />
            </BentoGrid>
          </div>
        </div>
      </section>
    </ScrollReveal>

    <!-- Daily Inspiration -->
    <ScrollReveal>
      <section class="section inspo-section">
        <div class="container-custom">
          <div class="reveal-stagger">
            <SectionTitle
              title="每日灵感"
              subtitle="精选AI创意Prompt，激发你的创作灵感"
            />
            <div class="inspo-grid">
              <div
                v-for="(item, i) in dailyPrompts"
                :key="i"
                class="inspo-card glass-card glass-card-hover"
                :style="{ transitionDelay: `${0.1 + i * 0.15}s` }"
              >
                <span class="inspo-label">{{ item.label }}</span>
                <p class="inspo-prompt">{{ item.prompt }}</p>
                <RouterLink to="/studio" class="inspo-try btn-neon">试试这个</RouterLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>

    <!-- Portfolio Preview -->
    <ScrollReveal>
      <section class="section">
        <div class="container-custom">
          <div class="reveal-stagger">
            <SectionTitle
              title="精选案例"
              subtitle="用作品说话，看看我们为品牌做了什么"
            />
            <PortfolioGrid :limit="4" />
            <div class="text-center mt-8">
              <NeonButton to="/portfolio" variant="outline">
                查看全部案例
              </NeonButton>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>

    <!-- Stats -->
    <ScrollReveal>
      <section class="section stats-section">
        <div class="container-custom">
          <div class="stats-grid reveal-stagger">
            <div class="stat-item" style="transition-delay: 0.1s">
              <span class="stat-number text-neon">300+</span>
              <span class="stat-label">服务客户</span>
            </div>
            <div class="stat-item" style="transition-delay: 0.2s">
              <span class="stat-number text-neon">5000+</span>
              <span class="stat-label">AI生成作品</span>
            </div>
            <div class="stat-item" style="transition-delay: 0.3s">
              <span class="stat-number text-neon">98%</span>
              <span class="stat-label">客户满意度</span>
            </div>
            <div class="stat-item" style="transition-delay: 0.4s">
              <span class="stat-number text-neon">8年</span>
              <span class="stat-label">行业经验</span>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>

    <!-- CTA -->
    <ScrollReveal>
      <section class="section cta-section">
        <div class="cta-content reveal-stagger">
          <h2 class="cta-title">准备好让你的品牌<span class="text-neon">脱颖而出</span>？</h2>
          <p class="cta-subtitle" style="transition-delay: 0.15s">从AI创意到全案执行，我们为你提供一站式解决方案</p>
          <div class="cta-actions" style="transition-delay: 0.3s">
            <NeonButton to="/studio" variant="filled" size="lg">
              免费试用AI创作
            </NeonButton>
            <NeonButton to="/order" variant="outline" size="lg">
              在线下单
            </NeonButton>
          </div>
        </div>
      </section>
    </ScrollReveal>
  </div>
</template>

<style scoped>
.inspo-section {
  background: #0a0a0f;
}

.inspo-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 768px) {
  .inspo-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.inspo-card {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inspo-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #C8FF00;
  opacity: 0.7;
  font-weight: 600;
}

.inspo-prompt {
  color: #8888a0;
  font-size: 0.9rem;
  line-height: 1.6;
  flex: 1;
}

.inspo-try {
  align-self: flex-start;
  padding: 8px 18px;
  font-size: 0.8rem;
}

.stats-section {
  background: #0a0a0f;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-item {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-number {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  font-family: var(--font-mono);
}

.stat-label {
  font-size: 0.85rem;
  color: #8888a0;
}

.cta-section {
  text-align: center;
  padding: 80px 24px;
}

.cta-content {
  max-width: 800px;
  margin: 0 auto;
}

.cta-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 16px;
}

.cta-subtitle {
  font-size: 1.1rem;
  color: #8888a0;
  margin-bottom: 32px;
}

.cta-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>