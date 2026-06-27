<script setup lang="ts">
import { onMounted, ref } from 'vue';

// ===== Dark mode =====
const isDark = ref(false);

function initTheme() {
  const saved = localStorage.getItem('fede-theme');
  if (saved !== null) {
    isDark.value = saved === 'dark';
  }
  applyTheme();
}

function applyTheme() {
  const html = document.documentElement;
  html.classList.toggle('dark', isDark.value);
}

function toggleTheme() {
  isDark.value = !isDark.value;
  localStorage.setItem('fede-theme', isDark.value ? 'dark' : 'light');
  applyTheme();
}

onMounted(() => {
  initTheme();
});

// ===== Time =====
const timeStr = ref('');
function updateTime() {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Europe/Rome',
  });
  timeStr.value = `Udine, ${time} CEST`;
}
onMounted(() => {
  updateTime();
  setInterval(updateTime, 60_000);
});
</script>

<template>
  <div class="fede-site">
    <!-- Glass overlay with noise -->
    <div class="glass-overlay"></div>

    <!-- Header -->
    <header class="fede-header">
      <!-- Left: Logo + Location -->
      <div class="header-left">
        <a href="/experiments" class="home-logo" aria-label="Home page">
          <svg
            width="37"
            height="12"
            viewBox="0 0 37 12"
            fill="none"
            class="logo-svg"
          >
            <!-- F letter -->
            <path
              d="M0 11.1093V0.20929H6.8125V2.07786H2.02026V4.943H6.28003V6.796H2.02026V11.1093H0Z"
              class="f-logo"
            />
            <!-- P letter -->
            <path
              d="M28.7998 11.1093V0.20929H32.8234C34.8726 0.20929 36.2936 1.70415 36.2936 3.71286C36.2936 5.64372 34.8576 7.232 32.8234 7.232H30.7293V11.1093H28.7998ZM30.7293 5.36343H32.7037C33.6461 5.36343 34.3341 4.66272 34.3341 3.71286C34.3341 2.74743 33.6461 2.06229 32.7037 2.06229H30.7293V5.36343Z"
              class="p-logo"
            />
            <!-- Diagonal line -->
            <line
              x1="23.6944"
              y1="0.562843"
              x2="12.7944"
              y2="11.4628"
              class="line-logo"
            />
          </svg>
        </a>
        <p class="header-location">{{ timeStr }}</p>
      </div>

      <!-- Right: Nav + Dark toggle -->
      <div class="header-right">
        <nav class="header-nav">
          <a href="/experiments" class="nav-item">Projects</a>
          <span class="nav-separator"></span>
          <a href="/experiments" class="nav-item">About</a>
        </nav>
        <button
          class="theme-toggle"
          @click="toggleTheme"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <span class="theme-toggle-dot"></span>
        </button>
      </div>
    </header>
  </div>
</template>

<style>
/* ===== Fede CSS Variables ===== */
:root {
  --fede-bg: #e7e4df;
  --fede-primary: #17191a;
  --fede-secondary: #505050;
  --fede-border: rgb(0 0 0 / 10%);
  --fede-circle: rgb(0 0 0 / 10%);
  --fede-circle-darker: rgb(0 0 0 / 60%);
  --fede-switch: #000;
}

.dark {
  --fede-bg: #262626 !important;
  --fede-primary: #bebebe !important;
  --fede-secondary: #a0a09f !important;
  --fede-border: hsl(0deg 0% 100% / 20%) !important;
  --fede-circle: rgb(97 97 97 / 10%) !important;
  --fede-circle-darker: rgb(97 97 97 / 60%) !important;
  --fede-switch: #fff !important;
}

/* ===== Font Faces ===== */
@font-face {
  font-family: safiro-regular;
  font-style: normal;
  font-weight: 400;
  src: url('/fonts/safiro/safiro-regular.woff2') format('woff2');
  font-display: swap;
}

@font-face {
  font-family: safiro-medium;
  font-style: normal;
  font-weight: 500;
  src: url('/fonts/safiro/safiro-medium.woff2') format('woff2');
  font-display: swap;
}

@font-face {
  font-family: safiro-regular-i;
  font-style: italic;
  font-weight: 400;
  src: url('/fonts/safiro/safiro-regular-i.woff2') format('woff2');
  font-display: swap;
}
</style>

<style scoped>
/* ===== Site Layout ===== */
.fede-site {
  position: fixed;
  inset: 0;
  overflow-x: hidden;
  font-family: safiro-regular, sans-serif;
  color: var(--fede-secondary);
  background-color: var(--fede-bg);
  text-rendering: optimizelegibility;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
}

/* ===== Glass Overlay + Noise ===== */
.glass-overlay {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  transform: translateZ(0);
}

.dark .glass-overlay {
  background: hsl(0deg 0% 7% / 50%);
}

