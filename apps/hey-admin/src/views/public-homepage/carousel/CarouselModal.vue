<script setup lang="ts">
import type {
  CarouselItemAdminDto,
  CreateUpdateCarouselItemDto,
} from '#/api/public-homepage';

import { useVbenForm, useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import {
  getBlobImageUrl,
  getCarouselImageUrl,
  useCarouselApi,
} from '#/api/public-homepage';

const emits = defineEmits<{ (event: 'change'): void }>();
const { get, create, update, uploadImage } = useCarouselApi();

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
      fieldName: 'title',
      label: '标题',
      rules: 'required',
    },
    {
      component: 'Upload',
      componentProps: {
        accept: 'image/*',
        customRequest: async ({ file, onSuccess, onError }: any) => {
          try {
            const result = await uploadImage(file);
            const fileObj = {
              uid: file.uid || '-1',
              name: file.name,
              status: 'done',
              response: result,
              url: getBlobImageUrl(result.blobName),
            };
            formApi.setFieldValue('image', [fileObj]);
            onSuccess(result);
            message.success('上传成功');
          } catch {
            onError(new Error('上传失败'));
            message.error('上传失败');
          }
        },
        maxCount: 1,
      },
      fieldName: 'image',
      label: '图片',
    },
    { component: 'Input', fieldName: 'description', label: '描述' },
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
  const { id } = modalApi.getData<CarouselItemAdminDto>();
  if (id) {
    const dto = await get(id);
    formApi.setValues({
      ...dto,
      image: [
        {
          uid: '-1',
          name: `${dto.id.replaceAll('-', '')}.jpg`,
          status: 'done',
          url: getCarouselImageUrl(dto.id),
        },
      ],
    });
  }
}

async function onSubmit(values: Record<string, any>) {
  const input = { ...values } as CreateUpdateCarouselItemDto;
  const fileList = values.image;
  if (Array.isArray(fileList) && fileList.length > 0) {
    input.tempBlobName = fileList[0]?.response?.blobName || '';
  }
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
  <Modal title="轮播图">
    <Form />
  </Modal>
</template>
