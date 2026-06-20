// ============================================================
// GET /api/orders - 获取订单列表
// ============================================================

import { defineEventHandler } from 'h3';
import { mockPublicOrders } from '~/utils/public-mock-data';

export default defineEventHandler(() => {
  return {
    success: true,
    data: mockPublicOrders,
    total: mockPublicOrders.length,
  };
});
