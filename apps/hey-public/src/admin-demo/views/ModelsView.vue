<script setup>
/* =====================================================
   模型网关 · 供应商 + 模型管理（统一页面，双 tab）
   - 严格沿用 design-token + 日曜主题视觉
   - 供应商：列表 / 新增 / 一键同步模型（调 {base}/v1/models）
   - 模型：列表 / 别名 / 类型 / 能力 / 尺寸 / 比例 / 启用 / 计费规则
   ===================================================== */
import { computed, onMounted, ref, watch } from 'vue';

import { prompt } from '@/utils/prompt';
import { request } from '@admin-demo/api';
import ABadge from '@admin-demo/components/ABadge.vue';
import AButton from '@admin-demo/components/AButton.vue';
import AInput from '@admin-demo/components/AInput.vue';
import AModal from '@admin-demo/components/AModal.vue';
import ChipInput from '@admin-demo/components/ChipInput.vue';
import { toast } from '@admin-demo/utils/toast';
import {
  Cpu,
  FileText,
  ImageIcon,
  Layers,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-vue-next';

const tab = ref('providers');
const providers = ref([]);
const models = ref([]);
const records = ref([]);
const loading = ref(false);

const providerModal = ref(false);
const editProvider = ref(null);
const modelModal = ref(false);
const editModel = ref(null);

const providerTypeOptions = [
  { v: 'openai', label: 'OpenAI 官方' },
  { v: 'anthropic', label: 'Anthropic' },
  { v: 'google', label: 'Google AI' },
  { v: 'azure', label: 'Azure OpenAI' },
  { v: 'gpteam', label: 'GPTEAM 中转' },
  { v: 'custom', label: '自定义兼容' },
];

const capabilityOptions = [
  { v: 'chat', label: '对话', icon: Cpu },
  { v: 'text2img', label: '文生图', icon: ImageIcon },
  { v: 'img2img', label: '图生图', icon: Wand2 },
  { v: 'vision', label: '视觉理解', icon: Sparkles },
  { v: 'embedding', label: '向量', icon: Layers },
];

const modelTypeLabel = {
  text: '文本',
  image: '图像',
  video: '视频',
  audio: '音频',
};
const modelTypeIcon = {
  text: Cpu,
  image: ImageIcon,
  video: FileText,
  audio: FileText,
};
const modelTypeTone = {
  text: 'neutral',
  image: 'accent',
  video: 'warning',
  audio: 'info',
};

const stats = computed(() => ({
  providers: providers.value.length,
  enabled: providers.value.filter((p) => p.enabled).length,
  models: models.value.length,
  imageModels: models.value.filter((m) => m.model_type === 'image').length,
}));

onMounted(async () => {
  await loadAll();
});

async function loadAll() {
  loading.value = true;
  try {
    const [pr, mr] = await Promise.all([
      request('/api/provider').catch(() => ({ code: -1, data: { list: [] } })),
      request('/api/provider/models').catch(() => ({
        code: -1,
        data: { list: [] },
      })),
    ]);
    providers.value = pr?.data?.list || [];
    models.value = mr?.data?.list || [];
  } finally {
    loading.value = false;
  }
}

/* ===== 供应商操作 ===== */
function openNewProvider() {
  editProvider.value = {
    name: '',
    type: 'openai',
    base_url: '',
    api_key: '',
    priority: 0,
    weight: 100,
    timeout_sec: 120,
    max_retries: 2,
    enabled: true,
    extra_json: '',
  };
  providerModal.value = true;
}
function openEditProvider(p) {
  editProvider.value = {
    ...p,
    extra_json: p.extra ? JSON.stringify(p.extra, null, 2) : '',
  };
  providerErrors.value = {};
  providerModal.value = true;
}
const providerErrors = ref({});
const modelErrors = ref({});
function validateProvider(p) {
  const errs = {};
  if (!p.name?.trim()) errs.name = '请输入渠道名称';
  if (!p.type) errs.type = '请选择供应商类型';
  if (!p.base_url?.trim()) errs.base_url = '请输入 Base URL';
  if (!p.id && !p.api_key?.trim()) errs.api_key = '请输入 API Key';
  providerErrors.value = errs;
  return Object.keys(errs).length === 0;
}
async function saveProvider() {
  const p = editProvider.value;
  if (!validateProvider(p)) return;
  // 扩展 JSON：textarea→对象
  if (typeof p.extra_json === 'string' && p.extra_json.trim()) {
    try {
      p.extra = JSON.parse(p.extra_json);
    } catch {
      providerErrors.value = { extra_json: '扩展 JSON 格式错误' };
      return;
    }
  }
  if (p.id) {
    if (p.api_key && p.api_key.includes('***')) delete p.api_key;
    const r = await request(`/api/provider/${p.id}`, {
      method: 'PUT',
      body: p,
    });
    if (r.code === 0) {
      toast.success('已更新');
      providerModal.value = false;
      loadAll();
    } else toast.error(fmtErr(r));
  } else {
    const r = await request('/api/provider', { method: 'POST', body: p });
    if (r.code === 0) {
      toast.success('供应商已添加');
      providerModal.value = false;
      loadAll();
    } else toast.error(fmtErr(r));
  }
}
function fmtErr(r) {
  // 后台登录者均为管理员 → 显示详细错误；通用兜底
  return r?.message ? `保存失败：${r.message}` : '保存失败，请稍后重试';
}
async function deleteProvider(p) {
  const ok = await prompt.confirm({
    title: '删除供应商',
    message: `删除供应商「${p.name}」将同时删除其下所有模型，删除后无法恢复，是否确认？`,
    confirmText: '删除',
    danger: true,
  });
  if (!ok) return;
  const r = await request(`/api/provider/${p.id}`, { method: 'DELETE' });
  if (r.code === 0) {
    toast.success('已删除');
    loadAll();
  } else toast.error(r.message);
}
const syncingId = ref(null); // 当前正在同步的供应商 id（按钮 loading）
async function syncModels(p) {
  if (syncingId.value) return; // 防重入
  syncingId.value = p.id;
  const r = await request('/api/provider/sync', {
    method: 'POST',
    body: { providerId: p.id },
  }).catch(() => ({ code: -1, message: '网络错误' }));
  syncingId.value = null;
  if (r.code === 0) {
    toast.success(`${p.name}: ${r.message || '同步完成'}`);
    loadAll();
  } else {
    toast.error(r.message || '同步失败');
  }
}

/* ===== 模型操作 ===== */
const paramConfigText = ref('');
const paramConfigValid = ref(true);
const paramConfigError = ref('');

/* 模型按供应商分组：同名模型天然按供应商区分 */
const groupedModels = computed(() => {
  const map = new Map();
  for (const m of models.value) {
    const p = providers.value.find((x) => x.id === m.provider_id) || {};
    const key = p.id || 'unknown';
    if (!map.has(key))
      map.set(key, {
        providerId: key,
        name: p.name || '未知供应商',
        type: p.type,
        models: [],
      });
    map.get(key).models.push(m);
  }
  return [...map.values()];
});

/* 不同供应商风格的默认 param_config 模板（管理员可一键套用） */
const PRESETS = {
  openai: {
    n_max: 1,
    qualities: ['low', 'medium', 'high'],
    size_alias: { low: '1024x1024', medium: '1024x1024', high: '1024x1024' },
  },
  gpteam: {
    n_max: 4,
    qualities: ['low', 'medium', 'high'],
    quality_via_size: true,
    resolution_map: { '1K': '1024x1024', '2K': '1024x1792', '4K': '2048x2048' },
  },
  apiyi: {
    n_max: 1,
    qualities: ['medium'],
    // apiyi 不同模型无统一 quality 参数，按尺寸区分
    size_alias: { low: '1024x1024', medium: '1024x1024', high: '1024x1024' },
  },
  custom: {
    n_max: 1,
    qualities: ['medium'],
  },
};

function syncParamConfigFromModel() {
  if (!editModel.value) return;
  paramConfigText.value = editModel.value.param_config
    ? JSON.stringify(editModel.value.param_config, null, 2)
    : '';
  validateParamConfig();
}
function validateParamConfig() {
  const t = paramConfigText.value.trim();
  if (!t) {
    paramConfigValid.value = true;
    paramConfigError.value = '';
    return;
  }
  try {
    const obj = JSON.parse(t);
    if (typeof obj !== 'object' || Array.isArray(obj))
      throw new Error('必须是 JSON 对象');
    paramConfigValid.value = true;
    paramConfigError.value = '';
  } catch (error) {
    paramConfigValid.value = false;
    paramConfigError.value = error.message;
  }
}
function applyPreset(key) {
  const p = PRESETS[key];
  if (!p) return;
  paramConfigText.value = JSON.stringify(p, null, 2);
  validateParamConfig();
  // 同步填入默认 sizes / aspects / quality_options
  if (key === 'openai' || key === 'apiyi' || key === 'custom') {
    if (!editModel.value.sizes?.length)
      editModel.value.sizes = ['1024x1024', '1024x1792', '1792x1024'];
    if (!editModel.value.aspects?.length)
      editModel.value.aspects = ['1:1', '9:16', '16:9'];
    if (!editModel.value.quality_options?.length)
      editModel.value.quality_options = p.qualities;
  } else if (key === 'gpteam') {
    if (!editModel.value.sizes?.length)
      editModel.value.sizes = [
        '1024x1024',
        '1024x1792',
        '1792x1024',
        '2048x2048',
      ];
    if (!editModel.value.aspects?.length)
      editModel.value.aspects = ['1:1', '9:16', '16:9'];
    if (!editModel.value.quality_options?.length)
      editModel.value.quality_options = p.qualities;
  }
  toast.success(`已套用 ${key} 默认能力`);
}

function openEditModel(m) {
  editModel.value = {
    ...m,
    price: m.price ?? null,
    capabilities: Array.isArray(m.capabilities) ? m.capabilities : [],
    sizes: Array.isArray(m.sizes) ? m.sizes : [],
    aspects: Array.isArray(m.aspects) ? m.aspects : [],
    quality_options: Array.isArray(m.quality_options) ? m.quality_options : [],
  };
  syncParamConfigFromModel();
  modelModal.value = true;
}

async function saveModel() {
  // param_config 同步回 editModel
  if (paramConfigText.value.trim()) {
    try {
      editModel.value.param_config = JSON.parse(paramConfigText.value);
    } catch {
      /* validateParamConfig 已提示 */
    }
  } else {
    editModel.value.param_config = {};
  }
  const m = editModel.value;
  const r = await request(`/api/provider/models/${m.id}`, {
    method: 'PATCH',
    body: m,
  });
  if (r.code === 0) {
    toast.success('已更新');
    modelModal.value = false;
    loadAll();
  } else toast.error(r.message);
}
async function toggleModel(m) {
  const r = await request(`/api/provider/models/${m.id}`, {
    method: 'PATCH',
    body: { enabled: !m.enabled },
  });
  if (r.code === 0) {
    m.enabled = !m.enabled;
    toast.success(m.enabled ? '已启用' : '已停用');
  } else toast.error(r.message);
}

function providerLabel(type) {
  return providerTypeOptions.find((o) => o.v === type)?.label || type;
}
function providerTone(type) {
  const map = {
    openai: 'success',
    anthropic: 'ai',
    google: 'info',
    azure: 'success',
    gpteam: 'warning',
    custom: 'neutral',
  };
  return map[type] || 'neutral';
}
function toggleCapability(v) {
  const arr = editModel.value.capabilities;
  const i = arr.indexOf(v);
  if (i === -1) arr.push(v);
  else arr.splice(i, 1);
}

/* param_config 编辑器实时校验 */
watch(paramConfigText, () => validateParamConfig());
</script>

<template>
  <div class="pg gw">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">模型网关</h1>
        <p class="pg-sub">管理供应商与模型 · 一键同步 · 统一调用</p>
      </div>
      <div class="pg-actions">
        <AButton variant="primary" @click="openNewProvider">
          <Plus :size="15" /> 添加供应商
        </AButton>
      </div>
    </header>

    <!-- 能力抽象说明：每家中转站协议不同，没有统一能力查询接口；管理员按文档在此手动配置 -->
    <details class="cap-doc">
      <summary>能力配置说明（不同中转站协议差异，按本系统统一抽象）</summary>
      <div class="cap-doc-body">
        <p>
          <b>核心结论</b
          >：大模型行业<strong>没有统一的"能力查询接口"</strong>（OpenAI
          官方也没有）。各家供应商（gpteam / apiyi /
          自建中转）支持的参数、协议、路径都不一致。
        </p>
        <p>
          本系统采用<strong>统一抽象 + 手动配置</strong
          >：管理员按各中转站文档填入能力声明，前端自动归一化（n
          clamp、quality_via_size 映射、尺寸校验）。
        </p>
        <table class="cap-doc-table">
          <thead>
            <tr>
              <th>字段</th>
              <th>含义</th>
              <th>示例</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>capabilities</code></td>
              <td>能力（chat / text2img / img2img / vision / code）</td>
              <td>image 模型：text2img、chat</td>
            </tr>
            <tr>
              <td><code>sizes</code></td>
              <td>支持的尺寸</td>
              <td>1024x1024, 1024x1792, 1792x1024</td>
            </tr>
            <tr>
              <td><code>aspects</code></td>
              <td>支持的比例（与 sizes 一一对应）</td>
              <td>1:1, 9:16, 16:9</td>
            </tr>
            <tr>
              <td><code>quality_options</code></td>
              <td>画质档位</td>
              <td>low, medium, high</td>
            </tr>
            <tr>
              <td><code>param_config</code></td>
              <td>高级能力 JSON（每家差异最大）</td>
              <td>
                <code
                  >{ "n_max": 4, "qualities": ["low","medium","high"],
                  "quality_via_size": true, "resolution_map": { "1K":
                  "1024x1024", "2K": "1024x1792", "4K": "2048x2048" } }</code
                >
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          <b>已支持预设</b>：编辑模型时点 "OpenAI 风格 / GPTeam 风格 / APIYI
          风格 / 自定义"
          一键套用该供应商典型能力（基于公开文档总结，可再微调）。
        </p>
        <p class="cap-doc-warn">
          ⚠️ 第三方文档变动：填写前请查阅供应商最新文档（如
          <code>docs.apiyi.com</code
          >、<code>portal.gpteamservices.com</code>）。
        </p>
      </div>
    </details>

    <!-- 顶部 4 张数据卡 -->
    <section class="gw-stats">
      <div class="gw-stat">
        <div class="gw-stat-num">{{ stats.providers }}</div>
        <div class="gw-stat-label">供应商</div>
      </div>
      <div class="gw-stat accent">
        <div class="gw-stat-num">{{ stats.enabled }}</div>
        <div class="gw-stat-label">已启用</div>
      </div>
      <div class="gw-stat">
        <div class="gw-stat-num">{{ stats.models }}</div>
        <div class="gw-stat-label">模型总数</div>
      </div>
      <div class="gw-stat">
        <div class="gw-stat-num">{{ stats.imageModels }}</div>
        <div class="gw-stat-label">图像模型</div>
      </div>
    </section>

    <!-- 双 tab -->
    <nav class="gw-tabs">
      <button :class="{ on: tab === 'providers' }" @click="tab = 'providers'">
        <Layers :size="14" /> 供应商
        <span class="gw-tab-num">{{ providers.length }}</span>
      </button>
      <button :class="{ on: tab === 'models' }" @click="tab = 'models'">
        <Cpu :size="14" /> 模型
        <span class="gw-tab-num">{{ models.length }}</span>
      </button>
    </nav>

    <!-- ===== 供应商列表 ===== -->
    <section v-if="tab === 'providers'" class="card list-card">
      <div v-if="!providers.length" class="empty">
        <Sparkles :size="28" />
        <p>还没有添加供应商</p>
        <AButton variant="primary" @click="openNewProvider"
          >
<Plus :size="14" /> 添加第一个供应商
</AButton
        >
      </div>
      <table v-else class="tbl">
        <thead>
          <tr>
            <th>名称</th>
            <th>类型</th>
            <th>Base URL</th>
            <th class="num">优先级</th>
            <th class="num">权重</th>
            <th class="num">超时</th>
            <th>状态</th>
            <th style="width: 180px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in providers" :key="p.id" :class="{ dim: !p.enabled }">
            <td>
              <div class="provider-cell">
                <span
                  class="provider-dot"
                  :style="{
                    background: p.enabled
                      ? 'var(--color-accent)'
                      : 'var(--color-text-3)',
                  }"
                ></span>
                <span class="provider-name">{{ p.name }}</span>
              </div>
            </td>
            <td>
              <ABadge :tone="providerTone(p.type)">
{{
                providerLabel(p.type)
              }}
