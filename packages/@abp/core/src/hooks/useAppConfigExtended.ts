import type { ApplicationConfig } from '@vben/types/global';

import { useAppConfig } from '@vben/hooks';

export function useAppConfigExtended(
  env: Record<string, any>,
  isProduction: boolean,
): ApplicationConfig & {
  auth: {
    audience?: string;
    authority: string;
    clientId: string;
    clientSecret: string;
    dingding?: {
      clientId: string;
      corpId: string;
    };
    disablePKCE?: boolean;
    onlyOidc?: boolean;
    onlyOidcHint?: boolean;
    prompt?: string;
  };
  uiFramework: string;
} {
  // 调用原始 useAppConfig 获取基础配置
  const baseConfig = useAppConfig(env, isProduction);

  // 补充你的 OIDC 配置
  const {
    VITE_GLOB_AUTH_AUTHORITY,
    VITE_GLOB_AUTH_CLIENT_ID,
    VITE_GLOB_AUTH_CLIENT_SECRET,
    VITE_GLOB_AUTH_AUDIENCE,
    VITE_GLOB_AUTH_PROMPT,
    VITE_GLOB_AUTH_DISABLE_PKCE,
    VITE_GLOB_UI_FRAMEWORK,
  } = env;

  return {
    ...baseConfig,
    auth: {
      ...baseConfig.auth,
      authority: VITE_GLOB_AUTH_AUTHORITY,
      clientId: VITE_GLOB_AUTH_CLIENT_ID,
      clientSecret: VITE_GLOB_AUTH_CLIENT_SECRET,
      audience: VITE_GLOB_AUTH_AUDIENCE,
      prompt: VITE_GLOB_AUTH_PROMPT,
      disablePKCE: VITE_GLOB_AUTH_DISABLE_PKCE === 'true',
    },
    uiFramework: VITE_GLOB_UI_FRAMEWORK,
  };
}
