<script setup lang="ts">
import type { V2Case } from '@/api';

import { onMounted, ref, watch } from 'vue';

import { fetchCases } from '@/api';
import ArtCanvas from '@/components/ui/ArtCanvas.vue';
import Badge from '@/components/ui/Badge.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import RevealOnScroll from '@/components/ui/RevealOnScroll.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { ChevronLeft, ChevronRight, Eye, Heart, Search } from 'lucide-vue-next';

const categories = [
  '全部',
  '门头店招',
  'VI 设计',
  '海报设计',
  '印刷物料',
  '社媒内容',
  'Logo 设计',
];
const activeCat = ref('全部');
const keyword = ref('');
const page = ref(1);
const pageSize = 6;
const loading = ref(true);
const result = ref<{ list: V2Case[]; total: number; totalPages: number }>({
  list: [],
  total: 0,
  totalPages: 0,
});

async function load() {
  loading.value = true;
  const res = await fetchCases({
    page: page.value,
    pageSize,
    category: activeCat.value,
    keyword: keyword.value,
  });
  if (res.code === 0) {
    result.value = res.data;
  }
  loading.value = false;
}

function selectCat(cat: string) {
  activeCat.value = cat;
  page.value = 1;
  load();
}

let timer: null | ReturnType<typeof setTimeout> = null;
function onSearch() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    load();
  }, 350);
}

function goPage(p: number) {
  if (p < 1 || p > result.value.totalPages) return;
  page.value = p;
  load();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onMounted(load);
watch([activeCat], load);
</script>

<template>
  <div class="cases-page container">
    <!-- 页头 -->
    <header class="page-head">
      <RevealOnScroll>
        <span class="section-eyebrow">案例展示</span>
        <h1 class="display-title">
          每一个爆款创意<br />都<span class="text-gradient">有迹可循</span>
        </h1>
        <p class="section-desc">
          从街头店招到线上传播，浏览 AI 与品牌碰撞的真实案例。
        </p>
      </RevealOnScroll>
    </header>

    <!-- 筛选工具条 -->
    <RevealOnScroll :delay="100">
      <div class="toolbar">
        <div class="cat-bar">
          <button
            v-for="c in categories"
            :key="c"
            class="cat-chip"
            :class="{ active: activeCat === c }"
            @click="selectCat(c)"
          >
            {{ c }}
          </button>
        </div>
        <div class="search-box">
          <Search :size="17" />
          <input
            v-model="keyword"
            placeholder="搜索案例、行业、标签…"
            @input="onSearch"
          />
        </div>
      </div>
    </RevealOnScroll>

    <!-- 结果 -->
    <div v-if="loading" class="case-grid">
      <div v-for="i in pageSize" :key="i" class="skeleton-card">
        <div class="sk-thumb"></div>
        <Skeleton :rows="2" :lines="2" />
      </div>
    </div>

    <div v-else-if="result.list.length" class="case-grid">
      <RevealOnScroll
        v-for="(c, i) in result.list"
        :key="c.id"
        :delay="(i % 3) * 70"
      >
        <router-link :to="`/cases/${c.id}`" class="case-card">
          <div class="case-thumb" :style="{ background: c.gradient }">
            <div class="case-thumb-inner">
              <ArtCanvas variant="poster" :seed="c.id" />
            </div>
            <Badge tone="neutral" class="case-cat">{{ c.category }}</Badge>
            <span class="case-likes"><Heart :size="13" /> {{ c.likes }}</span>
          </div>
          <div class="case-body">
            <h3>{{ c.title }}</h3>
            <p>{{ c.description }}</p>
            <div class="case-tags">
              <Badge v-for="t in c.tags" :key="t" tone="neutral">{{ t }}</Badge>
            </div>
            <div class="case-meta">
              <span class="case-views"
                ><Eye :size="13" /> {{ c.views.toLocaleString() }}</span
              >
              <span class="case-date">{{ c.date }}</span>
            </div>
          </div>
        </router-link>
      </RevealOnScroll>
    </div>

    <EmptyState
      v-else
      title="没有找到匹配的案例"
      desc="换个关键词或分类试试"
      action-text="重置筛选"
      @action="
        () => {
          activeCat = '全部';
          keyword = '';
          load();
        }
      "
    />

    <!-- 分页 -->
    <nav v-if="result.totalPages > 1" class="pagination" aria-label="分页">
      <button class="page-btn" :disabled="page <= 1" @click="goPage(page - 1)">
        <ChevronLeft :size="16" />
      </button>
      <button
        v-for="p in result.totalPages"
        :key="p"
        class="page-btn"
        :class="{ active: p === page }"
        @click="goPage(p)"
      >
        {{ p }}
      </button>
      <button
        class="page-btn"
        :disabled="page >= result.totalPages"
        @click="goPage(page + 1)"
      >
        <ChevronRight :size="16" />
      </button>
    </nav>
  </div>
</template>

<style scoped>
.cases-page {
  padding: var(--sp-9) 0 var(--sp-12);
}

.page-head {
  max-width: 720px;
  margin-bottom: var(--sp-7);
}

.page-head .display-title {
  margin: var(--sp-4) 0 var(--sp-4);
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  margin-bottom: var(--sp-7);
}

@media (min-width: 768px) {
  .toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.cat-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.cat-chip {
  padding: 0.5rem 1.1rem;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.cat-chip:hover {
  color: var(--color-text-1);
  border-color: var(--color-border-strong);
}

.cat-chip.active {
  color: var(--color-text-inverse);
  background: var(--color-primary-deep);
  border-color: transparent;
}

.search-box {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  min-width: 260px;
  padding: 0.55rem 1rem;
  color: var(--color-text-3);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.search-box:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 4px var(--glow-accent);
}

.search-box input {
  flex: 1;
  color: var(--color-text-1);
  background: transparent;
}

.search-box input::placeholder {
  color: var(--color-text-3);
}

.case-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-5);
}

@media (min-width: 768px) {
  .case-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .case-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.case-card {
  display: block;
  height: 100%;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  transition: all var(--dur-med) var(--ease-out-expo);
}

.case-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-lg);
  transform: translateY(-6px);
}

