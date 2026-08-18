<script setup lang="ts">
import type {
  BuiltinProviderDto,
  CreateModelInputDto,
  ModelDto,
  ProviderDto,
} from '#/api/ai-agent';

import { computed, onMounted, reactive, ref } from 'vue';

import { Search, X } from 'lucide-vue-next';

import {
  createBuiltinProvider,
  createCustomProvider,
  deleteProvider,
  getAvailableBuiltinProviders,
  getProviders,
  protocolShortName,
  setProviderEnabled,
  updateProvider,
} from '#/api/ai-agent';
import { toast } from '#/utils/toast';

// ---------- 数据 ----------
const providers = ref<ProviderDto[]>([]);
const builtinAvailable = ref<BuiltinProviderDto[]>([]);
const loading = ref(false);

// ---------- 筛选 ----------
const tab = ref<'all' | 'builtin' | 'custom'>('all');
const protocolFilter = ref<string>('all');
const keyword = ref('');

const protocolOptions = computed(() => {
  const set = new Set<string>();
  providers.value.forEach((p) => set.add(protocolShortName(p.protocol)));
  return [...set];
});

const filteredProviders = computed(() => {
  return providers.value.filter((p) => {
    if (tab.value === 'builtin' && p.type !== 0) return false;
    if (tab.value === 'custom' && p.type !== 1) return false;
    if (
      protocolFilter.value !== 'all' &&
      protocolShortName(p.protocol) !== protocolFilter.value
    )
      return false;
    if (
      keyword.value &&
      !p.name.toLowerCase().includes(keyword.value.toLowerCase())
    )
      return false;
    return true;
  });
});

const metricEnabled = computed(
  () => providers.value.filter((p) => p.enabled).length,
);
const metricTotalModels = computed(() =>
  providers.value.reduce((s, p) => s + (p.modelCount ?? 0), 0),
);

async function loadProviders() {
  loading.value = true;
  try {
    const res = await getProviders();
    providers.value = res.items ?? [];
  } catch (error) {
    toast.error(`加载失败: ${(error as Error).message}`);
  } finally {
    loading.value = false;
  }
}

async function loadBuiltinAvailable() {
  try {
    const res = await getAvailableBuiltinProviders();
    builtinAvailable.value = res.items ?? [];
  } catch (error) {
    toast.error(`内置目录加载失败: ${(error as Error).message}`);
  }
}

onMounted(async () => {
  await Promise.all([loadProviders(), loadBuiltinAvailable()]);
});

// ---------- 行操作 ----------
async function onToggleEnabled(p: ProviderDto) {
  try {
    await setProviderEnabled(p.id, !p.enabled);
    toast.success(p.enabled ? '已停用' : '已启用');
    await loadProviders();
  } catch (error) {
    toast.error(`操作失败: ${(error as Error).message}`);
  }
}

function onDelete(p: ProviderDto) {
  confirmOpen.value = true;
  deletingProvider.value = p;
}

const confirmOpen = ref(false);
const deletingProvider = ref<null | ProviderDto>(null);

async function doDelete() {
  if (!deletingProvider.value) return;
  try {
    await deleteProvider(deletingProvider.value.id);
    toast.success('已删除');
    confirmOpen.value = false;
    await loadProviders();
    await loadBuiltinAvailable();
  } catch (error) {
    toast.error(`删除失败: ${(error as Error).message}`);
  }
}

// ---------- 添加 Provider 抽屉(分步向导) ----------
const drawerOpen = ref(false);
const step = ref(1);
const providerKind = ref<'builtin' | 'custom'>('builtin');
const saving = ref(false);

const builtinForm = reactive({
  code: '',
  apiKey: '',
  baseUrl: '',
  priority: 100,
  weight: 1,
  timeoutSeconds: 300,
  description: '',
  advancedOpen: false,
  models: [] as CreateModelInputDto[],
});

const customForm = reactive({
  code: '',
  name: '',
  baseUrl: '',
  protocol: 'openai-completions',
  apiKey: '',
  priority: 100,
  weight: 1,
  timeoutSeconds: 300,
  description: '',
  advancedOpen: false,
  models: [] as CreateModelInputDto[],
});

const PROTOCOLS = [
  { value: 'openai-completions', label: 'OpenAI 兼容 (completions)' },
  { value: 'openai-responses', label: 'OpenAI 兼容 (responses)' },
  { value: 'openai-images', label: 'OpenAI 兼容 (images)' },
  { value: 'anthropic-messages', label: 'Anthropic (messages)' },
  { value: 'dashscope', label: 'DashScope (通义/即梦)' },
];

function openAddDrawer() {
  step.value = 1;
  providerKind.value = 'builtin';
  resetForms();
  drawerOpen.value = true;
}

function resetForms() {
  builtinForm.code = '';
  builtinForm.apiKey = '';
  builtinForm.baseUrl = '';
  builtinForm.priority = 100;
  builtinForm.weight = 1;
  builtinForm.timeoutSeconds = 300;
  builtinForm.description = '';
  builtinForm.advancedOpen = false;
  builtinForm.models = [];
  customForm.code = '';
  customForm.name = '';
  customForm.baseUrl = '';
  customForm.protocol = 'openai-completions';
  customForm.apiKey = '';
  customForm.priority = 100;
  customForm.weight = 1;
  customForm.timeoutSeconds = 300;
  customForm.description = '';
  customForm.advancedOpen = false;
  customForm.models = [];
}

