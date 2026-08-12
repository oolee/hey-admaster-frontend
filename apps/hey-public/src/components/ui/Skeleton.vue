<script setup lang="ts">
defineProps({
  rows: { type: Number, default: 3 },
  lines: { type: Number, default: 3 },
});
</script>

<template>
  <div class="skeleton" role="status" aria-label="加载中">
    <div v-for="r in rows" :key="r" class="sk-row">
      <div class="sk-block"></div>
      <div class="sk-lines">
        <div
          v-for="l in lines"
          :key="l"
          class="sk-line"
          :style="{ width: `${100 - l * 12}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.sk-row {
  display: flex;
  gap: 1rem;
}

.sk-block,
.sk-line {
  background: linear-gradient(
    90deg,
    var(--color-surface-2) 25%,
    var(--color-surface-3) 50%,
    var(--color-surface-2) 75%
  );
  background-size: 800px 100%;
  border-radius: var(--r-md);
  animation: shimmer 1.4s infinite linear;
}

.sk-block {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
}

.sk-lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.2rem;
}

.sk-line {
  height: 12px;
}

@keyframes shimmer {
  0% {
    background-position: -400px 0;
  }

  100% {
    background-position: 400px 0;
  }
}
</style>
