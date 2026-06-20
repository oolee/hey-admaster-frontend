import { get } from './request';

export interface TemplateItem {
  id: string;
  name: string;
  preview: string;
  pages: unknown[];
}

export function listTemplates() {
  return get<TemplateItem[]>('/api/template/list');
}
