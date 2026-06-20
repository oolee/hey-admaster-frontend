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
        {{ store.projectName || "婚礼请柬" }}
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
          <button class="btn-page" :disabled="currentPageIndex <= 0" @click="prevPage">
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
          <button class="btn-page" :disabled="currentPageIndex >= totalPages - 1" @click="nextPage">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useEditorStore } from '#/store/editor';
import { publishWeb } from "#/api/publish";

const router = useRouter();
const store = useEditorStore();

const loading = ref(false);
const error = ref("");
const h5Url = ref("");

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
  router.push("/");
};

const retry = () => {
  error.value = "";
  loadPreview();
};

const loadPreview = async () => {
  loading.value = true;
  error.value = "";

  try {
    store.persist();
    const pages = JSON.parse(JSON.stringify(store.pages));
    const res = await publishWeb({
      pages,
      name: store.projectName || "invitation",
      canvasWidth: store.canvasWidth,
      canvasHeight: store.canvasHeight,
      pageTransition: store.pageTransition,
    });

    if (res && res.data && res.data.url) {
      h5Url.value = res.data.url;
    } else if (res && res.code === 0) {
      // Mock mode - network unavailable, generate a local URL
      h5Url.value = "/h5/local-preview";
      store.showToast("Mock 模式：预览可能不准确", "warning");
    } else {
      throw new Error((res?.message as string) || "发布失败");
    }
  } catch (e: any) {
    error.value = "预览加载失败: " + (e?.message || String(e));
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadPreview();
});
</script>

<style scoped>
.preview-viewport {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: radial-gradient(circle at 50% 30%, #2a1f3d 0%, #1a1528 50%, #0f0d1a 100%);
  padding: 20px 10px;
  position: relative;
}

.preview-viewport::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 15% 85%, rgba(255, 107, 107, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 85% 15%, rgba(255, 200, 150, 0.06) 0%, transparent 40%);
  pointer-events: none;
  z-index: 0;
}

.preview-header {
  width: 100%;
  max-width: 900px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  color: #e8d4c4;
  z-index: 1;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e8d4c4;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(-2px);
}

.preview-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  letter-spacing: 3px;
  color: #d4b8a0;
  font-family: "Microsoft YaHei", serif;
}

.preview-title i {
  color: #ff6b6b;
  font-size: 14px;
  animation: heartBeat 1.2s ease-in-out infinite;
}

@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.preview-spacer { width: 100px; }

.preview-loading,
.preview-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #999;
  font-size: 14px;
  z-index: 1;
}

.preview-loading i {
  font-size: 28px;
  animation: spin 1.2s linear infinite;
  color: #e94560;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.preview-error i {
  font-size: 32px;
  color: #e94560;
}

.preview-error .btn-back { margin-top: 12px; }

.preview-canvas-wrapper {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  z-index: 1;
}

/* H5 手机外壳 */
.h5-device-frame {
  position: relative;
  background: #1a1a1a;
  border-radius: 40px;
  padding: 14px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.18), inset 0 0 0 2px #f5deb3;
}

.h5-iframe {
  display: block;
  width: 320px;
  height: 628px;
  border: none;
  border-radius: 26px;
  overflow: hidden;
}

.preview-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}

.btn-page {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #c9b99a;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-page:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.btn-page:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-page.active {
  background: rgba(255, 107, 107, 0.25);
  border-color: rgba(255, 107, 107, 0.5);
  color: #fff;
  font-weight: bold;
}
</style>
