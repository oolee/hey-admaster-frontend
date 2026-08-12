import { defineEventHandler } from 'h3';
import { labs } from '~/utils/v2-mock-data';

export default defineEventHandler(() => ({
  code: 0,
  data: { list: labs },
  message: 'ok',
}));
