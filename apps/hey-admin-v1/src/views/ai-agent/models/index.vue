<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { useAiAgentApi, type ProviderDto, type ModelDto, type CreateModelInputDto } from '#/api/ai-agent';

const api = useAiAgentApi();

const providers = ref<ProviderDto[]>([]);
const loading = ref(false);
const builtinAvailable = ref<{ code: string; displayName: string; defaultBaseUrl?: string | null; defaultProtocol: string }[]>([]);

// ---- 筛选 ----
const filterStatus = ref<'all' | 'enabled' | 'disabled'>('all');
const filterType = ref<'all' | 'builtin' | 'custom'>('all');
const filterProtocol = ref<string>('all');
const filterKeyword = ref<string>('');

const protocolOptions = computed(() => {
  const set = new Set<string>();
  providers.value.forEach(p => set.add(p.protocol));
  return [
    { value: 'all', label: '全部' },
    ...Array.from(set).map(v => ({ value: v, label: v })),
  ];
});

const filteredProviders = computed(() => {
  return providers.value.filter(p => {
    if (filterStatus.value === 'enabled' && !p.enabled) return false;
    if (filterStatus.value === 'disabled' && p.enabled) return false;
    if (filterType.value === 'builtin' && p.type !== 0) return false;
    if (filterType.value === 'custom' && p.type !== 1) return false;
    if (filterProtocol.value !== 'all' && p.protocol !== filterProtocol.value) return false;
    if (filterKeyword.value && !p.name.toLowerCase().includes(filterKeyword.value.toLowerCase())) return false;
    return true;
  });
});

const enabledCount = computed(() => providers.value.filter(p => p.enabled).length);

// ---- 编辑 Provider ----
const editModalOpen = ref(false);
const editingProvider = ref<null | ProviderDto>(null);
const providerForm = reactive({
  name: '',
  baseUrl: '',
  apiKey: '',
  priority: 100,
  weight: 1,
  timeoutSeconds: 300,
  description: '',
});

// ---- 添加 Provider(内置)----
const addBuiltinOpen = ref(false);
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
// a-collapse v-model 必须是成员表达式,不能绑三元 → 独立 ref + @change 同步 advancedOpen
const builtinAdvancedKeys = ref<string[]>([]);

// ---- 添加 Provider(自定义)----
const addCustomOpen = ref(false);
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
  models: [] as CreateModelInputDto[],
});

const PROTOCOLS = [
  { value: 'openai-completions', label: 'openai-completions' },
  { value: 'openai-responses', label: 'openai-responses' },
  { value: 'openai-images', label: 'openai-images' },
  { value: 'anthropic-messages', label: 'anthropic-messages' },
];

// ---- 模型管理(单 Provider)----
const modelsOpen = ref(false);
const currentProvider = ref<null | ProviderDto>(null);
const providerModels = ref<ModelDto[]>([]);
const modelsLoading = ref(false);

const newModelOpen = reactive({ open: false, providerId: null as string | null });
const modelForm = reactive<CreateModelInputDto>({
  modelName: '',
  displayName: '',
  contextWindow: undefined,
  maxOutputTokens: undefined,
  capabilityIds: '',
  maxImagesPerRequest: 4,
  enabled: true,
  pricePerCall: 0,
});

async function loadProviders() {
  loading.value = true;
  try {
    const res = await api.getProviders();
    providers.value = res.items ?? [];
  } finally {
    loading.value = false;
  }
}

async function loadBuiltinAvailable() {
  const res = await api.getAvailableBuiltinProviders();
  builtinAvailable.value = res.items ?? [];
}

onMounted(async () => {
  await loadProviders();
  await loadBuiltinAvailable();
});

async function onToggleEnabled(row: ProviderDto, checked: boolean) {
  await api.setProviderEnabled(row.id, checked);
  message.success(checked ? '已启用' : '已停用');
  await loadProviders();
}

async function onDelete(row: ProviderDto) {
  Modal.confirm({
    title: '删除提供方',
    content: `确认删除「${row.name}」？该操作不可恢复。`,
    okType: 'danger',
    async onOk() {
      await api.deleteProvider(row.id);
      message.success('已删除');
      await loadProviders();
      await loadBuiltinAvailable();
    },
  });
}

