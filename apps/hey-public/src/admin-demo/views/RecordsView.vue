<script setup>
/* =====================================================
   调用记录（admin）· 真实 API · 会话分组视图
   - 按 session 分组的会话卡片 → 点击展开该会话的对话
   - 对话内每条消息（送参 prompt → AI 回复）可点击 → 详情模态
   - 详情含：送参 request_params / 回复 response_json（完整 JSON 留痕）
   ===================================================== */
import { ref, computed, onMounted } from 'vue'
import {
  Search, Loader2, CheckCircle2, XCircle, Copy, ChevronRight, ChevronDown,
  Cpu, Clock3, Coins, Zap, FileText, Image as ImageIcon,
  ArrowUpRight, RefreshCw, Terminal, Sparkles, MessageSquare, Send
} from 'lucide-vue-next'
import ABadge from '@admin-demo/components/ABadge.vue'
import { request } from '@admin-demo/api'
import { toast } from '@admin-demo/utils/toast'

const list = ref([])
const loading = ref(true)
const keyword = ref('')
const detail = ref(null)
const detailOpen = ref(false)
const showParams = ref(false)
const showResp = ref(false)
const expanded = ref({}) // sessionId → 是否展开
const page = ref(1)
const total = ref(0)

/* ---- 按会话分组 ---- */
const groups = computed(() => {
  const kw = keyword.value.toLowerCase().trim()
  const rows = list.value.filter((r) => {
    if (!kw) return true
    return String(r.conversation_title || '').toLowerCase().includes(kw) ||
      String(r.model_name || '').toLowerCase().includes(kw) ||
      String(r.original_prompt || '').toLowerCase().includes(kw) ||
      String(r.user_id || '').toLowerCase().includes(kw)
  })
  const map = new Map()
  for (const r of rows) {
    const sid = r.session_id || r.id
    if (!map.has(sid)) {
      map.set(sid, { id: sid, title: r.conversation_title || '未命名会话', items: [] })
    }
    map.get(sid).items.push(r)
  }
  const arr = Array.from(map.values())
  // 会话按最新消息排序
  arr.sort((a, b) => new Date(b.items[0].created_at) - new Date(a.items[0].created_at))
  return arr
})

const stats = computed(() => {
  const rows = list.value
  const success = rows.filter((r) => r.success).length
  const credits = rows.reduce((s, r) => s + Number(r.cost_credits || 0), 0)
  const durs = rows.filter((r) => r.duration_ms).map((r) => r.duration_ms)
  const avg = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0
  const rate = rows.length ? Math.round((success / rows.length) * 100) : 0
  return { total: rows.length, success, rate, credits, avg }
})

/* 分页：按会话数切页（每页 5 个会话），而非按对话条数 */
const sessionPageSize = 5
const totalPages = computed(() => Math.max(1, Math.ceil(groups.value.length / sessionPageSize)))
const pagedGroups = computed(() => groups.value.slice((page.value - 1) * sessionPageSize, page.value * sessionPageSize))

onMounted(load)

async function load(p = 1) {
  loading.value = true
  page.value = p
  // 一次拉全量（上限 500 条记录），分组后再按会话分页
  const r = await request('/api/records?page=1&pageSize=500').catch(() => ({ code: -1, data: { list: [] } }))
  list.value = r.data?.list || []
  total.value = r.data?.total || list.value.length
  loading.value = false
}
function goPage(p) {
  if (p < 1 || p > totalPages.value || p === page.value) return
  load(p)
}

function toggleGroup(id) { expanded.value[id] = !expanded.value[id] }

async function openDetail(id) {
  detailOpen.value = true
  detail.value = null
  showParams.value = false
  showResp.value = false
  const r = await request(`/api/records/${id}`).catch(() => ({ code: -1 }))
  detail.value = r.code === 0 ? r.data : null
}

function fmtTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return isNaN(d) ? '-' : d.toLocaleString('zh-CN')
}
function relTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const day = Math.floor(h / 24)
  if (day < 30) return `${day} 天前`
  return d.toLocaleDateString('zh-CN')
}
function summary(text, len = 60) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  return t ? (t.length > len ? t.slice(0, len) + '…' : t) : ''
}
function groupSuccess(g) { return (g.items || []).filter((i) => i && i.success).length }
function groupCredits(g) { return (g.items || []).reduce((s, i) => s + Number(i?.cost_credits || 0), 0) }
function prettyJSON(obj) {
  try { return JSON.stringify(obj, null, 2) } catch { return String(obj) }
}
/* 去掉审计元信息，只看真正发给上游的参数 */
function stripMeta(obj) {
  if (obj && typeof obj === 'object' && obj.__meta) {
    const { __meta, ...rest } = obj
    return rest
  }
  return obj
}
function copyText(t, tip = '已复制') {
  navigator.clipboard?.writeText(String(t ?? '')).then(() => toast.success(tip)).catch(() => toast.info('复制失败'))
}
function modelShort(name) { return String(name || 'AI').split('/').pop() }
</script>

<template>
  <div class="pg">
    <!-- ===== 页头 ===== -->
    <header class="pg-head">
      <div>
        <div class="pg-kicker"><span class="dot-live"></span> AI GATEWAY · AUDIT TRAIL</div>
        <h1 class="pg-title">调用记录</h1>
        <p class="pg-sub">按会话分组 —— 展开看对话，点消息看送参/回复完整 JSON</p>
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
        <div class="stat-body"><b>{{ stats.total }}</b><span>总调用</span></div>
        <em class="stat-trend">+{{ stats.success }} 成功</em>
      </div>
      <div class="stat-card">
        <div class="stat-ico ico-ok"><CheckCircle2 :size="16" /></div>
        <div class="stat-body"><b>{{ stats.rate }}%</b><span>成功率</span></div>
        <em class="stat-trend ok">{{ stats.success }}/{{ stats.total }}</em>
      </div>
      <div class="stat-card">
        <div class="stat-ico ico-coin"><Coins :size="16" /></div>
        <div class="stat-body"><b>{{ stats.credits.toLocaleString() }}</b><span>消耗积分</span></div>
        <em class="stat-trend">累计</em>
      </div>
      <div class="stat-card">
        <div class="stat-ico ico-clock"><Clock3 :size="16" /></div>
        <div class="stat-body"><b>{{ stats.avg }}<i>ms</i></b><span>平均耗时</span></div>
        <em class="stat-trend">网关 → 模型</em>
      </div>
    </div>

    <!-- ===== 工具栏 ===== -->
    <div class="toolbar">
      <div class="search-box">
        <Search :size="15" />
        <input v-model="keyword" placeholder="搜索会话名 / 提示词 / 模型 / 用户 ID…" />
      </div>
      <span class="toolbar-count">{{ groups.length }} 个会话 · {{ stats.total }} 条消息</span>
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
          <span class="cc-lamp" :class="{ warn: groupSuccess(g) < g.items.length }"></span>
          <div class="cc-main">
            <div class="cc-row1">
              <h3 class="cc-title">{{ g.title }}</h3>
              <span class="cc-count">{{ g.items.length }} 条对话</span>
            </div>
            <p class="cc-meta">
              末条 {{ relTime(g.items[0].created_at) }} · 成功 {{ groupSuccess(g) }}/{{ g.items.length }} ·
              耗 {{ groupCredits(g) }} 积分 · {{ modelShort(g.items[0].model_name) }}
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
              <Clock3 :size="11" /> {{ fmtTime(g.items[0].created_at).split(' ')[0].slice(5) }}
            </span>
            <span class="cc-chev"><ChevronDown v-if="expanded[g.id]" :size="16" /><ChevronRight v-else :size="16" /></span>
          </div>
        </div>

        <!-- 展开的对话列表 -->
        <Transition name="fold">
          <div v-if="expanded[g.id]" class="cc-body">
            <div v-if="!g.items.length" class="cc-line empty"><p class="cl-empty">该会话暂无消息</p></div>
            <div
              v-for="m in g.items"
              :key="m.id || Math.random()"
              class="cc-line"
              :class="{ fail: !(m && m.success) }"
            >
              <button class="cl-click" @click="m && openDetail(m.id)">
                <span class="cl-icon user"><Send :size="12" /></span>
                <div class="cl-texts">
                  <p class="cl-prompt">{{ (m && summary(m.original_prompt, 96)) || '(无提示词)' }}</p>
                  <p v-if="m && m.response_text" class="cl-reply">{{ summary(m.response_text, 120) }}</p>
                  <p v-else-if="m && !m.success" class="cl-reply err">调用失败</p>
                  <p v-else-if="m" class="cl-reply dim">（无文本回复 · 图像/空响应）</p>
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
        <button class="pager-btn" :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
        <span class="pager-info">第 {{ page }} / {{ totalPages }} 页 · {{ groups.length }} 个会话 · {{ total }} 条消息</span>
        <button class="pager-btn" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
      </footer>
    </div>
    <div v-else class="feed-loading">
      <div v-for="i in 4" :key="i" class="skeleton"></div>
    </div>

    <!-- ===== 详情模态 ===== -->
    <Transition name="mask">
      <div v-if="detailOpen" class="detail-mask" @click="detailOpen = false"></div>
    </Transition>
    <Transition name="modal">
      <div v-if="detailOpen" class="detail-modal" role="dialog" aria-modal="true">
        <header class="dm-head">
          <div class="dm-head-left">
            <span class="dm-kicker">CALL RECORD · {{ detail?.id?.slice(0, 8) || '—' }}</span>
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

        <div v-if="!detail" class="dm-loading"><Loader2 :size="22" class="spin" /></div>
        <div v-else class="dm-body">
          <!-- 元信息 -->
          <div class="dm-meta">
            <div class="dm-cell">
              <span class="dm-cell-ico"><Cpu :size="13" /></span>
              <div><label>模型</label><b class="mono">{{ detail.model_name || '-' }}</b></div>
            </div>
            <div class="dm-cell">
              <span class="dm-cell-ico"><Clock3 :size="13" /></span>
              <div><label>耗时</label><b class="mono">{{ detail.duration_ms }}ms</b></div>
            </div>
            <div class="dm-cell">
              <span class="dm-cell-ico"><Coins :size="13" /></span>
              <div><label>积分</label><b class="mono">{{ detail.cost_credits ?? 0 }}</b></div>
            </div>
            <div class="dm-cell">
              <span class="dm-cell-ico"><FileText :size="13" /></span>
              <div><label>Tokens</label><b class="mono">{{ detail.prompt_tokens }} / {{ detail.completion_tokens }}</b></div>
            </div>
            <div class="dm-cell">
              <span class="dm-cell-ico"><MessageSquare :size="13" /></span>
              <div><label>会话</label><b class="mono">{{ (detail.session_id || '').slice(0, 12) || '—' }}</b></div>
            </div>
            <div class="dm-cell wide">
              <span class="dm-cell-ico"><Sparkles :size="13" /></span>
              <div><label>时间</label><b>{{ fmtTime(detail.created_at) }}</b></div>
            </div>
          </div>

          <!-- 错误 -->
          <div v-if="detail.error" class="dm-error">
            <XCircle :size="14" />
            <div><b>调用失败</b><p class="mono">{{ detail.error }}</p></div>
          </div>

          <!-- 请求审计：base_url / 完整 URL / 请求头（排查失败核心） -->
          <section v-if="detail.request_params?.__meta" class="dm-sec">
            <div class="dm-sec-head">
              <h4>请求审计 <span class="dm-tag">AUDIT</span></h4>
            </div>
            <div class="dm-audit">
              <div class="dm-audit-row"><span class="dm-audit-k">Base URL</span><code class="dm-audit-v">{{ detail.request_params.__meta.base_url }}</code></div>
              <div class="dm-audit-row"><span class="dm-audit-k">完整 URL</span><code class="dm-audit-v">{{ detail.request_params.__meta.url }}</code></div>
              <div class="dm-audit-row"><span class="dm-audit-k">Method</span><code class="dm-audit-v">{{ detail.request_params.__meta.method }}</code></div>
              <div class="dm-audit-row"><span class="dm-audit-k">上游模型</span><code class="dm-audit-v">{{ detail.request_params.__meta.upstream_model }}（{{ detail.request_params.__meta.model_alias }}）</code></div>
              <div class="dm-audit-row"><span class="dm-audit-k">Headers</span><code class="dm-audit-v mono">{{ prettyJSON(detail.request_params.__meta.headers) }}</code></div>
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
            <pre v-if="showParams" class="dm-code param">{{ prettyJSON(stripMeta(detail.request_params)) }}</pre>
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
            <pre v-if="showResp" class="dm-code param">{{ prettyJSON(detail.response_json) }}</pre>
            <p v-else class="dm-hint">点击展开查看模型返回的原始响应（含 usage / choices 等）</p>
          </section>

          <!-- 原始提示词 -->
          <section class="dm-sec">
            <div class="dm-sec-head">
              <h4>原始提示词</h4>
              <button class="dm-copy" @click="copyText(detail.original_prompt, '提示词已复制')"><Copy :size="12" /> 复制</button>
            </div>
            <pre class="dm-code">{{ detail.original_prompt || '(空)' }}</pre>
          </section>

          <!-- AI 回复文本 -->
          <section v-if="detail.response_text" class="dm-sec">
            <div class="dm-sec-head">
              <h4>AI 回复文本</h4>
              <button class="dm-copy" @click="copyText(detail.response_text, '回复已复制')"><Copy :size="12" /> 复制</button>
            </div>
            <pre class="dm-code reply">{{ detail.response_text }}</pre>
          </section>

          <!-- 响应图片 -->
          <section v-if="detail.response_images?.length" class="dm-sec">
            <div class="dm-sec-head"><h4>响应图片</h4><span class="dm-count">{{ detail.response_images.length }} 张</span></div>
            <div class="dm-imgs">
              <figure v-for="(img, i) in detail.response_images" :key="i">
                <img :src="img.saved_path || img.url" :alt="`图 ${i + 1}`" loading="lazy" />
                <figcaption>
                  <a :href="img.saved_path || img.url" target="_blank"><ArrowUpRight :size="12" /> 打开</a>
                  <button @click="copyText(img.saved_path || img.url, 'URL 已复制')"><Copy :size="12" /> URL</button>
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
  display: flex; align-items: center; gap: 7px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.22em;
  color: var(--color-text-3); margin-bottom: 8px; font-family: var(--font-mono);
}
.dot-live {
  width: 7px; height: 7px; border-radius: 50%; background: var(--color-success);
  box-shadow: 0 0 0 0 rgba(46, 158, 91, 0.5); animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(46, 158, 91, 0.45); }
  70% { box-shadow: 0 0 0 7px rgba(46, 158, 91, 0); }
  100% { box-shadow: 0 0 0 0 rgba(46, 158, 91, 0); }
}
.pg-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 18px; }
.pg-title { font-size: 26px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.02em; color: var(--color-text-1); }
.pg-sub { margin: 0; font-size: var(--text-sm); color: var(--color-text-3); }
.pg-actions { display: flex; gap: 8px; }
.refresh-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; border-radius: 11px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  font-size: var(--text-sm); font-weight: 600; color: var(--color-text-2);
  transition: all var(--dur-fast) ease;
}
.refresh-btn:hover { color: var(--color-accent); border-color: var(--color-accent); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.refresh-btn.spin svg { animation: rot 0.9s linear infinite; }
@keyframes rot { to { transform: rotate(360deg); } }

/* ===== 统计卡 ===== */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.stat-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: var(--r-lg);
  background: var(--color-surface); border: 1px solid var(--color-border);
  box-shadow: var(--shadow-xs); position: relative; overflow: hidden;
  transition: transform var(--dur-fast) ease, box-shadow var(--dur-fast) ease;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.stat-card::after {
  content: ''; position: absolute; right: -18px; top: -18px;
  width: 64px; height: 64px; border-radius: 50%;
  background: radial-gradient(circle, var(--color-accent-soft), transparent 70%); opacity: 0.7;
}
.stat-ico {
  width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.ico-total { background: var(--color-accent-soft); color: var(--color-accent); }
.ico-ok { background: color-mix(in srgb, var(--color-success) 12%, transparent); color: var(--color-success); }
.ico-coin { background: color-mix(in srgb, var(--color-warning) 14%, transparent); color: var(--color-warning); }
.ico-clock { background: var(--color-ai-soft); color: var(--color-ai); }
.stat-body { display: flex; flex-direction: column; line-height: 1.15; }
.stat-body b { font-size: 21px; font-weight: 800; color: var(--color-text-1); font-family: var(--font-display); }
.stat-body b i { font-style: normal; font-size: 11px; font-weight: 600; color: var(--color-text-3); margin-left: 2px; }
.stat-body span { font-size: 11px; color: var(--color-text-3); }
.stat-trend {
  position: absolute; right: 12px; bottom: 8px; font-style: normal;
  font-size: 9px; font-weight: 700; color: var(--color-text-3); font-family: var(--font-mono);
}
.stat-trend.ok { color: var(--color-success); }

/* ===== 工具栏 ===== */
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.search-box {
  flex: 1; max-width: 480px; display: flex; align-items: center; gap: 9px;
  padding: 10px 14px; border-radius: 12px;
  background: var(--color-surface); border: 1.5px solid var(--color-border);
  color: var(--color-text-3); transition: all var(--dur-fast) ease;
}
.search-box:focus-within { border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--glow-accent); }
.search-box input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--color-text-1); font-size: var(--text-sm); }
.toolbar-count { font-size: var(--text-xs); color: var(--color-text-3); font-weight: 600; }

