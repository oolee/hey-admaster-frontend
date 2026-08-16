import type { RouteRecordRaw } from 'vue-router';

import { createRouter, createWebHistory } from 'vue-router';
import { adminDemoRoutes } from '@/admin-demo/routes';

declare module 'vue-router' {
  interface RouteMeta {
    layout?: 'auth' | 'site' | 'workspace';
    requiresAuth?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/site/HomeView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/cases',
    name: 'cases',
    component: () => import('@/views/site/CasesView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/cases/:id',
    name: 'case-detail',
    component: () => import('@/views/site/CaseDetailView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/pricing',
    name: 'pricing',
    component: () => import('@/views/site/PricingView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/site/AboutView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/toolbox',
    name: 'toolbox',
    component: () => import('@/views/site/ToolboxView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/labs',
    name: 'labs',
    component: () => import('@/views/site/LabsView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('@/views/auth/AuthView.vue'),
    meta: { layout: 'auth' },
  },
  {
    path: '/workspace',
    name: 'workspace',
    component: () => import('@/views/workspace/WorkspaceView.vue'),
    meta: { layout: 'workspace', requiresAuth: false },
  },
  {
    path: '/workspace/canvas',
    name: 'canvas',
    component: () => import('@/views/workspace/InfiniteCanvasView.vue'),
    meta: { layout: 'workspace', requiresAuth: false },
  },
  {
    path: '/preview/:id',
    name: 'preview',
    component: () => import('@/views/workspace/PreviewView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/docs',
    name: 'docs',
    component: () => import('@/views/legal/DocsView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/help',
    name: 'help',
    component: () => import('@/views/legal/HelpView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/tutorials',
    name: 'tutorials',
    component: () => import('@/views/site/TutorialsView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/community',
    name: 'community',
    component: () => import('@/views/site/CommunityView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/careers',
    name: 'careers',
    component: () => import('@/views/site/CareersView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/views/site/ContactView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/views/legal/PrivacyView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/terms',
    name: 'terms',
    component: () => import('@/views/legal/TermsView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/auth/ProfileView.vue'),
    meta: { layout: 'workspace', requiresAuth: false },
  },
  {
    path: '/admin-demo',
    name: 'admin-demo',
    component: () => import('@/admin-demo/layout/AdminLayout.vue'),
    meta: { layout: 'workspace', title: 'AdminDemo' },
    redirect: '/admin-demo/dashboard',
    children: adminDemoRoutes,
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0, behavior: 'smooth' };
  },
});

export default router;
