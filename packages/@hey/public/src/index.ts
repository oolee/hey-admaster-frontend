export interface PublicService {
  slug: string;
  title: string;
  summary: string;
  deliverables: string[];
}

export interface PortfolioCase {
  id: string;
  title: string;
  category: string;
  result: string;
}

export const publicServices: PublicService[] = [
  { slug: 'ai-design', title: 'AI 创意设计', summary: '基于品牌调性生成广告主视觉、活动海报和社媒素材。', deliverables: ['AI 主视觉', '可编辑设计稿', '多尺寸导出'] },
  { slug: 'ad-material', title: '广告物料制作', summary: '覆盖线上投放、线下印刷与门店陈列的标准化物料生产。', deliverables: ['海报', '展架', '短视频封面'] },
  { slug: 'h5-invitation', title: 'H5 邀请函', summary: '用设计器快速制作活动、婚礼、开业与会议邀请函。', deliverables: ['H5 页面', '分享海报', '数据回收'] },
];

export const portfolioCases: PortfolioCase[] = [
  { id: 'cafe-launch', title: '咖啡品牌新品发布', category: '品牌主视觉', result: '7 天完成 32 张投放素材' },
  { id: 'expo-h5', title: '行业峰会 H5 邀请函', category: 'H5 邀请函', result: '报名转化率提升 41%' },
  { id: 'retail-print', title: '零售门店促销物料', category: '印刷物料', result: '统一 120 家门店视觉标准' },
];
