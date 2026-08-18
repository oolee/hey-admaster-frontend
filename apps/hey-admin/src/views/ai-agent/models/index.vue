<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { useAiAgentApi, type ProviderDto, type ModelDto, type CreateModelInputDto } from '#/api/ai-agent';

const api = useAiAgentApi();

const providers = ref<ProviderDto[]>([]);
const loading = ref(false);
const builtinAvailable = ref<{ code: string; displayName: string; defaultBaseUrl?: string | null; defaultProtocol: string }[]>([]);

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
</script>

<template>
  <div class="p-4">
    <a-card :bordered="false" class="mb-3">
      <h3 class="text-lg font-medium mb-2">模型</h3>
      <p class="text-gray-500 mb-4">填入各提供方的 API 密钥即可使用其模型。</p>

      <a-list :data-source="providers" :loading="loading" item-layout="vertical">
        <template #renderItem="{ item }">
          <a-list-item :key="item.id" class="!px-0">
            <div class="flex items-center justify-between border rounded-lg px-4 py-3 mb-2 bg-[var(--ant-color-fill-quaternary)] border-[var(--ant-color-border-secondary)]">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <span class="font-medium text-base">{{ item.name }}</span>
                <a-tag v-if="item.type === 1" color="default">自定义</a-tag>
                <span class="w-2 h-2 rounded-full inline-block" :class="item.enabled ? 'bg-green-500' : 'bg-gray-400'"></span>
                <span class="text-gray-500 text-sm ml-2">{{ item.modelCount }} 个模型</span>
              </div>
              <div class="flex items-center gap-2">
                <a-button type="default" size="small" @click="openEdit(item)">编辑</a-button>
                <a-button v-if="item.type === 1" danger type="link" size="small" @click="onDelete(item)">删除</a-button>
              </div>
            </div>
            <div class="text-sm text-gray-500 ml-1 mb-3">
              协议 {{ item.protocol }} · {{ item.hasApiKey ? '已配置密钥' : '未配置密钥' }}
              <a-switch class="ml-3" :checked="item.enabled" size="small" @change="(c: boolean) => onToggleEnabled(item, c)" />
            </div>
            <a-button type="link" class="!px-0" @click="openModels(item)">查看模型({{ item.modelCount }})</a-button>
          </a-list-item>
        </template>
        <template #renderEmpty>
          <a-empty description="还没有配置任何提供方" />
        </template>
      </a-list>

      <div class="grid grid-cols-2 gap-3 mt-4">
        <a-button block size="large" @click="openAddBuiltin" :disabled="builtinAvailable.length === 0">
          <template #icon><span class="text-lg">+</span></template>
          添加提供方
          <span v-if="builtinAvailable.length === 0" class="text-xs text-gray-400 ml-2">（已添加全部）</span>
        </a-button>
        <a-button block size="large" @click="openAddCustom">+ 添加自定义提供方</a-button>
      </div>
    </a-card>

    <!-- 编辑 Provider -->
    <a-modal v-model:open="editModalOpen" title="编辑提供方" @ok="saveEdit">
      <a-form layout="vertical">
        <a-form-item label="显示名称"><a-input v-model:value="providerForm.name" /></a-form-item>
        <a-form-item label="API 地址"><a-input v-model:value="providerForm.baseUrl" placeholder="https://..." /></a-form-item>
        <a-form-item label="API 密钥(留空不修改)">
          <a-input-password v-model:value="providerForm.apiKey" placeholder="修改时输入新密钥" />
        </a-form-item>
        <a-form-item label="优先级"><a-input-number v-model:value="providerForm.priority" :min="0" /></a-form-item>
        <a-form-item label="权重"><a-input-number v-model:value="providerForm.weight" :min="1" /></a-form-item>
        <a-form-item label="超时(秒)"><a-input-number v-model:value="providerForm.timeoutSeconds" :min="30" /></a-form-item>
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
        <a-collapse v-model:active-key="builtinForm.advancedOpen ? ['1'] : []" ghost>
          <a-collapse-panel key="1" header="自定义设置">
            <a-form-item label="API 地址">
              <a-input v-model:value="builtinForm.baseUrl" placeholder="提供方默认" />
            </a-form-item>
            <a-form-item label="优先级"><a-input-number v-model:value="builtinForm.priority" :min="0" /></a-form-item>
            <a-form-item label="权重"><a-input-number v-model:value="builtinForm.weight" :min="1" /></a-form-item>
            <a-form-item label="超时(秒)"><a-input-number v-model:value="builtinForm.timeoutSeconds" :min="30" /></a-form-item>
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
      <a-button type="primary" class="mb-3" @click="openAddModel(currentProvider?.id ?? '')">添加模型</a-button>
      <a-spin :spinning="modelsLoading">
        <a-empty v-if="!modelsLoading && providerModels.length === 0" description="还没有配置模型" />
        <div v-for="m in providerModels" :key="m.id" class="border rounded-lg p-3 mb-3">
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
    <a-modal v-model:open="newModelOpen.open" title="添加模型" @ok="saveModel">
      <a-form layout="vertical">
        <a-form-item label="模型 ID" required><a-input v-model:value="modelForm.modelName" placeholder="如 gpt-image-2" /></a-form-item>
        <a-form-item label="显示名称"><a-input v-model:value="modelForm.displayName" placeholder="可选" /></a-form-item>
        <a-form-item label="上下文窗口"><a-input-number v-model:value="modelForm.contextWindow" class="!w-full" placeholder="256K" /></a-form-item>
        <a-form-item label="最大输出 token"><a-input-number v-model:value="modelForm.maxOutputTokens" class="!w-full" placeholder="32K" /></a-form-item>
        <a-form-item label="单次最大张数(生图能力用)"><a-input-number v-model:value="modelForm.maxImagesPerRequest" :min="1" class="!w-full" /></a-form-item>
        <a-form-item label="单次价格"><a-input-number v-model:value="modelForm.pricePerCall" :min="0" :precision="2" class="!w-full" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
