export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const name = body?.name || 'invitation';
  return {
    code: 0,
    message: 'ok',
    data: {
      fileUrl: `/exports/${name}-${Date.now()}.pdf`,
      message: '模拟 PDF 生成成功',
    },
  };
});
