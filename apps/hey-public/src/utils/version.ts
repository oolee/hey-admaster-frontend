import type { CanvasSnapshot } from '@/types/canvas';

/* =====================================================
   画布版本历史（IndexedDB 多版本快照）
   ===================================================== */
import { idbDelete, idbLoad, idbSave } from './idb';

const KEY_VERSIONS = 'versions-list';
const KEY_SNAPSHOT = (id: string) => `snapshot-${id}`;

export interface VersionEntry {
  id: string;
  label: string;
  savedAt: number;
  nodeCount: number;
  edgeCount: number;
}

let _versionsCache: null | VersionEntry[] = null;

export async function listVersions(): Promise<VersionEntry[]> {
  const list = await idbLoad<VersionEntry[]>(KEY_VERSIONS);
  return list || [];
}

export async function saveVersion(
  label: string,
  snapshot: CanvasSnapshot,
): Promise<VersionEntry> {
  const versions = await listVersions();
  const id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entry: VersionEntry = {
    id,
    label: label || `版本 ${versions.length + 1}`,
    savedAt: Date.now(),
    nodeCount: snapshot.nodes?.length || 0,
    edgeCount: snapshot.edges?.length || 0,
  };
  await idbSave(KEY_SNAPSHOT(id), snapshot);
  versions.unshift(entry);
  // 保留最近 30 个版本
  const trimmed = versions.slice(0, 30);
  await idbSave(KEY_VERSIONS, trimmed);
  // 删除溢出版本
  if (versions.length > 30) {
    for (const v of versions.slice(30)) {
      await idbDelete(KEY_SNAPSHOT(v.id));
    }
  }
  _versionsCache = trimmed;
  return entry;
}

export async function loadVersionSnapshot(
  id: string,
): Promise<CanvasSnapshot | null> {
  return await idbLoad<CanvasSnapshot>(KEY_SNAPSHOT(id));
}

export async function deleteVersion(id: string): Promise<VersionEntry[]> {
  const versions = await listVersions();
  const next = versions.filter((v) => v.id !== id);
  await idbSave(KEY_VERSIONS, next);
  await idbDelete(KEY_SNAPSHOT(id));
  _versionsCache = next;
  return next;
}

export async function clearAllVersions(): Promise<void> {
  const versions = await listVersions();
  await idbSave(KEY_VERSIONS, []);
  for (const v of versions) {
    await idbDelete(KEY_SNAPSHOT(v.id));
  }
  _versionsCache = [];
}
