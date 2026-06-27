import { getPublish } from '../../utils/publish-store';

declare function defineEventHandler(handler: (event: any) => any): any;

export default defineEventHandler((event: any) => {
  const id = (event.context.params?.id as string) || '';
  const record = getPublish(id);
  if (!record) {
    return {
      code: 404,
      message: '未找到该请柬发布记录',
      data: null,
    };
  }
  return {
    code: 0,
    message: 'ok',
    data: {
      id: record.id,
      name: record.name,
      pages: record.pages,
      canvasWidth: record.canvasWidth,
      canvasHeight: record.canvasHeight,
      pageTransition: record.pageTransition,
      createdAt: record.createdAt,
    },
  };
});
