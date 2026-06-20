export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? '';

/**
 * 通用 fetch 封装
 * - 自动拼接 BASE_URL
 * - 自动解析 JSON 响应
 * - 统一错误处理
 */
export async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  // 附加 token（如果有）
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('auth_token') : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    // 网络错误：降级为 mock 模式（便于开发阶段不依赖真实后端）
    return {
      code: 0,
      message: 'mock mode (network unavailable)',
      data: null as unknown as T,
    };
  }

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    return {
      code: response.status,
      message: (data as any)?.message ?? response.statusText,
      data: data as T,
    };
  }

  // 如果后端已经返回 { code, message, data } 结构，直接透传；否则包裹
  if (data && typeof data === 'object' && 'code' in data) {
    return data as ApiResponse<T>;
  }

  return {
    code: 0,
    message: 'ok',
    data: data as T,
  };
}

export function get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const query = params
    ? '?' +
      Object.keys(params)
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
        .join('&')
    : '';
  return request<T>(`${path}${query}`, { method: 'GET' });
}

export function post<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function del<T = unknown>(path: string): Promise<ApiResponse<T>> {
  return request<T>(path, { method: 'DELETE' });
}