function onBuiltinSelect(code: string) {
  builtinForm.code = code;
  const found = builtinAvailable.value.find((b) => b.code === code);
  if (found?.defaultBaseUrl) builtinForm.baseUrl = found.defaultBaseUrl;
}

function addModelRow() {
  const target = providerKind.value === 'builtin' ? builtinForm : customForm;
  target.models.push({
    modelName: '',
    displayName: '',
    contextWindow: null,
    maxOutputTokens: null,
    capabilityIds: '',
    maxImagesPerRequest: 4,
    enabled: true,
    pricePerCall: 0,
  });
}

function removeModelRow(idx: number) {
  const target = providerKind.value === 'builtin' ? builtinForm : customForm;
  target.models.splice(idx, 1);
}

const nextDisabled = computed(() => {
  if (step.value === 1) return false;
  if (step.value === 2) {
    if (providerKind.value === 'builtin') return !builtinForm.code;
    return !customForm.code || !customForm.name;
  }
  return false;
});

async function saveProvider() {
  if (saving.value) return;
  saving.value = true;
  try {
    const validModels = (
      providerKind.value === 'builtin' ? builtinForm : customForm
    ).models.filter((m) => m.modelName.trim());
    if (providerKind.value === 'builtin') {
      await createBuiltinProvider({
        code: builtinForm.code,
        apiKey: builtinForm.apiKey || null,
        baseUrl: builtinForm.baseUrl || null,
        priority: builtinForm.priority,
        weight: builtinForm.weight,
        timeoutSeconds: builtinForm.timeoutSeconds,
        description: builtinForm.description || null,
        models: validModels,
      });
      toast.success(`已添加 ${builtinForm.code}`);
    } else {
      await createCustomProvider({
        code: customForm.code,
        name: customForm.name,
        baseUrl: customForm.baseUrl || null,
        protocol: customForm.protocol,
        apiKey: customForm.apiKey || null,
        priority: customForm.priority,
        weight: customForm.weight,
        timeoutSeconds: customForm.timeoutSeconds,
        description: customForm.description || null,
        models: validModels,
      });
      toast.success(`已创建 ${customForm.name}`);
    }
    drawerOpen.value = false;
    await Promise.all([loadProviders(), loadBuiltinAvailable()]);
  } catch (error) {
    toast.error(`保存失败: ${(error as Error).message}`);
  } finally {
    saving.value = false;
  }
}

// ---------- 编辑 ----------
const editOpen = ref(false);
const editingProvider = ref<null | ProviderDto>(null);
const editForm = reactive({
  name: '',
  baseUrl: '',
  apiKey: '',
  priority: 100,
  weight: 1,
  timeoutSeconds: 300,
  description: '',
});

function openEdit(p: ProviderDto) {
  editingProvider.value = p;
  editForm.name = p.name;
  editForm.baseUrl = p.baseUrl ?? '';
  editForm.apiKey = '';
  editForm.priority = p.priority;
  editForm.weight = p.weight;
  editForm.timeoutSeconds = p.timeoutSeconds;
  editForm.description = p.description ?? '';
  editOpen.value = true;
}

async function saveEdit() {
  if (!editingProvider.value) return;
  try {
    await updateProvider(editingProvider.value.id, {
      name: editForm.name,
      baseUrl: editForm.baseUrl || null,
      enabled: editingProvider.value.enabled,
      priority: editForm.priority,
      weight: editForm.weight,
      timeoutSeconds: editForm.timeoutSeconds,
      description: editForm.description || null,
      apiKey: editForm.apiKey || null,
    });
    toast.success('已保存');
    editOpen.value = false;
    await loadProviders();
  } catch (error) {
    toast.error(`保存失败: ${(error as Error).message}`);
  }
}

// ---------- 模型抽屉 ----------
const modelsOpen = ref(false);
const currentProvider = ref<null | ProviderDto>(null);
const providerModels = ref<ModelDto[]>([]);
const modelsLoading = ref(false);
const newModelOpen = ref(false);
const modelForm = reactive<CreateModelInputDto>({
  modelName: '',
  displayName: '',
  contextWindow: null,
  maxOutputTokens: null,
  capabilityIds: '',
  maxImagesPerRequest: 4,
  enabled: true,
  pricePerCall: 0,
});

async function openModels(p: ProviderDto) {
  currentProvider.value = p;
  modelsOpen.value = true;
  await loadModels(p.id);
}

async function loadModels(providerId: string) {
  modelsLoading.value = true;
  try {
    const { getProviderModels } = await import('#/api/ai-agent');
    const res = await getProviderModels(providerId);
    providerModels.value = res.items ?? [];
  } catch (error) {
    toast.error(`模型加载失败: ${(error as Error).message}`);
  } finally {
    modelsLoading.value = false;
  }
}

function openAddModel() {
  modelForm.modelName = '';
  modelForm.displayName = '';
  modelForm.contextWindow = null;
  modelForm.maxOutputTokens = null;
  modelForm.capabilityIds = '';
  modelForm.maxImagesPerRequest = 4;
  modelForm.enabled = true;
  modelForm.pricePerCall = 0;
  newModelOpen.value = true;
}

async function saveModel() {
  if (!currentProvider.value || !modelForm.modelName.trim()) return;
  try {
    const { addProviderModel } = await import('#/api/ai-agent');
    await addProviderModel(currentProvider.value.id, { ...modelForm });
    toast.success('已添加模型');
    newModelOpen.value = false;
    await loadModels(currentProvider.value.id);
    await loadProviders();
  } catch (error) {
    toast.error(`添加失败: ${(error as Error).message}`);
  }
}

