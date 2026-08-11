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
  Image,
  Input,
  message,
  Modal,
  Tag,
  Tooltip,
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
const loadingDetailId = ref<null | string>(null);

/** 消息角色：0=用户 1=AI 2=系统 */
const ROLE_LABELS: Record<number, { color: string; text: string; }> = {
  0: { text: '用户', color: 'blue' },
  1: { text: 'AI', color: 'green' },
  2: { text: '系统', color: 'default' },
};

/** 任务状态：0=待处理 10=处理中 20=成功 30=失败 40=已取消 */
const STATUS_LABELS: Record<number, { color: string; text: string; }> = {
  0: { text: '待处理', color: 'default' },
  10: { text: '处理中', color: 'processing' },
  20: { text: '成功', color: 'success' },
  30: { text: '失败', color: 'error' },
  40: { text: '已取消', color: 'warning' },
};

const columns: VxeGridPropTypes.Columns<AiDesignSessionAdminDto> = [
  {
    type: 'expand',
    width: 50,
    slots: { content: 'content' },
  },
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
  if (
    !force &&
    (detailMap.value[sessionId] || loadingDetailId.value === sessionId)
  ) {
    return;
  }
  loadingDetailId.value = sessionId;
  try {
    // 对话记录由后端按创建时间倒序返回（最新消息在最上面），此处直接存储
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
  const taskId = msg.taskId;
  Modal.confirm({
    centered: true,
    content:
      '将从任务留痕的上游临时图片 URL 重新下载并落库（用于首次落库失败的补偿），确认继续？',
    onOk: async () => {
      try {
        await adminRetryPersistImages(taskId);
        message.success('图片已重新落库');
        await loadDetail(sessionId, true);
      } catch (error: any) {
        message.error(error?.message || '重新落库失败');
      }
    },
  });
}

/** 调用详情全屏弹窗：当前查看的消息 */
const callDetailMsg = ref<AiChatMessageAdminDto | null>(null);
const callDetailOpen = ref(false);
const showFullRequest = ref(false);
const requestHasBase64 = ref(false);
const showFullResponse = ref(false);
const responseHasBase64 = ref(false);

function openCallDetail(msg: AiChatMessageAdminDto) {
  callDetailMsg.value = msg;
  showFullRequest.value = false;
  showFullResponse.value = false;
  requestHasBase64.value = containsBase64(msg.requestPayloadJson);
  responseHasBase64.value = containsBase64(msg.responsePayloadJson);
  callDetailOpen.value = true;
}

function closeCallDetail() {
  callDetailOpen.value = false;
  callDetailMsg.value = null;
}

/** 是否有可展示的调用留痕 */
function hasCallDetail(msg: AiChatMessageAdminDto) {
  return Boolean(
    msg.channelName ||
    msg.channelBaseUrl ||
    msg.requestUrl ||
    msg.requestPayloadJson ||
    msg.responsePayloadJson,
  );
}

function canRetry(msg: AiChatMessageAdminDto) {
  if (!msg.taskId || msg.externalImageUrls.length === 0) return false;
  // 已落库图片且任务成功时无需补偿；失败/取消或未落库时提供重新落库入口
  return (
    msg.generatedImageUrls.length === 0 ||
    msg.taskStatus === 30 ||
    msg.taskStatus === 40
  );
}

function isBase64Text(value: string) {
  if (/^data:image\//i.test(value)) return true;
  return value.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(value);
}

function containsBase64(json?: null | string) {
  if (!json) return false;
  try {
    const obj = JSON.parse(json);
    const walk = (node: any): boolean => {
      if (typeof node === 'string') return isBase64Text(node);
      if (Array.isArray(node)) return node.some((n) => walk(n));
      if (node && typeof node === 'object')
        return Object.values(node).some((n) => walk(n));
      return false;
    };
    return walk(obj);
  } catch {
    return false;
  }
}

function maskBase64Json(json?: null | string) {
  if (!json) return '';
  try {
    const obj = JSON.parse(json);
    const walk = (node: any): any => {
      if (typeof node === 'string')
        return isBase64Text(node) ? '[base64]' : node;
      if (Array.isArray(node)) return node.map((n) => walk(n));
      if (node && typeof node === 'object') {
        const out: Record<string, any> = {};
        for (const [key, value] of Object.entries(node)) out[key] = walk(value);
        return out;
      }
      return node;
    };
    return JSON.stringify(walk(obj), null, 2);
  } catch {
    return json;
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制');
  } catch {
    // 剪贴板 API 不可用时回退到 textarea 复制
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    message.success('已复制');
  }
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
  if (ms === null || ms === undefined) return '-';
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
        管理所有用户的 AI
        设计会话，按保留天数策略自动清理；展开可查看完整对话记录与 API 调用留痕
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

    <template #content="{ row }">
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
            <span class="text-gray-500">{{
              formatTime(msg.creationTime)
            }}</span>
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
              v-if="hasCallDetail(msg)"
              size="small"
              type="link"
              class="ml-2.5"
              @click="openCallDetail(msg)"
            >
              调用详情
            </Button>
            <Button
              v-if="canRetry(msg)"
              size="small"
              type="link"
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
              <span class="font-medium">优化提示词：</span
              >{{ msg.optimizedPrompt }}
            </div>
          </div>

          <!-- 已落库图片缩略图 -->
          <div
            v-if="msg.generatedImageUrls.length"
            class="mt-2 flex flex-wrap gap-2"
          >
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

          <!-- 完整请求 URL（排查 bug 用） -->
          <div
            v-if="msg.requestUrl"
            class="mt-2 flex items-center gap-1 text-xs"
          >
            <span class="shrink-0 font-medium text-gray-500">请求 URL：</span>
            <a
              :href="msg.requestUrl"
              target="_blank"
              rel="noopener"
              class="min-w-0 flex-1 truncate text-blue-500 underline-offset-2 hover:underline"
              :title="msg.requestUrl"
              >{{ msg.requestUrl }}</a
            >
            <Button size="small" type="link" @click="copyText(msg.requestUrl!)">
              复制
            </Button>
          </div>
        </div>
      </div>
      <div v-else class="py-4 text-center text-sm text-gray-400">
        暂无对话记录
      </div>
    </template>
  </Grid>

  <!-- 调用详情：全屏分栏弹窗（左=概览+请求参数，右=上游响应体），用于排查失败/质量/尺寸问题 -->
  <Modal
    v-model:open="callDetailOpen"
    :footer="null"
    width="100vw"
    wrap-class-name="call-detail-modal"
    :mask="false"
    :closable="false"
    @cancel="closeCallDetail"
  >
    <template v-if="callDetailMsg">
      <div class="call-detail-header">
        <div class="call-detail-title">
          <span>调用详情</span>
          <span class="call-detail-sub">
            {{
              callDetailMsg.taskStatus !== null &&
              callDetailMsg.taskStatus !== undefined
                ? STATUS_LABELS[callDetailMsg.taskStatus]?.text ||
                  callDetailMsg.taskStatus
                : ''
            }}
          </span>
        </div>
        <Tooltip title="关闭（Esc）">
          <Button type="text" @click="closeCallDetail">关闭</Button>
        </Tooltip>
      </div>

      <div class="call-detail-grid">
        <!-- 左栏：概览 + 请求参数 -->
        <div class="call-detail-col">
          <div class="call-detail-overview">
            <div class="call-detail-item">
              <span class="call-detail-label">模型</span>
              <span class="call-detail-value">
                {{ callDetailMsg.modelUsed || '-' }}
                <span v-if="callDetailMsg.channelName" class="text-gray-400">
                  （{{ callDetailMsg.channelName }}）
                </span>
              </span>
            </div>
            <div class="call-detail-item">
              <span class="call-detail-label">Base URL</span>
              <span
                class="call-detail-value"
                :title="callDetailMsg.channelBaseUrl || ''"
                >{{ callDetailMsg.channelBaseUrl || '-' }}</span
              >
            </div>
            <div class="call-detail-item">
              <span class="call-detail-label">请求 URL</span>
              <a
                v-if="callDetailMsg.requestUrl"
                :href="callDetailMsg.requestUrl"
                target="_blank"
                rel="noopener"
                class="call-detail-value call-detail-link"
                :title="callDetailMsg.requestUrl"
                >{{ callDetailMsg.requestUrl }}</a
              >
              <span v-else class="call-detail-value">-</span>
              <Button
                v-if="callDetailMsg.requestUrl"
                size="small"
                type="link"
                @click="copyText(callDetailMsg.requestUrl!)"
                >
复制
</Button
              >
            </div>
            <div class="call-detail-item">
              <span class="call-detail-label">耗时 / Tokens / 金额</span>
              <span class="call-detail-value">
                {{
                  callDetailMsg.durationMs != null
                    ? formatDuration(callDetailMsg.durationMs)
                    : '-'
                }}
                <template v-if="callDetailMsg.totalTokens != null">
                  · {{ callDetailMsg.totalTokens }} tokens
                </template>
                <template v-if="callDetailMsg.chargedAmount">
                  · ¥{{ callDetailMsg.chargedAmount }}
                </template>
              </span>
            </div>
            <div v-if="callDetailMsg.errorMessage" class="call-detail-error">
              {{ callDetailMsg.errorMessage }}
            </div>
          </div>

          <div class="call-detail-pane">
            <div class="call-detail-pane-title">
              <span>
                最终调用 API 请求参数（发送前一刻的原始报文）
                <span class="call-detail-note">RequestPayloadJson</span>
              </span>
              <div class="flex items-center gap-1">
                <Button
                  v-if="requestHasBase64"
                  size="small"
                  type="link"
                  @click="showFullRequest = !showFullRequest"
                  >
{{
                    showFullRequest ? '收起完整内容' : '显示完整 base64'
                  }}
</Button
                >
                <Button
                  v-if="callDetailMsg.requestPayloadJson"
                  size="small"
                  type="link"
                  @click="copyText(callDetailMsg.requestPayloadJson!)"
                  >
复制
</Button
                >
              </div>
            </div>
            <pre
              v-if="callDetailMsg.requestPayloadJson"
              class="call-detail-pre"
              >{{
                showFullRequest
                  ? formatJson(callDetailMsg.requestPayloadJson)
                  : maskBase64Json(callDetailMsg.requestPayloadJson)
              }}</pre>
            <div v-else class="call-detail-empty">无请求参数留痕</div>
          </div>
        </div>

        <!-- 右栏：上游返回响应体 -->
        <div class="call-detail-col">
          <div class="call-detail-pane">
            <div class="call-detail-pane-title">
              <span>
                上游返回响应体
                <span class="call-detail-note">ResponsePayloadJson</span>
              </span>
              <div class="flex items-center gap-1">
                <Button
                  v-if="responseHasBase64"
                  size="small"
                  type="link"
                  @click="showFullResponse = !showFullResponse"
                  >
{{
                    showFullResponse ? '收起完整内容' : '显示完整 base64'
                  }}
</Button
                >
                <Button
                  v-if="callDetailMsg.responsePayloadJson"
                  size="small"
                  type="link"
                  @click="copyText(callDetailMsg.responsePayloadJson!)"
                  >
复制
</Button
                >
              </div>
            </div>
            <pre
              v-if="callDetailMsg.responsePayloadJson"
              class="call-detail-pre"
              >{{
                showFullResponse
                  ? formatJson(callDetailMsg.responsePayloadJson)
                  : maskBase64Json(callDetailMsg.responsePayloadJson)
              }}</pre>
            <div v-else class="call-detail-empty">无响应体留痕</div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
:global(.call-detail-modal) {
  --cd-text: rgb(0 0 0 / 85%);
  --cd-text-2: rgb(0 0 0 / 45%);
  --cd-text-3: rgb(0 0 0 / 35%);
  --cd-border: rgb(0 0 0 / 8%);
  --cd-bg-subtle: rgb(0 0 0 / 3%);
  --cd-primary: #1677ff;
  --cd-primary-bg: rgb(22 119 255 / 10%);
  --cd-error: #cf1322;
  --cd-error-bg: rgb(255 77 79 / 8%);
}

:global(.dark .call-detail-modal) {
  --cd-text: rgb(255 255 255 / 88%);
  --cd-text-2: rgb(255 255 255 / 58%);
  --cd-text-3: rgb(255 255 255 / 42%);
  --cd-border: rgb(255 255 255 / 12%);
  --cd-bg-subtle: rgb(255 255 255 / 6%);
  --cd-primary: #4d9fff;
  --cd-primary-bg: rgb(77 159 255 / 16%);
  --cd-error: #ff7875;
  --cd-error-bg: rgb(255 120 117 / 14%);
}

:global(.call-detail-modal .ant-modal) {
  top: 0;
  max-width: 100vw;
  height: 100vh;
  padding-bottom: 0;
  margin: 0;
}

:global(.call-detail-modal .ant-modal-content) {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0;
  overflow: hidden;
  border-radius: 0;
}

:global(.call-detail-modal .ant-modal-body) {
  flex: 1;
  height: 0;
  padding: 0;
  overflow: hidden;
}

.call-detail-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--cd-border);
}

.call-detail-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
}

