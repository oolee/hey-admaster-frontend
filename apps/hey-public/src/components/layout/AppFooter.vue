<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <RouterLink to="/" class="footer-logo">Hey 19<span class="brand-dot">.</span></RouterLink>
        <p class="footer-tagline">用AI重新定义创意</p>
      </div>

      <div class="footer-links">
        <div class="footer-col">
          <h4>服务</h4>
          <RouterLink to="/services">品牌策略</RouterLink>
          <RouterLink to="/services">AI创意设计</RouterLink>
          <RouterLink to="/services">视频制作</RouterLink>
          <RouterLink to="/services">数字营销</RouterLink>
        </div>
        <div class="footer-col">
          <h4>探索</h4>
          <RouterLink to="/portfolio">案例展示</RouterLink>
          <RouterLink to="/studio">AI创作工坊</RouterLink>
          <RouterLink to="/order">在线下单</RouterLink>
          <RouterLink to="/about">关于我们</RouterLink>
        </div>
        <div class="footer-col">
          <h4>联系</h4>
          <a href="mailto:342831363@qq.com">342831363@qq.com</a>
          <a href="tel:13769166043">137 6916 6043</a>
          <span>云南省曲靖市陆良县龙湖一号</span>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <span>&copy; 2026 Hey 19. All rights reserved.</span>
      <span>Powered by GPT-image-2</span>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  background: #0a0a0f;
  padding: 60px 24px 24px;
}

.footer-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
}

@media (min-width: 768px) {
  .footer-inner {
    grid-template-columns: 1fr 2fr;
  }
}

.footer-logo {
  font-size: 1.5rem;
  font-weight: 800;
  color: #f0f0f5;
}

.brand-dot {
  color: #C8FF00;
}

.footer-tagline {
  color: #8888a0;
  margin-top: 8px;
  font-size: 0.9rem;
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-col h4 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #C8FF00;
  margin-bottom: 4px;
}

.footer-col a,
.footer-col span {
  font-size: 0.85rem;
  color: #8888a0;
  transition: color 0.2s ease;
}

.footer-col a:hover {
  color: #C8FF00;
}

.footer-bottom {
  max-width: 1400px;
  margin: 40px auto 0;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #555570;
}
</style>