<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getProjectBySlug, projectsData } from './data';

const route = useRoute();
const router = useRouter();
const slug = computed(() => route.params.slug as string);
const project = computed(() => getProjectBySlug(slug.value));

const nextProject = computed(() => {
  const p = project.value;
  if (!p) return null;
  const idx = projectsData.findIndex((item) => item.id === p.id);
  return projectsData[(idx + 1) % projectsData.length];
});

function goToProject(p: (typeof projectsData)[0]) {
  router.push(`/experiments/project-showcase/${p.slug}`);
}

function goBack() {
  router.push('/experiments/project-showcase');
}

const selectedImage = ref(0);
</script>

<template>
  <div v-if="project" class="sc-app min-h-screen">
    <!-- Header -->
    <header
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-6 md:px-20 md:py-10"
    >
      <button
        class="sc-primary sc-font-m text-sm uppercase tracking-wider hover:opacity-70"
        @click="goBack"
      >
        ← Back
      </button>
      <span class="sc-secondary sc-font-m text-xs uppercase"
        >{{ project.number }} /
        {{ String(projectsData.length).padStart(2, '0') }}</span
      >
    </header>

    <div class="flex flex-col md:flex-row min-h-screen pt-20">
      <!-- Left: Info -->
      <aside
        class="md:fixed md:left-0 md:top-0 md:w-[40%] md:h-screen flex flex-col justify-center px-8 md:px-20 pt-10 md:pt-0"
      >
        <h1 class="sc-primary sc-font-i text-5xl md:text-7xl leading-none mb-6">
          <span class="block">{{ project.title.first }}</span>
          <span v-if="project.title.second" class="block">{{
            project.title.second
          }}</span>
        </h1>
        <p
          class="sc-secondary text-sm md:text-base max-w-md leading-relaxed mb-8"
        >
          {{ project.description }}
        </p>

        <div class="grid grid-cols-2 gap-4 text-xs uppercase mb-8">
          <div>
            <p class="sc-primary sc-font-m mb-1">Role</p>
            <p class="sc-secondary">{{ project.meta.role.join(' / ') }}</p>
          </div>
          <div>
            <p class="sc-primary sc-font-m mb-1">Agency</p>
            <p class="sc-secondary">{{ project.meta.agency }}</p>
          </div>
          <div>
            <p class="sc-primary sc-font-m mb-1">Year</p>
            <p class="sc-secondary">{{ project.meta.year }}</p>
          </div>
          <div v-if="project.meta.awards">
            <p class="sc-primary sc-font-m mb-1">Awards</p>
            <p class="sc-secondary">{{ project.meta.awards }}</p>
          </div>
        </div>

        <a
          :href="project.link"
          target="_blank"
          class="sc-primary sc-font-m inline-flex items-center gap-2 text-xs uppercase border border-current rounded-full px-5 py-2 w-fit hover:bg-[var(--sc-primary)] hover:text-[var(--sc-bg)] transition-colors"
        >
          Visit Site
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            class="stroke-current"
          >
            <path d="M1 11L11 1M11 1H1M11 1V11" />
          </svg>
        </a>
      </aside>

      <!-- Right: Gallery -->
      <section
        class="md:ml-[40%] w-full md:w-[60%] px-8 md:px-20 py-10 md:py-20"
      >
        <div class="space-y-6 md:space-y-10">
          <div
            v-for="(img, idx) in project.gallery"
            :key="idx"
            class="rounded-2xl overflow-hidden"
          >
            <img
              :src="`/assets/images/projects/${project.folder}/${img.image}`"
              :alt="img.alt"
              class="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </div>

    <!-- Next Project -->
    <div
      v-if="nextProject"
      class="fixed bottom-8 right-8 md:bottom-10 md:right-20 z-20"
    >
      <button
        class="group flex items-center gap-3 sc-primary sc-font-m text-xs uppercase"
        @click="goToProject(nextProject)"
      >
        <span
          class="sc-secondary group-hover:text-[var(--sc-primary)] transition-colors"
          >Next</span
        >
        <span
          >{{ nextProject.title.first }} {{ nextProject.title.second }}</span
        >
      </button>
    </div>
  </div>

  <!-- Not Found -->
  <div v-else class="sc-app min-h-screen flex items-center justify-center">
    <div class="text-center">
      <h1 class="sc-primary sc-font-i text-4xl mb-4">Project Not Found</h1>
      <button
        class="sc-secondary hover:text-[var(--sc-primary)] underline"
        @click="goBack"
      >
        Go Back
      </button>
    </div>
  </div>
</template>

<style scoped></style>

<style>
@import './style.css';
</style>
