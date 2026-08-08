import type { AiGeneratedImage, RefImage } from '#/store/aiDesignStore';

import { useAiDesignStore } from '#/store/aiDesignStore';

/**
 * AI 设计真实生图（后端 Hey.AdMaster.AiDesign 模块）
 * 统一构建请求参数：尺寸、参考图 base64、模型、模板等。
 */
export function useAiDesignGeneration() {
  const store = useAiDesignStore();

  function buildSize(resolution: string): string {
    const map: Record<string, string> = {
      '1k': '1024x1024',
      '2k': '2048x2048',
      '4k': '4096x4096',
    };
    return map[resolution] ?? '1024x1024';
  }

  function refImagesToPayload(refImages: RefImage[]) {
    return refImages.map((ref) => {
      const comma = ref.dataUrl.indexOf(',');
      const contentType = ref.dataUrl.startsWith('data:')
        ? ref.dataUrl.slice(
            5,
            ref.dataUrl.indexOf(';') > 5 ? ref.dataUrl.indexOf(';') : 5,
          )
        : 'image/png';
      return {
        dataBase64: comma === -1 ? ref.dataUrl : ref.dataUrl.slice(comma + 1),
        contentType: contentType || 'image/png',
        fileName: ref.fileName,
        tag: ref.tag,
      };
    });
  }

  /**
   * 调用后端生图（同步返回或自动轮询异步任务），成功后刷新当前会话。
   * 返回可直接展示的图片列表（方案 A/B/C… 命名）。
   */
  async function generate(
    prompt: string,
    options: {
      count?: number;
      model?: null | string;
      referenceImages?: RefImage[];
      templateId?: null | string;
    } = {},
  ): Promise<AiGeneratedImage[]> {
    const images = await store.generateImages({
      prompt,
      optimizedPrompt: store.optimizedPrompt || null,
      model: options.model ?? store.selectedModel,
      size: buildSize(store.resolution),
      count: options.count ?? store.generateCount,
      quality: 'medium',
      templateId: options.templateId ?? null,
      referenceImages: refImagesToPayload(options.referenceImages ?? []),
    });

    if (images.length > 1) {
      return images.map((img, index) => ({
        ...img,
        title: `方案 ${String.fromCodePoint(65 + index)}`,
      }));
    }
    return images;
  }

  return { generate, buildSize };
}
