import { defineEventHandler } from 'h3';
import { favorites, notifications, orders } from '~/utils/v2-mock-data';

export default defineEventHandler(() => ({
  code: 0,
  data: {
    notifications,
    orders,
    favorites,
    usage: {
      total: 4621,
      month: 862,
      monthLimit: 2000,
      charts: [
        { label: '1 月', value: 320 },
        { label: '2 月', value: 480 },
        { label: '3 月', value: 260 },
        { label: '4 月', value: 640 },
        { label: '5 月', value: 520 },
        { label: '6 月', value: 780 },
        { label: '7 月', value: 862 },
      ],
    },
  },
  message: 'ok',
}));
