import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { onMounted, onUnmounted, type Ref } from 'vue'

gsap.registerPlugin(ScrollTrigger)

export function useScrollAnimation(
  target: Ref<HTMLElement | null>,
  animation: 'fadeUp' | 'fadeIn' | 'scaleIn' | 'slideLeft' = 'fadeUp',
  options?: { delay?: number; duration?: number }
) {
  let trigger: ScrollTrigger | null = null

  const animMap: Record<string, gsap.TweenVars> = {
    fadeUp: { opacity: 0, y: 60 },
    fadeIn: { opacity: 0 },
    scaleIn: { opacity: 0, scale: 0.85 },
    slideLeft: { opacity: 0, x: -80 },
  }

  onMounted(() => {
    if (!target.value) return
    const from = animMap[animation] ?? animMap.fadeUp!

    trigger = ScrollTrigger.create({
      trigger: target.value,
      start: 'top 85%',
      onEnter: () => {
        gsap.fromTo(target.value!, from, {
          opacity: 1,
          y: 0,
          x: 0,
          scale: 1,
          duration: options?.duration ?? 0.8,
          delay: options?.delay ?? 0,
          ease: 'power3.out',
        })
      },
      once: true,
    })
  })

  onUnmounted(() => {
    trigger?.kill()
  })
}
