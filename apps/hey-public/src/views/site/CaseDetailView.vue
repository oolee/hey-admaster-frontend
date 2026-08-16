<script setup lang="ts">
import type { V2Case } from '@/api';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { fetchCaseDetail } from '@/api';
import ArtCanvas from '@/components/ui/ArtCanvas.vue';
import Badge from '@/components/ui/Badge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import RevealOnScroll from '@/components/ui/RevealOnScroll.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { toast } from '@/utils/toast';
import {
  ArrowLeft,
  Download,
  Eye,
  Heart,
  Share2,
  TrendingUp,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const detail = ref<null | V2Case>(null);
const gallery = computed(() => detail.value?.gallery || []);
const metrics = computed(() => detail.value?.metrics || []);
const loading = ref(true);
const liked = ref(false);

async function load() {
  const res = await fetchCaseDetail(String(route.params.id ?? ''));
  if (res.code === 0) detail.value = res.data;
  loading.value = false;
}

function share() {
  toast.success('链接已复制，快去分享吧');
}

onMounted(load);
</script>

<template>
  <div class="detail container">
    <button class="back-btn" @click="router.push('/cases')">
      <ArrowLeft :size="16" /> 返回案例列表
    </button>

    <div v-if="loading"><Skeleton :rows="5" :lines="4" /></div>

    <template v-else-if="detail">
      <RevealOnScroll>
        <header class="detail-head">
          <div class="detail-tags">
            <Badge tone="accent">{{ detail.category }}</Badge>
            <Badge tone="ai">{{ detail.industry }}</Badge>
          </div>
          <h1 class="display-title">{{ detail.title }}</h1>
          <p class="section-desc">{{ detail.description }}</p>

          <div class="detail-actions">
            <button
              class="action-chip"
              :class="{ liked }"
              @click="liked = !liked"
            >
              <Heart :size="16" :fill="liked ? 'currentColor' : 'none'" />
              {{ liked ? detail.likes + 1 : detail.likes }}
            </button>
            <button class="action-chip" @click="share">
              <Share2 :size="16" /> 分享
            </button>
            <span class="action-chip static"
              ><Eye :size="16" /> {{ detail.views.toLocaleString() }}</span
            >
            <BaseButton variant="primary" size="md">
              <Download :size="16" /> 下载源文件
            </BaseButton>
          </div>
        </header>
      </RevealOnScroll>

      <!-- 图库 -->
      <RevealOnScroll>
        <div class="gallery">
          <div
            v-for="(g, i) in gallery"
            :key="g.id"
            class="gallery-item"
            :class="{ wide: i === 0 }"
          >
            <ArtCanvas
              variant="poster"
              :seed="detail.id * 10 + i"
              :label="g.label"
            />
            <span class="gallery-label">{{ g.label }}</span>
          </div>
        </div>
      </RevealOnScroll>

      <!-- 指标与详情 -->
      <div class="detail-grid">
        <RevealOnScroll>
          <div class="metrics">
            <div v-for="m in metrics" :key="m.label" class="metric">
              <span class="metric-value"
                ><TrendingUp :size="18" /> {{ m.value }}</span
              >
              <span class="metric-label">{{ m.label }}</span>
            </div>
          </div>
        </RevealOnScroll>

        <RevealOnScroll :delay="100">
          <div class="case-info-card">
            <h3>项目信息</h3>
            <dl>
              <div>
                <dt>客户</dt>
                <dd>{{ detail.client }}</dd>
              </div>
              <div>
                <dt>交付时间</dt>
                <dd>{{ detail.date }}</dd>
              </div>
              <div>
                <dt>成果</dt>
                <dd>{{ detail.result }}</dd>
              </div>
              <div>
                <dt>服务内容</dt>
                <dd>{{ detail.tags.join(' · ') }}</dd>
              </div>
            </dl>
            <BaseButton variant="outline" to="/workspace" class="full">
              用 AI 复刻同款风格
            </BaseButton>
          </div>
        </RevealOnScroll>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail {
  padding: var(--sp-8) 0 var(--sp-12);
}

.back-btn {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.5rem 1rem;
  margin-bottom: var(--sp-6);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.back-btn:hover {
  color: var(--color-text-1);
  border-color: var(--color-border-strong);
}

.detail-head {
  max-width: 760px;
  margin-bottom: var(--sp-7);
}

.detail-tags {
  display: flex;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
}

.detail-head .display-title {
  margin-bottom: var(--sp-4);
  font-size: clamp(var(--text-2xl), 5vw, var(--text-4xl));
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
  align-items: center;
  margin-top: var(--sp-6);
}

.action-chip {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.55rem 1.1rem;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.action-chip:hover {
  color: var(--color-text-1);
  border-color: var(--color-border-strong);
}

.action-chip.liked {
  color: var(--color-error);
  border-color: var(--color-error);
}

.action-chip.static {
  cursor: default;
}

.gallery {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-5);
  margin-bottom: var(--sp-8);
}

@media (min-width: 768px) {
  .gallery {
    grid-template-columns: repeat(2, 1fr);
  }

  .gallery .wide {
    grid-column: 1 / -1;
    aspect-ratio: 21/9;
  }
}

.gallery-item {
  position: relative;
  aspect-ratio: 16/10;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
}

.gallery-label {
  position: absolute;
  bottom: 12px;
  left: 12px;
  padding: 0.35rem 0.8rem;
  font-size: var(--text-xs);
  font-weight: 500;
  color: #fff;
  background: rgb(15 46 44 / 55%);
  border-radius: var(--r-full);
  backdrop-filter: blur(6px);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-6);
}

@media (min-width: 1024px) {
  .detail-grid {
    grid-template-columns: 1.2fr 0.8fr;
  }
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-4);
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: var(--sp-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
}

.metric-value {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-accent);
}

.metric-label {
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.case-info-card {
  padding: var(--sp-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
}

.case-info-card h3 {
  margin-bottom: var(--sp-4);
  font-size: var(--text-lg);
}

.case-info-card dl {
  margin-bottom: var(--sp-5);
}

.case-info-card dl > div {
  display: flex;
  gap: var(--sp-4);
  justify-content: space-between;
  padding: 0.6rem 0;
  border-bottom: 1px dashed var(--color-border);
}

.case-info-card dt {
  flex-shrink: 0;
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.case-info-card dd {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-1);
  text-align: right;
}

.full {
  width: 100%;
}
</style>
