import { defineComponent, h } from 'vue';

export const HeyBrandButton = defineComponent({
  name: 'HeyBrandButton',
  props: {
    label: { type: String, required: true },
    href: { type: String, default: '' },
  },
  setup(props) {
    return () =>
      h(
        props.href ? 'a' : 'button',
        {
          class: 'hey-brand-button',
          href: props.href || undefined,
        },
        props.label,
      );
  },
});

export const HeyEmptyState = defineComponent({
  name: 'HeyEmptyState',
  props: {
    title: { type: String, default: '暂无内容' },
    description: { type: String, default: '请稍后再试或创建新的内容。' },
  },
  setup(props) {
    return () =>
      h('section', { class: 'hey-empty-state' }, [
        h('strong', props.title),
        h('p', props.description),
      ]);
  },
});