/* ===== 会话卡片 ===== */
.feed { display: flex; flex-direction: column; gap: 10px; }
.conv-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--r-lg); overflow: hidden;
  transition: border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease;
}
.conv-card:hover { border-color: var(--color-border-strong); }
.conv-card.open { border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border)); box-shadow: var(--shadow-sm); }
.cc-head { display: flex; align-items: center; gap: 12px; padding: 13px 16px; cursor: pointer; position: relative; }
.cc-lamp { width: 4px; height: 38px; border-radius: 4px; background: var(--color-success); flex-shrink: 0; }
.cc-lamp.warn { background: var(--color-warning); }
.cc-main { flex: 1; min-width: 0; }
.cc-row1 { display: flex; align-items: center; gap: 10px; min-width: 0; }
.cc-title {
  margin: 0; font-size: var(--text-base); font-weight: 700; color: var(--color-text-1);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cc-count {
  flex-shrink: 0; font-size: 10px; font-weight: 700; color: var(--color-text-2);
  background: var(--color-surface-2); padding: 2px 9px; border-radius: var(--r-full);
}
.cc-meta { margin: 4px 0 0; font-size: 11px; color: var(--color-text-3); }
.cc-side { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.cc-stat {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; color: var(--color-text-2);
  background: var(--color-surface-2); padding: 3px 9px; border-radius: var(--r-full);
}
.cc-stat em { font-style: normal; opacity: 0.6; font-weight: 600; }
.cc-stat.coin { background: color-mix(in srgb, var(--color-warning) 14%, transparent); color: var(--color-warning); }
.cc-stat.time { background: transparent; color: var(--color-text-3); padding: 3px 4px; font-family: var(--font-mono); font-weight: 600; }
.cc-model { display: none; }
.cc-chev { color: var(--color-text-3); display: flex; transition: transform var(--dur-fast) ease; margin-left: 2px; }
.conv-card.open .cc-chev { color: var(--color-accent); }

/* 展开对话列表 */
.cc-body { border-top: 1px dashed var(--color-border); padding: 8px; display: flex; flex-direction: column; gap: 6px; background: color-mix(in srgb, var(--color-surface-2) 35%, transparent); }
.cc-line { border-radius: 10px; overflow: hidden; }
.cl-click {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; text-align: left; border-radius: 10px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  transition: all var(--dur-fast) ease;
}
.cl-click:hover { border-color: var(--color-accent); transform: translateX(2px); box-shadow: var(--shadow-xs); }
.cl-icon {
  width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.cl-icon.user { background: var(--color-accent-soft); color: var(--color-accent); }
.cl-texts { flex: 1; min-width: 0; }
.cl-prompt {
  margin: 0; font-size: var(--text-sm); font-weight: 600; color: var(--color-text-1);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cl-reply {
  margin: 3px 0 0; font-size: 11px; color: var(--color-text-2);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cl-reply.err { color: var(--color-error); font-weight: 600; }
.cl-reply.dim { color: var(--color-text-3); }
.cl-status { display: flex; flex-shrink: 0; color: var(--color-error); }
.cl-status.ok { color: var(--color-success); }
.cl-arrow { color: var(--color-text-3); display: flex; flex-shrink: 0; opacity: 0; transition: all var(--dur-fast) ease; }
.cl-click:hover .cl-arrow { opacity: 1; color: var(--color-accent); }
.cl-empty { margin: 0; padding: 12px; text-align: center; font-size: var(--text-xs); color: var(--color-text-3); }

.fold-enter-active, .fold-leave-active { transition: all 0.25s var(--ease-out-expo); overflow: hidden; }
.fold-enter-from, .fold-leave-to { opacity: 0; transform: translateY(-6px); }

.feed-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 60px 20px; color: var(--color-text-3);
  background: var(--color-surface); border: 1px dashed var(--color-border-strong);
  border-radius: var(--r-lg);
}
.feed-empty p { margin: 0; font-weight: 700; color: var(--color-text-2); }
.feed-empty span { font-size: var(--text-xs); }

/* 分页 */
.feed-pager { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 18px 0 6px; }
.pager-btn { padding: 7px 18px; border-radius: var(--r-full); background: var(--color-surface-2); color: var(--color-text-2); font-size: 12px; font-weight: 600; transition: all var(--dur-fast) ease; }
.pager-btn:hover:not(:disabled) { color: var(--color-accent); }
.pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pager-info { font-size: 12px; color: var(--color-text-3); font-weight: 500; }

/* 骨架屏 */
.feed-loading { display: flex; flex-direction: column; gap: 10px; }
.skeleton {
  height: 74px; border-radius: var(--r-lg);
  background: linear-gradient(100deg, var(--color-surface) 40%, var(--color-surface-2) 50%, var(--color-surface) 60%);
  background-size: 200% 100%; animation: shimmer 1.4s infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }

/* ===== 详情模态 ===== */
.detail-mask { position: fixed; inset: 0; background: rgba(10, 10, 12, 0.5); backdrop-filter: blur(3px); z-index: 90; }
.detail-modal {
  position: fixed; inset: 4vh 12vw 4vh 12vw; z-index: 91;
  background: var(--color-bg-deep); border: 1px solid var(--color-border-strong);
  border-radius: var(--r-2xl); overflow: hidden;
  display: flex; flex-direction: column; box-shadow: var(--shadow-lg);
}
@media (max-width: 900px) { .detail-modal { inset: 0; border-radius: 0; } }
.dm-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 18px 24px;
  background: linear-gradient(135deg, var(--color-primary-deep), color-mix(in srgb, var(--color-primary-deep) 70%, var(--color-accent) 30%));
  color: var(--color-text-inverse);
}
.dm-kicker { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; font-family: var(--font-mono); opacity: 0.6; }
.dm-head h3 { margin: 4px 0 0; font-size: 18px; font-weight: 800; color: var(--color-text-inverse); }
.dm-head-right { display: flex; align-items: center; gap: 10px; }
.dm-status {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.14); font-size: 11px; font-weight: 700;
}
.dm-status.ok { background: rgba(46, 158, 91, 0.35); }
.dm-close {
  width: 32px; height: 32px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.12); color: var(--color-text-inverse);
  font-size: 13px; transition: all var(--dur-fast) ease;
}
.dm-close:hover { background: rgba(255, 255, 255, 0.25); transform: rotate(90deg); }
.dm-body { flex: 1; overflow-y: auto; padding: 22px 24px; display: flex; flex-direction: column; gap: 18px; }
.dm-loading { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--color-text-3); }
.spin { animation: rot 0.9s linear infinite; }

