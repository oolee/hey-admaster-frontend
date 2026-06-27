<script setup lang="ts">
import { ref } from 'vue';

const isProcessing = ref(false);
const hasResult = ref(false);

function handleUpload() {
  isProcessing.value = true;
  setTimeout(() => {
    isProcessing.value = false;
    hasResult.value = true;
  }, 2000);
}
</script>

<template>
  <div class="tool-page">
    <div class="container-custom">
      <div class="tool-header">
        <RouterLink to="/tools" class="tool-back">← 返回工具箱</RouterLink>
        <h1 class="tool-title">一键抠图</h1>
        <p class="tool-desc">AI智能识别主体，一键去除背景</p>
      </div>

      <div class="tool-workspace">
        <div class="upload-area" @click="handleUpload">
          <div class="upload-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
              <path
                d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"
              />
            </svg>
          </div>
          <p class="upload-text">点击上传图片</p>
          <p class="upload-hint">支持 JPG、PNG 格式，最大 10MB</p>
        </div>

        <div v-if="isProcessing" class="processing">
          <div class="spinner"></div>
          <p>AI正在智能抠图中...</p>
        </div>

        <div v-if="hasResult" class="result-area">
          <div class="result-preview">
            <div class="preview-box">
              <span>原图</span>
              <div class="preview-placeholder">原图预览</div>
            </div>
            <div class="preview-box">
              <span>抠图结果</span>
              <div class="preview-placeholder result">透明背景</div>
            </div>
          </div>
          <div class="result-actions">
            <button class="btn-neon-filled">下载透明背景图</button>
            <button class="btn-neon">更换背景色</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-page {
  min-height: 100vh;
  padding-top: 100px;
  background: var(--color-bg-primary);
}

.tool-header {
  padding: 40px 0;
  text-align: center;
}

.tool-back {
  display: inline-block;
  margin-bottom: 16px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  transition: color 0.2s;
}

.tool-back:hover {
  color: var(--color-neon);
}

.tool-title {
  margin-bottom: 8px;
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  font-weight: 800;
  color: var(--color-text-primary);
}

.tool-desc {
  color: var(--color-text-secondary);
}

.tool-workspace {
  max-width: 800px;
  padding-bottom: 80px;
  margin: 0 auto;
}

.upload-area {
  padding: 60px 40px;
  text-align: center;
  cursor: pointer;
  border: 2px dashed var(--color-border);
  border-radius: 20px;
  transition: all 0.3s ease;
}

.upload-area:hover {
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
}

.upload-icon {
  margin-bottom: 16px;
  color: var(--color-neon);
}

.upload-text {
  margin-bottom: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.upload-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.processing {
  padding: 60px 0;
  color: var(--color-text-secondary);
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 20px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-neon);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.result-area {
  margin-top: 40px;
}

.result-preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.preview-box {
  text-align: center;
}

.preview-box span {
  display: block;
  margin-bottom: 12px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.preview-placeholder.result {
  color: var(--color-text-secondary);
  background: repeating-conic-gradient(
      var(--color-border) 0% 25%,
      transparent 0% 50%
    )
    50% / 20px 20px;
  background-color: var(--color-bg-secondary);
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

@media (max-width: 768px) {
  .result-preview {
    grid-template-columns: 1fr;
  }
}
</style>
