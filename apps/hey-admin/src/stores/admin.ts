import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

/* 管理员会话:走 Hey.AdMaster 后端 OpenIddict 认证(/connect/token,password grant)
   token 持久化到 localStorage,刷新不丢登录态 */

export interface AdminInfo {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

const TOKEN_KEY = 'hey19-admin-token';
const USER_KEY = 'hey19-admin-user';

const OAUTH_PARAMS = {
  client_id: 'AdMaster_App_Admin',
  client_secret: '1q2w3e*',
  scope: 'openid profile email offline_access roles',
};

function readStoredUser(): AdminInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminInfo) : null;
  } catch {
    return null;
  }
}

export const useAdminStore = defineStore('admin', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '');
  const admin = ref<AdminInfo | null>(readStoredUser());
  const loading = ref<boolean>(false);

  const isLoggedIn = computed(() => !!token.value);

  /** 密码登录(OpenIddict password grant) */
  async function login(params: LoginParams): Promise<TokenResponse> {
    loading.value = true;
    try {
      const body = new URLSearchParams({
        grant_type: 'password',
        username: params.username,
        password: params.password,
        ...OAUTH_PARAMS,
      });
      const resp = await fetch('/connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const json = (await resp.json()) as TokenResponse & {
        error?: string;
        error_description?: string;
      };
      if (!resp.ok || json.error) {
        throw new Error(
          json.error_description ||
            json.error ||
            `登录失败(HTTP ${resp.status})`,
        );
      }
      token.value = json.access_token;
      // 用户信息:优先从 username 推断,后续可调 /api/account/my-profile 拉取
      const name = params.username.split('@')[0] || '管理员';
      admin.value = {
        id: params.username,
        name,
        role: '管理员',
        avatar: name.charAt(0).toUpperCase(),
        email: params.username,
      };
      try {
        localStorage.setItem(TOKEN_KEY, token.value);
        localStorage.setItem(USER_KEY, JSON.stringify(admin.value));
      } catch {
        /* ignore */
      }
      return json;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    token.value = '';
    admin.value = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  }

  return { token, admin, loading, isLoggedIn, login, logout };
});
