import { del, get, post } from './request';

export interface ProjectItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}

// 获取项目列表（从云端）
export function listProjects() {
  return get<ProjectItem[]>('/api/project/list');
}

// 保存项目（到云端）
export function saveProject(payload: {
  currentPageId?: string;
  id?: string;
  name: string;
  pages: unknown[];
}) {
  return post<{ id: string }>('/api/project/save', payload);
}

// 删除项目
export function deleteProject(id: string) {
  return del<{ success: boolean }>(`/api/project/${id}`);
}

// 导出为 JSON 文件（纯前端，不依赖后端）
export function exportProjectAsJson(project: {
  currentPageId: string;
  name: string;
  pages: unknown[];
}): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name || 'invitation'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 从 JSON 文件导入（纯前端）
// export function importProjectFromFile(file: File): Promise<unknown> {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.addEventListener('load', (e) => {
//       try {
//         const data = JSON.parse(e.target?.result as string);
//         resolve(data);
//       } catch (error) {
//         reject(error);
//       }
//     });
//     reader.addEventListener('error', () => reject(reader.error));
//     reader.readAsText(file);
//   });
// }
export function importProjectFromFile(file: File): Promise<unknown> {
  return file.text().then((text) => JSON.parse(text));
}
