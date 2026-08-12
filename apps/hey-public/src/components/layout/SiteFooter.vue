<script setup lang="ts">
import { ref } from 'vue';

import { toast } from '@/utils/toast';
import { Mail, MessageCircle } from 'lucide-vue-next';

/* 模拟二维码：随机点阵（每平台固定一个种子） */
function copyEmail() {
  window.navigator.clipboard?.writeText('hello@hey19.design');
  toast.success('邮箱已复制');
}

function makeQR(seed: number) {
  const n = 9;
  const cells = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      // 角落固定定位标识
      const isCorner =
        (r < 3 && c < 3) || (r < 3 && c > n - 4) || (r > n - 4 && c < 3);
      const isCenter = r === 4 && c === 4;
      const v =
        isCorner || isCenter
          ? 1
          : (seed * (r + 1) * (c + 3) * 7) % 3 === 0
            ? 1
            : 0;
      cells.push({ r, c, v });
    }
  }
  return { cells, n };
}

const platforms = [
  {
    id: 'wx',
    name: '微信',
    label: 'Hey 19 微信公众号',
    icon: 'message',
    qr: makeQR(7),
  },
  {
    id: 'wb',
    name: '微博',
    label: 'Hey 19 官方微博',
    icon: 'share',
    qr: makeQR(13),
  },
  {
    id: 'xhs',
    name: '小红书',
    label: 'Hey 19 小红书号',
    icon: 'xhs',
    qr: makeQR(19),
  },
  {
    id: 'dy',
    name: '抖音',
    label: 'Hey 19 抖音号',
    icon: 'douyin',
    qr: makeQR(23),
  },
];

const activeId = ref<null | string>(null);
const groups = ref<{ links: [string, string][]; title: string }[]>([
  {
    title: '产品',
    links: [
      ['AI 工作台', '/workspace'],
      ['案例展示', '/cases'],
      ['服务与定价', '/pricing'],
      ['工具箱', '/toolbox'],
    ],
  },
  {
    title: '资源',
    links: [
      ['帮助中心', '/help'],
      ['设计教程', '/tutorials'],
      ['API 文档', '/docs'],
      ['社区论坛', '/community'],
    ],
  },
  {
    title: '公司',
    links: [
      ['关于我们', '/about'],
      ['加入团队', '/careers'],
      ['联系我们', '/contact'],
      ['隐私政策', '/privacy'],
    ],
  },
]);
</script>

<template>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <router-link to="/" class="brand">
            <span class="brand-mark">H</span>
            <span class="brand-name">Hey&nbsp;19</span>
          </router-link>
          <p>
            AI 驱动的一站式创意设计平台<br />让企业级视觉内容生产，像聊天一样简单。
          </p>
          <div class="footer-social">
            <!-- 微信 / 微博 / 小红书 / 抖音：hover 二维码 -->
            <div
              v-for="p in platforms"
              :key="p.id"
              class="social-wrap"
              @mouseenter="activeId = p.id"
              @mouseleave="activeId = null"
            >
              <button class="social-btn" :title="p.name" :aria-label="p.name">
                <MessageCircle v-if="p.icon === 'message'" :size="17" />
                <svg
                  v-else-if="p.icon === 'share'"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <svg
                  v-else-if="p.icon === 'xhs'"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="2"
                    y="2"
                    width="20"
                    height="20"
                    rx="5"
                    fill="currentColor"
                  />
                  <text
                    x="12"
                    y="16"
                    text-anchor="middle"
                    font-family="Arial"
                    font-weight="700"
                    font-size="11"
                    fill="#fff"
                  >
                    小红书
                  </text>
                </svg>
                <svg
                  v-else-if="p.icon === 'douyin'"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
              </button>
              <Transition name="qr">
                <div v-if="activeId === p.id" class="qr-popover">
                  <div class="qr-frame">
                    <svg
                      :viewBox="`0 0 ${p.qr.n * 10 + 12} ${p.qr.n * 10 + 12}`"
                      class="qr-svg"
                    >
                      <rect width="100%" height="100%" fill="#fff" rx="6" />
                      <rect
                        v-for="cell in p.qr.cells"
                        :key="`${cell.r}-${cell.c}`"
                        v-show="cell.v"
                        :x="6 + cell.c * 10"
                        :y="6 + cell.r * 10"
                        width="9"
                        height="9"
                        rx="1.5"
                        fill="#0f2e2c"
                      />
                    </svg>
                  </div>
                  <div class="qr-text">
                    <strong>{{ p.name }}</strong>
                    <span>{{ p.label }}</span>
                  </div>
                  <div class="qr-tip">扫一扫，关注我们</div>
                </div>
              </Transition>
            </div>

            <!-- 邮箱：直接复制 -->
            <button
              class="social-btn"
              title="邮箱"
              aria-label="邮箱"
              @click="copyEmail"
            >
              <Mail :size="17" />
            </button>
          </div>
        </div>
        <div v-for="g in groups" :key="g.title" class="footer-col">
          <h4>{{ g.title }}</h4>
          <router-link
            v-for="[label, to] in g.links"
            :key="label"
            :to="to"
            class="footer-link"
          >
            {{ label }}
            <span class="link-arrow">→</span>
          </router-link>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 Hey 19 Studio. All rights reserved.</p>
        <div class="footer-legal">
          <router-link to="/privacy">隐私政策</router-link>
          <router-link to="/terms">服务条款</router-link>
        </div>
        <p class="footer-tip">Made with AI + Coffee</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  padding-top: var(--sp-9);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.footer-top {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-7);
  padding-bottom: var(--sp-8);
}