async function onModelEnabled(m: ModelDto, enabled: boolean) {
  if (!currentProvider.value) return;
  try {
    const { setProviderModelEnabled } = await import('#/api/ai-agent');
    await setProviderModelEnabled(currentProvider.value.id, m.id, enabled);
    toast.success(enabled ? '已启用' : '已停用');
    await loadModels(currentProvider.value.id);
  } catch (error) {
    toast.error(`操作失败: ${(error as Error).message}`);
  }
}

// ---------- 图标辅助 ----------
function providerIconClass(code: string): string {
  const key = code.toLowerCase();
  if (key.includes('openai') || key.includes('gpt')) return 'pi-openai';
  if (key.includes('anthropic') || key.includes('claude'))
    return 'pi-anthropic';
  if (key.includes('gemini')) return 'pi-gemini';
  if (key.includes('deepseek')) return 'pi-deepseek';
  if (
    key.includes('qwen') ||
    key.includes('dashscope') ||
    key.includes('tongyi')
  )
    return 'pi-qwen';
  if (key.includes('mistral')) return 'pi-mistral';
  if (key.includes('ollama')) return 'pi-ollama';
  return 'pi-custom';
}

function iconLetter(name: string): string {
  return (name || '?').trim().charAt(0).toUpperCase();
}
</script>

