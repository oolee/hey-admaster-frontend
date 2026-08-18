import { useRequest } from '@abp/request';

const BASE_URL = '/api/docs';

export interface DocsNodeDto {
  type: 'dir' | 'file';
  name: string;
  path: string;
  children?: DocsNodeDto[];
}

export interface DocsContentDto {
  path: string;
  title: string;
  content: string;
  html: string;
}

export function useDocsApi() {
  const { request } = useRequest();

  const getTree = () =>
    request<DocsNodeDto[]>(`${BASE_URL}/tree`, { method: 'GET' });

  const getContent = (path: string) =>
    request<DocsContentDto>(`${BASE_URL}/content?path=${encodeURIComponent(path)}`, {
      method: 'GET',
    });

  const saveContent = (path: string, content: string) =>
    request<void>(`${BASE_URL}/content`, {
      method: 'PUT',
      data: { path, content },
    });

  const move = (source: string, target: string) =>
    request<void>(`${BASE_URL}/move`, {
      method: 'POST',
      data: { source, target },
    });

  return { getTree, getContent, saveContent, move };
}
