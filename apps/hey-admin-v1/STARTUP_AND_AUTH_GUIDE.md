# Hey-Admin 启动逻辑与认证授权机制详解

## 一、启动流程总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              应用启动流程                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  index.html                                                                │
│       │                                                                    │
│       ▼                                                                    │
│  main.ts ───── initApplication() ──────────────────────────────────────────┤
│       │         │                                                          │
│       │         ├── 1. 初始化命名空间 (namespace)                           │
│       │         ├── 2. 初始化偏好设置 (initPreferences)                     │
│       │         ├── 3. 加载并执行 bootstrap(namespace)                     │
│       │         └── 4. 移除全局加载动画 (unmountGlobalLoading)             │
│       │                                                                    │
│       ▼                                                                    │
│  bootstrap.ts ─────────────────────────────────────────────────────────────┤
│       │                                                                    │
│       ├── 1. 组件适配器初始化 (initComponentAdapter)                       │
│       ├── 2. 表单组件初始化 (initSetupVbenForm)                           │
│       ├── 3. HTTP请求客户端初始化 (initRequestClient)                      │
│       ├── 4. 创建Vue应用实例 (createApp)                                   │
│       ├── 5. 注册指令 (v-loading)                                         │
│       ├── 6. 配置Pinia状态管理 (initStores)                                │
│       ├── 7. 国际化配置 (setupI18n)                                        │
│       ├── 8. 时区初始化 (initTimezone)                                     │
│       ├── 9. 权限指令注册 (registerAccessDirective)                        │
│       ├── 10. 初始化Tippy提示库 (initTippy)                                │
│       ├── 11. 配置路由 (app.use(router))                                   │
│       ├── 12. 配置Motion动画插件 (MotionPlugin)                            │
│       ├── 13. 动态更新标题 (watchEffect)                                   │
│       └── 14. 挂载应用 (app.mount('#app'))                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、启动核心文件详解

### 2.1 main.ts - 应用入口

