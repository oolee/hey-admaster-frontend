<script setup lang="ts">
import type { AiBrandAsset, UploadBrandAssetInput } from '#/api/ai-design';

import { computed, onMounted, ref } from 'vue';

import {
  AiBrandAssetType,
  brandAssetContentUrl,
  createBrandAsset,
  deleteBrandAsset,
  fetchMyBrandAssets,
} from '#/api/ai-design';

const emit = defineEmits<{
  close: [];
  useAsset: [asset: AiBrandAsset];
}>();

const assets = ref<AiBrandAsset[]>([]);
const loading = ref(false);
const uploading = ref(false);
const errorMsg = ref('');
const filterType = ref<AiBrandAssetType | null>(null);

// ── 上传表单 ──
const name = ref('');
const assetType = ref<AiBrandAssetType>(AiBrandAssetType.Logo);
const tags = ref('');
const description = ref('');
const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<null | {
  contentType: string;
  dataBase64: string;
  name: string;
}>(null);

const filteredAssets = computed(() =>
  filterType.value === null
    ? assets.value
    : assets.value.filter((a) => a.assetType === filterType.value),
);

const assetTypeLabel = (t: AiBrandAssetType) =>
  t === AiBrandAssetType.Logo ? 'LOGO' : '参考图';

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const result = await fetchMyBrandAssets({ maxResultCount: 100 });
    assets.value = result.items ?? [];
  } catch (error) {
    errorMsg.value = (error as Error).message || '加载品牌资产失败';
  } finally {
    loading.value = false;
  }
}

function pickFile() {
  fileInput.value?.click();
}

function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    errorMsg.value = '仅支持图片文件';
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.addEventListener(
    'load',
    (e) => {
      const dataUrl = e.target?.result as string;
      const comma = dataUrl.indexOf(',');
      selectedFile.value = {
        name: file.name,
        dataBase64: comma === -1 ? dataUrl : dataUrl.slice(comma + 1),
        contentType: file.type || 'image/png',
      };
    },
    { once: true },
  );
  reader.readAsDataURL(file);
  input.value = '';
}

async function submit() {
  if (!name.value.trim()) {
    errorMsg.value = '请输入资产名称';
    return;
  }
  if (!selectedFile.value) {
    errorMsg.value = '请选择图片文件';
    return;
  }
  uploading.value = true;
  errorMsg.value = '';
  try {
    const input: UploadBrandAssetInput = {
      name: name.value.trim(),
      assetType: assetType.value,
      tags: tags.value.trim() || null,
      description: description.value.trim() || null,
      dataBase64: selectedFile.value.dataBase64,
      contentType: selectedFile.value.contentType,
      fileName: selectedFile.value.name,
    };
    await createBrandAsset(input);
    // 重置表单
    name.value = '';
    tags.value = '';
    description.value = '';
    selectedFile.value = null;
    await load();
  } catch (error) {
    errorMsg.value = (error as Error).message || '上传失败';
  } finally {
    uploading.value = false;
  }
}

async function remove(asset: AiBrandAsset) {
  if (!window.confirm(`确定删除「${asset.name}」吗？删除后无法恢复。`)) return;
  try {
    await deleteBrandAsset(asset.id);
    assets.value = assets.value.filter((a) => a.id !== asset.id);
  } catch (error) {
    errorMsg.value = (error as Error).message || '删除失败';
  }
}

function useAsReference(asset: AiBrandAsset) {
  emit('useAsset', asset);
}

onMounted(load);
</script>

