<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Send,
  Sparkles,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const shareId = computed(() => String(route.params.id || ''));
const current = ref(0); // 当前展示页（0~5）
const comment = ref('');
const author = ref(localStorage.getItem('hey19-preview-name') || '匿名访客');
interface PreviewComment {
  id: string;
  author: string;
  text: string;
  time: string;
}

const comments = ref<PreviewComment[]>([]);
const likes = ref(0);
const liked = ref(false);
const viewStart = ref(Date.now());

const COVERS = [1, 2, 3, 4, 5, 6];

/* 评论存储 key（按 shareId 隔离） */
const KEY_COMMENTS = (id: string) => `preview-comments-${id}`;
const KEY_LIKES = (id: string) => `preview-likes-${id}`;
const KEY_VIEWED = (id: string) => `preview-viewed-${id}`;

function loadComments() {
  try {
    comments.value = JSON.parse(
      localStorage.getItem(KEY_COMMENTS(shareId.value)) || '[]',
    );
  } catch {
    comments.value = [];
  }
  likes.value = Number(localStorage.getItem(KEY_LIKES(shareId.value)) || 0);
}
function saveComments() {
  localStorage.setItem(
    KEY_COMMENTS(shareId.value),
    JSON.stringify(comments.value),
  );
}
function addComment() {
  const text = comment.value.trim();
  if (!text) return;
  comments.value.unshift({
    id: `c-${Date.now()}`,
    author: author.value || '匿名访客',
    text,
    time: new Date().toISOString(),
  });
  saveComments();
  comment.value = '';
}

function toggleLike() {
  liked.value = !liked.value;
  likes.value += liked.value ? 1 : -1;
  localStorage.setItem(KEY_LIKES(shareId.value), String(likes.value));
}

function next() {
  if (current.value < COVERS.length - 1) current.value++;
}
function prev() {
  if (current.value > 0) current.value--;
}

