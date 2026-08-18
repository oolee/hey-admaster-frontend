// / <reference types="vite/client" />
import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** 路由标题 */
    title?: string;
    /** 侧边栏分组 */
    group?: string;
    /** 公开页(无需登录) */
    public?: boolean;
  }
}
