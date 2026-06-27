// ============================================================
// POST /api/ai/generate - AI 图像生成（多模型路由）
// 支持: 通义万相(主力) / OpenAI GPT-Image-2 / Mock 降级
// ============================================================

import type { AdTemplate } from '~/utils/ad-templates';

import { createError, defineEventHandler, readBody } from 'h3';
import { AD_TEMPLATES, buildPrompt } from '~/utils/ad-templates';
import { generateImage as generateOpenAI } from '~/utils/openai';
import { queryTongyiTask, submitTongyiTask } from '~/utils/tongyi';

function generateMockImage(): { b64_json: string } {
  const size = 256;
  const canvas = Buffer.alloc(size * size * 4 + 122);
  let offset = 0;
  canvas[offset++] = 0x89;
  canvas[offset++] = 0x50;
  canvas[offset++] = 0x4e;
  canvas[offset++] = 0x47;
  canvas[offset++] = 0x0d;
  canvas[offset++] = 0x0a;
  canvas[offset++] = 0x1a;
  // eslint-disable-next-line no-useless-assignment
  canvas[offset++] = 0x0a;
  return {
    b64_json: canvas.toString('base64'),
  };
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const {
    prompt,
    size = '1024x1024',
    n = 1,
    model = 'auto',
    templateId,
    templateInput,
  } = body;

  if (!prompt && !templateId) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少 prompt 参数',
    });
  }

  let finalPrompt = prompt || '';
  let template: AdTemplate | undefined;

  if (templateId) {
    template = AD_TEMPLATES.find((t) => t.id === templateId);
    if (template && templateInput) {
      finalPrompt = buildPrompt(template, templateInput);
    }
  }

  if (!finalPrompt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'prompt 不能为空',
    });
  }

  let selectedModel = model;
  if (model === 'auto') {
    selectedModel = 'tongyi';
  }

  if (selectedModel === 'tongyi') {
    const result = await submitTongyiTask({
      prompt: finalPrompt,
      model: template?.recommendedModel || 'wan2.7-image-pro',
      size: template?.defaultSize || size,
      n,
    });

    if (result.success && result.taskId) {
      const maxRetries = 30;
      for (let i = 0; i < maxRetries; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const taskResult = await queryTongyiTask(result.taskId);

        if (taskResult.status === 'SUCCEEDED') {
          return {
            success: true,
            data: taskResult.images.map((img) => ({
              url: img.url,
              revised_prompt: finalPrompt,
            })),
            isMock: false,
            model: selectedModel,
            templateId: template?.id,
          };
        }

        if (
          taskResult.status === 'FAILED' ||
          taskResult.status === 'CANCELED'
        ) {
          console.warn('通义万相任务失败，降级到 OpenAI');
          break;
        }
      }

      return {
        success: true,
        taskId: result.taskId,
        status: 'PROCESSING',
        data: [],
        isMock: false,
        model: selectedModel,
        templateId: template?.id,
      };
    }

    if (process.env.OPENAI_API_KEY) {
      selectedModel = 'openai';
    } else {
      return {
        success: true,
        data: Array.from({ length: n }, () => generateMockImage()),
        isMock: true,
        model: 'mock',
        templateId: template?.id,
      };
    }
  }

  if (selectedModel === 'openai') {
    const result = await generateOpenAI({ prompt: finalPrompt, size, n });
    return {
      ...result,
      model: 'openai',
      templateId: template?.id,
    };
  }

  return {
    success: true,
    data: Array.from({ length: n }, () => generateMockImage()),
    isMock: true,
    model: 'mock',
    templateId: template?.id,
  };
});
