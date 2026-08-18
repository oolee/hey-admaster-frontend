<script setup lang="ts">
import type { UpdateAiDesignSettingsInput } from '#/api/ai-design';

import { onMounted, ref } from 'vue';

import { useVbenForm } from '@vben/common-ui';

import { Button, Card, message } from 'ant-design-vue';

import { useAiDesignApi } from '#/api/ai-design';

defineOptions({ name: 'AiDesignSettings' });

const { getSettings, updateSettings } = useAiDesignApi();
const saving = ref(false);
const loaded = ref(false);

// ── 分组1：数据保留策略 ──
const [RetentionForm, retentionFormApi] = useVbenForm({
  commonConfig: { colon: true, controlClass: 'w-full' },
  schema: [
    {
      component: 'InputNumber',
      componentProps: { min: 1, max: 3650 },
      fieldName: 'defaultRetentionDays',
      label: '默认保留天数（登录用户）',
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 1, max: 3650 },
      fieldName: 'guestRetentionDays',
      label: '访客保留天数（未登录）',
    },
    {
      component: 'InputTextArea',
      componentProps: {
        placeholder:
          '{"Standard":30,"Pro":180} 按订阅版本名设置保留天数，留空则使用默认值',
        rows: 2,
      },
      fieldName: 'editionRetentionDays',
      label: '订阅版本保留天数（JSON）',
    },
  ],
  showDefaultActions: false,
});

// ── 分组2：生成与计费 ──
const [GenerationForm, generationFormApi] = useVbenForm({
  commonConfig: { colon: true, controlClass: 'w-full' },
  schema: [
    {
      component: 'InputNumber',
      componentProps: { min: 1, max: 8 },
      fieldName: 'maxImagesPerRequest',
      label: '单次请求最多生成张数',
    },
    {
      component: 'Input',
      fieldName: 'defaultModel',
      label: '默认模型',
      componentProps: {
        placeholder: '如：gpt-image-2，渠道未配置时回退到此模型',
      },
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, precision: 4, step: 0.01 },
      fieldName: 'defaultPricePerImage',
      label: '默认单价（元/张）',
    },
    {
      component: 'Switch',
      controlClass: 'w-auto',
      fieldName: 'enableMockProvider',
      label: '启用 Mock Provider（演示/测试）',
    },
  ],
  showDefaultActions: false,
});

// ── 分组3：存储与清理 ──
const [StorageForm, storageFormApi] = useVbenForm({
  commonConfig: { colon: true, controlClass: 'w-full' },
  schema: [
    {
      component: 'Input',
      fieldName: 'containerName',
      label: 'BLOB 容器名',
      componentProps: {
        placeholder: '留空使用模块默认容器',
      },
    },
    {
      component: 'InputNumber',
      componentProps: { min: 5, step: 5 },
      fieldName: 'cleanupPeriodMinutes',
      label: '过期数据清理周期（分钟）',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 10, step: 10 },
      fieldName: 'cleanupBatchSize',
      label: '清理批次大小',
    },
  ],
  showDefaultActions: false,
});

// ── 分组4：统一网关（new-api）──
const [GatewayForm, gatewayFormApi] = useVbenForm({
  commonConfig: { colon: true, controlClass: 'w-full' },
  schema: [
    {
      component: 'Input',
      fieldName: 'gatewayBaseUrl',
      label: '网关 BaseUrl',
      componentProps: {
        placeholder: '如：http://localhost:8300（new-api），留空则回退渠道直连',
      },
    },
    {
      component: 'InputPassword',
      fieldName: 'gatewayApiKey',
      label: '网关 API Key',
      componentProps: {
        placeholder: '填写新密钥才会覆盖；留空保持不变',
        autocomplete: 'new-password',
      },
    },
    {
      component: 'InputNumber',
      componentProps: { min: 1, max: 600 },
      fieldName: 'gatewayTimeoutSeconds',
      label: '网关超时（秒）',
    },
    {
      component: 'Switch',
      controlClass: 'w-auto',
      fieldName: 'gatewayEnableSse',
      label: '文本对话启用 SSE 流式',
    },
    {
      component: 'Input',
      fieldName: 'gatewayExternalBaseUrl',
      label: '对外域名（备用）',
      componentProps: {
        placeholder: '部署到服务器后使用的域名，留空使用 BaseUrl',
      },
    },
  ],
  showDefaultActions: false,
});

