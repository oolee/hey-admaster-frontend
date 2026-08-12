<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { AiUsageRecordDto, PagedInput } from '#/api/ai-design';

import { reactive } from 'vue';

import { useVbenVxeGrid } from '@abp/ui';
import { Button, Input, Select, Tag } from 'ant-design-vue';

import { AiUsageRecordStatus, useAiDesignApi } from '#/api/ai-design';

defineOptions({ name: 'AiDesignUsageRecordManagement' });

const { getUsageRecords } = useAiDesignApi();

const query = reactive<PagedInput>({
  filter: undefined,
  model: undefined,
  status: undefined,
});

const statusOptions = [
  { label: '待结算', value: AiUsageRecordStatus.Pending },
  { label: '已扣费', value: AiUsageRecordStatus.Charged },
  { label: '扣费失败', value: AiUsageRecordStatus.Failed },
];

const modelOptions = [
  'gpt-image-2',
  'nano-banana',
  'qwen-image',
  'jimeng',
  'mock-image',
].map((value) => ({ label: value, value }));

const columns: VxeGridPropTypes.Columns<AiUsageRecordDto> = [
  { field: 'userName', title: '用户', minWidth: 110 },
  { field: 'model', title: '模型', width: 140 },
  { field: 'quantity', title: '张数', width: 70 },
  { field: 'unitPrice', title: '单价', width: 90 },
  { field: 'amount', title: '金额', width: 100, slots: { default: 'amount' } },
  {
    field: 'costAmount',
    title: '采购成本',
    width: 100,
    slots: { default: 'cost' },
  },
  {
    field: 'grossProfit',
    title: '毛利',
    width: 100,
    slots: { default: 'gross' },
  },
  {
    field: 'status',
    title: '状态',
    width: 100,
    slots: { default: 'status' },
  },
  { field: 'creationTime', title: '创建时间', width: 170 },
  { field: 'settledAt', title: '结算时间', width: 170 },
  { field: 'failReason', title: '失败原因', minWidth: 150 },
];

const gridOptions: VxeGridProps<AiUsageRecordDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        return await getUsageRecords({
          ...query,
          maxResultCount: page.pageSize,
          skipCount: (page.currentPage - 1) * page.pageSize,
        });
      },
    },
    response: { list: 'items', total: 'totalCount' },
  },
  toolbarConfig: { refresh: true },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

function onSearch() {
  gridApi.query();
}

const statusMeta: Record<number, { color: string; label: string }> = {
  [AiUsageRecordStatus.Pending]: { color: 'orange', label: '待结算' },
  [AiUsageRecordStatus.Charged]: { color: 'green', label: '已扣费' },
  [AiUsageRecordStatus.Failed]: { color: 'red', label: '扣费失败' },
};
</script>

<template>
  <div class="mb-3 flex items-center justify-between">
    <div>
      <div class="text-xl font-semibold">消费记录</div>
      <div class="mt-0.5 text-sm text-gray-500">
        调用大模型成功后才扣费，扣费失败可人工核查
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <Input
        v-model:value="query.filter"
        allow-clear
        class="w-48"
        placeholder="用户名"
        @press-enter="onSearch"
      />
      <Select
        v-model:value="query.model"
        allow-clear
        class="w-40"
        placeholder="模型"
        :options="modelOptions"
      />
      <Select
        v-model:value="query.status as any"
        allow-clear
        class="w-32"
        placeholder="状态"
        :options="statusOptions"
      />
      <Button type="primary" @click="onSearch">查询</Button>
    </div>
  </div>

  <Grid>
    <template #amount="{ row }">
      <span class="font-semibold text-orange-600 dark:text-orange-400">
        ¥{{ row.amount }}
      </span>
    </template>
    <template #cost="{ row }">
      {{ row.costAmount > 0 ? `¥${row.costAmount}` : '—' }}
    </template>
    <template #gross="{ row }">
      <span
        :class="
          row.costAmount > 0
            ? 'font-semibold text-green-600 dark:text-green-400'
            : 'text-gray-400'
        "
      >
        {{
          row.costAmount > 0
            ? `¥${(row.amount - row.costAmount).toFixed(2)}`
            : '—'
        }}
      </span>
    </template>
    <template #status="{ row }">
      <Tag :color="statusMeta[row.status]?.color || 'default'">
        {{ statusMeta[row.status]?.label || row.status }}
      </Tag>
    </template>
  </Grid>
</template>
