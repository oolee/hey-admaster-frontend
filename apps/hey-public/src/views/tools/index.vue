<script setup lang="ts">
import ScrollReveal from '#/components/ui/ScrollReveal.vue';

const tools = [
  {
    title: '一键抠图',
    description: 'AI智能识别主体，一键去除背景，支持批量处理',
    icon: 'mdi:image-outline',
    to: '/tools/remove-bg',
    tag: '热门',
  },
  {
    title: '证件照制作',
    description: '一键生成标准证件照，支持多种尺寸和背景色',
    icon: 'mdi:account-box-outline',
    to: '/tools/id-photo',
    tag: '实用',
  },
  {
    title: '图片压缩',
    description: '智能压缩图片体积，保持画质清晰，提升网页加载速度',
    icon: 'mdi:file-image-outline',
    to: '/tools/compress',
    tag: '免费',
  },
];
</script>

<template>
  <div class="tools-page">
    <section class="tools-hero">
      <div class="container-custom">
        <h1 class="tools-title">实用工具箱</h1>
        <p class="tools-subtitle">免费高效的广告设计辅助工具，让创作更简单</p>
      </div>
    </section>

    <section class="section">
      <div class="container-custom">
        <ScrollReveal>
          <div class="tools-grid reveal-stagger">
            <RouterLink
              v-for="(tool, i) in tools"
              :key="tool.title"
              :to="tool.to"
              class="tool-card glass-card"
              :style="{ transitionDelay: `${0.1 + i * 0.1}s` }"
            >
              <span class="tool-tag">{{ tool.tag }}</span>
              <div class="tool-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="32"
                  height="32"
                  fill="currentColor"
                >
                  <path
                    v-if="tool.title === '一键抠图'"
                    d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
                  />
                  <path
                    v-else-if="tool.title === '证件照制作'"
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  />
                  <path
                    v-else
                    d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"
                  />
                </svg>
              </div>
              <h3 class="tool-name">{{ tool.title }}</h3>
              <p class="tool-desc">{{ tool.description }}</p>
              <span class="tool-action">立即使用 →</span>
            </RouterLink>
          </div>
        </ScrollReveal>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tools-page {
  min-height: 100vh;
  padding-top: 80px;
  background: var(--color-bg-primary);
}

.tools-hero {
  padding: 80px 0 40px;
  text-align: center;
}

.tools-title {
  margin-bottom: 16px;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  color: var(--color-text-primary);
}

.tools-subtitle {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
}

.tools-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 768px) {
  .tools-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  padding: 40px 32px;
  color: inherit;
  text-align: center;
  text-decoration: none;
}

.tool-tag {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px 12px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-radius: 16px;
}

.tool-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.tool-desc {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.tool-action {
  margin-top: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-neon);
}

.tool-card:hover .tool-action {
  text-decoration: underline;
}
</style>
