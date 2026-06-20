import { ofetch } from 'ofetch'
import type { ApiResponse, GenerateResponse } from '#/types/api'
import type { GenerateRequest, AdTemplate } from '#/types/ai'
import type { Order, OrderRequest, PricingPackage } from '#/types/order'
import type { PortfolioItem } from '#/types/portfolio'
import { MOCK_BASE64_IMAGE, mockOrders, mockPortfolioItems, mockPricingPackages } from './mock-data'
import { AD_TEMPLATES, getTemplatesByCategory } from './templates'

export const api = ofetch.create({
  baseURL: '/api',
  timeout: 120000, // 增加到 120s，适应异步生图
  onResponseError({ response }) {
    console.error('[API Error]', response.status, response._data)
  },
})

// AI Generation
export async function generateImage(data: GenerateRequest): Promise<GenerateResponse> {
  try {
    return await api<GenerateResponse>('/ai/generate', {
      method: 'POST',
      body: data,
    })
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
    }
  }
}

// 查询异步生图任务结果
export async function queryTaskStatus(taskId: string): Promise<GenerateResponse> {
  try {
    return await api<GenerateResponse>(`/ai/generate/${taskId}`)
  } catch {
    return {
      success: true,
      data: [{ b64_json: MOCK_BASE64_IMAGE, revised_prompt: taskId, index: 0 }],
      isMock: true,
      status: 'succeeded',
    }
  }
}

// 获取广告行业模板
export async function fetchTemplates(): Promise<{ success: boolean; data: AdTemplate[]; categories: Record<string, AdTemplate[]> }> {
  try {
    return await api<{ success: boolean; data: AdTemplate[]; categories: Record<string, AdTemplate[]> }>('/ai/templates')
  } catch {
    return {
      success: true,
      data: AD_TEMPLATES,
      categories: getTemplatesByCategory(),
    }
  }
}

// Portfolio
export async function fetchPortfolio(): Promise<ApiResponse<PortfolioItem[]>> {
  try {
    return await api<ApiResponse<PortfolioItem[]>>('/portfolio')
  } catch {
    return {
      success: true,
      data: mockPortfolioItems.map((item) => ({ ...item, id: String(item.id) })) as PortfolioItem[],
    }
  }
}

// Pricing
export async function fetchPricing(): Promise<ApiResponse<PricingPackage[]>> {
  try {
    return await api<ApiResponse<PricingPackage[]>>('/pricing')
  } catch {
    return {
      success: true,
      data: mockPricingPackages as PricingPackage[],
    }
  }
}

// Orders
export async function createOrder(data: OrderRequest): Promise<ApiResponse<Order>> {
  try {
    return await api<ApiResponse<Order>>('/orders', {
      method: 'POST',
      body: data,
    })
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
    }
  }
}

export async function fetchOrders(): Promise<ApiResponse<Order[]>> {
  try {
    return await api<ApiResponse<Order[]>>('/orders')
  } catch {
    return { success: true, data: mockOrders as Order[] }
  }
}

export async function fetchOrder(id: string): Promise<ApiResponse<Order>> {
  try {
    return await api<ApiResponse<Order>>(`/orders/${id}`)
  } catch {
    return { success: true, data: (mockOrders.find((item) => item.id === id) ?? mockOrders[0]) as Order }
  }
}