<template>
  <div class="models-page">
    <!-- ===== 页头 ===== -->
    <div class="page-head">
      <div class="left">
        <h1 class="title">模型管理</h1>
        <p class="subtitle">
          统一管理 AI 模型提供商与模型。验证链路:管理端 → API → 落地端。
        </p>
      </div>
      <div class="right">
        <button class="btn btn--ghost" title="刷新" @click="loadProviders">
          刷新
        </button>
        <button class="btn btn--primary" @click="openAddDrawer">
          <span class="btn-plus">+</span> 添加 Provider
        </button>
      </div>
    </div>

    <!-- ===== 指标卡 ===== -->
    <section class="metrics">
      <div class="metric">
        <div class="metric-label">
          <span class="metric-dot dot-idle"></span> Provider 总数
        </div>
        <div class="metric-value">
          {{ providers.length }}<span class="unit">个</span>
        </div>
        <div class="metric-sub">全部已配置</div>
      </div>
      <div class="metric">
        <div class="metric-label">
          <span class="metric-dot dot-ok"></span> 已启用
        </div>
        <div class="metric-value">
          {{ metricEnabled }}<span class="unit">个</span>
        </div>
        <div class="metric-sub">运行中</div>
      </div>
      <div class="metric">
        <div class="metric-label">
          <span class="metric-dot dot-ok"></span> 模型总数
        </div>
        <div class="metric-value">
          {{ metricTotalModels }}<span class="unit">个</span>
        </div>
        <div class="metric-sub">跨全部 Provider</div>
      </div>
      <div class="metric">
        <div class="metric-label">
          <span class="metric-dot dot-ok"></span> 内置目录
        </div>
        <div class="metric-value">
          {{ builtinAvailable.length }}<span class="unit">家</span>
        </div>
        <div class="metric-sub">可一键接入</div>
      </div>
    </section>

    <!-- ===== 工具栏 ===== -->
    <div class="toolbar">
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: tab === 'all' }"
          @click="tab = 'all'"
        >
          全部 <span class="badge">{{ providers.length }}</span>
        </button>
        <button
          class="tab"
          :class="{ active: tab === 'builtin' }"
          @click="tab = 'builtin'"
        >
          内置
          <span class="badge">{{
            providers.filter((p) => p.type === 0).length
          }}</span>
        </button>
        <button
          class="tab"
          :class="{ active: tab === 'custom' }"
          @click="tab = 'custom'"
        >
          自定义
          <span class="badge">{{
            providers.filter((p) => p.type === 1).length
          }}</span>
        </button>
      </div>
      <div class="toolbar-right">
        <div class="input-wrap">
          <Search :size="14" />
          <input
            v-model="keyword"
            class="input input--search"
            placeholder="搜索 Provider 名称…"
          />
        </div>
      </div>
    </div>

    <!-- ===== 筛选条 ===== -->
    <div class="filterbar">
      <button
        class="chip"
        :class="{ active: protocolFilter === 'all' }"
        @click="protocolFilter = 'all'"
      >
        全部协议
      </button>
      <button
        v-for="proto in protocolOptions"
        :key="proto"
        class="chip"
        :class="{ active: protocolFilter === proto }"
        @click="protocolFilter = proto"
      >
        {{ proto }}
      </button>
      <div class="spacer"></div>
      <span class="filter-count"
        >共 {{ filteredProviders.length }} 个 Provider</span
      >
    </div>

    <!-- ===== 表格 ===== -->
    <div class="table-wrap">
      <table class="t">
        <thead>
          <tr>
            <th style="width: 320px">Provider</th>
            <th style="width: 130px">协议</th>
            <th>Base URL</th>
            <th style="width: 90px">模型数</th>
            <th style="width: 110px">状态</th>
            <th style="width: 150px" class="sortable">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="empty-cell">加载中…</td>
          </tr>
          <tr v-else-if="filteredProviders.length === 0">
            <td colspan="6" class="empty-cell">
              还没有 Provider —— 点击右上角「添加 Provider」开始接入
            </td>
          </tr>
          <tr v-for="p in filteredProviders" v-else :key="p.id">
            <td>
              <div class="provider-cell">
                <span class="provider-icon" :class="providerIconClass(p.code)">
                  <span class="pi-icon-text">{{ iconLetter(p.name) }}</span>
                </span>
                <div class="provider-meta">
                  <div class="provider-name">
                    {{ p.name }}
                    <span
                      class="badge"
                      :class="p.type === 1 ? 'b-info' : 'b-neutral'"
                    >
                      {{ p.type === 1 ? 'CUSTOM' : 'BUILTIN' }}
                    </span>
                  </div>
                  <div class="provider-desc">
                    {{ p.description || p.baseUrl || '—' }}
                  </div>
                </div>
              </div>
            </td>
            <td>
              <span class="badge b-neutral">{{
                protocolShortName(p.protocol)
              }}</span>
            </td>
            <td>
              <span class="mono url">{{ p.baseUrl || '—' }}</span>
            </td>
            <td>
              <span class="mono">{{ p.modelCount }}</span>
            </td>
            <td>
              <span class="health">
                <span
                  class="dot"
                  :class="p.enabled ? 'dot-ok' : 'dot-idle'"
                ></span>
                <span class="label">{{ p.enabled ? '正常' : '停用' }}</span>
              </span>
            </td>
            <td>
              <div class="row-actions">
                <button
                  class="icon-btn"
                  title="查看模型"
                  @click="openModels(p)"
                >
                  ≡
                </button>
                <button class="icon-btn" title="编辑" @click="openEdit(p)">
                  ✎
                </button>
                <button
                  class="icon-btn"
                  :title="p.enabled ? '停用' : '启用'"
                  @click="onToggleEnabled(p)"
                >
                  {{ p.enabled ? '◼' : '▶' }}
                </button>
                <button class="icon-btn" title="删除" @click="onDelete(p)">
                  ✕
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="tfoot">
        <span class="info">共 {{ filteredProviders.length }} 条</span>
        <div class="spacer"></div>
        <div class="pager">
          <button disabled>‹</button>
          <button class="active">1</button>
          <button disabled>›</button>
        </div>
      </div>
    </div>

    <!-- ===== 添加 Provider 抽屉 ===== -->
    <div v-if="drawerOpen" class="drawer-mask" @click.self="drawerOpen = false">
      <div class="drawer">
        <div class="drawer-head">
          <h3>添加 Provider</h3>
          <button class="close" @click="drawerOpen = false">
            <X :size="16" />
          </button>
        </div>
        <div class="drawer-body">
          <!-- 分步指示 -->
          <div class="stepper">
            <div class="step" :class="{ active: step === 1, done: step > 1 }">
              <span class="n">{{ step > 1 ? '✓' : '1' }}</span>
              <span class="label">类型</span>
            </div>
            <div class="step-line" :class="{ done: step > 1 }"></div>
            <div class="step" :class="{ active: step === 2, done: step > 2 }">
              <span class="n">{{ step > 2 ? '✓' : '2' }}</span>
              <span class="label">配置</span>
            </div>
            <div class="step-line" :class="{ done: step > 2 }"></div>
            <div class="step" :class="{ active: step === 3 }">
              <span class="n">3</span>
              <span class="label">模型</span>
            </div>
          </div>

          <!-- Step 1: 类型 -->
          <div v-if="step === 1" class="step-body">
            <div class="provider-types">
              <button
                class="type-card"
                :class="{ active: providerKind === 'builtin' }"
                @click="providerKind = 'builtin'"
              >
                <div class="type-title">内置提供方</div>
                <div class="type-desc">
                  从 50+ 主流供应商目录选择,如 OpenAI、Anthropic、阿里云百炼
                </div>
              </button>
              <button
                class="type-card"
                :class="{ active: providerKind === 'custom' }"
                @click="providerKind = 'custom'"
              >
                <div class="type-title">自定义提供方</div>
                <div class="type-desc">
                  接入自有中转 / 代理网关,自定义协议与地址
                </div>
              </button>
            </div>
          </div>

          <!-- Step 2: 配置 -->
          <div v-else-if="step === 2" class="step-body">
            <template v-if="providerKind === 'builtin'">
              <div class="field">
                <div class="field-label">提供方 <span class="req">*</span></div>
                <select
                  v-model="builtinForm.code"
                  class="select"
                  @change="onBuiltinSelect(builtinForm.code)"
                >
                  <option value="" disabled>选择主流提供商</option>
                  <option
                    v-for="b in builtinAvailable"
                    :key="b.code"
                    :value="b.code"
                  >
                    {{ b.displayName }}
                  </option>
                </select>
                <div v-if="builtinAvailable.length === 0" class="field-hint">
                  内置目录为空(可能已全部添加)
                </div>
              </div>
              <div class="field">
                <div class="field-label">API 密钥</div>
                <input
                  v-model="builtinForm.apiKey"
                  class="input"
                  type="password"
                  placeholder="输入 API 密钥,或留空走环境认证"
                />
                <div class="field-hint">密钥加密落库,前端不回显</div>
              </div>
              <button
                class="btn btn--ghost btn--sm"
                @click="builtinForm.advancedOpen = !builtinForm.advancedOpen"
              >
                {{ builtinForm.advancedOpen ? '收起' : '展开' }} 高级设置
              </button>
              <div v-if="builtinForm.advancedOpen" class="advanced-panel">
                <div class="field">
                  <div class="field-label">API 地址</div>
                  <input
                    v-model="builtinForm.baseUrl"
                    class="input"
                    placeholder="提供方默认"
                  />
                </div>
                <div class="field-row">
                  <div class="field">
                    <div class="field-label">优先级</div>
                    <input
                      v-model.number="builtinForm.priority"
                      class="input"
                      type="number"
                    />
                  </div>
                  <div class="field">
                    <div class="field-label">权重</div>
                    <input
                      v-model.number="builtinForm.weight"
                      class="input"
                      type="number"
                    />
                  </div>
                  <div class="field">
                    <div class="field-label">超时(秒)</div>
                    <input
                      v-model.number="builtinForm.timeoutSeconds"
                      class="input"
                      type="number"
                    />
                  </div>
                </div>
                <div class="field">
                  <div class="field-label">描述</div>
                  <input
                    v-model="builtinForm.description"
                    class="input"
                    placeholder="可选"
                  />
                </div>
              </div>
            </template>

            <template v-else>
              <div class="field">
                <div class="field-label">
                  Provider ID <span class="req">*</span>
                </div>
                <input
                  v-model="customForm.code"
                  class="input"
                  placeholder="acme-gateway"
                />
                <div class="field-hint">
                  小写字母开头,在请求中唯一标识该提供方
                </div>
              </div>
              <div class="field">
                <div class="field-label">
                  显示名称 <span class="req">*</span>
                </div>
                <input
                  v-model="customForm.name"
                  class="input"
                  placeholder="我的中转网关"
                />
              </div>
              <div class="field">
                <div class="field-label">API 地址</div>
                <input
                  v-model="customForm.baseUrl"
                  class="input"
                  placeholder="https://gateway.example.com/v1"
                />
              </div>
              <div class="field">
                <div class="field-label">
                  API 协议 <span class="req">*</span>
                </div>
                <select v-model="customForm.protocol" class="select">
                  <option
                    v-for="pr in PROTOCOLS"
                    :key="pr.value"
                    :value="pr.value"
                  >
                    {{ pr.label }}
                  </option>
                </select>
              </div>
              <div class="field">
                <div class="field-label">API 密钥</div>
                <input
                  v-model="customForm.apiKey"
                  class="input"
                  type="password"
                  placeholder="输入 API 密钥"
                />
              </div>
              <button
                class="btn btn--ghost btn--sm"
                @click="customForm.advancedOpen = !customForm.advancedOpen"
              >
                {{ customForm.advancedOpen ? '收起' : '展开' }} 高级设置
              </button>
              <div v-if="customForm.advancedOpen" class="advanced-panel">
                <div class="field-row">
                  <div class="field">
                    <div class="field-label">优先级</div>
                    <input
                      v-model.number="customForm.priority"
                      class="input"
                      type="number"
                    />
                  </div>
                  <div class="field">
                    <div class="field-label">权重</div>
                    <input
                      v-model.number="customForm.weight"
                      class="input"
                      type="number"
                    />
                  </div>
                  <div class="field">
                    <div class="field-label">超时(秒)</div>
                    <input
                      v-model.number="customForm.timeoutSeconds"
                      class="input"
                      type="number"
                    />
                  </div>
                </div>
                <div class="field">
                  <div class="field-label">描述</div>
                  <input
                    v-model="customForm.description"
                    class="input"
                    placeholder="可选"
                  />
                </div>
              </div>
            </template>
          </div>

          <!-- Step 3: 模型目录 -->
          <div v-else-if="step === 3" class="step-body">
            <div class="model-list-head">
              <span>模型目录</span>
              <button class="btn btn--ghost btn--sm" @click="addModelRow">
                + 添加模型
              </button>
            </div>
            <div class="field-hint" style="margin-bottom: 10px">
              模型选择器中将不显示任何模型;目录外 ID 仍可直接发送。
            </div>
            <div
              v-for="(m, idx) in (providerKind === 'builtin'
                ? builtinForm
                : customForm
              ).models"
              :key="idx"
              class="model-row"
            >
              <input
                v-model="m.modelName"
                class="input"
                placeholder="模型 ID(如 gpt-image-2)"
              />
              <input
                v-model="m.displayName"
                class="input"
                placeholder="显示名称(可选)"
              />
              <button
                class="icon-btn"
                title="删除"
                @click="removeModelRow(idx)"
              >
                ✕
              </button>
            </div>
            <div
              v-if="
                (providerKind === 'builtin' ? builtinForm : customForm).models
                  .length === 0
              "
              class="field-hint"
            >
              暂无模型 —— 留空则使用提供方默认模型目录
            </div>
          </div>
        </div>
        <div class="drawer-foot">
          <button v-if="step > 1" class="btn" @click="step -= 1">上一步</button>
          <div class="spacer"></div>
          <button class="btn" @click="drawerOpen = false">取消</button>
          <button
            v-if="step < 3"
            class="btn btn--primary"
            :disabled="nextDisabled"
            @click="step += 1"
          >
            下一步
          </button>
          <button
            v-else
            class="btn btn--primary"
            :disabled="saving"
            @click="saveProvider"
          >
            {{ saving ? '保存中…' : '创建 Provider' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 编辑抽屉 ===== -->
    <div v-if="editOpen" class="drawer-mask" @click.self="editOpen = false">
      <div class="drawer">
        <div class="drawer-head">
          <h3>编辑 Provider</h3>
          <button class="close" @click="editOpen = false">
            <X :size="16" />
          </button>
        </div>
        <div class="drawer-body">
          <div class="field">
            <div class="field-label">显示名称 <span class="req">*</span></div>
            <input v-model="editForm.name" class="input" />
          </div>
          <div class="field">
            <div class="field-label">API 地址</div>
            <input
              v-model="editForm.baseUrl"
              class="input"
              placeholder="https://…"
            />
          </div>
          <div class="field">
            <div class="field-label">API 密钥(留空不修改)</div>
            <input
              v-model="editForm.apiKey"
              class="input"
              type="password"
              placeholder="修改时输入新密钥"
            />
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">优先级</div>
              <input
                v-model.number="editForm.priority"
                class="input"
                type="number"
              />
            </div>
            <div class="field">
              <div class="field-label">权重</div>
              <input
                v-model.number="editForm.weight"
                class="input"
                type="number"
              />
            </div>
            <div class="field">
              <div class="field-label">超时(秒)</div>
              <input
                v-model.number="editForm.timeoutSeconds"
                class="input"
                type="number"
              />
            </div>
          </div>
          <div class="field">
            <div class="field-label">描述</div>
            <input
              v-model="editForm.description"
              class="input"
              placeholder="可选"
            />
          </div>
        </div>
        <div class="drawer-foot">
          <div class="spacer"></div>
          <button class="btn" @click="editOpen = false">取消</button>
          <button class="btn btn--primary" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>

    <!-- ===== 模型管理抽屉 ===== -->
    <div v-if="modelsOpen" class="drawer-mask" @click.self="modelsOpen = false">
      <div class="drawer">
        <div class="drawer-head">
          <h3>模型管理 — {{ currentProvider?.name }}</h3>
          <button class="close" @click="modelsOpen = false">
            <X :size="16" />
          </button>
        </div>
        <div class="drawer-body">
          <div class="model-list-head">
            <span>已配置 {{ providerModels.length }} 个模型</span>
            <button class="btn btn--ghost btn--sm" @click="openAddModel">
              + 添加模型
            </button>
          </div>
          <div v-if="modelsLoading" class="field-hint">加载中…</div>
          <div v-else-if="providerModels.length === 0" class="field-hint">
            还没有配置模型 —— 点击「添加模型」录入
          </div>
          <div
            v-for="m in providerModels"
            v-else
            :key="m.id"
            class="model-card"
          >
            <div class="model-card-head">
              <span class="model-name">{{ m.displayName || m.modelName }}</span>
              <span v-if="m.displayName" class="model-id">{{
                m.modelName
              }}</span>
              <div class="spacer"></div>
              <button
                class="chip"
                :class="{ active: m.enabled }"
                @click="onModelEnabled(m, !m.enabled)"
              >
                {{ m.enabled ? '已启用' : '已停用' }}
              </button>
            </div>
            <div class="model-card-meta">
              <span>上下文 {{ m.contextWindow ?? '—' }}</span>
              <span>输出 {{ m.maxOutputTokens ?? '—' }} tokens</span>
              <span>单次 ¥{{ m.pricePerCall ?? 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 添加模型弹层 ===== -->
    <div
      v-if="newModelOpen"
      class="drawer-mask"
      @click.self="newModelOpen = false"
    >
      <div class="drawer drawer--sm">
        <div class="drawer-head">
          <h3>添加模型</h3>
          <button class="close" @click="newModelOpen = false">
            <X :size="16" />
          </button>
        </div>
        <div class="drawer-body">
          <div class="field">
            <div class="field-label">模型 ID <span class="req">*</span></div>
            <input
              v-model="modelForm.modelName"
              class="input"
              placeholder="如 gpt-image-2"
            />
          </div>
          <div class="field">
            <div class="field-label">显示名称</div>
            <input
              v-model="modelForm.displayName"
              class="input"
              placeholder="可选"
            />
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">上下文窗口</div>
              <input
                v-model.number="modelForm.contextWindow"
                class="input"
                type="number"
                placeholder="256K"
              />
            </div>
            <div class="field">
              <div class="field-label">最大输出 token</div>
              <input
                v-model.number="modelForm.maxOutputTokens"
                class="input"
                type="number"
                placeholder="32K"
              />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <div class="field-label">单次最大张数</div>
              <input
                v-model.number="modelForm.maxImagesPerRequest"
                class="input"
                type="number"
                min="1"
              />
            </div>
            <div class="field">
              <div class="field-label">单次价格(¥)</div>
              <input
                v-model.number="modelForm.pricePerCall"
                class="input"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>
        <div class="drawer-foot">
          <div class="spacer"></div>
          <button class="btn" @click="newModelOpen = false">取消</button>
          <button
            class="btn btn--primary"
            :disabled="!modelForm.modelName"
            @click="saveModel"
          >
            添加
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 删除确认 ===== -->
    <div
      v-if="confirmOpen"
      class="drawer-mask"
      @click.self="confirmOpen = false"
    >
      <div class="drawer drawer--sm">
        <div class="drawer-head">
          <h3>删除 Provider</h3>
          <button class="close" @click="confirmOpen = false">
            <X :size="16" />
          </button>
        </div>
        <div class="drawer-body">
          <p class="confirm-text">
            确认删除「{{
              deletingProvider?.name
            }}」?该操作不可恢复,其下模型将一并移除。
          </p>
        </div>
        <div class="drawer-foot">
          <div class="spacer"></div>
          <button class="btn" @click="confirmOpen = false">取消</button>
          <button class="btn btn--danger" @click="doDelete">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* =========================================================
   模型管理页(布局参照 admaster-model-management 静态稿,
   配色跟随 admin-demo 5 色系 tokens)
   ========================================================= */
.models-page {
  min-height: 100%;
  font-family: var(--font-body);
}

/* ---- 页头 ---- */
.page-head {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-head .left {
  flex: 1;
}

.page-head .title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-1);
  letter-spacing: -0.2px;
}

.page-head .subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-2);
}

.page-head .right {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ---- 按钮 ---- */
.btn {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1);
  cursor: pointer;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--r-md);
  transition:
    background 0.12s,
    border-color 0.12s,
    transform 0.05s;
}

