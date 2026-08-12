<script setup lang="ts">
import { ref } from 'vue';

import ContentPage from '@/components/layout/ContentPage.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { toast } from '@/utils/toast';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-vue-next';

const form = ref({
  name: '',
  email: '',
  company: '',
  type: '商务合作',
  message: '',
});
const submitting = ref(false);

async function submit() {
  if (!form.value.name || !form.value.email || !form.value.message) {
    toast.error('请填写姓名、邮箱与需求详情');
    return;
  }
  submitting.value = true;
  await new Promise((r) => setTimeout(r, 800));
  toast.success('已收到你的留言，我们会在 1 个工作日内回复');
  form.value = {
    name: '',
    email: '',
    company: '',
    type: '商务合作',
    message: '',
  };
  submitting.value = false;
}
</script>

<template>
  <ContentPage
    eyebrow="联系我们"
    title="任何合作、咨询或吐槽都欢迎"
    subtitle="Hey 19 团队通常在 1 个工作日内回复。"
    hero-variant="gradient"
  >
    <h2 id="channels">联系渠道</h2>
    <div class="channels">
      <div class="ch">
        <Mail :size="22" />
        <h4>商务合作</h4>
        <p>企业定制 / API / 品牌全案</p>
        <a href="mailto:business@hey19.design">business@hey19.design</a>
      </div>
      <div class="ch">
        <MessageCircle :size="22" />
        <h4>技术支持</h4>
        <p>产品使用 / 账户问题</p>
        <a href="mailto:support@hey19.design">support@hey19.design</a>
      </div>
      <div class="ch">
        <MapPin :size="22" />
        <h4>总部地址</h4>
        <p>中国 · 杭州 · 创意产业园 19 号</p>
        <span>欢迎预约参观</span>
      </div>
      <div class="ch">
        <Phone :size="22" />
        <h4>商务热线</h4>
        <p>工作日 9:00-18:00</p>
        <a href="tel:+8657188888888">+86 571-8888-8888</a>
      </div>
    </div>

    <h2 id="form">给我们留言</h2>
    <form class="contact-form" @submit.prevent="submit">
      <div class="grid">
        <label class="form-field">
          <span>姓名 *</span>
          <input v-model="form.name" type="text" placeholder="怎么称呼你？" />
        </label>
        <label class="form-field">
          <span>邮箱 *</span>
          <input
            v-model="form.email"
            type="email"
            placeholder="name@example.com"
          />
        </label>
        <label class="form-field">
          <span>公司</span>
          <input v-model="form.company" type="text" placeholder="可选" />
        </label>
        <label class="form-field">
          <span>咨询类型</span>
          <select v-model="form.type">
            <option>商务合作</option>
            <option>技术支持</option>
            <option>媒体咨询</option>
            <option>求职者</option>
            <option>其它</option>
          </select>
        </label>
      </div>
      <label class="form-field">
        <span>需求详情 *</span>
        <textarea
          v-model="form.message"
          rows="5"
          placeholder="请告诉我们你的具体需求…"
        ></textarea>
      </label>
      <BaseButton
        variant="primary"
        size="lg"
        type="submit"
        :loading="submitting"
      >
        发送留言
      </BaseButton>
    </form>

    <div class="callout">
      <span>🔐</span>
      <span>你提交的信息仅用于回复你的咨询，不会用于任何其他用途。</span>
    </div>
  </ContentPage>
</template>

<style scoped>
.channels {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
  margin: var(--sp-4) 0;
}

@media (min-width: 640px) {
  .channels {
    grid-template-columns: repeat(2, 1fr);
  }
}

.ch {
  padding: var(--sp-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

.ch svg {
  margin-bottom: var(--sp-2);
  color: var(--color-accent);
}

.ch h4 {
  margin-bottom: 4px;
  font-size: var(--text-base);
  font-weight: 700;
}

.ch p {
  margin-bottom: var(--sp-2);
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.ch a {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-accent);
}

.ch span:not(.ch svg) {
  font-size: var(--text-sm);
  color: var(--color-text-2);
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  margin: var(--sp-4) 0;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.form-field span {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-1);
}

.form-field input,
.form-field textarea,
.form-field select {
  padding: 0.7rem 0.9rem;
  font-size: var(--text-base);
  color: var(--color-text-1);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--r-md);
  transition:
    border-color var(--dur-fast) ease,
    box-shadow var(--dur-fast) ease;
}

.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus {
  outline: none;
  border-color: var(--color-border-strong);
  box-shadow: 0 0 0 3px var(--glow-accent);
}

.form-field textarea {
  font-family: inherit;
  resize: vertical;
}
</style>
