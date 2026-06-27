// 简单内存存储
interface ProjectRecord {
  id: string;
  name: string;
  pages: unknown[];
  currentPageId: string;
  createdAt: string;
  updatedAt: string;
}

const projects = new Map<string, ProjectRecord>();

export function listProjects(): ProjectRecord[] {
  return [...projects.values()].toSorted((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : -1,
  );
}

export function getProject(id: string): ProjectRecord | undefined {
  return projects.get(id);
}

export function saveProject(data: {
  currentPageId?: string;
  id?: string;
  name: string;
  pages: unknown[];
}): { created: boolean; id: string } {
  const now = new Date().toISOString();
  const id =
    data.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const existing = projects.get(id);
  const record: ProjectRecord = {
    id,
    name: data.name || '未命名请柬',
    pages: data.pages || [],
    currentPageId: data.currentPageId || '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  projects.set(id, record);
  return { id, created: !existing };
}

export function deleteProject(id: string): boolean {
  return projects.delete(id);
}
