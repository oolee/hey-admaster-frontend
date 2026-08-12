import { defineEventHandler } from 'h3';
import { cases, stats, templates } from '~/utils/v2-mock-data';

export default defineEventHandler(() => ({
  code: 0,
  data: {
    stats,
    cases: cases.slice(0, 3),
    templates: templates.filter((t) => t.hot).slice(0, 4),
  },
  message: 'ok',
}));
