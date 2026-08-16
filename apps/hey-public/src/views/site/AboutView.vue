<script setup lang="ts">
import type { V2AboutData } from '@/api';

import { onMounted, ref } from 'vue';

import { fetchAboutData } from '@/api';
import BaseButton from '@/components/ui/BaseButton.vue';
import RevealOnScroll from '@/components/ui/RevealOnScroll.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { ArrowUpRight, Mail, MapPin, Quote } from 'lucide-vue-next';

const data = ref<V2AboutData>({ team: [], stats: [] });
const loading = ref(true);

const values = [
  {
    title: '效率优先',
    desc: '用 AI 压缩 90% 的重复劳动，让人专注真正有价值的创意决策',
  },
  {
    title: '品质至上',
    desc: '每个模板、每个模型都经过设计专家审核，输出即商用',
  },
  {
    title: '普惠设计',
    desc: '让中小企业与个体创业者，也享受大公司级的创意资源',
  },
  { title: '持续进化', desc: '每周迭代，把最新的 AI 能力第一时间带给用户' },
];

const timeline = [
  { year: '2018', event: 'Hey 19 设计工作室成立，服务 200+ 中小企业' },
  { year: '2021', event: '数字化升级，推出模板化设计服务' },
  { year: '2023', event: 'All-in AI，启动 AI 设计引擎研发' },
  { year: '2024', event: 'Hey AI 工作台上线，AI 生成突破 100 万张' },
  { year: '2026', event: '服务企业 5,000+，V2 全新界面发布' },
];

async function load() {
  const res = await fetchAboutData();
  if (res.code === 0) data.value = res.data;
  loading.value = false;
}

onMounted(load);
</script>

