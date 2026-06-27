import { onMounted, onUnmounted, ref } from 'vue';

/**
 * 滚动揭示 composable
 * 当目标元素进入视口时触发 isRevealed = true
 */
export function useScrollReveal(threshold = 0.15) {
  const isRevealed = ref(false);
  const target = ref<HTMLElement | null>(null);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (!target.value) return;
    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          // 小延迟让遮罩动画先开始
          setTimeout(() => {
            isRevealed.value = true;
          }, 100);
          observer?.unobserve(entry.target);
        }
      },
      { threshold },
    );
    observer.observe(target.value);
  });

  onUnmounted(() => {
    observer?.disconnect();
  });

  return { target, isRevealed };
}
