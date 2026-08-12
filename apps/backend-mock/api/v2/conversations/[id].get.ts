import { defineEventHandler, getRouterParam } from 'h3';
import { chatMessages } from '~/utils/v2-mock-data';

export default defineEventHandler((event) => {
  void getRouterParam(event, 'id');
  return { code: 0, data: { list: chatMessages }, message: 'ok' };
});
