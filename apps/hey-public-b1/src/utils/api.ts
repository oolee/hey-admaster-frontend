import type { AdTemplate, GenerateRequest } from '#/types/ai';
import type {
  ApiResponse,
  GenerateResponse,
  PublicHomepageData,
} from '#/types/api';
import type { Order, OrderRequest, PricingPackage } from '#/types/order';
import type { PortfolioDetail, PortfolioItem } from '#/types/portfolio';

import { ofetch } from 'ofetch';

import {
  MOCK_BASE64_IMAGE,
  mockOrders,
  mockPortfolioItems,
  mockPricingPackages,
} from './mock-data';
import { AD_TEMPLATES, getTemplatesByCategory } from './templates';

export const api = ofetch.create({
  baseURL: '/api',
  timeout: 120_000, // 增加到 120s，适应异步生图
  onResponseError({ response }) {
    console.error('[API Error]', response.status, response._data);
  },
});

// AI Generation
export async function generateImage(
  data: GenerateRequest,
): Promise<GenerateResponse> {
  try {
    return await api<GenerateResponse>('/ai/generate', {
      method: 'POST',
      body: data,
    });
  } catch {
    return {
      success: true,
      data: [
        {
          b64_json: MOCK_BASE64_IMAGE,
          revised_prompt: data.prompt,
          index: 0,
        },
      ],
      isMock: true,
      model: 'mock',
    };
  }
}

// 查询异步生图任务结果
export async function queryTaskStatus(
  taskId: string,
): Promise<GenerateResponse> {
  try {
    return await api<GenerateResponse>(`/ai/generate/${taskId}`);
  } catch {
    return {
      success: true,
      data: [{ b64_json: MOCK_BASE64_IMAGE, revised_prompt: taskId, index: 0 }],
      isMock: true,
      status: 'succeeded',
    };
  }
}

// 获取广告行业模板
export async function fetchTemplates(): Promise<{
  categories: Record<string, AdTemplate[]>;
  data: AdTemplate[];
  success: boolean;
}> {
  try {
    return await api<{
      categories: Record<string, AdTemplate[]>;
      data: AdTemplate[];
      success: boolean;
    }>('/ai/templates');
  } catch {
    return {
      success: true,
      data: AD_TEMPLATES,
      categories: getTemplatesByCategory(),
    };
  }
}

// Portfolio
export interface PortfolioListResult {
  items: PortfolioItem[];
  totalCount: number;
}

/** 获取案例列表（公开 API，返回 PagedResultDto） */
export async function fetchPortfolio(input?: {
  category?: string;
  maxResultCount?: number;
  skipCount?: number;
}): Promise<PortfolioListResult> {
  try {
    return await api<PortfolioListResult>('/app/public/portfolio', {
      params: input,
    });
  } catch {
    return {
      totalCount: mockPortfolioItems.length,
      items: mockPortfolioItems.map((item) => ({
        id: String(item.id),
        title: item.title,
        category: item.category,
        description: item.description,
        coverImageUrl: item.imageUrl,
        tags: item.tags,
        client: item.client,
        year: item.year,
      })) as PortfolioItem[],
    };
  }
}

/** 获取案例详情（公开 API） */
export async function fetchPortfolioDetail(
  id: string,
): Promise<PortfolioDetail> {
  try {
    return await api<PortfolioDetail>(`/app/public/portfolio/${id}`);
  } catch {
    const mock = mockPortfolioItems.find((item) => String(item.id) === id);
    if (!mock) throw new Error(`Portfolio not found: ${id}`);
    return {
      id: String(mock.id),
      title: mock.title,
      category: mock.category,
      description: mock.description,
      content: `<p>${mock.description}</p>`,
      tags: mock.tags,
      client: mock.client,
      year: mock.year,
      coverImageUrl: mock.imageUrl,
      images: [],
    };
  }
}

// Pricing
export async function fetchPricing(): Promise<ApiResponse<PricingPackage[]>> {
  try {
    return await api<ApiResponse<PricingPackage[]>>('/pricing');
  } catch {
    return {
      success: true,
      data: mockPricingPackages as PricingPackage[],
    };
  }
}