function openEdit(row: ProviderDto) {
  editingProvider.value = row;
  providerForm.name = row.name;
  providerForm.baseUrl = row.baseUrl ?? '';
  providerForm.apiKey = '';
  providerForm.priority = row.priority;
  providerForm.weight = row.weight;
  providerForm.timeoutSeconds = row.timeoutSeconds;
  providerForm.description = row.description ?? '';
  editModalOpen.value = true;
}

async function saveEdit() {
  if (!editingProvider.value) return;
  await api.updateProvider(editingProvider.value.id, {
    name: providerForm.name,
    baseUrl: providerForm.baseUrl,
    enabled: providers.value.find(p => p.id === editingProvider.value!.id)!.enabled,
    priority: providerForm.priority,
    weight: providerForm.weight,
    timeoutSeconds: providerForm.timeoutSeconds,
    description: providerForm.description,
    apiKey: providerForm.apiKey || null,
  });
  message.success('已保存');
  editModalOpen.value = false;
  await loadProviders();
}

function openAddBuiltin() {
  builtinForm.code = '';
  builtinForm.apiKey = '';
  builtinForm.baseUrl = '';
  builtinForm.priority = 100;
  builtinForm.weight = 1;
  builtinForm.timeoutSeconds = 300;
  builtinForm.description = '';
  builtinForm.advancedOpen = false;
  builtinAdvancedKeys.value = [];
  builtinForm.models = [];
  addBuiltinOpen.value = true;
}

function onBuiltinSelect(code: string) {
  builtinForm.code = code;
  const found = builtinAvailable.value.find(b => b.code === code);
  if (found?.defaultBaseUrl) {
    builtinForm.baseUrl = found.defaultBaseUrl;
  }
}

function addBuiltinModelRow() {
  builtinForm.models.push({
    modelName: '',
    displayName: '',
    contextWindow: undefined,
    maxOutputTokens: undefined,
    capabilityIds: '',
    maxImagesPerRequest: 4,
    enabled: true,
    pricePerCall: 0,
  });
}

function removeBuiltinModelRow(idx: number) {
  builtinForm.models.splice(idx, 1);
}

async function saveBuiltin() {
  if (!builtinForm.code) {
    message.error('请选择提供方');
    return;
  }
  const validModels = builtinForm.models.filter(m => m.modelName.trim());
  await api.createBuiltinProvider({
    code: builtinForm.code,
    apiKey: builtinForm.apiKey || null,
    baseUrl: builtinForm.baseUrl || null,
    priority: builtinForm.priority,
    weight: builtinForm.weight,
    timeoutSeconds: builtinForm.timeoutSeconds,
    description: builtinForm.description || null,
    models: validModels,
  });
  message.success('已添加提供方');
  addBuiltinOpen.value = false;
  await loadProviders();
  await loadBuiltinAvailable();
}

function openAddCustom() {
  customForm.code = '';
  customForm.name = '';
  customForm.baseUrl = '';
  customForm.protocol = 'openai-completions';
  customForm.apiKey = '';
  customForm.priority = 100;
  customForm.weight = 1;
  customForm.timeoutSeconds = 300;
  customForm.description = '';
  customForm.models = [];
  addCustomOpen.value = true;
}

function addCustomModelRow() {
  customForm.models.push({
    modelName: '',
    displayName: '',
    contextWindow: undefined,
    maxOutputTokens: undefined,
    capabilityIds: '',
    maxImagesPerRequest: 4,
    enabled: true,
    pricePerCall: 0,
  });
}

function removeCustomModelRow(idx: number) {
  customForm.models.splice(idx, 1);
}

