<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { AiWalletDto } from '#/api/ai-design';

import { reactive, ref } from 'vue';

import { useVbenVxeGrid } from '@abp/ui';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
} from 'ant-design-vue';

import { useAiDesignApi } from '#/api/ai-design';

defineOptions({ name: 'AiDesignWalletManagement' });

const { getWallets, rechargeWallet } = useAiDesignApi();

const query = reactive<{ filter?: string }>({ filter: undefined });

const columns: VxeGridPropTypes.Columns<AiWalletDto> = [
  { field: 'userName', title: '用户', minWidth: 140 },
  {
    field: 'balance',
    title: '余额',
    width: 120,
    slots: { default: 'balance' },
  },
  { field: 'totalCharged', title: '累计充值', width: 120 },
  { field: 'totalRefunded', title: '累计消费', width: 120 },
  { field: 'unitPrice', title: '单价/张', width: 100 },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 90,
  },
];

const gridOptions: VxeGridProps<AiWalletDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        return await getWallets({
          filter: query.filter || undefined,
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

// ---- 充值弹窗 ----
const rechargeVisible = ref(false);
const rechargeForm = reactive<{
  amount?: number;
  reason?: string;
  userId?: string;
  userName?: string;
}>({});
const rechargeSubmitting = ref(false);

function onRecharge(record: AiWalletDto) {
  rechargeForm.amount = undefined;
  rechargeForm.reason = undefined;
  rechargeForm.userId = record.userId;
  rechargeForm.userName = record.userName || '';
  rechargeVisible.value = true;
}

async function onRechargeSubmit() {
  if (
    !rechargeForm.userId ||
    !rechargeForm.amount ||
    rechargeForm.amount <= 0
  ) {
    message.warning('请输入有效充值金额');
    return;
  }
  rechargeSubmitting.value = true;
  try {
    await rechargeWallet({
      amount: rechargeForm.amount,
      reason: rechargeForm.reason || null,
      userId: rechargeForm.userId,
    });
    message.success('充值成功');
    rechargeVisible.value = false;
    gridApi.query();
  } catch (error: any) {
    message.error(error?.message || '充值失败');
  } finally {
    rechargeSubmitting.value = false;
  }
}

function onSearch() {
  gridApi.query();
}
</script>

<template>
  <div class="mb-3 flex items-center justify-between">
    <div>
      <div class="text-xl font-semibold">钱包管理</div>
      <div class="mt-0.5 text-sm text-gray-500">
        用户钱包余额、充值记录；AI 生图按单价扣费，余额不足时拒绝生成
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Input
        v-model:value="query.filter"
        allow-clear
        class="w-48"
        placeholder="用户名"
        @press-enter="onSearch"
      />
      <Button type="primary" @click="onSearch">查询</Button>
    </div>
  </div>

  <Grid>
    <template #balance="{ row }">
      <span class="font-semibold text-green-600 dark:text-green-400">
        ¥{{ row.balance }}
      </span>
    </template>
    <template #action="{ row }">
      <Button type="link" size="small" block @click="onRecharge(row)"
        >
充值
</Button
      >
    </template>
  </Grid>

  <Modal
    v-model:open="rechargeVisible"
    :confirm-loading="rechargeSubmitting"
    title="人工充值"
    @ok="onRechargeSubmit"
  >
    <Form layout="vertical">
      <Form.Item label="用户">
        <Input :value="rechargeForm.userName" disabled />
      </Form.Item>
      <Form.Item label="充值金额（¥）">
        <InputNumber
          v-model:value="rechargeForm.amount"
          :min="0"
          :precision="2"
          class="w-full"
          placeholder="输入充值金额"
        />
      </Form.Item>
      <Form.Item label="备注">
        <Input
          v-model:value="rechargeForm.reason"
          placeholder="如：活动赠送 / 线下收款"
        />
      </Form.Item>
    </Form>
  </Modal>
</template>
