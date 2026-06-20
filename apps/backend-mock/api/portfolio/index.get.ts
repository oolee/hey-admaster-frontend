// ============================================================
// GET /api/portfolio - 获取作品集列表
// ============================================================

import { defineEventHandler } from 'h3';
import { mockPortfolioItems } from '~/utils/public-mock-data';

export default defineEventHandler(() => {
  return {
    success: true,
    data: mockPortfolioItems,
    total: mockPortfolioItems.length,
  };
});
