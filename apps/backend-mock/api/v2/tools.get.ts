import { defineEventHandler } from 'h3';
import { tools } from '~/utils/v2-mock-data';

export default defineEventHandler(() => ({
  code: 0,
  data: { list: tools },
  message: 'ok',
}));
