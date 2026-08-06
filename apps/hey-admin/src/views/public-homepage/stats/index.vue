<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { StatItemAdminDto } from '#/api/public-homepage';

import { defineAsyncComponent, h } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useAuthorization } from '@abp/core';
import { useVbenVxeGrid } from '@abp/ui';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons-vue';
import { Button, message, Modal, Switch } from 'ant-design-vue';

import { PublicHomepagePermissions, useStatApi } from '#/api/public-homepage';

defineOptions({ name: 'PublicHomepageStat' });

const { isGranted } = useAuthorization();
const { getList, remove, updateIsActive } = useStatApi();

const canCreate = isGranted(PublicHomepagePermissions.Create);
const canEdit = isGranted(PublicHomepagePermissions.Edit);
const canDelete = isGranted(PublicHomepagePermissions.Delete);

const columns: VxeGridPropTypes.Columns<StatItemAdminDto> = [
  { field: 'sortOrder', title: '排序', width: 80, sortable: true },
  { field: 'number', title: '数值', width: 120 },
  { field: 'label', title: '标签', minWidth: 150 },
  {
    field: 'isActive',
    title: '启用',
    width: 80,
    slots: { default: 'isActive' },
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 150,
  },
];

const gridOptions: VxeGridProps<StatItemAdminDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async ({ page, sort }) => {
        const sorting = sort.order
          ? `${sort.field} ${sort.order}`
          : 'sortOrder';
        return await getList({
          sorting,
          maxResultCount: page.pageSize,
          skipCount: (page.currentPage - 1) * page.pageSize,
        });
      },
    },
    response: { total: 'totalCount', list: 'items' },
  },
  toolbarConfig: { refresh: true },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

const [StatModal, modalApi] = useVbenModal({
  connectedComponent: defineAsyncComponent(() => import('./StatModal.vue')),
});

function onCreate() {
  modalApi.setData({});
  modalApi.open();
}

function onEdit(record: StatItemAdminDto) {
  modalApi.setData(record);
  modalApi.open();
}

async function onDelete(record: StatItemAdminDto) {
  Modal.confirm({
    centered: true,
    content: `确认删除「${record.label}」吗？`,
    onOk: async () => {
      await remove(record.id);
      message.success('删除成功');
      await gridApi.query();
    },
    title: '确认删除',
  });
}

async function onToggleActive(record: StatItemAdminDto, checked: boolean) {
  try {
    await updateIsActive(record.id, checked);
    record.isActive = checked;
    message.success(checked ? '已启用' : '已禁用');
  } catch {
    message.error('操作失败');
  }
}
</script>

<template>
  <Grid table-title="统计数据管理">
    <template #toolbar-tools>
      <Button v-if="canCreate" type="primary" @click="onCreate">
        新增统计
      </Button>
    </template>
    <template #isActive="{ row }">
      <Switch
        :checked="row.isActive"
        :disabled="!canEdit"
        size="small"
        @change="(checked: boolean) => onToggleActive(row, checked)"
      />
    </template>
    <template #action="{ row }">
      <Button
        v-if="canEdit"
        :icon="h(EditOutlined)"
        type="link"
        block
        @click="onEdit(row)"
      >
        编辑
      </Button>
      <Button
        v-if="canDelete"
        :icon="h(DeleteOutlined)"
        type="link"
        danger
        block
        @click="onDelete(row)"
      >
        删除
      </Button>
    </template>
  </Grid>
  <StatModal @change="() => gridApi.query()" />
</template>
