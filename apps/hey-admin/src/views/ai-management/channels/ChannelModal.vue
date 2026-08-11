<script setup lang="ts">
import type {
  AiChannelDto,
  CreateUpdateAiChannelDto,
  CreateUpdateAiChannelModelDto,
} from '#/api/ai-design';

import { computed, ref } from 'vue';

import { useVbenForm, useVbenModal } from '@vben/common-ui';

import { InfoCircleOutlined } from '@ant-design/icons-vue';
import {
  Modal as AntModal,
  Button,
  Checkbox,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  AiChannelProviderLabels,
  AiModelCapability,
  AiModelCapabilityLabels,
  AiModelType,
  AiModelTypeLabels,
  AiPricingUnit,
  AiPricingUnitLabels,
  AiRequestParamOptions,
  capabilitiesToModelType,
  useAiDesignApi,
} from '#/api/ai-design';

const emit = defineEmits<{ (event: 'change'): void }>();
const { createChannel, updateChannel, fetchChannelModels } = useAiDesignApi();

const [Form, formApi] = useVbenForm({
  commonConfig: { colon: true, controlClass: 'w-full' },
  handleSubmit: onSubmit,
  schema: [
    {
      component: 'Input',
      fieldName: 'id',
      formItemClass: 'hidden',
      label: 'id',
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: '渠道名称',
      rules: 'required',
      componentProps: { placeholder: '如「生产-主渠道」' },
    },
    {
      component: 'Select',
      componentProps: {
        options: Object.entries(AiChannelProviderLabels).map(
          ([value, label]) => ({ label, value: Number(value) }),
        ),
      },
      fieldName: 'providerType',
      label: 'Provider 类型',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: 'https://api.openai.com/v1',
      },
      fieldName: 'baseUrl',
      label: 'Base URL',
    },
    {
      component: 'InputPassword',
      componentProps: {
        placeholder: '新增时必填；编辑时不修改则保留原 Key',
      },
      fieldName: 'apiKey',
      label: 'API Key',
    },
    {
      component: 'InputTextArea',
      fieldName: 'description',
      label: '描述',
      componentProps: { rows: 2, placeholder: '用途说明（可选）' },
    },
    {
      component: 'InputTextArea',
      componentProps: {
        placeholder: 'JSON，例如模型别名映射、额外请求头等',
        rows: 2,
      },
      fieldName: 'extraConfig',
      label: '扩展配置',
    },
    {
      component: 'InputNumber',
      fieldName: 'priority',
      label: '优先级（小者优先）',
      defaultValue: 100,
    },
    {
      component: 'InputNumber',
      fieldName: 'weight',
      label: '权重',
      defaultValue: 1,
    },
    {
      component: 'InputNumber',
      componentProps: { min: 5 },
      fieldName: 'timeoutSeconds',
      label: '超时（秒）',
      defaultValue: 120,
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, max: 5 },
      fieldName: 'maxRetryCount',
      label: '最大重试次数',
      defaultValue: 1,
    },
    {
      component: 'Switch',
      controlClass: 'w-auto',
      fieldName: 'enabled',
      label: '启用',
      defaultValue: true,
    },
  ],
  showDefaultActions: false,
});

const models = ref<CreateUpdateAiChannelModelDto[]>([]);
const fetching = ref(false);
// 批量操作：按行号选中
const selectedIndexes = ref<Set<number>>(new Set());
const isAllSelected = computed(
  () =>
    models.value.length > 0 &&
    selectedIndexes.value.size === models.value.length,
);
const isPartialSelected = computed(
  () =>
    selectedIndexes.value.size > 0 &&
    selectedIndexes.value.size < models.value.length,
);

function toggleSelect(index: number) {
  const next = new Set(selectedIndexes.value);
  if (next.has(index)) {
    next.delete(index);
  } else {
    next.add(index);
  }
  selectedIndexes.value = next;
}

function toggleSelectAll() {
  selectedIndexes.value =
    selectedIndexes.value.size === models.value.length
      ? new Set()
      : new Set(models.value.map((_, i) => i));
}

function batchRemoveModels() {
  const count = selectedIndexes.value.size;
  if (count === 0) return;
  models.value = models.value.filter((_, i) => !selectedIndexes.value.has(i));
  selectedIndexes.value = new Set();
  message.success(`已删除 ${count} 个模型配置`);
}
// 尺寸编辑：弹窗中编辑每个模型的尺寸列表
const sizeEditorVisible = ref(false);
const sizeEditorIndex = ref<null | number>(null);
const sizeEditorInput = ref('');
const sizeEditorList = ref<string[]>([]);

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await formApi.validateAndSubmitForm();
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      onGet();
    }
  },
});

