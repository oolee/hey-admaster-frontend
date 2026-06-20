// ============================================================
// GET /api/ai/generate/[taskId] - 查询通义万相异步任务状态
// ============================================================

import { createError, defineEventHandler, getRouterParam } from 'h3';
import { queryTongyiTask } from '~/utils/tongyi';

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, 'taskId');

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少 taskId 参数',
    });
  }

  const result = await queryTongyiTask(taskId);

  return {
    success: true,
    taskId: result.taskId,
    status: result.status,
    data: result.images.map((img) => ({
      url: img.url,
    })),
    isMock: result.isMock,
  };
});
