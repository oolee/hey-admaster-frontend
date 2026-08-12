<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type {
  AiCreateQuoteRuleInput,
  AiQuotePricingMode,
  AiQuoteRuleDto,
  AiUpdateQuoteRuleInput,
} from '#/api/ai-design';

import { reactive, ref } from 'vue';

import { useVbenVxeGrid } from '@abp/ui';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Switch,
  Tag,
} from 'ant-design-vue';

import { AiQuotePricingModeLabels, useAiDesignApi } from '#/api/ai-design';

defineOptions({ name: 'AiDesignQuoteRuleManagement' });

const { createQuoteRule, deleteQuoteRule, getQuoteRules, updateQuoteRule } =
  useAiDesignApi();

const columns: VxeGridPropTypes.Columns<AiQuoteRuleDto> = [
  { field: 'materialName', title: '物料', minWidth: 110 },
  { field: 'materialCode', title: '编码', minWidth: 120 },
  {
    field: 'sizeRange',
    slots: { default: 'sizeRange' },
    title: '尺寸区间（cm）',
    width: 160,
  },
  { field: 'process', title: '工艺', width: 110 },
  {
    field: 'pricingMode',
    slots: { default: 'pricingMode' },
    title: '定价模式',
    width: 110,
  },
  {
    field: 'unitPrice',
    slots: { default: 'unitPrice' },
    title: '单价（¥）',
    width: 100,
  },
  {
    field: 'minAmount',
    slots: { default: 'minAmount' },
    title: '最低收费',
    width: 90,
  },
  { field: 'leadTimeDays', title: '工期(天)', width: 90 },
  {
    field: 'isActive',
    slots: { default: 'isActive' },
    title: '状态',
    width: 80,
  },
  { field: 'sortOrder', title: '排序', width: 70 },
  { field: 'remark', title: '备注', minWidth: 120 },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 120,
  },
];

