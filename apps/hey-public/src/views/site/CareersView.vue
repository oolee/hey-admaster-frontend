<script setup lang="ts">
import ContentPage from '@/components/layout/ContentPage.vue';
import Badge from '@/components/ui/Badge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { Briefcase, Clock, MapPin } from 'lucide-vue-next';

const positions = [
  {
    title: '高级前端工程师',
    team: '前端组',
    location: '杭州 / 远程',
    type: '全职',
    tags: ['Vue 3', 'TypeScript', '可视化'],
  },
  {
    title: 'AI 产品经理',
    team: '产品组',
    location: '杭州',
    type: '全职',
    tags: ['LLM', 'Agent', '设计思维'],
  },
  {
    title: '扩散模型研究员',
    team: 'AI 实验室',
    location: '北京 / 杭州',
    type: '全职',
    tags: ['Diffusion', 'PyTorch', '多模态'],
  },
  {
    title: '品牌设计专家',
    team: '设计组',
    location: '杭州',
    type: '全职',
    tags: ['VI 系统', '排版', '8 年以上'],
  },
  {
    title: '增长运营',
    team: '运营组',
    location: '上海',
    type: '全职',
    tags: ['B 端 SaaS', '内容运营'],
  },
  {
    title: '全栈工程师（实习）',
    team: '工程组',
    location: '杭州',
    type: '实习',
    tags: ['在校', '每周 4 天以上'],
  },
];

const benefits = [
  {
    icon: '💰',
    title: '有竞争力的薪酬',
    desc: '薪资高于行业 75 分位，优秀者可谈股权激励',
  },
  {
    icon: '🌴',
    title: '弹性工作时间',
    desc: '核心时段 10:30-16:30 之外自由安排',
  },
  { icon: '🏥', title: '六险一金 + 商保', desc: '全额公积金 + 补充医疗保险' },
  {
    icon: '✈️',
    title: '20 天年假 + 旅行',
    desc: '入职满 1 年起，每年 5,000 元旅行基金',
  },
  { icon: '📚', title: '学习津贴', desc: '每年 5,000 元图书/课程报销' },
  {
    icon: '🎁',
    title: '生日 + 节日福利',
    desc: '每月一次的 Happy Hour、季度团建',
  },
];
</script>

<template>
  <ContentPage
    eyebrow="加入我们"
    title="和我们一起，重新定义创作"
    subtitle="Hey 19 团队正在招募对 AI + 设计充满热情的同学。"
    hero-variant="gradient"
  >
    <h2 id="why">为什么加入我们</h2>
    <p>
      我们正在做一件从未有人做到的事——把「AI
      创意生产」变成一项普惠的基础设施，让每一间小店、每一位创作者都能像头部品牌一样拥有高质量的视觉内容。
    </p>

    <div class="benefit-grid">
      <div v-for="b in benefits" :key="b.title" class="benefit">
        <span class="benefit-icon">{{ b.icon }}</span>
        <h4>{{ b.title }}</h4>
        <p>{{ b.desc }}</p>
      </div>
    </div>

    <h2 id="positions">在招岗位</h2>
    <div class="pos-list">
      <article v-for="p in positions" :key="p.title" class="pos">
        <div class="pos-main">
          <div class="pos-head">
            <h3>{{ p.title }}</h3>
            <Badge tone="accent">{{ p.team }}</Badge>
          </div>
          <p class="pos-meta">
            <span><MapPin :size="13" /> {{ p.location }}</span>
            <span><Briefcase :size="13" /> {{ p.type }}</span>
            <span><Clock :size="13" /> 正在招聘</span>
          </p>
          <div class="pos-tags">
            <Badge v-for="t in p.tags" :key="t" tone="neutral">{{ t }}</Badge>
          </div>
        </div>
        <BaseButton variant="outline" size="sm">查看详情 →</BaseButton>
      </article>
    </div>

    <h2 id="apply">投递方式</h2>
    <p>
      把简历 + 作品集发送到 <code>hr@hey19.design</code>，主题注明「<code
        >岗位 - 姓名</code
      >」。我们会在 5 个工作日内回复，无论结果如何。
    </p>

    <div class="callout">
      <span>💌</span>
      <span
        >暂未找到合适岗位？把你的背景发给我们，合适的机会出现时第一时间联系你。</span
      >
    </div>
  </ContentPage>
</template>

<style scoped>
.benefit-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
  margin: var(--sp-4) 0;
}

@media (min-width: 640px) {
  .benefit-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .benefit-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.benefit {
  padding: var(--sp-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

.benefit-icon {
  display: block;
  margin-bottom: var(--sp-2);
  font-size: 2rem;
}

.benefit h4 {
  margin-bottom: var(--sp-2);
  font-size: var(--text-base);
  font-weight: 700;
}

.benefit p {
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text-3);
}

.pos-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin: var(--sp-4) 0;
}

.pos {
  display: flex;
  gap: var(--sp-4);
  align-items: center;
  padding: var(--sp-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  transition: all var(--dur-fast) ease;
}

.pos:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.pos-main {
  flex: 1;
  min-width: 0;
}

.pos-head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
  align-items: center;
  margin-bottom: var(--sp-2);
}

.pos-head h3 {
  font-size: var(--text-lg);
}

.pos-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-4);
  margin-bottom: var(--sp-3);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.pos-meta span {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.pos-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
</style>
