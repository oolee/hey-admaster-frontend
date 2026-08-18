<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { ModelBridgeManifestDto } from '#/api/ai-agent';

import { useVbenVxeGrid } from '@abp/ui';
import { Tag } from 'ant-design-vue';

import { useAiAgentApi } from '#/api/ai-agent';

defineOptions({ name: 'AiAgentModelBridgeManagement' });

const { getModelBridges } = useAiAgentApi();

const columns: VxeGridPropTypes.Columns<ModelBridgeManifestDto> = [
  { field: 'id', title: '模型桥 ID', minWidth: 160 },
  {
    field: 'capabilityIds',
    title: '支持能力',
    minWidth: 220,
    slots: { default: 'capabilityIds' },
  },
  {
    field: 'isAsync',
    title: '异步',
    width: 80,
    slots: { default: 'isAsync' },
  },
  {
    field: 'supportsMask',
    title: '支持 mask',
    width: 100,
    slots: { default: 'supportsMask' },
  },
  { field: 'priority', title: '优先级', width: 90, sortable: true },
];

const gridOptions: VxeGridProps<ModelBridgeManifestDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async () => getModelBridges(),
    },
    response: { list: 'items', total: 'totalCount' },
  },
  toolbarConfig: { refresh: true },
};

const [Grid] = useVbenVxeGrid({ gridOptions });
</script>

<template>
  <Grid>
    <template #capabilityIds="{ row }">
      <Tag v-for="cid in row.capabilityIds ?? []" :key="cid" color="blue">
        {{ cid }}
      </Tag>
    </template>
    <template #isAsync="{ row }">
      <Tag :color="row.isAsync ? 'orange' : 'default'">
        {{ row.isAsync ? '异步' : '同步' }}
      </Tag>
    </template>
    <template #supportsMask="{ row }">
      <Tag :color="row.supportsMask ? 'green' : 'default'">
        {{ row.supportsMask ? '是' : '否' }}
      </Tag>
    </template>
  </Grid>
</template>
