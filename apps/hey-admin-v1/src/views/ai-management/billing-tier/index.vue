<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type {
  AiBillingTierDto,
  AiCreateBillingTierInput,
  AiPricingUnit,
  AiUpdateBillingTierInput,
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

import { AiPricingUnitLabels, useAiDesignApi } from '#/api/ai-design';

defineOptions({ name: 'AiDesignBillingTierManagement' });

const {
  createBillingTier,
  deleteBillingTier,
  getBillingTiers,
  updateBillingTier,
} = useAiDesignApi();

const columns: VxeGridPropTypes.Columns<AiBillingTierDto> = [
  { field: 'model', title: '模型/模型组', minWidth: 160 },
  {
    field: 'pricingUnit',
    slots: { default: 'pricingUnit' },
    title: '计价单位',
    width: 110,
  },
  { field: 'tierKey', title: '档位', width: 90 },
  {
    field: 'range',
    slots: { default: 'range' },
    title: '用量区间',
    width: 130,
  },
  {
    field: 'unitPrice',
    slots: { default: 'unitPrice' },
    title: '单价（¥）',
    width: 100,
  },
  {
    field: 'isActive',
    slots: { default: 'isActive' },
    title: '状态',
    width: 80,
  },
  { field: 'remark', title: '备注', minWidth: 140 },
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
    width: 120,
  },
];

