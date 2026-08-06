<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { projectsData } from './data';
import { useProjectShowcaseStore } from './store';

const router = useRouter();
const store = useProjectShowcaseStore();
const featured = computed(() => projectsData);
const activeIndex = ref(0);

function goTo(project: (typeof projectsData)[0]) {
  router.push(`/experiments/project-showcase/${project.slug}`);
}

function goToList() {
  router.push('/experiments/project-showcase/list');
}

function goToAbout() {
  router.push('/experiments/project-showcase/about');
}

function nextProject() {
  activeIndex.value = (activeIndex.value + 1) % featured.value.length;
}

function prevProject() {
  activeIndex.value =
    (activeIndex.value - 1 + featured.value.length) % featured.value.length;
}

onMounted(() => {
  store.markLoaded();
  store.completePreloader();
});
</script>

<template>
  <div class="sc-app min-h-screen">
    <!-- Header -->
    <header
      class="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-6 md:px-20 md:py-10"
    >
      <a
        href="/experiments"
        class="sc-primary sc-font-m text-sm uppercase tracking-wider hover:opacity-70 transition-opacity"
      >
        Experiments
      </a>
      <nav
        class="flex items-center gap-6 sc-font-m text-xs uppercase tracking-wider"
      >
        <button
          class="sc-secondary hover:text-[var(--sc-primary)] transition-colors"
          @click="goToList"
        >
          All Projects
        </button>
        <button
          class="sc-secondary hover:text-[var(--sc-primary)] transition-colors"
          @click="goToAbout"
        >
          About
        </button>
      </nav>
    </header>

    <!-- Main Project Display -->
    <section class="flex items-center justify-center min-h-screen px-8">
      <div class="w-full max-w-6xl">
        <!-- Project Card -->
        <div
          v-for="(project, idx) in featured"
          :key="project.id"
          class="transition-all duration-500"
          :class="[
            idx === activeIndex
              ? 'opacity-100 visible'
              : 'opacity-0 invisible absolute',
          ]"
        >
          <div
            class="flex flex-col md:flex-row items-center gap-10 md:gap-20 cursor-pointer"
            @click="goTo(project)"
          >
            <!-- Cover Image -->
            <div
              class="w-48 h-48 md:w-72 md:h-72 rounded-full overflow-hidden shrink-0 border-2 transition-colors duration-500"
              :style="{
                borderColor: `rgba(${project.colors.colorHover}, 0.3)`,
              }"
            >
              <img
                :src="`/assets/images/projects/${project.cover.image}`"
                :alt="project.cover.alt"
                class="w-full h-full object-cover"
              />
            </div>

            <!-- Info -->
            <div class="text-center md:text-left">
              <h2
                class="sc-primary sc-font-i text-4xl md:text-6xl lg:text-7xl leading-none mb-4"
              >
                <span>{{ project.title.first }}</span>
                <span
                  v-if="project.title.second"
                  class="block md:inline md:ml-4"
                  >{{ project.title.second }}</span
                >
              </h2>
              <div
                class="flex items-center justify-center md:justify-start gap-3 text-xs uppercase mb-6"
              >
                <span class="sc-secondary">{{ project.meta.agency }}</span>
                <span class="w-4 h-px bg-[var(--sc-border)] -rotate-45"></span>
                <span class="sc-secondary">{{ project.meta.year }}</span>
              </div>
              <p
                class="sc-secondary text-sm md:text-base max-w-md leading-relaxed"
              >
                {{ project.description }}
              </p>
              <a
                :href="project.link"
                target="_blank"
                class="sc-primary sc-font-m inline-flex items-center gap-2 mt-6 text-xs uppercase border border-current rounded-full px-5 py-2 hover:bg-[var(--sc-primary)] hover:text-[var(--sc-bg)] transition-colors"
                @click.stop
              >
                Visit
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
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex items-center justify-center gap-8 mt-16">
          <button
            class="sc-primary hover:opacity-60 transition-opacity p-2"
            @click="prevProject"
            aria-label="Previous"
          >
            <svg
              width="30"
              height="17"
              viewBox="0 0 30 17"
              fill="none"
              class="stroke-current w-8"
            >
              <path d="M8.55 16.64L1.39 8.26L7.83 0.73" />
              <path d="M1.39 8.28L30.02 8.28" />
            </svg>
          </button>
          <span class="sc-primary sc-font-m text-2xl tabular-nums">
            {{ String(activeIndex + 1).padStart(2, '0') }} /
            {{ String(featured.length).padStart(2, '0') }}
          </span>
          <button
            class="sc-primary hover:opacity-60 transition-opacity p-2"
            @click="nextProject"
            aria-label="Next"
          >
            <svg
              width="30"
              height="17"
              viewBox="0 0 30 17"
              fill="none"
              class="stroke-current w-8"
            >
              <path d="M21.72 0.36L28.88 8.74L22.44 16.27" />
              <path d="M28.88 8.72L0.25 8.72" />
            </svg>
          </button>
        </div>

        <!-- Bottom dots -->
        <div class="flex justify-center gap-2 mt-8">
          <button
            v-for="(_, idx) in featured"
            :key="idx"
            class="w-2 h-2 rounded-full transition-all duration-300"
            :class="
              idx === activeIndex ? 'sc-primary w-6' : 'bg-[var(--sc-border)]'
            "
            @click="activeIndex = idx"
          ></button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped></style>

<style>
@import './style.css';
</style>