const gridOptions: VxeGridProps<AiQuoteRuleDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async ({ page }) =>
        await getQuoteRules({
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
  heightMaxCm?: number;
  heightMinCm?: number;
  isActive: boolean;
  leadTimeDays: number;
  materialCode: string;
  materialName: string;
  minAmount: number;
  pricingMode: AiQuotePricingMode;
  process?: string;
  remark?: string;
  sortOrder: number;
  unitPrice?: number;
  widthMaxCm?: number;
  widthMinCm?: number;
}>({
  heightMaxCm: undefined,
  heightMinCm: undefined,
  isActive: true,
  leadTimeDays: 1,
  materialCode: '',
  materialName: '',
  minAmount: 0,
  pricingMode: 0,
  process: undefined,
  remark: undefined,
  sortOrder: 0,
  unitPrice: undefined,
  widthMaxCm: undefined,
  widthMinCm: undefined,
});

function openCreate() {
  editingId.value = null;
  form.materialCode = '';
  form.materialName = '';
  form.widthMinCm = undefined;
  form.widthMaxCm = undefined;
  form.heightMinCm = undefined;
  form.heightMaxCm = undefined;
  form.process = undefined;
  form.pricingMode = 0;
  form.unitPrice = undefined;
  form.minAmount = 0;
  form.leadTimeDays = 1;
  form.isActive = true;
  form.sortOrder = 0;
  form.remark = undefined;
  modalVisible.value = true;
}

function openEdit(row: AiQuoteRuleDto) {
  editingId.value = row.id;
  form.materialCode = row.materialCode;
  form.materialName = row.materialName;
  form.widthMinCm = row.widthMinCm ?? undefined;
  form.widthMaxCm = row.widthMaxCm ?? undefined;
  form.heightMinCm = row.heightMinCm ?? undefined;
  form.heightMaxCm = row.heightMaxCm ?? undefined;
  form.process = row.process ?? undefined;
  form.pricingMode = row.pricingMode;
  form.unitPrice = row.unitPrice;
  form.minAmount = row.minAmount;
  form.leadTimeDays = row.leadTimeDays;
  form.isActive = row.isActive;
  form.sortOrder = row.sortOrder;
  form.remark = row.remark ?? undefined;
  modalVisible.value = true;
}

function validateForm(): null | string {
  if (!form.materialCode.trim() || !form.materialName.trim()) {
    return '请填写物料编码与名称';
  }
  if ((form.unitPrice ?? -1) < 0.01) {
    return '请填写合法单价（≥0.01）';
  }
  if (
    form.widthMaxCm !== undefined &&
    form.widthMinCm !== undefined &&
    form.widthMaxCm < form.widthMinCm
  ) {
    return '宽度上限不能小于下限';
  }
  if (
    form.heightMaxCm !== undefined &&
    form.heightMinCm !== undefined &&
    form.heightMaxCm < form.heightMinCm
  ) {
    return '高度上限不能小于下限';
  }
  return null;
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
      const input: AiUpdateQuoteRuleInput = {
        heightMaxCm: form.heightMaxCm ?? null,
        heightMinCm: form.heightMinCm ?? null,
        isActive: form.isActive,
        leadTimeDays: form.leadTimeDays,
        materialName: form.materialName.trim(),
        minAmount: form.minAmount,
        pricingMode: form.pricingMode,
        process: form.process?.trim() || null,
        remark: form.remark || null,
        sortOrder: form.sortOrder,
        unitPrice: form.unitPrice as number,
        widthMaxCm: form.widthMaxCm ?? null,
        widthMinCm: form.widthMinCm ?? null,
      };
      await updateQuoteRule(editingId.value, input);
      message.success('报价规则已更新');
    } else {
      const input: AiCreateQuoteRuleInput = {
        heightMaxCm: form.heightMaxCm ?? null,
        heightMinCm: form.heightMinCm ?? null,
        isActive: form.isActive,
        leadTimeDays: form.leadTimeDays,
        materialCode: form.materialCode.trim(),
        materialName: form.materialName.trim(),
        minAmount: form.minAmount,
        pricingMode: form.pricingMode,
        process: form.process?.trim() || null,
        remark: form.remark || null,
        sortOrder: form.sortOrder,
        unitPrice: form.unitPrice as number,
        widthMaxCm: form.widthMaxCm ?? null,
        widthMinCm: form.widthMinCm ?? null,
      };
      await createQuoteRule(input);
      message.success('报价规则已创建');
    }
    modalVisible.value = false;
    gridApi.query();
  } catch (error: any) {
    message.error(error?.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function onDelete(row: AiQuoteRuleDto) {
  Modal.confirm({
    cancelText: '取消',
    content: `确定删除「${row.materialName} · ${row.materialCode}」吗？删除后该规则不再参与报价。`,
    okButtonProps: { danger: true },
    okText: '删除',
    onOk: async () => {
      try {
        await deleteQuoteRule(row.id);
        message.success('已删除');
        gridApi.query();
      } catch (error: any) {
        message.error(error?.message || '删除失败');
      }
    },
    title: '删除报价规则',
  });
}

function formatRange(min?: null | number, max?: null | number): string {
  if (min === null && max === null) return '不限';
  return `${min ?? 0} ~ ${max ?? '∞'}`;
}
</script>

<template>
  <div class="mb-3 flex items-center justify-between">
    <div>
      <div class="text-xl font-semibold">广告物料自动报价规则</div>
      <div class="mt-0.5 text-sm text-gray-500">
        配置物料类型 + 尺寸区间 + 工艺 → 单价；C
        端输入尺寸/数量/工艺即可自动报价。
        同物料多条规则时，工艺精确的规则优先，同级按「排序」数字小优先。调价即时生效。
      </div>
    </div>
    <Button type="primary" @click="openCreate">新建规则</Button>
  </div>

  <Grid>
    <template #sizeRange="{ row }">
      {{ formatRange(row.widthMinCm, row.widthMaxCm) }} ×
      {{ formatRange(row.heightMinCm, row.heightMaxCm) }}
    </template>
    <template #pricingMode="{ row }">
      {{ AiQuotePricingModeLabels[row.pricingMode] ?? row.pricingMode }}
    </template>
    <template #unitPrice="{ row }">
      <span class="font-semibold text-orange-600 dark:text-orange-400">
        ¥{{ row.unitPrice }}
      </span>
    </template>
    <template #minAmount="{ row }">
      {{ row.minAmount ? `¥${row.minAmount}` : '—' }}
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
    :title="editingId ? '编辑报价规则' : '新建报价规则'"
    @ok="onSubmit"
  >
    <Form layout="vertical">
      <div class="grid grid-cols-2 gap-3">
        <Form.Item label="物料编码" required>
          <Input
            v-model:value="form.materialCode"
            :disabled="!!editingId"
            placeholder="如 door-head / poster / rollup / lightbox / dm / wall"
          />
        </Form.Item>
        <Form.Item label="物料名称" required>
          <Input
            v-model:value="form.materialName"
            placeholder="如 门头 / 海报 / 易拉宝 / 灯箱 / DM单页"
          />
        </Form.Item>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <Form.Item label="宽度下限（cm）">
          <InputNumber
            v-model:value="form.widthMinCm"
            :min="0"
            :precision="1"
            class="w-full"
            placeholder="留空 = 不限"
          />
        </Form.Item>
        <Form.Item label="宽度上限（cm）">
          <InputNumber
            v-model:value="form.widthMaxCm"
            :min="0"
            :precision="1"
            class="w-full"
            placeholder="留空 = 不限"
          />
        </Form.Item>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <Form.Item label="高度下限（cm）">
          <InputNumber
            v-model:value="form.heightMinCm"
            :min="0"
            :precision="1"
            class="w-full"
            placeholder="留空 = 不限"
          />
        </Form.Item>
        <Form.Item label="高度上限（cm）">
          <InputNumber
            v-model:value="form.heightMaxCm"
            :min="0"
            :precision="1"
            class="w-full"
            placeholder="留空 = 不限"
          />
        </Form.Item>
      </div>
      <Form.Item label="工艺（留空 = 匹配任意工艺）">
        <Input
          v-model:value="form.process"
          placeholder="如 UV喷印 / 覆膜 / 雕刻"
        />
      </Form.Item>
      <div class="grid grid-cols-2 gap-3">
        <Form.Item label="定价模式">
          <Select
            v-model:value="form.pricingMode"
            :options="
              Object.entries(AiQuotePricingModeLabels).map(
                ([value, label]) => ({
                  label,
                  value: Number(value),
                }),
              )
            "
          />
        </Form.Item>
        <Form.Item label="单价（¥）" required>
          <InputNumber
            v-model:value="form.unitPrice"
            :min="0.01"
            :precision="2"
            class="w-full"
            placeholder="按件=每件 / 按米=每米宽 / 按㎡=每平方米"
          />
        </Form.Item>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <Form.Item label="单件最低收费（¥）">
          <InputNumber
            v-model:value="form.minAmount"
            :min="0"
            :precision="2"
            class="w-full"
            placeholder="0 = 不设"
          />
        </Form.Item>
        <Form.Item label="工期（天）">
          <InputNumber
            v-model:value="form.leadTimeDays"
            :min="0"
            :precision="0"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="排序（小优先）">
          <InputNumber
            v-model:value="form.sortOrder"
            :precision="0"
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
