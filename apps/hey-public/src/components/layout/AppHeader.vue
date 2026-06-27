<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { useTheme } from '#/composables/useTheme';

const route = useRoute();
const { isDark, toggleTheme } = useTheme();
const isScrolled = ref(false);
const isMobileMenuOpen = ref(false);
const activeDropdown = ref<null | string>(null);

function onScroll() {
  isScrolled.value = window.scrollY > 50;
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener('scroll', onScroll));

const navItems = [
  { label: '首页', to: '/' },
  { label: '案例展示', to: '/portfolio' },
  { label: '服务与定价', to: '/services' },
];

const aiDesignItems = [
  { label: '一键生成', to: '/studio' },
  { label: '门头店招', to: '/studio?template=sign' },
  { label: '展厅文化墙', to: '/studio?template=wall' },
  { label: '海报设计', to: '/studio?template=poster' },
  { label: 'DM宣传单', to: '/studio?template=dm' },
];

const toolboxItems = [
  { label: '全部工具', to: '/tools' },
  { label: '一键抠图', to: '/tools/remove-bg' },
  { label: '证件照', to: '/tools/id-photo' },
  { label: '图片压缩', to: '/tools/compress' },
];

const experimentItems = [
  { label: '动效', to: '/experiments' },
  { label: 'SN', to: '/experiments/sn' },
];

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}

function showDropdown(name: string) {
  activeDropdown.value = name;
}

function hideDropdown() {
  activeDropdown.value = null;
}
</script>

<template>
  <header class="app-header" :class="{ 'is-scrolled': isScrolled }">
    <div class="header-inner container-custom">
      <RouterLink to="/" class="brand">
        <span class="brand-text">Hey 19</span>
      </RouterLink>

      <nav class="nav-desktop">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ active: isActive(item.to) }"
        >
          {{ item.label }}
        </RouterLink>

        <!-- AI设计下拉菜单 -->
        <div
          class="nav-dropdown"
          @mouseenter="showDropdown('ai')"
          @mouseleave="hideDropdown"
        >
          <span class="nav-link" :class="{ active: isActive('/studio') }">
            AI设计
            <svg
              class="dropdown-arrow"
              :class="{ open: activeDropdown === 'ai' }"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor"
            >
              <path
                d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"
              />
            </svg>
          </span>
          <Transition name="dropdown">
            <div v-show="activeDropdown === 'ai'" class="dropdown-menu">
              <RouterLink
                v-for="item in aiDesignItems"
                :key="item.label"
                :to="item.to"
                class="dropdown-item"
              >
                {{ item.label }}
              </RouterLink>
            </div>
          </Transition>
        </div>

        <!-- 工具箱下拉菜单 -->
        <div
          class="nav-dropdown"
          @mouseenter="showDropdown('tools')"
          @mouseleave="hideDropdown"
        >
          <span class="nav-link" :class="{ active: isActive('/tools') }">
            工具箱
            <svg
              class="dropdown-arrow"
              :class="{ open: activeDropdown === 'tools' }"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor"
            >
              <path
                d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"
              />
            </svg>
          </span>
          <Transition name="dropdown">
            <div v-show="activeDropdown === 'tools'" class="dropdown-menu">
              <RouterLink
                v-for="item in toolboxItems"
                :key="item.label"
                :to="item.to"
                class="dropdown-item"
              >
                {{ item.label }}
              </RouterLink>
            </div>
          </Transition>
        </div>

        <!-- 实验下拉菜单 -->
        <div
          class="nav-dropdown"
          @mouseenter="showDropdown('experiments')"
          @mouseleave="hideDropdown"
        >
          <span class="nav-link" :class="{ active: isActive('/experiments') }">
            实验
            <svg
              class="dropdown-arrow"
              :class="{ open: activeDropdown === 'experiments' }"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor"
            >
              <path
                d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"
              />
            </svg>
          </span>
          <Transition name="dropdown">
            <div
              v-show="activeDropdown === 'experiments'"
              class="dropdown-menu"
            >
              <RouterLink
                v-for="item in experimentItems"
                :key="item.label"
                :to="item.to"
                class="dropdown-item"
              >
                {{ item.label }}
              </RouterLink>
            </div>
          </Transition>
        </div>

        <RouterLink
          to="/about"
          class="nav-link"
          :class="{ active: isActive('/about') }"
        >
          关于我们
        </RouterLink>
      </nav>

      <div class="header-actions">
        <!-- Theme toggle -->
        <button class="theme-toggle" @click="toggleTheme" aria-label="切换主题">
          <svg
            v-if="isDark"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
          >
            <path
              d="M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"
            />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
          >
            <path
              d="M9 2c-1.05 0-2.05.16-3 .46 1.69 1.24 2.79 3.24 2.79 5.54 0 3.87-3.13 7-7 7-.71 0-1.39-.11-2.03-.3C1.36 18.03 4.87 21 9 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"
            />
          </svg>
        </button>

        <RouterLink to="/studio" class="btn-neon btn-sm"> 开始创作 </RouterLink>
        <RouterLink to="/order" class="btn-neon-filled btn-sm">
          在线下单
        </RouterLink>
        <button
          class="mobile-menu-btn"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          aria-label="Toggle menu"
        >
          <span class="menu-bar" :class="{ open: isMobileMenuOpen }"></span>
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition name="slide">
      <nav v-if="isMobileMenuOpen" class="nav-mobile glass-card">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-mobile-link"
          :class="{ active: isActive(item.to) }"
          @click="isMobileMenuOpen = false"
        >
          {{ item.label }}
        </RouterLink>

        <div class="nav-mobile-group">
          <span class="nav-mobile-group-title">AI设计</span>
          <RouterLink
            v-for="item in aiDesignItems"
            :key="item.label"
            :to="item.to"
            class="nav-mobile-link sub"
            @click="isMobileMenuOpen = false"
          >
            {{ item.label }}
          </RouterLink>
        </div>

        <div class="nav-mobile-group">
          <span class="nav-mobile-group-title">工具箱</span>
          <RouterLink
            v-for="item in toolboxItems"
            :key="item.label"
            :to="item.to"
            class="nav-mobile-link sub"
            @click="isMobileMenuOpen = false"
          >
            {{ item.label }}
          </RouterLink>
        </div>

        <div class="nav-mobile-group">
          <span class="nav-mobile-group-title">实验</span>
          <RouterLink
            v-for="item in experimentItems"
            :key="item.label"
            :to="item.to"
            class="nav-mobile-link sub"
            @click="isMobileMenuOpen = false"
          >
            {{ item.label }}
          </RouterLink>
        </div>

        <RouterLink
          to="/about"
          class="nav-mobile-link"
          :class="{ active: isActive('/about') }"
          @click="isMobileMenuOpen = false"
        >
          关于我们
        </RouterLink>

        <div class="nav-mobile-actions">
          <button class="theme-toggle-mobile" @click="toggleTheme">
            <span v-if="isDark">🌙 夜间模式</span>
            <span v-else>☀️ 日间模式</span>
          </button>
        </div>
      </nav>
    </Transition>
  </header>