const gridOptions: VxeGridProps<AiBillingTierDto> = {
  columns,
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async ({ page }) =>
        await getBillingTiers({
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
  isActive: boolean;
  maxQuantity?: number;
  minQuantity?: number;
  model: string;
  pricingUnit: AiPricingUnit;
  remark?: string;
  tierKey?: string;
  unitPrice?: number;
}>({
  isActive: true,
  maxQuantity: undefined,
  minQuantity: undefined,
  model: '',
  pricingUnit: 0,
  remark: undefined,
  tierKey: undefined,
  unitPrice: undefined,
});

function openCreate() {
  editingId.value = null;
  form.model = '';
  form.pricingUnit = 0;
  form.tierKey = undefined;
  form.minQuantity = undefined;
  form.maxQuantity = undefined;
  form.unitPrice = undefined;
  form.isActive = true;
  form.remark = undefined;
  modalVisible.value = true;
}

function openEdit(row: AiBillingTierDto) {
  editingId.value = row.id;
  form.model = row.model;
  form.pricingUnit = row.pricingUnit;
  form.tierKey = row.tierKey ?? undefined;
  form.minQuantity = row.minQuantity;
  form.maxQuantity = row.maxQuantity ?? undefined;
  form.unitPrice = row.unitPrice;
  form.isActive = row.isActive;
  form.remark = row.remark ?? undefined;
  modalVisible.value = true;
}

function validateForm(): null | string {
  if (!editingId.value && !form.model.trim()) {
    return '请填写模型名或模型组 key';
  }
  if ((form.minQuantity ?? -1) < 0) {
    return '请填写合法的区间下限（≥0）';
  }
  if ((form.unitPrice ?? -1) < 0.01) {
    return '请填写合法单价（≥0.01）';
  }
  if (
    form.maxQuantity !== undefined &&
    form.maxQuantity <= (form.minQuantity ?? -1)
  ) {
    return '区间上限必须大于下限';
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
      const input: AiUpdateBillingTierInput = {
        isActive: form.isActive,
        maxQuantity: form.maxQuantity ?? null,
        minQuantity: form.minQuantity as number,
        remark: form.remark || null,
        tierKey: form.tierKey || null,
        unitPrice: form.unitPrice as number,
      };
      await updateBillingTier(editingId.value, input);
      message.success('档位已更新');
    } else {
      const input: AiCreateBillingTierInput = {
        isActive: form.isActive,
        maxQuantity: form.maxQuantity ?? null,
        minQuantity: form.minQuantity as number,
        model: form.model.trim(),
        pricingUnit: form.pricingUnit,
        remark: form.remark || null,
        tierKey: form.tierKey || null,
        unitPrice: form.unitPrice as number,
      };
      await createBillingTier(input);
      message.success('档位已创建');
    }
    modalVisible.value = false;
    gridApi.query();
  } catch (error: any) {
    message.error(error?.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function onDelete(row: AiBillingTierDto) {
  Modal.confirm({
    cancelText: '取消',
    content: `确定删除「${row.model} · ${row.tierKey ?? '档'}」吗？删除后该档位不再参与结算。`,
    okButtonProps: { danger: true },
    okText: '删除',
    onOk: async () => {
      try {
        await deleteBillingTier(row.id);
        message.success('已删除');
        gridApi.query();
      } catch (error: any) {
        message.error(error?.message || '删除失败');
      }
    },
    title: '删除档位',
  });
}
</script>

<template>
  <div class="mb-3 flex items-center justify-between">
    <div>
      <div class="text-xl font-semibold">冲量价档位管理</div>
      <div class="mt-0.5 text-sm text-gray-500">
        按模型/模型组 + 计价单位配置边际阶梯单价；调价即时生效，无需发版。区间为
        [下限, 上限)，上限留空表示无上限。
      </div>
    </div>
    <Button type="primary" @click="openCreate">新建档位</Button>
  </div>

  <Grid>
    <template #pricingUnit="{ row }">
      {{ AiPricingUnitLabels[row.pricingUnit] ?? row.pricingUnit }}
    </template>
    <template #range="{ row }">
      {{ row.minQuantity }} ~ {{ row.maxQuantity ?? '∞' }}
    </template>
    <template #unitPrice="{ row }">
      <span class="font-semibold text-orange-600 dark:text-orange-400">
        ¥{{ row.unitPrice }}
      </span>
    </template>
    <template #isActive="{ row }">
      <Tag :color="row.isActive ? 'green' : 'default'">
        {{ row.isActive ? '启用' : '停用' }}
      </Tag>
    </template>
    <template #action="{ row }">
      <Button type="link" size="small" block @click="openEdit(row)"
        >
编辑
</Button
      >
      <Button type="link" danger size="small" block @click="onDelete(row)">
        删除
      </Button>
    </template>
  </Grid>

  <Modal
    v-model:open="modalVisible"
    :confirm-loading="submitting"
    :title="editingId ? '编辑档位' : '新建档位'"
    @ok="onSubmit"
  >
    <Form layout="vertical">
      <Form.Item label="模型/模型组 key" required>
        <Input
          v-model:value="form.model"
          :disabled="!!editingId"
          placeholder="如 gpt-image-2，或模型组 key（deepseek）"
        />
      </Form.Item>
      <Form.Item label="计价单位">
        <Select
          v-model:value="form.pricingUnit"
          :disabled="!!editingId"
          :options="
            Object.entries(AiPricingUnitLabels).map(([value, label]) => ({
              label,
              value: Number(value),
            }))
          "
        />
      </Form.Item>
      <div class="grid grid-cols-2 gap-3">
        <Form.Item label="区间下限（含）">
          <InputNumber
            v-model:value="form.minQuantity"
            :min="0"
            :precision="0"
            class="w-full"
            placeholder="如 0"
          />
        </Form.Item>
        <Form.Item label="区间上限（不含）">
          <InputNumber
            v-model:value="form.maxQuantity"
            :min="1"
            :precision="0"
            class="w-full"
            placeholder="留空 = 无上限"
          />
        </Form.Item>
      </div>
      <Form.Item label="单价（¥）">
        <InputNumber
          v-model:value="form.unitPrice"
          :min="0.01"
          :precision="2"
          class="w-full"
          placeholder="如 0.8"
        />
      </Form.Item>
      <Form.Item label="档位标识（可选）">
        <Input v-model:value="form.tierKey" placeholder="如 11-20、101+" />
      </Form.Item>
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