const currentFormValues = ref<Record<string, any>>({});

function onGet() {
  const record = modalApi.getData<AiChannelDto>();
  models.value = [];
  if (record) {
    currentFormValues.value = { ...record };
    formApi.setValues({
      apiKey: record.apiKeyMasked || '',
      ...record,
    });
    models.value = (record.models || []).map((item) => ({
      displayName: item.displayName ?? null,
      enabled: item.enabled,
      maxImagesPerRequest: item.maxImagesPerRequest,
      modelName: item.modelName,
      modelType: item.modelType ?? AiModelType.Image,
      capabilities: item.capabilities ?? 0,
      pricePerImage: item.pricePerImage,
      pricingUnit: item.pricingUnit ?? AiPricingUnit.PerImage,
      priority: item.priority,
      supportedSizes: item.supportedSizes ?? null,
      disabledRequestParams: item.disabledRequestParams ?? 0,
      defaultResponseFormat: item.defaultResponseFormat ?? null,
      sizeMode: item.sizeMode ?? 0,
      paramProfileJson: item.paramProfileJson ?? null,
      weight: item.weight,
    }));
  } else {
    currentFormValues.value = {};
    formApi.resetForm();
    formApi.setValues({
      enabled: true,
      maxRetryCount: 1,
      priority: 100,
      providerType: 0,
      timeoutSeconds: 120,
      weight: 1,
    });
    models.value = [];
  }
}

function addModel() {
  models.value.push({
    displayName: '',
    enabled: true,
    maxImagesPerRequest: 1,
    modelName: '',
    modelType: AiModelType.Image,
    capabilities: 0,
    pricePerImage: 0,
    pricingUnit: AiPricingUnit.PerImage,
    priority: 100,
    supportedSizes: null,
    disabledRequestParams: 0,
    defaultResponseFormat: null,
    sizeMode: 0,
    paramProfileJson: null,
    weight: 1,
  });
}

function removeModel(index: number) {
  models.value.splice(index, 1);
}

function updateModel(
  index: number,
  patch: Partial<CreateUpdateAiChannelModelDto>,
) {
  const target = models.value[index];
  if (target) {
    Object.assign(target, patch);
  }
}

/** 切换某模型「禁用的请求参数」位（如 apiyi gpt-image-2-vip 禁用 n/quality） */
function toggleDisabledParam(index: number, param: number, checked: boolean) {
  const target = models.value[index];
  if (!target) return;
  let value = Number(target.disabledRequestParams ?? 0);
  value = checked ? value | param : value & ~param;
  updateModel(index, { disabledRequestParams: value });
}

const modelTypeOptions = Object.entries(AiModelTypeLabels).map(
  ([value, label]) => ({ label, value: Number(value) }),
);

/** 后台配置的默认返回格式（url / b64_json，null=自动交给 Provider 默认 b64_json） */
const responseFormatOptions = [
  { value: '', label: '自动' },
  { value: 'url', label: 'url（返回链接）' },
  { value: 'b64_json', label: 'base64（b64_json）' },
];

/** 尺寸发送模式：Auto=直传 WxH（OpenAI 官方语义）；Tier=size 传档位字面量 1k/2k/4k（如 GPTeam gpt-image-2 必须传档位才出 4K） */
const sizeModeOptions = [
  { value: 0, label: '自动（直传 WxH）' },
  { value: 1, label: '档位字面量（1k/2k/4k）' },
];

// --- 参数适配策略编辑（JSON，供应商参数差异映射）---
const paramProfileVisible = ref(false);
const paramProfileIndex = ref<null | number>(null);
const paramProfileText = ref('');

function openParamProfileEditor(index: number) {
  paramProfileIndex.value = index;
  paramProfileText.value = models.value[index]?.paramProfileJson ?? '';
  paramProfileVisible.value = true;
}

/** 一键填充 GPTeam gpt-image-2 示例（size 档位 + aspect_ratio + upscale） */
function fillParamProfileExample() {
  paramProfileText.value = JSON.stringify(
    {
      sizeMode: 1,
      sizeTierMap: { '1k': '1k', '2k': '2k', '4k': '4k' },
      defaultSizeTier: '4k',
      emitAspectRatio: true,
      fixedQuality: null,
      fixedCount: null,
      extraParams: { upscale: '4k', resize_mode: 'proportional' },
    },
    null,
    2,
  );
}

function saveParamProfile() {
  if (paramProfileIndex.value === null) return;
  const text = paramProfileText.value.trim();
  if (text) {
    try {
      JSON.parse(text);
    } catch {
      message.error('参数适配策略不是合法的 JSON，请检查后保存');
      return;
    }
  }
  updateModel(paramProfileIndex.value, {
    paramProfileJson: text || null,
  });
  paramProfileVisible.value = false;
  paramProfileIndex.value = null;
}