.btn:hover {
  background: var(--color-surface-3);
  border-color: var(--color-border-strong);
}

.btn:active {
  transform: translateY(0.5px);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn--primary {
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-color: transparent;
}

.btn--primary:hover {
  background: var(--color-accent-hover);
}

.btn--ghost {
  color: var(--color-text-2);
  background: transparent;
  border-color: transparent;
}

.btn--ghost:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.btn--sm {
  height: 28px;
  padding: 0 10px;
  font-size: 12.5px;
}

.btn--danger {
  color: #fff;
  background: var(--color-error);
  border-color: transparent;
}

.btn--danger:hover {
  filter: brightness(1.08);
}

.btn-plus {
  font-size: 15px;
  line-height: 1;
}

/* ---- 指标卡 ---- */
.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.metric {
  position: relative;
  padding: 14px 16px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

.metric-label {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--color-text-2);
}

.metric-value {
  display: flex;
  gap: 6px;
  align-items: baseline;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-1);
  letter-spacing: -0.3px;
}

.metric-value .unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-3);
}

.metric-sub {
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--color-text-3);
}

.metric-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-ok {
  background: var(--color-success);
  box-shadow: 0 0 0 4px var(--color-accent-soft);
}

.dot-warn {
  background: var(--color-warning);
  box-shadow: 0 0 0 4px var(--color-accent-soft);
}

