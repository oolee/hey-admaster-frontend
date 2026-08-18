<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type {
  AiAgentChannelDto,
  AiAgentChannelModelDto,
  CreateUpdateAiAgentChannelDto,
  UpdateAiAgentChannelModelDto,
} from '#/api/ai-agent';

import { AiAgentChannelProviderTypeLabel, useAiAgentApi } from '#/api/ai-agent';
import { useVbenVxeGrid } from '@abp/ui';
import {
  Button,
  Card,
  Checkbox,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Tag,
  message,
} from 'ant-design-vue';
import { computed, reactive, ref } from 'vue';

defineOptions({ name: 'AiAgentChannelManagement' });

const {
  createChannel,
  deleteChannel,
  deleteChannelModel,
  getChannelModels,
  getChannels,
  setChannelEnabled,
  setChannelModelEnabled,
  updateChannel,
  updateChannelModel,
} = useAiAgentApi();

const columns: VxeGridPropTypes.Columns<AiAgentChannelDto> = [
  { field: 'name', title: '名称', minWidth: 140 },
  {
    field: 'providerType',
    title: '供应商',
    width: 130,
    slots: { default: 'providerType' },
  },
  { field: 'model', title: '模型', width: 170 },
  { field: 'enabled', title: '状态', width: 90, slots: { default: 'enabled' } },
  { field: 'priority', title: '优先级', width: 90, sortable: true },
  { field: 'weight', title: '权重', width: 80 },
  { field: 'timeoutSeconds', title: '超时(秒)', width: 90 },
  { field: 'hasApiKey', title: 'ApiKey', width: 90, slots: { default: 'hasApiKey' } },
  { field: 'description', title: '说明', minWidth: 160 },
  {
    field: 'actions',
    title: '操作',
    width: 240,
    fixed: 'right',
    slots: { default: 'actions' },
  },
];

const gridOptions: VxeGridProps<AiAgentChannelDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: { query: async () => getChannels() },
    response: { list: 'items', total: 'totalCount' },
  },
  toolbarConfig: { custom: true, refresh: true },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

const providerTypeOptions = [
  { label: 'DashScope', value: 0 },
  { label: 'OpenAI 兼容', value: 1 },
  { label: 'Mock', value: 2 },
];

// ---- 新建 / 编辑表单 ----
const modalOpen = ref(false);
const editingId = ref<null | string>(null);
const currentApiKeyMasked = ref<null | string>(null);
const saving = ref(false);
const form = reactive<CreateUpdateAiAgentChannelDto>({
  name: '',
  providerType: 0,
  baseUrl: '',
  apiKey: '',
  model: '',
  enabled: true,
  priority: 100,
  weight: 1,
  timeoutSeconds: 300,
  description: '',
});

function onCreate() {
  editingId.value = null;
  currentApiKeyMasked.value = null;
  Object.assign(form, {
    name: '',
    providerType: 0,
    baseUrl: '',
    apiKey: '',
    model: '',
    enabled: true,
    priority: 100,
    weight: 1,
    timeoutSeconds: 300,
    description: '',
  });
  modalOpen.value = true;
}

function onUpdate(row: AiAgentChannelDto) {
  editingId.value = row.id;
  currentApiKeyMasked.value = row.apiKeyMasked ?? null;
  Object.assign(form, {
    name: row.name,
    providerType: row.providerType,
    baseUrl: row.baseUrl ?? '',
    apiKey: row.apiKeyMasked ?? '',
    model: row.model,
    enabled: row.enabled,
    priority: row.priority,
    weight: row.weight,
    timeoutSeconds: row.timeoutSeconds,
    description: row.description ?? '',
  });
  modalOpen.value = true;
}

async function onSave() {
  if (!form.name?.trim() || !form.model?.trim()) {
    message.warning('请填写名称和模型');
    return;
  }
  saving.value = true;
  try {
    // 没变化（仍是脱敏掩码）→ 不提交 ApiKey，后端保持不变
    const input = { ...form };
    if (input.apiKey?.includes('****')) {
      input.apiKey = '';
    }
    if (editingId.value) {
      await updateChannel(editingId.value, input);
      message.success('渠道已更新');
    } else {
      await createChannel(input);
      message.success('渠道已创建');
    }
    modalOpen.value = false;
    gridApi.query();
  } finally {
    saving.value = false;
  }
}

