<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type {
  AiAgentChannelDto,
  CreateUpdateAiAgentChannelDto,
} from '#/api/ai-agent';

import { AiAgentChannelProviderTypeLabel, useAiAgentApi } from '#/api/ai-agent';
import { useVbenVxeGrid } from '@abp/ui';
import {
  Button,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Tag,
  message,
} from 'ant-design-vue';
import { reactive, ref } from 'vue';

defineOptions({ name: 'AiAgentChannelManagement' });

const {
  createChannel,
  deleteChannel,
  getChannels,
  probeChannel,
  setChannelEnabled,
  updateChannel,
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
    width: 200,
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
  Object.assign(form, {
    name: row.name,
    providerType: row.providerType,
    baseUrl: row.baseUrl ?? '',
    apiKey: '',
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
    if (editingId.value) {
      await updateChannel(editingId.value, { ...form });
      message.success('渠道已更新');
    } else {
      await createChannel({ ...form });
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

// ---- 能力探测：后端读库取密钥，前端只传渠道 ID ----
const refreshingId = ref<null | string>(null);
async function onRefresh(row: AiAgentChannelDto) {
  refreshingId.value = row.id;
  try {
    const res = await probeChannel(row.id);
    const models = res.items ?? [];
    message.success(`已获取 ${models.length} 个模型`);
    gridApi.query();
  } finally {
    refreshingId.value = null;
  }
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
      <Button
        type="link"
        :loading="refreshingId === row.id"
        @click="onRefresh(row)"
      >
        刷新
      </Button>
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
          :placeholder="editingId ? '留空则保持不变' : '上游 API 密钥（加密存储）'"
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
</style>
