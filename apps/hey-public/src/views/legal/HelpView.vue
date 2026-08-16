<script setup lang="ts">
import ContentPage from '@/components/layout/ContentPage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import {
  BookOpen,
  ChevronRight,
  Mail,
  MessageCircle,
  Search,
} from 'lucide-vue-next';

const categories = [
  { title: '快速入门', count: 12 },
  { title: 'AI 工作台', count: 24 },
  { title: '账户与计费', count: 18 },
  { title: '模板与素材', count: 15 },
  { title: '团队协作', count: 9 },
];

const faqs = [
  {
    q: '如何开始第一次 AI 生成？',
    a: '进入「AI 工作台」→ 在底部输入框描述你的设计需求（例如：帮我做一张奶茶店开业海报）→ 按 Enter 发送，AI 会在几秒内输出 3-5 个方案供你挑选。',
  },
  {
    q: '积分不够了怎么办？',
    a: '你可以在「个人中心 → 充值」中购买积分包，或升级到更高档位的订阅计划享受更优惠的阶梯价。',
  },
  {
    q: '生成的内容有版权吗？',
    a: '专业版及以上用户生成的所有内容均拥有完整商用授权，可以直接用于线上或印刷品。',
  },
  {
    q: '如何保证 12 张画册页面的风格统一？',
    a: '在工作台使用「无限画布」功能，添加画册节点并一次性设置整体风格参数，AI 会在生成过程中自动保持视觉一致性。',
  },
];
</script>

<template>
  <ContentPage
    eyebrow="帮助中心"
    title="如何让 Hey 19 更好用"
    subtitle="搜索常见问题、浏览教程，或直接联系我们。"
  >
    <!-- 搜索框 -->
    <div class="help-search">
      <Search :size="20" />
      <input placeholder="搜索问题，例如：如何充值积分" />
      <button class="help-go">搜索</button>
    </div>

    <!-- 分类卡片 -->
    <h2 id="categories">分类导航</h2>
    <div class="cat-grid">
      <a v-for="c in categories" :key="c.title" href="#" class="cat-card">
        <BookOpen :size="22" />
        <div>
          <p class="cat-title">{{ c.title }}</p>
          <span>{{ c.count }} 篇文章</span>
        </div>
        <ChevronRight :size="16" class="cat-arrow" />
      </a>
    </div>

    <!-- FAQ -->
    <h2 id="faq">热门问题</h2>
    <div class="help-faq">
      <div v-for="(f, i) in faqs" :key="i" class="faq-row">
        <p class="faq-q">Q. {{ f.q }}</p>
        <p class="faq-a">{{ f.a }}</p>
      </div>
    </div>

    <!-- 联系选项 -->
    <h2 id="contact">还需要帮助？</h2>
    <div class="contact-row">
      <div class="contact-card">
        <MessageCircle :size="22" />
        <h4>在线客服</h4>
        <p>工作日 9:00-22:00<br />平均响应 3 分钟</p>
        <BaseButton variant="outline" size="sm" to="/contact">
          开始对话
        </BaseButton>
      </div>
      <div class="contact-card">
        <Mail :size="22" />
        <h4>邮件支持</h4>
        <p>24 小时内回复<br />适合复杂问题</p>
        <BaseButton
          variant="outline"
          size="sm"
          href="mailto:support@hey19.design"
        >
          发送邮件
        </BaseButton>
      </div>
    </div>
  </ContentPage>
</template>

<style scoped>
.help-search {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  padding: 0.8rem 1rem;
  margin-bottom: var(--sp-7);
  color: var(--color-text-3);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--r-xl);
  transition: all var(--dur-fast) ease;
}

.help-search:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 4px var(--glow-accent);
}

.help-search input {
  flex: 1;
  font-size: var(--text-base);
  color: var(--color-text-1);
  background: transparent;
}

.help-go {
  padding: 0.5rem 1.2rem;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: var(--r-full);
}

.cat-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-3);
  margin: var(--sp-4) 0;
}

@media (min-width: 640px) {
  .cat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .cat-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.cat-card {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
  padding: var(--sp-5);
  color: var(--color-text-1);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  transition: all var(--dur-med) ease;
}

.cat-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.cat-card svg:first-child {
  flex-shrink: 0;
  color: var(--color-accent);
}

.cat-card > div {
  flex: 1;
}

.cat-title {
  font-size: var(--text-base);
  font-weight: 600;
}

.cat-card span {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.cat-arrow {
  color: var(--color-text-3);
}

.help-faq {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  margin: var(--sp-4) 0;
}

.faq-row {
  padding: var(--sp-4) var(--sp-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

.faq-q {
  margin-bottom: var(--sp-2);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-1);
}

.faq-a {
  font-size: var(--text-sm);
  line-height: 1.7;
  color: var(--color-text-2);
}

.contact-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
  margin: var(--sp-4) 0;
}

@media (min-width: 640px) {
  .contact-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

.contact-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  align-items: center;
  padding: var(--sp-5);
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

.contact-card svg {
  color: var(--color-accent);
}

.contact-card h4 {
  font-size: var(--text-lg);
}

.contact-card p {
  margin: var(--sp-2) 0;
  font-size: var(--text-sm);
  color: var(--color-text-3);
}
</style>
