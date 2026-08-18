<script setup>
/* =====================================================
   调用记录（admin）· 真实 API · 会话分组视图
   - 按 session 分组的会话卡片 → 点击展开该会话的对话
   - 对话内每条消息（送参 prompt → AI 回复）可点击 → 详情模态
   - 详情含：送参 request_params / 回复 response_json（完整 JSON 留痕）
   ===================================================== */
import { computed, onMounted, ref } from 'vue';

import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Coins,
  Copy,
  Cpu,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Terminal,
  XCircle,
  Zap,
} from 'lucide-vue-next';

import { request } from '#/api/demo';
import { toast } from '#/utils/toast';

const list = ref([]);
const loading = ref(true);
const keyword = ref('');
const detail = ref(null);
const detailOpen = ref(false);
const showParams = ref(false);
const showResp = ref(false);
const expanded = ref({}); // sessionId → 是否展开
const page = ref(1);
const total = ref(0);

/* ---- 按会话分组 ---- */
const groups = computed(() => {
  const kw = keyword.value.toLowerCase().trim();
  const rows = list.value.filter((r) => {
    if (!kw) return true;
    return (
      String(r.conversation_title || '')
        .toLowerCase()
        .includes(kw) ||
      String(r.model_name || '')
        .toLowerCase()
        .includes(kw) ||
      String(r.original_prompt || '')
        .toLowerCase()
        .includes(kw) ||
      String(r.user_id || '')
        .toLowerCase()
        .includes(kw)
    );
  });
  const map = new Map();
  for (const r of rows) {
    const sid = r.session_id || r.id;
    if (!map.has(sid)) {
      map.set(sid, {
        id: sid,
        title: r.conversation_title || '未命名会话',
        items: [],
      });
    }
    map.get(sid).items.push(r);
  }
  const arr = [...map.values()];
  // 会话按最新消息排序
  arr.sort(
    (a, b) => new Date(b.items[0].created_at) - new Date(a.items[0].created_at),
  );
  return arr;
});

const stats = computed(() => {
  const rows = list.value;
  const success = rows.filter((r) => r.success).length;
  const credits = rows.reduce((s, r) => s + Number(r.cost_credits || 0), 0);
  const durs = rows.filter((r) => r.duration_ms).map((r) => r.duration_ms);
  const avg =
    durs.length > 0
      ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length)
      : 0;
  const rate = rows.length > 0 ? Math.round((success / rows.length) * 100) : 0;
  return { total: rows.length, success, rate, credits, avg };
});

/* 分页：按会话数切页（每页 5 个会话），而非按对话条数 */
const sessionPageSize = 5;
const totalPages = computed(() =>
  Math.max(1, Math.ceil(groups.value.length / sessionPageSize)),
);
const pagedGroups = computed(() =>
  groups.value.slice(
    (page.value - 1) * sessionPageSize,
    page.value * sessionPageSize,
  ),
);

onMounted(load);

async function load(p = 1) {
  loading.value = true;
  page.value = p;
  // 一次拉全量（上限 500 条记录），分组后再按会话分页
  const r = await request('/api/records?page=1&pageSize=500').catch(() => ({
    code: -1,
    data: { list: [] },
  }));
  list.value = r.data?.list || [];
  total.value =
    r.data?.total || (list.value.length > 0 ? list.value.length : 0);
  loading.value = false;
}
function goPage(p) {
  if (p < 1 || p > totalPages.value || p === page.value) return;
  load(p);
}

function toggleGroup(id) {
  expanded.value[id] = !expanded.value[id];
}

async function openDetail(id) {
  detailOpen.value = true;
  detail.value = null;
  showParams.value = false;
  showResp.value = false;
  const r = await request(`/api/records/${id}`).catch(() => ({ code: -1 }));
  detail.value = r.code === 0 ? r.data : null;
}

function fmtTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d) ? '-' : d.toLocaleString('zh-CN');
}
function relTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d)) return '';
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day} 天前`;
  return d.toLocaleDateString('zh-CN');
}
function summary(text, len = 60) {
  const t = String(text || '')
    .replaceAll(/\s+/g, ' ')
    .trim();
  return t ? (t.length > len ? `${t.slice(0, len)}…` : t) : '';
}
function groupSuccess(g) {
  return (g.items || []).filter((i) => i && i.success).length;
}
function groupCredits(g) {
  return (g.items || []).reduce((s, i) => s + Number(i?.cost_credits || 0), 0);
}
function prettyJSON(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}
/* 去掉审计元信息，只看真正发给上游的参数 */
function stripMeta(obj) {
  if (obj && typeof obj === 'object' && obj.__meta) {
    const { __meta, ...rest } = obj;
    return rest;
  }
  return obj;
}
function copyText(t, tip = '已复制') {
  navigator.clipboard
    ?.writeText(String(t ?? ''))
    .then(() => toast.success(tip))
    .catch(() => toast.info('复制失败'));
}
function modelShort(name) {
  return String(name || 'AI')
    .split('/')
    .pop();
}
</script>

<template>
  <div class="pg">
    <!-- ===== 页头 ===== -->
    <header class="pg-head">
      <div>
        <div class="pg-kicker">
          <span class="dot-live"></span> AI GATEWAY · AUDIT TRAIL
        </div>
        <h1 class="pg-title">调用记录</h1>
        <p class="pg-sub">
          按会话分组 —— 展开看对话，点消息看送参/回复完整 JSON
        </p>
      </div>
      <div class="pg-actions">
        <button class="refresh-btn" @click="load(1)" :disabled="loading">
          <RefreshCw :size="14" :class="{ spin: loading }" /> 刷新
        </button>
      </div>
    </header>

    <!-- ===== 统计卡 ===== -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-ico ico-total"><Zap :size="16" /></div>
        <div class="stat-body">
          <b>{{ stats.total }}</b
          ><span>总调用</span>
        </div>
        <em class="stat-trend">+{{ stats.success }} 成功</em>
      </div>
      <div class="stat-card">
        <div class="stat-ico ico-ok"><CheckCircle2 :size="16" /></div>
        <div class="stat-body">
          <b>{{ stats.rate }}%</b><span>成功率</span>
        </div>
        <em class="stat-trend ok">{{ stats.success }}/{{ stats.total }}</em>
      </div>
      <div class="stat-card">
        <div class="stat-ico ico-coin"><Coins :size="16" /></div>
        <div class="stat-body">
          <b>{{ stats.credits.toLocaleString() }}</b
          ><span>消耗积分</span>
        </div>
        <em class="stat-trend">累计</em>
      </div>
      <div class="stat-card">
        <div class="stat-ico ico-clock"><Clock3 :size="16" /></div>
        <div class="stat-body">
          <b>{{ stats.avg }}<i>ms</i></b
          ><span>平均耗时</span>
        </div>
        <em class="stat-trend">网关 → 模型</em>
      </div>
    </div>

    <!-- ===== 工具栏 ===== -->
    <div class="toolbar">
      <div class="search-box">
        <Search :size="15" />
        <input
          v-model="keyword"
          placeholder="搜索会话名 / 提示词 / 模型 / 用户 ID…"
        />
      </div>
      <span class="toolbar-count"
        >{{ groups.length }} 个会话 · {{ stats.total }} 条消息</span
      >
    </div>

    <!-- ===== 会话卡片列表 ===== -->
    <div class="feed" v-if="!loading">
      <article
        v-for="g in pagedGroups"
        :key="g.id"
        class="conv-card"
        :class="{ open: expanded[g.id] }"
      >
        <!-- 会话头 -->
        <div class="cc-head" @click="toggleGroup(g.id)">
          <span
            class="cc-lamp"
            :class="{ warn: groupSuccess(g) < g.items.length }"
          ></span>
          <div class="cc-main">
            <div class="cc-row1">
              <h3 class="cc-title">{{ g.title }}</h3>
              <span class="cc-count">{{ g.items.length }} 条对话</span>
            </div>
            <p class="cc-meta">
              末条 {{ relTime(g.items[0].created_at) }} · 成功
              {{ groupSuccess(g) }}/{{ g.items.length }} · 耗
              {{ groupCredits(g) }} 积分 ·
              {{ modelShort(g.items[0].model_name) }}
            </p>
          </div>
          <div class="cc-side">
            <span class="cc-stat">
              <Zap :size="11" /> {{ g.items.length }}
              <em>条</em>
            </span>
            <span class="cc-stat coin">
              <Coins :size="11" /> {{ groupCredits(g) }}
            </span>
            <span class="cc-stat time" :title="fmtTime(g.items[0].created_at)">
              <Clock3 :size="11" />
              {{ fmtTime(g.items[0].created_at).split(' ')[0].slice(5) }}
            </span>
            <span class="cc-chev"
              ><ChevronDown v-if="expanded[g.id]" :size="16" /><ChevronRight
                v-else
                :size="16"
            /></span>
          </div>
        </div>

        <!-- 展开的对话列表 -->
        <Transition name="fold">
          <div v-if="expanded[g.id]" class="cc-body">
            <div v-if="!g.items.length" class="cc-line empty">
              <p class="cl-empty">该会话暂无消息</p>
            </div>
            <div
              v-for="m in g.items"
              :key="m.id || Math.random()"
              class="cc-line"
              :class="{ fail: !(m && m.success) }"
            >
              <button class="cl-click" @click="m && openDetail(m.id)">
                <span class="cl-icon user"><Send :size="12" /></span>
                <div class="cl-texts">
                  <p class="cl-prompt">
                    {{ (m && summary(m.original_prompt, 96)) || '(无提示词)' }}
                  </p>
                  <p v-if="m && m.response_text" class="cl-reply">
                    {{ summary(m.response_text, 120) }}
                  </p>
                  <p v-else-if="m && !m.success" class="cl-reply err">
                    调用失败
                  </p>
                  <p v-else-if="m" class="cl-reply dim">
                    （无文本回复 · 图像/空响应）
                  </p>
                  <p v-else class="cl-reply err">记录缺失</p>
                </div>
                <span class="cl-status" :class="{ ok: m && m.success }">
                  <CheckCircle2 v-if="m && m.success" :size="12" />
                  <XCircle v-else :size="12" />
                </span>
                <span class="cl-arrow"><ChevronRight :size="14" /></span>
              </button>
            </div>
          </div>
        </Transition>
      </article>

      <div v-if="!groups.length" class="feed-empty">
        <Terminal :size="28" />
        <p>暂无调用记录</p>
        <span>去前台发起一次 AI 生成，这里就会留下生产流水</span>
      </div>

      <!-- 分页：有数据就显示（单页时按钮禁用，让用户看到分页能力） -->
      <footer v-if="total > 0" class="feed-pager">
        <button
          class="pager-btn"
          :disabled="page <= 1"
          @click="goPage(page - 1)"
        >
          上一页
        </button>
        <span class="pager-info"
          >第 {{ page }} / {{ totalPages }} 页 · {{ groups.length }} 个会话 ·
          {{ total }} 条消息</span
        >
        <button
          class="pager-btn"
          :disabled="page >= totalPages"
          @click="goPage(page + 1)"
        >
          下一页
        </button>
      </footer>
    </div>
    <div v-else class="feed-loading">
      <div v-for="i in 4" :key="i" class="skeleton"></div>
    </div>

    <!-- ===== 详情模态 ===== -->
    <Transition name="mask">
      <div
        v-if="detailOpen"
        class="detail-mask"
        @click="detailOpen = false"
      ></div>
    </Transition>
    <Transition name="modal">
      <div
        v-if="detailOpen"
        class="detail-modal"
        role="dialog"
        aria-modal="true"
      >
        <header class="dm-head">
          <div class="dm-head-left">
            <span class="dm-kicker"
              >CALL RECORD · {{ detail?.id?.slice(0, 8) || '—' }}</span
            >
            <h3>{{ detail?.conversation_title || '调用详情' }}</h3>
          </div>
          <div class="dm-head-right">
            <span class="dm-status" :class="{ ok: detail?.success }">
              <CheckCircle2 v-if="detail?.success" :size="14" />
              <XCircle v-else :size="14" />
              {{ detail ? (detail.success ? '成功' : '失败') : '加载中…' }}
            </span>
            <button class="dm-close" @click="detailOpen = false">✕</button>
          </div>
        </header>

        <div v-if="!detail" class="dm-loading">
          <Loader2 :size="22" class="spin" />
        </div>
        <div v-else class="dm-body">
          <!-- 元信息 -->
          <div class="dm-meta">
            <div class="dm-cell">
              <span class="dm-cell-ico"><Cpu :size="13" /></span>
              <div>
                <label>模型</label
                ><b class="mono">{{ detail.model_name || '-' }}</b>
              </div>
            </div>
            <div class="dm-cell">
              <span class="dm-cell-ico"><Clock3 :size="13" /></span>
              <div>
                <label>耗时</label
                ><b class="mono">{{ detail.duration_ms }}ms</b>
              </div>
            </div>
            <div class="dm-cell">
              <span class="dm-cell-ico"><Coins :size="13" /></span>
              <div>
                <label>积分</label
                ><b class="mono">{{ detail.cost_credits ?? 0 }}</b>
              </div>
            </div>
            <div class="dm-cell">
              <span class="dm-cell-ico"><FileText :size="13" /></span>
              <div>
                <label>Tokens</label
                ><b class="mono"
                  >{{ detail.prompt_tokens }} /
                  {{ detail.completion_tokens }}</b
                >
              </div>
            </div>
            <div class="dm-cell">
              <span class="dm-cell-ico"><MessageSquare :size="13" /></span>
              <div>
                <label>会话</label
                ><b class="mono">{{
                  (detail.session_id || '').slice(0, 12) || '—'
                }}</b>
              </div>
            </div>
            <div class="dm-cell wide">
              <span class="dm-cell-ico"><Sparkles :size="13" /></span>
              <div>
                <label>时间</label><b>{{ fmtTime(detail.created_at) }}</b>
              </div>
            </div>
          </div>

          <!-- 错误 -->
          <div v-if="detail.error" class="dm-error">
            <XCircle :size="14" />
            <div>
              <b>调用失败</b>
              <p class="mono">{{ detail.error }}</p>
            </div>
          </div>

          <!-- 请求审计：base_url / 完整 URL / 请求头（排查失败核心） -->
          <section v-if="detail.request_params?.__meta" class="dm-sec">
            <div class="dm-sec-head">
              <h4>请求审计 <span class="dm-tag">AUDIT</span></h4>
            </div>
            <div class="dm-audit">
              <div class="dm-audit-row">
                <span class="dm-audit-k">Base URL</span
                ><code class="dm-audit-v">{{
                  detail.request_params.__meta.base_url
                }}</code>
              </div>
              <div class="dm-audit-row">
                <span class="dm-audit-k">完整 URL</span
                ><code class="dm-audit-v">{{
                  detail.request_params.__meta.url
                }}</code>
              </div>
              <div class="dm-audit-row">
                <span class="dm-audit-k">Method</span
                ><code class="dm-audit-v">{{
                  detail.request_params.__meta.method
                }}</code>
              </div>
              <div class="dm-audit-row">
                <span class="dm-audit-k">上游模型</span
                ><code class="dm-audit-v"
                  >{{ detail.request_params.__meta.upstream_model }}（{{
                    detail.request_params.__meta.model_alias
                  }}）</code
                >
              </div>
              <div class="dm-audit-row">
                <span class="dm-audit-k">Headers</span
                ><code class="dm-audit-v mono">{{
                  prettyJSON(detail.request_params.__meta.headers)
                }}</code>
              </div>
            </div>
          </section>

          <!-- 送参：完整请求参数 -->
          <section class="dm-sec">
            <div class="dm-sec-head">
              <h4>送参 <span class="dm-tag">REQUEST</span></h4>
              <button class="dm-toggle" @click="showParams = !showParams">
                {{ showParams ? '收起' : '展开 JSON' }}
              </button>
            </div>
            <pre v-if="showParams" class="dm-code param">{{
              prettyJSON(stripMeta(detail.request_params))
            }}</pre>
            <p v-else class="dm-hint">点击展开查看转发给大模型的完整请求参数</p>
          </section>

          <!-- 回复：原始响应 JSON -->
          <section class="dm-sec">
            <div class="dm-sec-head">
              <h4>回复 <span class="dm-tag">RESPONSE</span></h4>
              <button class="dm-toggle" @click="showResp = !showResp">
                {{ showResp ? '收起' : '展开 JSON' }}
              </button>
            </div>
            <pre v-if="showResp" class="dm-code param">{{
              prettyJSON(detail.response_json)
            }}</pre>
            <p v-else class="dm-hint">
              点击展开查看模型返回的原始响应（含 usage / choices 等）
            </p>
          </section>

          <!-- 原始提示词 -->
          <section class="dm-sec">
            <div class="dm-sec-head">
              <h4>原始提示词</h4>
              <button
                class="dm-copy"
                @click="copyText(detail.original_prompt, '提示词已复制')"
              >
                <Copy :size="12" /> 复制
              </button>
            </div>
            <pre class="dm-code">{{ detail.original_prompt || '(空)' }}</pre>
          </section>

          <!-- AI 回复文本 -->
          <section v-if="detail.response_text" class="dm-sec">
            <div class="dm-sec-head">
              <h4>AI 回复文本</h4>
              <button
                class="dm-copy"
                @click="copyText(detail.response_text, '回复已复制')"
              >
                <Copy :size="12" /> 复制
              </button>
            </div>
            <pre class="dm-code reply">{{ detail.response_text }}</pre>
          </section>

          <!-- 响应图片 -->
          <section v-if="detail.response_images?.length" class="dm-sec">
            <div class="dm-sec-head">
              <h4>响应图片</h4>
              <span class="dm-count"
                >{{ detail.response_images.length }} 张</span
              >
            </div>
            <div class="dm-imgs">
              <figure v-for="(img, i) in detail.response_images" :key="i">
                <img
                  :src="img.saved_path || img.url"
                  :alt="`图 ${i + 1}`"
                  loading="lazy"
                />
                <figcaption>
                  <a :href="img.saved_path || img.url" target="_blank"
                    ><ArrowUpRight :size="12" /> 打开</a
                  >
                  <button
                    @click="copyText(img.saved_path || img.url, 'URL 已复制')"
                  >
                    <Copy :size="12" /> URL
                  </button>
                </figcaption>
              </figure>
            </div>
          </section>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ===== 页头 ===== */
.pg-kicker {
  display: flex;
  gap: 7px;
  align-items: center;
  margin-bottom: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.22em;
}

.dot-live {
  width: 7px;
  height: 7px;
  background: var(--color-success);
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgb(46 158 91 / 50%);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(46 158 91 / 45%);
  }

  70% {
    box-shadow: 0 0 0 7px rgb(46 158 91 / 0%);
  }

  100% {
    box-shadow: 0 0 0 0 rgb(46 158 91 / 0%);
  }
}

.pg-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
}

.pg-title {
  margin: 0 0 4px;
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text-1);
  letter-spacing: -0.02em;
}

.pg-sub {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.pg-actions {
  display: flex;
  gap: 8px;
}

.refresh-btn {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  padding: 9px 16px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 11px;
  transition: all var(--dur-fast) ease;
}

.refresh-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.refresh-btn.spin svg {
  animation: rot 0.9s linear infinite;
}

@keyframes rot {
  to {
    transform: rotate(360deg);
  }
}

/* ===== 统计卡 ===== */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-xs);
  transition:
    transform var(--dur-fast) ease,
    box-shadow var(--dur-fast) ease;
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.stat-card::after {
  position: absolute;
  top: -18px;
  right: -18px;
  width: 64px;
  height: 64px;
  content: '';
  background: radial-gradient(
    circle,
    var(--color-accent-soft),
    transparent 70%
  );
  border-radius: 50%;
  opacity: 0.7;
}

.stat-ico {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 11px;
}

.ico-total {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.ico-ok {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 12%, transparent);
}

.ico-coin {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 14%, transparent);
}

.ico-clock {
  color: var(--color-ai);
  background: var(--color-ai-soft);
}

.stat-body {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.stat-body b {
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 800;
  color: var(--color-text-1);
}

.stat-body b i {
  margin-left: 2px;
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
  color: var(--color-text-3);
}

.stat-body span {
  font-size: 11px;
  color: var(--color-text-3);
}

.stat-trend {
  position: absolute;
  right: 12px;
  bottom: 8px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
  color: var(--color-text-3);
}

.stat-trend.ok {
  color: var(--color-success);
}

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.search-box {
  display: flex;
  flex: 1;
  gap: 9px;
  align-items: center;
  max-width: 480px;
  padding: 10px 14px;
  color: var(--color-text-3);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  transition: all var(--dur-fast) ease;
}

.search-box:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--glow-accent);
}

.search-box input {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-text-1);
  outline: 0;
  background: transparent;
  border: 0;
}

.toolbar-count {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-3);
}

/* ===== 会话卡片 ===== */
.feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.conv-card {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  transition:
    border-color var(--dur-fast) ease,
    box-shadow var(--dur-fast) ease;
}

.conv-card:hover {
  border-color: var(--color-border-strong);
}

.conv-card.open {
  border-color: color-mix(
    in srgb,
    var(--color-accent) 45%,
    var(--color-border)
  );
  box-shadow: var(--shadow-sm);
}

.cc-head {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 13px 16px;
  cursor: pointer;
}

.cc-lamp {
  flex-shrink: 0;
  width: 4px;
  height: 38px;
  background: var(--color-success);
  border-radius: 4px;
}

.cc-lamp.warn {
  background: var(--color-warning);
}

.cc-main {
  flex: 1;
  min-width: 0;
}

.cc-row1 {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.cc-title {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-1);
  white-space: nowrap;
}

.cc-count {
  flex-shrink: 0;
  padding: 2px 9px;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border-radius: var(--r-full);
}

.cc-meta {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--color-text-3);
}

.cc-side {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
}

.cc-stat {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 3px 9px;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border-radius: var(--r-full);
}

.cc-stat em {
  font-style: normal;
  font-weight: 600;
  opacity: 0.6;
}

.cc-stat.coin {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 14%, transparent);
}

.cc-stat.time {
  padding: 3px 4px;
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--color-text-3);
  background: transparent;
}

.cc-model {
  display: none;
}

.cc-chev {
  display: flex;
  margin-left: 2px;
  color: var(--color-text-3);
  transition: transform var(--dur-fast) ease;
}

.conv-card.open .cc-chev {
  color: var(--color-accent);
}

/* 展开对话列表 */
.cc-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: color-mix(in srgb, var(--color-surface-2) 35%, transparent);
  border-top: 1px dashed var(--color-border);
}

.cc-line {
  overflow: hidden;
  border-radius: 10px;
}

.cl-click {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all var(--dur-fast) ease;
}

.cl-click:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-xs);
  transform: translateX(2px);
}

.cl-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
}

.cl-icon.user {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.cl-texts {
  flex: 1;
  min-width: 0;
}

.cl-prompt {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-1);
  white-space: nowrap;
}

.cl-reply {
  margin: 3px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  color: var(--color-text-2);
  white-space: nowrap;
}

.cl-reply.err {
  font-weight: 600;
  color: var(--color-error);
}

.cl-reply.dim {
  color: var(--color-text-3);
}

.cl-status {
  display: flex;
  flex-shrink: 0;
  color: var(--color-error);
}

.cl-status.ok {
  color: var(--color-success);
}

.cl-arrow {
  display: flex;
  flex-shrink: 0;
  color: var(--color-text-3);
  opacity: 0;
  transition: all var(--dur-fast) ease;
}

.cl-click:hover .cl-arrow {
  color: var(--color-accent);
  opacity: 1;
}

.cl-empty {
  padding: 12px;
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-3);
  text-align: center;
}

.fold-enter-active,
.fold-leave-active {
  overflow: hidden;
  transition: all 0.25s var(--ease-out-expo);
}

.fold-enter-from,
.fold-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.feed-empty {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  padding: 60px 20px;
  color: var(--color-text-3);
  background: var(--color-surface);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--r-lg);
}

.feed-empty p {
  margin: 0;
  font-weight: 700;
  color: var(--color-text-2);
}

.feed-empty span {
  font-size: var(--text-xs);
}

/* 分页 */
.feed-pager {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  padding: 18px 0 6px;
}

.pager-btn {
  padding: 7px 18px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.pager-btn:hover:not(:disabled) {
  color: var(--color-accent);
}

.pager-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.pager-info {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-3);
}

/* 骨架屏 */
.feed-loading {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton {
  height: 74px;
  background: linear-gradient(
    100deg,
    var(--color-surface) 40%,
    var(--color-surface-2) 50%,
    var(--color-surface) 60%
  );
  background-size: 200% 100%;
  border-radius: var(--r-lg);
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

/* ===== 详情模态 ===== */
.detail-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgb(10 10 12 / 50%);
  backdrop-filter: blur(3px);
}

.detail-modal {
  position: fixed;
  inset: 4vh 12vw;
  z-index: 91;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg-deep);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-2xl);
  box-shadow: var(--shadow-lg);
}

@media (max-width: 900px) {
  .detail-modal {
    inset: 0;
    border-radius: 0;
  }
}

.dm-head {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  color: var(--color-text-inverse);
  background: linear-gradient(
    135deg,
    var(--color-primary-deep),
    color-mix(in srgb, var(--color-primary-deep) 70%, var(--color-accent) 30%)
  );
}

.dm-kicker {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.2em;
  opacity: 0.6;
}

.dm-head h3 {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-inverse);
}

.dm-head-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.dm-status {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 700;
  background: rgb(255 255 255 / 14%);
  border-radius: var(--r-full);
}

.dm-status.ok {
  background: rgb(46 158 91 / 35%);
}

.dm-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 13px;
  color: var(--color-text-inverse);
  background: rgb(255 255 255 / 12%);
  border-radius: 9px;
  transition: all var(--dur-fast) ease;
}

.dm-close:hover {
  background: rgb(255 255 255 / 25%);
  transform: rotate(90deg);
}

.dm-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 18px;
  padding: 22px 24px;
  overflow-y: auto;
}

.dm-loading {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: var(--color-text-3);
}

.spin {
  animation: rot 0.9s linear infinite;
}

.dm-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.dm-cell {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 11px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.dm-cell.wide {
  grid-column: span 3;
}

.dm-cell-ico {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border-radius: 9px;
}

.dm-cell div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.dm-cell label {
  font-size: 9px;
  color: var(--color-text-3);
  letter-spacing: 0.06em;
}

.dm-cell b {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-xs);
  color: var(--color-text-1);
  white-space: nowrap;
}

.mono {
  font-family: var(--font-mono);
}

.dm-error {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 16px;
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-error) 28%, transparent);
  border-radius: 12px;
}

.dm-error b {
  font-size: var(--text-sm);
}

.dm-error p {
  margin: 3px 0 0;
  font-size: 11px;
  word-break: break-all;
}

.dm-sec {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.dm-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dm-sec-head h4 {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: 800;
  color: var(--color-text-2);
  letter-spacing: 0.02em;
}

.dm-tag {
  padding: 2px 7px;
  margin-left: 6px;
  font-size: 8px;
  font-weight: 800;
  vertical-align: 2px;
  color: var(--color-warning);
  letter-spacing: 0.12em;
  background: color-mix(in srgb, var(--color-warning) 18%, transparent);
  border-radius: 6px;
}

.dm-copy,
.dm-toggle {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 4px 11px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all var(--dur-fast) ease;
}

.dm-copy:hover,
.dm-toggle:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.dm-count {
  font-size: 10px;
  color: var(--color-text-3);
}

.dm-code {
  max-height: 240px;
  padding: 14px 16px;
  margin: 0;
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.dm-code.reply {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  line-height: 1.8;
  color: var(--color-text-1);
}

.dm-code.param {
  max-height: 300px;
  font-size: 11.5px;
  color: #d7d9e3;
  background: #0e0e13;
  border-color: transparent;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 6%);
}

.dm-hint {
  padding: 4px 2px;
  margin: 0;
  font-size: 11px;
  color: var(--color-text-3);
}

/* 请求审计区 */
.dm-audit {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.dm-audit-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 12px;
}

.dm-audit-k {
  flex-shrink: 0;
  width: 76px;
  padding-top: 2px;
  font-weight: 600;
  color: var(--color-text-3);
}

.dm-audit-v {
  flex: 1;
  padding: 2px 8px;
  font-family: var(--font-mono);
  color: var(--color-text-1);
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--color-surface-2);
  border-radius: 6px;
}

.dm-imgs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.dm-imgs figure {
  margin: 0;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.dm-imgs img {
  display: block;
  width: 100%;
  max-height: 240px;
  object-fit: cover;
}

.dm-imgs figcaption {
  display: flex;
  gap: 6px;
  padding: 8px;
}

.dm-imgs figcaption a,
.dm-imgs figcaption button {
  display: inline-flex;
  flex: 1;
  gap: 4px;
  align-items: center;
  justify-content: center;
  padding: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border-radius: 7px;
  transition: all var(--dur-fast) ease;
}

.dm-imgs figcaption a:hover,
.dm-imgs figcaption button:hover {
  color: var(--color-accent);
}

.mask-enter-active,
.mask-leave-active {
  transition: opacity var(--dur-med) ease;
}

.mask-enter-from,
.mask-leave-to {
  opacity: 0;
}

.modal-enter-active {
  transition: all var(--dur-med) var(--ease-out-expo);
}

.modal-leave-active {
  transition: all var(--dur-fast) var(--ease-in-out-expo);
}

.modal-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.97);
}

.modal-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 720px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