@media (min-width: 768px) {
  .footer-top {
    grid-template-columns: 1.6fr 1fr 1fr 1fr;
  }
}

.brand {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: 10px;
}

.brand-name {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text-1);
}

.footer-brand p {
  margin-bottom: 1.2rem;
  font-size: var(--text-sm);
  line-height: 1.8;
  color: var(--color-text-3);
}

.footer-social {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.social-wrap {
  position: relative;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.social-btn svg,
.social-btn > span {
  display: flex;
}

.social-btn :deep(svg) {
  width: 17px;
  height: 17px;
}

.social-btn:hover {
  color: #fff;
  background: var(--color-accent);
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

/* QR 浮层 */
.qr-popover {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  z-index: 50;
  width: 200px;
  padding: var(--sp-4);
  pointer-events: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-lg);
  transform: translateX(-50%);
}

.qr-popover::after {
  position: absolute;
  bottom: -6px;
  left: 50%;
  width: 12px;
  height: 12px;
  content: '';
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  transform: translateX(-50%) rotate(45deg);
}

.qr-frame {
  padding: 6px;
  margin-bottom: var(--sp-2);
  background: #fff;
  border-radius: var(--r-md);
}

.qr-svg {
  display: block;
  width: 100%;
  height: auto;
}

.qr-text {
  text-align: center;
}

.qr-text strong {
  display: block;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-1);
}

.qr-text span {
  display: block;
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.qr-tip {
  margin-top: var(--sp-2);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-accent);
  text-align: center;
}

.qr-enter-active,
.qr-leave-active {
  transition: all 0.2s var(--ease-out-expo);
}

.qr-enter-from,
.qr-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px) scale(0.96);
}

.footer-col h4 {
  margin-bottom: 1rem;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-1);
}

.footer-links,
.footer-link {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  padding: 0.35rem 0;
  font-size: var(--text-sm);
  color: var(--color-text-3);
  transition: all var(--dur-fast) ease;
}

.footer-link:hover {
  color: var(--color-accent);
}

.link-arrow {
  font-size: 11px;
  opacity: 0;
  transform: translate(-4px);
  transition: all var(--dur-fast) ease;
}

.footer-link:hover .link-arrow {
  opacity: 1;
  transform: translate(0);
}

.footer-bottom {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  align-items: center;
  padding: var(--sp-6) 0;
  font-size: var(--text-xs);
  color: var(--color-text-3);
  border-top: 1px solid var(--color-border);
}

@media (min-width: 768px) {
  .footer-bottom {
    flex-direction: row;
    justify-content: space-between;
  }
}

.footer-legal {
  display: flex;
  gap: var(--sp-4);
}

.footer-legal a {
  color: var(--color-text-3);
}

.footer-legal a:hover {
  color: var(--color-accent);
}
</style>
