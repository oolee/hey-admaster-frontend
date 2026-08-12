<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type {
  AiChannelCostDto,
  AiChannelDto,
  AiCostType,
  AiPricingUnit,
  CreateUpdateAiChannelCostInput,
} from '#/api/ai-design';

import { reactive, ref } from 'vue';

import { useVbenVxeGrid } from '@abp/ui';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Switch,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  AiCostTypeLabels,
  AiPricingUnitLabels,
  useAiDesignApi,
} from '#/api/ai-design';

defineOptions({ name: 'AiDesignChannelCostManagement' });

const {
  createChannelCost,
  deleteChannelCost,
  getChannelCosts,
  getChannels,
  updateChannelCost,
} = useAiDesignApi();

const channels = ref<AiChannelDto[]>([]);
async function loadChannels() {
  try {
    channels.value = await getChannels();
  } catch {
    channels.value = [];
  }
}
void loadChannels();

function channelName(channelId: string): string {
  return (
    channels.value.find((item) => item.id === channelId)?.name ??
    `渠道(${channelId.slice(0, 8)}…)`
  );
}

const columns: VxeGridPropTypes.Columns<AiChannelCostDto> = [
  {
    field: 'channelName',
    slots: { default: 'channelName' },
    title: '渠道',
    minWidth: 140,
  },
  { field: 'model', title: '模型', minWidth: 140 },
  {
    field: 'costType',
    slots: { default: 'costType' },
    title: '成本类型',
    width: 100,
  },
  {
    field: 'costUnit',
    slots: { default: 'costUnit' },
    title: '计价单位',
    width: 110,
  },
  {
    field: 'cost',
    slots: { default: 'cost' },
    title: '采购价（¥）',
    width: 130,
  },
  {
    field: 'currency',
    slots: { default: 'currency' },
    title: '币种',
    width: 90,
  },
  {
    field: 'effective',
    slots: { default: 'effective' },
    title: '生效区间',
    width: 210,
  },
  {
    field: 'isActive',
    slots: { default: 'isActive' },
    title: '状态',
    width: 80,
  },
  { field: 'remark', title: '备注', minWidth: 140 },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 120,
  },
];

const gridOptions: VxeGridProps<AiChannelCostDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async ({ page }) =>
        await getChannelCosts({
          maxResultCount: page.pageSize,
          skipCount: (page.currentPage - 1) * page.pageSize,
        }),
    },
    response: { list: 'items', total: 'totalCount' },
  },
  toolbarConfig: { refresh: true },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });

// ---- 新建/编辑弹窗 ----
const modalVisible = ref(false);
const editingId = ref<null | string>(null);
const submitting = ref(false);
const form = reactive<{
  channelId?: string;
  costType: AiCostType;
  costUnit: AiPricingUnit;
  currency: string;
  effectiveFrom?: dayjs.Dayjs;
  effectiveTo?: dayjs.Dayjs;
  exchangeRate: number;
  isActive: boolean;
  model: string;
  remark?: string;
  tiers: { maxQuantity?: number; minQuantity: number; unitPrice: number }[];
  unitCost?: number;
}>({
  costType: 0,
  costUnit: 0,
  currency: 'CNY',
  effectiveFrom: undefined,
  effectiveTo: undefined,
  exchangeRate: 1,
  isActive: true,
  model: '',
  remark: undefined,
  tiers: [{ maxQuantity: undefined, minQuantity: 0, unitPrice: 0.3 }],
  unitCost: 0.3,
});

function openCreate() {
  editingId.value = null;
  form.channelId = undefined;
  form.model = '';
  form.costType = 0;
  form.costUnit = 0;
  form.unitCost = 0.3;
  form.tiers = [{ maxQuantity: undefined, minQuantity: 0, unitPrice: 0.3 }];
  form.currency = 'CNY';
  form.exchangeRate = 1;
  form.effectiveFrom = undefined;
  form.effectiveTo = undefined;
  form.isActive = true;
  form.remark = undefined;
  modalVisible.value = true;
}

function openEdit(row: AiChannelCostDto) {
  editingId.value = row.id;
  form.channelId = row.channelId;
  form.model = row.model;
  form.costType = row.costType;
  form.costUnit = row.costUnit;
  form.unitCost = row.unitCost;
  form.tiers =
    row.tiers.length > 0
      ? row.tiers.map((tier) => ({
          maxQuantity: tier.maxQuantity ?? undefined,
          minQuantity: tier.minQuantity,
          unitPrice: tier.unitPrice,
        }))
      : [{ maxQuantity: undefined, minQuantity: 0, unitPrice: 0.3 }];
  form.currency = row.currency;
  form.exchangeRate = row.exchangeRate;
  form.effectiveFrom = row.effectiveFrom ? dayjs(row.effectiveFrom) : undefined;
  form.effectiveTo = row.effectiveTo ? dayjs(row.effectiveTo) : undefined;
  form.isActive = row.isActive;
  form.remark = row.remark ?? undefined;
  modalVisible.value = true;
}

