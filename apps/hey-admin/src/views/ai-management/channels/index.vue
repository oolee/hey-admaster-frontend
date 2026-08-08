<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { AiChannelDto } from '#/api/ai-design';

import { defineAsyncComponent } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenVxeGrid } from '@abp/ui';
import { Button, message, Modal, Switch, Tag } from 'ant-design-vue';

import { AiChannelProviderLabels, useAiDesignApi } from '#/api/ai-design';

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
    field: 'models',
    title: '模型 / 单价',
    minWidth: 260,
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
  connectedComponent: defineAsyncComponent(() => import('./ChannelModal.vue')),
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
    <template #provider="{ row }">
      <Tag :color="providerTag(row.providerType)">
        {{ AiChannelProviderLabels[row.providerType] || row.providerType }}
      </Tag>
    </template>
    <template #models="{ row }">
      <div class="flex flex-wrap gap-1">
        <Tag
          v-for="model in row.models"
          :key="model.id || model.modelName"
          color="cyan"
        >
          {{ model.modelName }} ¥{{ model.pricePerImage }}
        </Tag>
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
        <Button type="link" size="small" block @click="onEdit(row)"
          >
编辑
</Button
        >
        <Button type="link" danger size="small" block @click="onDelete(row)"
          >
删除
</Button
        >
      </div>
    </template>
  </Grid>

  <ChannelModal @change="gridApi.query" />
</template>