// ── 分组6：内容守卫与费用确认（PRD 17.5.2 L2/L3）──
const [GuardForm, guardFormApi] = useVbenForm({
  commonConfig: { colon: true, controlClass: 'w-full' },
  schema: [
    {
      component: 'Switch',
      controlClass: 'w-auto',
      fieldName: 'guardEnabled',
      label: '启用内容守卫（敏感词拦截）',
    },
    {
      component: 'InputTextArea',
      componentProps: {
        placeholder:
          '逗号/顿号/分号分隔，如：违禁品,私聊；留空仅用内置基础词库',
        rows: 2,
      },
      fieldName: 'guardSensitiveWords',
      label: '自定义敏感词库',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, precision: 2, step: 1 },
      fieldName: 'guardMaxSingleOrderAmount',
      label: '单次费用确认阈值（元，0=不拦截）',
    },
  ],
  showDefaultActions: false,
});

// ── 分组5：提示词优化 ──
const [PromptForm, promptFormApi] = useVbenForm({
  commonConfig: { colon: true, controlClass: 'w-full' },
  schema: [
    {
      component: 'Switch',
      controlClass: 'w-auto',
      fieldName: 'promptOptimizationEnabled',
      label: '启用提示词优化（后台文本模型精简）',
    },
    {
      component: 'Input',
      fieldName: 'promptOptimizationModel',
      label: '优化模型',
      componentProps: {
        placeholder: '如：deepseek-chat，留空自动选择启用的文本模型',
      },
    },
  ],
  showDefaultActions: false,
});

const allFormApis = [
  retentionFormApi,
  generationFormApi,
  storageFormApi,
  gatewayFormApi,
  promptFormApi,
  guardFormApi,
];

function setAllValues(values: Record<string, any>) {
  allFormApis.forEach((api) => api.setValues(values));
}

async function collectAllValues(): Promise<Record<string, any>> {
  const [a, b, c, d, e, f] = await Promise.all(
    allFormApis.map((api) => api.submitForm()),
  );
  return { ...a, ...b, ...c, ...d, ...e, ...f };
}

onMounted(async () => {
  try {
    const settings = await getSettings();
    setAllValues(settings);
    loaded.value = true;
  } catch (error: any) {
    message.error(error?.message || '加载设置失败');
  }
});