function validateForm(): null | string {
  if (!form.channelId) {
    return '请选择渠道';
  }
  if (!form.model.trim()) {
    return '请填写模型名';
  }
  if (form.costType === 0 && (form.unitCost ?? -1) < 0) {
    return '请填写合法的固定采购价（≥0）';
  }
  if (form.costType === 1) {
    for (const [index, tier] of form.tiers.entries()) {
      if (tier.minQuantity < 0 || (tier.unitPrice ?? -1) < 0) {
        return `阶梯第 ${index + 1} 行区间/单价不合法`;
      }
      if (
        tier.maxQuantity !== undefined &&
        tier.maxQuantity <= tier.minQuantity
      ) {
        return `阶梯第 ${index + 1} 行上限必须大于下限`;
      }
    }
  }
  if (
    form.effectiveFrom &&
    form.effectiveTo &&
    form.effectiveFrom.isAfter(form.effectiveTo)
  ) {
    return '生效起始不能晚于生效截止';
  }
  return null;
}

function addTier() {
  form.tiers.push({ maxQuantity: undefined, minQuantity: 0, unitPrice: 0.3 });
}

function removeTier(index: number) {
  if (form.tiers.length <= 1) {
    return;
  }
  form.tiers.splice(index, 1);
}

function buildInput(): CreateUpdateAiChannelCostInput {
  return {
    channelId: form.channelId as string,
    model: form.model.trim(),
    costType: form.costType,
    costUnit: form.costUnit,
    unitCost: form.unitCost ?? 0,
    tiers: form.tiers.map((tier) => ({
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity ?? null,
      unitPrice: tier.unitPrice,
    })),
    currency: form.currency,
    exchangeRate: form.exchangeRate,
    effectiveFrom: form.effectiveFrom?.format('YYYY-MM-DDTHH:mm:ss') ?? null,
    effectiveTo: form.effectiveTo?.format('YYYY-MM-DDTHH:mm:ss') ?? null,
    isActive: form.isActive,
    remark: form.remark || null,
  };
}

