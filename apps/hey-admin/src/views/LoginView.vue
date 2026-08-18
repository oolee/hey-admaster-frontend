<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-vue-next';

import AButton from '#/components/admin/AButton.vue';
import AInput from '#/components/admin/AInput.vue';
import { useAdminStore } from '#/stores/admin';
import { toast } from '#/utils/toast';

const router = useRouter();
const route = useRoute();
const admin = useAdminStore();

const username = ref('admin');
const password = ref('');
const showPwd = ref(false);
const loading = ref(false);
const error = ref('');

/* 已登录访问登录页 → 直接回首页 */
onMounted(() => {
  if (admin.isLoggedIn) {
    router.replace(route.query.redirect || '/dashboard');
  }
});

async function submit() {
  error.value = '';
  if (!username.value || !password.value) {
    error.value = '请输入账号和密码';
    return;
  }
  loading.value = true;
  try {
    await admin.login({ username: username.value, password: password.value });
    toast.success('登录成功，欢迎回来');
    router.push(route.query.redirect || '/dashboard');
  } catch (error) {
    error.value = error.message || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="lg">
    <div class="lg-brand">
      <div class="lg-glow"></div>
      <div class="lg-brand-inner">
        <router-link to="/" class="lg-back">
          <ArrowLeft :size="15" /> 返回前台
        </router-link>
        <div class="lg-quote">
          <div class="lg-orb"><ShieldCheck :size="30" /></div>
          <h1>Hey 19<br /><span class="grad">管理控制台</span></h1>
          <p>
            经营分析 · 用户管理 · 模型计费 · 内容审核<br />一站式掌控 AI
            创意平台
          </p>
        </div>
      </div>
    </div>

    <div class="lg-form-side">
      <div class="lg-box">
        <p class="lg-eyebrow">ADMIN CONSOLE</p>
        <h2>管理员登录</h2>
        <p class="lg-sub">使用管理员账号登录后台系统</p>

        <form class="lg-form" @submit.prevent="submit">
          <AInput
            v-model="username"
            label="账号"
            placeholder="请输入管理员账号"
          >
            <template #prefix><User :size="15" class="pre-icon" /></template>
          </AInput>
          <AInput
            v-model="password"
            label="密码"
            :type="showPwd ? 'text' : 'password'"
            placeholder="请输入密码"
          >
            <template #prefix><Lock :size="15" class="pre-icon" /></template>
            <template #suffix>
              <button type="button" class="pwd-eye" @click="showPwd = !showPwd">
                <EyeOff v-if="showPwd" :size="15" />
                <Eye v-else :size="15" />
              </button>
            </template>
          </AInput>

          <p v-if="error" class="lg-error">{{ error }}</p>
          <div class="lg-row">
            <label class="lg-check"><input type="checkbox" /> 记住我</label>
            <span class="lg-forgot">忘记密码？</span>
          </div>

          <AButton
            variant="primary"
            size="lg"
            block
            type="submit"
            :loading="loading"
          >
            登 录
          </AButton>
        </form>

        <p class="lg-hint">演示账号：admin / admin123</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lg {
  display: grid;
  grid-template-columns: 1fr;
  min-height: 100vh;
}

@media (min-width: 1024px) {
  .lg {
    grid-template-columns: 1.1fr 0.9fr;
  }
}

.lg-brand {
  position: relative;
  display: none;
  padding: var(--sp-8);
  overflow: hidden;
  background: var(--color-primary-deep);
}

@media (min-width: 1024px) {
  .lg-brand {
    display: flex;
  }
}

.lg-glow {
  position: absolute;
  right: -10%;
  bottom: -20%;
  width: 600px;
  height: 500px;
  background: radial-gradient(ellipse, var(--glow-accent) 0%, transparent 60%);
  filter: blur(50px);
}

.lg-brand-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
}

.lg-back {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  width: fit-content;
  padding: 0.5rem 0.9rem;
  font-size: var(--text-sm);
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
}

.lg-back:hover {
  color: var(--color-accent);
}

.lg-quote {
  margin: auto 0;
}

.lg-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: var(--sp-5);
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-accent);
}

.lg-quote h1 {
  margin-bottom: var(--sp-4);
  font-size: clamp(var(--text-3xl), 4vw, var(--text-5xl));
  line-height: 1.15;
  color: var(--color-text-1);
}

.grad {
  background: linear-gradient(120deg, var(--color-accent), var(--color-ai));
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.lg-quote p {
  font-size: var(--text-lg);
  line-height: 1.8;
  color: var(--color-text-2);
}

.lg-form-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-8) var(--sp-5);
}

.lg-box {
  width: 100%;
  max-width: 400px;
}

.lg-eyebrow {
  margin-bottom: var(--sp-3);
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-accent);
  letter-spacing: 0.14em;
}

.lg-box h2 {
  margin-bottom: 4px;
  font-size: var(--text-2xl);
}

.lg-sub {
  margin-bottom: var(--sp-6);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.lg-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.pre-icon {
  color: var(--color-text-3);
}

.pwd-eye {
  display: flex;
  color: var(--color-text-3);
}

.pwd-eye:hover {
  color: var(--color-text-1);
}

.lg-error {
  font-size: var(--text-sm);
  color: var(--color-error);
}

.lg-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--text-sm);
}

.lg-check {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: var(--color-text-2);
  cursor: pointer;
}

.lg-check input {
  accent-color: var(--color-accent);
}

.lg-forgot {
  color: var(--color-accent);
  cursor: pointer;
}

.lg-hint {
  margin-top: var(--sp-5);
  font-size: var(--text-xs);
  color: var(--color-text-3);
  text-align: center;
}
</style>