async function saveCustom() {
  if (!/^[a-z][a-z0-9_-]{1,63}$/i.test(customForm.code)) {
    message.error('Provider ID 必须以字母开头，仅含字母数字与短横线/下划线');
    return;
  }
  const validModels = customForm.models.filter(m => m.modelName.trim());
  await api.createCustomProvider({
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
  message.success('已创建提供方');
  addCustomOpen.value = false;
  await loadProviders();
  await loadBuiltinAvailable();
}

async function openModels(row: ProviderDto) {
  currentProvider.value = row;
  modelsOpen.value = true;
  await loadModels(row.id);
}

async function loadModels(providerId: string) {
  modelsLoading.value = true;
  try {
    const res = await api.getProviderModels(providerId);
    providerModels.value = res.items ?? [];
  } finally {
    modelsLoading.value = false;
  }
}

function openAddModel(providerId: string) {
  newModelOpen.providerId = providerId;
  newModelOpen.open = true;
  modelForm.modelName = '';
  modelForm.displayName = '';
  modelForm.contextWindow = undefined;
  modelForm.maxOutputTokens = undefined;
  modelForm.capabilityIds = '';
  modelForm.maxImagesPerRequest = 4;
  modelForm.enabled = true;
  modelForm.pricePerCall = 0;
}

async function saveModel() {
  if (!modelForm.modelName.trim()) {
    message.error('模型 ID 不能为空');
    return;
  }
  if (!newModelOpen.providerId) return;
  await api.addProviderModel(newModelOpen.providerId, { ...modelForm });
  message.success('已添加模型');
  newModelOpen.open = false;
  await loadModels(newModelOpen.providerId);
  await loadProviders();
}

async function onModelEnabled(m: ModelDto, checked: boolean) {
  if (!currentProvider.value) return;
  await api.setProviderModelEnabled(currentProvider.value.id, m.id, checked);
  message.success(checked ? '已启用' : '已停用');
  await loadModels(currentProvider.value.id);
}

async function onDeleteModel(m: ModelDto) {
  if (!currentProvider.value) return;
  Modal.confirm({
    title: '删除模型',
    content: `确认删除「${m.modelName}」？`,
    okType: 'danger',
    async onOk() {
      await api.deleteProviderModel(currentProvider.value!.id, m.id);
      message.success('已删除');
      await loadModels(currentProvider.value!.id);
      await loadProviders();
    },
  });
}

// 提供方卡片首字母
function avatarLetter(name: string) {
  return (name || '?').trim().charAt(0).toUpperCase();
}
function avatarColor(name: string): { bg: string; fg: string } {
  // 基于 name 哈希到 4 个调色板之一,内置 4 种:teal/coral/purple/blue
  const palette: { bg: string; fg: string }[] = [
    { bg: 'rgba(16,163,127,0.18)', fg: '#5DCAA5' },
    { bg: 'rgba(255,99,71,0.18)', fg: '#F0997B' },
    { bg: 'rgba(127,119,221,0.20)', fg: '#AFA9EC' },
    { bg: 'rgba(58,124,165,0.20)', fg: '#85B7EB' },
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length]!;
}
</script>

<template>
  <div class="models-page px-6 py-5">
    <!-- 顶部统计 + 操作 -->
    <header class="page-header">
      <div class="title-area">
        <h1>模型管理</h1>
        <p>管理 AI 模型的上游供应商,系统会按能力自动选用合适的模型。</p>
      </div>
      <div class="header-actions">
        <div class="stat-badge">
          <div class="stat-item">
            <span class="stat-dot on" />
            <span class="stat-lbl">已启用</span>
            <span class="stat-val">{{ enabledCount }}</span>
          </div>
          <span class="stat-sep" />
          <div class="stat-item">
            <span class="stat-lbl">共</span>
            <span class="stat-val">{{ providers.length }}</span>
          </div>
        </div>
        <a-button @click="openAddCustom">+ 添加自定义</a-button>
        <a-button type="primary" @click="openAddBuiltin">+ 添加提供方</a-button>
      </div>
    </header>

    <!-- 筛选条(有数据时显示) -->
    <div v-if="providers.length > 0" class="filter-bar">
      <a-segmented
        v-model:value="filterStatus"
        :options="[
          { value: 'all', label: `全部 ${providers.length}` },
          { value: 'enabled', label: `启用 ${enabledCount}` },
          { value: 'disabled', label: `禁用 ${providers.length - enabledCount}` },
        ]"
        class="status-segmented"
      />
      <a-select v-model:value="filterType" :options="[
        { value: 'all', label: '类型: 全部' },
        { value: 'builtin', label: '内置' },
        { value: 'custom', label: '自定义' },
      ]" style="width: 130px" />
      <a-select v-model:value="filterProtocol" :options="protocolOptions" style="width: 180px">
        <template #default="{ value: val }">
          {{ val === 'all' ? '协议: 全部' : `协议: ${val}` }}
        </template>
      </a-select>
      <div class="flex-1" />
      <a-input
        v-model:value="filterKeyword"
        placeholder="搜索提供方名称"
        allow-clear
        style="width: 200px"
      >
        <template #prefix>
          <span class="text-gray-400 text-xs">⌕</span>
        </template>
      </a-input>
    </div>

    <!-- 主体 -->
    <main class="content">
      <!-- 有数据:提供方网格 -->
      <div v-if="filteredProviders.length > 0" class="provider-grid">
        <div
          v-for="item in filteredProviders"
          :key="item.id"
          class="provider-card"
          :class="{ 'is-disabled': !item.enabled }"
        >
          <div class="card-head">
            <div
              class="avatar"
              :style="{ background: avatarColor(item.name).bg, color: avatarColor(item.name).fg }"
            >
              {{ avatarLetter(item.name) }}
            </div>
            <div class="meta">
              <div class="row1">
                <span class="name">{{ item.name }}</span>
                <span class="badge" :class="item.type === 1 ? 'badge-custom' : 'badge-builtin'">
                  {{ item.type === 1 ? 'CUSTOM' : 'BUILTIN' }}
                </span>
                <span class="badge badge-protocol">{{ item.protocol }}</span>
              </div>
              <p class="desc">
                {{ item.description || item.baseUrl || '暂无描述' }}
              </p>
            </div>
            <div class="card-head-right">
              <div class="status-pill" :class="item.enabled ? 'on' : 'off'">
                <span class="pill-dot" />
                {{ item.enabled ? '已启用' : '已禁用' }}
              </div>
              <a-dropdown trigger="click">
                <a-button type="text" class="more-btn">⋯</a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="openEdit(item)">编辑</a-menu-item>
                    <a-menu-item @click="openModels(item)">查看模型</a-menu-item>
                    <a-menu-item @click="onToggleEnabled(item, !item.enabled)">
                      {{ item.enabled ? '停用' : '启用' }}
                    </a-menu-item>
                    <a-menu-divider v-if="item.type === 1" />
                    <a-menu-item v-if="item.type === 1" danger @click="onDelete(item)">删除</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>
          <div class="card-foot">
            <div class="meta-item">
              <span class="lbl">模型</span>
              <span class="val">{{ item.modelCount }}</span>
            </div>
            <div class="meta-item">
              <span class="lbl">优先级</span>
              <span class="val">{{ item.priority }}</span>
            </div>
            <div class="meta-item">
              <span class="lbl">权重</span>
              <span class="val">{{ item.weight }}</span>
            </div>
            <div class="flex-1" />
            <a-button size="small" class="view-models-btn" @click="openModels(item)">
              查看模型 →
            </a-button>
          </div>
        </div>

        <!-- 末尾"+"添加入口 -->
        <div
          v-if="builtinAvailable.length > 0"
          class="add-card"
          @click="openAddBuiltin"
        >
          <div class="add-icon">+</div>
          <p class="add-title">添加提供方</p>
          <p class="add-sub">从 50+ 内置目录选一个,或自建中转</p>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading" class="empty-state">
        <div class="empty-icon">
          <div class="icon-grid">
            <span /><span /><span /><span />
          </div>
        </div>
        <h2 class="empty-title">添加你的第一个提供方</h2>
        <p class="empty-desc">
          提供方是 AI 模型的上游供应商,例如 OpenAI、Anthropic、阿里云百炼。连接后,系统会按能力自动选用合适的模型,无需手动切换。
        </p>
        <div class="empty-steps">
          <div class="empty-step">
            <div class="step-num">1</div>
            <div class="step-title">选提供方</div>
            <div class="step-desc">OpenAI、Anthropic、阿里云百炼等 50+ 主流供应商,内置目录已就绪。</div>
          </div>
          <div class="empty-step">
            <div class="step-num">2</div>
            <div class="step-title">填 API 密钥</div>
            <div class="step-desc">密钥加密落库,前端不回显。也可留空走环境变量认证。</div>
          </div>
          <div class="empty-step">
            <div class="step-num">3</div>
            <div class="step-title">启用模型</div>
            <div class="step-desc">系统按能力自动选用,也可手动勾选要启用的模型。</div>
          </div>
        </div>
        <div class="empty-actions">
          <a-button
            type="primary"
            size="large"
            :disabled="builtinAvailable.length === 0"
            @click="openAddBuiltin"
          >
            + 添加内置提供方
          </a-button>
          <a-button size="large" @click="openAddCustom">
            或 添加自定义提供方(中转/代理) →
          </a-button>
        </div>
      </div>

      <!-- footer 高级说明(有数据时显示) -->
      <div v-if="providers.length > 0" class="advanced-tip">
        <span class="tip-dot" />
        <span>
          <span class="tip-title">高级说明</span>
          · 模型选择器中将不显示任何模型,但目录外 ID 仍可直接发送,适合临时调用新模型。
        </span>
      </div>
    </main>

    <!-- 编辑 Provider -->
    <a-modal v-model:open="editModalOpen" title="编辑提供方" @ok="saveEdit" :width="520">
      <a-form layout="vertical">
        <a-form-item label="显示名称"><a-input v-model:value="providerForm.name" /></a-form-item>
        <a-form-item label="API 地址"><a-input v-model:value="providerForm.baseUrl" placeholder="https://..." /></a-form-item>
        <a-form-item label="API 密钥(留空不修改)">
          <a-input-password v-model:value="providerForm.apiKey" placeholder="修改时输入新密钥" />
        </a-form-item>
        <div class="grid grid-cols-3 gap-3">
          <a-form-item label="优先级"><a-input-number v-model:value="providerForm.priority" :min="0" class="!w-full" /></a-form-item>
          <a-form-item label="权重"><a-input-number v-model:value="providerForm.weight" :min="1" class="!w-full" /></a-form-item>
          <a-form-item label="超时(秒)"><a-input-number v-model:value="providerForm.timeoutSeconds" :min="30" class="!w-full" /></a-form-item>
        </div>
        <a-form-item label="描述"><a-textarea v-model:value="providerForm.description" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 添加内置提供方 -->
    <a-modal v-model:open="addBuiltinOpen" title="添加提供方" :width="560" @ok="saveBuiltin" okText="保存">
      <a-form layout="vertical">
        <a-form-item label="提供方" required>
          <a-select
            v-model:value="builtinForm.code"
            placeholder="选择主流提供商"
            :options="builtinAvailable.map(b => ({ value: b.code, label: b.displayName }))"
            @change="onBuiltinSelect"
          />
        </a-form-item>
        <a-form-item label="API 密钥">
          <a-input-password v-model:value="builtinForm.apiKey" placeholder="输入 API 密钥，或留空使用环境认证" />
        </a-form-item>

        <a-divider class="!my-2" />
        <a-collapse
          v-model:active-key="builtinAdvancedKeys"
          ghost
          @change="(keys: string | string[]) => (builtinForm.advancedOpen = (Array.isArray(keys) ? keys : [keys]).includes('1'))"
        >
          <a-collapse-panel key="1" header="自定义设置">
            <a-form-item label="API 地址">
              <a-input v-model:value="builtinForm.baseUrl" placeholder="提供方默认" />
            </a-form-item>
            <div class="grid grid-cols-3 gap-3">
              <a-form-item label="优先级"><a-input-number v-model:value="builtinForm.priority" :min="0" class="!w-full" /></a-form-item>
              <a-form-item label="权重"><a-input-number v-model:value="builtinForm.weight" :min="1" class="!w-full" /></a-form-item>
              <a-form-item label="超时(秒)"><a-input-number v-model:value="builtinForm.timeoutSeconds" :min="30" class="!w-full" /></a-form-item>
            </div>
            <a-form-item label="描述"><a-textarea v-model:value="builtinForm.description" :rows="2" /></a-form-item>
          </a-collapse-panel>
        </a-collapse>

        <a-divider class="!my-2" />
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-500">模型目录</span>
          <span class="text-xs text-gray-400">正在使用适配器默认模型</span>
        </div>
        <div class="text-xs text-gray-400 mb-3 px-3 py-2 border border-dashed rounded">
          模型选择器中将不显示任何模型；目录外 ID 仍可直接发送。
        </div>
        <a-button size="small" @click="addBuiltinModelRow">添加模型</a-button>
        <div v-for="(m, idx) in builtinForm.models" :key="idx" class="border rounded p-3 mt-2">
          <div class="grid grid-cols-2 gap-2">
            <a-input v-model:value="m.modelName" placeholder="模型 ID" />
            <a-input v-model:value="m.displayName" placeholder="显示名称" />
          </div>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <a-input-number v-model:value="m.contextWindow" placeholder="上下文窗口" class="!w-full" />
            <a-input-number v-model:value="m.maxOutputTokens" placeholder="最大输出 token" class="!w-full" />
          </div>
          <div class="text-right mt-2">
            <a-button size="small" danger @click="removeBuiltinModelRow(idx)">删除</a-button>
          </div>
        </div>
      </a-form>
    </a-modal>

    <!-- 添加自定义提供方 -->
    <a-modal v-model:open="addCustomOpen" title="添加自定义提供方" :width="560" @ok="saveCustom" okText="创建提供方">
      <a-form layout="vertical">
        <a-form-item label="Provider ID" required>
          <a-input v-model:value="customForm.code" placeholder="acme-gateway" />
          <span class="text-xs text-gray-400">以小写字母开头的标识，在请求中唯一标识该提供方，并用于派生凭据名。</span>
        </a-form-item>
        <a-form-item label="显示名称" required><a-input v-model:value="customForm.name" /></a-form-item>
        <a-form-item label="API 地址"><a-input v-model:value="customForm.baseUrl" placeholder="https://gateway.example.com/v1" /></a-form-item>
        <a-form-item label="API 协议" required>
          <a-select v-model:value="customForm.protocol" :options="PROTOCOLS" />
        </a-form-item>
        <a-form-item label="API 密钥"><a-input-password v-model:value="customForm.apiKey" placeholder="输入 API 密钥" /></a-form-item>

        <a-divider class="!my-2" />
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-500">模型目录</span>
        </div>
        <div class="text-xs text-gray-400 mb-3 px-3 py-2 border border-dashed rounded">
          模型选择器中将不显示任何模型；目录外 ID 仍可直接发送。
        </div>
        <a-button size="small" @click="addCustomModelRow">添加模型</a-button>
        <div v-for="(m, idx) in customForm.models" :key="idx" class="border rounded p-3 mt-2">
          <div class="grid grid-cols-2 gap-2">
            <a-input v-model:value="m.modelName" placeholder="模型 ID" />
            <a-input v-model:value="m.displayName" placeholder="显示名称" />
          </div>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <a-input-number v-model:value="m.contextWindow" placeholder="上下文窗口" class="!w-full" />
            <a-input-number v-model:value="m.maxOutputTokens" placeholder="最大输出 token" class="!w-full" />
          </div>
          <div class="text-right mt-2">
            <a-button size="small" danger @click="removeCustomModelRow(idx)">删除</a-button>
          </div>
        </div>
      </a-form>
    </a-modal>

    <!-- 模型管理(单 Provider)抽屉 -->
    <a-drawer v-model:open="modelsOpen" :title="`模型管理 — ${currentProvider?.name ?? ''}`" :width="640" destroy-on-close @close="currentProvider = null">
      <div class="mb-3 flex items-center justify-between">
        <p class="text-sm text-gray-500 m-0">配置该提供方下的模型。系统按能力自动选用。</p>
        <a-button type="primary" @click="openAddModel(currentProvider?.id ?? '')">+ 添加模型</a-button>
      </div>
      <a-spin :spinning="modelsLoading">
        <a-empty v-if="!modelsLoading && providerModels.length === 0" description="还没有配置模型" />
        <div v-for="m in providerModels" :key="m.id" class="model-card">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-medium">{{ m.displayName || m.modelName }}</span>
              <span v-if="m.displayName" class="text-gray-400 text-sm ml-2">({{ m.modelName }})</span>
            </div>
            <a-switch :checked="m.enabled" @change="(c: boolean) => onModelEnabled(m, c)" />
          </div>
          <div class="text-xs text-gray-500 grid grid-cols-2 gap-2 mt-2">
            <div>上下文窗口: <span class="font-mono">{{ m.contextWindow ?? '—' }}</span></div>
            <div>最大输出 token: <span class="font-mono">{{ m.maxOutputTokens ?? '—' }}</span></div>
          </div>
          <div class="text-right mt-2">
            <a-button size="small" danger @click="onDeleteModel(m)">删除</a-button>
          </div>
        </div>
      </a-spin>
    </a-drawer>

    <!-- 添加模型弹窗 -->
    <a-modal v-model:open="newModelOpen.open" title="添加模型" @ok="saveModel" :width="520">
      <a-form layout="vertical">
        <a-form-item label="模型 ID" required><a-input v-model:value="modelForm.modelName" placeholder="如 gpt-image-2" /></a-form-item>
        <a-form-item label="显示名称"><a-input v-model:value="modelForm.displayName" placeholder="可选" /></a-form-item>
        <div class="grid grid-cols-2 gap-3">
          <a-form-item label="上下文窗口"><a-input-number v-model:value="modelForm.contextWindow" class="!w-full" placeholder="256K" /></a-form-item>
          <a-form-item label="最大输出 token"><a-input-number v-model:value="modelForm.maxOutputTokens" class="!w-full" placeholder="32K" /></a-form-item>
        </div>
        <a-form-item label="单次最大张数(生图能力用)"><a-input-number v-model:value="modelForm.maxImagesPerRequest" :min="1" class="!w-full" /></a-form-item>
        <a-form-item label="单次价格"><a-input-number v-model:value="modelForm.pricePerCall" :min="0" :precision="2" class="!w-full" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.models-page {
  max-width: 1280px;
  margin: 0 auto;
}

