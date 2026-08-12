<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useUserStore } from '@/stores/user';
import { toast } from '@/utils/toast';
import { ArrowLeft, Eye, EyeOff, Sparkles, Wand2 } from 'lucide-vue-next';

const router = useRouter();
const user = useUserStore();

const mode = ref('login');
const showPwd = ref(false);
const loading = ref(false);
const form = ref({ name: '', email: 'admin@abp.io', password: '1q2w3E*' });
const errors = ref<Record<string, string>>({});

const isLogin = computed(() => mode.value === 'login');

function validate() {
  errors.value = {};
  if (!form.value.email) errors.value.email = '请输入邮箱';
  else if (!/^\S+@\S+\.\S+$/.test(form.value.email))
    errors.value.email = '邮箱格式不正确';
  if (!form.value.password || form.value.password.length < 6)
    errors.value.password = '密码至少 6 位';
  if (!isLogin.value && !form.value.name) errors.value.name = '请输入昵称';
  return Object.keys(errors.value).length === 0;
}

async function submit() {
  if (!validate()) return;
  loading.value = true;
  try {
    if (isLogin.value) {
      await user.login({
        email: form.value.email,
        password: form.value.password,
      });
      toast.success('欢迎回来！');
    } else {
      await user.register({ ...form.value });
      toast.success('注册成功，已赠送 50 积分');
    }
    router.push('/workspace');
  } catch (error) {
    toast.error(
      (error instanceof Error ? error.message : String(error)) || '操作失败',
    );
  } finally {
    loading.value = false;
  }
}

function social(name: string) {
  toast.info(`${name} 登录为演示功能`);
}
</script>

<template>
  <div class="auth-page">
    <!-- 左侧品牌区 -->
    <div class="auth-brand">
      <div class="brand-bg bg-grid"></div>
      <div class="brand-glow"></div>

      <div class="brand-content">
        <router-link to="/" class="back-link">
          <ArrowLeft :size="15" /> 返回首页
        </router-link>

        <div class="brand-quote">
          <div class="quote-orb"><Wand2 :size="26" /></div>
          <h2>
            "让每一次创作<br />都成为<span class="text-gradient">品牌资产</span
            >"
          </h2>
          <p>加入 5,000+ 企业，用 AI 重新定义你的视觉生产力。</p>
        </div>

        <div class="brand-points">
          <div class="bp">
            <Sparkles :size="15" /><span>300+ 专业模板</span>
          </div>
          <div class="bp"><Sparkles :size="15" /><span>商用授权保障</span></div>
          <div class="bp">
            <Sparkles :size="15" /><span>7×24 AI 在线创作</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧表单区 -->
    <div class="auth-form-side">
      <div class="auth-box">
        <div class="mode-tabs">
          <button :class="{ on: isLogin }" @click="mode = 'login'">登录</button>
          <button :class="{ on: !isLogin }" @click="mode = 'register'">
            注册
          </button>
        </div>

        <h1 class="auth-title">{{ isLogin ? '欢迎回来' : '创建你的账户' }}</h1>
        <p class="auth-sub">
          {{ isLogin ? '继续你的创意之旅' : '注册即送 50 积分，立即体验' }}
        </p>

        <form class="auth-form" @submit.prevent="submit">
          <BaseInput
            v-if="!isLogin"
            v-model="form.name"
            label="昵称"
            placeholder="怎么称呼你？"
            :error="errors.name"
          />
          <BaseInput
            v-model="form.email"
            label="邮箱"
            type="email"
            placeholder="name@example.com"
            :error="errors.email"
          />
          <BaseInput
            v-model="form.password"
            label="密码"
            :type="showPwd ? 'text' : 'password'"
            placeholder="至少 6 位"
            :error="errors.password"
          >
            <template #suffix>
              <button type="button" class="pwd-eye" @click="showPwd = !showPwd">
                <EyeOff v-if="showPwd" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </template>
          </BaseInput>

          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            block
            :loading="loading"
          >
            {{ isLogin ? '登录' : '注册并开始创作' }}
          </BaseButton>
        </form>

        <div class="divider"><span>或使用以下方式</span></div>

        <div class="social-row">
          <button class="social" @click="social('微信')">微信</button>
          <button class="social" @click="social('QQ')">QQ</button>
          <button class="social" @click="social('手机号')">手机号</button>
        </div>

        <p class="auth-agree">登录即代表同意《服务条款》与《隐私政策》</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  grid-template-columns: 1fr;
  min-height: 100vh;
}

@media (min-width: 1024px) {
  .auth-page {
    grid-template-columns: 1.1fr 0.9fr;
  }
}

/* 左侧品牌区 */
.auth-brand {
  position: relative;
  display: none;
  min-height: 100vh;
  padding: var(--sp-8);
  overflow: hidden;
  background: var(--color-primary-deep);
}

@media (min-width: 1024px) {
  .auth-brand {
    display: flex;
  }
}

.brand-bg {
  position: absolute;
  inset: 0;
  opacity: 0.5;
}

.brand-glow {
  position: absolute;
  bottom: -20%;
  left: -10%;
  width: 600px;
  height: 500px;
  background: radial-gradient(ellipse, var(--glow-accent) 0%, transparent 60%);
  filter: blur(50px);
}

.brand-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
}

.back-link {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  width: fit-content;
  padding: 0.5rem 0.9rem;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.back-link:hover {
  color: var(--color-text-1);
  border-color: var(--color-border-strong);
}

.brand-quote {
  margin: auto 0;
}

.quote-orb {
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

.brand-quote h2 {
  margin-bottom: var(--sp-4);
  font-size: clamp(var(--text-2xl), 3.5vw, var(--text-4xl));
  line-height: 1.25;
  color: var(--color-text-1);
}

.brand-quote p {
  max-width: 40ch;
  font-size: var(--text-lg);
  color: var(--color-text-2);
}

.brand-points {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.bp {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  font-size: var(--text-sm);
  color: var(--color-text-2);
}

.bp svg {
  color: var(--color-accent);
}

/* 右侧表单区 */
.auth-form-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-8) var(--sp-5);
}

.auth-box {
  width: 100%;
  max-width: 420px;
}

.mode-tabs {
  display: flex;
  gap: var(--sp-5);
  margin-bottom: var(--sp-6);
  border-bottom: 1px solid var(--color-border);
}

.mode-tabs button {
  padding: 0.7rem 0.2rem;
  margin-bottom: -1px;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-3);
  border-bottom: 2px solid transparent;
  transition: all var(--dur-fast) ease;
}

.mode-tabs button.on {
  color: var(--color-text-1);
  border-bottom-color: var(--color-accent);
}

.auth-title {
  margin-bottom: 4px;
  font-size: var(--text-2xl);
}

.auth-sub {
  margin-bottom: var(--sp-6);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  margin-bottom: var(--sp-5);
}

.pwd-eye {
  display: flex;
  color: var(--color-text-3);
  transition: color var(--dur-fast) ease;
}

.pwd-eye:hover {
  color: var(--color-text-1);
}

.divider {
  display: flex;
  gap: var(--sp-4);
  align-items: center;
  margin-bottom: var(--sp-4);
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.divider::before,
.divider::after {
  flex: 1;
  height: 1px;
  content: '';
  background: var(--color-border);
}

.social-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-3);
  margin-bottom: var(--sp-5);
}

.social {
  height: 44px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.social:hover {
  color: var(--color-text-1);
  border-color: var(--color-border-strong);
  transform: translateY(-2px);
}

.auth-agree {
  font-size: var(--text-xs);
  color: var(--color-text-3);
  text-align: center;
}
</style>
