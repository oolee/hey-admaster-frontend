// ============================================================
// OpenAI Utility - AI 图像生成（真实 API 调用 / 模拟数据）
// 来源：PrototypeProject/public/server/utils/openai.ts
// ============================================================

import { MOCK_BASE64_IMAGE } from './public-mock-data';

export interface GenerateImageParams {
  prompt: string;
  size?: string;
  n?: number;
}

export interface GeneratedImage {
  b64_json: string;
  revised_prompt: string;
  index: number;
}

/**
 * 生成 AI 图像。
 * - 如果设置了 OPENAI_API_KEY 环境变量，则调用 OpenAI API 的真实接口。
 * - 否则返回模拟的 base64 图像数据。
 */
export async function generateImage(params: GenerateImageParams): Promise<{
  success: boolean;
  data: GeneratedImage[];
  isMock: boolean;
}> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return generateMockImage(params);
  }

  try {
    const response = await $fetch<{
      data: Array<{
        b64_json?: string;
        url?: string;
        revised_prompt: string;
      }>;
    }>('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: {
        model: 'gpt-image-2',
        prompt: params.prompt,
        n: params.n ?? 1,
        size: params.size ?? '1024x1024',
        response_format: 'b64_json',
      },
    });

    const data: GeneratedImage[] = response.data.map((item, index) => ({
      b64_json: item.b64_json ?? '',
      revised_prompt: item.revised_prompt ?? params.prompt,
      index,
    }));

    return {
      success: true,
      data,
      isMock: false,
    };
  } catch (error: any) {
    console.warn(
      'OpenAI API 调用失败，降级为模拟数据:',
      error?.message ?? error,
    );
    return generateMockImage(params);
  }
}

function generateMockImage(params: GenerateImageParams): {
  success: boolean;
  data: GeneratedImage[];
  isMock: boolean;
} {
  const count = params.n ?? 1;
  const data: GeneratedImage[] = Array.from({ length: count }, (_, i) => ({
    b64_json: MOCK_BASE64_IMAGE,
    revised_prompt: params.prompt,
    index: i,
  }));

  return {
    success: true,
    data,
    isMock: true,
  };
}
