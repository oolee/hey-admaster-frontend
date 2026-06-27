<script setup lang="ts">
import GlassCard from '#/components/ui/GlassCard.vue';
import SectionTitle from '#/components/ui/SectionTitle.vue';

const stats = [
  { value: '300+', label: '服务客户' },
  { value: '5000+', label: 'AI生成作品' },
  { value: '98%', label: '客户满意度' },
  { value: '8年', label: '行业经验' },
];

const milestones = [
  { year: '2018', event: '创立于云南曲靖陆良县，主营广告设计、制作、安装' },
  { year: '2020', event: '服务客户突破100家，扩展打印、图文业务' },
  { year: '2022', event: '引入数字化设计工具，提升设计效率' },
  { year: '2024', event: '服务客户突破300家，业务覆盖陆良全域' },
  { year: '2026', event: '正式接入AI技术，开启智慧广告新篇章' },
  { year: '未来', event: '打造县域广告AI服务平台，让科技服务本地商业' },
];
</script>

<template>
  <div class="about-page">
    <!-- Hero Section -->
    <section class="section">
      <div class="container-custom">
        <SectionTitle
          title="关于我们"
          subtitle="扎根陆良，服务本地，用AI技术赋能传统广告"
        />
      </div>
    </section>

    <!-- Company Intro -->
    <section class="section intro-section">
      <div class="container-custom">
        <GlassCard>
          <div class="intro-content">
            <div class="intro-text">
              <h2 class="intro-heading">我们是谁</h2>
              <p class="intro-paragraph">
                Hey 19 是一家扎根于云南曲靖陆良县的广告公司，成立于2018年。
                我们深耕本地广告行业8年，服务超过300家客户。
              </p>
              <p class="intro-paragraph">
                从门头店招到文化墙，从标识标牌到打印图文，
                我们提供广告设计、制作、安装一条龙服务。
                无论是街边小店的招牌，还是企业单位的文化墙，我们都用心做好每一件作品。
              </p>
              <p class="intro-paragraph">
                2025年，我们正式接入AI技术，用人工智能赋能传统广告设计，
                让每一个本地商家都能以更低的成本、更快的速度，获得专业级的视觉设计服务。
              </p>
            </div>
            <div class="intro-visual">
              <div class="service-tags">
                <span class="service-tag">门头店招</span>
                <span class="service-tag">文化墙</span>
                <span class="service-tag">标识标牌</span>
                <span class="service-tag">打印图文</span>
                <span class="service-tag">AI设计</span>
                <span class="service-tag">安装制作</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="section stats-section">
      <div class="container-custom">
        <div class="stats-grid">
          <div v-for="stat in stats" :key="stat.label" class="stat-item">
            <span class="stat-number text-neon">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Milestones -->
    <section class="section">
      <div class="container-custom">
        <SectionTitle
          title="发展历程"
          subtitle="从传统广告到AI赋能，每一步都脚踏实地"
          align="center"
        />
        <div class="milestones">
          <div
            v-for="(m, i) in milestones"
            :key="m.year"
            class="milestone-item"
          >
            <div class="milestone-dot">
              <div class="milestone-inner"></div>
            </div>
            <div class="milestone-content">
              <span class="milestone-year">{{ m.year }}</span>
              <p class="milestone-event">{{ m.event }}</p>
            </div>
            <div v-if="i < milestones.length - 1" class="milestone-line"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section class="section contact-section">
      <div class="container-custom">
        <SectionTitle
          title="联系我们"
          subtitle="期待与你的合作，让我们一起创造令人眼前一亮的作品"
          align="center"
        />
        <GlassCard>
          <div class="contact-grid">
            <div class="contact-item">
              <span class="contact-label">公司地址</span>
              <span class="contact-value">云南省曲靖市陆良县龙湖一号</span>
            </div>
            <div class="contact-item">
              <span class="contact-label">服务热线</span>
              <span class="contact-value">137 6916 6043 / 152 8718 9859</span>
            </div>
            <div class="contact-item">
              <span class="contact-label">邮箱</span>
              <span class="contact-value">342831363@qq.com</span>
            </div>
            <div class="contact-item">
              <span class="contact-label">工作时间</span>
              <span class="contact-value">周一至周六 8:30 - 19:00</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  min-height: 100vh;
}

/* Company Intro */
.intro-section {
  padding-top: 0;
}

.intro-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
  align-items: center;
}

@media (min-width: 768px) {
  .intro-content {
    grid-template-columns: 1.5fr 1fr;
  }
}

.intro-heading {
  margin: 0 0 20px;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.intro-paragraph {
  margin: 0 0 16px;
  font-size: 0.95rem;
  line-height: 1.8;
  color: var(--color-text-secondary);
}

.intro-paragraph:last-child {
  margin-bottom: 0;
}

.intro-visual {
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.service-tag {
  padding: 10px 20px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
  transition: all 0.3s ease;
}

.service-tag:hover {
  background: var(--color-neon-dim);
  border-color: var(--color-neon-dim);
  transform: translateY(-2px);
}

/* Stats Section */
.stats-section {
  background: var(--color-bg-primary);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
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
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.stat-number {
  font-family: var(--font-mono);
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

/* Milestones */
.milestones {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}

.milestone-item {
  position: relative;
  padding-bottom: 32px;
  padding-left: 36px;
}

.milestone-item:last-child {
  padding-bottom: 0;
}

.milestone-dot {
  position: absolute;
  top: 4px;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-neon-dim);
  border-radius: 50%;
}

.milestone-inner {
  width: 6px;
  height: 6px;
  background: var(--color-neon);
  border-radius: 50%;
}

.milestone-line {
  position: absolute;
  top: 24px;
  bottom: 0;
  left: 7px;
  width: 2px;
  background: var(--color-neon-dim);
}

.milestone-content {
  padding-bottom: 4px;
}

.milestone-year {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-neon);
  letter-spacing: 0.05em;
}

.milestone-event {
  margin: 4px 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

/* Contact Section */
.contact-section {
  padding-bottom: 80px;
}

.contact-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 640px) {
  .contact-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.contact-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contact-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-neon);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.6;
}

.contact-value {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-text-primary);
}
</style>
