import { defineEventHandler } from 'h3';
import { addons, faqs, plans } from '~/utils/v2-mock-data';

export default defineEventHandler(() => ({
  code: 0,
  data: { plans, addons, faqs },
  message: 'ok',
}));
