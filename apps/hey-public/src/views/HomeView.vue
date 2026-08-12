<script setup lang="ts">
import type { V2HomeData, V2Stat } from '@/api';

import { onBeforeUnmount, onMounted, ref } from 'vue';

import { fetchHomeData } from '@/api';
import ArtCanvas from '@/components/ui/ArtCanvas.vue';
import Badge from '@/components/ui/Badge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import MagneticButton from '@/components/ui/MagneticButton.vue';
import Marquee from '@/components/ui/Marquee.vue';
import RevealOnScroll from '@/components/ui/RevealOnScroll.vue';
import TiltCard from '@/components/ui/TiltCard.vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  ChevronRight,
  ImageIcon,
  Megaphone,
  PenTool,
  Sparkles,
  Video,
  Wand2,
} from 'lucide-vue-next';

gsap.registerPlugin(ScrollTrigger);

const data = ref<V2HomeData>({ stats: [], cases: [], templates: [] });
const loading = ref(true);

const services = [
  {
    icon: PenTool,
    title: '品牌策略',
    desc: 'AI 洞察行业，帮你找准定位与调性',
    tags: ['定位分析', '视觉调性'],
  },
  {
    icon: ImageIcon,
    title: 'AI 创意设计',
    desc: '一句话生成海报、Logo、名片、门头',
    tags: ['文生图', '智能排版'],
  },
  {
    icon: Video,
    title: '视频制作',
    desc: '脚本·分镜·配音·剪辑一站式完成',
    tags: ['短视频', '宣传片'],
  },
  {
    icon: Megaphone,
    title: '数字营销',
    desc: '从投放素材到数据复盘的增长方案',
    tags: ['社媒运营', '增长'],
  },
];

const marqueeWords = [
  '门头店招',
  '海报设计',
  '宣传单 DM',
  'VI 设计',
  'Logo 设计',
  '名片设计',
  '3D 效果图',
  '室内设计',
  '视频制作',
  '社媒内容',
];

const counters = ref<Array<V2Stat & { display: string }>>([]);

async function load() {
  const res = await fetchHomeData();
  data.value = res.data;
  loading.value = false;
  animateCounters();
}

function animateCounters() {
  counters.value = data.value.stats.map((s) => ({ ...s, display: '0' }));
  requestAnimationFrame(() => {
    data.value.stats.forEach((s, i) => {
      const target = Number.parseFloat(s.value.replaceAll(',', ''));
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: 1.6,
        delay: 0.2 * i,
        ease: 'power2.out',
        onUpdate: () => {
          const isInt = Number.isInteger(target);
          const counter = counters.value[i];
          if (counter)
            counter.display =
              (isInt ? Math.round(obj.v) : obj.v.toFixed(0)) +
              (isInt ? '' : '');
        },
      });
    });
  });
}

onMounted(() => {
  load();
  const ctx = gsap.context(() => {
    gsap.fromTo(
      '.hero-title .line',
      { yPercent: 110, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 1,
        stagger: 0.12,
        ease: 'power4.out',
        delay: 0.15,
      },
    );
    gsap.fromTo(
      '.hero-fade',
      { y: 24, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        stagger: 0.1,
        ease: 'power2.out',
        delay: 0.6,
      },
    );
    gsap.to('.hero-art', {
      y: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
      },
    });
  });
  onBeforeUnmount(() => ctx.revert());
});
</script>

