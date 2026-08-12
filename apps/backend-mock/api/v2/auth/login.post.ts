import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { createToken, defaultUser } from '~/utils/v2-mock-data';

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}));
  const { email, password } = body || {};
  if (!email || !password) {
    setResponseStatus(event, 400);
    return { code: -1, data: null, message: '请输入邮箱和密码' };
  }
  const userId = String(email).includes('admin') ? 0 : 1;
  const token = createToken(userId);
  const user = defaultUser(userId, String(email), String(email).split('@')[0]);
  return { code: 0, data: { token, user }, message: 'ok' };
});