function onDelete(row: AiAgentChannelDto) {
  Modal.confirm({
    title: `删除渠道「${row.name}」？`,
    content: '删除后不可恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await deleteChannel(row.id);
      message.success('已删除');
      gridApi.query();
    },
  });
}

async function onToggleEnabled(row: AiAgentChannelDto, checked: boolean) {
  await setChannelEnabled(row.id, checked);
  message.success(checked ? '已启用' : '已停用');
}

// ---- 模型管理 ----
const modelsModal = ref(false);
const currentChannel = ref<null | AiAgentChannelDto>(null);
const channelModels = ref<AiAgentChannelModelDto[]>([]);
const modelsLoading = ref(false);

const modelEditModal = ref(false);
const editingModelId = ref<null | string>(null);
const modelForm = reactive<UpdateAiAgentChannelModelDto>({
  displayName: '',
  enabled: true,
  priority: 100,
  weight: 1,
  maxImagesPerRequest: 4,
  supportedSizes: '',
  sizeMode: 0,
  disabledRequestParams: 0,
  paramProfileJson: '',
  defaultResponseFormat: '',
  pricePerImage: 0,
});

async function openModels(row: AiAgentChannelDto) {
  currentChannel.value = row;
  modelsModal.value = true;
  await loadModels(row.id);
}

async function loadModels(channelId: string) {
  modelsLoading.value = true;
  try {
    const res = await getChannelModels(channelId);
    channelModels.value = res.items ?? [];
  } finally {
    modelsLoading.value = false;
  }
}

function openModelEdit(m: AiAgentChannelModelDto) {
  editingModelId.value = m.id;
  Object.assign(modelForm, {
    displayName: m.displayName ?? '',
    enabled: m.enabled,
    priority: m.priority,
    weight: m.weight,
    maxImagesPerRequest: m.maxImagesPerRequest,
    supportedSizes: m.supportedSizes ?? '',
    sizeMode: m.sizeMode,
    disabledRequestParams: m.disabledRequestParams,
    paramProfileJson: m.paramProfileJson ?? '',
    defaultResponseFormat: m.defaultResponseFormat ?? '',
    pricePerImage: m.pricePerImage,
  });
  modelEditModal.value = true;
}

async function saveModel() {
  if (!editingModelId.value) return;
  await updateChannelModel(editingModelId.value, { ...modelForm });
  message.success('模型已更新');
  modelEditModal.value = false;
  await loadModels(currentChannel.value!.id);
}

function removeModel(m: AiAgentChannelModelDto) {
  Modal.confirm({
    title: `删除模型「${m.modelName}」？`,
    content: '删除后不可恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await deleteChannelModel(m.id);
      message.success('已删除');
      await loadModels(currentChannel.value!.id);
    },
  });
}

async function toggleModelEnabled(m: AiAgentChannelModelDto, checked: boolean) {
  await setChannelModelEnabled(m.id, checked);
  message.success(checked ? '已启用' : '已停用');
}

function parseSizes(json: null | string | undefined): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

// ---- 批量删除 ----
const selectedModelIds = ref<string[]>([]);
const allSelected = computed(
  () =>
    channelModels.value.length > 0 &&
    channelModels.value.every((m) => selectedModelIds.value.includes(m.id)),
);
const someSelected = computed(
  () => selectedModelIds.value.length > 0 && !allSelected.value,
);

function toggleSelect(id: string, checked: boolean) {
  if (checked) {
    if (!selectedModelIds.value.includes(id)) selectedModelIds.value.push(id);
  } else {
    selectedModelIds.value = selectedModelIds.value.filter((x) => x !== id);
  }
}

function toggleSelectAll(checked: boolean) {
  selectedModelIds.value = checked ? channelModels.value.map((m) => m.id) : [];
}

function batchDelete() {
  Modal.confirm({
    title: `删除选中的 ${selectedModelIds.value.length} 个模型？`,
    content: '删除后不可恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      for (const id of selectedModelIds.value) {
        await deleteChannelModel(id);
      }
      selectedModelIds.value = [];
      message.success('已删除');
      await loadModels(currentChannel.value!.id);
    },
  });
}
</script>