<template>
  <div class="home">
    <!-- ======== HERO ======== -->
    <section class="hero">
      <div class="hero-bg bg-grid"></div>
      <div class="hero-glow"></div>

      <div class="container hero-grid-layout">
        <div class="hero-copy">
          <div class="hero-badge hero-fade">
            <span class="live-dot"></span>
            Hey 19 全新 V2 上线 · AI 创作引擎全面升级
          </div>

          <h1 class="hero-title display-title">
            <span class="line">把灵感，</span>
            <span class="line"
              >变成<span class="text-gradient">品牌资产</span></span
            >
          </h1>

          <p class="hero-desc hero-fade">
            从门头店招到海报传单，从 Logo 到整套 VI —— 用对话的方式驱动
            AI，几分钟内产出专业级设计。
          </p>

          <div class="hero-actions hero-fade">
            <MagneticButton>
              <BaseButton variant="primary" size="xl" to="/workspace">
                <Wand2 :size="19" /> 开始创作
              </BaseButton>
            </MagneticButton>
            <MagneticButton>
              <BaseButton variant="outline" size="xl" to="/cases">
                浏览案例 <ArrowRight :size="17" />
              </BaseButton>
            </MagneticButton>
          </div>

          <div class="hero-stats hero-fade">
            <div v-for="s in counters" :key="s.label" class="hstat">
              <span class="hstat-value"
                >{{ s.display }}<em>{{ s.suffix }}</em></span
              >
              <span class="hstat-label">{{ s.label }}</span>
            </div>
          </div>
        </div>

        <div class="hero-art">
          <TiltCard :max="7">
            <div class="hero-frame">
              <ArtCanvas variant="poster" :seed="1" label="AI 生成海报示例" />
              <div class="hero-frame-tag">
                <Sparkles :size="14" /> 由 Hey 19 AI 实时生成
              </div>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>

    <!-- ======== 服务跑马灯 ======== -->
    <section class="marquee-section">
      <Marquee :duration="28">
        <span v-for="w in marqueeWords" :key="w" class="marquee-word">
          {{ w }} <span class="marquee-star">✦</span>
        </span>
      </Marquee>
    </section>

    <!-- ======== 服务 ======== -->
    <section class="section container">
      <RevealOnScroll>
        <header class="sec-head">
          <span class="section-eyebrow">一站式创意解决方案</span>
          <h2 class="section-title">
            从策略到执行<br />全链路 <span class="text-gradient">AI 赋能</span>
          </h2>
          <p class="section-desc">
            无论你需要的是一张海报、一套
            VI，还是完整的数字营销方案，都能在几分钟内获得专业级设计。
          </p>
        </header>
      </RevealOnScroll>

      <div class="service-grid">
        <RevealOnScroll
          v-for="(s, i) in services"
          :key="s.title"
          :delay="i * 80"
        >
          <TiltCard :max="6">
            <div class="service-card">
              <div class="service-icon">
                <component :is="s.icon" :size="22" />
              </div>
              <h3>{{ s.title }}</h3>
              <p>{{ s.desc }}</p>
              <div class="service-tags">
                <Badge v-for="t in s.tags" :key="t">{{ t }}</Badge>
              </div>
            </div>
          </TiltCard>
        </RevealOnScroll>
      </div>
    </section>

    <!-- ======== 热门模板 ======== -->
    <section class="section alt-bg">
      <div class="container">
        <RevealOnScroll>
          <header class="sec-head row">
            <div>
              <span class="section-eyebrow">热门模板</span>
              <h2 class="section-title">300+ 模板，即选即用</h2>
            </div>
            <BaseButton variant="ghost" to="/workspace" class="sec-more">
              全部模板 <ChevronRight :size="16" />
            </BaseButton>
          </header>
        </RevealOnScroll>

        <div v-if="loading" class="grid-4">
          <div v-for="i in 4" :key="i" class="tpl-skeleton"></div>
        </div>
        <div v-else class="tpl-grid">
          <RevealOnScroll
            v-for="(t, i) in data.templates"
            :key="t.id"
            :delay="i * 60"
          >
            <div class="tpl-card">
              <div class="tpl-thumb">
                <ArtCanvas
                  :variant="
                    t.id.includes('mt')
                      ? 'store'
                      : t.id.includes('vi')
                        ? 'vi'
                        : 'social'
                  "
                  :seed="t.id"
                />
                <Badge v-if="t.hot" tone="accent" class="tpl-hot">热门</Badge>
              </div>
              <div class="tpl-info">
                <h4>{{ t.name }}</h4>
                <span>{{ t.ratio }}</span>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>

    <!-- ======== 精选案例 ======== -->
    <section class="section container">
      <RevealOnScroll>
        <header class="sec-head row">
          <div>
            <span class="section-eyebrow">精选案例</span>
            <h2 class="section-title">被 5,000+ 企业验证的设计力</h2>
          </div>
          <BaseButton variant="ghost" to="/cases" class="sec-more">
            查看全部 <ChevronRight :size="16" />
          </BaseButton>
        </header>
      </RevealOnScroll>

      <div class="case-grid">
        <RevealOnScroll
          v-for="(c, i) in data.cases"
          :key="c.id"
          :delay="i * 80"
        >
          <router-link :to="`/cases/${c.id}`" class="case-card">
            <div class="case-thumb" :style="{ background: c.gradient }">
              <div class="case-thumb-inner">
                <ArtCanvas variant="poster" :seed="c.id" />
              </div>
              <Badge tone="neutral" class="case-cat">{{ c.category }}</Badge>
            </div>
            <div class="case-body">
              <h3>{{ c.title }}</h3>
              <p>{{ c.description }}</p>
              <div class="case-meta">
                <Badge tone="ai">{{ c.industry }}</Badge>
                <span class="case-views"
                  >{{ c.views.toLocaleString() }} 浏览</span
                >
              </div>
            </div>
          </router-link>
        </RevealOnScroll>
      </div>
    </section>

    <!-- ======== CTA ======== -->
    <section class="cta-wrap container">
      <RevealOnScroll>
        <div class="cta-box noise">
          <h2
            class="display-title"
            style="font-size: clamp(var(--text-2xl), 4vw, var(--text-4xl))"
          >
            准备好让你的品牌<br /><span class="text-gradient">脱颖而出？</span>
          </h2>
          <p>加入 5,000+ 企业的选择，让 AI 把创意生产效率提升 10 倍。</p>
          <MagneticButton>
            <BaseButton variant="primary" size="xl" to="/auth">
              免费开始创作
            </BaseButton>
          </MagneticButton>
        </div>
      </RevealOnScroll>
    </section>
  </div>
