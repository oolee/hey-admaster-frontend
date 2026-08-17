<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { PortfolioItemAdminDto } from '#/api/portfolio';

import { defineAsyncComponent, h } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useAuthorization } from '@abp/core';
import { useVbenVxeGrid } from '@abp/ui';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons-vue';
import { Button, message, Modal, Switch, Tag } from 'ant-design-vue';

import {
  getCoverImageUrl,
  PortfolioPermissions,
  usePortfolioApi,
} from '#/api/portfolio';

defineOptions({ name: 'PortfolioManagement' });

const { isGranted } = useAuthorization();
const { getList, remove, updateIsActive } = usePortfolioApi();

const canCreate = isGranted(PortfolioPermissions.Create);
const canEdit = isGranted(PortfolioPermissions.Edit);
const canDelete = isGranted(PortfolioPermissions.Delete);

const IMAGE_PLACEHOLDER =
  "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'80'%20height%3D'60'%3E%3Crect%20width%3D'100%25'%20height%3D'100%25'%20fill%3D'%23f0f2f5'%2F%3E%3Cg%20fill%3D'none'%20stroke%3D'%23c0c4cc'%20stroke-width%3D'2'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Crect%20x%3D'20'%20y%3D'18'%20width%3D'40'%20height%3D'26'%20rx%3D'3'%2F%3E%3Cpath%20d%3D'M20%2022l8-6h8l8%206'%2F%3E%3Ccircle%20cx%3D'40'%20cy%3D'31'%20r%3D'7'%2F%3E%3C%2Fg%3E%3Ctext%20x%3D'40'%20y%3D'52'%20text-anchor%3D'middle'%20font-size%3D'9'%20fill%3D'%23a8abb2'%3E%E6%9A%82%E6%97%A0%E5%9B%BE%E7%89%87%3C%2Ftext%3E%3C%2Fsvg%3E";

function previewImage(url: string) {
  if (!url) return;
  Modal.info({
    centered: true,
    title: '封面预览',
    content: h('img', { src: url, style: 'width: 100%; border-radius: 6px' }),
    okText: '关闭',
  });
}

function onImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.src = IMAGE_PLACEHOLDER;
}

const columns: VxeGridPropTypes.Columns<PortfolioItemAdminDto> = [
  { field: 'sortOrder', title: '排序', width: 80, sortable: true },
  { field: 'id', title: '封面', width: 120, slots: { default: 'image' } },
  { field: 'title', title: '标题', minWidth: 150 },
  { field: 'category', title: '分类', width: 120 },
  { field: 'tags', title: '标签', minWidth: 150, slots: { default: 'tags' } },
  { field: 'client', title: '客户', width: 120 },
  { field: 'year', title: '年份', width: 80 },
  {
    field: 'isFeatured',
    title: '精选',
    width: 80,
    slots: { default: 'isFeatured' },
  },
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

const gridOptions: VxeGridProps<PortfolioItemAdminDto> = {
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

const [PortfolioModal, modalApi] = useVbenModal({
  connectedComponent: defineAsyncComponent(
    () => import('./PortfolioModal.vue'),
  ),
});

function onCreate() {
  modalApi.setData({});
  modalApi.open();
}

function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function onEdit(record: PortfolioItemAdminDto) {
  modalApi.setData(record);
  modalApi.open();
}

async function onDelete(record: PortfolioItemAdminDto) {
  // 精选案例（封面）展示在首页，不允许直接删除，只能替换封面后取消精选
  if (record.isFeatured) {
    Modal.warning({
      centered: true,
      content: `「${record.title}」是精选案例，展示在首页作为封面。如需移除，请先取消"精选"标记，或替换封面后取消精选。`,
      title: '无法删除精选案例',
    });
    return;
  }
  Modal.confirm({
    centered: true,
    content: `确认删除「${record.title}」吗？删除后封面和配图将一并移除。`,
    onOk: async () => {
      await remove(record.id);
      message.success('删除成功');
      await gridApi.query();
    },
    title: '确认删除',
  });
}

async function onToggleActive(record: PortfolioItemAdminDto, checked: boolean) {
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
  <Grid table-title="案例管理">
    <template #toolbar-tools>
      <Button v-if="canCreate" type="primary" @click="onCreate">
        新增案例
      </Button>
    </template>
    <template #image="{ row }">
      <img
        :src="getCoverImageUrl(row.id)"
        alt=""
        style="
          width: 80px;
          height: 60px;
          cursor: pointer;
          object-fit: cover;
          border-radius: 4px;
        "
        @click="previewImage(getCoverImageUrl(row.id))"
        @error="onImageError"
      />
    </template>
    <template #tags="{ row }">
      <span v-if="row.tags">
        <Tag
          v-for="(tag, idx) in parseTags(row.tags)"
          :key="idx"
          color="blue"
          style="margin: 2px"
        >
          {{ tag }}
        </Tag>
      </span>
    </template>
    <template #isFeatured="{ row }">
      <Tag :color="row.isFeatured ? 'green' : 'default'">
        {{ row.isFeatured ? '是' : '否' }}
      </Tag>
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
  <PortfolioModal @change="() => gridApi.query()" />
</template>
