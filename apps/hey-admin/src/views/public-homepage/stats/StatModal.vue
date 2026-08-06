<script setup lang="ts">
import type {
  CreateUpdateStatItemDto,
  StatItemAdminDto,
} from '#/api/public-homepage';

import { useVbenForm, useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useStatApi } from '#/api/public-homepage';

const emits = defineEmits<{ (event: 'change'): void }>();
const { get, create, update } = useStatApi();

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
      fieldName: 'number',
      label: '数值',
      rules: 'required',
    },
    {
      component: 'Input',
      fieldName: 'label',
      label: '标签',
      rules: 'required',
    },
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

async function onGet() {
  formApi.resetForm();
  const { id } = modalApi.getData<StatItemAdminDto>();
  if (id) {
    const dto = await get(id);
    formApi.setValues(dto);
  }
}

async function onSubmit(values: Record<string, any>) {
  const input = values as CreateUpdateStatItemDto;
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
  <Modal title="统计数据">
    <Form />
  </Modal>
</template>
