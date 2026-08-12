import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3';
import { cases } from '~/utils/v2-mock-data';

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'));
  const item = cases.find((c) => c.id === id);
  if (!item) {
    setResponseStatus(event, 404);
    return { code: -1, data: null, message: '案例不存在' };
  }
  return { code: 0, data: item, message: 'ok' };
});
