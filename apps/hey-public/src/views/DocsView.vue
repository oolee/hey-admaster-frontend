<script setup lang="ts">
import ContentPage from '@/components/layout/ContentPage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';

const endpoints = [
  {
    method: 'POST',
    path: '/api/auth/login',
    desc: '用户登录，返回 token 与用户信息',
  },
  {
    method: 'POST',
    path: '/api/auth/register',
    desc: '注册新账户并获取初始积分',
  },
  { method: 'GET', path: '/api/auth/me', desc: '通过 token 获取当前登录用户' },
  {
    method: 'GET',
    path: '/api/cases?page&pageSize&category&keyword',
    desc: '获取案例列表，支持分页与筛选',
  },
  {
    method: 'GET',
    path: '/api/cases/:id',
    desc: '获取单个案例详情、图库与指标',
  },
  {
    method: 'GET',
    path: '/api/templates?category',
    desc: '获取模板列表与分类',
  },
  {
    method: 'POST',
    path: '/api/workspace/generate',
    desc: '提交生成任务（文生图 / 改图 / PPT / 网页 / 代码）',
  },
  { method: 'GET', path: '/api/workspace/conversations', desc: '获取会话列表' },
  {
    method: 'GET',
    path: '/api/workspace/conversations/:id/messages',
    desc: '获取会话消息历史',
  },
];
</script>

<template>
  <ContentPage
    eyebrow="开发者文档"
    title="Hey 19 API 文档"
    subtitle="RESTful API 设计，覆盖认证、案例、模板、工作台与计费查询。"
    hero-variant="gradient"
  >
    <h2 id="quickstart">快速开始</h2>
    <p>
      所有接口 base URL 为 <code>https://api.hey19.design/v1</code>（开发环境为
      <code>http://localhost:5388/api</code>）。需要在请求头携带
      <code>Authorization: Bearer &lt;token&gt;</code>。
    </p>

    <div class="callout">
      <span>💡</span>
      <span
        >所有响应统一格式：<code>{ code, data, message }</code>。code=0
        表示成功。</span
      >
    </div>

    <h2 id="auth">认证</h2>
    <p>
      通过 <code>POST /auth/login</code> 拿到 token
      后，请存到本地并在每次请求时携带，过期会自动返回 401。
    </p>

    <pre><code>{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": 1, "name": "...", "email": "...", "credits": 6970, "level": "专业版" }
  },
  "message": "ok"
}</code></pre>

    <h2 id="endpoints">接口列表</h2>
    <div v-for="ep in endpoints" :key="ep.path" class="endpoint">
      <span class="method" :class="ep.method.toLowerCase()">{{
        ep.method
      }}</span>
      <code>{{ ep.path }}</code>
      <span
        style="
          margin-left: auto;
          font-family: var(--font-body);
          color: var(--color-text-3);
        "
        >{{ ep.desc }}</span
      >
    </div>

    <h2 id="error">错误码</h2>
    <ul>
      <li><code>401</code> 未登录或 token 过期</li>
      <li><code>402</code> 积分不足</li>
      <li><code>403</code> 无权限（团队席位已满 / 配额用尽）</li>
      <li><code>429</code> 限流（请按 Retry-After 重试）</li>
    </ul>

    <div style="display: flex; gap: 12px; margin-top: var(--sp-6)">
      <BaseButton variant="primary" to="/contact">申请生产 API Key</BaseButton>
      <BaseButton variant="outline" href="https://github.com/hey19/sdk">
        下载 SDK
      </BaseButton>
    </div>

    <template #toc>
      <p class="cp-toc-title">本页</p>
      <a href="#quickstart">快速开始</a>
      <a href="#auth">认证</a>
      <a href="#endpoints">接口列表</a>
      <a href="#error">错误码</a>
    </template>
  </ContentPage>
</template>

<style scoped>
.cp-toc-title {
  margin-bottom: 0.6rem;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.cp-toc a {
  display: block;
  padding: 0.3rem 0;
  font-size: var(--text-sm);
  color: var(--color-text-2);
}

.cp-toc a:hover {
  color: var(--color-accent);
}
</style>