function formatTime(iso: string) {
  const t = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - t.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)} 小时前`;
  return t.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const viewDuration = computed(() => {
  const sec = Math.floor((Date.now() - viewStart.value) / 1000);
  return sec < 60 ? `${sec} 秒` : `${Math.floor(sec / 60)} 分钟`;
});

onMounted(() => {
  loadComments();
  // 标记已访问 + 浏览时长（统计）
  setInterval(() => {
    const sec = Math.floor((Date.now() - viewStart.value) / 1000);
    if (sec > 0 && sec % 5 === 0) {
      localStorage.setItem(KEY_VIEWED(shareId.value), String(sec));
    }
  }, 5000);
});

watch(shareId, loadComments);
</script>

<template>
  <div class="preview-shell">
    <!-- 顶栏 -->
    <header class="pv-top">
      <button class="back-btn" @click="router.push('/')">
        <ArrowLeft :size="16" /> 返回
      </button>
      <div class="pv-logo">
        <span class="logo-mark">H</span>
        <span class="logo-text">Hey 19 预览</span>
      </div>
      <div class="pv-meta">
        <span class="meta-item"
          ><Eye :size="13" /> {{ Math.floor(Math.random() * 80 + 20) }}</span
        >
        <span class="meta-item"
          ><Clock :size="13" /> {{ viewDuration }} 浏览</span
        >
        <span class="meta-id">分享 ID · {{ shareId.slice(-8) || 'demo' }}</span>
      </div>
    </header>

    <div class="pv-body">
      <!-- 画册主体 -->
      <main class="pv-main">
        <div class="pv-frame">
          <button
            class="pv-nav pv-prev"
            :disabled="current === 0"
            @click="prev"
          >
            <ChevronLeft :size="22" />
          </button>
          <div class="pv-page">
            <Transition name="flip" mode="out-in">
              <img
                :key="current"
                :src="`/asset/mock-cover-${COVERS[current]}.svg`"
                :alt="`画册第 ${current + 1} 页`"
                class="pv-img"
              />
            </Transition>
            <div class="pv-page-no">
              {{ current + 1 }} / {{ COVERS.length }}
            </div>
          </div>
          <button
            class="pv-nav pv-next"
            :disabled="current === COVERS.length - 1"
            @click="next"
          >
            <ChevronRight :size="22" />
          </button>
        </div>

        <!-- 缩略图导航 -->
        <div class="pv-thumbs">
          <button
            v-for="(i, idx) in COVERS"
            :key="i"
            class="pv-thumb"
            :class="{ active: idx === current }"
            @click="current = idx"
          >
            <img
              :src="`/asset/mock-cover-${i}.svg`"
              :alt="`第 ${idx + 1} 页`"
            />
            <span class="pv-thumb-no">{{ idx + 1 }}</span>
          </button>
        </div>

        <!-- 操作 -->
        <div class="pv-actions">
          <button class="pv-action" :class="{ liked }" @click="toggleLike">
            <Heart :size="16" :fill="liked ? 'currentColor' : 'none'" />
            <span>{{ likes }} 喜欢</span>
          </button>
          <div class="pv-spacer"></div>
          <div class="pv-tags">
            <span class="tag"><Sparkles :size="12" /> 由 AI 工作流生成</span>
            <span class="tag">演示模式</span>
          </div>
        </div>
      </main>

      <!-- 评论侧栏 -->
      <aside class="pv-comments">
        <div class="cm-head">
          <MessageCircle :size="18" />
          <h3>评论</h3>
          <span class="cm-count">{{ comments.length }}</span>
        </div>

        <div class="cm-input">
          <input v-model="author" placeholder="你的名字" class="cm-author" />
          <textarea
            v-model="comment"
            placeholder="说点什么吧..."
            rows="3"
            class="cm-textarea"
            @keydown.ctrl.enter="addComment"
          ></textarea>
          <button class="cm-send" @click="addComment">
            <Send :size="14" /> 发送
          </button>
        </div>

        <div class="cm-list">
          <div v-if="!comments.length" class="cm-empty">
            <MessageCircle :size="32" />
            <p>还没有评论，来发表第一条吧</p>
          </div>
          <div v-for="c in comments" :key="c.id" class="cm-row">
            <span class="cm-author-avatar">{{ c.author[0] }}</span>
            <div class="cm-body">
              <div class="cm-meta">
                <span class="cm-name">{{ c.author }}</span>
                <span class="cm-time">{{ formatTime(c.time) }}</span>
              </div>
              <p class="cm-text">{{ c.text }}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.preview-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg);
}

/* 顶栏 */
.pv-top {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: center;
  height: var(--header-h);
  padding: 0 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.back-btn {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 6px 12px;
  font-size: var(--text-sm);
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.back-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.pv-logo {
  display: flex;
  gap: 8px;
  align-items: center;
}

.logo-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-family: var(--font-display);
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  border-radius: 8px;
}

.logo-text {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-1);
}

.pv-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.meta-item {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 10px;
  background: var(--color-surface-2);
  border-radius: var(--r-full);
}

.meta-id {
  padding: 4px 10px;
  font-family: var(--font-mono);
  background: var(--color-surface-2);
  border-radius: var(--r-full);
}

/* 主体 */
.pv-body {
  display: grid;
  flex: 1;
  grid-template-columns: 1fr 360px;
  overflow: hidden;
}

/* 画册主区 */
.pv-main {
  display: flex;
  flex-direction: column;
  padding: 24px 32px;
  overflow-y: auto;
}

.pv-frame {
  position: relative;
  display: flex;
  flex: 1;
  gap: 12px;
  align-items: center;
  min-height: 480px;
}

.pv-page {
  position: relative;
  flex: 1;
  max-height: 540px;
  aspect-ratio: 4 / 3;
  margin: 0 auto;
  overflow: hidden;
  background: var(--color-surface);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-lg);
}

.pv-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pv-page-no {
  position: absolute;
  right: 16px;
  bottom: 12px;
  padding: 4px 12px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: #fff;
  background: rgb(0 0 0 / 50%);
  border-radius: var(--r-full);
}

.pv-nav {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: var(--color-text-1);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  transition: all var(--dur-fast) ease;
}

.pv-nav:hover:not(:disabled) {
  color: #fff;
  background: var(--color-accent);
  border-color: var(--color-accent);
  transform: scale(1.06);
}

.pv-nav:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

/* 缩略图 */
.pv-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
}

.pv-thumb {
  position: relative;
  width: 64px;
  height: 48px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: var(--r-md);
  opacity: 0.6;
  transition: all var(--dur-fast) ease;
}

.pv-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pv-thumb:hover {
  opacity: 1;
  transform: translateY(-2px);
}

.pv-thumb.active {
  border-color: var(--color-accent);
  opacity: 1;
}

.pv-thumb-no {
  position: absolute;
  right: 4px;
  bottom: 2px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgb(0 0 0 / 50%);
}

/* 操作 */
.pv-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-top: 16px;
  margin-top: 20px;
  border-top: 1px dashed var(--color-border);
}

.pv-action {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 8px 16px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.pv-action:hover {
  color: var(--color-accent);
}

.pv-action.liked {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.pv-spacer {
  flex: 1;
}

.pv-tags {
  display: flex;
  gap: 6px;
}

.tag {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 3px 10px;
  font-size: var(--text-xs);
  color: var(--color-text-3);
  background: var(--color-surface-2);
  border-radius: var(--r-full);
}

/* 评论 */
.pv-comments {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
}

.cm-head {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 18px 20px;
  color: var(--color-text-1);
  border-bottom: 1px solid var(--color-border);
}

.cm-head h3 {
  flex: 1;
  font-size: var(--text-base);
}

.cm-count {
  padding: 1px 8px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-radius: var(--r-full);
}

.cm-input {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.cm-author,
.cm-textarea {
  width: 100%;
  padding: 8px 10px;
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-1);
  resize: none;
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.cm-author {
  margin-bottom: 8px;
}

.cm-author:focus,
.cm-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--glow-accent);
}

.cm-textarea {
  min-height: 64px;
}

.cm-send {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 6px 16px;
  margin-top: 8px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: var(--r-md);
}

.cm-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  padding: 16px 20px;
  overflow-y: auto;
}

.cm-empty {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  padding: 40px 0;
  color: var(--color-text-3);
  text-align: center;
}

.cm-empty p {
  font-size: var(--text-sm);
}

.cm-row {
  display: flex;
  gap: 12px;
}

.cm-author-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: var(--text-sm);
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  border-radius: 50%;
}

.cm-body {
  flex: 1;
  min-width: 0;
}

.cm-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}

.cm-name {
  font-size: var(--text-sm);
  font-weight: 600;
}

.cm-time {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.cm-text {
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text-2);
  overflow-wrap: break-word;
}

/* 翻页过渡 */
.flip-enter-active,
.flip-leave-active {
  transition:
    opacity 0.25s var(--ease-out-expo),
    transform 0.4s var(--ease-spring);
}

.flip-enter-from {
  opacity: 0;
  transform: translateX(20px) scale(0.97);
}

.flip-leave-to {
  opacity: 0;
  transform: translateX(-20px) scale(0.97);
}

@media (max-width: 1024px) {
  .pv-body {
    grid-template-columns: 1fr;
  }

  .pv-comments {
    max-height: 50vh;
    border-top: 1px solid var(--color-border);
    border-left: none;
  }
}
</style>