.dot-idle {
  background: var(--color-text-3);
  box-shadow: 0 0 0 4px var(--color-border);
}

/* ---- 工具栏 ---- */
.toolbar {
  display: flex;
  align-items: stretch;
  padding: 0 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
}

.tabs {
  display: flex;
  gap: 2px;
}

.tab {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 12px 14px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-2);
  cursor: pointer;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0;
  transition:
    color 0.12s,
    border-color 0.12s;
}

.tab:hover {
  color: var(--color-text-1);
}

.tab.active {
  color: var(--color-text-1);
  border-bottom-color: var(--color-accent);
}

.tab .badge {
  padding: 1px 6px;
  font-size: 11px;
  color: var(--color-text-3);
  background: var(--color-surface-3);
  border-radius: 999px;
}

.tab.active .badge {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  margin-left: auto;
}

.input-wrap {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 0 10px;
  color: var(--color-text-3);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  transition: border-color 0.12s;
}

.input-wrap:focus-within {
  border-color: var(--color-accent);
}

.input-wrap svg {
  flex-shrink: 0;
}

.input--search {
  min-width: 200px;
  padding: 7px 0;
  background: transparent;
  border: none;
}

.input--search:focus {
  outline: none;
}

/* ---- 筛选条 ---- */
.filterbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  border-left: 1px solid var(--color-border);
}

