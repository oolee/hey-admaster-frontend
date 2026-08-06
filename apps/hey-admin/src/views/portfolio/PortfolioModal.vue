<script setup lang="ts">
import type {
  CreateUpdatePortfolioItemDto,
  PortfolioImageDto,
  PortfolioItemAdminDto,
} from '#/api/portfolio';

import { h, ref } from 'vue';

import { useVbenForm, useVbenModal } from '@vben/common-ui';

import { Button, message, Modal, Upload } from 'ant-design-vue';

import {
  getBlobImageUrl,
  getCoverImageUrl,
  getGalleryImageUrl,
  usePortfolioApi,
} from '#/api/portfolio';

const emits = defineEmits<{ (event: 'change'): void }>();
const {
  get,
  create,
  update,
  uploadCover,
  updateCover,
  getImages,
  uploadGalleryImage,
  addImage,
  deleteImage,
} = usePortfolioApi();

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
      component: 'Input',
      fieldName: 'category',
      label: '分类',
      rules: 'required',
    },
    {
      component: 'Upload',
      componentProps: {
        accept: 'image/*',
        customRequest: async ({ file, onSuccess, onError }: any) => {
          try {
            const result = await uploadCover(file);
            const fileObj = {
              uid: file.uid || '-1',
              name: file.name,
              status: 'done',
              response: result,
              url: getBlobImageUrl(result.blobName),
            };
            formApi.setFieldValue('coverFile', [fileObj]);
            onSuccess(result);
            message.success('上传成功');
          } catch {
            onError(new Error('上传失败'));
            message.error('上传失败');
          }
        },
        maxCount: 1,
        listType: 'picture-card',
        onPreview: (file: any) => previewImage(file?.url || ''),
      },
      fieldName: 'coverFile',
      label: '封面图',
    },
    { component: 'InputTextArea', fieldName: 'description', label: '简要描述' },
    {
      component: 'InputTextArea',
      fieldName: 'content',
      label: '内容（富文本 HTML）',
    },
    {
      component: 'Select',
      componentProps: {
        mode: 'tags',
        placeholder: '输入标签后按回车添加',
        tokenSeparators: [',', '，'],
      },
      fieldName: 'tags',
      label: '标签',
      defaultValue: [],
    },
    { component: 'Input', fieldName: 'client', label: '客户' },
    {
      component: 'InputNumber',
      fieldName: 'year',
      label: '年份',
      defaultValue: new Date().getFullYear(),
    },
    {
      component: 'Switch',
      fieldName: 'isFeatured',
      label: '精选',
      defaultValue: false,
      controlClass: 'w-auto',
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

// ===== 配图管理（仅编辑已存在案例时可用） =====
const editingId = ref<null | string>(null);
const galleryImages = ref<PortfolioImageDto[]>([]);
const galleryLoading = ref(false);
const galleryUploading = ref(false);

function previewImage(url: string) {
  if (!url) return;
  Modal.info({
    centered: true,
    title: '图片预览',
    content: h('img', { src: url, style: 'width: 100%; border-radius: 6px' }),
    okText: '关闭',
  });
}

async function loadGallery(portfolioItemId: string) {
  galleryLoading.value = true;
  try {
    const res = await getImages(portfolioItemId);
    galleryImages.value = res.items;
  } catch {
    message.error('加载配图失败');
  } finally {
    galleryLoading.value = false;
  }
}

async function onUploadGallery(file: File) {
  if (!editingId.value) {
    message.warning('请先保存案例，再上传配图');
    return;
  }
  galleryUploading.value = true;
  try {
    const result = await uploadGalleryImage(file);
    await addImage({
      portfolioItemId: editingId.value,
      tempBlobName: result.blobName,
      caption: '',
      sortOrder: galleryImages.value.length,
    });
    await loadGallery(editingId.value);
    message.success('配图上传成功');
  } catch {
    message.error('配图上传失败');
  } finally {
    galleryUploading.value = false;
  }
}

function onDeleteGalleryImage(image: PortfolioImageDto) {
  Modal.confirm({
    centered: true,
    content: '确认删除这张配图吗？删除后无法恢复。',
    onOk: async () => {
      try {
        await deleteImage(image.id);
        if (editingId.value) await loadGallery(editingId.value);
        message.success('配图已删除');
      } catch {
        message.error('删除失败');
      }
    },
    title: '删除配图',
  });
}

async function onGet() {
  formApi.resetForm();
  editingId.value = null;
  galleryImages.value = [];
  const data = modalApi.getData<PortfolioItemAdminDto>();
  if (data?.id) {
    const dto = await get(data.id);
    editingId.value = data.id;
    // 解析 tags JSON 数组为字符串数组
    let parsedTags: string[] = [];
    if (dto.tags) {
      try {
        const arr = JSON.parse(dto.tags);
        if (Array.isArray(arr)) parsedTags = arr;
      } catch {
        /* keep empty */
      }
    }
    formApi.setValues({
      ...dto,
      tags: parsedTags,
      coverFile: [
        {
          uid: '-1',
          name: 'cover.jpg',
          status: 'done',
          url: getCoverImageUrl(dto.id),
        },
      ],
    });
    await loadGallery(dto.id);
  }
}

async function onSubmit(values: Record<string, any>) {
  const { coverFile, ...rest } = values;
  // 将 tags 数组序列化为 JSON 字符串
  const tagsValue = Array.isArray(values.tags)
    ? JSON.stringify(values.tags)
    : values.tags || '[]';
  const input = { ...rest, tags: tagsValue } as CreateUpdatePortfolioItemDto;
  try {
    modalApi.setState({ submitting: true });
    let itemId = values.id as string | undefined;
    if (itemId) {
      await update(itemId, input);
    } else {
      const result = await create(input);
      itemId = result.id;
    }
    // 将封面从临时路径移动到正式路径 portfolio/{itemId}/cover.jpg
    const tempBlobName = (coverFile as any[])?.[0]?.response?.blobName;
    if (itemId && tempBlobName) {
      await updateCover(itemId, tempBlobName);
    }
    message.success('保存成功');
    emits('change');
    modalApi.close();
  } finally {
    modalApi.setState({ submitting: false });
  }
}
</script>

<template>
  <Modal title="案例">
    <Form />
    <!-- 配图管理：仅编辑已存在案例时可用 -->
    <div v-if="editingId" class="gallery-section">
      <div class="gallery-header">
        <span class="gallery-title">案例配图</span>
        <Upload
          accept="image/*"
          :custom-request="
            ({ file, onSuccess, onError }: any) => {
              onUploadGallery(file)
                .then(() => onSuccess?.({}))
                .catch(() => onError?.(new Error('上传失败')));
            }
          "
          :disabled="galleryUploading"
          :show-upload-list="false"
        >
          <Button :loading="galleryUploading" size="small" type="dashed">
            上传配图
          </Button>
        </Upload>
      </div>
      <div v-if="galleryLoading" class="gallery-empty">配图加载中...</div>
      <div v-else-if="galleryImages.length === 0" class="gallery-empty">
        暂无配图，上传后将在案例详情页展示
      </div>
      <div v-else class="gallery-grid">
        <div
          v-for="image in galleryImages"
          :key="image.id"
          class="gallery-item"
        >
          <img
            :src="getGalleryImageUrl(editingId, image.id)"
            :alt="image.caption || '配图'"
            style="cursor: pointer"
            @click="previewImage(getGalleryImageUrl(editingId, image.id))"
            loading="lazy"
          />
          <Button
            danger
            size="small"
            type="link"
            @click="onDeleteGalleryImage(image)"
          >
            删除
          </Button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.gallery-section {
  padding-top: 12px;
  margin-top: 16px;
  border-top: 1px dashed rgb(128 128 128 / 30%);
}

.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.gallery-title {
  font-weight: 600;
}

.gallery-empty {
  padding: 16px 0;
  font-size: 13px;
  color: rgb(128 128 128 / 80%);
  text-align: center;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.gallery-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.gallery-item img {
  width: 100%;
  height: 64px;
  object-fit: cover;
  border-radius: 4px;
}
</style>