async function onSubmit() {
  const error = validateForm();
  if (error) {
    message.warning(error);
    return;
  }
  submitting.value = true;
  try {
    if (editingId.value) {
      await updateChannelCost(editingId.value, buildInput());
      message.success('采购成本已更新');
    } else {
      await createChannelCost(buildInput());
      message.success('采购成本已创建');
    }
    modalVisible.value = false;
    gridApi.query();
  } catch (error: any) {
    message.error(error?.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function onDelete(row: AiChannelCostDto) {
  Modal.confirm({
    cancelText: '取消',
    content: `确定删除「${channelName(row.channelId)} · ${row.model}」的采购成本记录吗？历史流水不受影响。`,
    okButtonProps: { danger: true },
    okText: '删除',
    onOk: async () => {
      try {
        await deleteChannelCost(row.id);
        message.success('已删除');
        gridApi.query();
      } catch (error: any) {
        message.error(error?.message || '删除失败');
      }
    },
    title: '删除采购成本',
  });
}

function formatEffective(row: AiChannelCostDto): string {
  const from = row.effectiveFrom
    ? dayjs(row.effectiveFrom).format('YYYY-MM-DD')
    : '不限';
  const to = row.effectiveTo
    ? dayjs(row.effectiveTo).format('YYYY-MM-DD')
    : '不限';
  return `${from} ~ ${to}`;
}

function formatCost(row: AiChannelCostDto): string {
  if (row.costType === 1) {
    if (row.tiers.length === 0) {
      return '—';
    }
    return row.tiers
      .map(
        (tier) =>
          `≥${tier.minQuantity}:¥${tier.unitPrice}${tier.maxQuantity ? `<${tier.maxQuantity}` : ''}`,
      )
      .join(' / ');
  }
  return `¥${row.unitCost}`;
}
</script>

<template>
  <div class="mb-3 flex items-center justify-between">
    <div>
      <div class="text-xl font-semibold">采购成本管理</div>
      <div class="mt-0.5 text-sm text-gray-500">
        记录渠道 +
        模型的真实采购单价（固定价或阶梯套餐），结算时按实际用量写入流水成本，用于对账与毛利分析。
        同渠道同模型多条时，取「启用 + 生效区间覆盖当前时间」的最近一条。
      </div>
    </div>
    <Button type="primary" @click="openCreate">新建采购成本</Button>
  </div>

  <Grid>
    <template #channelName="{ row }">
      {{ channelName(row.channelId) }}
    </template>
    <template #costType="{ row }">
      <Tag :color="row.costType === 1 ? 'blue' : 'green'">
        {{ AiCostTypeLabels[row.costType] ?? row.costType }}
      </Tag>
    </template>
    <template #costUnit="{ row }">
      {{ AiPricingUnitLabels[row.costUnit] ?? row.costUnit }}
    </template>
    <template #cost="{ row }">
      <span class="font-semibold text-orange-600 dark:text-orange-400">
        {{ formatCost(row) }}
      </span>
    </template>
    <template #currency="{ row }">
      {{ row.currency }}
      <span v-if="row.currency !== 'CNY'" class="text-gray-500">
        ×{{ row.exchangeRate }}
      </span>
    </template>
    <template #effective="{ row }">
      {{ formatEffective(row) }}
    </template>
    <template #isActive="{ row }">
      <Tag :color="row.isActive ? 'green' : 'default'">
        {{ row.isActive ? '启用' : '停用' }}
      </Tag>
    </template>
    <template #action="{ row }">
      <Button type="link" size="small" block @click="openEdit(row)">
        编辑
      </Button>
      <Button type="link" danger size="small" block @click="onDelete(row)">
        删除
      </Button>
    </template>
  </Grid>

  <Modal
    v-model:open="modalVisible"
    :confirm-loading="submitting"
    :title="editingId ? '编辑采购成本' : '新建采购成本'"
    :width="640"
    @ok="onSubmit"
  >
    <Form layout="vertical">
      <div class="grid grid-cols-2 gap-3">
        <Form.Item label="渠道" required>
          <Select
            v-model:value="form.channelId"
            :options="
              channels.map((item) => ({ label: item.name, value: item.id }))
            "
            placeholder="选择渠道"
            show-search
            option-filter-prop="label"
          />
        </Form.Item>
        <Form.Item label="模型名" required>
          <Input v-model:value="form.model" placeholder="如 gpt-image-2" />
        </Form.Item>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <Form.Item label="成本类型">
          <Select
            v-model:value="form.costType"
            :options="
              Object.entries(AiCostTypeLabels).map(([value, label]) => ({
                label,
                value: Number(value),
              }))
            "
          />
        </Form.Item>
        <Form.Item label="计价单位">
          <Select
            v-model:value="form.costUnit"
            :options="
              Object.entries(AiPricingUnitLabels).map(([value, label]) => ({
                label,
                value: Number(value),
              }))
            "
          />
        </Form.Item>
        <Form.Item label="币种">
          <Select
            v-model:value="form.currency"
            :options="[
              { label: 'CNY（人民币）', value: 'CNY' },
              { label: 'USD（美元）', value: 'USD' },
            ]"
          />
        </Form.Item>
      </div>

      <Form.Item v-if="form.costType === 0" label="固定采购单价（¥）" required>
        <InputNumber
          v-model:value="form.unitCost"
          :min="0"
          :precision="4"
          class="w-full"
          placeholder="如 0.3"
        />
      </Form.Item>

      <div v-else class="mb-2">
        <div class="mb-1 text-sm font-medium">阶梯采购价（¥，按累计用量）</div>
        <div
          v-for="(tier, index) in form.tiers"
          :key="index"
          class="mb-2 grid grid-cols-[1fr_1fr_1fr_auto] gap-2"
        >
          <InputNumber
            v-model:value="tier.minQuantity"
            :min="0"
            :precision="0"
            class="w-full"
            placeholder="下限（含）"
          />
          <InputNumber
            v-model:value="tier.maxQuantity"
            :min="1"
            :precision="0"
            class="w-full"
            placeholder="上限（不含），留空不限"
          />
          <InputNumber
            v-model:value="tier.unitPrice"
            :min="0"
            :precision="4"
            class="w-full"
            placeholder="单价"
          />
          <Button @click="removeTier(index)">删</Button>
        </div>
        <Button type="dashed" block @click="addTier">添加档位</Button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <Form.Item label="生效起始（可选）">
          <DatePicker
            v-model:value="form.effectiveFrom"
            class="w-full"
            placeholder="留空 = 不限"
          />
        </Form.Item>
        <Form.Item label="生效截止（可选）">
          <DatePicker
            v-model:value="form.effectiveTo"
            class="w-full"
            placeholder="留空 = 不限"
          />
        </Form.Item>
      </div>

      <div v-if="form.currency === 'USD'" class="grid grid-cols-2 gap-3">
        <Form.Item label="汇率（USD → CNY）">
          <InputNumber
            v-model:value="form.exchangeRate"
            :min="0.0001"
            :precision="4"
            class="w-full"
          />
        </Form.Item>
      </div>

      <Form.Item label="启用">
        <Switch v-model:checked="form.isActive" />
      </Form.Item>
      <Form.Item label="备注">
        <Input.TextArea
          v-model:value="form.remark"
          :rows="2"
          placeholder="可选"
        />
      </Form.Item>
    </Form>
  </Modal>
</template>
