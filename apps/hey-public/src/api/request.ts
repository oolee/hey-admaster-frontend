/* =====================================================
   Hey 19 V2 · API 请求层
   通过 Vite proxy 转发到 7188 真实后端 (/api，路径不带 v2)
   自动附加 Authorization: Bearer <token>（从 localStorage 读取）
   统一响应包裹：{ code, data, message }
   ===================================================== */

const BASE = '/api';

function getToken(): string {
  return localStorage.getItem('hey19-v2-token') || '';
}

export interface RequestOptions {
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
  body?: unknown;
  headers?: Record<string, string>;
  failRate?: number;
  latency?: number;
  /** 请求超时（毫秒），默认 0=不超时 */
  timeoutMs?: number;
}

export interface PaginateOptions {
  page?: number;
  pageSize?: number;
  category?: string;
  keyword?: string;
}

export interface Paginated<T> {
  list: T[];
  total: number;
}

async function request<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    failRate = 0,
    latency = 0,
  } = options;
  await new Promise((r) => setTimeout(r, latency));
  if (Math.random() < failRate) {
    throw new Error('网络开小差了，请稍后重试');
  }
  const token = getToken();
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
  try {
    const ctrl = new AbortController();
    const timer =
      options.timeoutMs && options.timeoutMs > 0
        ? setTimeout(() => ctrl.abort(), options.timeoutMs)
        : null;
    try {
      const res = await fetch(BASE + url, {
        method,
        headers: mergedHeaders,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试', { cause: error });
    }
    throw new Error(error instanceof Error ? error.message : '请求失败', {
      cause: error,
    });
  }
}

export const mockRequest = request;
export { request };

export function paginate<T>(
  list: T[],
  options: PaginateOptions = {},
): Paginated<T> {
  const { page = 1, pageSize = 9, category = '全部', keyword = '' } = options;
  let result = list;
  if (category && category !== '全部') {
    result = result.filter(
      (item) => (item as { category?: string }).category === category,
    );
  }
  if (keyword) {
    const kw = keyword.toLowerCase();
    result = result.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(kw),
    );
  }
  const start = (page - 1) * pageSize;
  return {
    list: result.slice(start, start + pageSize),
    total: result.length,
  };
}
