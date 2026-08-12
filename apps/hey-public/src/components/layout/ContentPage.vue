<script setup lang="ts">
import RevealOnScroll from '@/components/ui/RevealOnScroll.vue';

const props = defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  heroVariant: { type: String, default: 'normal' }, // normal | compact | gradient
});
</script>

<template>
  <article class="content-page">
    <!-- Hero -->
    <header class="cp-hero" :class="`cp-hero--${heroVariant}`">
      <div class="container">
        <RevealOnScroll>
          <span v-if="eyebrow" class="section-eyebrow">{{ eyebrow }}</span>
          <h1 class="display-title">{{ title }}</h1>
          <p v-if="subtitle" class="section-desc">{{ subtitle }}</p>
          <slot name="hero"></slot>
        </RevealOnScroll>
      </div>
    </header>

    <!-- 内容 -->
    <section class="cp-body">
      <div class="container cp-grid">
        <main class="cp-main">
          <slot></slot>
        </main>
        <aside class="cp-toc" v-if="$slots.toc">
          <slot name="toc"></slot>
        </aside>
      </div>
    </section>
  </article>
</template>

<style scoped>
.content-page {
  padding-bottom: var(--sp-12);
}

.cp-hero {
  position: relative;
  padding: var(--sp-9) 0 var(--sp-8);
  overflow: hidden;
}

.cp-hero::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background-image:
    linear-gradient(var(--color-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-border) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.4;
  mask-image: radial-gradient(
    ellipse 80% 60% at 50% 0%,
    black 20%,
    transparent 75%
  );
}

.cp-hero--gradient::before {
  background: radial-gradient(
    ellipse 80% 60% at 50% 0%,
    var(--glow-accent) 0%,
    transparent 60%
  );
  mask-image: none;
}

.cp-hero .section-eyebrow {
  margin-bottom: var(--sp-3);
}

.cp-hero .display-title {
  max-width: 16ch;
  margin-bottom: var(--sp-4);
}

.cp-hero .section-desc {
  max-width: 60ch;
}

.cp-body {
  padding: var(--sp-7) 0;
}

.cp-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-6);
}

@media (min-width: 1024px) {
  .cp-grid:has(.cp-toc) {
    grid-template-columns: 1fr 240px;
  }
}

.cp-main {
  min-width: 0;
}

.cp-main :deep(h2) {
  margin: var(--sp-8) 0 var(--sp-4);
  font-size: var(--text-2xl);
  scroll-margin-top: var(--header-h);
}

.cp-main :deep(h2:first-child) {
  margin-top: 0;
}

.cp-main :deep(h3) {
  margin: var(--sp-6) 0 var(--sp-3);
  font-size: var(--text-xl);
}

.cp-main :deep(p) {
  margin-bottom: var(--sp-4);
  line-height: 1.85;
  color: var(--color-text-2);
}

.cp-main :deep(ul) {
  padding-left: 0;
  margin-bottom: var(--sp-4);
  list-style: none;
}

.cp-main :deep(ul li) {
  position: relative;
  padding-left: 1.4rem;
  margin-bottom: var(--sp-2);
  color: var(--color-text-2);
}

.cp-main :deep(ul li::before) {
  position: absolute;
  top: 0.65em;
  left: 0;
  width: 6px;
  height: 6px;
  content: '';
  background: var(--color-accent);
  border-radius: 50%;
}

.cp-main :deep(code) {
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--color-accent);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.cp-main :deep(pre) {
  padding: var(--sp-4);
  margin: var(--sp-4) 0;
  overflow-x: auto;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

.cp-main :deep(pre code) {
  padding: 0;
  font-size: var(--text-sm);
  color: var(--color-text-1);
  background: transparent;
  border: none;
}

.cp-main :deep(.callout) {
  display: flex;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-5);
  margin: var(--sp-5) 0;
  font-size: var(--text-sm);
  color: var(--color-text-1);
  background: var(--color-accent-soft);
  border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
  border-radius: var(--r-lg);
}

.cp-main :deep(.endpoint) {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
  padding: var(--sp-3) var(--sp-4);
  margin: var(--sp-2) 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
}

.cp-main :deep(.method) {
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  border-radius: var(--r-full);
}

.cp-main :deep(.method.get) {
  color: #2e9e5b;
  background: rgb(46 158 91 / 15%);
}

.cp-main :deep(.method.post) {
  color: #3d7bd9;
  background: rgb(61 123 217 / 15%);
}

.cp-main :deep(.method.put) {
  color: #f5a623;
  background: rgb(245 166 35 / 15%);
}

.cp-main :deep(.method.delete) {
  color: #d64545;
  background: rgb(214 69 69 / 15%);
}

.cp-toc {
  position: sticky;
  top: calc(var(--header-h) + var(--sp-4));
  align-self: start;
  padding: var(--sp-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

@media (max-width: 1023px) {
  .cp-toc {
    display: none;
  }
}
</style>
