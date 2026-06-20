export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const name = body?.name || 'invitation';
  // 视频生成耗时较长，模拟异步任务
  await new Promise((r) => setTimeout(r, 300));
  return {
    code: 0,
    message: 'ok',
    data: {
      fileUrl: `/exports/${name}-${Date.now()}.mp4`,
      message: '模拟视频生成成功',
    },
  };
});