</template>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 10000;
  padding: 16px 0;
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
  transition: all 0.4s ease;
}

.app-header.is-scrolled {
  padding: 10px 0;
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 700;
  text-decoration: none;
}

.brand-text {
  display: inline-flex;
  align-items: center;
  padding: 8px 22px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-bg-primary);
  letter-spacing: -0.01em;
  background: var(--color-neon);
  border-radius: 9999px;
  transition: all 0.3s ease;
}

.brand:hover .brand-text {
  box-shadow: 0 0 30px var(--color-neon-glow);
  transform: scale(1.03);
}

.nav-desktop {
  display: none;
  gap: 28px;
  align-items: center;
}

@media (min-width: 1024px) {
  .nav-desktop {
    display: flex;
  }
}

.nav-link {
  position: relative;
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.3s ease;
}

.nav-link:hover,
.nav-link.active {
  color: var(--color-neon);
  text-shadow: 0 0 12px var(--color-neon-glow);
}

/* Dropdown */
.nav-dropdown {
  position: relative;
}

.dropdown-arrow {
  opacity: 0.7;
  transition: transform 0.3s ease;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 160px;
  padding: 8px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgb(0 0 0 / 40%);
  backdrop-filter: blur(20px);
  transform: translateX(-50%);
}

.dropdown-item {
  padding: 10px 16px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

/* Theme toggle */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.theme-toggle:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-sm {
  padding: 8px 18px;
  font-size: 0.85rem;
}

.mobile-menu-btn {
  position: relative;
  display: block;
  width: 36px;
  height: 36px;
  padding: 8px;
  cursor: pointer;
  background: none;
  border: none;
}

@media (min-width: 1024px) {
  .mobile-menu-btn {
    display: none;
  }
}

.menu-bar,
.menu-bar::before,
.menu-bar::after {
  position: absolute;
  left: 8px;
  display: block;
  width: 20px;
  height: 2px;
  background: var(--color-neon);
  transition: all 0.3s ease;
}

.menu-bar {
  top: 50%;
  transform: translateY(-50%);
}

.menu-bar::before {
  top: -6px;
  content: '';
}

.menu-bar::after {
  top: 6px;
  content: '';
}

.menu-bar.open {
  background: transparent;
}

.menu-bar.open::before {
  top: 0;
  transform: rotate(45deg);
}

.menu-bar.open::after {
  top: 0;
  transform: rotate(-45deg);
}

.nav-mobile {
  position: absolute;
  top: 100%;
  right: 16px;
  left: 16px;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  margin-top: 8px;
}

.nav-mobile-link {
  display: block;
  padding: 12px 16px;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.nav-mobile-link:hover,
.nav-mobile-link.active {
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.nav-mobile-link.sub {
  padding-left: 32px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.nav-mobile-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-mobile-group-title {
  padding: 8px 16px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-neon);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}

.nav-mobile-actions {
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid var(--color-border);
}

.theme-toggle-mobile {
  width: 100%;
  padding: 12px 16px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.theme-toggle-mobile:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
