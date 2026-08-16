<script setup lang="ts">
import { ref } from 'vue';

const selectedSize = ref('一寸');
const selectedBg = ref('白色');

const sizes = ['一寸', '二寸', '小一寸', '大一寸', '五寸'];
const bgColors = ['白色', '蓝色', '红色', '灰色'];
</script>

<template>
  <div class="tool-page">
    <div class="container-custom">
      <div class="tool-header">
        <RouterLink to="/tools" class="tool-back">← 返回工具箱</RouterLink>
        <h1 class="tool-title">证件照制作</h1>
        <p class="tool-desc">一键生成标准证件照，支持多种尺寸和背景色</p>
      </div>

      <div class="tool-workspace">
        <div class="upload-area">
          <div class="upload-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
              />
            </svg>
          </div>
          <p class="upload-text">上传正面照片</p>
          <p class="upload-hint">建议使用清晰、光线充足的正面照</p>
        </div>

        <div class="options-panel">
          <div class="option-group">
            <h3>选择尺寸</h3>
            <div class="option-tags">
              <button
                v-for="size in sizes"
                :key="size"
                class="option-tag"
                :class="{ active: selectedSize === size }"
                @click="selectedSize = size"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <div class="option-group">
            <h3>背景颜色</h3>
            <div class="option-tags">
              <button
                v-for="color in bgColors"
                :key="color"
                class="option-tag"
                :class="{ active: selectedBg === color }"
                @click="selectedBg = color"
              >
                {{ color }}
              </button>
            </div>
          </div>
        </div>

        <div class="result-actions">
          <button class="btn-neon-filled">生成证件照</button>
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

.options-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 32px;
}

.option-group h3 {
  margin-bottom: 12px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.option-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.option-tag {
  padding: 8px 20px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  transition: all 0.2s ease;
}

.option-tag:hover {
  color: var(--color-neon);
  border-color: var(--color-neon);
}

.option-tag.active {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
}

.result-actions {
  text-align: center;
}
</style>
