import { defineEventHandler } from 'h3';
import { stats, team } from '~/utils/v2-mock-data';

export default defineEventHandler(() => ({
  code: 0,
  data: { team, stats },
  message: 'ok',
}));
