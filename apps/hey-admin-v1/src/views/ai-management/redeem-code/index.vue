<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { AiGenerateRedeemCodeInput, AiRedeemCodeDto } from '#/api/ai-design';

import { reactive, ref } from 'vue';

import { useVbenVxeGrid } from '@abp/ui';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Tag,
} from 'ant-design-vue';

import { useAiDesignApi } from '#/api/ai-design';

defineOptions({ name: 'AiDesignRedeemCodeManagement' });

const { disableRedeemCode, generateRedeemCodes, getRedeemCodes } =
  useAiDesignApi();

function statusInfo(row: AiRedeemCodeDto): { color: string; label: string } {
  if (row.status === 0) {
    if (row.expireAt && new Date(row.expireAt).getTime() < Date.now()) {
      return { color: 'default', label: '已过期' };
    }
    return { color: 'blue', label: '未使用' };
  }
  if (row.status === 10) {
    return { color: 'green', label: '已使用' };
  }
  return { color: 'red', label: '已禁用' };
}

const columns: VxeGridPropTypes.Columns<AiRedeemCodeDto> = [
  {
    field: 'code',
    minWidth: 180,
    slots: { default: 'code' },
    title: '充值码',
  },
  { field: 'batchNo', title: '批次', width: 110 },
  {
    field: 'faceValue',
    slots: { default: 'faceValue' },
    title: '面值（¥）',
    width: 90,
  },
  {
    field: 'status',
    slots: { default: 'status' },
    title: '状态',
    width: 90,
  },
  {
    field: 'expireAt',
    formatter: 'formatDateTime',
    title: '有效期',
    width: 170,
  },
  { field: 'redeemedByUserId', title: '兑换用户', minWidth: 150 },
  {
    field: 'redeemedAt',
    formatter: 'formatDateTime',
    title: '兑换时间',
    width: 170,
  },
  { field: 'remark', title: '备注', minWidth: 120 },
  {
    field: 'creationTime',
    formatter: 'formatDateTime',
    title: '创建时间',
    width: 170,
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 80,
  },
];

const gridOptions: VxeGridProps<AiRedeemCodeDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async ({ page }) =>
        await getRedeemCodes({
          maxResultCount: page.pageSize,
          skipCount: (page.currentPage - 1) * page.pageSize,
        }),
    },
    response: { list: 'items', total: 'totalCount' },
  },
  toolbarConfig: { refresh: true },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

// ---- 批量生成弹窗 ----
const genVisible = ref(false);
const genSubmitting = ref(false);
const genForm = reactive<{
  batchNo?: string;
  count?: number;
  expireAt?: string;
  faceValue?: number;
  remark?: string;
}>({});
const genResult = ref<null | AiRedeemCodeDto[]>(null);

function openGenerate() {
  genForm.count = 10;
  genForm.faceValue = undefined;
  genForm.expireAt = undefined;
  genForm.batchNo = undefined;
  genForm.remark = undefined;
  genResult.value = null;
  genVisible.value = true;
}

async function onGenerate() {
  if (!genForm.count || genForm.count < 1 || genForm.count > 10_000) {
    message.warning('生成数量需在 1-10000 之间');
    return;
  }
  if (!genForm.faceValue || genForm.faceValue <= 0) {
    message.warning('请输入面值（>0）');
    return;
  }
  genSubmitting.value = true;
  try {
    const input: AiGenerateRedeemCodeInput = {
      batchNo: genForm.batchNo || null,
      count: genForm.count,
      expireAt: genForm.expireAt
        ? new Date(genForm.expireAt).toISOString()
        : null,
      faceValue: genForm.faceValue,
      remark: genForm.remark || null,
    };
    const codes = await generateRedeemCodes(input);
    genResult.value = codes;
    message.success(`已生成 ${codes.length} 个充值码`);
    gridApi.query();
  } catch (error: any) {
    message.error(error?.message || '生成失败');
  } finally {
    genSubmitting.value = false;
  }
}

