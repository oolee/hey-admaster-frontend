import { computed, ref } from 'vue';

export interface AuthUser {
  userId: string;
  username: string;
  realName: string;
  email: string;
  avatar: string;
  phoneNumber: string;
}

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';

// 全局共享状态
const token = ref<null | string>(localStorage.getItem(TOKEN_KEY));
const user = ref<AuthUser | null>(loadUser());
const loading = ref(false);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUser(u: AuthUser | null) {
  user.value = u;
  if (u) {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function saveToken(t: null | string) {
  token.value = t;
  if (t) {
    localStorage.setItem(TOKEN_KEY, t);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function useAuth() {
  const isLoggedIn = computed(() => !!token.value);

  /** 获取带认证头的请求头 */
  function authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`;
    }
    return headers;
  }

  /** 登录 */
  async function login(username: string, password: string) {
    loading.value = true;
    try {
      const response = await fetch('/api/connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          username,
          password,
          client_id: 'AdMaster_App',
          scope: 'AdMaster',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error_description || '登录失败，请检查用户名和密码',
        );
      }

      const data = await response.json();
      saveToken(data.access_token);
      if (data.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      }

      // 获取用户信息
      await fetchUserInfo();
    } finally {
      loading.value = false;
    }
  }

  /** 获取当前用户信息 */
  async function fetchUserInfo(): Promise<AuthUser | null> {
    if (!token.value) return null;

    try {
      const response = await fetch('/api/account/my-profile', {
        headers: authHeaders(),
      });

      if (!response.ok) return null;

      const profile = await response.json();

      // 尝试获取头像
      let avatar = '';
      try {
        const picResponse = await fetch('/api/account/my-profile/picture', {
          headers: { Authorization: `Bearer ${token.value}` },
        });
        if (picResponse.ok) {
          const blob = await picResponse.blob();
          avatar = URL.createObjectURL(blob);
        }
      } catch {
        // 头像获取失败不影响
      }

      const u: AuthUser = {
        userId: profile.id || profile.userId || '',
        username: profile.userName || profile.username || '',
        realName: profile.name || profile.userName || '',
        email: profile.email || '',
        avatar,
        phoneNumber: profile.phoneNumber || '',
      };

      saveUser(u);
      return u;
    } catch {
      return null;
    }
  }

  /** 退出登录 */
  async function logout() {
    try {
      // 尝试撤销 token
      if (token.value) {
        await fetch('/api/connect/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: token.value,
            token_type_hint: 'access_token',
            client_id: 'AdMaster_App',
          }),
        }).catch(() => {});
      }
    } finally {
      saveToken(null);
      saveUser(null);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      // 清理 avatar object URL
      if (user.value?.avatar) {
        URL.revokeObjectURL(user.value.avatar);
      }
    }
  }

  /** 检查登录状态（页面初始化时调用） */
  async function checkAuth() {
    if (!token.value) return;
    // 验证 token 是否还有效，顺便获取用户信息
    await fetchUserInfo();
  }

  return {
    isLoggedIn,
    loading,
    token,
    user,
    login,
    logout,
    fetchUserInfo,
    checkAuth,
    authHeaders,
  };
}
