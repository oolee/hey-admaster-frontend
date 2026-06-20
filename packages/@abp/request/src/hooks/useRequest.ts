import type { AxiosRequestConfig } from 'axios';

import { requestClient } from '../index';

type HttpMethod =
  | 'CONNECT'
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'OPTIONS'
  | 'PATCH'
  | 'POST'
  | 'PURGE'
  | 'PUT'
  | 'TRACE';

interface RequestConfig extends AxiosRequestConfig {
  method: HttpMethod;
}

export function useRequest() {
  const controllers = new Set<AbortController>();

  async function request<T>(url: string, config: RequestConfig): Promise<T> {
    const controller = new AbortController();
    controllers.add(controller);
    try {
      return await requestClient.request<T>(url, {
        ...config,
        signal: controller.signal,
      });
    } finally {
      controllers.delete(controller);
    }
  }

  function cancel(message?: string) {
    controllers.forEach((controller) => controller.abort(message));
    controllers.clear();
  }

  return {
    cancel,
    request,
  };
}
