import { savePublish } from '../../utils/publish-store';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const name = body?.name || 'invitation';
  const pages = body?.pages || [];
  const canvasWidth = body?.canvasWidth;
  const canvasHeight = body?.canvasHeight;
  const pageTransition = body?.pageTransition;

  const record = savePublish({ name, pages, canvasWidth, canvasHeight, pageTransition });

  return {
    code: 0,
    message: 'ok',
    data: {
      id: record.id,
      url: `/h5/${record.id}`,
      message: '模拟网页发布成功（H5 链接）',
    },
  };
});