@media (min-width: 1024px) {
  .dark .glass-overlay {
    background: rgb(0 0 0 / 40%);
  }
}

.glass-overlay::after {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  pointer-events: none;
  content: '';
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E");
  background-repeat: repeat;
  opacity: 0;
}

.dark .glass-overlay::after {
  opacity: 0.35;
  animation: noise 2s steps(3) infinite both;
}

@keyframes noise {
  0% {
    transform: translate(0, 0);
  }

  33% {
    transform: translate(-5px, 3px);
  }

  66% {
    transform: translate(3px, -5px);
  }

  100% {
    transform: translate(-2px, 2px);
  }
}

/* ===== Header ===== */
.fede-header {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 2rem 2rem 0;
}

@media (min-width: 1024px) {
  .fede-header {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    column-gap: 1.6rem;
    align-items: center;
    padding: 4rem 8rem 10rem;
  }
}

.header-left {
  display: flex;
  align-items: center;
}

@media (min-width: 1024px) {
  .header-left {
    grid-column: 1 / 4;
  }
}

/* ===== Logo ===== */
.home-logo {
  display: block;
}

.logo-svg {
  width: 3.4rem;
  height: auto;
}

@media (min-width: 1024px) {
  .logo-svg {
    width: 4rem;
  }
}

.f-logo,
.p-logo {
  fill: var(--fede-primary);
  transition: fill 0.3s ease-out;
}

.line-logo {
  stroke: var(--fede-border);
  transition: stroke 0.3s ease-out;
}

/* Logo hover effect */
.home-logo .line-logo {
  transform-origin: 50% 50%;
  transition: transform 0.3s cubic-bezier(0.43, 0.195, 0.02, 1);
}

.home-logo .p-logo {
  transition: transform 0.3s cubic-bezier(0.43, 0.195, 0.02, 1);
}

@media (hover: hover) {
  .home-logo:hover .line-logo {
    transform: scale(0);
  }

  .home-logo:hover .p-logo {
    transform: translate3d(-50%, 0, 0);
  }
}

/* ===== Location ===== */
.header-location {
  display: none;
  margin-left: 8rem;
  font-family: safiro-regular, sans-serif;
  font-size: 0.75rem;
  color: var(--fede-secondary);
  text-transform: uppercase;
  transition: color 0.3s ease-out;
}

@media (min-width: 1024px) {
  .header-location {
    display: block;
  }
}

/* ===== Header Right ===== */
.header-right {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@media (min-width: 1024px) {
  .header-right {
    grid-column: 11 / 13;
    justify-content: flex-end;
  }
}

/* ===== Navigation ===== */
.header-nav {
  display: flex;
  align-items: center;
  margin-right: 1.6rem;
  font-family: safiro-medium, sans-serif;
  font-size: 0.625rem;
  text-transform: uppercase;
}

@media (min-width: 1024px) {
  .header-nav {
    margin-right: 8rem;
    font-size: 0.75rem;
  }
}

.nav-item {
  position: relative;
  color: var(--fede-secondary);
  text-decoration: none;
  transition: color 0.3s ease-out;
}

.nav-item:hover {
  color: var(--fede-primary);
}

.nav-item::before {
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 1px;
  pointer-events: none;
  content: '';
  background: var(--fede-secondary);
  transform: scaleX(0);
  transform-origin: 100% 100%;
  transition: transform 0.6s cubic-bezier(0.43, 0.195, 0.02, 1);
}

@media (hover: hover) {
  .nav-item:hover::before {
    transform: scaleX(1);
    transform-origin: 0 100%;
  }
}

.nav-separator {
  width: 1.6rem;
  height: 1px;
  margin: 0 0.5rem;
  background: var(--fede-border);
  transform: rotate(-45deg);
  transition: background 0.3s ease-out;
}

@media (min-width: 1024px) {
  .nav-separator {
    margin: 0 0.8rem;
  }
}

/* ===== Dark Mode Toggle ===== */
.theme-toggle {
  position: relative;
  display: flex;
  align-items: center;
  width: 2.6rem;
  height: 1.4rem;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--fede-switch);
  border-radius: 9999px;
  transition: border-color 0.3s ease-out;
}

.theme-toggle-dot {
  position: absolute;
  left: 0.2rem;
  width: 0.8rem;
  height: 0.8rem;
  background: var(--fede-switch);
  border-radius: 50%;
  transition:
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    background 0.3s ease-out;
}

.dark .theme-toggle-dot {
  transform: translateX(1.2rem);
}

@media (min-width: 1024px) {
  .theme-toggle {
    width: 3rem;
    height: 1.6rem;
  }

  .theme-toggle-dot {
    width: 1rem;
    height: 1rem;
  }

  .dark .theme-toggle-dot {
    transform: translateX(1.4rem);
  }
}
</style>