.call-detail-sub {
  padding: 1px 8px;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--cd-primary);
  background: var(--cd-primary-bg);
  border-radius: 999px;
}

.call-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  height: 100%;
  padding: 12px;
  overflow: hidden;
}

.call-detail-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.call-detail-overview {
  flex-shrink: 0;
  padding: 10px 12px;
  background: var(--cd-bg-subtle);
  border: 1px solid var(--cd-border);
  border-radius: 8px;
}

.call-detail-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 3px 0;
  font-size: 0.78rem;
}

.call-detail-label {
  flex-shrink: 0;
  width: 76px;
  color: var(--cd-text-2);
}

.call-detail-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--cd-text);
  word-break: break-all;
}

.call-detail-link {
  color: var(--cd-primary);
}

.call-detail-error {
  padding: 6px 8px;
  margin-top: 4px;
  font-size: 0.74rem;
  color: var(--cd-error);
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--cd-error-bg);
  border-radius: 6px;
}

.call-detail-pane {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.call-detail-pane-title {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 6px 2px;
  font-size: 0.8rem;
  font-weight: 600;
}

.call-detail-note {
  margin-left: 6px;
  font-size: 0.66rem;
  font-weight: 400;
  color: var(--cd-text-3);
}

.call-detail-pre {
  flex: 1;
  padding: 10px;
  margin: 0;
  overflow: auto;
  font-size: 0.72rem;
  line-height: 1.55;
  color: var(--cd-text);
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--cd-bg-subtle);
  border: 1px solid var(--cd-border);
  border-radius: 8px;
}

.call-detail-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 0.78rem;
  color: var(--cd-text-3);
}
</style>
