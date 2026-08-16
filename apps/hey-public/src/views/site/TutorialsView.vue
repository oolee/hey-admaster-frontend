<script setup lang="ts">
import ContentPage from '@/components/layout/ContentPage.vue';
import Badge from '@/components/ui/Badge.vue';
import { Clock, PlayCircle } from 'lucide-vue-next';

const levels = ['入门', '进阶', '高级'];

const courses = [
  {
    level: '入门',
    title: '5 分钟看懂 Hey 19 AI 工作台',
    duration: '5 min',
    tag: '工作台',
  },
  {
    level: '入门',
    title: '从一句话到完整海报：第一次生成',
    duration: '8 min',
    tag: '文生图',
  },
  {
    level: '入门',
    title: '门头店招设计基础与最佳尺寸',
    duration: '12 min',
    tag: '门头',
  },
  {
    level: '进阶',
    title: '使用 Auto 模型路由节省 50% 积分',
    duration: '15 min',
    tag: 'Agent',
  },
  {
    level: '进阶',
    title: '改图工作流：上传 → 备注 → 精修',
    duration: '20 min',
    tag: '改图',
  },
  {
    level: '进阶',
    title: '12P 画册批量生成与一致性控制',
    duration: '25 min',
    tag: '画册',
  },
  {
    level: '高级',
    title: '无限画布节点工作流实战',
    duration: '30 min',
    tag: '工作流',
  },
  {
    level: '高级',
    title: 'API 集成：让 AI 接入你的产品',
    duration: '35 min',
    tag: 'API',
  },
  {
    level: '高级',
    title: '多团队席位权限与配额管理',
    duration: '28 min',
    tag: '团队',
  },
];
</script>

<template>
  <ContentPage
    eyebrow="设计教程"
    title="从零到高手，AI 创作全攻略"
    subtitle="系统化课程 + 实战案例，帮你成为 AI 设计高手。"
    hero-variant="gradient"
  >
    <h2 id="filter">按难度筛选</h2>
    <div class="level-tabs">
      <button v-for="l in levels" :key="l" class="level-tab">{{ l }}</button>
    </div>

    <h2 id="courses">全部教程</h2>
    <div class="course-list">
      <article v-for="c in courses" :key="c.title" class="course">
        <div class="course-thumb">
          <PlayCircle :size="28" />
        </div>
        <div class="course-body">
          <div class="course-meta">
            <Badge tone="accent">{{ c.level }}</Badge>
            <Badge tone="ai">{{ c.tag }}</Badge>
            <span class="duration"><Clock :size="12" /> {{ c.duration }}</span>
          </div>
          <h3>{{ c.title }}</h3>
          <p>
            本节课程将介绍
            {{ c.title }} 的核心要点与实战技巧，配合具体案例演示。
          </p>
        </div>
      </article>
    </div>

    <div class="callout">
      <span>📚</span>
      <span
        >想看完整课程目录？访问我们的 B 站频道「Hey 19
        设计学院」，每周更新。</span
      >
    </div>
  </ContentPage>
</template>

<style scoped>
.level-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin: var(--sp-3) 0 var(--sp-7);
}

.level-tab {
  padding: 0.5rem 1.2rem;
  font-size: var(--text-sm);
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
}

.level-tab:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.course-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
}

@media (min-width: 768px) {
  .course-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

.course {
  display: flex;
  gap: var(--sp-4);
  padding: var(--sp-4);
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  transition: all var(--dur-fast) ease;
}

.course:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.course-thumb {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  border-radius: var(--r-md);
}

.course-body {
  flex: 1;
  min-width: 0;
}

.course-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  align-items: center;
  margin-bottom: var(--sp-2);
}

.duration {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.course h3 {
  margin-bottom: 4px;
  font-size: var(--text-base);
  font-weight: 600;
}

.course p {
  font-size: var(--text-sm);
  color: var(--color-text-3);
}
</style>