</template>

<style scoped>
/* ---- HERO ---- */
.hero {
  position: relative;
  display: flex;
  align-items: center;
  min-height: calc(100vh - var(--header-h));
  padding: var(--sp-8) 0;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero-glow {
  position: absolute;
  top: -20%;
  right: -10%;
  width: 700px;
  height: 700px;
  pointer-events: none;
  background: radial-gradient(circle, var(--glow-accent) 0%, transparent 60%);
  filter: blur(40px);
}

.hero-grid-layout {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-9);
  align-items: center;
}

@media (min-width: 1024px) {
  .hero-grid-layout {
    grid-template-columns: 1.05fr 0.95fr;
  }
}

.hero-badge {
  display: inline-flex;
  gap: 0.6rem;
  align-items: center;
  padding: 0.5rem 1rem;
  margin-bottom: var(--sp-5);
  font-size: var(--text-sm);
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
}

.live-dot {
  width: 8px;
  height: 8px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: breathe 2s ease-in-out infinite;
}

.hero-title {
  margin-bottom: var(--sp-5);
}

.hero-title .line {
  display: block;
  overflow: hidden;
}

.hero-desc {
  max-width: 44ch;
  margin-bottom: var(--sp-6);
  font-size: var(--text-lg);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-4);
  margin-bottom: var(--sp-7);
}

.hero-stats {
  display: flex;
  gap: var(--sp-7);
}

.hstat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.hstat-value {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-1);
}

.hstat-value em {
  font-size: var(--text-base);
  font-style: normal;
  color: var(--color-accent);
}

.hstat-label {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.hero-art {
  position: relative;
}

.hero-frame {
  position: relative;
  aspect-ratio: 4 / 4.6;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--r-2xl);
  box-shadow: var(--shadow-lg);
}

.hero-frame-tag {
  position: absolute;
  bottom: 14px;
  left: 14px;
  display: flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.4rem 0.8rem;
  font-size: var(--text-xs);
  font-weight: 500;
  color: #fff;
  background: rgb(15 46 44 / 55%);
  border-radius: var(--r-full);
  backdrop-filter: blur(8px);
}

/* ---- Marquee ---- */
.marquee-section {
  padding: var(--sp-6) 0;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.marquee-word {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-2);
  white-space: nowrap;
}

.marquee-star {
  margin-left: var(--sp-6);
  color: var(--color-accent);
}

