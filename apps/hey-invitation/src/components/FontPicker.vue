<script setup lang="ts">
import type { FontItem } from '../utils/fonts';

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { useEditorStore } from '../store/editor';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();

const store = useEditorStore();

const panelVisible = ref(false);
const searchQuery = ref('');
const containerRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const licenseDialogVisible = ref(false);
const licenseAgreed = ref(false);
const pendingFontFile = ref<File | null>(null);

const filteredFonts = computed(() => {
  const all = store.allFonts;
  if (!searchQuery.value.trim()) return all;
  const q = searchQuery.value.trim().toLowerCase();
  return all.filter(
    (f) =>
      f.name.toLowerCase().includes(q) || f.family.toLowerCase().includes(q),
  );
});

const currentFontName = computed(() => {
  const found = store.allFonts.find((f) => f.family === props.modelValue);
  return found ? found.name : props.modelValue || '默认字体';
});

const togglePanel = () => {
  panelVisible.value = !panelVisible.value;
  if (panelVisible.value) {
    nextTick(() => {
      searchInputRef.value?.focus();
      searchInputRef.value?.select();
    });
  }
};

const selectFont = (font: FontItem) => {
  emit('update:modelValue', font.family);
  panelVisible.value = false;
  searchQuery.value = '';
};

const onUploadClick = () => {
  licenseAgreed.value = false;
  licenseDialogVisible.value = true;
};

const onConfirmUpload = () => {
  licenseDialogVisible.value = false;
  fileInputRef.value?.click();
};

const onFileSelected = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    const dataUrl = reader.result as string;
    const fileName = file.name.replace(/\.[^.]+$/, '');
    const familyName = `UserFont_${fileName}_${Date.now()}`;
    const displayName = `${fileName} (我上传的)`;
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: "${familyName}";
        src: url("${dataUrl}") format("${file.type === 'font/woff2' ? 'woff2' : file.type === 'font/woff' ? 'woff' : 'truetype'}");
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    `;
    document.head.append(style);
    const success = store.addCustomFont({
      name: displayName,
      family: familyName,
      type: 'user',
      provider: '用户上传',
      license: '用户自备授权',
      uploadedAt: Date.now(),
      url: dataUrl,
    });
    if (success) {
      emit('update:modelValue', familyName);
    }
  });
  reader.readAsDataURL(file);
  input.value = '';
};

const onDeleteUserFont = (family: string) => {
  store.deleteCustomFont(family);
  if (props.modelValue === family) {
    emit('update:modelValue', 'Microsoft YaHei');
  }
  store.showToast('字体已删除', 'success');
};

const handleClickOutside = (e: MouseEvent) => {
  if (!containerRef.value) return;
  if (!containerRef.value.contains(e.target as Node)) {
    panelVisible.value = false;
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<template>
  <div class="font-picker" ref="containerRef">
    <button
      type="button"
      class="font-picker-btn"
      @click="togglePanel"
      :style="{ fontFamily: modelValue }"
    >
      <span class="font-picker-label">{{ currentFontName }}</span>
      <i class="bi bi-chevron-down font-picker-icon"></i>
    </button>

    <Transition name="font-panel">
      <div v-if="panelVisible" class="font-panel" @click.stop>
        <div class="font-panel-search">
          <i class="bi bi-search search-icon"></i>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="form-control form-control-sm font-search-input"
            placeholder="搜索字体名称..."
          />
        </div>

        <div class="font-panel-list">
          <div v-if="filteredFonts.length === 0" class="font-empty">
            <i class="bi bi-inbox"></i>
            <span>没有找到匹配的字体</span>
          </div>

          <div
            v-for="font in filteredFonts"
            :key="font.family"
            class="font-item"
            :class="{
              active: font.family === modelValue,
              'font-user': font.type === 'user',
            }"
            @click="selectFont(font)"
          >
            <div class="font-item-left">
              <!-- prettier-ignore -->
              <span
                class="font-item-name"
                :style="{ fontFamily: font.family }"
                >{{ font.name }}</span>
              <span class="font-item-badge" :class="`badge-${font.type}`">
                {{
                  font.type === 'user'
                    ? '用户字体'
                    : font.type === 'google'
                      ? '免费商用'
                      : '系统'
                }}
              </span>
            </div>
            <div class="font-item-right">
              <span v-if="font.license" class="font-item-license">{{
                font.license
              }}</span>
              <i
                v-if="font.family === modelValue"
                class="bi bi-check2 font-item-check"
              ></i>
              <button
                v-if="font.type === 'user'"
                class="btn-delete-font"
                @click.stop="onDeleteUserFont(font.family)"
                title="删除字体"
              >
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="font-panel-footer">
          <div class="font-panel-warning">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span>请确保您上传的字体具有合法使用授权，避免版权侵权风险</span>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-outline-primary font-upload-btn"
            @click="onUploadClick"
          >
            <i class="bi bi-upload"></i> 上传字体
          </button>
          <input
            type="file"
            ref="fileInputRef"
            accept=".ttf,.otf,.woff,.woff2"
            class="font-file-input"
            @change="onFileSelected"
          />
        </div>
      </div>
    </Transition>

    <!-- 上传授权声明弹窗 -->
    <Transition name="modal">
      <div
        v-if="licenseDialogVisible"
        class="license-modal-mask"
        @click="licenseDialogVisible = false"
      >
        <div class="license-modal" @click.stop>
          <div class="license-modal-header">
            <span class="license-modal-title">
              <i class="bi bi-shield-lock-fill"></i> 字体使用授权声明
            </span>
            <button
              type="button"
              class="btn-close-small"
              @click="licenseDialogVisible = false"
            >
              <i class="bi bi-x"></i>
            </button>
          </div>
          <div class="license-modal-body">
            <div class="license-notice">
              <p><strong>请您在上传字体前，认真阅读以下说明：</strong></p>
              <ol>
                <li>
                  您上传的字体必须为您个人合法拥有或已取得合法授权的字体文件。
                </li>
                <li>
                  本平台不会对您上传字体的版权归属做任何审核或担保，也不承担任何因字体侵权产生的法律责任。
                </li>
                <li>
                  如果您是商用目的（包括婚礼请柬用于商业场景），请确保字体的商业使用已获得版权方许可。
                </li>
                <li>
                  您上传的字体文件仅在您的浏览器本地存储，不会上传到任何服务器。
                </li>
                <li>
                  如因上传未授权商用字体导致版权方追究责任，责任由您个人全部承担。
                </li>
              </ol>
              <p>
                <!-- prettier-ignore -->
                <strong>推荐使用免费商用字体（如 Google Fonts 中的 Noto Sans SC
                  等），可直接在列表中选用，无需上传。</strong>
              </p>
            </div>
            <div class="license-checkbox">
              <label>
                <input type="checkbox" v-model="licenseAgreed" />
                我已阅读并同意以上声明，确认所上传字体具有合法使用授权
              </label>
            </div>
          </div>
          <div class="license-modal-footer">
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="licenseDialogVisible = false"
            >
              取消
            </button>
            <button
              type="button"
              class="btn btn-sm btn-primary"
              :disabled="!licenseAgreed"
              @click="onConfirmUpload"
            >
              <i class="bi bi-check-circle"></i> 我已确认，继续上传
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
