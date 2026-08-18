import { useRequest } from '@abp/request';

// ========== Types ==========

export interface BlobContainerPolicyDto {
  id: string;
  name: string;
  provider?: null | string;
  /** 单文件大小上限（MB）；null=回退系统设置 */
  maxFileSizeMb?: null | number;
  /** 允许的文件扩展名（逗号分隔）；null=回退系统设置 */
  allowedExtensions?: null | string;
  /** 是否已配置任意容器策略项 */
  hasPolicy: boolean;
  concurrencyStamp: string;
}

export interface UpdateBlobContainerPolicyInput {
  /** 单文件大小上限（MB），null/0 = 清除并回退系统设置 */
  maxFileSizeMb?: null | number;
  /** 允许的文件扩展名（逗号分隔），null/空 = 清除并回退系统设置 */
  allowedExtensions?: null | string;
  /** 并发戳（乐观并发控制） */
  concurrencyStamp: string;
}

// ========== API ==========

const BASE_URL = '/api/app/blob-container-policy';

export function useBlobContainerPolicyApi() {
  const { cancel, request } = useRequest();

  /** 列出全部 BLOB 容器及其策略 */
  const getList = () =>
    request<{ items: BlobContainerPolicyDto[] }>(BASE_URL, { method: 'GET' });

  /** 更新指定容器策略（null 项回退系统默认） */
  const update = (id: string, input: UpdateBlobContainerPolicyInput) =>
    request<BlobContainerPolicyDto>(`${BASE_URL}/${id}`, {
      data: input,
      method: 'PUT',
    });

  /** 清除指定容器的全部策略项（完全回退系统默认） */
  const clear = (id: string) =>
    request<BlobContainerPolicyDto>(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    });

  return { cancel, getList, update, clear };
}
