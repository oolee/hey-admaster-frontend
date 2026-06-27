// ============================================================
// 通义万相 API Utility - 阿里云百炼 AI 图像生成
// 来源：PrototypeProject/public/server/utils/tongyi.ts
// ============================================================

export interface TongyiGenerateParams {
  prompt: string;
  model?: string;
  size?: string;
  n?: number;
}

export interface TongyiTaskResult {
  taskId: string;
  status:
    | 'CANCELED'
    | 'FAILED'
    | 'PENDING'
    | 'RUNNING'
    | 'SUCCEEDED'
    | 'UNKNOWN';
  images: Array<{ url: string }>;
  isMock: boolean;
}

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1';

function mapSize(size?: string): string {
  if (!size) return '2K';
  const [w] = size.split('x').map(Number);
  if (w !== undefined && w >= 2048) return '4K';
  if (w !== undefined && w >= 1024) return '2K';
  return '1K';
}

export async function submitTongyiTask(params: TongyiGenerateParams): Promise<{
  error?: string;
  isMock: boolean;
  success: boolean;
  taskId?: string;
}> {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    return { success: false, isMock: true, error: '未配置 DASHSCOPE_API_KEY' };
  }

  try {
    const response = await $fetch<{
      code?: string;
      message?: string;
      output?: { task_id: string; task_status: string };
    }>(`${DASHSCOPE_BASE}/services/aigc/image-generation/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-DashScope-Async': 'enable',
      },
      body: {
        model: params.model || 'wan2.7-image-pro',
        input: {
          messages: [
            {
              role: 'user',
              content: [{ text: params.prompt }],
            },
          ],
        },
        parameters: {
          n: params.n ?? 1,
          size: mapSize(params.size),
          watermark: false,
        },
      },
    });

    if (response.code) {
      console.warn('通义万相任务提交失败:', response.code, response.message);
      return { success: false, isMock: false, error: response.message };
    }

    return {
      success: true,
      taskId: response.output?.task_id,
      isMock: false,
    };
  } catch (error: any) {
    console.warn('通义万相 API 调用失败:', error?.message ?? error);
    return {
      success: false,
      isMock: false,
      error: error?.message ?? 'API 调用失败',
    };
  }
}

export async function queryTongyiTask(
  taskId: string,
): Promise<TongyiTaskResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    return { taskId, status: 'UNKNOWN', images: [], isMock: true };
  }

  try {
    const response = await $fetch<{
      code?: string;
      message?: string;
      output?: {
        choices?: Array<{
          message?: {
            content?: Array<{
              image?: string;
              type?: string;
            }>;
          };
        }>;
        task_id: string;
        task_status: string;
      };
    }>(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.code) {
      return { taskId, status: 'FAILED', images: [], isMock: false };
    }

    const output = response.output;
    const status =
      (output?.task_status as TongyiTaskResult['status']) || 'UNKNOWN';

    const images: Array<{ url: string }> = [];
    if (status === 'SUCCEEDED' && output?.choices) {
      for (const choice of output.choices) {
        if (choice.message?.content) {
          for (const item of choice.message.content) {
            if (item.type === 'image' && item.image) {
              images.push({ url: item.image });
            }
          }
        }
      }
    }

    return { taskId, status, images, isMock: false };
  } catch (error: any) {
    console.warn('通义万相任务查询失败:', error?.message ?? error);
    return { taskId, status: 'UNKNOWN', images: [], isMock: false };
  }
}
