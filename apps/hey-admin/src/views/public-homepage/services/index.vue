<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { ServiceItemAdminDto } from '#/api/public-homepage';

import { defineAsyncComponent, h } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useAuthorization } from '@abp/core';
import { useVbenVxeGrid } from '@abp/ui';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons-vue';
import { Button, message, Modal, Switch } from 'ant-design-vue';

import {
  PublicHomepagePermissions,
  useServiceApi,
} from '#/api/public-homepage';

defineOptions({ name: 'PublicHomepageService' });

const { isGranted } = useAuthorization();
const { getList, remove, updateIsActive } = useServiceApi();

const canCreate = isGranted(PublicHomepagePermissions.Create);
const canEdit = isGranted(PublicHomepagePermissions.Edit);
const canDelete = isGranted(PublicHomepagePermissions.Delete);

const columns: VxeGridPropTypes.Columns<ServiceItemAdminDto> = [
  { field: 'sortOrder', title: '排序', width: 80, sortable: true },
  { field: 'tag', title: '标签', width: 80 },
  { field: 'title', title: '标题', minWidth: 120 },
  { field: 'icon', title: '图标', width: 160 },
  { field: 'description', title: '描述', minWidth: 250 },
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

const gridOptions: VxeGridProps<ServiceItemAdminDto> = {
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

const [ServiceModal, modalApi] = useVbenModal({
  connectedComponent: defineAsyncComponent(() => import('./ServiceModal.vue')),
});

function onCreate() {
  modalApi.setData({});
  modalApi.open();
}

function onEdit(record: ServiceItemAdminDto) {
  modalApi.setData(record);
  modalApi.open();
}

async function onDelete(record: ServiceItemAdminDto) {
  Modal.confirm({
    centered: true,
    content: `确认删除「${record.title}」吗？`,
    onOk: async () => {
      await remove(record.id);
      message.success('删除成功');
      await gridApi.query();
    },
    title: '确认删除',
  });
}

async function onToggleActive(record: ServiceItemAdminDto, checked: boolean) {
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
  <Grid table-title="服务项目管理">
    <template #toolbar-tools>
      <Button v-if="canCreate" type="primary" @click="onCreate">
        新增服务
      </Button>
    </template>
    <template #isActive="{ row }">
      <Switch
        :checked="row.isActive"
        :disabled="!canEdit"
        size="small"
        @change="(checked: any) => onToggleActive(row, checked === true)"
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
  <ServiceModal @change="() => gridApi.query()" />
</template>
