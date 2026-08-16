<script setup lang="ts">
import type { AdTemplate } from '#/types/ai';

import { onMounted, ref } from 'vue';

import SectionTitle from '#/components/ui/SectionTitle.vue';
import { useAiGeneration } from '#/composables/useAiGeneration';
import AiHistoryPanel from '#/features/ai-studio/AiHistoryPanel.vue';
import AiImageGallery from '#/features/ai-studio/AiImageGallery.vue';
import AiPromptForm from '#/features/ai-studio/AiPromptForm.vue';
import { useAiStore } from '#/store/aiStore';
import { fetchTemplates } from '#/utils/api';

const aiStore = useAiStore();
const { generate, isLoading, error, results, currentTaskId, isMock } =
  useAiGeneration();

const templates = ref<AdTemplate[]>([]);
const categories = ref<Record<string, AdTemplate[]>>({});

onMounted(async () => {
  try {
    const res = await fetchTemplates();
    templates.value = res.data;
    categories.value = res.categories;
  } catch (error) {
    console.warn('模板加载失败:', error);
  }
});

async function handleGenerate(payload: {
  prompt: string;
  quality: string;
  size: string;
  template?: AdTemplate;
  templateInput?: Record<string, string>;
}) {
  await generate(payload.prompt, {
    size: payload.size,
    quality: payload.quality as 'high' | 'low' | 'medium',
    template: payload.template,
    templateInput: payload.templateInput,
  });
}
</script>

<template>
  <div class="studio-page">
    <!-- Hero -->
    <section class="section">
      <div class="container-custom">
        <SectionTitle
          title="AI 创意工坊"
          subtitle="选择行业模板或自由描述，AI 为你生成专业级设计图"
        >
          <template #actions>
            <div
              class="credits-badge"
              :class="{ empty: aiStore.remainingFree <= 0 }"
            >
              <span v-if="aiStore.remainingFree > 0" class="credits-text">
                剩余免费 {{ aiStore.remainingFree }} 次
              </span>
              <span v-else class="credits-text">免费次数已用完</span>
            </div>
          </template>
        </SectionTitle>
      </div>
    </section>

    <!-- Studio Area -->
    <section class="section studio-area">
      <div class="container-custom">
        <div class="studio-layout">
          <!-- 左侧：输入表单 -->
          <div class="studio-sidebar">
            <AiPromptForm
              :templates="templates"
              :categories="categories"
              :is-loading="isLoading"
              model="tongyi"
              @generate="handleGenerate"
            />
          </div>

          <!-- 右侧：生成结果 -->
          <div class="studio-main">
            <AiImageGallery
              :images="results"
              :is-loading="isLoading"
              :error="error"
              :is-mock="isMock"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- History -->
    <section class="section">
      <div class="container-custom">
        <AiHistoryPanel />
      </div>
    </section>
  </div>
</template>

<style scoped>
.studio-page {
  min-height: 100vh;
}

.credits-badge {
  padding: 6px 14px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
}

.credits-badge.empty {
  color: #f55;
  background: rgb(255 85 85 / 8%);
  border-color: rgb(255 85 85 / 20%);
}

.studio-area {
  padding-top: 0;
}

.studio-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

@media (min-width: 1024px) {
  .studio-layout {
    grid-template-columns: 420px 1fr;
  }
}

.studio-sidebar {
  position: sticky;
  top: 100px;
  align-self: start;
}

.studio-main {
  min-height: 400px;
}
</style>
