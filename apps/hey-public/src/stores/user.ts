import type { V2AuthResult, V2AuthUser } from '@/api';

import { computed, ref } from 'vue';

import { mockGetUser, mockLogin, mockRegister } from '@/api';
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('hey19-v2-token') || '');
  const user = ref<null | V2AuthUser>(null);
  const loading = ref(false);

  const isLoggedIn = computed(() => !!token.value);

  async function login(
    payload: Record<string, unknown>,
  ): Promise<V2AuthResult> {
    loading.value = true;
    try {
      const res = await mockLogin(payload);
      if (res.code !== 0) throw new Error(res.message || '登录失败');
      const { data } = res;
      token.value = data.token;
      user.value = data.user;
      localStorage.setItem('hey19-v2-token', data.token);
      localStorage.setItem('hey19-v2-user', JSON.stringify(data.user));
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function register(
    payload: Record<string, unknown>,
  ): Promise<V2AuthResult> {
    loading.value = true;
    try {
      const res = await mockRegister(payload);
      if (res.code !== 0) throw new Error(res.message || '注册失败');
      const { data } = res;
      token.value = data.token;
      user.value = data.user;
      localStorage.setItem('hey19-v2-token', data.token);
      localStorage.setItem('hey19-v2-user', JSON.stringify(data.user));
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUser(): Promise<null | V2AuthUser> {
    if (!token.value) return null;
    try {
      const res = await mockGetUser();
      if (res.code !== 0) throw new Error(res.message || '获取用户失败');
      user.value = res.data;
      return res.data;
    } catch {
      logout();
      return null;
    }
  }

  function logout(): void {
    token.value = '';
    user.value = null;
    localStorage.removeItem('hey19-v2-token');
    localStorage.removeItem('hey19-v2-user');
  }

  // 启动时恢复本地用户
  const cached = localStorage.getItem('hey19-v2-user');
  if (cached) {
    try {
      user.value = JSON.parse(cached) as V2AuthUser;
    } catch {
      /* ignore */
    }
  }

  return {
    token,
    user,
    loading,
    isLoggedIn,
    login,
    register,
    logout,
    fetchUser,
  };
});
