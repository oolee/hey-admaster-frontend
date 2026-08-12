import type { RouteRecordRaw } from 'vue-router';

import { createRouter, createWebHistory } from 'vue-router';

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
    component: () => import('@/views/HomeView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/cases',
    name: 'cases',
    component: () => import('@/views/CasesView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/cases/:id',
    name: 'case-detail',
    component: () => import('@/views/CaseDetailView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/pricing',
    name: 'pricing',
    component: () => import('@/views/PricingView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/toolbox',
    name: 'toolbox',
    component: () => import('@/views/ToolboxView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/labs',
    name: 'labs',
    component: () => import('@/views/LabsView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('@/views/AuthView.vue'),
    meta: { layout: 'auth' },
  },
  {
    path: '/workspace',
    name: 'workspace',
    component: () => import('@/views/WorkspaceView.vue'),
    meta: { layout: 'workspace', requiresAuth: false },
  },
  {
    path: '/workspace/canvas',
    name: 'canvas',
    component: () => import('@/views/InfiniteCanvasView.vue'),
    meta: { layout: 'workspace', requiresAuth: false },
  },
  {
    path: '/preview/:id',
    name: 'preview',
    component: () => import('@/views/PreviewView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/docs',
    name: 'docs',
    component: () => import('@/views/DocsView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/help',
    name: 'help',
    component: () => import('@/views/HelpView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/tutorials',
    name: 'tutorials',
    component: () => import('@/views/TutorialsView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/community',
    name: 'community',
    component: () => import('@/views/CommunityView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/careers',
    name: 'careers',
    component: () => import('@/views/CareersView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/views/ContactView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/views/PrivacyView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/terms',
    name: 'terms',
    component: () => import('@/views/TermsView.vue'),
    meta: { layout: 'site' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { layout: 'workspace', requiresAuth: false },
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