</ABadge>
            </td>
            <td class="mono small">{{ p.base_url }}</td>
            <td class="num">{{ p.priority }}</td>
            <td class="num">{{ p.weight }}</td>
            <td class="num muted">{{ p.timeout_sec }}s</td>
            <td>
              <ABadge :tone="p.enabled ? 'success' : 'neutral'">
{{
                p.enabled ? '启用' : '停用'
              }}
</ABadge>
            </td>
            <td>
              <div class="row-actions">
                <button
                  class="ra primary"
                  :disabled="!!syncingId"
                  @click="syncModels(p)"
                  :title="
                    syncingId === p.id ? '同步中…' : '从 {base}/v1/models 拉取'
                  "
                >
                  <Loader2 v-if="syncingId === p.id" :size="13" class="spin" />
                  <RefreshCw v-else :size="13" />
                  {{ syncingId === p.id ? '同步中' : '同步' }}
                </button>
                <button class="ra" @click="openEditProvider(p)" title="编辑">
                  <Pencil :size="13" />
                </button>
                <button
                  class="ra danger"
                  @click="deleteProvider(p)"
                  title="删除"
                >
                  <Trash2 :size="13" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ===== 模型列表 ===== -->
    <section v-else class="card list-card">
      <div v-if="!models.length" class="empty">
        <Cpu :size="28" />
        <p>暂无模型 · 先去「供应商」页点同步</p>
      </div>
      <div v-else class="model-grid">
        <!-- 按供应商分组显示：同名模型（如不同供应商的 deepseek）天然区分 -->
        <template v-for="g in groupedModels" :key="g.providerId">
          <div class="model-group">
            <div class="mg-head">
              <h3>{{ g.name }}</h3>
              <span class="mg-count">{{ g.models.length }} 个模型</span>
            </div>
            <div class="model-grid-inner">
              <article
                v-for="m in g.models"
                :key="m.id"
                class="model-card"
                :class="{ dim: !m.enabled }"
              >
                <header class="mc-head">
                  <div class="mc-type">
                    <component
                      :is="modelTypeIcon[m.model_type] || Cpu"
                      :size="14"
                    />
                    <ABadge :tone="modelTypeTone[m.model_type] || 'neutral'">
{{
                      modelTypeLabel[m.model_type] || m.model_type
                    }}
