<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { AiTemplateDto } from '#/api/ai-design';

import { ref } from 'vue';

import { useVbenVxeGrid } from '@abp/ui';
import { Button, Image, message, Modal, Tag } from 'ant-design-vue';

import { useAiDesignApi } from '#/api/ai-design';

defineOptions({ name: 'AiDesignTemplateManagement' });

const { adminSetSystemTemplate, deleteTemplate, getTemplatesAdmin } =
  useAiDesignApi();

const detail = ref<AiTemplateDto | null>(null);
const showDetail = ref(false);

const columns: VxeGridPropTypes.Columns<AiTemplateDto> = [
  {
    field: 'coverImageUrl',
    title: '封面',
    width: 90,
    slots: { default: 'cover' },
  },
  { field: 'name', title: '模板名称', minWidth: 160 },
  { field: 'category', title: '分类', width: 110 },
  {
    field: 'source',
    title: '来源',
    width: 100,
    slots: { default: 'source' },
  },
  {
    field: 'ownerUserName',
    title: '共享者',
    width: 110,
    slots: { default: 'owner' },
  },
  {
    field: 'recommendedModel',
    title: '推荐模型',
    width: 150,
    slots: { default: 'model' },
  },
  {
    field: 'defaultSize',
    title: '默认尺寸',
    width: 110,
  },
  {
    field: 'usageCount',
    title: '使用次数',
    width: 90,
    sortable: true,
  },
  {
    field: 'creationTime',
    title: '创建时间',
    width: 170,
    slots: { default: 'created' },
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 190,
  },
];

const gridOptions: VxeGridProps<AiTemplateDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async () => {
        const items = await getTemplatesAdmin();
        return { items, totalCount: items.length };
      },
    },
    response: { list: 'items', total: 'totalCount' },
  },
  toolbarConfig: { refresh: true },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

/** 后端返回 UTC 时间（ABP 序列化不带时区标识，如 2026-08-11T09:48:32），补 Z 按 UTC 解析再转本地时区显示 */
function parseApiTime(value: string): Date {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? new Date(value)
    : new Date(`${value}Z`);
}

function formatTime(value?: null | string) {
  if (!value) return '-';
  const date = parseApiTime(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function onDetail(row: AiTemplateDto) {
  detail.value = row;
  showDetail.value = true;
}

function onPromote(row: AiTemplateDto) {
  Modal.confirm({
    centered: true,
    content: `确认将模板「${row.name}」提升为系统内置模板？提升后所有用户均可见，且不再归属原共享者。`,
    onOk: async () => {
      await adminSetSystemTemplate(row.id);
      message.success('已设为系统模板');
      gridApi.query();
    },
  });
}

function onDelete(row: AiTemplateDto) {
  Modal.confirm({
    centered: true,
    content: `确认删除模板「${row.name}」？删除后无法恢复。`,
    onOk: async () => {
      await deleteTemplate(row.id);
      message.success('已删除');
      gridApi.query();
    },
  });
}
</script>

<template>
  <div class="mb-3">
    <div class="text-xl font-semibold">模板管理</div>
    <div class="mt-0.5 text-sm text-gray-500">
      管理全部模板（内置 + 用户共享），可将优质用户模板提升为系统内置模板
    </div>
  </div>

  <Grid>
    <template #cover="{ row }">
      <Image
        v-if="row.coverImageUrl"
        :src="row.coverImageUrl"
        :width="48"
        class="rounded border"
      />
      <span v-else class="text-gray-300">无</span>
    </template>
    <template #source="{ row }">
      <Tag v-if="row.source === 0" color="geekblue">内置</Tag>
      <Tag v-else color="green">用户共享</Tag>
    </template>
    <template #owner="{ row }">
      <span>{{ row.ownerUserName || (row.source === 0 ? '系统' : '-') }}</span>
    </template>
    <template #model="{ row }">
      <span
        class="text-xs"
        :title="row.channelName || row.recommendedModel || ''"
      >
        {{ row.recommendedModelLabel || row.recommendedModel || '-' }}
      </span>
    </template>
    <template #created="{ row }">
      <span>{{ formatTime(row.creationTime) }}</span>
    </template>
    <template #action="{ row }">
      <Button type="link" size="small" @click="onDetail(row)">
        查看提示词
      </Button>
      <Button
        v-if="row.source === 1"
        type="link"
        size="small"
        @click="onPromote(row)"
      >
        设为系统模板
      </Button>
      <Button
        v-if="row.source === 1"
        type="link"
        danger
        size="small"
        @click="onDelete(row)"
      >
        删除
      </Button>
    </template>
  </Grid>

  <a-modal
    v-model:open="showDetail"
    :footer="null"
    centered
    :width="640"
    title="模板详情"
  >
    <div v-if="detail" class="space-y-3 text-sm">
      <div class="flex items-center gap-3">
        <Image
          v-if="detail.coverImageUrl"
          :src="detail.coverImageUrl"
          :width="96"
          class="rounded border"
        />
        <div>
          <div class="font-medium">{{ detail.name }}</div>
          <div class="text-xs text-gray-400">
            {{ detail.category }} · {{ detail.templateId }}
          </div>
        </div>
      </div>
      <div>
        <div class="mb-1 font-medium text-gray-500">提示词模板</div>
        <pre
          class="max-h-56 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs"
          >{{ detail.promptTemplate }}</pre>
      </div>
      <div v-if="detail.promptHint">
        <div class="mb-1 font-medium text-gray-500">输入提示</div>
        <div class="text-xs text-gray-600">{{ detail.promptHint }}</div>
      </div>
      <div>
        <div class="mb-1 font-medium text-gray-500">推荐模型</div>
        <div class="text-xs text-gray-600">
          {{ detail.recommendedModelLabel || detail.recommendedModel || '-' }}
        </div>
      </div>
      <div v-if="detail.channelName">
        <div class="mb-1 font-medium text-gray-500">渠道商</div>
        <div class="text-xs text-gray-600">{{ detail.channelName }}</div>
      </div>
      <div v-if="detail.defaultSize">
        <div class="mb-1 font-medium text-gray-500">默认尺寸</div>
        <div class="text-xs text-gray-600">{{ detail.defaultSize }}</div>
      </div>
      <div v-if="detail.defaultQuality">
        <div class="mb-1 font-medium text-gray-500">默认质量</div>
        <div class="text-xs text-gray-600">{{ detail.defaultQuality }}</div>
      </div>
      <div v-if="detail.printSize">
        <div class="mb-1 font-medium text-gray-500">印刷尺寸</div>
        <div class="text-xs text-gray-600">{{ detail.printSize }}</div>
      </div>
    </div>
  </a-modal>
</template>
