<script setup lang="ts">
import type { V2Lab } from '@/api';

import { onMounted, ref } from 'vue';

import { fetchLabs } from '@/api';
import Badge from '@/components/ui/Badge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import RevealOnScroll from '@/components/ui/RevealOnScroll.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { toast } from '@/utils/toast';
import { CircleUser, FlaskConical, Rocket } from 'lucide-vue-next';

const data = ref<{ list: V2Lab[] }>({ list: [] });
const loading = ref(true);

const statusTone: Record<string, string> = {
  内测中: 'warning',
  公测: 'success',
  开发中: 'ai',
  构思中: 'neutral',
};

async function load() {
  const res = await fetchLabs();
  if (res.code === 0) data.value = res.data;
  loading.value = false;
}

function join(lab: V2Lab) {
  toast.info(`已提交「${lab.name}」的内测申请`);
}

onMounted(load);
</script>

<template>
  <div class="labs-page container">
    <header class="page-head">
      <RevealOnScroll>
        <span class="section-eyebrow"
          ><FlaskConical :size="14" /> AI 实验室</span
        >
        <h1 class="display-title">
          正在发生<br />与即将发生的<span class="text-gradient">未来</span>
        </h1>
        <p class="section-desc">
          这里是 Hey 19 的研发前线，第一时间体验尚未发布的新能力。
        </p>
      </RevealOnScroll>
    </header>

    <div v-if="loading"><Skeleton :rows="3" :lines="3" /></div>

    <div v-else class="labs-grid">
      <RevealOnScroll v-for="(l, i) in data.list" :key="l.id" :delay="i * 70">
        <div class="lab-card">
          <div class="lab-top">
            <div class="lab-orb" :style="{ animationDelay: `${i * 0.5}s` }">
              <Rocket :size="20" />
            </div>
            <Badge :tone="statusTone[l.status] || 'neutral'">
              {{ l.status }}
            </Badge>
          </div>
          <h3>{{ l.name }}</h3>
          <p>{{ l.desc }}</p>

          <div class="lab-progress">
            <div class="progress-track">
              <div
                class="progress-bar"
                :style="{ width: `${l.progress}%` }"
              ></div>
            </div>
            <span>{{ l.progress }}%</span>
          </div>

          <BaseButton
            :variant="l.progress >= 100 ? 'primary' : 'outline'"
            size="sm"
            @click="join(l)"
          >
            {{ l.progress >= 100 ? '立即体验' : '申请内测' }}
          </BaseButton>
        </div>
      </RevealOnScroll>
    </div>

    <RevealOnScroll>
      <div class="labs-note">
        <CircleUser :size="20" />
        <p>
          <strong>邀请制说明：</strong>实验室功能采用邀请制，提交申请后将在 48
          小时内收到内测资格通知。
        </p>
      </div>
    </RevealOnScroll>
  </div>
</template>

<style scoped>
.labs-page {
  padding: var(--sp-9) 0 var(--sp-12);
}

.page-head {
  max-width: 720px;
  margin-bottom: var(--sp-7);
}

.page-head .display-title {
  margin: var(--sp-4) 0 var(--sp-4);
}

.labs-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-5);
}

@media (min-width: 768px) {
  .labs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.lab-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  transition: all var(--dur-med) var(--ease-out-expo);
}

.lab-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}

.lab-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lab-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-accent);
  animation: breathe 3s ease-in-out infinite;
}

.lab-card h3 {
  font-size: var(--text-lg);
}

.lab-card p {
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.lab-progress {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
}

.progress-track {
  flex: 1;
  height: 8px;
  overflow: hidden;
  background: var(--color-surface-2);
  border-radius: var(--r-full);
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-ai));
  border-radius: var(--r-full);
  transition: width 1s var(--ease-out-expo);
}

.lab-progress span {
  min-width: 40px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-2);
  text-align: right;
}

.labs-note {
  display: flex;
  gap: var(--sp-3);
  align-items: flex-start;
  padding: var(--sp-5);
  margin-top: var(--sp-8);
  color: var(--color-ai);
  background: var(--color-ai-soft);
  border: 1px solid color-mix(in srgb, var(--color-ai) 30%, transparent);
  border-radius: var(--r-lg);
}

.labs-note svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.labs-note p {
  font-size: var(--text-sm);
  color: var(--color-text-2);
}

.labs-note strong {
  color: var(--color-text-1);
}
</style>