<template>
  <div class="about-page">
    <!-- Hero -->
    <section class="about-hero">
      <div class="container" style="text-align: center">
        <RevealOnScroll>
          <span class="section-eyebrow" style="justify-content: center"
            >关于我们</span
          >
          <h1 class="display-title">
            用 AI 重新定义<br /><span class="text-gradient">创意生产方式</span>
          </h1>
          <p
            class="section-desc"
            style="max-width: 58ch; margin: var(--sp-4) auto 0"
          >
            Hey 19
            诞生于一个简单信念：每个品牌都值得拥有高质量、高效率、高性价比的创意内容。
          </p>
        </RevealOnScroll>
      </div>
    </section>

    <!-- 品牌故事 -->
    <section class="story-section">
      <div class="container story-grid">
        <RevealOnScroll>
          <div class="story-copy">
            <span class="section-eyebrow">品牌故事</span>
            <h2 class="section-title">从"找设计师"到<br />"一句话出图"</h2>
            <p>
              在创办 Hey 19
              之前，我们的团队服务过数百家中小企业。我们发现，大多数品牌并非没有好想法，而是被高昂的创意成本、漫长的沟通周期和不可控的修改次数所困扰。
            </p>
            <p>
              2023 年，我们决定将 8 年设计经验与最新 AI
              技术结合，打造一个"说人话、出好图"的创意平台。无论你需要一张开业海报，还是一套完整的品牌
              VI，Hey 19 都能让创意生产像聊天一样自然。
            </p>
            <p class="quote">
              <Quote :size="18" /> AI 不会取代设计师，但会取代低效的重复劳动。
            </p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll :delay="120">
          <div class="timeline">
            <div v-for="(t, i) in timeline" :key="t.year" class="tl-item">
              <span
                class="tl-dot"
                :style="{ animationDelay: `${i * 0.4}s` }"
              ></span>
              <span class="tl-year">{{ t.year }}</span>
              <p>{{ t.event }}</p>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>

    <!-- 价值观 -->
    <section class="values-section">
      <div class="container">
        <RevealOnScroll>
          <header class="sec-head" style="margin: 0 auto; text-align: center">
            <span class="section-eyebrow" style="justify-content: center"
              >我们的价值观</span
            >
            <h2 class="section-title">驱动每一次创意交付</h2>
          </header>
        </RevealOnScroll>

        <div class="values-grid">
          <RevealOnScroll
            v-for="(v, i) in values"
            :key="v.title"
            :delay="i * 70"
          >
            <div class="value-card">
              <span class="value-num">0{{ i + 1 }}</span>
              <h3>{{ v.title }}</h3>
              <p>{{ v.desc }}</p>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>

    <!-- 团队 -->
    <section class="container section">
      <RevealOnScroll>
        <header class="sec-head" style="margin: 0 auto; text-align: center">
          <span class="section-eyebrow" style="justify-content: center"
            >核心团队</span
          >
          <h2 class="section-title">一群相信设计力量的创作者</h2>
        </header>
      </RevealOnScroll>

      <div v-if="loading"><Skeleton :rows="2" :lines="2" /></div>
      <div v-else class="team-grid">
        <RevealOnScroll v-for="(m, i) in data.team" :key="m.id" :delay="i * 70">
          <div class="team-card">
            <div class="team-avatar" :style="{ background: m.gradient }">
              {{ m.name[0] }}
            </div>
            <h3>{{ m.name }}</h3>
            <p class="team-role">{{ m.role }}</p>
            <span class="team-bio">{{ m.bio }}</span>
          </div>
        </RevealOnScroll>
      </div>
    </section>

    <!-- 数据 -->
    <section class="stats-band">
      <div class="container stats-grid">
        <div v-for="s in data.stats" :key="s.label" class="stat">
          <span class="stat-value">{{ s.value }}</span>
          <span class="stat-label">{{ s.label }}</span>
        </div>
      </div>
    </section>

    <!-- 联系 -->
    <section class="container section">
      <RevealOnScroll>
        <div class="contact-grid">
          <div class="contact-card">
            <div class="contact-icon"><Mail :size="22" /></div>
            <h3>商务合作</h3>
            <p>企业定制、API 接入、品牌全案服务</p>
            <a href="mailto:business@hey19.design"
              >business@hey19.design <ArrowUpRight :size="14"
            /></a>
          </div>
          <div class="contact-card">
            <div class="contact-icon"><MapPin :size="22" /></div>
            <h3>总部地址</h3>
            <p>中国 · 杭州 · 创意产业园 19 号</p>
            <BaseButton variant="outline" size="sm" to="/contact">
              预约参观
            </BaseButton>
          </div>
        </div>
      </RevealOnScroll>
    </section>

    <!-- 全新加入我们 -->
    <section class="container join-section">
      <RevealOnScroll>
        <div class="join-card noise">
          <div class="join-pattern"></div>
          <div class="join-content">
            <span class="section-eyebrow" style="color: #fff">加入 Hey 19</span>
            <h2 class="join-title">
              来和我们一起<br />
              <span class="join-grad">重新定义创作</span>
            </h2>
            <p class="join-desc">
              我们正在招前端工程师、AI 产品经理、品牌设计师与增长运营。 杭州 /
              远程办公，扁平组织，有竞争力的薪酬与股权激励。
            </p>
            <div class="join-meta">
              <div class="join-meta-item">
                <span class="join-meta-num">6</span>在招岗位
              </div>
              <div class="join-meta-item">
                <span class="join-meta-num">5</span>天回复
              </div>
              <div class="join-meta-item">
                <span class="join-meta-num">100%</span>弹性工作
              </div>
            </div>
            <div class="join-actions">
              <BaseButton variant="secondary" size="lg" to="/careers">
                查看所有岗位
              </BaseButton>
              <BaseButton
                variant="outline-light"
                size="lg"
                href="mailto:hr@hey19.design"
              >
                直接投递简历
              </BaseButton>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  padding-top: var(--sp-8);
}

.about-hero {
  padding: var(--sp-8) 0 var(--sp-9);
}

.story-section {
  padding: var(--sp-9) 0;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.story-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-8);
}

@media (min-width: 1024px) {
  .story-grid {
    grid-template-columns: 1.1fr 0.9fr;
    align-items: center;
  }
}

.story-copy .section-title {
  margin-bottom: var(--sp-5);
}

.story-copy p {
  margin-bottom: var(--sp-4);
  line-height: 1.9;
}

.quote {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  padding: var(--sp-4);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-accent) !important;
  background: var(--color-accent-soft);
  border-radius: var(--r-lg);
}

.quote svg {
  flex-shrink: 0;
}

.timeline {
  position: relative;
  padding-left: var(--sp-7);
}

.timeline::before {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 9px;
  width: 2px;
  content: '';
  background: linear-gradient(var(--color-accent), var(--color-ai));
  opacity: 0.4;
}

.tl-item {
  position: relative;
  padding-bottom: var(--sp-5);
}

.tl-dot {
  position: absolute;
  top: 7px;
  left: calc(-1 * var(--sp-7) + 5px);
  width: 10px;
  height: 10px;
  background: var(--color-accent);
  border-radius: 50%;
  box-shadow: 0 0 0 4px var(--color-accent-soft);
}

.tl-year {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-accent);
}