</ABadge>
                  </div>
                  <button
                    class="mc-toggle"
                    :class="{ on: m.enabled }"
                    @click="toggleModel(m)"
                  >
                    <Power :size="12" />
                  </button>
                </header>
                <h3 class="mc-alias">{{ m.alias || m.upstream_id }}</h3>
                <p class="mc-upstream">{{ m.upstream_id }}</p>
                <div v-if="m.capabilities?.length" class="mc-caps">
                  <span v-for="c in m.capabilities" :key="c" class="mc-cap">{{
                    c
                  }}</span>
                </div>
                <div
                  v-if="m.sizes?.length || m.aspects?.length"
                  class="mc-specs"
                >
                  <span v-if="m.sizes?.length">尺寸 {{ m.sizes.length }}</span>
                  <span v-if="m.aspects?.length"
                    >比例 {{ m.aspects.length }}</span
                  >
                </div>
                <div class="mc-foot">
                  <span class="mc-provider">{{
                    providerLabel(
                      models.find((x) => x.id === m.provider_id)?.type,
                    ) || '—'
                  }}</span>
                  <span v-if="m.price != null" class="mc-price"
                    >{{ m.price }} 积分/次</span
                  >
                  <button class="ra" @click="openEditModel(m)" title="编辑">
                    <Pencil :size="13" />
                  </button>
                </div>
              </article>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- ===== 供应商弹窗 ===== -->
    <AModal
      :open="providerModal"
      :title="editProvider?.id ? '编辑供应商' : '添加供应商'"
      @close="providerModal = false"
    >
      <div v-if="editProvider" class="form">
        <div class="form-row">
          <label>渠道名称 *</label>
          <AInput
            v-model="editProvider.name"
            placeholder="如 GPTEAM 中转"
            :class="{ 'field-invalid': providerErrors.name }"
          />
          <p v-if="providerErrors.name" class="form-err">
            {{ providerErrors.name }}
          </p>
        </div>
        <div class="form-row">
          <label>供应商类型 *</label>
          <select
            v-model="editProvider.type"
            class="select"
            :class="{ 'field-invalid': providerErrors.type }"
          >
            <option v-for="o in providerTypeOptions" :key="o.v" :value="o.v">
              {{ o.label }}
            </option>
          </select>
          <p v-if="providerErrors.type" class="form-err">
            {{ providerErrors.type }}
          </p>
        </div>
        <div class="form-row">
          <label>Base URL *</label>
          <AInput
            v-model="editProvider.base_url"
            placeholder="https://api.gpteamservices.com"
            :class="{ 'field-invalid': providerErrors.base_url }"
          />
          <p v-if="providerErrors.base_url" class="form-err">
            {{ providerErrors.base_url }}
          </p>
        </div>
        <div class="form-row">
          <label>API Key *</label>
          <AInput
            v-model="editProvider.api_key"
            :placeholder="
              editProvider.id ? '留空保留原 key，输入则替换' : 'sk-...'
            "
            :class="{ 'field-invalid': providerErrors.api_key }"
          />
          <p v-if="providerErrors.api_key" class="form-err">
            {{ providerErrors.api_key }}
          </p>
          <p class="form-tip">存储在服务端，admin 仅显示前 4 后 4 位</p>
        </div>
        <div class="form-row">
          <label>描述</label>
          <AInput v-model="editProvider.description" placeholder="可选" />
        </div>
        <div class="form-grid-2">
          <div class="form-row">
            <label>优先级 <span class="form-hint">数值小的先调用</span></label>
            <input
              v-model.number="editProvider.priority"
              type="number"
              class="input"
            />
          </div>
          <div class="form-row">
            <label
              >权重 <span class="form-hint">同优先级下轮询比例</span></label
            >
            <input
              v-model.number="editProvider.weight"
              type="number"
              class="input"
            />
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-row">
            <label>超时（秒）<span class="form-hint">默认 120</span></label>
            <input
              v-model.number="editProvider.timeout_sec"
              type="number"
              class="input"
            />
          </div>
          <div class="form-row">
            <label>最大重试 <span class="form-hint">含首次 1+重试</span></label>
            <input
              v-model.number="editProvider.max_retries"
              type="number"
              class="input"
            />
          </div>
        </div>
        <div class="form-row switch-row">
          <label>启用</label>
          <label class="switch">
            <input type="checkbox" v-model="editProvider.enabled" />
            <span class="slider"></span>
          </label>
        </div>
        <div class="form-row">
          <label
            >扩展配置
            <span class="form-hint">JSON · 自定义请求头/路径等</span></label
          >
          <textarea
            v-model="editProvider.extra_json"
            rows="3"
            class="textarea mono"
            placeholder="{&quot;customHeader&quot;:&quot;x-token&quot;,&quot;apiPath&quot;:&quot;/v1/images/generations&quot;}"
          ></textarea>
          <p class="form-tip">
            高级选项 · 比如
            <code>{ "customHeader": "x-tenant: xx" }</code>
            会附加到每个请求头；<code>apiPath</code> 可覆盖默认端点路径
          </p>
        </div>
      </div>
      <template #footer>
        <AButton variant="ghost" @click="providerModal = false">取消</AButton>
        <AButton variant="primary" @click="saveProvider">保存</AButton>
      </template>
    </AModal>

    <!-- ===== 模型弹窗 ===== -->
    <AModal
      :open="modelModal"
      :title="editModel ? '编辑模型' : '新增模型'"
      @close="modelModal = false"
    >
      <div v-if="editModel" class="form">
        <div class="form-row">
          <label>展示别名</label>
          <AInput v-model="editModel.alias" placeholder="前台用户看到的名字" />
        </div>
        <div class="form-row">
          <label>原始 ID</label>
          <input :value="editModel.upstream_id" disabled class="input mono" />
        </div>
        <div class="form-grid-2">
          <div class="form-row">
            <label>类型</label>
            <select v-model="editModel.model_type" class="select">
              <option value="text">文本</option>
              <option value="image">图像</option>
              <option value="video">视频</option>
              <option value="audio">音频</option>
            </select>
          </div>
          <div class="form-row">
            <label>返回格式</label>
            <select v-model="editModel.return_format" class="select">
              <option value="url">URL</option>
              <option value="base64">Base64</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <label>能力（多选）</label>
          <div class="cap-grid">
            <button
              v-for="o in capabilityOptions"
              :key="o.v"
              class="cap-chip"
              :class="{ on: editModel.capabilities.includes(o.v) }"
              @click="toggleCapability(o.v)"
              type="button"
            >
              <component :is="o.icon" :size="12" /> {{ o.label }}
            </button>
          </div>
        </div>
        <!-- 图像类模型：尺寸/比例/画质/高级参数 -->
        <template v-if="editModel.model_type === 'image'">
          <div class="form-row">
            <label
              >支持的尺寸
              <span class="form-hint"
                >点击 chip 移除，输入后按 Enter 添加</span
              ></label
            >
            <ChipInput
              v-model="editModel.sizes"
              placeholder="1024x1024 后回车"
            />
          </div>
          <div class="form-row">
            <label>支持的比例</label>
            <ChipInput v-model="editModel.aspects" placeholder="1:1 后回车" />
          </div>
          <div class="form-row">
            <label
              >画质档位
              <span class="form-hint"
                >low/medium/high（与 param_config.qualities 对应）</span
              ></label
            >
            <ChipInput
              v-model="editModel.quality_options"
              placeholder="low 后回车"
            />
          </div>
        </template>
        <div class="form-row">
          <label
            >高级参数
            <span class="form-hint"
              >param_config JSON — 描述本模型支持的细节能力</span
            ></label
          >
          <textarea
            v-model="paramConfigText"
            rows="5"
            class="input mono"
            spellcheck="false"
            placeholder="例: {&quot;n_max&quot;:4,&quot;qualities&quot;:[&quot;low&quot;,&quot;medium&quot;,&quot;high&quot;],&quot;quality_via_size&quot;:true,&quot;resolution_map&quot;:{&quot;1K&quot;:&quot;1024x1024&quot;,&quot;2K&quot;:&quot;1024x1792&quot;,&quot;4K&quot;:&quot;2048x2048&quot;}}"
          ></textarea>
          <p class="form-tip" :class="{ 'is-err': !paramConfigValid }">
            <span v-if="paramConfigValid">✓ JSON 合法</span>
            <span v-else>✗ JSON 错误：{{ paramConfigError }}</span>
          </p>
          <div class="preset-row">
            <span class="form-hint">按供应商类型一键套默认：</span>
            <button
              class="preset-btn"
              type="button"
              @click="applyPreset('openai')"
            >
              OpenAI 风格
            </button>
            <button
              class="preset-btn"
              type="button"
              @click="applyPreset('gpteam')"
            >
              GPTeam 风格
            </button>
            <button
              class="preset-btn"
              type="button"
              @click="applyPreset('apiyi')"
            >
              APIYI 风格
            </button>
            <button
              class="preset-btn"
              type="button"
              @click="applyPreset('custom')"
            >
              自定义
            </button>
          </div>
        </div>
        <div class="form-row">
          <label
            >按次计费单价（积分/次）<span class="form-hint"
              >0 = 免费，留空 = 未设置不计费</span
            ></label
          >
          <input
            v-model.number="editModel.price"
            type="number"
            min="0"
            step="0.01"
            class="input mono"
            placeholder="如 10 表示每次调用扣 10 积分"
          />
        </div>
      </div>
      <template #footer>
        <AButton variant="ghost" @click="modelModal = false">取消</AButton>
        <AButton variant="primary" @click="saveModel">保存</AButton>
      </template>
    </AModal>
  </div>