<template>
  <div class="brand-asset-overlay" @click.self="emit('close')">
    <div class="brand-asset-panel">
      <div class="panel-header">
        <div class="panel-title">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="9" cy="9" r="2" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span>品牌资产库</span>
        </div>
        <button class="panel-close" title="关闭" @click="emit('close')">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p class="panel-desc">
        上传 LOGO / 品牌参考图，生成时一键作为参考图带入，避免重复上传。
      </p>

      <!-- Upload form -->
      <div class="upload-form">
        <div class="upload-row">
          <input
            v-model="name"
            class="form-input form-name"
            placeholder="资产名称（如：公司 LOGO）"
            maxlength="128"
          />
          <select v-model="assetType" class="form-input form-type">
            <option :value="AiBrandAssetType.Logo">LOGO</option>
            <option :value="AiBrandAssetType.Image">参考图</option>
          </select>
        </div>
        <div class="upload-row">
          <input
            v-model="tags"
            class="form-input"
            placeholder="标签（逗号分隔，如：主LOGO,横版）"
            maxlength="256"
          />
        </div>
        <div class="upload-row">
          <input
            v-model="description"
            class="form-input"
            placeholder="备注说明（可选）"
            maxlength="512"
          />
        </div>
        <div class="upload-row upload-actions">
          <button class="file-pick-btn" @click="pickFile">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {{ selectedFile ? selectedFile.name : '选择图片' }}
          </button>
          <button class="submit-btn" :disabled="uploading" @click="submit">
            {{ uploading ? '上传中...' : '保存到资产库' }}
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            hidden
            @change="handleFileSelected"
          />
        </div>
      </div>

      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

      <!-- Filters -->
      <div class="filter-row">
        <button
          class="filter-btn"
          :class="{ active: filterType === null }"
          @click="filterType = null"
        >
          全部
        </button>
        <button
          class="filter-btn"
          :class="{ active: filterType === AiBrandAssetType.Logo }"
          @click="filterType = AiBrandAssetType.Logo"
        >
          LOGO
        </button>
        <button
          class="filter-btn"
          :class="{ active: filterType === AiBrandAssetType.Image }"
          @click="filterType = AiBrandAssetType.Image"
        >
          参考图
        </button>
      </div>

      <!-- Asset grid -->
      <div class="asset-scroll">
        <div v-if="loading" class="empty-tip">加载中...</div>
        <div v-else-if="filteredAssets.length === 0" class="empty-tip">
          暂无资产，上传第一个 LOGO 吧
        </div>
        <div v-else class="asset-grid">
          <div
            v-for="asset in filteredAssets"
            :key="asset.id"
            class="asset-card"
          >
            <div class="asset-thumb">
              <img
                :src="asset.contentUrl || brandAssetContentUrl(asset.id)"
                :alt="asset.name"
                loading="lazy"
              />
            </div>
            <div class="asset-info">
              <div class="asset-name" :title="asset.name">{{ asset.name }}</div>
              <div class="asset-meta">
                <span
                  class="asset-type"
                  :class="{ logo: asset.assetType === AiBrandAssetType.Logo }"
                >
                  {{ assetTypeLabel(asset.assetType) }}
                </span>
                <span v-if="asset.width > 0" class="asset-size"
                  >{{ asset.width }}×{{ asset.height }}</span
                >
              </div>
              <div v-if="asset.tags" class="asset-tags">{{ asset.tags }}</div>
            </div>
            <div class="asset-actions">
              <button
                class="use-btn"
                title="作为参考图带入生成"
                @click="useAsReference(asset)"
              >
                用作参考图
              </button>
              <button class="del-btn" title="删除" @click="remove(asset)">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path
                    d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.brand-asset-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgb(0 0 0 / 55%);
  backdrop-filter: blur(4px);
  animation: asset-fade 0.18s ease-out;
}

