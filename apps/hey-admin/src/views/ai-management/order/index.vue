<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { AiOrderDto } from '#/api/ai-design';


import { reactive, ref } from 'vue';

import { useVbenVxeGrid } from '@abp/ui';
import { Descriptions, message, Modal, Select } from 'ant-design-vue';

import {
  AiOrderPaymentStatusLabels,
  AiOrderStatus,
  AiOrderStatusLabels,
  useAiDesignApi,
} from '#/api/ai-design';

defineOptions({ name: 'AiDesignOrderManagement' });

const { getOrders, updateOrderStatus, markOrderPaid } = useAiDesignApi();

const columns: VxeGridPropTypes.Columns<AiOrderDto> = [
  { field: 'orderNo', title: '订单号', minWidth: 150 },
  { field: 'quoteNo', title: '来源报价', minWidth: 150 },
  { field: 'contact', title: '联系方式', minWidth: 140 },
  { field: 'totalAmount', title: '金额（¥）', width: 110 },
  {
    field: 'paymentStatusLabel',
    slots: { default: 'payment' },
    title: '支付',
    width: 100,
  },
  {
    field: 'statusLabel',
    slots: { default: 'status' },
    title: '状态',
    width: 100,
  },
  { field: 'creationTime', title: '下单时间', minWidth: 170 },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 260,
  },
];

const gridOptions: VxeGridProps<AiOrderDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async ({ page }) =>
        await getOrders({
          maxResultCount: page.pageSize,
          skipCount: (page.currentPage - 1) * page.pageSize,
        }),
    },
    response: { list: 'items', total: 'totalCount' },
  },
  toolbarConfig: { refresh: true },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

// ---- 订单明细 ----
const detailVisible = ref(false);
const detailOrder = ref<AiOrderDto | null>(null);

function showDetail(row: AiOrderDto) {
  detailOrder.value = row;
  detailVisible.value = true;
}

// ---- 状态流转 ----
const updatingId = ref<null | string>(null);
const updateStatus = reactive<{ value: AiOrderStatus | undefined }>({
  value: undefined,
});

function currentStatus(order: AiOrderDto): number {
  return order.status;
}

async function onStatusChange(order: AiOrderDto) {
  const target = updateStatus.value;
  if (target === undefined || target === null) return;

  if (target === AiOrderStatus.Canceled) {
    Modal.confirm({
      content: `确认取消订单 ${order.orderNo}？`,
      okText: '取消订单',
      okType: 'danger',
      onOk: async () => {
        await doUpdate(order.id, target);
      },
    });
    updateStatus.value = undefined;
    return;
  }

  if (target === currentStatus(order)) {
    message.info('状态未变化');
    updateStatus.value = undefined;
    return;
  }

  const label = AiOrderStatusLabels[target] || '未知';
  Modal.confirm({
    content: `将订单 ${order.orderNo} 流转为「${label}」？`,
    okText: '确认',
    onOk: async () => {
      await doUpdate(order.id, target);
    },
  });
  updateStatus.value = undefined;
}

async function doUpdate(id: string, status: AiOrderStatus) {
  updatingId.value = id;
  try {
    await updateOrderStatus(id, { status });
    message.success('订单状态已更新');
    await gridApi.reload();
  } catch (error) {
    message.error((error as Error)?.message || '更新失败');
  } finally {
    updatingId.value = null;
  }
}

// ---- 标记已收款（线下转账） ----
const markingId = ref<null | string>(null);

async function onMarkPaid(row: AiOrderDto) {
  Modal.confirm({
    content: `确认已收到订单 ${row.orderNo} 的线下转账（¥${row.totalAmount}）？`,
    okText: '确认已收款',
    onOk: async () => {
      markingId.value = row.id;
      try {
        await markOrderPaid(row.id);
        message.success('已标记收款，订单可进入制作');
        await gridApi.reload();
      } catch (error) {
        message.error((error as Error)?.message || '操作失败');
      } finally {
        markingId.value = null;
      }
    },
  });
}

/** 未支付订单不可进入制作 */
function canStartProduction(row: AiOrderDto): boolean {
  return row.paymentStatus === 10;
}
</script>