</template>

<style scoped>
.gw {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.gw-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.gw-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px 22px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  transition: all var(--dur-fast) ease;
}

.gw-stat:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.gw-stat.accent {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-accent) 10%, var(--color-surface)),
    var(--color-surface)
  );
}

.gw-stat-num {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
  color: var(--color-text-1);
}

.gw-stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.gw-tabs {
  display: flex;
  gap: 4px;
  width: fit-content;
  padding: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.gw-tabs button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 8px 16px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-2);
  border-radius: 8px;
  transition: all var(--dur-fast) ease;
}

.gw-tabs button:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.gw-tabs button.on {
  color: var(--color-text-inverse);
  background: var(--color-accent);
}

.gw-tab-num {
  display: inline-flex;
  min-width: 18px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 700;
  background: color-mix(in srgb, currentcolor 20%, transparent);
  border-radius: 8px;
}

.gw-tabs button.on .gw-tab-num {
  background: color-mix(in srgb, var(--color-text-inverse) 22%, transparent);
}

.list-card {
  padding: 0;
  overflow: hidden;
}

.empty {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  padding: 60px 20px;
  color: var(--color-text-3);
  text-align: center;
}

.empty p {
  font-size: var(--text-sm);
}

.tbl {
  width: 100%;
  border-collapse: collapse;
}