function pricingUnitOptions(modelType: number) {
  if (modelType === AiModelType.Text) {
    return [
      {
        label: AiPricingUnitLabels[AiPricingUnit.PerRequest],
        value: AiPricingUnit.PerRequest,
      },
      {
        label: AiPricingUnitLabels[AiPricingUnit.Per1MTokens],
        value: AiPricingUnit.Per1MTokens,
      },
    ];
  }
  return [
    {
      label: AiPricingUnitLabels[AiPricingUnit.PerImage],
      value: AiPricingUnit.PerImage,
    },
  ];
}

// 切换模型类型：文本模型强制单次请求、无尺寸、不可按张计费
function changeModelType(index: number, modelType: number) {
  const target = models.value[index];
  if (!target) return;
  const patch: Partial<CreateUpdateAiChannelModelDto> = { modelType };
  // 切换类型时同步默认能力位（文本=对话|文本生成，多模态=文生图|图生图）
  patch.capabilities =
    modelType === AiModelType.Text
      ? AiModelCapability.Chat | AiModelCapability.TextGeneration
      : AiModelCapability.ImageGeneration | AiModelCapability.ImageEditing;
  if (modelType === AiModelType.Text) {
    patch.maxImagesPerRequest = 1;
    patch.supportedSizes = null;
    if (target.pricingUnit === AiPricingUnit.PerImage) {
      patch.pricingUnit = AiPricingUnit.PerRequest;
    }
  } else {
    patch.pricingUnit = AiPricingUnit.PerImage;
  }
  updateModel(index, patch);
}

// 能力位勾选：以能力位为准，自动同步兼容视图 modelType 与相关属性
function changeCapabilities(
  index: number,
  capability: number,
  checked: boolean,
) {
  const target = models.value[index];
  if (!target) return;
  let caps = Number(target.capabilities ?? 0);
  caps = checked ? caps | capability : caps & ~capability;
  const patch: Partial<CreateUpdateAiChannelModelDto> = { capabilities: caps };
  const mt = capabilitiesToModelType(caps);
  if (mt !== target.modelType) {
    patch.modelType = mt;
    if (mt === AiModelType.Text) {
      patch.maxImagesPerRequest = 1;
      patch.supportedSizes = null;
      if (target.pricingUnit === AiPricingUnit.PerImage) {
        patch.pricingUnit = AiPricingUnit.PerRequest;
      }
    } else if (target.pricingUnit !== AiPricingUnit.PerImage) {
      patch.pricingUnit = AiPricingUnit.PerImage;
    }
  }
  updateModel(index, patch);
}

/** 能力位展示清单（勾选组合） */
const capabilityOptions = [
  AiModelCapability.Chat,
  AiModelCapability.ImageGeneration,
  AiModelCapability.ImageEditing,
  AiModelCapability.Vision,
];

// --- 尺寸编辑：友好的标签式输入 ---
function openSizeEditor(index: number) {
  sizeEditorIndex.value = index;
  const raw = models.value[index]?.supportedSizes ?? '';
  // 兼容 JSON 数组 或 逗号分隔字符串
  let list: string[] = [];
  try {
    const parsed = JSON.parse(String(raw));
    if (Array.isArray(parsed)) list = parsed.map(String).filter(Boolean);
  } catch {
    list = String(raw || '')
      .split(/[,，\s]+/)
      .filter(Boolean);
  }
  sizeEditorList.value = list;
  sizeEditorInput.value = '';
  sizeEditorVisible.value = true;
}

function addSizeTag() {
  const v = sizeEditorInput.value.trim();
  if (!v) return;
  if (!/^\d+\s*[x×]\s*\d+$/i.test(v)) {
    message.warning('尺寸格式应为 宽x高，如 1024x1024');
    return;
  }
  const normalized = v.replaceAll(/\s*/g, '').toLowerCase().replace('×', 'x');
  if (!sizeEditorList.value.includes(normalized)) {
    sizeEditorList.value.push(normalized);
  }
  sizeEditorInput.value = '';
}

