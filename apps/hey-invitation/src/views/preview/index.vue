<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { publishWeb } from '#/api/publish';
import { useEditorStore } from '#/store/editor';

const router = useRouter();
const store = useEditorStore();

const loading = ref(false);
const error = ref('');
const h5Url = ref('');

const pages = computed(() => store.pages || []);
const totalPages = computed(() => pages.value.length);
const currentPageIndex = computed(() => store.currentPageIndex);

const prevPage = () => {
  if (currentPageIndex.value > 0) {
    store.selectPage(pages.value[currentPageIndex.value - 1].id);
  }
};

const nextPage = () => {
  if (currentPageIndex.value < totalPages.value - 1) {
    store.selectPage(pages.value[currentPageIndex.value + 1].id);
  }
};

const gotoPage = (i: number) => {
  store.selectPage(pages.value[i].id);
};

const iframeRef = ref<HTMLIFrameElement | null>(null);

const goBack = () => {
  router.push('/');
};

const retry = () => {
  error.value = '';
  loadPreview();
};

const loadPreview = async () => {
  loading.value = true;
  error.value = '';

  try {
    store.persist();
    const pages = JSON.parse(JSON.stringify(store.pages));
    const res = await publishWeb({
      pages,
      name: store.projectName || 'invitation',
      canvasWidth: store.canvasWidth,
      canvasHeight: store.canvasHeight,
      pageTransition: store.pageTransition,
    });

    if (res && res.data && res.data.url) {
      h5Url.value = res.data.url;
    } else if (res && res.code === 0) {
      // Mock mode - network unavailable, generate a local URL
      h5Url.value = '/h5/local-preview';
      store.showToast('Mock 模式：预览可能不准确', 'warning');
    } else {
      throw new Error((res?.message as string) || '发布失败');
    }
  } catch (error: any) {
    error.value = `预览加载失败: ${error?.message || String(error)}`;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadPreview();
});
</script>

<template>
  <div class="preview-viewport">
    <!-- 顶部操作栏 -->
    <div class="preview-header">
      <button class="btn-back" @click="goBack">
        <i class="bi bi-arrow-left"></i>
        <span>返回编辑</span>
      </button>
      <div class="preview-title">
        <i class="bi bi-suit-heart-fill"></i>
        {{ store.projectName || '婚礼请柬' }}
      </div>
      <div class="preview-spacer"></div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="preview-loading">
      <i class="bi bi-arrow-repeat"></i>
      <span>正在发布并生成预览...</span>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="preview-error">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <span>{{ error }}</span>
      <button class="btn-back" @click="retry">
        <i class="bi bi-arrow-clockwise"></i> 重试
      </button>
    </div>

    <!-- H5 预览（iframe + 手机外壳） -->
    <template v-else-if="h5Url">
      <div class="preview-canvas-wrapper">
        <div class="h5-device-frame">
          <iframe
            ref="iframeRef"
            class="h5-iframe"
            :src="h5Url"
            frameborder="0"
            allowfullscreen
          ></iframe>
        </div>
        <div v-if="totalPages > 1" class="preview-pagination">
          <button
            class="btn-page"
            :disabled="currentPageIndex <= 0"
            @click="prevPage"
          >
            <i class="bi bi-chevron-left"></i>
          </button>
          <button
            v-for="(p, i) in pages"
            :key="p.id"
            class="btn-page"
            :class="{ active: i === currentPageIndex }"
            @click="gotoPage(i)"
          >
            {{ i + 1 }}
          </button>
          <button
            class="btn-page"
            :disabled="currentPageIndex >= totalPages - 1"
            @click="nextPage"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.preview-viewport {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 20px 10px;
  background: radial-gradient(
    circle at 50% 30%,
    #2a1f3d 0%,
    #1a1528 50%,
    #0f0d1a 100%
  );
}

.preview-viewport::before {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  content: '';
  background:
    radial-gradient(
      circle at 15% 85%,
      rgb(255 107 107 / 8%) 0%,
      transparent 40%
    ),
    radial-gradient(
      circle at 85% 15%,
      rgb(255 200 150 / 6%) 0%,
      transparent 40%
    );
}

.preview-header {
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 900px;
  padding: 12px 20px;
  color: #e8d4c4;
}

.btn-back {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 8px 16px;
  font-size: 14px;
  color: #e8d4c4;
  cursor: pointer;
  background: rgb(255 255 255 / 8%);
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 20px;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: rgb(255 255 255 / 15%);
  transform: translateX(-2px);
}

.preview-title {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-family: 'Microsoft YaHei', serif;
  font-size: 15px;
  color: #d4b8a0;
  letter-spacing: 3px;
}

.preview-title i {
  font-size: 14px;
  color: #ff6b6b;
  animation: heart-beat 1.2s ease-in-out infinite;
}

@keyframes heart-beat {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.2);
  }
}

.preview-spacer {
  width: 100px;
}

.preview-loading,
.preview-error {
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #999;
}

.preview-loading i {
  font-size: 28px;
  color: #e94560;
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.preview-error i {
  font-size: 32px;
  color: #e94560;
}

.preview-error .btn-back {
  margin-top: 12px;
}

.preview-canvas-wrapper {
  z-index: 1;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 20px 0;
}

/* H5 手机外壳 */
.h5-device-frame {
  position: relative;
  padding: 14px;
  background: #1a1a1a;
  border-radius: 40px;
  box-shadow:
    0 12px 48px rgb(0 0 0 / 18%),
    inset 0 0 0 2px #f5deb3;
}

.h5-iframe {
  display: block;
  width: 320px;
  height: 628px;
  overflow: hidden;
  border: none;
  border-radius: 26px;
}

.preview-pagination {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
}

.btn-page {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  font-size: 13px;
  color: #c9b99a;
  cursor: pointer;
  background: rgb(255 255 255 / 6%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.btn-page:hover:not(:disabled) {
  color: #fff;
  background: rgb(255 255 255 / 12%);
}

.btn-page:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.btn-page.active {
  font-weight: bold;
  color: #fff;
  background: rgb(255 107 107 / 25%);
  border-color: rgb(255 107 107 / 50%);
}
</style>
