<script setup lang="ts">
import type { AdTemplate } from '#/types/ai';

import { computed, ref } from 'vue';

import { Icon } from '@iconify/vue';

import { IMAGE_SIZE_PRESETS, QUALITY_OPTIONS } from '#/utils/constants';

const props = defineProps<{
  categories: Record<string, AdTemplate[]>;
  isLoading: boolean;
  model: string;
  templates: AdTemplate[];
}>();

const emit = defineEmits<{
  generate: [
    payload: {
      prompt: string;
      quality: string;
      size: string;
      template?: AdTemplate;
      templateInput?: Record<string, string>;
    },
  ];
}>();

const selectedTemplate = ref<AdTemplate | null>(null);
const selectedCategory = ref<string>('');
const showTemplates = ref(false);
const templateInputs = ref<Record<string, string>>({});

// 自由模式
const prompt = ref('');
const selectedSize = ref<string>(IMAGE_SIZE_PRESETS[0]?.value ?? '1024x1024');
const selectedQuality = ref<string>(QUALITY_OPTIONS[1]?.value ?? 'medium');

// 当选中模板时自动设置尺寸
function selectTemplate(tpl: AdTemplate) {
  selectedTemplate.value = tpl;
  selectedSize.value = tpl.defaultSize;
  templateInputs.value = {};
  showTemplates.value = false;
}

// 清除模板
function clearTemplate() {
  selectedTemplate.value = null;
  templateInputs.value = {};
}

// 分类切换
const categoryKeys = computed(() => Object.keys(props.categories));

function selectCategory(key: string) {
  selectedCategory.value = selectedCategory.value === key ? '' : key;
}

function handleSubmit() {
  emit('generate', {
    prompt: prompt.value,
    size: selectedSize.value,
    quality: selectedQuality.value,
    template: selectedTemplate.value || undefined,
    templateInput: selectedTemplate.value
      ? { ...templateInputs.value }
      : undefined,
  });
}

const canSubmit = computed(() => {
  if (selectedTemplate.value) return true;
  return prompt.value.trim().length > 0;
});
</script>

