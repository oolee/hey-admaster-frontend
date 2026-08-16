import type { Ref } from 'vue';

import { onMounted, onUnmounted } from 'vue';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollAnimation(
  target: Ref<HTMLElement | null>,
  animation: 'fadeIn' | 'fadeUp' | 'scaleIn' | 'slideLeft' = 'fadeUp',
  options?: { delay?: number; duration?: number },
) {
  let trigger: null | ScrollTrigger = null;

  const animMap: Record<string, gsap.TweenVars> = {
    fadeUp: { opacity: 0, y: 60 },
    fadeIn: { opacity: 0 },
    scaleIn: { opacity: 0, scale: 0.85 },
    slideLeft: { opacity: 0, x: -80 },
  };

  onMounted(() => {
    if (!target.value) return;
    const from = animMap[animation] ?? animMap.fadeUp ?? { opacity: 0, y: 30 };

    trigger = ScrollTrigger.create({
      trigger: target.value,
      start: 'top 85%',
      onEnter: () => {
        gsap.fromTo(target.value as HTMLElement, from, {
          opacity: 1,
          y: 0,
          x: 0,
          scale: 1,
          duration: options?.duration ?? 0.8,
          delay: options?.delay ?? 0,
          ease: 'power3.out',
        });
      },
      once: true,
    });
  });

  onUnmounted(() => {
    trigger?.kill();
  });
}
