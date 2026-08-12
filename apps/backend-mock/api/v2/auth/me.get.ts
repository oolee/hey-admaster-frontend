import { defineEventHandler, getHeader, setResponseStatus } from 'h3';
import { defaultUser } from '~/utils/v2-mock-data';

export default defineEventHandler((event) => {
  const auth = getHeader(event, 'authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) {
    setResponseStatus(event, 401);
    return { code: -1, data: null, message: '未登录' };
  }
  const user = defaultUser(1, 'demo@hey19.design', '演示用户');
  return { code: 0, data: user, message: 'ok' };
});