<template>
  <div>
    <Grid>
      <template #payment="{ row }">
        <a-tag
          :color="
            row.paymentStatus === 10
              ? 'green'
              : row.paymentStatus === 40
                ? 'orange'
                : 'default'
          "
        >
          {{
            row.paymentStatusLabel ||
            AiOrderPaymentStatusLabels[row.paymentStatus] ||
            '未支付'
          }}
        </a-tag>
      </template>

      <template #status="{ row }">
        <a-tag
          :color="
            row.status === 3 ? 'green' : row.status === 4 ? 'default' : 'blue'
          "
        >
          {{ row.statusLabel || AiOrderStatusLabels[row.status] || '未知' }}
        </a-tag>
      </template>

      <template #action="{ row }">
        <div class="flex items-center gap-2">
          <a-button
            v-if="row.paymentStatus === 0 && row.status === 0"
            :loading="markingId === row.id"
            type="primary"
            size="small"
            @click="onMarkPaid(row)"
          >
            标记已收款
          </a-button>
          <Select
            v-if="row.status !== 3 && row.status !== 4"
            class="w-36"
            :value="undefined"
            :options="[
              {
                label: '进入制作',
                value: 1,
                disabled: !canStartProduction(row),
              },
              { label: '待安装', value: 2 },
              { label: '完成', value: 3 },
              { label: '取消订单', value: 4 },
            ]"
            placeholder="流转状态"
            @change="
              updateStatus.value = $event as AiOrderStatus;
              onStatusChange(row);
            "
          />
          <span v-else class="text-gray-400 text-xs">已结束</span>
          <a-button type="link" @click="showDetail(row)">明细</a-button>
        </div>
      </template>
    </Grid>

    <a-modal
      v-model:open="detailVisible"
      :footer="null"
      :title="detailOrder ? `订单 ${detailOrder.orderNo}` : '订单明细'"
      width="720px"
    >
      <template v-if="detailOrder">
        <Descriptions :column="2" bordered size="small">
          <Descriptions.Item label="订单号">
            {{ detailOrder.orderNo }}
          </Descriptions.Item>
          <Descriptions.Item label="来源报价">
            {{ detailOrder.quoteNo }}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {{
              detailOrder.statusLabel || AiOrderStatusLabels[detailOrder.status]
            }}
          </Descriptions.Item>
          <Descriptions.Item label="支付状态">
            {{
              detailOrder.paymentStatusLabel ||
              AiOrderPaymentStatusLabels[detailOrder.paymentStatus] ||
              '未支付'
            }}
            <template
              v-if="
                detailOrder.paymentStatus === 10 &&
                detailOrder.paymentMethodLabel
              "
            >
              （{{ detailOrder.paymentMethodLabel }}）
            </template>
          </Descriptions.Item>
          <Descriptions.Item label="金额（¥）">
            {{ detailOrder.totalAmount }}
          </Descriptions.Item>
          <Descriptions.Item label="联系方式">
            {{ detailOrder.contact || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="下单时间">
            {{ detailOrder.creationTime }}
          </Descriptions.Item>
          <Descriptions.Item label="备注" :span="2">
            {{ detailOrder.remark || '-' }}
          </Descriptions.Item>
        </Descriptions>

        <a-table
          class="mt-4"
          :columns="[
            { dataIndex: 'materialName', key: 'materialName', title: '物料' },
            { dataIndex: 'spec', key: 'spec', title: '规格' },
            {
              dataIndex: 'quantity',
              key: 'quantity',
              title: '数量',
              width: 70,
            },
            { dataIndex: 'process', key: 'process', title: '工艺', width: 110 },
            {
              dataIndex: 'lineAmount',
              key: 'lineAmount',
              title: '金额（¥）',
              width: 110,
            },
          ]"
          :data-source="
            (detailOrder.lines || []).map((line) => ({
              ...line,
              spec: `${line.widthCm}×${line.heightCm}cm`,
            }))
          "
          :pagination="false"
          row-key="materialCode"
          size="small"
        />
      </template>
    </a-modal>
  </div>
</template>
