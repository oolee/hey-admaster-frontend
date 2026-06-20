// ============================================================
// GET /api/ai/templates - 获取广告行业 AI 生图模板列表
// ============================================================

import { defineEventHandler } from 'h3';
import { AD_TEMPLATES, getTemplatesByCategory } from '~/utils/ad-templates';

export default defineEventHandler(() => {
  return {
    success: true,
    data: AD_TEMPLATES,
    categories: getTemplatesByCategory(),
  };
});