/** gpt-image-2 30 档常见尺寸（对齐 apiyi gpt-image-2-vip：10 比例 × 3 分辨率档） */
const COMMON_SIZE_TIERS = [
  {
    tier: '1k',
    label: '1K Fast · 草稿/低成本试稿',
    sizes: [
      '1280x1280',
      '848x1280',
      '1280x848',
      '960x1280',
      '1280x960',
      '1024x1280',
      '1280x1024',
      '720x1280',
      '1280x720',
      '1280x544',
    ],
  },
  {
    tier: '2k',
    label: '2K Recommended · 默认推荐档',
    sizes: [
      '2048x2048',
      '1360x2048',
      '2048x1360',
      '1536x2048',
      '2048x1536',
      '1632x2048',
      '2048x1632',
      '1152x2048',
      '2048x1152',
      '2048x864',
    ],
  },
  {
    tier: '4k',
    label: '4K Detail · 大尺寸交付物',
    sizes: [
      '2880x2880',
      '2336x3520',
      '3520x2336',
      '2480x3312',
      '3312x2480',
      '2560x3216',
      '3216x2560',
      '2160x3840',
      '3840x2160',
      '3840x1632',
    ],
  },
];

function isCommonSizeSelected(size: string): boolean {
  return sizeEditorList.value.includes(size);
}

function toggleCommonSize(size: string) {
  const idx = sizeEditorList.value.indexOf(size);
  if (idx === -1) {
    sizeEditorList.value.push(size);
  } else {
    sizeEditorList.value.splice(idx, 1);
  }
}

function isTierAllSelected(tierIdx: number): boolean {
  const sizes = COMMON_SIZE_TIERS[tierIdx]?.sizes ?? [];
  return (
    sizes.length > 0 && sizes.every((s) => sizeEditorList.value.includes(s))
  );
}

/** 全选/取消全选某一档位（1K/2K/4K） */
function toggleSizeTier(tierIdx: number) {
  const sizes = COMMON_SIZE_TIERS[tierIdx]?.sizes ?? [];
  if (isTierAllSelected(tierIdx)) {
    sizeEditorList.value = sizeEditorList.value.filter(
      (s) => !sizes.includes(s),
    );
  } else {
    for (const s of sizes) {
      if (!sizeEditorList.value.includes(s)) sizeEditorList.value.push(s);
    }
  }
}

function removeSizeTag(idx: number) {
  sizeEditorList.value.splice(idx, 1);
}

function saveSizeEditor() {
  if (sizeEditorIndex.value === null) return;
  const joined = sizeEditorList.value.join(',');
  updateModel(sizeEditorIndex.value, {
    supportedSizes: joined || null,
  });
  sizeEditorVisible.value = false;
  sizeEditorIndex.value = null;
}

// 解析显示尺寸标签
function parseSizeTags(supportedSizes: null | string | undefined): string[] {
  if (!supportedSizes) return [];
  try {
    const parsed = JSON.parse(String(supportedSizes));
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // fallthrough
  }
  return String(supportedSizes)
    .split(/[,，\s]+/)
    .filter(Boolean);
}

// --- 自动获取模型 ---
async function autoFetchModels() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  const values = await formApi.getValues();
  if (!values.baseUrl && values.providerType === 0) {
    message.warning('请先填写 Base URL 后再自动获取');
    return;
  }
  // 编辑模式：输入框初始为脱敏 Key，未重新填写真实 Key 时不能调用上游
  const useKey = values.apiKey;
  const isMaskedKey =
    !!currentFormValues.value.id &&
    !!useKey &&
    useKey === currentFormValues.value.apiKeyMasked;
  if ((!useKey || isMaskedKey) && currentFormValues.value.id) {
    // 提示用户需要重新填入 apiKey 才能自动抓取
    message.warning('编辑模式下请重新填入 API Key 以调用接口获取模型');
    return;
  }
  fetching.value = true;
  try {
    // 调用后端：直连上游 OpenAI 兼容端点 GET {baseUrl}/v1/models 拉取真实模型列表
    const result = await fetchChannelModels({
      providerType: values.providerType,
      baseUrl: values.baseUrl || undefined,
      apiKey: useKey || undefined,
    });
    const existing = new Set(
      models.value.map((m) => m.modelName?.trim()).filter(Boolean),
    );
    let added = 0;
    ((result as any[]) || []).forEach((m: any) => {
      const name = typeof m === 'string' ? m : m.id || m.name || m.model;
      if (!name || existing.has(String(name).trim())) return;
      models.value.push({
        displayName: '',
        enabled: true,
        maxImagesPerRequest: 1,
        modelName: String(name).trim(),
        modelType: AiModelType.Image,
        capabilities: 0,
        pricePerImage: values.defaultPricePerImage ?? 0,
        pricingUnit: AiPricingUnit.PerImage,
        priority: 100,
        supportedSizes: null,
        disabledRequestParams: 0,
        defaultResponseFormat: null,
        sizeMode: 0,
        paramProfileJson: null,
        weight: 1,
      });
      existing.add(String(name).trim());
      added++;
    });
    message.success(added > 0 ? `已自动添加 ${added} 个模型` : '未发现新模型');
  } catch (error: any) {
    message.error(error?.message || '获取模型失败，请检查 Base URL 与 API Key');
  } finally {
    fetching.value = false;
  }
}