// Orders
export async function createOrder(
  data: OrderRequest,
): Promise<ApiResponse<Order>> {
  try {
    return await api<ApiResponse<Order>>('/orders', {
      method: 'POST',
      body: data,
    });
  } catch {
    return {
      success: true,
      data: {
        ...data,
        id: `ORD-${Date.now()}`,
        contactPhone: data.contactPhone ?? '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }
}

export async function fetchOrders(): Promise<ApiResponse<Order[]>> {
  try {
    return await api<ApiResponse<Order[]>>('/orders');
  } catch {
    return { success: true, data: mockOrders as Order[] };
  }
}

export async function fetchOrder(id: string): Promise<ApiResponse<Order>> {
  try {
    return await api<ApiResponse<Order>>(`/orders/${id}`);
  } catch {
    return {
      success: true,
      data: (mockOrders.find((item) => item.id === id) ??
        mockOrders[0]) as Order,
    };
  }
}

// Homepage
export async function fetchHomepage(): Promise<PublicHomepageData> {
  try {
    return await api<PublicHomepageData>('/app/public/homepage');
  } catch {
    return {
      services: [
        {
          tag: '01',
          icon: 'mdi:lightbulb-on-outline',
          title: '品牌策略',
          description:
            '从市场洞察到品牌定位，构建完整的品牌基因体系，让你的品牌在竞争中脱颖而出。',
          features: ['品牌定位', '视觉识别', '传播策略', '竞品分析'],
        },
        {
          tag: '02',
          icon: 'mdi:robot-outline',
          title: 'AI创意设计',
          description:
            'GPT-image2驱动的视觉内容生产，从海报到社交媒体素材，AI赋能创意无限。',
          features: ['AI生图', '模板定制', '批量生产', '风格迁移'],
        },
        {
          tag: '03',
          icon: 'mdi:video-outline',
          title: '视频制作',
          description:
            '从创意脚本到后期成片，全流程视频制作服务，打造品牌视觉故事。',
          features: ['创意脚本', '拍摄制作', '后期剪辑', '3D动画'],
        },
        {
          tag: '04',
          icon: 'mdi:chart-line',
          title: '数字营销',
          description: '数据驱动的精准投放与优化，让每一分预算都花在刀刃上。',
          features: ['SEM/SEO', '信息流投放', '数据分析', 'A/B测试'],
        },
      ],
      dailyPrompts: [
        {
          prompt: '赛博朋克风格的咖啡品牌Logo，霓虹灯管效果，深色背景',
          label: '品牌Logo',
        },
        {
          prompt: '极简主义护肤品海报，白色大理石纹理背景，产品居中悬浮',
          label: '产品海报',
        },
        {
          prompt: '科技公司年度峰会主视觉，粒子流线汇聚成品牌标志',
          label: '活动主视觉',
        },
      ],
      stats: [
        { number: '300+', label: '服务客户' },
        { number: '5000+', label: 'AI生成作品' },
        { number: '98%', label: '客户满意度' },
        { number: '8年', label: '行业经验' },
      ],
      carouselItems: [
        {
          id: 1,
          imageUrl: '/images/fede/01-project-airbag.jpg',
          title: 'Airbag',
          description: '案例项目 · 品牌视觉',
        },
        {
          id: 2,
          imageUrl: '/images/fede/02-project-darko-2.jpg',
          title: 'Darko',
          description: '案例项目 · 品牌视觉',
        },
        {
          id: 3,
          imageUrl: '/images/fede/03-project-things.jpg',
          title: 'Things',
          description: '案例项目 · 空间视觉',
        },
        {
          id: 4,
          imageUrl: '/images/fede/04-project-unisve-2.jpg',
          title: 'Unisve',
          description: '案例项目 · 空间设计',
        },
        {
          id: 5,
          imageUrl: '/images/fede/05-project-abbracci-musicali-3.jpg',
          title: 'Abbracci Musicali',
          description: '案例项目 · 品牌视觉',
        },
        {
          id: 6,
          imageUrl: '/images/fede/06-project-cme.jpg',
          title: 'CME',
          description: '案例项目 · 商业视觉',
        },
        {
          id: 7,
          imageUrl: '/images/fede/07-project-raccagni.jpg',
          title: 'Raccagni',
          description: '案例项目 · 品牌设计',
        },
        {
          id: 8,
          imageUrl: '/images/fede/08-project-postop.jpg',
          title: 'Postop',
          description: '案例项目 · 艺术视觉',
        },
      ],
      featuredPortfolios: [],
    };
  }
}
