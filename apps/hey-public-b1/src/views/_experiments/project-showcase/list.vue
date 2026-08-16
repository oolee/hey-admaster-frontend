<script setup lang="ts">
import { useRouter } from 'vue-router';

import { projectsData } from './data';

const router = useRouter();

function goTo(slug: string) {
  router.push(`/experiments/project-showcase/${slug}`);
}
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
      <span class="sc-primary sc-font-i text-3xl md:text-5xl"
        >All Projects</span
      >
      <span class="sc-secondary sc-font-m text-xs uppercase"
        >({{ projectsData.length }})</span
      >
    </header>

    <!-- Projects Grid -->
    <section class="pt-32 pb-20 px-8 md:px-20">
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 max-w-6xl mx-auto"
      >
        <div
          v-for="project in projectsData"
          :key="project.id"
          class="group cursor-pointer"
          @click="goTo(project.slug)"
        >
          <!-- Cover -->
          <div
            class="aspect-square rounded-2xl overflow-hidden mb-4 border transition-colors duration-500"
            :style="{ borderColor: `rgba(${project.colors.colorHover}, 0.2)` }"
          >
            <img
              :src="`/assets/images/projects/${project.cover.image}`"
              :alt="project.cover.alt"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <!-- Info -->
          <div class="flex items-center justify-between">
            <h3 class="sc-primary sc-font-i text-xl md:text-2xl capitalize">
              {{ project.title.first }}
              <span v-if="project.title.second" class="block text-base">{{
                project.title.second
              }}</span>
            </h3>
            <span class="sc-secondary text-xs uppercase">{{
              project.meta.year
            }}</span>
          </div>
          <div class="flex items-center gap-2 mt-2 text-xs uppercase">
            <span class="sc-secondary">{{ project.meta.agency }}</span>
            <span v-if="project.meta.awards" class="sc-secondary">
              · {{ project.meta.awards }}
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped></style>

<style>
@import './style.css';
</style>
