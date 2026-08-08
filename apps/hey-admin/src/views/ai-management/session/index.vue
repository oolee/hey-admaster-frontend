<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { AiDesignSessionAdminDto } from '#/api/ai-design';

import { ref } from 'vue';

import { useVbenVxeGrid } from '@abp/ui';
import { Button, Input, message, Modal, Tag } from 'ant-design-vue';

import { useAiDesignApi } from '#/api/ai-design';

defineOptions({ name: 'AiDesignSessionManagement' });

const { deleteSession, getSessions } = useAiDesignApi();

const filter = ref('');

const columns: VxeGridPropTypes.Columns<AiDesignSessionAdminDto> = [
  { field: 'title', title: '标题', minWidth: 220 },
  {
    field: 'userName',
    title: '用户',
    width: 120,
    slots: { default: 'user' },
  },
  {
    field: 'totalImageCount',
    title: '生成张数',
    width: 100,
    sortable: true,
  },
  {
    field: 'lastActivityTime',
    title: '最近活动',
    width: 170,
    slots: { default: 'lastActivity' },
  },
  {
    field: 'retentionDays',
    title: '保留天数',
    width: 100,
    slots: { default: 'retention' },
  },
  {
    field: 'creationTime',
    title: '创建时间',
    width: 170,
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 100,
  },
];

const gridOptions: VxeGridProps<AiDesignSessionAdminDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        return await getSessions({
          filter: filter.value || undefined,
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

function onDelete(record: AiDesignSessionAdminDto) {
  Modal.confirm({
    centered: true,
    content: `确认删除会话「${record.title}」？其对话消息与生成记录将一并删除。`,
    onOk: async () => {
      await deleteSession(record.id);
      message.success('已删除');
      gridApi.query();
    },
  });
}

function formatTime(value?: null | string) {
  if (!value) return '-';
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
</script>

<template>
  <div class="mb-3 flex items-center justify-between">
    <div>
      <div class="text-xl font-semibold">对话历史</div>
      <div class="mt-0.5 text-sm text-gray-500">
        管理所有用户的 AI 设计会话，按保留天数策略自动清理
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Input
        v-model:value="filter"
        allow-clear
        class="w-56"
        placeholder="搜索标题 / 用户名"
        @press-enter="onSearch"
      />
      <Button type="primary" @click="onSearch">查询</Button>
    </div>
  </div>

  <Grid>
    <template #user="{ row }">
      <span>{{ row.userName || '访客' }}</span>
    </template>
    <template #lastActivity="{ row }">
      <span>{{ formatTime(row.lastActivityTime) }}</span>
    </template>
    <template #retention="{ row }">
      <Tag v-if="row.retentionDays" color="blue"
        >
{{ row.retentionDays }} 天
</Tag
      >
      <Tag v-else color="default">跟随全局</Tag>
    </template>
    <template #action="{ row }">
      <Button type="link" danger size="small" block @click="onDelete(row)"
        >
删除
</Button
      >
    </template>
  </Grid>
</template>
