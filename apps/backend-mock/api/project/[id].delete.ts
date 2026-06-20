import { deleteProject } from '../../utils/storage';

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id') || '';
  const ok = deleteProject(id);
  return {
    code: 0,
    message: ok ? 'deleted' : 'not found',
    data: { success: ok },
  };
});