.tbl th,
.tbl td {
  padding: 12px 16px;
  font-size: var(--text-sm);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.tbl th {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-3);
  background: var(--color-surface-2);
}

.tbl tr.dim {
  opacity: 0.5;
}

.tbl tr:last-child td {
  border-bottom: 0;
}

.tbl tr:hover {
  background: color-mix(in srgb, var(--color-accent) 4%, transparent);
}

.num {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.muted {
  color: var(--color-text-3);
}

.mono {
  font-family: var(--font-mono);
}

.small {
  font-size: var(--text-xs);
}

.provider-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.provider-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.provider-name {
  font-weight: 600;
}

.row-actions {
  display: flex;
  gap: 4px;
}

.ra {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 5px 10px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-2);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: all var(--dur-fast) ease;
}

.ra:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
  border-color: var(--color-border);
}

.ra.primary {
  color: var(--color-accent);
}

.ra.primary:hover {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.ra.danger:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

/* 模型卡片网格 */
.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  padding: 20px;
}

.model-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  transition: all var(--dur-fast) ease;
}

.model-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.model-card.dim {
  opacity: 0.55;
}

.mc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mc-type {
  display: flex;
  gap: 6px;
  align-items: center;
  color: var(--color-text-2);
}

.mc-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--color-text-3);
  cursor: pointer;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: all var(--dur-fast) ease;
}

