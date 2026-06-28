import { defineEventHandler, readBody } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const name = body?.name || 'invitation';
  return {
    code: 0,
    message: 'ok',
    data: {
      fileUrl: `/exports/${name}-${Date.now()}.png`,
      message: '模拟长图生成成功',
    },
  };
});
