<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { CapabilityManifestDto } from '#/api/ai-agent';

import { useVbenVxeGrid } from '@abp/ui';
import { Tag } from 'ant-design-vue';

import {
  AgentOutputKindLabel,
  AgentQuantitySourceLabel,
  CapabilityModalityLabel,
  useAiAgentApi,
} from '#/api/ai-agent';

defineOptions({ name: 'AiAgentCapabilityManagement' });

const { getCapabilities } = useAiAgentApi();

const columns: VxeGridPropTypes.Columns<CapabilityManifestDto> = [
  { field: 'id', title: '能力 ID', minWidth: 180 },
  { field: 'displayName', title: '展示名', width: 140 },
  {
    field: 'modality',
    title: '模态',
    width: 90,
    slots: { default: 'modality' },
  },
  {
    field: 'outputKind',
    title: '输出形态',
    width: 110,
    slots: { default: 'outputKind' },
  },
  { field: 'pricingUnitCode', title: '计价单位', width: 110 },
  {
    field: 'quantitySource',
    title: '用量来源',
    width: 110,
    slots: { default: 'quantitySource' },
  },
  {
    field: 'resourceHints',
    title: '资源要求',
    width: 150,
    slots: { default: 'hints' },
  },
];

const gridOptions: VxeGridProps<CapabilityManifestDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async () => getCapabilities(),
    },
    response: { list: 'items', total: 'totalCount' },
  },
  toolbarConfig: { refresh: true },
};

const [Grid] = useVbenVxeGrid({ gridOptions });
</script>

<template>
  <Grid>
    <template #modality="{ row }">
      <Tag>{{ CapabilityModalityLabel[row.modality] ?? row.modality }}</Tag>
    </template>
    <template #outputKind="{ row }">
      <Tag>{{ AgentOutputKindLabel[row.outputKind] ?? row.outputKind }}</Tag>
    </template>
    <template #quantitySource="{ row }">
      <Tag>
        {{ AgentQuantitySourceLabel[row.quantitySource] ?? row.quantitySource }}
      </Tag>
    </template>
    <template #hints="{ row }">
      <span v-if="row.resourceHints?.supportsMask">mask</span>
      <span v-if="row.resourceHints?.supportsMultiImage"> · 多图</span>
      <span
        v-if="
          !row.resourceHints?.supportsMask &&
          !row.resourceHints?.supportsMultiImage
        "
      >
        -
      </span>
    </template>
  </Grid>
</template>