function copyCodes() {
  const codes = genResult.value;
  if (!codes || codes.length === 0) {
    return;
  }
  const text = codes.map((c) => c.code).join('\n');
  navigator.clipboard
    .writeText(text)
    .then(() => message.success(`已复制全部 ${codes.length} 个码`))
    .catch(() => message.error('复制失败，请手动选择复制'));
}

// ---- 禁用 ----
function onDisable(row: AiRedeemCodeDto) {
  Modal.confirm({
    cancelText: '取消',
    content: `确定禁用充值码「${row.code}」吗？禁用后不可再兑换。`,
    okButtonProps: { danger: true },
    okText: '禁用',
    onOk: async () => {
      try {
        await disableRedeemCode(row.id);
        message.success('已禁用');
        gridApi.query();
      } catch (error: any) {
        message.error(error?.message || '禁用失败');
      }
    },
    title: '禁用充值码',
  });
}
</script>

<template>
  <div class="mb-3 flex items-center justify-between">
    <div>
      <div class="text-xl font-semibold">充值码管理</div>
      <div class="mt-0.5 text-sm text-gray-500">
        批量生成充值码，用户凭码在 C 端「兑换」入口充值余额（无在线支付前的收款方式）。
      </div>
    </div>
    <Button type="primary" @click="openGenerate">批量生成</Button>
  </div>

  <Grid>
    <template #code="{ row }">
      <span class="font-mono">{{ row.code }}</span>
    </template>
    <template #faceValue="{ row }">
      <span class="font-semibold text-orange-600 dark:text-orange-400">
        ¥{{ row.faceValue }}
      </span>
    </template>
    <template #status="{ row }">
      <Tag :color="statusInfo(row).color">{{ statusInfo(row).label }}</Tag>
    </template>
    <template #action="{ row }">
      <Button
        v-if="row.status === 0"
        type="link"
        danger
        size="small"
        block
        @click="onDisable(row)"
      >
        禁用
      </Button>
    </template>
  </Grid>

  <Modal
    v-model:open="genVisible"
    :confirm-loading="genSubmitting"
    :footer="null"
    title="批量生成充值码"
  >
    <template v-if="!genResult">
      <Form layout="vertical">
        <div class="grid grid-cols-2 gap-3">
          <Form.Item label="生成数量">
            <InputNumber
              v-model:value="genForm.count"
              :min="1"
              :max="10000"
              :precision="0"
              class="w-full"
            />
          </Form.Item>
          <Form.Item label="面值（¥）">
            <InputNumber
              v-model:value="genForm.faceValue"
              :min="0.01"
              :precision="2"
              class="w-full"
              placeholder="如 10"
            />
          </Form.Item>
        </div>
        <Form.Item label="有效期（留空 = 永不过期）">
          <Input
            v-model:value="genForm.expireAt"
            type="datetime-local"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="批次号（留空自动生成）">
          <Input
            v-model:value="genForm.batchNo"
            placeholder="如 2026-08-11 首单"
          />
        </Form.Item>
        <Form.Item label="备注">
          <Input v-model:value="genForm.remark" placeholder="如：微信转账 xx 元" />
        </Form.Item>
      </Form>
      <div class="mt-2 flex justify-end gap-2">
        <Button @click="genVisible = false">取消</Button>
        <Button type="primary" :loading="genSubmitting" @click="onGenerate">
          生成
        </Button>
      </div>
    </template>
    <template v-else>
      <div class="mb-2 text-sm text-gray-500">
        已生成 {{ genResult.length }} 个码，面值 ¥{{ genForm.faceValue }}；复制后发给客户兑换。
      </div>
      <Input.TextArea
        :value="genResult.map((c) => c.code).join('\n')"
        :rows="10"
        read-only
        class="font-mono"
      />
      <div class="mt-2 flex justify-end gap-2">
        <Button @click="genVisible = false">关闭</Button>
        <Button type="primary" @click="copyCodes">复制全部</Button>
      </div>
    </template>
  </Modal>
</template>