.mc-toggle.on {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 18%, transparent);
  border-color: var(--color-success);
}

.mc-alias {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-1);
}

.mc-upstream {
  margin: -6px 0 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.mc-caps {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.mc-price {
  font-weight: 600;
  color: var(--color-accent);
}

.mg-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 2px;
  margin: 10px 0 8px;
}

.mg-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-1);
}

.mg-count {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-3);
}

.model-grid-inner {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.mc-cap {
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  border-radius: var(--r-full);
}

.mc-specs {
  display: flex;
  gap: 10px;
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.mc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px dashed var(--color-border);
}

.mc-provider {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

/* 表单（弹窗内） */
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 4px 12px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-2);
}

.form-tip {
  margin: 2px 0 0;
  font-size: 10px;
  color: var(--color-text-3);
}

.form-tip.is-err {
  font-weight: 600;
  color: var(--color-error, #e24b4a);
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
}

.preset-btn {
  padding: 3px 9px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  transition: all var(--dur-fast) ease;
}

.preset-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.cap-doc {
  padding: 0 16px;
  margin-top: 18px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.cap-doc summary {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
  cursor: pointer;
  list-style: none;
}

.cap-doc summary::before {
  color: var(--color-text-3);
  content: '▸';
  transition: transform 0.2s;
}

.cap-doc[open] summary::before {
  transform: rotate(90deg);
}

.cap-doc-body {
  padding: 0 0 14px 14px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-text-2);
}

.cap-doc-body p {
  margin: 6px 0;
}

.cap-doc-body code {
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--color-surface-2);
  border-radius: 4px;
}