.filterbar .spacer {
  flex: 1;
}

.filter-count {
  font-size: 11.5px;
  color: var(--color-text-3);
}

.chip {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  font-family: inherit;
  font-size: 11.5px;
  color: var(--color-text-2);
  cursor: pointer;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  transition:
    background 0.12s,
    color 0.12s,
    border-color 0.12s;
}

.chip:hover {
  color: var(--color-text-1);
  background: var(--color-surface-3);
}

.chip.active {
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-color: var(--color-border-strong);
}

/* ---- 表格 ---- */
.table-wrap {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-top: 0;
  border-radius: 0 0 var(--r-lg) var(--r-lg);
}

table.t {
  width: 100%;
  border-collapse: collapse;
}

.t thead th {
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-3);
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  user-select: none;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.t thead th.sortable {
  cursor: pointer;
}

.t tbody td {
  padding: 10px 12px;
  font-size: 13px;
  vertical-align: middle;
  color: var(--color-text-1);
  border-bottom: 1px solid var(--color-border);
}

.t tbody tr {
  transition: background 0.08s;
}

.t tbody tr:hover {
  background: var(--color-surface-2);
}

.t tbody tr:last-child td {
  border-bottom: 0;
}

.empty-cell {
  padding: 40px 12px !important;
  color: var(--color-text-3);
  text-align: center;
}