async function onSave() {
  saving.value = true;
  try {
    // Validate all forms first
    for (const api of allFormApis) {
      await api.validate();
    }
    const values = await collectAllValues();
    const input: UpdateAiDesignSettingsInput = {
      cleanupBatchSize: values.cleanupBatchSize,
      cleanupPeriodMinutes: values.cleanupPeriodMinutes,
      containerName: values.containerName || null,
      defaultModel: values.defaultModel || null,
      defaultPricePerImage: values.defaultPricePerImage,
      defaultRetentionDays: values.defaultRetentionDays,
      editionRetentionDays: values.editionRetentionDays || null,
      enableMockProvider: values.enableMockProvider ?? false,
      guestRetentionDays: values.guestRetentionDays,
      maxImagesPerRequest: values.maxImagesPerRequest,
      gatewayBaseUrl: values.gatewayBaseUrl || null,
      gatewayApiKey: values.gatewayApiKey || null,
      gatewayTimeoutSeconds: values.gatewayTimeoutSeconds,
      gatewayEnableSse: values.gatewayEnableSse ?? true,
      gatewayExternalBaseUrl: values.gatewayExternalBaseUrl || null,
      promptOptimizationEnabled: values.promptOptimizationEnabled ?? false,
      promptOptimizationModel: values.promptOptimizationModel || null,
      guardEnabled: values.guardEnabled ?? true,
      guardSensitiveWords: values.guardSensitiveWords || null,
      guardMaxSingleOrderAmount: values.guardMaxSingleOrderAmount,
    };
    const result = await updateSettings(input);
    setAllValues(result);
    message.success('设置已保存');
  } catch (error: any) {
    if (error?.message) {
      message.error(error.message);
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <!-- Header -->
    <div class="mb-5">
      <div class="text-xl font-semibold tracking-tight">AI 设计模块设置</div>
      <div class="mt-1 text-sm text-gray-500">
        全局保留策略、生成计费参数与存储清理配置。修改保存后即时生效。
      </div>
    </div>

    <!-- Cards grid -->
    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Card 1: 数据保留策略 -->
      <Card class="shadow-sm" :bordered="true">
        <template #title>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-green-100 text-green-700 text-sm font-bold dark:bg-green-900/30 dark:text-green-400"
            >
              R
            </span>
            <span class="font-semibold">数据保留策略</span>
          </div>
        </template>
        <RetentionForm />
      </Card>

      <!-- Card 2: 生成与计费 -->
      <Card class="shadow-sm" :bordered="true">
        <template #title>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-sm font-bold dark:bg-blue-900/30 dark:text-blue-400"
            >
              G
            </span>
            <span class="font-semibold">生成与计费</span>
          </div>
        </template>
        <GenerationForm />
      </Card>

      <!-- Card 3: 存储与清理 -->
      <Card class="shadow-sm lg:col-span-2" :bordered="true">
        <template #title>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 text-sm font-bold dark:bg-purple-900/30 dark:text-purple-400"
            >
              S
            </span>
            <span class="font-semibold">存储与清理</span>
          </div>
        </template>
        <div class="grid gap-x-8 gap-y-1 md:grid-cols-3">
          <StorageForm />
        </div>
      </Card>

      <!-- Card 5: 提示词优化 -->
      <Card class="shadow-sm lg:col-span-2" :bordered="true">
        <template #title>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 text-sm font-bold dark:bg-cyan-900/30 dark:text-cyan-400"
            >
              P
            </span>
            <span class="font-semibold">提示词优化</span>
          </div>
        </template>
        <div class="grid gap-x-8 gap-y-1 md:grid-cols-2">
          <PromptForm />
        </div>
        <div
          class="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300"
        >
          启用后，AI 设计页的「AI 优化提示词」会调用后台文本模型（如
          deepseek）把用户提示词与已选设计参数精简为一条简短有效的生图提示词；未启用或调用失败时回退本地结构化拼接。
        </div>
      </Card>

      <!-- Card 6: 内容守卫与费用确认 -->
      <Card class="shadow-sm lg:col-span-2" :bordered="true">
        <template #title>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700 text-sm font-bold dark:bg-rose-900/30 dark:text-rose-400"
            >
              G
            </span>
            <span class="font-semibold">内容守卫与费用确认</span>
          </div>
        </template>
        <div class="grid gap-x-8 gap-y-1 md:grid-cols-3">
          <GuardForm />
        </div>
        <div
          class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
        >
          内容守卫：用户提示词命中敏感词时直接拦截（内置基础词库 +
          上方自定义词库）。费用确认：单次预估费用超过阈值时，C
          端需用户点击「确认并生成」才继续（0 表示不拦截）。
        </div>
      </Card>

      <!-- Card 4: 统一网关（new-api） -->
      <Card class="shadow-sm lg:col-span-2" :bordered="true">
        <template #title>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 text-sm font-bold dark:bg-amber-900/30 dark:text-amber-400"
            >
              G
            </span>
            <span class="font-semibold">统一网关（new-api）</span>
          </div>
        </template>
        <div class="grid gap-x-8 gap-y-1 md:grid-cols-2">
          <GatewayForm />
        </div>
        <div
          class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          配置网关后，所有模型请求统一走 new-api 中转（OpenAI
          兼容协议），渠道自身的 BaseUrl/Key 仅作为未配置网关时的直连回退。
        </div>
      </Card>
    </div>

    <!-- Actions -->
    <div class="mt-6 flex items-center justify-between">
      <div
        class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
      >
        <div class="font-semibold">保留策略说明</div>
        <ul class="mt-1 list-inside list-disc space-y-0.5 text-xs opacity-90">
          <li>访客会话：按「访客保留天数」自动清理（默认 1 天）</li>
          <li>登录用户：优先按订阅版本（JSON）匹配，未匹配则使用默认</li>
          <li>清理任务周期性扫描，批量删除过期消息与 BLOB 图片</li>
        </ul>
      </div>
      <Button type="primary" size="large" :loading="saving" @click="onSave">
        保存设置
      </Button>
    </div>
  </div>
</template>