async function onSubmit(values: Record<string, any>) {
  const payload: CreateUpdateAiChannelDto = {
    apiKey:
      values.apiKey &&
      values.apiKey === (currentFormValues.value.apiKeyMasked || '')
        ? null
        : values.apiKey || null,
    baseUrl: values.baseUrl || null,
    description: values.description || null,
    enabled: values.enabled ?? true,
    extraConfig: values.extraConfig || null,
    maxRetryCount: values.maxRetryCount ?? 1,
    models: models.value
      .filter((item) => item.modelName?.trim())
      .map((item) => ({
        ...item,
        modelName: item.modelName.trim(),
      })),
    name: values.name,
    priority: values.priority ?? 100,
    providerType: values.providerType ?? 0,
    timeoutSeconds: values.timeoutSeconds ?? 120,
    weight: values.weight ?? 1,
  };
  try {
    values.id
      ? await updateChannel(values.id, payload)
      : await createChannel(payload);
    message.success('保存成功');
    emit('change');
    modalApi.close();
  } catch (error: any) {
    message.error(error?.message || '保存失败');
  }
}
</script>

<template>
  <Modal title="模型渠道配置" :width="1760">
    <!-- 渠道基础信息：两列布局 -->
    <div class="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
      <Form />
    </div>

    <!-- 模型与计费区域 -->
    <div
      class="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
    >
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-sm font-semibold">模型与计费单价</div>
          <div class="text-xs text-gray-400">
            按模型类型（图片/文本）配置单价、计价单位（元/张、元/次、元/1M
            tokens）、单次张数与支持尺寸，支持批量删除
          </div>
        </div>
        <Space>
          <Button
            size="small"
            :loading="fetching"
            type="dashed"
            @click="autoFetchModels"
          >
            自动获取模型
          </Button>
          <Popconfirm
            v-if="selectedIndexes.size > 0"
            title="确认删除选中的模型配置？"
            ok-text="删除"
            cancel-text="取消"
            @confirm="batchRemoveModels"
          >
            <Button danger size="small">
              批量删除 ({{ selectedIndexes.size }})
            </Button>
          </Popconfirm>
          <Button size="small" type="primary" ghost @click="addModel">
            + 添加模型
          </Button>
        </Space>
      </div>

      <div
        v-if="models.length"
        class="channel-models-table-wrapper max-h-[420px] overflow-y-auto overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700"
      >
        <table class="w-full min-w-[1240px] text-sm">
          <thead class="sticky top-0 z-10">
            <tr class="bg-gray-50 dark:bg-gray-800">
              <th class="w-10 px-2 py-2 text-center font-medium">
                <Checkbox
                  :checked="isAllSelected"
                  :indeterminate="isPartialSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th
                class="min-w-[200px] px-3 py-2 text-left font-medium"
                title="对外暴露给用户的模型名称，如 gpt-image-2 / deepseek-v4-flash"
              >
                模型名
              </th>
              <th
                class="min-w-[160px] px-3 py-2 text-left font-medium"
                title="前台模型选择器对外显示的别名；留空则显示模型名"
              >
                显示别名
              </th>
              <th
                class="w-28 px-3 py-2 text-left font-medium"
                title="模型能力类型：图片生成或文本对话，决定可配置属性与计费方式"
              >
                模型类型
              </th>
              <th
                class="min-w-[220px] px-3 py-2 text-left font-medium"
                title="能力位（Flags）：对话/文生图/图生图/视觉理解，决定路由与前端可配置项"
              >
                能力
              </th>
              <th
                class="w-36 px-3 py-2 text-left font-medium"
                title="单价，按计价单位计费：图片按张、文本按次或按 1M tokens"
              >
                单价（元）
              </th>
              <th
                class="w-32 px-3 py-2 text-left font-medium"
                title="计价单位：图片固定元/张，文本可选元/次、元/1M tokens"
              >
                计价单位
              </th>
              <th
                class="w-24 px-3 py-2 text-left font-medium"
                title="单次请求最多生成的图片张数（仅图片模型）"
              >
                最多张数
              </th>
              <th
                class="min-w-[240px] px-3 py-2 text-left font-medium"
                title="模型支持的输出尺寸，如 1024x1024（仅图片模型）"
              >
                支持尺寸
              </th>
              <th
                class="w-32 px-3 py-2 text-left font-medium"
                title="后台配置该模型请求时默认使用的返回格式（url / b64_json），不从前台透传；自动=交给 Provider 默认（b64_json 便于本地落库）"
              >
                默认返回格式
              </th>
              <th
                class="w-36 px-3 py-2 text-left font-medium"
                title="尺寸发送模式：自动=按 OpenAI 官方直传 WxH；档位字面量=size 只传 1k/2k/4k（如 GPTeam gpt-image-2 必须传档位才出 4K，任意像素仅当比例参考）"
              >
                尺寸模式
              </th>
              <th
                class="w-28 px-3 py-2 text-left font-medium"
                title="请求参数适配策略（JSON）：质量/张数映射、aspect_ratio、固定附加参数等，配置驱动适配不同供应商参数差异，无需改代码"
              >
                参数适配
              </th>
              <th
                class="min-w-[300px] px-3 py-2 text-left font-medium"
                title="渠道不支持的请求参数（如 apiyi gpt-image-2-vip 不接受 n/quality），勾选后请求时跳过该参数"
              >
                禁用请求参数
              </th>
              <th class="w-16 px-3 py-2 text-center font-medium">启用</th>
              <th class="w-14 px-3 py-2 text-center font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(model, index) in models"
              :key="index"
              class="border-t border-gray-100 align-top transition-colors hover:bg-gray-50/50 dark:border-gray-700 dark:hover:bg-gray-800/40"
              :class="selectedIndexes.has(index) ? 'bg-primary/5' : ''"
            >
              <td class="px-2 py-2 text-center">
                <Checkbox
                  :checked="selectedIndexes.has(index)"
                  @change="toggleSelect(index)"
                />
              </td>
              <td class="px-3 py-2">
                <Input
                  :value="model.modelName"
                  placeholder="如 gpt-image-2 / deepseek-v4-flash"
                  size="small"
                  @update:value="
                    (value: string) => updateModel(index, { modelName: value })
                  "
                />
              </td>
              <td class="px-3 py-2">
                <Input
                  :value="model.displayName ?? ''"
                  placeholder="如 文生图旗舰（留空=用模型名）"
                  size="small"
                  @update:value="
                    (value: string) =>
                      updateModel(index, { displayName: value.trim() || null })
                  "
                />
              </td>
              <td class="px-3 py-2">
                <Select
                  :value="model.modelType"
                  size="small"
                  class="w-full"
                  :options="modelTypeOptions"
                  @update:value="
                    (value: any) => changeModelType(index, Number(value))
                  "
                />
              </td>
              <td class="px-3 py-2">
                <div
                  class="flex min-h-[32px] flex-wrap items-center gap-x-2 gap-y-1"
                >
                  <label
                    v-for="cap in capabilityOptions"
                    :key="cap"
                    class="flex cursor-pointer items-center gap-1 text-xs"
                  >
                    <Checkbox
                      :checked="Boolean(Number(model.capabilities ?? 0) & cap)"
                      @change="
                        (e: any) =>
                          changeCapabilities(
                            index,
                            cap,
                            Boolean(e.target.checked),
                          )
                      "
                    />
                    <span
                      class="select-none whitespace-nowrap text-gray-600 dark:text-gray-300"
                    >
                      {{ AiModelCapabilityLabels[cap] }}
                    </span>
                  </label>
                </div>
              </td>
              <td class="px-3 py-2">
                <InputNumber
                  :min="0"
                  :precision="4"
                  :step="0.01"
                  :value="model.pricePerImage"
                  size="small"
                  class="w-full"
                  :formatter="
                    (v: any) => (v === '' || v == null ? '' : `¥ ${v}`)
                  "
                  :parser="(v: any) => String(v).replace(/[^0-9.]/g, '')"
                  @update:value="
                    (value: any) =>
                      updateModel(index, { pricePerImage: Number(value ?? 0) })
                  "
                />
              </td>
              <td class="px-3 py-2">
                <Select
                  :value="model.pricingUnit"
                  size="small"
                  class="w-full"
                  :disabled="model.modelType === AiModelType.Image"
                  :options="pricingUnitOptions(model.modelType)"
                  @update:value="
                    (value: any) =>
                      updateModel(index, { pricingUnit: Number(value) })
                  "
                />
              </td>
              <td class="px-3 py-2">
                <div
                  v-if="model.modelType === AiModelType.Text"
                  class="pt-1 text-center text-gray-400"
                >
                  —
                </div>
                <InputNumber
                  v-else
                  :min="1"
                  :max="8"
                  :value="model.maxImagesPerRequest"
                  size="small"
                  class="w-full"
                  @update:value="
                    (value: any) =>
                      updateModel(index, {
                        maxImagesPerRequest: Number(value ?? 1),
                      })
                  "
                />
              </td>
              <td class="px-3 py-2">
                <div
                  v-if="model.modelType === AiModelType.Text"
                  class="pt-1 text-center text-gray-400"
                >
                  —
                </div>
                <div
                  v-else
                  class="flex min-h-[32px] flex-wrap items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-900"
                >
                  <Tag
                    v-for="(t, i) in parseSizeTags(model.supportedSizes)"
                    :key="i"
                    color="green"
                    class="m-0"
                  >
                    {{ t }}
                  </Tag>
                  <Button
                    type="link"
                    size="small"
                    class="m-0 h-6 px-1 text-xs"
                    @click="openSizeEditor(index)"
                  >
                    {{
                      parseSizeTags(model.supportedSizes).length
                        ? '编辑'
                        : '+ 添加尺寸'
                    }}
                  </Button>
                </div>
              </td>
              <td class="px-3 py-2">
                <div
                  v-if="model.modelType === AiModelType.Text"
                  class="pt-1 text-center text-gray-400"
                >
                  —
                </div>
                <Select
                  v-else
                  :value="model.defaultResponseFormat ?? ''"
                  size="small"
                  class="w-full"
                  :options="responseFormatOptions"
                  title="后台配置该模型返回格式（url / b64_json），不从前台透传"
                  @update:value="
                    (value: any) =>
                      updateModel(index, {
                        defaultResponseFormat: value || null,
                      })
                  "
                />
              </td>
              <td class="px-3 py-2">
                <div
                  v-if="model.modelType === AiModelType.Text"
                  class="pt-1 text-center text-gray-400"
                >
                  —
                </div>
                <Select
                  v-else
                  :value="model.sizeMode ?? 0"
                  size="small"
                  class="w-full"
                  :options="sizeModeOptions"
                  title="尺寸发送模式：自动=直传 WxH；档位=size 传 1k/2k/4k（GPTeam gpt-image-2 等供应商必须选档位模式才能出 4K）"
                  @update:value="
                    (value: any) =>
                      updateModel(index, { sizeMode: Number(value) })
                  "
                />
              </td>
              <td class="px-3 py-2">
                <div
                  v-if="model.modelType === AiModelType.Text"
                  class="pt-1 text-center text-gray-400"
                >
                  —
                </div>
                <Button
                  v-else
                  size="small"
                  class="w-full"
                  title="编辑请求参数适配策略（JSON）：质量/张数映射、aspect_ratio、固定附加参数"
                  @click="openParamProfileEditor(index)"
                >
                  {{ model.paramProfileJson ? '编辑策略' : '配置策略' }}
                </Button>
              </td>
              <td class="px-3 py-2">
                <div
                  v-if="model.modelType === AiModelType.Text"
                  class="pt-1 text-center text-gray-400"
                >
                  —
                </div>
                <div
                  v-else
                  class="flex min-h-[32px] flex-wrap items-center gap-x-2 gap-y-1"
                >
                  <label
                    v-for="param in AiRequestParamOptions"
                    :key="param.value"
                    class="flex cursor-pointer items-center gap-1 text-xs"
                  >
                    <Checkbox
                      :checked="
                        Boolean(
                          Number(model.disabledRequestParams ?? 0) &
                          param.value,
                        )
                      "
                      @change="
                        (e: any) =>
                          toggleDisabledParam(
                            index,
                            param.value,
                            Boolean(e.target.checked),
                          )
                      "
                    />
                    <Tooltip
                      :title="param.description || param.label"
                      placement="top"
                    >
                      <InfoCircleOutlined
                        class="cursor-help text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      />
                    </Tooltip>
                    <span
                      class="select-none whitespace-nowrap text-gray-600 dark:text-gray-300"
                    >
                      {{ param.label }}
                    </span>
                  </label>
                </div>
              </td>
              <td class="px-3 py-2 pt-3 text-center">
                <Switch
                  :checked="model.enabled"
                  size="small"
                  @change="
                    (checked: any) => updateModel(index, { enabled: !!checked })
                  "
                />
              </td>
              <td class="px-3 py-2 pt-3 text-center">
                <Popconfirm
                  title="确认删除该模型？"
                  ok-text="删除"
                  cancel-text="取消"
                  @confirm="removeModel(index)"
                >
                  <Button danger size="small" type="text"> 删除 </Button>
                </Popconfirm>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-else
        class="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400 dark:border-gray-600"
      >
        <div class="mb-1">暂无模型</div>
        <div class="text-xs opacity-80">
          点击「自动获取模型」或手动添加模型开始配置
        </div>
        <Button
          size="small"
          type="primary"
          ghost
          class="mt-3"
          @click="addModel"
        >
          + 添加模型
        </Button>
      </div>
    </div>

    <!-- 尺寸编辑弹窗 -->
    <AntModal
      v-model:open="sizeEditorVisible"
      title="编辑支持尺寸"
      :footer="null"
      :width="640"
      @ok="saveSizeEditor"
      @cancel="sizeEditorVisible = false"
    >
      <div class="mb-3">
        <Space.Compact style="width: 100%">
          <Input
            v-model:value="sizeEditorInput"
            placeholder="输入尺寸，如 1024x1024 后回车或点击添加"
            @press-enter="addSizeTag"
          />
          <Button type="primary" @click="addSizeTag">添加</Button>
        </Space.Compact>
        <div class="mt-1 text-xs text-gray-400">
          支持格式：宽x高（小写 x），例如 1024x1536
        </div>
      </div>

      <!-- 30 档常见尺寸快速勾选（按 1K/2K/4K 分组） -->
      <div class="mt-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
            常见尺寸（gpt-image-2 30 档，点击快速勾选）
          </span>
        </div>
        <div class="space-y-3">
          <div
            v-for="(tier, ti) in COMMON_SIZE_TIERS"
            :key="tier.tier"
            class="rounded-md border border-gray-200 p-3 dark:border-gray-700"
          >
            <div class="mb-2 flex items-center justify-between">
              <span
                class="text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                {{ tier.label }}
              </span>
              <Checkbox
                :checked="isTierAllSelected(ti)"
                @change="toggleSizeTier(ti)"
              >
                <span class="text-xs">全选本组</span>
              </Checkbox>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <Tag
                v-for="size in tier.sizes"
                :key="size"
                :color="isCommonSizeSelected(size) ? 'blue' : 'default'"
                class="m-0 cursor-pointer select-none"
                @click="toggleCommonSize(size)"
              >
                {{ size }}
              </Tag>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4">
        <div
          class="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400"
        >
          已选尺寸
        </div>
        <div
          class="flex min-h-[80px] flex-wrap content-start gap-2 rounded-md border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-800/40"
        >
          <Tag
            v-for="(t, i) in sizeEditorList"
            :key="i"
            closable
            color="cyan"
            @close="removeSizeTag(i)"
          >
            {{ t }}
          </Tag>
          <span
            v-if="sizeEditorList.length === 0"
            class="self-center text-xs text-gray-400"
          >
            还没有添加尺寸
          </span>
        </div>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <Button @click="sizeEditorVisible = false">取消</Button>
        <Button type="primary" @click="saveSizeEditor">确定</Button>
      </div>
    </AntModal>

    <!-- 参数适配策略编辑弹窗（供应商参数差异映射） -->
    <AntModal
      v-model:open="paramProfileVisible"
      title="请求参数适配策略（JSON）"
      :footer="null"
      :width="720"
      @cancel="paramProfileVisible = false"
    >
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs text-gray-500 dark:text-gray-400">
          配置驱动适配不同供应商参数差异，无需改代码；留空使用 OpenAI
          官方默认语义。
        </span>
        <Button size="small" type="link" @click="fillParamProfileExample">
          填充 GPTEAM gpt-image-2 示例
        </Button>
      </div>
      <div class="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        支持的字段
      </div>
      <ul
        class="mb-3 list-disc pl-5 text-xs leading-relaxed text-gray-500 dark:text-gray-400"
      >
        <li>sizeMode：0=直传 WxH，1=档位字面量 1k/2k/4k</li>
        <li>
          sizeTierMap：前端档位 → 上游字面量映射（如 {"1k":"1k","4k":"4k"}）
        </li>
        <li>defaultSizeTier：前端未选档位时的默认档位（如 "4k"）</li>
        <li>
          emitAspectRatio：是否把尺寸换算为 aspect_ratio 附加（GPTEAM 支持）
        </li>
        <li>qualityValueMap / fixedQuality：质量值映射或固定质量</li>
        <li>fixedCount：固定张数（>0 时忽略前端 n）</li>
        <li>
          extraParams：固定附加/覆盖参数（如
          {"upscale":"4k","resize_mode":"proportional"}）
        </li>
      </ul>
      <Input.TextArea
        v-model:value="paramProfileText"
        :rows="10"
        class="font-mono"
        placeholder="{&#10;  &quot;sizeMode&quot;: 1,&#10;  &quot;emitAspectRatio&quot;: true&#10;}"
      />
      <div class="mt-4 flex justify-end gap-2">
        <Button @click="paramProfileVisible = false">取消</Button>
        <Button type="primary" @click="saveParamProfile">确定</Button>
      </div>
    </AntModal>
  </Modal>
</template>

<style scoped>
.channel-models-table-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.channel-models-table-wrapper::-webkit-scrollbar-thumb {
  background: rgb(156 163 175 / 50%);
  border-radius: 4px;
}

.channel-models-table-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgb(107 114 128 / 60%);
}
</style>
