// ============================================================
// 广告行业 AI 生图模板
// 每个模板包含：场景中文描述、优化后的 Prompt、推荐模型、默认尺寸
// ============================================================

export interface AdTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  promptTemplate: string;
  promptHint: string;
  recommendedModel: string;
  defaultSize: string;
  printSize: string;
}

export const AD_TEMPLATES: AdTemplate[] = [
  // ============ 门头店招 ============
  {
    id: 'door-sign',
    name: '门头店招',
    category: '门头设计',
    icon: 'mdi:storefront-outline',
    description: '商业门头招牌设计，支持发光字、铝塑板、喷绘布等材质',
    promptTemplate:
      '商业门头招牌设计，店铺名称"{name}"，{style}风格，{material}材质，白天/夜晚效果图，高清写实，适合商业街店面',
    promptHint:
      '请输入店铺名称、风格偏好（如现代简约/中式/欧式）和材质（如铝塑板/发光字/喷绘布）',
    recommendedModel: 'wan2.7-image-pro',
    defaultSize: '1536x1024',
    printSize: '根据实际门头尺寸等比例缩放',
  },
  {
    id: 'door-sign-3d',
    name: '3D门头效果图',
    category: '门头设计',
    icon: 'mdi:cube-outline',
    description: '3D立体门头效果图，模拟真实店面场景',
    promptTemplate:
      '3D渲染商业门头效果图，店铺名称"{name}"，{style}风格，包含店面外观、招牌、橱窗展示，建筑可视化，超写实渲染，自然光照，街道背景',
    promptHint: '请输入店铺名称和风格，可指定店面宽度、层数等',
    recommendedModel: 'wan2.7-image-pro',
    defaultSize: '1536x1024',
    printSize: '效果图，非印刷尺寸',
  },

  // ============ VI设计 ============
  {
    id: 'vi-logo',
    name: 'Logo设计',
    category: 'VI设计',
    icon: 'mdi:draw-pen',
    description: '品牌Logo设计，多种风格可选',
    promptTemplate:
      '品牌Logo设计，品牌名称"{name}"，行业{industry}，{style}风格，简洁大方，矢量感，白色背景，适合多场景应用',
    promptHint: '请输入品牌名称、所属行业和风格偏好（如极简/科技感/复古/手绘）',
    recommendedModel: 'wan2.7-image-pro',
    defaultSize: '1024x1024',
    printSize: '矢量可缩放，建议后续矢量化',
  },
  {
    id: 'vi-business-card',
    name: '名片设计',
    category: 'VI设计',
    icon: 'mdi:card-account-details-outline',
    description: '商务名片设计，含正面和背面',
    promptTemplate:
      '商务名片设计，品牌"{name}"，{industry}行业，{style}风格，名片正面含Logo和联系方式，背面含业务范围，高端质感，印刷效果',
    promptHint: '请输入品牌名称和行业，会自动生成正反面名片',
    recommendedModel: 'qwen-image-2.0-pro',
    defaultSize: '1024x1024',
    printSize: '90x54mm 标准名片',
  },
  {
    id: 'vi-envelope',
    name: '信封/信纸',
    category: 'VI设计',
    icon: 'mdi:email-outline',
    description: '企业信封和信纸设计',
    promptTemplate:
      '企业办公用品设计，品牌"{name}"，信封和信纸套装，{style}风格，含Logo、地址、联系方式，印刷效果，白色纸张',
    promptHint: '请输入品牌名称和风格偏好',
    recommendedModel: 'wan2.7-image-pro',
    defaultSize: '1024x1024',
    printSize: 'DL信封 220x110mm / A4信纸 210x297mm',
  },

  // ============ DM传单 ============
  {
    id: 'dm-flyer',
    name: 'DM宣传单',
    category: 'DM传单',
    icon: 'mdi:file-document-outline',
    description: 'DM宣传单/折页设计，促销活动海报',
    promptTemplate:
      'DM宣传单设计，{industry}行业，主题"{title}"，{style}风格，A4尺寸，含促销信息、产品图片、联系方式，印刷品效果，商业设计',
    promptHint: '请输入行业、活动主题和风格偏好',
    recommendedModel: 'qwen-image-2.0-pro',
    defaultSize: '1024x1536',
    printSize: 'A4 210x297mm（含3mm出血线）',
  },
  {
    id: 'dm-menu',
    name: '菜单/价目表',
    category: 'DM传单',
    icon: 'mdi:food-outline',
    description: '餐饮菜单、服务价目表设计',
    promptTemplate:
      '菜单/价目表设计，{industry}行业，{style}风格，含菜品图片和价格信息，排版清晰，印刷品质，A4或A3尺寸',
    promptHint: '请输入行业类型（如餐饮/美容/汽修）和风格',
    recommendedModel: 'qwen-image-2.0-pro',
    defaultSize: '1024x1536',
    printSize: 'A4 210x297mm 或 A3 297x420mm',
  },

  // ============ 文化墙 ============
  {
    id: 'wall-party',
    name: '党建文化墙',
    category: '文化墙',
    icon: 'mdi:flag-outline',
    description: '党建/红色主题文化墙设计',
    promptTemplate:
      '党建文化墙设计，{organization}单位，红色主题，包含入党誓词、党员风采、组织架构等内容板块，庄重大气，适合政府机关和企事业单位',
    promptHint: '请输入单位名称和需要展示的内容板块',
    recommendedModel: 'wan2.7-image-pro',
    defaultSize: '1536x1024',
    printSize: '根据墙面实际尺寸定制',
  },
  {
    id: 'wall-enterprise',
    name: '企业文化墙',
    category: '文化墙',
    icon: 'mdi:office-building-outline',
    description: '企业文化墙/形象墙设计',
    promptTemplate:
      '企业文化墙设计，{company}公司，{style}风格，包含企业简介、发展历程、愿景使命、团队风采等板块，现代简约，适合办公区域',
    promptHint: '请输入公司名称和风格偏好',
    recommendedModel: 'wan2.7-image-pro',
    defaultSize: '1536x1024',
    printSize: '根据墙面实际尺寸定制',
  },
  {
    id: 'wall-school',
    name: '校园文化墙',
    category: '文化墙',
    icon: 'mdi:school-outline',
    description: '学校/教育机构文化墙设计',
    promptTemplate:
      '校园文化墙设计，{school}学校，{style}风格，包含校训、办学理念、师生风采、荣誉展示等内容，活泼明亮，适合学校走廊或大厅',
    promptHint: '请输入学校名称和风格偏好',
    recommendedModel: 'wan2.7-image-pro',
    defaultSize: '1536x1024',
    printSize: '根据墙面实际尺寸定制',
  },

  // ============ 3D效果图 ============
  {
    id: '3d-interior',
    name: '室内效果图',
    category: '3D效果图',
    icon: 'mdi:sofa-outline',
    description: '室内装修/空间设计3D效果图',
    promptTemplate:
      '3D室内效果图，{space}空间，{style}风格，建筑可视化渲染，真实光照，高清材质纹理，专业室内设计视角',
    promptHint: '请输入空间类型（如客厅/办公室/店铺）和风格',
    recommendedModel: 'wan2.7-image-pro',
    defaultSize: '1536x1024',
    printSize: '效果图展示，可按需输出',
  },
  {
    id: '3d-exhibition',
    name: '展台/展厅设计',
    category: '3D效果图',
    icon: 'mdi:view-dashboard-outline',
    description: '展会展台、展厅3D效果图',
    promptTemplate:
      '3D展台设计效果图，{event}展会，品牌"{name}"，{style}风格，含接待台、展示区、洽谈区，建筑可视化，展会灯光效果',
    promptHint: '请输入展会名称、品牌名称和风格',
    recommendedModel: 'wan2.7-image-pro',
    defaultSize: '1536x1024',
    printSize: '效果图展示，非印刷尺寸',
  },
];

/**
 * 根据模板ID和用户输入生成优化后的 Prompt
 */
export function buildPrompt(
  template: AdTemplate,
  userInput: Record<string, string>,
): string {
  let prompt = template.promptTemplate;
  for (const [key, value] of Object.entries(userInput)) {
    prompt = prompt.replace(`{${key}}`, value || '');
  }
  // 清理未替换的占位符
  prompt = prompt.replaceAll(/\{[^}]+\}/g, '');
  return prompt.trim();
}

/**
 * 按分类获取模板列表
 */
export function getTemplatesByCategory(): Record<string, AdTemplate[]> {
  const categories: Record<string, AdTemplate[]> = {};
  for (const tpl of AD_TEMPLATES) {
    if (!categories[tpl.category]) {
      categories[tpl.category] = [];
    }
    categories[tpl.category]?.push(tpl);
  }
  return categories;
}
