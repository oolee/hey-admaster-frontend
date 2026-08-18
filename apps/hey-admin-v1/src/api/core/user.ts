import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户信息(用户信息-mock使用)
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo>('/user/info');
}
