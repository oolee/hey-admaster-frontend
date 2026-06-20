<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

function onScroll() {
  isScrolled.value = window.scrollY > 50
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const navItems = [
  { label: '首页', to: '/' },
  { label: '案例展示', to: '/portfolio' },
  { label: '服务与定价', to: '/services' },
  { label: 'AI创作工坊', to: '/studio' },
  { label: '关于我们', to: '/about' },
]

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <header
    class="app-header"
    :class="{ 'is-scrolled': isScrolled }"
  >
    <div class="header-inner">
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
      </nav>

      <div class="header-actions">
        <RouterLink to="/studio" class="btn-neon btn-sm">
          开始创作
        </RouterLink>
        <RouterLink to="/order" class="btn-neon-filled btn-sm">
          在线下单
        </RouterLink>
        <button
          class="mobile-menu-btn"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          aria-label="Toggle menu"
        >
          <span class="menu-bar" :class="{ open: isMobileMenuOpen }" />
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
      </nav>
    </Transition>
  </header>
</template>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 16px 0;
  transition: all 0.4s ease;
}

.app-header.is-scrolled {
  background: rgba(10, 10, 15, 0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
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
  background: #C8FF00;
  color: #0a0a0f;
  border-radius: 9999px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  transition: all 0.3s ease;
}

.brand:hover .brand-text {
  box-shadow: 0 0 30px rgba(200, 255, 0, 0.4);
  transform: scale(1.03);
}

.nav-desktop {
  display: none;
  gap: 32px;
}

@media (min-width: 768px) {
  .nav-desktop {
    display: flex;
  }
}

.nav-link {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  transition: color 0.3s ease;
  position: relative;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.nav-link:hover,
.nav-link.active {
  color: #C8FF00;
  text-shadow: 0 0 12px rgba(200, 255, 0, 0.3);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-sm {
  padding: 8px 18px;
  font-size: 0.85rem;
}

.mobile-menu-btn {
  display: block;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  width: 36px;
  height: 36px;
  position: relative;
}

@media (min-width: 768px) {
  .mobile-menu-btn {
    display: none;
  }
}

.menu-bar,
.menu-bar::before,
.menu-bar::after {
  display: block;
  width: 20px;
  height: 2px;
  background: #C8FF00;
  transition: all 0.3s ease;
  position: absolute;
  left: 8px;
}

.menu-bar {
  top: 50%;
  transform: translateY(-50%);
}

.menu-bar::before {
  content: '';
  top: -6px;
}

.menu-bar::after {
  content: '';
  top: 6px;
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
  left: 16px;
  right: 16px;
  margin-top: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-mobile-link {
  display: block;
  padding: 12px 16px;
  font-size: 0.95rem;
  color: #8888a0;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.nav-mobile-link:hover,
.nav-mobile-link.active {
  color: #C8FF00;
  background: rgba(200, 255, 0, 0.05);
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