<template>
  <Grid table-title="生成渠道">
    <template #toolbar-tools>
      <Button type="primary" @click="onCreate">新增渠道</Button>
    </template>

    <template #providerType="{ row }">
      <Tag>{{ AiAgentChannelProviderTypeLabel[row.providerType] ?? row.providerType }}</Tag>
    </template>

    <template #enabled="{ row }">
      <Switch
        v-model:checked="row.enabled"
        size="small"
        @change="(checked) => onToggleEnabled(row, checked as boolean)"
      />
    </template>

    <template #hasApiKey="{ row }">
      <Tag :color="row.hasApiKey ? 'green' : 'default'">
        {{ row.hasApiKey ? '已配置' : '未配置' }}
      </Tag>
    </template>

    <template #actions="{ row }">
      <Button type="link" @click="onUpdate(row)">编辑</Button>
      <Button type="link" @click="openModels(row)">模型</Button>
      <Button danger type="link" @click="onDelete(row)">删除</Button>
    </template>
  </Grid>

  <Modal
    v-model:open="modalOpen"
    :confirm-loading="saving"
    :title="editingId ? '编辑渠道' : '新增渠道'"
    cancel-text="取消"
    ok-text="保存"
    @ok="onSave"
  >
    <div class="channel-form">
      <div class="form-row">
        <label>名称</label>
        <Input v-model:value="form.name" placeholder="如：通义万相主渠道" />
      </div>
      <div class="form-row">
        <label>供应商</label>
        <Select
          v-model:value="form.providerType"
          :options="providerTypeOptions"
          :style="{ width: '200px' }"
        />
      </div>
      <div class="form-row">
        <label>模型</label>
        <Input v-model:value="form.model" placeholder="如：qwen-image，保存后点列表「刷新」自动获取" />
      </div>
      <div class="form-row">
        <label>BaseUrl</label>
        <Input v-model:value="form.baseUrl" placeholder="完整地址（含 /v1），如 https://api.apiyi.com/v1，留空用供应商默认" />
      </div>
      <div class="form-row">
        <label>ApiKey</label>
        <Input
          v-model:value="form.apiKey"
          type="password"
          :placeholder="currentApiKeyMasked ? `当前 ${currentApiKeyMasked}，留空则不变` : '上游 API 密钥（加密存储）'"
        />
      </div>
      <div class="form-row form-row-3">
        <div class="form-col">
          <label>优先级</label>
          <InputNumber v-model:value="form.priority" :min="0" />
        </div>
        <div class="form-col">
          <label>权重</label>
          <InputNumber v-model:value="form.weight" :min="1" />
        </div>
        <div class="form-col">
          <label>超时(秒)</label>
          <InputNumber v-model:value="form.timeoutSeconds" :min="1" />
        </div>
      </div>
      <div class="form-row">
        <label>启用</label>
        <Switch v-model:checked="form.enabled" />
      </div>
      <div class="form-row">
        <label>说明</label>
        <Input v-model:value="form.description" placeholder="可选" />
      </div>
    </div>
  </Modal>

  <Modal
    v-model:open="modelsModal"
    :footer="null"
    :title="`模型管理 · ${currentChannel?.name ?? ''}`"
    width="720px"
  >
    <p v-if="modelsLoading" class="muted">加载中…</p>
    <p v-else-if="!channelModels.length" class="muted">
      暂无模型 · 回列表点「刷新」自动获取
    </p>
    <template v-else>
      <div class="model-toolbar">
        <Checkbox
          :checked="allSelected"
          :indeterminate="someSelected"
          @change="(e) => toggleSelectAll(e.target.checked)"
        >
          全选
        </Checkbox>
        <span v-if="selectedModelIds.length" class="muted">
          已选 {{ selectedModelIds.length }}
        </span>
        <Button
          danger
          size="small"
          :disabled="!selectedModelIds.length"
          @click="batchDelete"
        >
          批量删除
        </Button>
      </div>
      <div class="model-grid">
        <Card
          v-for="m in channelModels"
          :key="m.id"
          size="small"
          class="model-card"
          :class="{ dim: !m.enabled }"
        >
          <template #title>
            <div class="mc-title">
              <Checkbox
                :checked="selectedModelIds.includes(m.id)"
                @change="(e) => toggleSelect(m.id, e.target.checked)"
              />
              <span class="mc-name">{{ m.modelName }}</span>
            </div>
          </template>
          <template #extra>
            <Switch
              v-model:checked="m.enabled"
              size="small"
              @change="(c) => toggleModelEnabled(m, c as boolean)"
            />
          </template>
          <div v-if="m.displayName" class="mc-alias">{{ m.displayName }}</div>
          <div v-if="parseSizes(m.supportedSizes).length" class="mc-sizes">
            <span
              v-for="s in parseSizes(m.supportedSizes)"
              :key="s"
              class="mc-size"
            >
              {{ s }}
            </span>
          </div>
          <div class="mc-foot">
            <span class="mc-price">
              {{ m.pricePerImage > 0 ? `${m.pricePerImage} 元/次` : '免费' }}
            </span>
            <span class="mc-priority">P{{ m.priority }}</span>
            <span class="mc-actions">
              <Button size="small" type="link" @click="openModelEdit(m)">编辑</Button>
              <Button danger size="small" type="link" @click="removeModel(m)">删除</Button>
            </span>
          </div>
        </Card>
      </div>
    </template>
  </Modal>

  <Modal
    v-model:open="modelEditModal"
    cancel-text="取消"
    ok-text="保存"
    title="编辑模型"
    @ok="saveModel"
  >
    <div class="channel-form">
      <div class="form-row">
        <label>别名</label>
        <Input v-model:value="modelForm.displayName" placeholder="前台显示名，留空用原始 ID" />
      </div>
      <div class="form-row form-row-3">
        <div class="form-col"><label>优先级</label><InputNumber v-model:value="modelForm.priority" :min="0" /></div>
        <div class="form-col"><label>权重</label><InputNumber v-model:value="modelForm.weight" :min="1" /></div>
        <div class="form-col"><label>单次张数</label><InputNumber v-model:value="modelForm.maxImagesPerRequest" :min="1" /></div>
      </div>
      <div class="form-row">
        <label>尺寸模式</label>
        <Select
          v-model:value="modelForm.sizeMode"
          :options="[{ label: 'Auto 直传', value: 0 }, { label: 'Tier 档位', value: 1 }]"
          :style="{ width: '200px' }"
        />
      </div>
      <div class="form-row">
        <label>支持尺寸</label>
        <Input
          v-model:value="modelForm.supportedSizes"
          placeholder='JSON 数组，如 ["1024x1024","1024x1792"]，留空不限'
        />
      </div>
      <div class="form-row">
        <label>返回格式</label>
        <Select
          v-model:value="modelForm.defaultResponseFormat"
          :options="[{ label: '默认', value: '' }, { label: 'URL', value: 'url' }, { label: 'Base64', value: 'b64_json' }]"
          :style="{ width: '200px' }"
        />
      </div>
      <div class="form-row">
        <label>参数映射 JSON</label>
        <textarea
          v-model="modelForm.paramProfileJson"
          class="json-area"
          placeholder='{"quality_via_size":true,"resolution_map":{"1K":"1024x1024","2K":"1024x1792"}}'
          rows="3"
        ></textarea>
      </div>
      <div class="form-row">
        <label>成本单价(元)</label>
        <InputNumber v-model:value="modelForm.pricePerImage" :min="0" :step="0.01" />
      </div>
      <div class="form-row">
        <label>启用</label>
        <Switch v-model:checked="modelForm.enabled" />
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.channel-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.form-row > label {
  flex-shrink: 0;
  width: 76px;
  font-size: 13px;
  color: var(--vben-text-color-2, #666);
  text-align: right;
}

.form-row-3 {
  align-items: flex-start;
}

.form-col {
  display: flex;
  flex: 1;
  gap: 6px;
  align-items: center;
}

.form-col > label {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--vben-text-color-2, #666);
}

.model-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
  max-height: 420px;
  overflow-y: auto;
}

.model-card.dim {
  opacity: 0.55;
}

.mc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.mc-name {
  overflow: hidden;
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mc-alias {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--ant-color-text-secondary, #999);
}

.mc-sizes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.mc-size {
  padding: 1px 7px;
  font-size: 10px;
  font-weight: 600;
  color: var(--ant-color-primary, #1677ff);
  background: color-mix(in srgb, var(--ant-color-primary, #1677ff) 12%, transparent);
  border-radius: 999px;
}

.mc-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 6px;
  font-size: 12px;
  border-top: 1px dashed var(--ant-color-border, #d9d9d9);
}

.mc-price {
  font-weight: 600;
  color: var(--ant-color-primary, #1677ff);
}

.mc-priority {
  color: var(--ant-color-text-tertiary, #999);
}

.mc-actions {
  margin-left: auto;
}

.muted {
  color: var(--ant-color-text-secondary, #999);
}

.json-area {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--vben-border-color, #d9d9d9);
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  resize: vertical;
}
</style>