<template>
  <div class="prompt-form">
    <!-- 模板选择区域 -->
    <div class="template-section">
      <div class="template-header">
        <h3 class="form-label">
          <Icon icon="mdi:layers-outline" class="label-icon" />
          选择设计场景
        </h3>
        <button
          class="template-toggle"
          :class="{ active: showTemplates }"
          @click="showTemplates = !showTemplates"
        >
          <Icon :icon="showTemplates ? 'mdi:chevron-up' : 'mdi:chevron-down'" />
          {{ showTemplates ? '收起模板' : '展开模板' }}
        </button>
      </div>

      <!-- 已选模板 -->
      <div v-if="selectedTemplate" class="selected-template">
        <div class="selected-template-info">
          <Icon :icon="selectedTemplate.icon" class="template-icon" />
          <div>
            <span class="selected-template-name">{{
              selectedTemplate.name
            }}</span>
            <span class="selected-template-desc">{{
              selectedTemplate.description
            }}</span>
          </div>
        </div>
        <button class="clear-template-btn" @click="clearTemplate">
          <Icon icon="mdi:close" />
        </button>
      </div>

      <!-- 模板分类网格 -->
      <div v-if="showTemplates" class="template-categories">
        <div v-for="key in categoryKeys" :key="key" class="category-group">
          <button class="category-title" @click="selectCategory(key)">
            <Icon
              :icon="
                selectedCategory === key
                  ? 'mdi:chevron-down'
                  : 'mdi:chevron-right'
              "
              class="category-arrow"
            />
            {{ key }}
            <span class="category-count">{{
              categories[key]?.length ?? 0
            }}</span>
          </button>
          <div v-if="selectedCategory === key" class="template-grid">
            <button
              v-for="tpl in categories[key] ?? []"
              :key="tpl.id"
              class="template-card"
              :class="{ active: selectedTemplate?.id === tpl.id }"
              @click="selectTemplate(tpl)"
            >
              <Icon :icon="tpl.icon" class="template-card-icon" />
              <span class="template-card-name">{{ tpl.name }}</span>
              <span class="template-card-desc">{{ tpl.description }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 模板输入参数 -->
    <div v-if="selectedTemplate" class="template-inputs">
      <label class="form-label">
        <Icon icon="mdi:text-box-outline" class="label-icon" />
        填写设计参数
      </label>
      <p class="prompt-hint">🪄 {{ selectedTemplate.promptHint }}</p>
      <textarea
        v-model="templateInputs.description"
        class="prompt-input"
        rows="3"
        placeholder="例如：品牌名称、风格、材质、颜色偏好等..."
      ></textarea>
    </div>

    <!-- 自由模式输入 -->
    <div v-else class="free-input">
      <label class="form-label">
        <Icon icon="mdi:lightbulb-on-outline" class="label-icon" />
        输入你的创意描述
      </label>
      <textarea
        v-model="prompt"
        class="prompt-input"
        :rows="3"
        placeholder="描述你想要的画面，例如：一家奶茶店的门头设计，简约清新风格，白色为主色调，亚克力发光字..."
      ></textarea>
    </div>

    <!-- 尺寸和质量选择 -->
    <div class="form-options">
      <div class="option-group">
        <label class="option-label">尺寸</label>
        <div class="option-buttons">
          <button
            v-for="size in IMAGE_SIZE_PRESETS"
            :key="size.value"
            class="option-btn"
            :class="{ active: selectedSize === size.value }"
            @click="selectedSize = size.value"
          >
            {{ size.label }}
          </button>
        </div>
      </div>
      <div class="option-group">
        <label class="option-label">质量</label>
        <div class="option-buttons">
          <button
            v-for="q in QUALITY_OPTIONS"
            :key="q.value"
            class="option-btn"
            :class="{ active: selectedQuality === q.value }"
            @click="selectedQuality = q.value"
          >
            {{ q.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 提交按钮 -->
    <button
      class="submit-btn"
      :disabled="!canSubmit || isLoading"
      @click="handleSubmit"
    >
      <Icon v-if="isLoading" icon="mdi:loading" class="loading-icon" />
      <Icon v-else icon="mdi:creation-outline" />
      {{ isLoading ? 'AI 正在生成...' : '开始生成' }}
    </button>

    <!-- 模型信息 -->
    <p class="model-info">
      <Icon icon="mdi:cpu-64-bit" />
      当前引擎：{{
        selectedTemplate
          ? selectedTemplate.recommendedModel
          : '通义万相 2.7 Pro'
      }}
    </p>

    <!-- 模板打印尺寸 -->
    <p v-if="selectedTemplate" class="print-info">
      <Icon icon="mdi:printer-outline" />
      印刷尺寸：{{ selectedTemplate.printSize }}
    </p>
  </div>
</template>

<style scoped>
.prompt-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-label {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.label-icon {
  font-size: 1.1rem;
  color: var(--color-neon);
}

/* Template Section */
.template-section {
  padding: 16px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.template-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.template-toggle {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 6px 12px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: none;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  transition: all 0.2s;
}

.template-toggle:hover,
.template-toggle.active {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
}

/* Selected Template */
.selected-template {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  margin-top: 12px;
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 10px;
}

.selected-template-info {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.selected-template-info .template-icon {
  margin-top: 2px;
  font-size: 1.4rem;
  color: var(--color-neon);
}

.selected-template-info > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selected-template-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-neon);
}

.selected-template-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.clear-template-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: none;
  border: 1px solid var(--glass-border);
  border-radius: 50%;
  transition: all 0.2s;
}

.clear-template-btn:hover {
  color: #f55;
  border-color: rgb(255 85 85 / 30%);
}

/* Template Categories */
.template-categories {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.category-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-title {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  background: none;
  border: none;
  transition: color 0.2s;
}

.category-title:hover {
  color: var(--color-neon);
}

.category-arrow {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.category-count {
  padding: 2px 8px;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  background: var(--color-bg-card);
  border-radius: 10px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

@media (min-width: 640px) {
  .template-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.template-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  padding: 12px 8px;
  text-align: center;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.2s;
}

.template-card:hover {
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.template-card.active {
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
}

.template-card-icon {
  font-size: 1.4rem;
  color: var(--color-neon);
}

.template-card-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.template-card-desc {
  font-size: 0.65rem;
  line-height: 1.3;
  color: var(--color-text-secondary);
}

/* Template Inputs */
.template-inputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-hint {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

/* Free Input */
.free-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-input {
  width: 100%;
  padding: 12px 14px;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text-primary);
  resize: vertical;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: border-color 0.2s;
}

.prompt-input:focus {
  outline: none;
  border-color: var(--color-neon-dim);
}

.prompt-input::placeholder {
  color: var(--color-text-muted);
}

/* Options */
.form-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.option-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.option-buttons {
  display: flex;
  gap: 4px;
}

.option-btn {
  padding: 6px 12px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s;
}

.option-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-neon-dim);
}

.option-btn.active {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
}

/* Submit Button */
.submit-btn {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px 24px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-bg-primary);
  cursor: pointer;
  background: var(--color-neon);
  border: none;
  border-radius: 12px;
  transition: all 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background: var(--color-neon);
  box-shadow: 0 0 40px var(--color-neon-dim);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
  transform: none;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Model Info */
.model-info {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.print-info {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 0.7rem;
  color: var(--color-neon);
  opacity: 0.6;
}
</style>
