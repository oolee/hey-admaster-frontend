<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { PluginManifestDto } from '#/api/ai-agent';

import { useVbenVxeGrid } from '@abp/ui';
import { Tag } from 'ant-design-vue';

import { useAiAgentApi } from '#/api/ai-agent';

defineOptions({ name: 'AiAgentPluginManagement' });

const { getPlugins } = useAiAgentApi();

const columns: VxeGridPropTypes.Columns<PluginManifestDto> = [
  { field: 'id', title: '插件 ID', minWidth: 150 },
  { field: 'name', title: '名称', width: 160 },
  { field: 'version', title: '版本', width: 90 },
  {
    field: 'providesCapabilities',
    title: '提供能力',
    minWidth: 220,
    slots: { default: 'providesCapabilities' },
  },
  {
    field: 'servesModels',
    title: '服务模型',
    minWidth: 200,
    slots: { default: 'servesModels' },
  },
  {
    field: 'dependsOn',
    title: '依赖',
    minWidth: 140,
    slots: { default: 'dependsOn' },
  },
];

const gridOptions: VxeGridProps<PluginManifestDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async () => getPlugins(),
    },
    response: { list: 'items', total: 'totalCount' },
  },
  toolbarConfig: { refresh: true },
};

const [Grid] = useVbenVxeGrid({ gridOptions });
</script>

<template>
  <Grid>
    <template #providesCapabilities="{ row }">
      <Tag
        v-for="cid in row.providesCapabilities ?? []"
        :key="cid"
        color="blue"
      >
        {{ cid }}
      </Tag>
    </template>
    <template #servesModels="{ row }">
      <Tag v-for="m in row.servesModels ?? []" :key="m" color="purple">
        {{ m }}
      </Tag>
    </template>
    <template #dependsOn="{ row }">
      <Tag v-for="d in row.dependsOn ?? []" :key="d">{{ d }}</Tag>
      <span v-if="!row.dependsOn?.length">-</span>
    </template>
  </Grid>
</template>