**文件路径**: [src/main.ts](file:///i:/Dotnet/Solutions/Hey.AdMaster/hey-admaster-frontend/apps/hey-admin/src/main.ts)

**核心职责**:
- 定义应用命名空间，用于数据隔离
- 初始化偏好设置系统
- 启动 bootstrap 流程
- 移除全局 loading 动画

```typescript
async function initApplication() {
  const env = import.meta.env.PROD ? 'prod' : 'dev';
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const namespace = `${import.meta.env.VITE_APP_NAMESPACE}-${appVersion}-${env}`;
  
  // 偏好设置初始化
  await initPreferences({
    extension: preferencesExtension,
    namespace,
    overrides: overridesPreferences,
  });
  
  // 启动应用
  const { bootstrap } = await import('./bootstrap');
  await bootstrap(namespace);
  
  // 移除loading
  unmountGlobalLoading();
}
```

**关键点**:
- **命名空间格式**: `{VITE_APP_NAMESPACE}-{VITE_APP_VERSION}-{dev|prod}`
- **命名空间作用**: 隔离不同环境/版本的存储数据（如 localStorage、Pinia 持久化）

---

### 2.2 bootstrap.ts - 应用引导

**文件路径**: [src/bootstrap.ts](file:///i:/Dotnet/Solutions/Hey.AdMaster/hey-admaster-frontend/apps/hey-admin/src/bootstrap.ts)

**初始化顺序**:

| 步骤 | 初始化项 | 核心作用 |
|------|----------|----------|
| 1 | `initComponentAdapter` | 注册 ABp 组件适配器 |
| 2 | `initSetupVbenForm` | 初始化 Vben 表单组件 |
| 3 | `initRequestClient` | **配置 HTTP 请求客户端，包含认证拦截器** |
| 4 | `createApp(App)` | 创建 Vue 实例 |
| 5 | `registerLoadingDirective` | 注册 `v-loading` 和 `v-spinning` 指令 |
| 6 | `initStores(app, { namespace })` | 初始化 Pinia 状态管理 |
| 7 | `setupI18n(app)` | 配置国际化 |
| 8 | `initTimezone()` | 初始化时区处理 |
| 9 | `registerAccessDirective(app)` | **注册权限指令** |
| 10 | `initTippy(app)` | 初始化工具提示 |
| 11 | `app.use(router)` | **安装路由及路由守卫** |
| 12 | `app.use(MotionPlugin)` | 安装动画插件 |
| 13 | `watchEffect` | 动态更新页面标题 |
| 14 | `app.mount('#app')` | 挂载应用 |

**关键代码**:

```typescript
// 权限指令注册
registerAccessDirective(app);

// 路由安装（路由守卫已在 router/index.ts 中创建）
app.use(router);
```

---

### 2.3 router/index.ts - 路由创建

**文件路径**: [src/router/index.ts](file:///i:/Dotnet/Solutions/Hey.AdMaster/hey-admaster-frontend/apps/hey-admin/src/router/index.ts)

```typescript
const router = createRouter({
  history: import.meta.env.VITE_ROUTER_HISTORY === 'hash'
    ? createWebHashHistory(import.meta.env.VITE_BASE)
    : createWebHistory(import.meta.env.VITE_BASE),
  routes,
  scrollBehavior: (to, _from, savedPosition) => {
    if (savedPosition) return savedPosition;
    return to.hash ? { behavior: 'smooth', el: to.hash } : { left: 0, top: 0 };
  },
});

// 创建路由守卫（核心）
createRouterGuard(router);
```

**路由模式**:
- **Hash 模式**: `VITE_ROUTER_HISTORY=hash`
- **History 模式**: `VITE_ROUTER_HISTORY=history`（默认）

---

## 三、认证授权机制详解

### 3.1 架构总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          认证授权架构                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   登录视图    │    │   路由守卫    │    │   请求拦截器  │                  │
│  │  (Login.vue) │───►│  (guard.ts)  │───►│(request.ts)  │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                          │
│         ▼                   ▼                   ▼                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Auth Store                                   │   │
│  │                    (src/store/auth.ts)                              │   │
│  │                                                                     │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │   │
│  │  │ 登录方法   │  │ Token管理  │  │ 用户信息   │                    │   │
│  │  │ authLogin  │  │ refresh    │  │ fetchUser  │                    │   │
│  │  │ phoneLogin │  │ logout     │  │ Info       │                    │   │
│  │  │ qrcodeLogin│  │            │  │            │                    │   │
│  │  │ oidcLogin  │  │            │  │            │                    │   │
│  │  └────────────┘  └────────────┘  └────────────┘                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                   │                   │                          │
│         ▼                   ▼                   ▼                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │  @abp/account│    │  @vben/stores│    │   ABP API    │                  │
│  │  OAuthService│    │ AccessStore  │    │  (用户/权限)  │                  │
│  └──────────────┘    │ UserStore    │    └──────────────┘                  │
│                      └──────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2 路由守卫 - 核心权限控制

**文件路径**: [src/router/guard.ts](file:///i:/Dotnet/Solutions/Hey.AdMaster/hey-admaster-frontend/apps/hey-admin/src/router/guard.ts)

#### 3.2.1 通用守卫 (setupCommonGuard)

```typescript
function setupCommonGuard(router: Router) {
  const loadedPaths = new Set<string>();
  
  router.beforeEach(async (to) => {
    to.meta.loaded = loadedPaths.has(to.path);
    // 页面加载进度条
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });
  
  router.afterEach((to) => {
    loadedPaths.add(to.path);
    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}
```

**作用**:
- 记录已加载的页面路径，避免重复加载动画
- 管理页面切换进度条

---

#### 3.2.2 权限访问守卫 (setupAccessGuard) - 核心

```typescript
function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();
    
    // 步骤1: 基本路由跳过权限拦截
    if (coreRouteNames.includes(to.name as string)) {
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        // 已登录访问登录页，跳转到首页
        return decodeURIComponent(
          (to.query?.redirect as string) ||
            userStore.userInfo?.homePath ||
            preferences.app.defaultHomePath,
        );
      }
      return true;
    }
    
    // 步骤2: AccessToken 检查
    if (!accessStore.accessToken) {
      if (to.meta.ignoreAccess) return true; // 忽略权限的页面
      // 未登录，跳转登录页
      return {
        path: LOGIN_PATH,
        query: to.fullPath === preferences.app.defaultHomePath
          ? {}
          : { redirect: encodeURIComponent(to.fullPath) },
        replace: true,
      };
    }
    
    // 步骤3: 动态路由生成检查
    if (accessStore.isAccessChecked) {
      return true; // 已生成过路由，直接放行
    }
    
    // 步骤4: 生成动态路由
    const userInfo = userStore.userInfo || (await authStore.fetchUserInfo());
    const userRoles = userInfo?.roles ?? [];
    
    const { accessibleMenus, accessibleRoutes } = await generateAccess({
      roles: userRoles,
      router,
      routes: accessRoutes,
    });
    
    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);
    
    // 步骤5: 重定向到目标页面
    const redirectPath = (from.query.redirect ??
      (to.path === preferences.app.defaultHomePath
        ? userInfo?.homePath || preferences.app.defaultHomePath
        : to.fullPath)) as string;
    
    return {
      ...router.resolve(decodeURIComponent(redirectPath)),
      replace: true,
    };
  });
}
```

**执行流程图**:

```
用户访问路由
     │
     ▼
┌───────────────────────────────────┐
│ 是否为基本路由 (coreRouteNames)?   │
└───────────────────────────────────┘
     │           │
    是           否
     │           ▼
     │   ┌───────────────────────────┐
     │   │  是否有 accessToken?      │
     │   └───────────────────────────┘
     │        │           │
     │       是           否
     │        │           ▼
     │        │   ┌───────────────────┐
     │        │   │  是否忽略权限?     │
     │        │   │  (meta.ignoreAccess)│
     │        │   └───────────────────┘
     │        │        │           │
     │        │       是           否
     │        │        │           ▼
     │        │        │   跳转登录页(带redirect)
     │        │        │
     │        ▼        │
     │   ┌───────────────────────┐
     │   │ 是否已生成动态路由?     │
     │   │ (isAccessChecked)     │
     │   └───────────────────────┘
     │        │           │
     │       是           否
     │        │           ▼
     │        │   ┌───────────────────────┐
     │        │   │ 1. 获取用户信息        │
     │        │   │ 2. 获取用户角色        │
     │        │   │ 3. 调用 generateAccess │
     │        │   │ 4. 生成可访问路由/菜单   │
     │        │   │ 5. 保存到 accessStore   │
     │        │   └───────────────────────┘
     │        │           │
     │        └──────┬────┘
     │               ▼
     │         放行访问目标页面
     │
     ▼
 直接放行(基本路由)
```

---

### 3.3 Auth Store - 认证状态管理

**文件路径**: [src/store/auth.ts](file:///i:/Dotnet/Solutions/Hey.AdMaster/hey-admaster-frontend/apps/hey-admin/src/store/auth.ts)

#### 3.3.1 登录方法列表

| 方法 | 类型 | 说明 |
|------|------|------|
| `authLogin(params)` | 密码登录 | 通过用户名密码获取 Token |
| `phoneLogin(phoneNumber, code)` | 短信登录 | 通过手机号和验证码登录 |
| `qrcodeLogin(key, tenantId)` | 二维码登录 | 通过扫码登录 |
| `oidcLogin(args)` | OIDC登录 | 通过 OpenID Connect 协议登录 |
| `oidcCallback(onError)` | OIDC回调 | 处理 OIDC 登录回调 |
| `linkUseLogin(userId, tenantId)` | 链接用户登录 | 切换到关联用户 |
| `impersonationUserLogin(params)` | 模拟登录 | 管理员模拟用户登录 |

---

#### 3.3.2 核心登录流程 (`authLogin`)

```typescript
async function authLogin(params: Recordable<any>, onSuccess?: () => Promise<void> | void) {
  try {
    loginLoading.value = true;
    // 调用 ABP OAuthService 登录
    const user = await oAuthService.loginByPassword(params as any);
    return await _loginSuccess({
      accessToken: user.access_token,
      tokenType: user.token_type,
      refreshToken: user.refresh_token ?? '',
      expiresIn: user.expires_in!,
    }, onSuccess);
  } finally {
    loginLoading.value = false;
  }
}
```

---

#### 3.3.3 登录成功处理 (`_loginSuccess`)

```typescript
async function _loginSuccess(loginResult: TokenResult, onSuccess?: () => Promise<void> | void) {
  const { accessToken, tokenType, refreshToken } = loginResult;
  
  if (accessToken) {
    // 1. 保存 Token
    accessStore.setAccessToken(`${tokenType} ${accessToken}`);
    accessStore.setRefreshToken(refreshToken);
    
    // 2. 获取用户信息
    userInfo = await fetchUserInfo();
    userStore.setUserInfo(userInfo);
    
    // 3. 发布登录事件
    publish(Events.UserLogin, userInfo);
    
    // 4. 跳转页面
    if (accessStore.loginExpired) {
      accessStore.setLoginExpired(false);
    } else {
      onSuccess
        ? await onSuccess?.()
        : await router.push(userInfo?.homePath || preferences.app.defaultHomePath);
    }
    
    // 5. 显示登录成功通知
    if (userInfo?.realName) {
      notification.success({
        description: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
        duration: 3,
        message: $t('authentication.loginSuccess'),
      });
    }
  }
  return { userInfo };
}
```

---

#### 3.3.4 用户信息获取 (`fetchUserInfo`)

```typescript
async function fetchUserInfo() {
  let userInfoRes: { [key: string]: any } = {};
  const user = await oAuthService.getUser();
  if (user) {
    userInfoRes = user.profile;
  }
  
  // 获取 ABP 配置（包含用户权限信息）
  const abpConfig = await getConfigApi();
  
  // 检查认证状态
  if (!abpConfig.currentUser.isAuthenticated) {
    const newToken = await refreshSession();
    if (newToken) {
      return fetchUserInfo(); // 刷新成功，重试获取用户信息
    } else {
      await logout(); // 刷新失败，强制登出
      return null;
    }
  }
  
  // 构建用户信息对象
  const userInfo: UserInfo & { [key: string]: any } = {
    userId: userInfoRes.sub ?? abpConfig.currentUser.id,
    username: userInfoRes.uniqueName ?? abpConfig.currentUser.userName,
    realName: userInfoRes.given_name ?? userInfoRes.name ?? abpConfig.currentUser.name ?? abpConfig.currentUser.userName,
    avatar: '',
    desc: userInfoRes.uniqueName ?? userInfoRes.name,
    email: userInfoRes.email ?? userInfoRes.email,
    emailVerified: userInfoRes.emailVerified ?? abpConfig.currentUser.emailVerified,
    phoneNumber: userInfoRes.phoneNumber ?? abpConfig.currentUser.phoneNumber,
    phoneNumberVerified: userInfoRes.phoneNumberVerified ?? abpConfig.currentUser.phoneNumberVerified,
    token: '',
    roles: abpConfig.currentUser.roles,          // 用户角色列表
    homePath: '/',
  };
  
  // 获取用户头像
  try {
    const picture = await getPictureApi();
    if (picture) {
      userInfo.avatar = URL.createObjectURL(picture);
    }
  } catch (error) {
    console.warn('Error in get user avatar:', error);
  }
  
  // 保存到 Store
  userStore.setUserInfo(userInfo);
  abpStore.setApplication(abpConfig);
  accessStore.setAccessCodes(Object.keys(abpConfig.auth.grantedPolicies)); // 权限码
  
  return userInfo;
}
```

**关键点**:
- **双重数据源**: 从 OAuth 用户信息和 ABP 配置中获取用户数据
- **权限码存储**: `abpConfig.auth.grantedPolicies` 的 key 集合作为权限码
- **头像处理**: 通过 `URL.createObjectURL` 创建临时 URL

---

#### 3.3.5 登出流程 (`logout`)

```typescript
async function logout(redirect: boolean = true) {
  try {
    if (await oAuthService.getAccessToken()) {
      accessStore.setAccessToken(null);
      await oAuthService.logout();
    } else {
      await oAuthService.revokeTokens();
    }
  } catch {
    // 忽略错误
  }
  
  // 重置所有 Store
  resetAllStores();
  accessStore.setLoginExpired(false);
  
  // 发布登出事件
  publish(Events.UserLogout);
  
  // 跳转登录页
  await router.replace({
    path: LOGIN_PATH,
    query: redirect
      ? { redirect: encodeURIComponent(router.currentRoute.value.fullPath) }
      : {},
  });
}
```

---

#### 3.3.6 Token 刷新 (`refreshSession`)

```typescript
async function refreshSession() {
  if (await oAuthService.getAccessToken()) {
    const user = await oAuthService.refreshToken();
    const newToken = `${user?.token_type} ${user?.access_token}`;
    
    accessStore.setAccessToken(newToken);
    if (user?.refresh_token) {
      accessStore.setRefreshToken(user.refresh_token);
    }
    
    try {
      const userInfo = await fetchUserInfo();
      userStore.setUserInfo(userInfo);
    } catch (error) {
      console.warn('refresh user info error', error);
    }
    
    return newToken;
  }
}
```

---

### 3.4 请求拦截器 - Token 管理

**文件路径**: [src/adapter/request/index.ts](file:///i:/Dotnet/Solutions/Hey.AdMaster/hey-admaster-frontend/apps/hey-admin/src/adapter/request/index.ts)

#### 3.4.1 请求拦截器

```typescript
requestClient.addRequestInterceptor({
  fulfilled: async (config) => {
    const abpStore = useAbpStore();
    const accessStore = useAccessStore();
    const timezoneStore = useTimezoneStore();
    
    // Authorization 头
    if (accessStore.accessToken) {
      config.headers.Authorization = `${accessStore.accessToken}`;
    }
    
    // 语言设置
    config.headers['Accept-Language'] = preferences.app.locale;
    
    // 请求来源标识
    config.headers['X-Request-From'] = 'vben';
    
    // 租户ID (多租户支持)
    if (abpStore.tenantId) {
      config.headers.__tenant = abpStore.tenantId;
    }
    
    // XSRF Token
    if (abpStore.xsrfToken) {
      config.headers.RequestVerificationToken = abpStore.xsrfToken;
    }
    
    // 时区信息
    if (timezoneStore.timezone) {
      config.headers.__timezone = timezoneStore.timezone;
    }
    
    return config;
  },
});
```

**请求头字段说明**:

| 字段 | 来源 | 作用 |
|------|------|------|
| `Authorization` | `accessStore.accessToken` | 携带 Bearer Token |
| `Accept-Language` | `preferences.app.locale` | 国际化语言 |
| `X-Request-From` | 固定值 'vben' | 标识请求来源 |
| `__tenant` | `abpStore.tenantId` | **多租户标识** |
| `RequestVerificationToken` | `abpStore.xsrfToken` | **CSRF 防护** |
| `__timezone` | `timezoneStore.timezone` | 时区信息 |

---

#### 3.4.2 Token 过期处理

```typescript
requestClient.addResponseInterceptor(
  authenticateResponseInterceptor({
    client: requestClient,
    doReAuthenticate,   // Token 失效时的处理
    doRefreshToken,     // 刷新 Token 的方法
    enableRefreshToken: preferences.app.enableRefreshToken,
    formatToken,
  }),
);
```

**`doReAuthenticate` - 重新认证**:

```typescript
async function doReAuthenticate() {
  const accessStore = useAccessStore();
  const authStore = useAuthStore();
  accessStore.setAccessToken(null);
  
  if (preferences.app.loginExpiredMode === 'modal' && accessStore.isAccessChecked) {
    // 弹出登录过期弹窗
    accessStore.setLoginExpired(true);
  } else {
    // 直接跳转登录页
    await authStore.logout();
  }
}
```

**登录过期模式**:
- **`modal`**: 在当前页面弹出登录弹窗，重新登录后继续操作
- **其他**: 直接跳转登录页

**`doRefreshToken` - 刷新 Token**:

```typescript
async function doRefreshToken() {
  const authStore = useAuthStore();
  try {
    const token = await authStore.refreshSession();
    return token ?? '';
  } catch {
    console.warn('The refresh token has expired or is unavailable.');
  }
  return '';
}
```

---

### 3.5 动态路由生成

**文件路径**: [src/router/access.ts](file:///i:/Dotnet/Solutions/Hey.AdMaster/hey-admaster-frontend/apps/hey-admin/src/router/access.ts)

```typescript
async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const { getAllApi } = useMyMenusApi();
  const { transformRoutes } = useMenuTransform();
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');
  
  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };
  
  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      message.loading({
        content: `${$t('common.loadingMenu')}...`,
        duration: 1.5,
      });
      // 从 ABP API 获取菜单
      const { items } = await getAllApi({
        framework: uiFramework,
      });
      return transformRoutes(items);
    },
    forbiddenComponent: () => import('#/views/_core/fallback/forbidden.vue'),
    layoutMap,
    pageMap,
  });
}
```

**动态路由生成流程**:
1. 调用 `getAllApi` 从后端获取用户可访问的菜单数据
2. 通过 `transformRoutes` 将菜单数据转换为路由配置
3. 根据用户角色过滤路由，生成最终可访问路由列表
4. 保存到 `accessStore`

---

### 3.6 会话过期监听

**文件路径**: [src/hooks/useSessions.ts](file:///i:/Dotnet/Solutions/Hey.AdMaster/hey-admaster-frontend/apps/hey-admin/src/hooks/useSessions.ts)

```typescript
export function useSessions() {
  const authStore = useAuthStore();
  const abpStore = useAbpStore();
  const { subscribe, unSubscribe } = useEventBus();
  const { register, release } = useNotifications();
  
  function _onSessionExpired(event?: NotificationInfo) {
    if (!event) return;
    
    const { data, title, message } = event;
    const sessionId = data.SessionId;
    
    // 验证是否为当前会话
    if (sessionId === abpStore.application?.currentUser?.sessionId) {
      _release();
      Modal.confirm({
        iconType: 'warning',
        title,
        content: message,
        centered: true,
        afterClose: () => {
          authStore.logout();
        },
      });
    }
  }
  
  onMounted(_register);
  onUnmounted(_release);
}
```

**作用**: 监听后端推送的会话过期事件，当用户在其他设备登录或会话超时后，弹出确认框并强制登出。

---

## 四、路由结构

### 4.1 路由分类

| 分类 | 说明 | 是否需要权限 |
|------|------|-------------|
| **coreRoutes** | 基本路由（登录、回调、根路由等） | 否 |
| **accessRoutes** | 动态路由（业务页面） | 是 |
| **externalRoutes** | 外部路由（内嵌页面） | 否 |

---

### 4.2 基本路由 (`coreRoutes`)

**文件路径**: [src/router/routes/core.ts](file:///i:/Dotnet/Solutions/Hey.AdMaster/hey-admaster-frontend/apps/hey-admin/src/router/routes/core.ts)

```typescript
const coreRoutes: RouteRecordRaw[] = [
  // OIDC 登录回调
  {
    name: 'OidcFallback',
    path: '/signin-callback',
    component: () => import('#/views/_core/fallback/login-callback.vue'),
  },
  
  // 根路由（BasicLayout 容器）
  {
    name: 'Root',
    path: '/',
    component: BasicLayout,
    redirect: preferences.app.defaultHomePath,
    children: [],
  },
  
  // 认证页面组
  {
    name: 'Authentication',
    path: '/auth',
    component: AuthPageLayout,
    redirect: LOGIN_PATH,
    children: [
      { name: 'Login', path: 'login', component: ... },
      { name: 'CodeLogin', path: 'code-login', component: ... },
      { name: 'QrCodeLogin', path: 'qrcode-login', component: ... },
      { name: 'ForgetPassword', path: 'forget-password', component: ... },
      { name: 'Register', path: 'register', component: ... },
    ],
  },
];
```

---

## 五、认证授权数据流转

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          数据流转图                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  用户登录                                                                   │
│     │                                                                       │
│     ▼                                                                       │
│  OAuthService.loginByPassword()                                             │
│     │                                                                       │
│     ├──► accessToken ──► AccessStore.setAccessToken() ──► 请求头            │
│     │                                                                       │
│     ├──► refreshToken ──► AccessStore.setRefreshToken() ──► 刷新时使用       │
│     │                                                                       │
│     └──► expires_in ──► Token过期时间                                       │
│                                                                             │
│  获取用户信息                                                               │
│     │                                                                       │
│     ▼                                                                       │
│  fetchUserInfo()                                                           │
│     │                                                                       │
│     ├──► userInfo ──► UserStore.setUserInfo() ──► 页面展示                  │
│     │                                                                       │
│     ├──► roles ──► UserStore.userInfo.roles ──► 路由权限判断                │
│     │                                                                       │
│     └──► grantedPolicies ──► AccessStore.setAccessCodes() ──► 按钮权限控制  │
│                                                                             │
│  动态路由生成                                                               │
│     │                                                                       │
│     ▼                                                                       │
│  generateAccess({ roles })                                                  │
│     │                                                                       │
│     ├──► accessibleMenus ──► AccessStore.setAccessMenus() ──► 菜单渲染      │
│     │                                                                       │
│     └──► accessibleRoutes ──► AccessStore.setAccessRoutes() ──► 路由注册     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 六、关键 Store 说明

| Store | 模块 | 核心字段 | 用途 |
|-------|------|----------|------|
| **AccessStore** | `@vben/stores` | `accessToken`, `refreshToken`, `accessCodes`, `isAccessChecked`, `accessMenus`, `accessRoutes`, `loginExpired` | Token 管理、权限码、动态路由 |
| **UserStore** | `@vben/stores` | `userInfo` | 用户基本信息 |
| **AuthStore** | `#/store/auth` | `loginLoading` | 登录方法集合 |
| **AbpStore** | `@abp/core` | `application`, `tenantId`, `xsrfToken` | ABP 配置、租户信息 |

---

## 七、核心依赖库

| 库 | 版本/来源 | 用途 |
|----|----------|------|
| `@abp/account` | ABP 框架 | OAuth 认证服务 |
| `@abp/core` | ABP 框架 | 核心服务、事件总线 |
| `@abp/platform` | ABP 框架 | 菜单 API、路由转换 |
| `@vben/stores` | Vben 框架 | 状态管理 |
| `@vben/access` | Vben 框架 | 权限指令、路由生成 |
| `@vben/request` | Vben 框架 | HTTP 请求封装 |
| `vue-router` | Vue 3 | 路由管理 |
| `pinia` | Vue 3 | 状态管理 |

---

## 八、配置项说明

### 8.1 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_APP_NAMESPACE` | 应用命名空间 | - |
| `VITE_APP_VERSION` | 应用版本 | - |
| `VITE_ROUTER_HISTORY` | 路由模式 (`hash`/`history`) | `history` |
| `VITE_BASE` | 基础路径 | `/` |

### 8.2 偏好设置

| 设置项 | 说明 | 影响 |
|--------|------|------|
| `app.loginExpiredMode` | 登录过期模式 (`modal`/`redirect`) | Token 过期时的处理方式 |
| `app.enableRefreshToken` | 是否启用 Token 自动刷新 | 过期时是否尝试刷新 |
| `app.accessMode` | 权限模式 | 动态路由生成策略 |
| `app.defaultHomePath` | 默认首页路径 | 登录后跳转地址 |
