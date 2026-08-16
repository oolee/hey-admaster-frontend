<script setup>
/* 后台 · 技能管理
   - 技能列表（来自 skills 表）
   - 启停切换
   - 编辑名称 / 描述 / 能力（多选） */
import { ref, onMounted } from 'vue'
import { Sparkles, Save, CheckCircle2, XCircle, Loader2 } from 'lucide-vue-next'
import AInput from '@admin-demo/components/AInput.vue'
import AButton from '@admin-demo/components/AButton.vue'
import { request } from '@admin-demo/api'
import { toast } from '@admin-demo/utils/toast'

const list = ref([])
const loading = ref(true)
const savingId = ref(null)
const editing = ref({}) // id → { name, desc, capabilities }

const ALL_CAPS = [
  { v: 'text', label: '文本生成' },
  { v: 'streaming', label: '流式输出' },
  { v: 'image', label: '图像' },
  { v: 'text2img', label: '文生图' },
  { v: 'multiImage', label: '多图输入' },
  { v: 'code', label: '代码/HTML' },
  { v: 'vision', label: '视觉理解' }
]

onMounted(load)
async function load() {
  loading.value = true
  const r = await request('/api/admin/skills').catch(() => ({ code: -1, data: { list: [] } }))
  list.value = r.data?.list || []
  loading.value = false
}

function startEdit(s) {
  editing.value[s.id] = {
    name: s.name || '',
    desc: s.description || s.desc || '',
    capabilities: Array.isArray(s.capabilities) ? [...s.capabilities] : []
  }
}
function cancelEdit(id) { delete editing.value[id] }
function toggleCap(id, cap) {
  const arr = editing.value[id]?.capabilities
  if (!arr) return
  const i = arr.indexOf(cap)
  if (i >= 0) arr.splice(i, 1); else arr.push(cap)
}

async function save(id) {
  const e = editing.value[id]
  if (!e) return
  savingId.value = id
  const r = await request(`/api/admin/skills/${id}`, { method: 'PATCH', body: e })
  savingId.value = null
  if (r.code === 0) {
    toast.success('已保存')
    cancelEdit(id)
    load()
  } else {
    toast.error(r.message || '保存失败')
  }
}

async function toggleEnabled(s) {
  const r = await request(`/api/admin/skills/${s.id}`, { method: 'PATCH', body: { enabled: !s.enabled } })
  if (r.code === 0) { s.enabled = !s.enabled; toast.success(s.enabled ? '已启用' : '已停用') }
  else toast.error(r.message)
}
</script>

<template>
  <div class="pg">
    <header class="pg-head">
      <div>
        <div class="pg-kicker"><span class="dot-live"></span> AI WORKBENCH · SKILLS</div>
        <h1 class="pg-title">技能管理</h1>
        <p class="pg-sub">启停技能 · 编辑名称 / 描述 · 设置能力（决定模型如何被筛选）</p>
      </div>
      <span class="pg-count">{{ list.length }} 个技能</span>
    </header>

    <div v-if="loading" class="loading"><Loader2 :size="22" class="spin" /></div>
    <div v-else class="skill-grid">
      <article v-for="s in list" :key="s.id" class="skill-card" :class="{ disabled: !s.enabled }">
        <header class="sc-head">
          <div class="sc-icon"><Sparkles :size="14" /></div>
          <div class="sc-meta">
            <span class="sc-id mono">{{ s.id }}</span>
            <h3>{{ s.name }}</h3>
          </div>
          <button class="sc-toggle" :class="{ on: s.enabled }" :title="s.enabled ? '点击停用' : '点击启用'" @click="toggleEnabled(s)">
            <CheckCircle2 v-if="s.enabled" :size="14" />
            <XCircle v-else :size="14" />
            <span>{{ s.enabled ? '已启用' : '已停用' }}</span>
          </button>
        </header>

        <!-- 只读 / 编辑态切换 -->
        <template v-if="editing[s.id]">
          <label class="sc-label">名称</label>
          <AInput v-model="editing[s.id].name" placeholder="技能名称" />
          <label class="sc-label">描述</label>
          <AInput v-model="editing[s.id].desc" placeholder="技能描述" />
          <label class="sc-label">能力（决定模型过滤）</label>
          <div class="sc-caps">
            <button
              v-for="c in ALL_CAPS" :key="c.v"
              class="cap-chip" :class="{ on: editing[s.id].capabilities.includes(c.v) }"
              @click="toggleCap(s.id, c.v)"
              type="button"
            >{{ c.label }}</button>
          </div>
          <div class="sc-actions">
            <AButton variant="ghost" @click="cancelEdit(s.id)">取消</AButton>
            <AButton variant="primary" :disabled="savingId === s.id" @click="save(s.id)">
              <Loader2 v-if="savingId === s.id" :size="13" class="spin" />
              <Save v-else :size="13" />
              保存
            </AButton>
          </div>
        </template>
        <template v-else>
          <p class="sc-desc">{{ s.description || s.desc || '暂无描述' }}</p>
          <div class="sc-caps-readonly">
            <span v-for="c in s.capabilities" :key="c" class="cap-tag">{{ c }}</span>
            <span v-if="!s.capabilities?.length" class="cap-empty">未设置能力</span>
          </div>
          <div class="sc-actions">
            <AButton variant="ghost" @click="startEdit(s)">编辑</AButton>
          </div>
        </template>
      </article>
    </div>
  </div>
