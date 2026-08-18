<script setup lang="ts">
import type { VxeGridProps, VxeGridPropTypes } from '@abp/ui';

import type { AiAgentPricingRuleDto } from '#/api/ai-agent';

import { useVbenVxeGrid } from '@abp/ui';
import { Modal, Switch, Tag, message } from 'ant-design-vue';
import { computed, reactive, ref } from 'vue';

import { PricingRuleKindLabel, useAiAgentApi } from '#/api/ai-agent';

defineOptions({ name: 'AiAgentPricingRuleManagement' });

const { createPricingRule, deletePricingRule, getPricingRules, updatePricingRule } = useAiAgentApi();

const modalOpen = ref(false);
const editingId = ref<string | null>(null);
const saving = ref(false);

interface RuleForm {
  capabilityId: string;
  kind: number;
  unitPrice: number;
  conditionsText: string;
  costFormula: string;
  priority: number;
  enabled: boolean;
}

const form = reactive<RuleForm>({
  capabilityId: '',
  kind: 0,
  unitPrice: 10,
  conditionsText: '',
  costFormula: '',
  priority: 0,
  enabled: true,
});

const isEdit = computed(() => editingId.value !== null);

function conditionsToText(conditions: Record<string, string>): string {
  return Object.entries(conditions)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

function textToConditions(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split(/[\n,;]/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    } else {
      result[trimmed] = '';
    }
  }
  return result;
}

function openCreate(): void {
  editingId.value = null;
  Object.assign(form, {
    capabilityId: 'image-gen.v1',
    kind: 0,
    unitPrice: 10,
    conditionsText: '',
    costFormula: '',
    priority: 0,
    enabled: true,
  });
  modalOpen.value = true;
}

function openEdit(row: AiAgentPricingRuleDto): void {
  editingId.value = row.id;
  Object.assign(form, {
    capabilityId: row.capabilityId,
    kind: row.kind,
    unitPrice: row.unitPrice,
    conditionsText: conditionsToText(row.conditions ?? {}),
    costFormula: row.costFormula ?? '',
    priority: row.priority,
    enabled: row.enabled,
  });
  modalOpen.value = true;
}

async function save(): Promise<void> {
  if (!form.capabilityId.trim()) {
    message.warning('能力 ID 必填');
    return;
  }
  saving.value = true;
  try {
    const input = {
      capabilityId: form.capabilityId.trim(),
      kind: form.kind,
      unitPrice: form.unitPrice,
      conditions: textToConditions(form.conditionsText),
      costFormula: form.costFormula.trim(),
      priority: form.priority,
      enabled: form.enabled,
    };
    if (editingId.value) {
      await updatePricingRule(editingId.value, input);
      message.success('规则已更新（计费即时生效）');
    } else {
      await createPricingRule(input);
      message.success('规则已创建');
    }
    modalOpen.value = false;
    await grid.reload();
  } finally {
    saving.value = false;
  }
}

function remove(row: AiAgentPricingRuleDto): void {
  Modal.confirm({
    title: '删除计价规则',
    content: `确定删除 ${row.capabilityId}（${PricingRuleKindLabel[row.kind] ?? row.kind}）规则吗？`,
    onOk: async () => {
      await deletePricingRule(row.id);
      message.success('规则已删除');
      await grid.reload();
    },
  });
}

const columns: VxeGridPropTypes.Columns<AiAgentPricingRuleDto> = [
  { field: 'capabilityId', title: '能力 ID', minWidth: 160 },
  { field: 'kind', title: '规则类别', width: 100, slots: { default: 'kind' } },
  { field: 'conditions', title: '匹配条件', minWidth: 160, slots: { default: 'conditions' } },
  { field: 'unitPrice', title: '单价', width: 100 },
  { field: 'costFormula', title: '成本公式', minWidth: 120 },
  { field: 'priority', title: '优先级', width: 90 },
  { field: 'enabled', title: '启用', width: 80, slots: { default: 'enabled' } },
  { field: 'actions', title: '操作', width: 140, fixed: 'right', slots: { default: 'actions' } },
];

const gridOptions: VxeGridProps<AiAgentPricingRuleDto> = {
  columns,
  height: 'auto',
  keepSource: true,
  proxyConfig: {
    ajax: {
      query: async () => getPricingRules(),
    },
    response: { list: 'items', total: 'totalCount' },
  },
  toolbarConfig: {
    refresh: true,
    custom: true,
    slots: { buttons: 'toolbar_buttons' },
  },
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });
const grid = gridApi;
</script>

<template>
  <div class="pricing-rules-page">
    <Grid>
      <template #toolbar_buttons>
        <a-button type="primary" @click="openCreate">新增规则</a-button>
      </template>
      <template #kind="{ row }">
        <Tag :color="row.kind === 0 ? 'blue' : 'purple'">
          {{ PricingRuleKindLabel[row.kind] ?? row.kind }}
        </Tag>
      </template>
      <template #conditions="{ row }">
        <span v-if="Object.keys(row.conditions ?? {}).length === 0">-</span>
        <Tag v-for="(v, k) in row.conditions" :key="k">{{ k }}={{ v }}</Tag>
      </template>
      <template #enabled="{ row }">
        <Switch :checked="row.enabled" disabled size="small" />
      </template>
      <template #actions="{ row }">
        <a-button type="link" size="small" @click="openEdit(row)">编辑</a-button>
        <a-button type="link" danger size="small" @click="remove(row)">删除</a-button>
      </template>
    </Grid>

    <a-modal
      v-model:open="modalOpen"
      :title="isEdit ? '编辑计价规则' : '新增计价规则'"
      :confirm-loading="saving"
      @ok="save"
    >
      <a-form layout="vertical">
        <a-form-item label="能力 ID" required>
          <a-input v-model:value="form.capabilityId" placeholder="如 image-gen.v1" />
        </a-form-item>
        <a-form-item label="规则类别">
          <a-select
            v-model:value="form.kind"
            :options="[
              { value: 0, label: '平台价（用户侧一口价）' },
              { value: 1, label: '渠道成本（成本侧核算）' },
            ]"
          />
        </a-form-item>
        <a-form-item label="匹配条件（每行 key=value，如 sizeTier=4K）">
          <a-textarea
            v-model:value="form.conditionsText"
            :rows="3"
            placeholder="sizeTier=4K&#10;quality=high"
          />
        </a-form-item>
        <a-form-item label="单价（积分/元）" required>
          <a-input-number v-model:value="form.unitPrice" :min="0" :precision="2" style="width: 100%" />
        </a-form-item>
        <a-form-item label="成本公式（渠道成本规则可选）">
          <a-input v-model:value="form.costFormula" placeholder="如 token x 单价" />
        </a-form-item>
        <a-form-item label="优先级（条件重叠时取高者）">
          <a-input-number v-model:value="form.priority" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="启用">
          <a-switch v-model:checked="form.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