/* ---- Sections ---- */
.section {
  padding: var(--sp-10) 0;
}

.alt-bg {
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.sec-head {
  max-width: 720px;
  margin-bottom: var(--sp-7);
}

.sec-head.row {
  display: flex;
  gap: var(--sp-5);
  align-items: flex-end;
  justify-content: space-between;
  max-width: none;
}

.sec-more {
  flex-shrink: 0;
}

.service-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-5);
}

@media (min-width: 640px) {
  .service-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .service-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.service-card {
  height: 100%;
  padding: var(--sp-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  transition:
    border-color var(--dur-med) ease,
    box-shadow var(--dur-med) ease;
}

.service-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
}

.service-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: var(--sp-4);
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-radius: var(--r-lg);
}

.service-card h3 {
  margin-bottom: var(--sp-2);
  font-size: var(--text-lg);
}

.service-card p {
  margin-bottom: var(--sp-4);
  font-size: var(--text-sm);
}

.service-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

/* ---- Templates ---- */
.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-5);
}

.tpl-skeleton {
  aspect-ratio: 4/3;
  background: linear-gradient(
    90deg,
    var(--color-surface-2) 25%,
    var(--color-surface-3) 50%,
    var(--color-surface-2) 75%
  );
  background-size: 800px 100%;
  border-radius: var(--r-xl);
  animation: shimmer 1.4s infinite linear;
}

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-5);
}

@media (min-width: 768px) {
  .tpl-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.tpl-card {
  overflow: hidden;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  transition: all var(--dur-med) var(--ease-out-expo);
}

.tpl-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-5px);
}

.tpl-thumb {
  position: relative;
  aspect-ratio: 4/3;
}

.tpl-hot {
  position: absolute;
  top: 10px;
  left: 10px;
}

.tpl-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4);
}

.tpl-info h4 {
  font-size: var(--text-sm);
  font-weight: 600;
}

.tpl-info span {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

/* ---- Cases ---- */
.case-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-5);
}

@media (min-width: 768px) {
  .case-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.case-card {
  display: block;
  height: 100%;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  transition: all var(--dur-med) var(--ease-out-expo);
}

.case-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-lg);
  transform: translateY(-6px);
}

.case-thumb {
  position: relative;
  aspect-ratio: 16/10;
  overflow: hidden;
}

.case-thumb-inner {
  position: absolute;
  inset: 0;
  mix-blend-mode: multiply;
  opacity: 0.9;
}

[data-theme='dark'] .case-thumb-inner {
  mix-blend-mode: screen;
  opacity: 0.8;
}

.case-cat {
  position: absolute;
  top: 12px;
  left: 12px;
}

.case-body {
  padding: var(--sp-5);
}

.case-body h3 {
  margin-bottom: var(--sp-2);
  font-size: var(--text-lg);
}

.case-body p {
  margin-bottom: var(--sp-4);
  font-size: var(--text-sm);
}

.case-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.case-views {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

/* ---- CTA ---- */
.cta-wrap {
  padding: var(--sp-9) 0 var(--sp-12);
}

.cta-box {
  position: relative;
  padding: var(--sp-9) var(--sp-6);
  overflow: hidden;
  text-align: center;
  background: linear-gradient(
    135deg,
    var(--color-primary-deep) 0%,
    var(--color-surface-2) 100%
  );
  border: 1px solid var(--color-border);
  border-radius: var(--r-2xl);
}

.cta-box::before {
  position: absolute;
  top: -60%;
  left: 50%;
  width: 600px;
  height: 400px;
  pointer-events: none;
  content: '';
  background: radial-gradient(ellipse, var(--glow-accent) 0%, transparent 65%);
  transform: translateX(-50%);
}

.cta-box h2 {
  position: relative;
  margin-bottom: var(--sp-4);
  color: var(--color-text-inverse);
}

.cta-box p {
  position: relative;
  margin-bottom: var(--sp-6);
  color: var(--color-text-2);
}

.cta-box .magnetic {
  position: relative;
}

@media (max-width: 640px) {
  .hero-stats {
    gap: var(--sp-5);
  }

  .hstat-value {
    font-size: var(--text-xl);
  }
}
</style>