</template>

<style scoped>
.pg-count { color: var(--color-text-3); font-size: 13px; font-weight: 500; }
.loading { padding: 60px 0; text-align: center; color: var(--color-text-3); }
.spin { animation: rot 0.9s linear infinite; }
@keyframes rot { to { transform: rotate(360deg); } }

.skill-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.skill-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--r-lg); padding: 16px 18px;
  display: flex; flex-direction: column; gap: 10px;
  transition: all var(--dur-fast) ease;
}
.skill-card:hover { box-shadow: var(--shadow-sm); border-color: var(--color-border-strong); }
.skill-card.disabled { opacity: 0.55; }

.sc-head { display: flex; align-items: center; gap: 10px; }
.sc-icon {
  width: 32px; height: 32px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-ai-soft); color: var(--color-ai);
}
.sc-meta { flex: 1; min-width: 0; }
.sc-id { font-size: 10px; color: var(--color-text-3); letter-spacing: 0.04em; }
.sc-meta h3 { margin: 2px 0 0; font-size: 15px; font-weight: 700; color: var(--color-text-1); }
.sc-toggle {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: 999px; font-size: 11px; font-weight: 600;
  background: var(--color-surface-2); color: var(--color-text-3);
  transition: all var(--dur-fast) ease;
}
.sc-toggle.on { background: var(--color-success-soft, rgba(0,180,120,0.12)); color: var(--color-success, #18a06b); }
.sc-toggle:hover { box-shadow: var(--shadow-sm); }

.sc-desc { margin: 0; font-size: 13px; color: var(--color-text-2); line-height: 1.6; }
.sc-caps-readonly { display: flex; flex-wrap: wrap; gap: 5px; }
.cap-tag { padding: 2px 9px; border-radius: 999px; background: var(--color-ai-soft); color: var(--color-ai); font-size: 10px; font-weight: 600; }
.cap-empty { color: var(--color-text-3); font-size: 11px; font-style: italic; }

.sc-label { font-size: 11px; color: var(--color-text-3); font-weight: 600; margin-top: 4px; }
.sc-caps { display: flex; flex-wrap: wrap; gap: 5px; }
.cap-chip {
  padding: 4px 10px; border-radius: 999px;
  background: var(--color-surface-2); color: var(--color-text-2);
  font-size: 11px; font-weight: 600;
  border: 1px solid var(--color-border);
  transition: all var(--dur-fast) ease;
}
.cap-chip:hover { border-color: var(--color-accent); }
.cap-chip.on { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }

.sc-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 6px; }
</style>