.cap-doc-table {
  width: 100%;
  margin: 8px 0;
  font-size: 11px;
  border-collapse: collapse;
}

.cap-doc-table th,
.cap-doc-table td {
  padding: 6px 10px;
  vertical-align: top;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.cap-doc-table th {
  font-weight: 600;
  color: var(--color-text-3);
  background: var(--color-surface-2);
}

.cap-doc-warn {
  color: #b97000;
}

.form-err {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--color-error);
}

.field-invalid :deep(input),
.field-invalid {
  border-color: var(--color-error) !important;
}

.field-invalid :deep(input):focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error) 12%, transparent);
}

.form-tip code {
  padding: 1px 5px;
  font-family: var(--font-mono);
  background: var(--color-surface-2);
  border-radius: 4px;
}

.form-hint {
  margin-left: 4px;
  font-size: 10px;
  font-weight: 400;
  color: var(--color-text-3);
}

.input,
.select,
.textarea {
  padding: 8px 12px;
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-1);
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  transition: border-color var(--dur-fast) ease;
}

.input:focus,
.select:focus,
.textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--glow-accent);
}

.textarea {
  min-height: 60px;
  resize: vertical;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.switch-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-top: 18px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 22px;
}

.switch input {
  width: 0;
  height: 0;
  opacity: 0;
}

.slider {
  position: absolute;
  inset: 0;
  cursor: pointer;
  background: var(--color-surface-2);
  border-radius: 22px;
  transition: 0.2s;
}

.slider::before {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  content: '';
  background: #fff;
  border-radius: 50%;
  transition: 0.2s;
}

.switch input:checked + .slider {
  background: var(--color-accent);
}

.switch input:checked + .slider::before {
  transform: translateX(16px);
}

.cap-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cap-chip {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-2);
  cursor: pointer;
  background: var(--color-surface-2);
  border: 1px solid transparent;
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.cap-chip:hover {
  color: var(--color-text-1);
}

.cap-chip.on {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  border-color: var(--color-accent);
}
</style>