.dm-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.dm-cell {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 14px; border-radius: 12px;
  background: var(--color-surface); border: 1px solid var(--color-border);
}
.dm-cell.wide { grid-column: span 3; }
.dm-cell-ico {
  width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-surface-2); color: var(--color-text-2);
}
.dm-cell div { display: flex; flex-direction: column; min-width: 0; }
.dm-cell label { font-size: 9px; color: var(--color-text-3); letter-spacing: 0.06em; }
.dm-cell b { font-size: var(--text-xs); color: var(--color-text-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mono { font-family: var(--font-mono); }

.dm-error {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 16px; border-radius: 12px;
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-error) 28%, transparent);
  color: var(--color-error);
}
.dm-error b { font-size: var(--text-sm); }
.dm-error p { margin: 3px 0 0; font-size: 11px; word-break: break-all; }

.dm-sec { display: flex; flex-direction: column; gap: 9px; }
.dm-sec-head { display: flex; align-items: center; justify-content: space-between; }
.dm-sec-head h4 { margin: 0; font-size: var(--text-xs); font-weight: 800; color: var(--color-text-2); letter-spacing: 0.02em; }
.dm-tag {
  margin-left: 6px; font-size: 8px; font-weight: 800; letter-spacing: 0.12em;
  padding: 2px 7px; border-radius: 6px; vertical-align: 2px;
  background: color-mix(in srgb, var(--color-warning) 18%, transparent); color: var(--color-warning);
}
.dm-copy, .dm-toggle {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 11px; border-radius: 8px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  font-size: 10px; font-weight: 600; color: var(--color-text-2);
  transition: all var(--dur-fast) ease;
}
.dm-copy:hover, .dm-toggle:hover { color: var(--color-accent); border-color: var(--color-accent); }
.dm-count { font-size: 10px; color: var(--color-text-3); }
.dm-code {
  margin: 0; padding: 14px 16px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 12px; font-family: var(--font-mono); font-size: 12px; line-height: 1.7;
  color: var(--color-text-2); white-space: pre-wrap; word-break: break-all;
  max-height: 240px; overflow-y: auto;
}
.dm-code.reply { font-family: var(--font-body); font-size: var(--text-sm); line-height: 1.8; color: var(--color-text-1); }
.dm-code.param {
  max-height: 300px; background: #0e0e13; color: #d7d9e3;
  border-color: transparent; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
  font-size: 11.5px;
}
.dm-hint { margin: 0; font-size: 11px; color: var(--color-text-3); padding: 4px 2px; }

