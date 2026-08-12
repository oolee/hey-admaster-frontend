<script setup lang="ts">
import type { V2Tool } from '@/api';

import { onMounted, ref } from 'vue';

import { fetchTools } from '@/api';
import Badge from '@/components/ui/Badge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import RevealOnScroll from '@/components/ui/RevealOnScroll.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { toast } from '@/utils/toast';
import {
  ArrowRight,
  ChevronRight,
  Crop,
  Eye,
  LayoutGrid,
  Palette,
  PenLine,
  Scissors,
  Type,
  Wand2,
  ZoomIn,
} from 'lucide-vue-next';

const icons = {
  scissors: Scissors,
  zoomIn: ZoomIn,
  palette: Palette,
  type: Type,
  wand2: Wand2,
  crop: Crop,
  penLine: PenLine,
  layoutGrid: LayoutGrid,
  eye: Eye,
};
const data = ref<{ list: V2Tool[] }>({ list: [] });
const loading = ref(true);
const active = ref('');

function launch(tool: V2Tool) {
  toast.info(`${tool.name}已启动（演示模式）`);
}

async function load() {
  const res = await fetchTools();
  if (res.code === 0) data.value = res.data;
  loading.value = false;
}

onMounted(load);
</script>

<template>
  <div class="toolbox-page container">
    <header class="page-head">
      <RevealOnScroll>
        <span class="section-eyebrow">工具箱</span>
        <h1 class="display-title">
          让设计<br /><span class="text-gradient">事半功倍</span>的小工具
        </h1>
        <p class="section-desc">
          免费开箱即用的 AI 设计辅助工具，无需下载，随取随用。
        </p>
      </RevealOnScroll>
    </header>

    <div v-if="loading"><Skeleton :rows="3" :lines="3" /></div>

    <div v-else class="tools-grid">
      <RevealOnScroll
        v-for="(t, i) in data.list"
        :key="t.id"
        :delay="(i % 3) * 60"
      >
        <button
          class="tool-card"
          :class="{ active: active === t.id }"
          @click="launch(t)"
        >
          <div class="tool-icon">
            <component
              :is="icons[t.icon as keyof typeof icons] || Wand2"
              :size="22"
            />
          </div>
          <div class="tool-info">
            <div class="tool-name-row">
              <h3>{{ t.name }}</h3>
              <Badge v-if="t.badge" tone="accent">{{ t.badge }}</Badge>
            </div>
            <p>{{ t.desc }}</p>
          </div>
          <ArrowRight class="tool-arrow" :size="18" />
        </button>
      </RevealOnScroll>
    </div>

    <RevealOnScroll>
      <div class="tools-cta">
        <h2>没有找到想要的工具？</h2>
        <p>告诉我们你的需求，AI 实验室正在研发更多能力。</p>
        <BaseButton variant="primary" to="/labs">
          前往 AI 实验室 <ChevronRight :size="16" />
        </BaseButton>
      </div>
    </RevealOnScroll>
  </div>
</template>

<style scoped>
.toolbox-page {
  padding: var(--sp-9) 0 var(--sp-12);
}

.page-head {
  max-width: 720px;
  margin-bottom: var(--sp-7);
}

.page-head .display-title {
  margin: var(--sp-4) 0 var(--sp-4);
}

.tools-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
}

@media (min-width: 640px) {
  .tools-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .tools-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.tool-card {
  position: relative;
  display: flex;
  gap: var(--sp-4);
  align-items: center;
  width: 100%;
  padding: var(--sp-5);
  text-align: left;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  transition: all var(--dur-med) var(--ease-out-expo);
}

.tool-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}

.tool-card.active {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-accent);
}

.tool-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-radius: var(--r-lg);
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name-row {
  display: flex;
  gap: var(--sp-2);
  align-items: center;
  margin-bottom: 4px;
}

.tool-name-row h3 {
  font-size: var(--text-base);
}

.tool-info p {
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.tool-arrow {
  flex-shrink: 0;
  color: var(--color-text-3);
  opacity: 0;
  transform: translateX(-6px);
  transition: all var(--dur-fast) ease;
}

.tool-card:hover .tool-arrow {
  color: var(--color-accent);
  opacity: 1;
  transform: translateX(0);
}

.tools-cta {
  padding: var(--sp-8);
  margin-top: var(--sp-9);
  text-align: center;
  background: var(--color-surface);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--r-2xl);
}

.tools-cta h2 {
  margin-bottom: var(--sp-2);
  font-size: var(--text-2xl);
}

.tools-cta p {
  margin-bottom: var(--sp-5);
  color: var(--color-text-3);
}
</style>
