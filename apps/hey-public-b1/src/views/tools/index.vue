<script setup lang="ts">
import ScrollReveal from '#/components/ui/ScrollReveal.vue';

const tools = [
  {
    title: '一键抠图',
    description: 'AI智能识别主体，一键去除背景，支持批量处理',
    to: '/tools/remove-bg',
    tag: '热门',
  },
  {
    title: '证件照制作',
    description: '一键生成标准证件照，支持多种尺寸和背景色',
    to: '/tools/id-photo',
    tag: '实用',
  },
  {
    title: '图片压缩',
    description: '智能压缩图片体积，保持画质清晰，提升网页加载速度',
    to: '/tools/compress',
    tag: '免费',
  },
  {
    title: '图片尺寸调整',
    description: '按像素/百分比/社交平台预设快速调整图片尺寸，锁定比例',
    to: '/tools/resize',
    tag: '新增',
  },
  {
    title: '调色大师',
    description:
      'HEX / RGB / HSL / CMYK 实时互转，一键生成和谐色板与对比度检查',
    to: '/tools/color-master',
    tag: '新增',
  },
  {
    title: 'JSON 工作台',
    description: '格式化、压缩、转义、Base64 编码解码、键排序，纯本地极速处理',
    to: '/tools/json-format',
    tag: '新增',
  },
  {
    title: '二维码生成器',
    description: '网址 / Wi-Fi / 名片 / 邮件 7 种场景，PNG/SVG 矢量多格式导出',
    to: '/tools/qrcode',
    tag: '新增',
  },
  {
    title: '水印大师',
    description:
      '文字 / 图片水印自由组合，九宫格定位或平铺铺满，样图防抄袭一把梭',
    to: '/tools/watermark',
    tag: '新增',
  },
  {
    title: 'Base64 编解码',
    description:
      '文本编解码 / 图片转 Data URI / 一键生成 HTML、CSS、Markdown 嵌入代码',
    to: '/tools/base64',
    tag: '新增',
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
                <span class="tool-initial">{{ tool.title.slice(0, 2) }}</span>
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

@media (min-width: 1200px) {
  .tools-grid {
    grid-template-columns: repeat(4, 1fr);
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  overflow: hidden;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-radius: 16px;
}

.tool-icon::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: radial-gradient(
    circle at 30% 20%,
    color-mix(in srgb, var(--color-neon) 28%, transparent) 0%,
    transparent 60%
  );
}

.tool-initial {
  position: relative;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-neon);
  letter-spacing: 0.02em;
  text-shadow: 0 0 18px color-mix(in srgb, var(--color-neon) 42%, transparent);
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
