<script setup lang="ts">
import type { VxeGridListeners, VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type {
  AiChatMessageAdminDto,
  AiDesignSessionAdminDto,
  AiDesignSessionDetailDto,
} from '#/api/ai-design';

import { ref } from 'vue';

import { useVbenVxeGrid } from '@abp/ui';
import {
  Button,
  Collapse,
  Image,
  Input,
  message,
  Modal,
  Tag,
} from 'ant-design-vue';

import { useAiDesignApi } from '#/api/ai-design';

defineOptions({ name: 'AiDesignSessionManagement' });

const {
  adminRetryPersistImages,
  deleteSession,
  getSessionDetail,
  getSessions,
} = useAiDesignApi();

const filter = ref('');
const detailMap = ref<Record<string, AiDesignSessionDetailDto>>({});
const loadingDetailId = ref<string | null>(null);

/** 消息角色：0=用户 1=AI 2=系统 */
const ROLE_LABELS: Record<number, { text: string; color: string }> = {
  0: { text: '用户', color: 'blue' },
  1: { text: 'AI', color: 'green' },
  2: { text: '系统', color: 'default' },
};

/** 任务状态：0=待处理 10=处理中 20=成功 30=失败 40=已取消 */
const STATUS_LABELS: Record<number, { text: string; color: string }> = {
  0: { text: '待处理', color: 'default' },
  10: { text: '处理中', color: 'processing' },
  20: { text: '成功', color: 'success' },
  30: { text: '失败', color: 'error' },
  40: { text: '已取消', color: 'warning' },
};

const columns: VxeGridPropTypes.Columns<AiDesignSessionAdminDto> = [
  { type: 'expand', width: 50 },
  { field: 'title', title: '标题', minWidth: 200 },
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

const gridEvents: VxeGridListeners<AiDesignSessionAdminDto> = {
  toggleRowExpand: ({ row, expanded }) => {
    if (expanded) {
      void loadDetail(row.id);
    }
  },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridEvents, gridOptions });

function onSearch() {
  detailMap.value = {};
  gridApi.query();
}

async function loadDetail(sessionId: string, force = false) {
  if (!force && (detailMap.value[sessionId] || loadingDetailId.value === sessionId)) {
    return;
  }
  loadingDetailId.value = sessionId;
  try {
    const detail = await getSessionDetail(sessionId);
    detailMap.value = { ...detailMap.value, [sessionId]: detail };
  } catch {
    message.error('加载对话详情失败，请稍后重试');
  } finally {
    loadingDetailId.value = null;
  }
}

function onDelete(record: AiDesignSessionAdminDto) {
  Modal.confirm({
    centered: true,
    content: `确认删除会话「${record.title}」？其对话消息与生成记录将一并删除，删除后无法恢复。`,
    onOk: async () => {
      await deleteSession(record.id);
      message.success('已删除');
      delete detailMap.value[record.id];
      gridApi.query();
    },
  });
}

function onRetryPersist(msg: AiChatMessageAdminDto, sessionId: string) {
  if (!msg.taskId) return;
  Modal.confirm({
    centered: true,
    content:
      '将从任务留痕的上游临时图片 URL 重新下载并落库（用于首次落库失败的补偿），确认继续？',
    onOk: async () => {
      try {
        await adminRetryPersistImages(msg.taskId!);
        message.success('图片已重新落库');
        await loadDetail(sessionId, true);
      } catch (error: any) {
        message.error(error?.message || '重新落库失败');
      }
    },
  });
}

function canRetry(msg: AiChatMessageAdminDto) {
  if (!msg.taskId || !msg.externalImageUrls.length) return false;
  // 已落库图片且任务成功时无需补偿；失败/取消或未落库时提供重新落库入口
  return (
    !msg.generatedImageUrls.length ||
    msg.taskStatus === 30 ||
    msg.taskStatus === 40
  );
}

function formatJson(json?: null | string) {
  if (!json) return '';
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

function formatDuration(ms?: null | number) {
  if (ms == null) return '-';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function formatTime(value?: null | string) {
  if (!value) return '-';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
</script>

<template>
  <div class="mb-3 flex items-center justify-between">
    <div>
      <div class="text-xl font-semibold">对话历史</div>
      <div class="mt-0.5 text-sm text-gray-500">
        管理所有用户的 AI 设计会话，按保留天数策略自动清理；展开可查看完整对话记录与 API 调用留痕
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
      <Tag v-if="row.retentionDays" color="blue">
        {{ row.retentionDays }} 天
      </Tag>
      <Tag v-else color="default">跟随全局</Tag>
    </template>
    <template #action="{ row }">
      <Button type="link" danger size="small" block @click="onDelete(row)">
        删除
      </Button>
    </template>

    <template #expand="{ row }">
      <div
        v-if="loadingDetailId === row.id"
        class="flex items-center justify-center gap-2 py-6 text-sm text-gray-400"
      >
        加载对话详情…
      </div>
      <div v-else-if="detailMap[row.id]" class="py-2 pr-2">
        <div
          class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2"
        >
          <span class="text-sm font-medium">
            对话记录（{{ detailMap[row.id]?.messages.length ?? 0 }} 条）
          </span>
          <span class="text-xs text-gray-400">
            {{ detailMap[row.id]?.userName || '访客' }} · 创建于
            {{ formatTime(detailMap[row.id]?.creationTime) }}
          </span>
        </div>

        <div
          v-if="(detailMap[row.id]?.messages.length ?? 0) === 0"
          class="py-4 text-center text-sm text-gray-400"
        >
          暂无对话记录
        </div>

        <div
          v-for="msg in detailMap[row.id]?.messages ?? []"
          :key="msg.id"
          class="mb-3 rounded border border-dashed border-gray-300 p-3"
        >
          <!-- 消息头部：角色 / 时间 / 模型 / 状态 / 耗时 / 金额 -->
          <div class="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <Tag :color="ROLE_LABELS[msg.role]?.color || 'default'">
              {{ ROLE_LABELS[msg.role]?.text || '未知' }}
            </Tag>
            <span class="text-gray-500">{{ formatTime(msg.creationTime) }}</span>
            <Tag v-if="msg.modelUsed" color="geekblue">
              模型：{{ msg.modelUsed }}
            </Tag>
            <Tag
              v-if="msg.taskStatus !== null && msg.taskStatus !== undefined"
              :color="STATUS_LABELS[msg.taskStatus]?.color || 'default'"
            >
              {{ STATUS_LABELS[msg.taskStatus]?.text || msg.taskStatus }}
            </Tag>
            <span v-if="msg.durationMs != null" class="text-gray-500">
              耗时 {{ formatDuration(msg.durationMs) }}
            </span>
            <span v-if="msg.totalTokens != null" class="text-gray-500">
              Tokens：{{ msg.totalTokens }}
            </span>
            <span v-if="msg.chargedAmount" class="font-medium text-orange-500">
              ¥{{ msg.chargedAmount }}
            </span>
            <Button
              v-if="canRetry(msg)"
              size="small"
              type="link"
              class="ml-auto"
              @click="onRetryPersist(msg, row.id)"
            >
              重新落库
            </Button>
          </div>

          <!-- 消息正文 -->
          <div
            v-if="msg.role === 1 && msg.textResult"
            class="mb-2 whitespace-pre-wrap text-sm"
          >
            {{ msg.textResult }}
          </div>
          <div v-else-if="msg.content" class="mb-2 whitespace-pre-wrap text-sm">
            {{ msg.content }}
          </div>
          <div
            v-if="msg.errorMessage"
            class="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-500"
          >
            {{ msg.errorMessage }}
          </div>

          <!-- 原始 / 优化提示词 -->
          <div v-if="msg.prompt || msg.optimizedPrompt" class="mb-1 text-xs">
            <div v-if="msg.prompt" class="text-gray-500">
              <span class="font-medium">原始提示词：</span>{{ msg.prompt }}
            </div>
            <div v-if="msg.optimizedPrompt" class="text-gray-400">
              <span class="font-medium">优化提示词：</span>{{ msg.optimizedPrompt }}
            </div>
          </div>

          <!-- 已落库图片缩略图 -->
          <div v-if="msg.generatedImageUrls.length" class="mt-2 flex flex-wrap gap-2">
            <Image
              v-for="url in msg.generatedImageUrls"
              :key="url"
              :src="url"
              :width="88"
              class="rounded border"
            />
          </div>

          <!-- 上游临时图片 URL（未落库） -->
          <div v-if="msg.externalImageUrls.length" class="mt-2 text-xs">
            <div class="mb-1 font-medium text-gray-500">
              上游临时图片 URL（落库失败时用于重新落库）
            </div>
            <div
              v-for="url in msg.externalImageUrls"
              :key="url"
              class="truncate text-blue-500"
            >
              <a :href="url" target="_blank" rel="noopener">{{ url }}</a>
            </div>
          </div>

          <!-- API 调用留痕 -->
          <Collapse
            v-if="msg.requestPayloadJson || msg.responsePayloadJson"
            ghost
            class="mt-2"
          >
            <Collapse.Panel
              v-if="msg.requestPayloadJson"
              key="req"
              header="最终调用 API 请求参数 (JSON)"
            >
              <pre
                class="max-h-64 overflow-auto rounded bg-gray-100 p-2 text-xs"
              >{{ formatJson(msg.requestPayloadJson) }}</pre>
            </Collapse.Panel>
            <Collapse.Panel
              v-if="msg.responsePayloadJson"
              key="res"
              header="上游返回响应体 (JSON)"
            >
              <pre
                class="max-h-64 overflow-auto rounded bg-gray-100 p-2 text-xs"
              >{{ formatJson(msg.responsePayloadJson) }}</pre>
            </Collapse.Panel>
          </Collapse>
        </div>
      </div>
      <div v-else class="py-4 text-center text-sm text-gray-400">
        暂无对话记录
      </div>
    </template>
  </Grid>
</template>
