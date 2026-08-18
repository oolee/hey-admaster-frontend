<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { AiChannelDto } from '#/api/ai-design';

import { useVbenModal } from '@vben/common-ui';

import { useVbenVxeGrid } from '@abp/ui';
import { Button, message, Modal, Switch, Tag } from 'ant-design-vue';

import {
  AiChannelProviderLabels,
  AiPricingUnitLabels,
  useAiDesignApi,
} from '#/api/ai-design';

import ChannelModalComponent from './ChannelModal.vue';

defineOptions({ name: 'AiDesignChannelManagement' });

const { deleteChannel, getChannels, setChannelEnabled } = useAiDesignApi();

const columns: VxeGridPropTypes.Columns<AiChannelDto> = [
  { field: 'name', title: '渠道名称', minWidth: 140 },
  {
    field: 'providerType',
    title: 'Provider',
    width: 130,
    slots: { default: 'provider' },
  },
  { field: 'baseUrl', title: 'Base URL', minWidth: 220 },
  {
    field: 'apiKeyMasked',
    title: 'API Key',
    width: 150,
    slots: { default: 'apiKey' },
  },
  {
    field: 'models',
    title: '模型 / 单价',
    minWidth: 340,
    slots: { default: 'models' },
  },
  {
    field: 'enabled',
    title: '启用',
    width: 80,
    slots: { default: 'enabled' },
  },
  {
    field: 'priority',
    title: '优先级',
    width: 90,
    sortable: true,
  },
  {
    field: 'lastSuccessTime',
    title: '状态',
    width: 110,
    slots: { default: 'health' },
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 130,
  },
];

const gridOptions: VxeGridProps<AiChannelDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async () => {
        const list = await getChannels();
        return { items: list, total: list.length };
      },
    },
    response: { list: 'items', total: 'total' },
  },
  toolbarConfig: { refresh: true },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

const [ChannelModal, modalApi] = useVbenModal({
  connectedComponent: ChannelModalComponent,
});

function onCreate() {
  modalApi.setData({});
  modalApi.open();
}

function onEdit(record: AiChannelDto) {
  modalApi.setData(record);
  modalApi.open();
}

function onDelete(record: AiChannelDto) {
  Modal.confirm({
    centered: true,
    content: `确认删除渠道「${record.name}」？其模型配置将一并删除。`,
    onOk: async () => {
      await deleteChannel(record.id);
      message.success('已删除');
      gridApi.query();
    },
  });
}

async function onToggle(record: AiChannelDto, enabled: boolean) {
  try {
    await setChannelEnabled(record.id, enabled);
    message.success(
      enabled ? `渠道「${record.name}」已启用` : `渠道「${record.name}」已禁用`,
    );
    gridApi.query();
  } catch (error: any) {
    message.error(error?.message || '操作失败');
    gridApi.query();
  }
}

function providerTag(providerType: number) {
  const map: Record<number, string> = {
    0: 'cyan',
    1: 'blue',
    2: 'purple',
    3: 'magenta',
    100: 'default',
  };
  return map[providerType] || 'default';
}

function unitShort(pricingUnit: number) {
  return (AiPricingUnitLabels[pricingUnit] || '元/张').replace('元/', '');
}

function formatPrice(price: number) {
  return Number(price)
    .toFixed(2)
    .replace(/\.?0+$/, '');
}

function modelTitle(model: AiChannelDto['models'][number]) {
  const type = model.modelType === 1 ? '非多模态' : '多模态';
  return `${model.modelName}  ¥${formatPrice(model.pricePerImage)}/${unitShort(model.pricingUnit)}（${type}）`;
}
</script>

<template>
  <div class="mb-3 flex items-center justify-between">
    <div>
      <div class="text-xl font-semibold">模型渠道与计费</div>
      <div class="mt-0.5 text-sm text-gray-500">
        配置原生 API / 中转站渠道、模型单价，支持 OpenAI 兼容、百炼、Nano
        Banana、即梦
      </div>
    </div>
    <Button type="primary" @click="onCreate">新增渠道</Button>
  </div>

  <Grid>
    <template #apiKey="{ row }">
      <span class="font-mono text-xs">{{ row.apiKeyMasked || '未配置' }}</span>
    </template>
    <template #provider="{ row }">
      <Tag :color="providerTag(row.providerType)">
        {{ AiChannelProviderLabels[row.providerType] || row.providerType }}
      </Tag>
    </template>
    <template #models="{ row }">
      <div
        class="channel-models-row"
        :title="row.models.length > 0 ? '悬停横向滚动查看全部模型' : undefined"
      >
        <template
          v-for="model in row.models"
          :key="model.id || model.modelName"
        >
          <span class="channel-model-item" :title="modelTitle(model)">
            <span class="font-medium">{{ model.modelName }}</span>
            <span class="channel-model-price">
              ¥{{ formatPrice(model.pricePerImage) }}/{{
                unitShort(model.pricingUnit)
              }}
            </span>
          </span>
        </template>
        <span v-if="row.models.length === 0" class="text-xs text-gray-400">
          未配置模型
        </span>
      </div>
    </template>
    <template #enabled="{ row }">
      <Switch
        :checked="row.enabled"
        size="small"
        @change="(checked: any) => onToggle(row, !!checked)"
      />
    </template>
    <template #health="{ row }">
      <Tag v-if="row.lastSuccessTime" color="green">最近成功</Tag>
      <Tag v-else-if="row.lastFailTime" color="red">最近失败</Tag>
      <Tag v-else color="default">未调用</Tag>
    </template>
    <template #action="{ row }">
      <div class="flex justify-center">
        <Button type="link" size="small" block @click="onEdit(row)">
          编辑
        </Button>
        <Button type="link" danger size="small" block @click="onDelete(row)">
          删除
        </Button>
      </div>
    </template>
  </Grid>

  <ChannelModal @change="gridApi.query" />
</template>
<style scoped>
/* 模型/单价列：单排显示，默认隐藏滚动条，悬停可横向滚动查看全部 */
.channel-models-row {
  display: flex;
  gap: 6px;
  align-items: center;
  max-width: 420px;
  padding-bottom: 2px;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-color: rgb(156 163 175 / 0%) transparent;
  scrollbar-width: thin;
}

.channel-models-row:hover {
  scrollbar-color: rgb(156 163 175 / 60%) transparent;
}

.channel-models-row::-webkit-scrollbar {
  height: 5px;
}

.channel-models-row::-webkit-scrollbar-track {
  background: transparent;
}

.channel-models-row::-webkit-scrollbar-thumb {
  background: rgb(156 163 175 / 0%);
  border-radius: 3px;
}

.channel-models-row:hover::-webkit-scrollbar-thumb {
  background: rgb(156 163 175 / 60%);
}

.channel-model-item {
  display: inline-flex;
  flex-shrink: 0;
  gap: 3px;
  align-items: center;
  padding: 1px 8px;
  font-size: 0.75rem;
  line-height: 1.6;
  color: #0e7490;
  background: rgb(6 182 212 / 10%);
  border: 1px solid rgb(6 182 212 / 22%);
  border-radius: 6px;
}

.dark .channel-model-item {
  color: #67e8f9;
  background: rgb(6 182 212 / 12%);
  border-color: rgb(6 182 212 / 28%);
}

.channel-model-price {
  font-size: 0.7rem;
  color: rgb(14 116 144 / 75%);
}

.dark .channel-model-price {
  color: rgb(103 232 249 / 70%);
}
</style>
