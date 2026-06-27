<script setup lang="ts">
import { ref } from 'vue';

const quality = ref(80);
</script>

<template>
  <div class="tool-page">
    <div class="container-custom">
      <div class="tool-header">
        <RouterLink to="/tools" class="tool-back">← 返回工具箱</RouterLink>
        <h1 class="tool-title">图片压缩</h1>
        <p class="tool-desc">智能压缩图片体积，保持画质清晰</p>
      </div>

      <div class="tool-workspace">
        <div class="upload-area">
          <div class="upload-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
              <path
                d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"
              />
            </svg>
          </div>
          <p class="upload-text">拖拽或点击上传图片</p>
          <p class="upload-hint">支持批量上传，自动压缩</p>
        </div>

        <div class="quality-control">
          <div class="quality-header">
            <span>压缩质量</span>
            <span class="quality-value">{{ quality }}%</span>
          </div>
          <input
            v-model="quality"
            type="range"
            min="30"
            max="100"
            class="quality-slider"
          />
          <div class="quality-labels">
            <span>体积小</span>
            <span>画质高</span>
          </div>
        </div>

        <div class="result-actions">
          <button class="btn-neon-filled">开始压缩</button>
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
  max-width: 600px;
  padding-bottom: 80px;
  margin: 0 auto;
}

.upload-area {
  padding: 48px 40px;
  margin-bottom: 32px;
  text-align: center;
  cursor: pointer;
  border: 2px dashed var(--color-border);
  border-radius: 20px;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: var(--color-neon);
}

.upload-icon {
  margin-bottom: 16px;
  color: var(--color-neon);
}

.upload-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.upload-hint {
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.quality-control {
  padding: 24px;
  margin-bottom: 32px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
}

.quality-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 0.9rem;
  color: var(--color-text-primary);
}

.quality-value {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-neon);
}

.quality-slider {
  width: 100%;
  height: 6px;
  margin-bottom: 8px;
  appearance: none;
  outline: none;
  background: var(--color-border);
  border-radius: 3px;
}

.quality-slider::-webkit-slider-thumb {
  width: 20px;
  height: 20px;
  appearance: none;
  cursor: pointer;
  background: var(--color-neon);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--color-neon-dim);
}

.quality-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  cursor: pointer;
  background: var(--color-neon);
  border: none;
  border-radius: 50%;
}

.quality-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.result-actions {
  text-align: center;
}
</style>
