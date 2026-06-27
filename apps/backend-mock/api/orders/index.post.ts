// ============================================================
// POST /api/orders - 创建新订单
// ============================================================

import { createError, defineEventHandler, readBody } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    contactEmail: string;
    contactName: string;
    contactPhone: string;
    packageId: string;
    requirements: string;
  }>(event);

  if (!body || !body.packageId) {
    throw createError({
      statusCode: 400,
      statusMessage: '请提供有效的套餐 ID (packageId)',
    });
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replaceAll('-', '');
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  const orderId = `ORD-${dateStr}-${seq}`;

  const order = {
    id: orderId,
    packageId: body.packageId,
    requirements: body.requirements ?? '',
    contactName: body.contactName ?? '',
    contactEmail: body.contactEmail ?? '',
    contactPhone: body.contactPhone ?? '',
    status: 'pending' as const,
    createdAt: now.toISOString(),
  };

  return {
    success: true,
    data: order,
    message: '订单创建成功',
  };
});
