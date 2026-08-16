<script setup lang="ts">
import { RouterLink } from 'vue-router';

const services = [
  { label: '品牌策略', to: '/services' },
  { label: 'AI创意设计', to: '/services' },
  { label: '视频制作', to: '/services' },
  { label: '数字营销', to: '/services' },
];

const explore = [
  { label: '案例展示', to: '/portfolio' },
  { label: 'AI创作工坊', to: '/studio' },
  { label: '在线下单', to: '/order' },
  { label: '关于我们', to: '/about' },
];
</script>

<template>
  <footer class="app-footer">
    <div class="footer-inner container-custom">
      <!-- Brand + tagline -->
      <div class="footer-brand">
        <RouterLink to="/" class="footer-logo">
          <span class="logo-text">Hey 19</span>
          <span class="logo-dot">.</span>
        </RouterLink>
        <p class="footer-tagline">
          AI赋能广告设计，为企业提供门头店招、海报设计、宣传单DM制作一站式服务。免费AI设计工具，高效获客。
        </p>

        <!-- Social QR codes -->
        <div class="footer-social">
          <div class="social-item">
            <div class="social-icon wechat">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <path
                  d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"
                />
              </svg>
            </div>
            <span class="social-label">微信</span>
            <div class="social-qr">微信二维码</div>
          </div>
          <div class="social-item">
            <div class="social-icon douyin">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <path
                  d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
                />
              </svg>
            </div>
            <span class="social-label">抖音</span>
            <div class="social-qr">抖音二维码</div>
          </div>
          <div class="social-item">
            <div class="social-icon xiaohongshu">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                />
              </svg>
            </div>
            <span class="social-label">小红书</span>
            <div class="social-qr">小红书二维码</div>
          </div>
        </div>
      </div>

      <!-- Links -->
      <div class="footer-links">
        <div class="footer-col">
          <h4 class="footer-heading">服务</h4>
          <RouterLink
            v-for="item in services"
            :key="item.label"
            :to="item.to"
            class="footer-link"
          >
            {{ item.label }}
          </RouterLink>
        </div>
        <div class="footer-col">
          <h4 class="footer-heading">探索</h4>
          <RouterLink
            v-for="item in explore"
            :key="item.label"
            :to="item.to"
            class="footer-link"
          >
            {{ item.label }}
          </RouterLink>
        </div>
        <div class="footer-col">
          <h4 class="footer-heading">联系</h4>
          <!--prettier-ignore-->
          <a href="mailto:342831363@qq.com" class="footer-link">342831363@qq.com</a>
          <a href="tel:13769166043" class="footer-link">137 6916 6043</a>
          <span class="footer-address">云南省曲靖市陆良县</span>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <p>用AI重新定义创意</p>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  padding: 64px 0 0;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  transition: background 0.4s ease;
}

.footer-inner {
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px;
}

@media (min-width: 768px) {
  .footer-inner {
    grid-template-columns: 1.2fr 1fr;
  }
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.footer-logo {
  display: inline-flex;
  align-items: center;
  font-size: 1.5rem;
  font-weight: 700;
  text-decoration: none;
}

.logo-text {
  color: var(--color-text-primary);
}

.logo-dot {
  color: var(--color-neon);
}

.footer-tagline {
  max-width: 420px;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

/* Social QR codes */
.footer-social {
  display: flex;
  gap: 24px;
  margin-top: 8px;
}

.social-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  cursor: pointer;
}

.social-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: #fff;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.social-icon.wechat {
  background: #07c160;
}

.social-icon.douyin {
  background: #1a1a1a;
  border: 1px solid var(--color-border);
}

.dark .social-icon.douyin {
  background: #1a1a1a;
}

.social-icon.xiaohongshu {
  background: #ff2442;
}

.social-icon:hover {
  transform: scale(1.1);
}

.social-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.social-qr {
  position: absolute;
  bottom: 60px;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  pointer-events: none;
  background: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgb(0 0 0 / 15%);
  opacity: 0;
  transform: translateX(-50%) scale(0.9);
  transition: all 0.3s ease;
}

.social-item:hover .social-qr {
  opacity: 1;
  transform: translateX(-50%) scale(1);
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

.footer-heading {
  margin-bottom: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.footer-link {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: var(--color-neon);
}

.footer-address {
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.footer-bottom {
  padding: 20px 0;
  margin-top: 48px;
  text-align: center;
  border-top: 1px solid var(--color-border);
}

.footer-bottom p {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .footer-links {
    grid-template-columns: repeat(2, 1fr);
  }

  .footer-social {
    gap: 16px;
  }

  .social-qr {
    width: 100px;
    height: 100px;
  }
}
</style>
