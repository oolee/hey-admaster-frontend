<script setup lang="ts">
import type { BlobContainerPolicyDto } from '#/api/blob-container-policy';

import { onMounted, reactive, ref } from 'vue';

import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Table,
  Tag,
  message,
} from 'ant-design-vue';

import { useBlobContainerPolicyApi } from '#/api/blob-container-policy';

defineOptions({ name: 'AiDesignBlobContainerPolicy' });

const { clear, getList, update } = useBlobContainerPolicyApi();

const loading = ref(false);
const containers = ref<BlobContainerPolicyDto[]>([]);

async function loadList() {
  loading.value = true;
  try {
    const result = await getList();
    containers.value = result.items ?? [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadList);

// ---------- 编辑 ----------
const editVisible = ref(false);
const saving = ref(false);
const editingId = ref('');
const editForm = reactive<{
  maxFileSizeMb?: number | null;
  allowedExtensions?: string | null;
  concurrencyStamp: string;
}>({
  maxFileSizeMb: null,
  allowedExtensions: null,
  concurrencyStamp: '',
});

function openEdit(row: BlobContainerPolicyDto) {
  editingId.value = row.id;
  editForm.maxFileSizeMb = row.maxFileSizeMb;
  editForm.allowedExtensions = row.allowedExtensions;
  editForm.concurrencyStamp = row.concurrencyStamp;
  editVisible.value = true;
}

async function saveEdit() {
  saving.value = true;
  try {
    await update(editingId.value, {
      maxFileSizeMb: editForm.maxFileSizeMb,
      allowedExtensions: editForm.allowedExtensions,
      concurrencyStamp: editForm.concurrencyStamp,
    });
    message.success('容器策略已更新');
    editVisible.value = false;
    await loadList();
  } finally {
    saving.value = false;
  }
}

function clearPolicy(row: BlobContainerPolicyDto) {
  Modal.confirm({
    centered: true,
    title: '确认清除容器策略？',
    content: `清除后「${row.name}」将完全回退系统默认设置（对象存储设置）。`,
    okText: '确认清除',
    cancelText: '取消',
    onOk: async () => {
      await clear(row.id);
      message.success('已清除容器策略');
      await loadList();
    },
  });
}

const columns = [
  { title: '容器名称', dataIndex: 'name', key: 'name', width: 220 },
  { title: 'Provider', dataIndex: 'provider', key: 'provider', width: 140 },
  {
    title: '单文件上限 (MB)',
    dataIndex: 'maxFileSizeMb',
    key: 'maxFileSizeMb',
    width: 170,
  },
  {
    title: '允许扩展名',
    dataIndex: 'allowedExtensions',
    key: 'allowedExtensions',
    width: 280,
  },
  { title: '已配置', dataIndex: 'hasPolicy', key: 'hasPolicy', width: 90 },
  { title: '操作', key: 'action', width: 160 },
];
</script>

<template>
  <div>
    <div class="mb-3 flex items-center justify-between">
      <div>
        <div class="text-xl font-semibold">容器策略</div>
        <div class="mt-0.5 text-sm text-gray-500">
          按容器覆盖「系统设置 → 对象存储设置」默认值（当前系统默认 5MB）；未配置的项自动回退系统默认。
          AI 生图容器（ai-design-images / ai-template-covers）已预置 20MB 策略，高清图片可正常落库。
        </div>
      </div>
      <Button type="primary" @click="loadList">刷新</Button>
    </div>

    <Table
      :columns="columns"
      :data-source="containers"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'maxFileSizeMb'">
          <span v-if="record.maxFileSizeMb != null">
            {{ record.maxFileSizeMb }} MB
          </span>
          <span v-else class="text-gray-400">系统默认 (5MB)</span>
        </template>
        <template v-else-if="column.key === 'allowedExtensions'">
          <span v-if="record.allowedExtensions">
            {{ record.allowedExtensions }}
          </span>
          <span v-else class="text-gray-400">系统默认</span>
        </template>
        <template v-else-if="column.key === 'hasPolicy'">
          <Tag :color="record.hasPolicy ? 'green' : 'default'">
            {{ record.hasPolicy ? '已配置' : '未配置' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <div class="flex flex-row gap-2">
            <Button type="link" size="small" @click="openEdit(record as BlobContainerPolicyDto)">
              编辑
            </Button>
            <Button
              v-if="record.hasPolicy"
              danger
              type="link"
              size="small"
              @click="clearPolicy(record as BlobContainerPolicyDto)"
            >
              清除
            </Button>
          </div>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="editVisible"
      title="编辑容器策略"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="saving"
      @ok="saveEdit"
    >
      <Form layout="vertical" class="pt-2">
        <Form.Item label="单文件大小上限 (MB)">
          <InputNumber
            v-model:value="editForm.maxFileSizeMb as any"
            :min="1"
            :max="1024"
            class="w-full"
            placeholder="留空 = 回退系统设置 (5MB)"
          />
        </Form.Item>
        <Form.Item
          label="允许的文件扩展名"
          extra="逗号分隔，例如 png,jpg,jpeg,webp；留空 = 回退系统设置"
        >
          <Input
            v-model:value="editForm.allowedExtensions as any"
            placeholder="png,jpg,jpeg,webp"
          />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>