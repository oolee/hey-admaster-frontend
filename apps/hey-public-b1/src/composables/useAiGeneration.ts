import type { AdTemplate, GeneratedImage } from '#/types/ai';

import { ref } from 'vue';

import { useAiStore } from '#/store/aiStore';
import { generateImage, queryTaskStatus } from '#/utils/api';

export function useAiGeneration() {
  const aiStore = useAiStore();
  const isLoading = ref(false);
  const error = ref<null | string>(null);
  const results = ref<GeneratedImage[]>([]);
  const currentTaskId = ref<null | string>(null);
  const isMock = ref(false);

  async function generate(
    prompt: string,
    options?: {
      n?: number;
      quality?: 'high' | 'low' | 'medium';
      size?: string;
      template?: AdTemplate;
      templateInput?: Record<string, string>;
    },
  ) {
    isLoading.value = true;
    error.value = null;
    results.value = [];
    currentTaskId.value = null;
    isMock.value = false;

    try {
      const res = await generateImage({
        prompt,
        size: options?.size ?? '1024x1024',
        quality: options?.quality ?? 'medium',
        n: options?.n ?? 1,
        templateId: options?.template?.id,
        templateInput: options?.templateInput,
      });

      isMock.value = res.isMock ?? false;

      // 异步任务：轮询等待
      if (res.taskId && res.status === 'PROCESSING') {
        currentTaskId.value = res.taskId;
        const maxPolls = 30;
        for (let i = 0; i < maxPolls; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const taskRes = await queryTaskStatus(res.taskId);

          if (taskRes.status === 'SUCCEEDED' || taskRes.data?.length > 0) {
            results.value = taskRes.data.map((item: any) => ({
              url: item.url,
              revised_prompt: prompt,
            }));
            isMock.value = taskRes.isMock ?? false;
            break;
          }

          if (taskRes.status === 'FAILED' || taskRes.status === 'CANCELED') {
            error.value = 'AI 生成失败，请稍后重试';
            break;
          }
        }
      } else {
        results.value = res.data;
      }

      // 保存到历史记录
      if (results.value.length > 0) {
        aiStore.addGeneration({
          id: `${Date.now()}`,
          prompt,
          images: results.value,
          createdAt: new Date().toISOString(),
        });
      }

      return results.value;
    } catch (error: any) {
      error.value = error?.message || '生成失败';
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  return { generate, isLoading, error, results, currentTaskId, isMock };
}
