import { saveProject } from '../../utils/storage';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { id, created } = saveProject({
    id: body?.id,
    name: body?.name || '未命名请柬',
    pages: body?.pages || [],
    currentPageId: body?.currentPageId,
  });
  return {
    code: 0,
    message: created ? 'created' : 'updated',
    data: { id },
  };
});