/* ---- 页头 ---- */
.page-header {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 20px;
}
.title-area h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: var(--color-text-primary, #fff);
}
.title-area p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--color-text-secondary, #999);
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.stat-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 14px;
  background: var(--color-background-secondary, #15161A);
  border: 0.5px solid var(--color-border-tertiary, rgba(255,255,255,0.08));
  border-radius: 8px;
  margin-right: 4px;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary, #999);
}
.stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.stat-dot.on {
  background: #1D9E75;
  box-shadow: 0 0 6px rgba(29,158,117,0.6);
}
.stat-lbl { color: var(--color-text-tertiary, #888); }
.stat-val {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #fff);
}
.stat-sep {
  width: 1px;
  height: 14px;
  background: var(--color-border-tertiary, rgba(255,255,255,0.1));
}

/* ---- 筛选条 ---- */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}
.status-segmented {
  background: var(--color-background-secondary, #15161A);
  border: 0.5px solid var(--color-border-tertiary, rgba(255,255,255,0.08));
  border-radius: 8px;
  padding: 3px;
}

/* ---- 提供方卡片网格 ---- */
.provider-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-content: start;
}
.provider-card {
  background: var(--color-background-secondary, #15161A);
  border: 0.5px solid var(--color-border-tertiary, rgba(255,255,255,0.08));
  border-radius: 12px;
  padding: 18px 20px;
  transition: border-color 150ms ease;
}
.provider-card:hover {
  border-color: rgba(127,119,221,0.35);
}
.provider-card.is-disabled {
  opacity: 0.55;
}
.card-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}
.meta { flex: 1; min-width: 0; }
.row1 {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #fff);
}
.badge {
  display: inline-block;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 500;
  border-radius: 3px;
  letter-spacing: 0.3px;
}
.badge-builtin {
  background: rgba(127,119,221,0.18);
  color: #AFA9EC;
}
.badge-custom {
  background: rgba(255,99,71,0.18);
  color: #F0997B;
}
.badge-protocol {
  background: rgba(255,255,255,0.05);
  color: #999;
  font-weight: 400;
}
.desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-text-tertiary, #888);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.card-head-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}
.status-pill.on {
  background: rgba(29,158,117,0.14);
  color: #5DCAA5;
}
.status-pill.off {
  background: rgba(95,94,90,0.2);
  color: #999;
}
.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.status-pill.on .pill-dot { background: #1D9E75; }
.status-pill.off .pill-dot { background: #5F5E5A; }
.more-btn {
  color: var(--color-text-tertiary, #666);
  font-size: 14px;
  letter-spacing: 1px;
  width: 24px;
  height: 24px;
  padding: 0;
}
.card-foot {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 0.5px solid var(--color-border-tertiary, rgba(255,255,255,0.06));
  display: flex;
  align-items: center;
  gap: 18px;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-tertiary, #777);
}
.meta-item .val {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #fff);
}
.view-models-btn {
  color: #AFA9EC;
  border-color: rgba(127,119,221,0.35);
  background: transparent;
}

/* ---- + 添加入口 ---- */
.add-card {
  background: transparent;
  border: 1px dashed rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease;
}
.add-card:hover {
  border-color: rgba(127,119,221,0.4);
  background: rgba(127,119,221,0.04);
}
.add-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(127,119,221,0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  color: #AFA9EC;
  font-size: 18px;
  font-weight: 500;
  line-height: 1;
}
.add-title {
  margin: 0;
  font-size: 13px;
  color: #AFA9EC;
  font-weight: 500;
  text-align: center;
}
.add-sub {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--color-text-tertiary, #888);
  text-align: center;
}

/* ---- 空状态 ---- */
.empty-state {
  background: var(--color-background-secondary, #15161A);
  border: 0.5px solid var(--color-border-tertiary, rgba(255,255,255,0.08));
  border-radius: 14px;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.empty-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(127,119,221,0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.icon-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  width: 24px;
  height: 24px;
}
.icon-grid span {
  border-radius: 2px;
}
.icon-grid span:nth-child(1) { background: #7F77DD; }
.icon-grid span:nth-child(2) { background: #AFA9EC; opacity: 0.6; }
.icon-grid span:nth-child(3) { background: #AFA9EC; opacity: 0.6; }
.icon-grid span:nth-child(4) { background: #534AB7; }
.empty-title {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  color: var(--color-text-primary, #fff);
}
.empty-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--color-text-secondary, #999);
  max-width: 520px;
  line-height: 1.6;
}
.empty-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 28px;
  width: 100%;
  max-width: 760px;
}
.empty-step {
  background: var(--color-background-tertiary, #1A1B20);
  border: 0.5px solid var(--color-border-tertiary, rgba(255,255,255,0.08));
  border-radius: 10px;
  padding: 16px 18px;
  text-align: left;
}
.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(127,119,221,0.2);
  color: #AFA9EC;
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 10px;
}
.step-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary, #fff);
  margin-bottom: 6px;
}
.step-desc {
  font-size: 12px;
  color: var(--color-text-secondary, #999);
  line-height: 1.55;
}
.empty-actions {
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ---- 高级说明 ---- */
.advanced-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 18px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.02);
  border: 0.5px dashed var(--color-border-tertiary, rgba(255,255,255,0.08));
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-text-tertiary, #888);
  line-height: 1.55;
}
.tip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5F5E5A;
  margin-top: 7px;
  flex-shrink: 0;
}
.tip-title {
  color: var(--color-text-secondary, #bbb);
  font-weight: 500;
}

/* ---- 模型抽屉卡片 ---- */
.model-card {
  border: 0.5px solid var(--color-border-tertiary, rgba(255,255,255,0.08));
  background: var(--color-background-tertiary, #1A1B20);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 10px;
}
</style>
