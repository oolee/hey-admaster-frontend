// ============================================================
// GET /api/pricing - 获取定价套餐列表
// ============================================================

import { defineEventHandler } from 'h3';
import { mockPricingPackages } from '~/utils/public-mock-data';

export default defineEventHandler(() => {
  return {
    success: true,
    data: mockPricingPackages,
    total: mockPricingPackages.length,
  };
});
