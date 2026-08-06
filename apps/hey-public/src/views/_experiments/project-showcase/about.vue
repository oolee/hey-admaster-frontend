<script setup lang="ts">
const awardsData = [
  {
    title: 'Awwwards',
    items: [
      'Site of the Day (x2)',
      'Developer Award (x3)',
      'Honorable Mention (x5)',
    ],
  },
  { title: 'FWA', items: ['FWA of the Day (x3)', 'FWA of the Month'] },
  { title: 'CSSDA', items: ['Site of the Day (x4)', 'UI/UX Design Award'] },
];

const clientsData = [
  'AQuest',
  'Things Agency',
  'Overpx Studio',
  'CME Medical',
  'Raccagni',
  'Unisve',
];

const collabsData = [
  'Bunker Studio',
  'Dogstudio',
  'Resn',
  'Active Theory',
  'Immersive Garden',
];

const contactsData = [
  { name: 'email', link: 'mailto:hello@federicopian.com' },
  { name: 'twitter', link: 'https://twitter.com' },
  { name: 'linkedin', link: 'https://linkedin.com' },
  { name: 'github', link: 'https://github.com' },
];
</script>

<template>
  <div class="sc-app min-h-screen">
    <!-- Header -->
    <header
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-6 md:px-20 md:py-10"
    >
      <a
        href="/experiments/project-showcase"
        class="sc-primary sc-font-m text-sm uppercase tracking-wider hover:opacity-70"
      >
        ← Back
      </a>
    </header>

    <div class="pt-32 pb-20 px-8 md:px-20 max-w-6xl mx-auto">
      <!-- Hero -->
      <div class="mb-16 md:mb-24">
        <h2 class="sc-primary sc-font-i text-5xl md:text-7xl leading-none mb-8">
          <span class="block">About</span>
          <span class="block">Fede</span>
        </h2>
        <p class="sc-secondary text-sm md:text-lg max-w-xl leading-relaxed">
          I'm Federico Pian, a freelance creative developer and co-founder at
          Overpx Studio, specialized in motion and interaction.
        </p>
      </div>

      <!-- Awards -->
      <div class="mb-16">
        <h3 class="sc-primary sc-font-m text-lg uppercase mb-6">
          Awards &amp; Recognitions
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div v-for="award in awardsData" :key="award.title">
            <h4 class="sc-primary sc-font-m text-sm uppercase mb-2">
              {{ award.title }}
            </h4>
            <ul class="sc-secondary text-xs space-y-1">
              <li v-for="item in award.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Clients & Collabs -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        <div>
          <h3 class="sc-primary sc-font-m text-lg uppercase mb-4">Clients</h3>
          <p class="sc-secondary text-sm flex flex-wrap gap-x-2">
            <span v-for="(client, i) in clientsData" :key="i">
              {{ client }}<span v-if="i < clientsData.length - 1"> / </span>
            </span>
          </p>
        </div>
        <div>
          <h3 class="sc-primary sc-font-m text-lg uppercase mb-4">Collabs</h3>
          <p class="sc-secondary text-sm flex flex-wrap gap-x-2">
            <span v-for="(collab, i) in collabsData" :key="i">
              {{ collab }}<span v-if="i < collabsData.length - 1"> / </span>
            </span>
          </p>
        </div>
      </div>

      <!-- Contacts -->
      <div>
        <h3 class="sc-primary sc-font-m text-lg uppercase mb-4">
          Get in Touch
        </h3>
        <div class="flex flex-wrap gap-3">
          <a
            v-for="contact in contactsData"
            :key="contact.name"
            :href="contact.link"
            :target="contact.name === 'email' ? '_self' : '_blank'"
            class="sc-primary sc-font-m text-xs uppercase border border-current rounded-full px-5 py-2 hover:bg-[var(--sc-primary)] hover:text-[var(--sc-bg)] transition-colors"
          >
            {{ contact.name }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>

<style>
@import './style.css';
</style>
