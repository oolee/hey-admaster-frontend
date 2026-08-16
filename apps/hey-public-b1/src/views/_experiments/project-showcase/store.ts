import type { Project, ProjectColor } from './data';

import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

import { projectsData } from './data';

export const useProjectShowcaseStore = defineStore('project-showcase', () => {
  const isLoaded = ref(false);
  const preloaderDone = ref(false);
  const isDark = ref(false);
  const currentIndex = ref(0);

  const currentProject = computed<Project | undefined>(
    () => projectsData[currentIndex.value],
  );
  const totalProjects = computed(() => projectsData.length);

  const colors = computed<ProjectColor>(() => {
    return (
      currentProject.value?.colors ?? {
        colorPrimary: '23,25,26,1',
        colorSecondary: '80,80,80,1',
        colorBorder: '23,25,26,0.2',
        color1: '255,150,85',
        color2: '185,60,100',
        colorBg: '223,151,173',
        colorHover: '185,60,100',
      }
    );
  });

  function setIndex(i: number) {
    if (i >= 0 && i < projectsData.length) currentIndex.value = i;
  }
  function next() {
    currentIndex.value = (currentIndex.value + 1) % projectsData.length;
  }
  function prev() {
    currentIndex.value =
      (currentIndex.value - 1 + projectsData.length) % projectsData.length;
  }
  function toggleDark() {
    isDark.value = !isDark.value;
  }
  function markLoaded() {
    isLoaded.value = true;
  }
  function completePreloader() {
    preloaderDone.value = true;
  }

  return {
    isLoaded,
    preloaderDone,
    isDark,
    currentIndex,
    currentProject,
    totalProjects,
    colors,
    setIndex,
    next,
    prev,
    toggleDark,
    markLoaded,
    completePreloader,
  };
});
