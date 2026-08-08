<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { useAuth } from '#/composables/useAuth';

const router = useRouter();
const route = useRoute();
const { login, loading } = useAuth();

const form = ref({
  username: 'admin',
  password: '1q2w3E*',
  rememberMe: false,
});
const error = ref('');

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    error.value = '请输入用户名和密码';
    return;
  }

  error.value = '';

  try {
    await login(form.value.username, form.value.password);
    const redirect = (route.query.redirect as string) || '/';
    // 防止开放重定向：仅允许站内路径（以 / 开头且不是 //）
    const safeRedirect =
      redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
    router.push(safeRedirect);
  } catch (error: any) {
    error.value = error.message || '登录失败，请稍后重试';
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <!-- 返回首页按钮 -->
      <RouterLink to="/" class="auth-back-btn">
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        返回首页
      </RouterLink>

      <div class="auth-header">
        <RouterLink to="/" class="auth-logo">
          <span class="brand-text">Hey 19</span>
        </RouterLink>
        <h1 class="auth-title">欢迎回来</h1>
        <p class="auth-subtitle">登录你的账户，开始创作之旅</p>
      </div>

      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label" for="username">用户名</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            class="form-input"
            placeholder="请输入用户名"
            autocomplete="username"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="form-input"
            placeholder="请输入密码"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>

        <div class="form-options">
          <label class="remember-me">
            <input v-model="form.rememberMe" type="checkbox" />
            <span>记住我</span>
          </label>
          <a href="#" class="forgot-link">忘记密码？</a>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button
          type="submit"
          class="btn-neon-filled auth-submit"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner"></span>
          <span v-else>登录</span>
        </button>
      </form>

      <div class="auth-footer">
        <span>还没有账户？</span>
        <RouterLink to="/register" class="auth-link">立即注册</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--color-bg-primary);
}

.auth-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 40px 36px;
}

.auth-back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 6px 12px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.auth-back-btn:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.auth-header {
  margin-bottom: 36px;
  text-align: center;
}

.auth-logo {
  display: inline-block;
  margin-bottom: 24px;
  text-decoration: none;
}

.brand-text {
  display: inline-flex;
  align-items: center;
  padding: 6px 18px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-bg-primary);
  background: var(--color-neon);
  border-radius: 9999px;
}

.auth-title {
  margin-bottom: 8px;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.auth-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  font-family: var(--font-sans);
  font-size: 0.95rem;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.form-input:focus {
  border-color: var(--color-neon);
  box-shadow: 0 0 0 3px var(--color-neon-glow);
}

.form-input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.form-input::placeholder {
  color: var(--color-text-muted);
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
}

.remember-me {
  display: flex;
  gap: 6px;
  align-items: center;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.remember-me input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-neon);
  cursor: pointer;
}

.forgot-link {
  color: var(--color-neon);
  text-decoration: none;
  transition: opacity 0.2s;
}

.forgot-link:hover {
  opacity: 0.8;
}

.form-error {
  padding: 10px 14px;
  font-size: 0.85rem;
  color: #ff4d4f;
  text-align: center;
  background: rgb(255 77 79 / 10%);
  border: 1px solid rgb(255 77 79 / 20%);
  border-radius: 8px;
}

.auth-submit {
  justify-content: center;
  width: 100%;
  padding: 14px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 10px;
}

.auth-submit:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top-color: currentcolor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.auth-footer {
  margin-top: 28px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  text-align: center;
}

.auth-link {
  margin-left: 4px;
  font-weight: 500;
  color: var(--color-neon);
  text-decoration: none;
  transition: opacity 0.2s;
}

.auth-link:hover {
  opacity: 0.8;
}
</style>
