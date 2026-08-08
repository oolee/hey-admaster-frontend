<script setup lang="ts">
import type {
  AiChannelDto,
  CreateUpdateAiChannelDto,
  CreateUpdateAiChannelModelDto,
} from '#/api/ai-design';

import { ref } from 'vue';

import { useVbenForm, useVbenModal } from '@vben/common-ui';

import {
  Button,
  Input,
  InputNumber,
  message,
  Modal,
  Space,
  Switch,
  Tag,
} from 'ant-design-vue';

import { AiChannelProviderLabels, useAiDesignApi } from '#/api/ai-design';

const emit = defineEmits<{ (event: 'change'): void }>();
const {
  createChannel,
  updateChannel,
  fetchChannelModels: _fetch,
} = useAiDesignApi();

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
        placeholder: '新增时必填；编辑时留空表示保持不变',
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
// 尺寸编辑：弹窗中编辑每个模型的尺寸列表
const sizeEditorVisible = ref(false);
const sizeEditorIndex = ref<null | number>(null);
const sizeEditorInput = ref('');
const sizeEditorList = ref<string[]>([]);

const [Modal, modalApi] = useVbenModal({
  width: 880,
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
      apiKey: '',
      ...record,
    });
    models.value = (record.models || []).map((item) => ({
      enabled: item.enabled,
      maxImagesPerRequest: item.maxImagesPerRequest,
      modelName: item.modelName,
      pricePerImage: item.pricePerImage,
      priority: item.priority,
      supportedSizes: item.supportedSizes ?? null,
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
    enabled: true,
    maxImagesPerRequest: 1,
    modelName: '',
    pricePerImage: 0,
    priority: 100,
    supportedSizes: null,
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
  const values = await formApi.submitForm();
  if (!values.baseUrl && values.providerType === 0) {
    message.warning('请先填写 Base URL 后再自动获取');
    return;
  }
  // 编辑时保留原 apiKey；如果未填写则使用当前已保存的（不提交明文）
  const useKey = values.apiKey;
  if (!useKey && currentFormValues.value.id) {
    // 提示用户需要重新填入 apiKey 才能自动抓取
    message.warning('编辑模式下请重新填入 API Key 以调用接口获取模型');
    return;
  }
  fetching.value = true;
  try {
    // 调用后端接口：根据 providerType/baseUrl/apiKey 获取模型列表
    if (typeof _fetch === 'function') {
      const result = await _fetch({
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
          enabled: true,
          maxImagesPerRequest: 1,
          modelName: String(name).trim(),
          pricePerImage: values.defaultPricePerImage ?? 0,
          priority: 100,
          supportedSizes: null,
          weight: 1,
        });
        existing.add(String(name).trim());
        added++;
      });
      message.success(
        added > 0 ? `已自动添加 ${added} 个模型` : '未发现新模型',
      );
    } else {
      // 无后端接口时回退：添加常用默认模型
      const defaults = [
        'gpt-image-1',
        'gpt-image-2',
        'dall-e-3',
        'qwen-image-v1',
        'jimeng-v1',
      ];
      const existing = new Set(
        models.value.map((m) => m.modelName?.trim()).filter(Boolean),
      );
      let added = 0;
      defaults.forEach((name) => {
        if (existing.has(name)) return;
        models.value.push({
          enabled: true,
          maxImagesPerRequest: 1,
          modelName: name,
          pricePerImage: 0,
          priority: 100,
          supportedSizes: null,
          weight: 1,
        });
        added++;
      });
      message.success(`已添加常用默认模型 ${added} 个（后端接口未接入）`);
    }
  } catch (error: any) {
    message.error(error?.message || '获取模型失败，请检查 Base URL 与 API Key');
  } finally {
    fetching.value = false;
  }
}

async function onSubmit(values: Record<string, any>) {
  const payload: CreateUpdateAiChannelDto = {
    apiKey: values.apiKey || null,
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
    if (values.id) {
      await updateChannel(values.id, payload);
    } else {
      await createChannel(payload);
    }
    message.success('保存成功');
    emit('change');
    modalApi.close();
  } catch (error: any) {
    message.error(error?.message || '保存失败');
  }
}
</script>

<template>
  <Modal title="模型渠道配置" :width="880">
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
            配置对外服务的模型、单价、单次最多张数与支持尺寸
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
          <Button size="small" type="primary" ghost @click="addModel">
            + 添加模型
          </Button>
        </Space>
      </div>

      <div
        v-if="models.length"
        class="channel-models-table-wrapper max-h-[420px] overflow-y-auto overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700"
      >
        <table class="w-full min-w-[760px] text-sm">
          <thead class="sticky top-0 z-10">
            <tr class="bg-gray-50 dark:bg-gray-800">
              <th class="px-3 py-2 text-left font-medium">模型名</th>
              <th class="w-28 px-3 py-2 text-left font-medium">
                单价/张（元）
              </th>
              <th class="w-24 px-3 py-2 text-left font-medium">最多张数</th>
              <th class="w-80 px-3 py-2 text-left font-medium">支持尺寸</th>
              <th class="w-16 px-3 py-2 text-center font-medium">启用</th>
              <th class="w-14 px-3 py-2 text-center font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(model, index) in models"
              :key="index"
              class="border-t border-gray-100 align-top transition-colors hover:bg-gray-50/50 dark:border-gray-700 dark:hover:bg-gray-800/40"
            >
              <td class="px-3 py-2">
                <Input
                  :value="model.modelName"
                  placeholder="如 gpt-image-2"
                  size="small"
                  @update:value="
                    (value: string) => updateModel(index, { modelName: value })
                  "
                />
              </td>
              <td class="px-3 py-2">
                <InputNumber
                  :min="0"
                  :precision="4"
                  :step="0.01"
                  :value="model.pricePerImage"
                  size="small"
                  class="w-full"
                  @update:value="
                    (value: any) =>
                      updateModel(index, { pricePerImage: Number(value ?? 0) })
                  "
                />
              </td>
              <td class="px-3 py-2">
                <InputNumber
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
                <Button
                  danger
                  size="small"
                  type="text"
                  @click="removeModel(index)"
                >
                  删除
                </Button>
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
          点击右上角「自动获取模型」或「添加模型」开始配置
        </div>
      </div>
    </div>

    <!-- 尺寸编辑弹窗 -->
    <Modal
      v-model:open="sizeEditorVisible"
      title="编辑支持尺寸"
      :footer="null"
      :width="480"
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
      <div
        class="flex min-h-[140px] flex-wrap content-start gap-2 rounded-md border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-800/40"
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
      <div class="mt-4 flex justify-end gap-2">
        <Button @click="sizeEditorVisible = false">取消</Button>
        <Button type="primary" @click="saveSizeEditor">确定</Button>
      </div>
    </Modal>
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
