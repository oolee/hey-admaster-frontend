<script setup lang="ts">
import ContentPage from '@/components/layout/ContentPage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { Heart, MessageCircle, Sparkles, Users } from 'lucide-vue-next';

const stats = [
  { value: '12,000+', label: '创作者' },
  { value: '38,000', label: '原创作品' },
  { value: '890万', label: '社区浏览量' },
  { value: '4.9', label: '平均评分' },
];

const topics = [
  { tag: '门头设计', count: 245 },
  { tag: '海报设计', count: 612 },
  { tag: 'VI / Logo', count: 184 },
  { tag: '插画', count: 327 },
  { tag: 'PPT 模板', count: 96 },
  { tag: '社媒运营', count: 421 },
  { tag: '电商主图', count: 268 },
  { tag: '画册装帧', count: 73 },
];

const posts = [
  {
    author: '设计师阿星',
    avatar: '⭐',
    title: '我用 Hey 19 给一家面馆做了全套视觉',
    likes: 328,
    comments: 56,
    time: '2 小时前',
  },
  {
    author: 'Mochi 工作室',
    avatar: '🍵',
    title: '画册项目 12P 批量生成 + 微调完整流程',
    likes: 512,
    comments: 89,
    time: '昨天',
  },
  {
    author: '广告小陈',
    avatar: '🎨',
    title: '关于 Midjourney 与 GPT-image-2 的取舍',
    likes: 247,
    comments: 38,
    time: '3 天前',
  },
];
</script>

<template>
  <ContentPage
    eyebrow="社区"
    title="Hey 19 创作者社区"
    subtitle="和 12,000+ 设计师一起分享作品、提效经验、灵感碰撞。"
    hero-variant="gradient"
  >
    <div class="community-stats">
      <div v-for="s in stats" :key="s.label" class="c-stat">
        <span class="c-stat-value">{{ s.value }}</span>
        <span class="c-stat-label">{{ s.label }}</span>
      </div>
    </div>

    <h2 id="topics">热门话题</h2>
    <div class="topic-grid">
      <button v-for="t in topics" :key="t.tag" class="topic-chip">
        #{{ t.tag }}
        <span>{{ t.count }}</span>
      </button>
    </div>

    <h2 id="posts">最新讨论</h2>
    <div class="post-list">
      <article v-for="p in posts" :key="p.title" class="post">
        <div class="post-head">
          <span class="post-avatar">{{ p.avatar }}</span>
          <div>
            <p class="post-author">{{ p.author }}</p>
            <span class="post-time">{{ p.time }}</span>
          </div>
        </div>
        <h3 class="post-title">{{ p.title }}</h3>
        <div class="post-stats">
          <span><Heart :size="14" /> {{ p.likes }}</span>
          <span><MessageCircle :size="14" /> {{ p.comments }}</span>
        </div>
      </article>
    </div>

    <div class="callout">
      <span><Users :size="18" /></span>
      <span>社区功能正在持续完善中，欢迎加入内测反馈群。</span>
    </div>

    <div style="margin-top: var(--sp-7); text-align: center">
      <BaseButton variant="primary" size="lg">
        <Sparkles :size="16" /> 加入创作者社区
      </BaseButton>
    </div>
  </ContentPage>
</template>

<style scoped>
.community-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-3);
  margin-bottom: var(--sp-8);
}

@media (min-width: 768px) {
  .community-stats {
    grid-template-columns: repeat(4, 1fr);
  }
}

.c-stat {
  padding: var(--sp-4);
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

.c-stat-value {
  display: block;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-accent);
}

.c-stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.topic-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin: var(--sp-4) 0;
}

.topic-chip {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 0.5rem 1rem;
  font-size: var(--text-sm);
  color: var(--color-text-1);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
}

.topic-chip:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.topic-chip span {
  padding: 1px 6px;
  font-size: var(--text-xs);
  color: var(--color-text-3);
  background: var(--color-surface-2);
  border-radius: var(--r-full);
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin: var(--sp-4) 0;
}

.post {
  padding: var(--sp-5);
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  transition: all var(--dur-fast) ease;
}

.post:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.post-head {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
  margin-bottom: var(--sp-3);
}

.post-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: var(--text-xl);
  background: var(--color-accent-soft);
  border-radius: 50%;
}

.post-author {
  font-size: var(--text-sm);
  font-weight: 600;
}

.post-time {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.post-title {
  margin-bottom: var(--sp-3);
  font-size: var(--text-lg);
}

.post-stats {
  display: flex;
  gap: var(--sp-4);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.post-stats span {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
</style>
