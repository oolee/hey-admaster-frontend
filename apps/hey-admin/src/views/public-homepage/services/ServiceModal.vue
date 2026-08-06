<script setup lang="ts">
import type {
  CreateUpdateServiceItemDto,
  ServiceItemAdminDto,
} from '#/api/public-homepage';

import { useVbenForm, useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useServiceApi } from '#/api/public-homepage';

const emits = defineEmits<{ (event: 'change'): void }>();
const { get, create, update } = useServiceApi();

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
    { component: 'Input', fieldName: 'tag', label: '标签', rules: 'required' },
    {
      component: 'Input',
      fieldName: 'title',
      label: '标题',
      rules: 'required',
    },
    { component: 'Input', fieldName: 'icon', label: '图标' },
    {
      component: 'Select',
      componentProps: {
        mode: 'tags',
        placeholder: '输入特性后按回车添加',
        tokenSeparators: [',', '，'],
      },
      fieldName: 'features',
      label: '特性列表',
      defaultValue: [],
    },
    { component: 'Textarea', fieldName: 'description', label: '描述' },
    {
      component: 'InputNumber',
      fieldName: 'sortOrder',
      label: '排序',
      defaultValue: 0,
    },
    {
      component: 'Switch',
      fieldName: 'isActive',
      label: '启用',
      defaultValue: true,
      controlClass: 'w-auto',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await formApi.validateAndSubmitForm();
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      await onGet();
    }
  },
});

function parseFeatures(featuresJson: string): string[] {
  if (!featuresJson) return [];
  try {
    const parsed = JSON.parse(featuresJson);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function onGet() {
  formApi.resetForm();
  const { id } = modalApi.getData<ServiceItemAdminDto>();
  if (id) {
    const dto = await get(id);
    formApi.setValues({
      ...dto,
      features: parseFeatures(dto.features),
    });
  }
}

async function onSubmit(values: Record<string, any>) {
  // 将特性数组序列化为 JSON 字符串
  const featuresValue = Array.isArray(values.features)
    ? JSON.stringify(values.features)
    : values.features || '[]';
  const input = {
    ...values,
    features: featuresValue,
  } as CreateUpdateServiceItemDto;
  try {
    modalApi.setState({ submitting: true });
    values.id ? await update(values.id, input) : await create(input);
    message.success('保存成功');
    emits('change');
    modalApi.close();
  } finally {
    modalApi.setState({ submitting: false });
  }
}
</script>

<template>
  <Modal title="服务项目">
    <Form />
  </Modal>
</template>