.brand-asset-panel {
  display: flex;
  flex-direction: column;
  width: min(680px, 100%);
  max-height: min(82vh, 720px);
  padding: 18px 20px 16px;
  overflow: hidden;
  background: var(--color-bg-card, #181a20);
  border: 1px solid var(--color-border, #2a2d37);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgb(0 0 0 / 45%);
  animation: asset-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes asset-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes asset-pop {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.panel-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary, #f2f3f5);
}

.panel-title svg {
  color: var(--color-neon, #22d3ee);
}

.panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--color-text-muted, #8b90a0);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 8px;
  transition: all 0.15s;
}

.panel-close:hover {
  color: var(--color-text-primary, #f2f3f5);
  background: rgb(255 255 255 / 6%);
}

.panel-desc {
  margin: 0 0 12px;
  font-size: 0.72rem;
  color: var(--color-text-muted, #8b90a0);
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgb(255 255 255 / 3%);
  border: 1px solid var(--color-border, #2a2d37);
  border-radius: 12px;
}

.upload-row {
  display: flex;
  gap: 8px;
}

.form-input {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  font-size: 0.78rem;
  color: var(--color-text-primary, #f2f3f5);
  outline: none;
  background: var(--color-bg-primary, #101216);
  border: 1px solid var(--color-border, #2a2d37);
  border-radius: 8px;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--color-neon-dim, #164e63);
}

.form-input::placeholder {
  color: var(--color-text-muted, #8b90a0);
}

.form-name {
  flex: 2;
}

.form-type {
  flex: 0 0 104px;
  cursor: pointer;
}

.upload-actions {
  align-items: center;
  justify-content: flex-end;
}

.file-pick-btn {
  display: flex;
  gap: 6px;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  font-size: 0.75rem;
  color: var(--color-text-secondary, #c3c7d1);
  cursor: pointer;
  background: none;
  border: 1px dashed var(--color-border, #2a2d37);
  border-radius: 8px;
  transition: all 0.15s;
}

.file-pick-btn:hover {
  color: var(--color-neon, #22d3ee);
  border-color: var(--color-neon-dim, #164e63);
}

.submit-btn {
  height: 32px;
  padding: 0 16px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #04121a;
  cursor: pointer;
  background: var(--color-neon, #22d3ee);
  border: none;
  border-radius: 8px;
  transition: all 0.18s;
}

.submit-btn:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.error-msg {
  padding: 8px 10px;
  margin-top: 8px;
  font-size: 0.72rem;
  color: #f87171;
  background: rgb(248 113 113 / 10%);
  border-radius: 8px;
}

.filter-row {
  display: flex;
  gap: 6px;
  margin: 12px 0 10px;
}

.filter-btn {
  padding: 4px 12px;
  font-size: 0.72rem;
  color: var(--color-text-muted, #8b90a0);
  cursor: pointer;
  background: none;
  border: 1px solid var(--color-border, #2a2d37);
  border-radius: 999px;
  transition: all 0.15s;
}

.filter-btn.active,
.filter-btn:hover {
  color: var(--color-neon, #22d3ee);
  background: var(--color-neon-glow, rgb(34 211 238 / 8%));
  border-color: var(--color-neon-dim, #164e63);
}

.asset-scroll {
  flex: 1;
  min-height: 0;
  padding-right: 2px;
  overflow-y: auto;
}

.asset-scroll::-webkit-scrollbar {
  width: 4px;
}

.asset-scroll::-webkit-scrollbar-thumb {
  background: var(--color-border, #2a2d37);
  border-radius: 2px;
}

.empty-tip {
  padding: 36px 0;
  font-size: 0.78rem;
  color: var(--color-text-muted, #8b90a0);
  text-align: center;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 10px;
}

.asset-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgb(255 255 255 / 3%);
  border: 1px solid var(--color-border, #2a2d37);
  border-radius: 12px;
  transition: all 0.18s;
}

.asset-card:hover {
  border-color: var(--color-neon-dim, #164e63);
  transform: translateY(-2px);
}

.asset-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 110px;
  overflow: hidden;
  background: var(--color-bg-primary, #101216);
}

.asset-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.asset-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 8px 10px 4px;
}

.asset-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-primary, #f2f3f5);
  white-space: nowrap;
}

.asset-meta {
  display: flex;
  gap: 6px;
  align-items: center;
}

.asset-type {
  padding: 1px 6px;
  font-size: 0.62rem;
  color: #93c5fd;
  background: rgb(147 197 253 / 12%);
  border-radius: 4px;
}

.asset-type.logo {
  color: #fbbf24;
  background: rgb(251 191 36 / 12%);
}

.asset-size {
  font-size: 0.62rem;
  color: var(--color-text-muted, #8b90a0);
}

.asset-tags {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.62rem;
  color: var(--color-text-muted, #8b90a0);
  white-space: nowrap;
}

.asset-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 10px;
}

.use-btn {
  height: 26px;
  padding: 0 10px;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-neon, #22d3ee);
  cursor: pointer;
  background: var(--color-neon-glow, rgb(34 211 238 / 8%));
  border: 1px solid var(--color-neon-dim, #164e63);
  border-radius: 7px;
  transition: all 0.15s;
}

.use-btn:hover {
  filter: brightness(1.15);
}

.del-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: var(--color-text-muted, #8b90a0);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 7px;
  transition: all 0.15s;
}

.del-btn:hover {
  color: #f87171;
  background: rgb(248 113 113 / 10%);
}
</style>
