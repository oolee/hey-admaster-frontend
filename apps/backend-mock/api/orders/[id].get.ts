// ============================================================
// GET /api/orders/[id] - 根据 ID 获取单个订单
// ============================================================

import { createError, defineEventHandler, getRouterParam } from 'h3';
import { mockPublicOrders } from '~/utils/public-mock-data';

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '请提供订单 ID',
    });
  }

  const order = mockPublicOrders.find((o) => o.id === id);

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage: `未找到订单: ${id}`,
    });
  }

  return {
    success: true,
    data: order,
  };
});