/* provider cell */
.provider-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.provider-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
  background: var(--color-surface-3);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.pi-openai {
  background: linear-gradient(140deg, #10a37f, #0e8c6c);
}

.pi-anthropic {
  background: linear-gradient(140deg, #d97757, #b85a3c);
}

.pi-gemini {
  background: linear-gradient(140deg, #4285f4, #1a73e8);
}

.pi-deepseek {
  background: linear-gradient(140deg, #4f8fd6, #2a5d9f);
}

.pi-qwen {
  background: linear-gradient(140deg, #7c5cff, #5a3cd9);
}

.pi-mistral {
  background: linear-gradient(140deg, #ffb800, #e08a00);
}

.pi-ollama {
  background: linear-gradient(140deg, #2c2c2c, #1a1a1a);
  border-color: rgb(255 255 255 / 18%);
}

.pi-custom {
  background: linear-gradient(140deg, #555, #333);
}

.pi-icon-text {
  color: #fff;
}

.provider-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.provider-name {
  display: flex;
  gap: 6px;
  align-items: center;
  font-weight: 500;
  color: var(--color-text-1);
}

.provider-desc {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11.5px;
  color: var(--color-text-3);
  white-space: nowrap;
}

.mono {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-2);
}

.mono.url {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.badge {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface-3);
  border: 1px solid var(--color-border);
  border-radius: 999px;
}

.b-ok {
  color: var(--color-success);
  background: var(--color-accent-soft);
  border-color: var(--color-border-strong);
}

.b-info {
  color: var(--color-info);
  background: var(--color-ai-soft);
  border-color: var(--color-border-strong);
}

.b-neutral {
  color: var(--color-text-2);
}

.health {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.health .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.health .label {
  font-size: 12px;
  color: var(--color-text-2);
}

.row-actions {
  display: inline-flex;
  gap: 2px;
  align-items: center;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 13px;
  color: var(--color-text-2);
  cursor: pointer;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  transition:
    background 0.12s,
    color 0.12s;
}

.icon-btn:hover {
  color: var(--color-text-1);
  background: var(--color-surface-3);
}

.tfoot {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-top: 1px solid var(--color-border);
}

.tfoot .info {
  font-size: 12px;
  color: var(--color-text-3);
}

.tfoot .spacer {
  flex: 1;
}

.pager {
  display: inline-flex;
  gap: 2px;
  align-items: center;
}

.pager button {
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--color-text-2);
  cursor: pointer;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
}

.pager button:hover {
  color: var(--color-text-1);
  background: var(--color-surface-3);
}

.pager button.active {
  color: var(--color-text-1);
  background: var(--color-surface-3);
  border-color: var(--color-border);
}

.pager button:disabled {
  color: var(--color-text-3);
  cursor: not-allowed;
}

/* ---- 表单控件 ---- */
.input {
  box-sizing: border-box;
  width: 100%;
  padding: 7px 10px;
  font-family: inherit;
  font-size: 13px;
  color: var(--color-text-1);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  transition: border-color 0.12s;
}

.input::placeholder {
  color: var(--color-text-3);
}

.input:focus {
  outline: 0;
  border-color: var(--color-accent);
}

.select {
  box-sizing: border-box;
  width: 100%;
  padding: 7px 10px;
  font-family: inherit;
  font-size: 13px;
  color: var(--color-text-1);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
}

.select:focus {
  outline: 0;
  border-color: var(--color-accent);
}

/* ---- 抽屉 ---- */
.drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  background: rgb(6 8 12 / 66%);
}

.drawer {
  display: flex;
  flex-direction: column;
  width: 560px;
  max-width: 92vw;
  height: 100%;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  animation: drawer-in 0.22s var(--ease-out-expo);
}

.drawer--sm {
  width: 420px;
}

@keyframes drawer-in {
  from {
    opacity: 0.6;
    transform: translateX(24px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.drawer-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-1);
}

.close {
  display: flex;
  padding: 6px;
  color: var(--color-text-3);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: var(--r-md);
}

.close:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.drawer-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.drawer-foot {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 20px;
  border-top: 1px solid var(--color-border);
}

.drawer-foot .spacer {
  flex: 1;
}

/* ---- 分步 ---- */
.stepper {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 22px;
}

.step {
  display: flex;
  gap: 8px;
  align-items: center;
}

.step .n {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-3);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 50%;
}

.step.active .n {
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-color: transparent;
}

.step.done .n {
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-color: transparent;
}

.step .label {
  font-size: 12.5px;
  color: var(--color-text-3);
}

.step.active .label {
  font-weight: 500;
  color: var(--color-text-1);
}

.step-line {
  flex: 1;
  min-width: 24px;
  height: 1px;
  background: var(--color-border);
}

.step-line.done {
  background: var(--color-accent);
}

/* ---- 表单字段 ---- */
.field {
  margin-bottom: 14px;
}

.field-label {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-2);
}

.field-label .req {
  color: var(--color-error);
}

.field-hint {
  margin-top: 5px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--color-text-3);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.advanced-panel {
  padding: 14px;
  margin-top: 10px;
  border: 1px dashed var(--color-border);
  border-radius: var(--r-md);
}

.step-body {
  min-height: 280px;
}

/* ---- 类型卡片 ---- */
.provider-types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.type-card {
  padding: 18px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  background: var(--color-surface-2);
  border: 1.5px solid var(--color-border);
  border-radius: var(--r-lg);
  transition:
    border-color 0.12s,
    background 0.12s;
}

.type-card:hover {
  border-color: var(--color-border-strong);
}

.type-card.active {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
}

.type-title {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}

.type-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-2);
}

/* ---- 模型行 ---- */
.model-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1);
}

.model-row {
  display: grid;
  grid-template-columns: 1fr 1fr 28px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.model-card {
  padding: 12px 14px;
  margin-bottom: 10px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

.model-card-head {
  display: flex;
  gap: 8px;
  align-items: center;
}

.model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1);
}

.model-id {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--color-text-3);
}

.model-card-meta {
  display: flex;
  gap: 14px;
  margin-top: 8px;
  font-size: 11.5px;
  color: var(--color-text-3);
}

.confirm-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-2);
}

@media (max-width: 900px) {
  .metrics {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
