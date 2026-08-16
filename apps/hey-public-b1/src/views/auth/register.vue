<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

const router = useRouter();

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
});
const loading = ref(false);
const error = ref('');
const success = ref(false);

/** 从 Cookie 中获取 ABP 反伪造令牌 */
function getAntiForgeryToken(): null | string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  const token = match?.[1];
  return token ? decodeURIComponent(token) : null;
}

/** 确保已有反伪造令牌（首次请求时 Cookie 尚未设置，需先发 GET 请求获取） */
async function ensureAntiForgeryToken(): Promise<null | string> {
  let token = getAntiForgeryToken();
  if (token) return token;

  // 发一个 GET 请求让服务器设置 XSRF-TOKEN Cookie
  await fetch('/api/abp/application-configuration').catch(() => {});
  token = getAntiForgeryToken();
  return token;
}

async function handleRegister() {
  error.value = '';

  if (!form.value.username || !form.value.email || !form.value.password) {
    error.value = '请填写所有必填字段';
    return;
  }

  if (form.value.password !== form.value.confirmPassword) {
    error.value = '两次输入的密码不一致';
    return;
  }

  if (form.value.password.length < 6) {
    error.value = '密码长度至少为6位';
    return;
  }

  loading.value = true;

  try {
    // 获取反伪造令牌
    const antiForgeryToken = await ensureAntiForgeryToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (antiForgeryToken) {
      headers.RequestVerificationToken = antiForgeryToken;
    }

    const response = await fetch('/api/account/register', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userName: form.value.username,
        emailAddress: form.value.email,
        password: form.value.password,
        appName: 'AdMaster',
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || '注册失败，请稍后重试');
    }

    success.value = true;
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } catch (error: any) {
    error.value = error.message || '注册失败，请稍后重试';
  } finally {
    loading.value = false;
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
        <h1 class="auth-title">创建账户</h1>
        <p class="auth-subtitle">注册新账户，开启AI创意之旅</p>
      </div>

      <div v-if="success" class="success-message">
        <svg
          viewBox="0 0 24 24"
          width="48"
          height="48"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <p>注册成功！正在跳转到登录页面...</p>
      </div>

      <form v-else class="auth-form" @submit.prevent="handleRegister">
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
          <label class="form-label" for="email">邮箱</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="form-input"
            placeholder="请输入邮箱地址"
            autocomplete="email"
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
            placeholder="请输入密码（至少6位）"
            autocomplete="new-password"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            class="form-input"
            placeholder="请再次输入密码"
            autocomplete="new-password"
            :disabled="loading"
          />
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button
          type="submit"
          class="btn-neon-filled auth-submit"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner"></span>
          <span v-else>注册</span>
        </button>
      </form>

      <div v-if="!success" class="auth-footer">
        <span>已有账户？</span>
        <RouterLink to="/login" class="auth-link">立即登录</RouterLink>
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

.success-message {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  padding: 32px 0;
  color: var(--color-neon);
  text-align: center;
}

.success-message p {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}
</style>