/* 请求审计区 */
.dm-audit { display: flex; flex-direction: column; gap: 6px; padding: 4px 0; }
.dm-audit-row { display: flex; align-items: flex-start; gap: 10px; font-size: 12px; }
.dm-audit-k { flex-shrink: 0; width: 76px; color: var(--color-text-3); font-weight: 600; padding-top: 2px; }
.dm-audit-v {
  font-family: var(--font-mono); color: var(--color-text-1);
  background: var(--color-surface-2); border-radius: 6px; padding: 2px 8px;
  word-break: break-all; white-space: pre-wrap; flex: 1;
}

.dm-imgs { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.dm-imgs figure {
  margin: 0; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden;
}
.dm-imgs img { width: 100%; max-height: 240px; object-fit: cover; display: block; }
.dm-imgs figcaption { display: flex; gap: 6px; padding: 8px; }
.dm-imgs figcaption a, .dm-imgs figcaption button {
  display: inline-flex; align-items: center; gap: 4px; flex: 1; justify-content: center;
  padding: 6px; border-radius: 7px; font-size: 11px; font-weight: 600;
  background: var(--color-surface-2); color: var(--color-text-2); transition: all var(--dur-fast) ease;
}
.dm-imgs figcaption a:hover, .dm-imgs figcaption button:hover { color: var(--color-accent); }

.mask-enter-active, .mask-leave-active { transition: opacity var(--dur-med) ease; }
.mask-enter-from, .mask-leave-to { opacity: 0; }
.modal-enter-active { transition: all var(--dur-med) var(--ease-out-expo); }
.modal-leave-active { transition: all var(--dur-fast) var(--ease-in-out-expo); }
.modal-enter-from { opacity: 0; transform: translateY(24px) scale(0.97); }
.modal-leave-to { opacity: 0; transform: translateY(12px) scale(0.98); }

@media (max-width: 720px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
