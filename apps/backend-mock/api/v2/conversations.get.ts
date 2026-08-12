import { defineEventHandler } from 'h3';
import { conversations } from '~/utils/v2-mock-data';

export default defineEventHandler(() => ({
  code: 0,
  data: { list: conversations },
  message: 'ok',
}));