.case-thumb {
  position: relative;
  aspect-ratio: 16/10;
  overflow: hidden;
}

.case-thumb-inner {
  position: absolute;
  inset: 0;
  mix-blend-mode: multiply;
  opacity: 0.9;
}

[data-theme='dark'] .case-thumb-inner {
  mix-blend-mode: screen;
  opacity: 0.8;
}

.case-cat {
  position: absolute;
  top: 12px;
  left: 12px;
}

.case-likes {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 0.3rem 0.6rem;
  font-size: var(--text-xs);
  font-weight: 500;
  color: #fff;
  background: rgb(15 46 44 / 50%);
  border-radius: var(--r-full);
  backdrop-filter: blur(6px);
}

.case-body {
  padding: var(--sp-5);
}

.case-body h3 {
  margin-bottom: var(--sp-2);
  font-size: var(--text-lg);
}

.case-body p {
  margin-bottom: var(--sp-3);
  font-size: var(--text-sm);
}

.case-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}

.case-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.case-views,
.case-date {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.skeleton-card {
  padding: var(--sp-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
}

.sk-thumb {
  aspect-ratio: 16/10;
  margin-bottom: var(--sp-4);
  background: linear-gradient(
    90deg,
    var(--color-surface-2) 25%,
    var(--color-surface-3) 50%,
    var(--color-surface-2) 75%
  );
  background-size: 800px 100%;
  border-radius: var(--r-lg);
  animation: shimmer 1.4s infinite linear;
}

.pagination {
  display: flex;
  gap: var(--sp-2);
  justify-content: center;
  margin-top: var(--sp-8);
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.page-btn:hover:not(:disabled) {
  color: var(--color-text-1);
  border-color: var(--color-border-strong);
}

.page-btn.active {
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-color: transparent;
}

.page-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
</style>