.tl-item p {
  margin-top: 0.3rem;
  font-size: var(--text-sm);
}

.values-section {
  padding: var(--sp-9) 0;
}

.values-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
  margin-top: var(--sp-6);
}

@media (min-width: 640px) {
  .values-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .values-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.value-card {
  position: relative;
  padding: var(--sp-6);
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  transition: all var(--dur-med) ease;
}

.value-card:hover {
  border-color: var(--color-border-strong);
  transform: translateY(-4px);
}

.value-num {
  position: absolute;
  top: -6px;
  right: 10px;
  font-family: var(--font-display);
  font-size: 4rem;
  font-weight: 700;
  color: var(--color-surface-3);
  opacity: 0.7;
}

.value-card h3 {
  margin-bottom: var(--sp-3);
  font-size: var(--text-lg);
}

.value-card p {
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.section {
  padding: var(--sp-9) 0;
}

.sec-head {
  margin-bottom: var(--sp-7);
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-5);
}

@media (min-width: 1024px) {
  .team-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.team-card {
  padding: var(--sp-6);
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  transition: all var(--dur-med) ease;
}

.team-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}

.team-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  margin: 0 auto var(--sp-4);
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: #fff;
  border-radius: 50%;
  box-shadow: var(--shadow-md);
}

.team-card h3 {
  margin-bottom: 2px;
  font-size: var(--text-lg);
}

.team-role {
  margin-bottom: 6px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-accent);
}

.team-bio {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.stats-band {
  padding: var(--sp-8) 0;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-6);
  text-align: center;
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.stat-value {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--color-accent);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.contact-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
}

@media (min-width: 768px) {
  .contact-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.contact-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
}

.contact-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-radius: var(--r-lg);
}

.contact-card h3 {
  font-size: var(--text-lg);
}

.contact-card p {
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.contact-card a {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-accent);
}

/* ===== 全新加入我们 ===== */
.join-section {
  padding-bottom: var(--sp-12);
}

.join-card {
  position: relative;
  padding: var(--sp-12) var(--sp-8);
  overflow: hidden;
  color: #fff;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8a5c 35%, #c026d3 100%);
  border-radius: var(--r-2xl);
  box-shadow: 0 24px 60px rgb(255 107 53 / 30%);
}

.join-pattern {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(
      circle at 20% 30%,
      rgb(255 255 255 / 18%) 0%,
      transparent 40%
    ),
    radial-gradient(
      circle at 80% 70%,
      rgb(255 255 255 / 12%) 0%,
      transparent 40%
    );
}

.join-card::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background-image:
    linear-gradient(rgb(255 255 255 / 8%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 8%) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.4;
  mask-image: radial-gradient(ellipse at center, black 0%, transparent 75%);
}

.join-content {
  position: relative;
  z-index: 1;
  max-width: 720px;
}

.join-title {
  margin: var(--sp-3) 0 var(--sp-4);
  font-size: clamp(var(--text-3xl), 5vw, var(--text-5xl));
  font-weight: 800;
  line-height: 1.1;
  color: #fff;
  letter-spacing: -0.02em;
}

.join-grad {
  color: transparent;
  background: linear-gradient(90deg, #fff, #ffe4d7);
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.join-desc {
  max-width: 60ch;
  margin-bottom: var(--sp-7);
  font-size: var(--text-lg);
  line-height: 1.7;
  color: rgb(255 255 255 / 92%);
}

.join-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-7);
  margin-bottom: var(--sp-7);
}

.join-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.join-meta-num {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 800;
  color: #fff;
}

.join-meta-item span:last-child {
  font-size: var(--text-sm);
  color: rgb(255 255 255 / 85%);
}

.join-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

/* 让"outline-light"变体在亮背景上也能看清 */
:deep(.btn--outline-light) {
  color: #fff;
  background: rgb(255 255 255 / 15%);
  border: 1.5px solid rgb(255 255 255 / 60%);
  backdrop-filter: blur(8px);
}

:deep(.btn--outline-light:hover) {
  color: #fff;
  background: rgb(255 255 255 / 25%);
  border-color: #fff;
}

:deep(.btn--secondary) {
  color: #ff6b35;
  background: #fff;
}

:deep(.btn--secondary:hover) {
  color: #fff;
  background: #0f2e2c;
}

@media (max-width: 640px) {
  .join-card {
    padding: var(--sp-9) var(--sp-5);
  }

  .join-meta {
    gap: var(--sp-5);
  }

  .join-meta-num {
    font-size: var(--text-2xl);
  }
}
</style>
