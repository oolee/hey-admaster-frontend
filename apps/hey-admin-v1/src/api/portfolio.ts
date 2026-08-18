import type { PagedResultDto } from '@abp/core';

import { useRequest } from '@abp/request';

// ========== Permissions ==========

export const PortfolioPermissions = {
  Default: 'AdMaster.Portfolio',
  Create: 'AdMaster.Portfolio.Create',
  Edit: 'AdMaster.Portfolio.Edit',
  Delete: 'AdMaster.Portfolio.Delete',
} as const;

// ========== Types ==========

export interface UploadImageResultDto {
  blobName: string;
}

export interface PortfolioItemAdminDto {
  id: string;
  title: string;
  category: string;
  description: string;
  /** 富文本 HTML 内容 */
  content: string;
  tags: string;
  client?: string;
  year: number;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateUpdatePortfolioItemDto {
  title: string;
  category: string;
  description: string;
  /** 富文本 HTML 内容 */
  content: string;
  tags: string;
  client?: string;
  year: number;
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface GetPortfolioItemListInput {
  filter?: string;
  category?: string;
  isFeatured?: boolean;
  sorting?: string;
  skipCount?: number;
  maxResultCount?: number;
}

export interface PortfolioImageDto {
  id: string;
  portfolioItemId: string;
  caption?: string;
  sortOrder: number;
}

export interface CreateUpdatePortfolioImageDto {
  portfolioItemId: string;
  caption?: string;
  sortOrder: number;
  /** 上传配图时返回的临时 BlobName，创建配图时移动到正式路径 */
  tempBlobName?: string;
}

// ========== API ==========

const BASE_URL = '/api/admaster/portfolio';

function uploadFileRequest(
  request: ReturnType<typeof useRequest>['request'],
  url: string,
  file: File,
  extraData?: Record<string, any>,
) {
  const formData = new FormData();
  formData.append('file', file);
  if (extraData) {
    for (const [key, value] of Object.entries(extraData)) {
      formData.append(key, String(value));
    }
  }
  return request<UploadImageResultDto>(url, {
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
    method: 'POST',
  });
}

export function usePortfolioApi() {
  const { cancel, request } = useRequest();

  // ========== Upload ==========

  /** 上传封面图 */
  const uploadCover = (file: File) =>
    uploadFileRequest(request, `${BASE_URL}/upload-cover`, file);

  /** 上传配图（保存到临时路径，调用 addImage 时移动到正式路径） */
  const uploadGalleryImage = (file: File) =>
    uploadFileRequest(request, `${BASE_URL}/upload-gallery`, file);

  /** 上传富文本内嵌图片 */
  const uploadContentImage = (portfolioItemId: string, file: File) =>
    uploadFileRequest(request, `${BASE_URL}/upload-content-image`, file, {
      portfolioItemId,
    });

  /** 将封面从临时路径移动到正式路径 */
  const updateCover = (portfolioItemId: string, tempBlobName: string) =>
    request(`${BASE_URL}/items/${portfolioItemId}/cover`, {
      data: tempBlobName,
      method: 'PUT',
    });

  // ========== Portfolio Items ==========

  const getList = (input?: GetPortfolioItemListInput) =>
    request<PagedResultDto<PortfolioItemAdminDto>>(`${BASE_URL}/items`, {
      method: 'GET',
      params: input,
    });

  const get = (id: string) =>
    request<PortfolioItemAdminDto>(`${BASE_URL}/items/${id}`, {
      method: 'GET',
    });

  const create = (input: CreateUpdatePortfolioItemDto) =>
    request<PortfolioItemAdminDto>(`${BASE_URL}/items`, {
      data: input,
      method: 'POST',
    });

  const update = (id: string, input: CreateUpdatePortfolioItemDto) =>
    request<PortfolioItemAdminDto>(`${BASE_URL}/items/${id}`, {
      data: input,
      method: 'PUT',
    });

  const remove = (id: string) =>
    request(`${BASE_URL}/items/${id}`, {
      method: 'DELETE',
    });

  const updateIsActive = (id: string, isActive: boolean) =>
    request(`${BASE_URL}/items/${id}/is-active`, {
      data: isActive,
      method: 'PATCH',
    });

  // ========== Portfolio Images ==========

  const addImage = (input: CreateUpdatePortfolioImageDto) =>
    request<PortfolioImageDto>(`${BASE_URL}/images`, {
      data: input,
      method: 'POST',
    });

  const updateImage = (id: string, input: CreateUpdatePortfolioImageDto) =>
    request<PortfolioImageDto>(`${BASE_URL}/images/${id}`, {
      data: input,
      method: 'PUT',
    });

  const deleteImage = (id: string) =>
    request(`${BASE_URL}/images/${id}`, {
      method: 'DELETE',
    });

  const getImages = (portfolioItemId: string) =>
    request<{ items: PortfolioImageDto[] }>(
      `${BASE_URL}/items/${portfolioItemId}/images`,
      { method: 'GET' },
    );

  return {
    cancel,
    // Upload
    uploadCover,
    uploadGalleryImage,
    uploadContentImage,
    updateCover,
    // Items
    getList,
    get,
    create,
    update,
    remove,
    updateIsActive,
    // Images
    addImage,
    updateImage,
    deleteImage,
    getImages,
  };
}

/** 临时图片 URL（upload-cover 返回的 BlobName，管理后台预览用） */
export function getBlobImageUrl(blobName: string): string {
  return `/api/app/public/portfolio/image/temp/${blobName}`;
}

/** 封面图 URL 生成 */
export function getCoverImageUrl(itemId: string): string {
  return `/api/app/public/portfolio/${itemId}/cover`;
}

/** 配图 URL 生成 */
export function getGalleryImageUrl(
  portfolioItemId: string,
  imageId: string,
): string {
  return `/api/app/public/portfolio/${portfolioItemId}/gallery/${imageId}`;
}

/** 富文本内嵌图片 URL 生成 */
export function getContentImageUrl(
  portfolioItemId: string,
  blobName: string,
): string {
  return `/api/app/public/portfolio/${portfolioItemId}/content/${blobName}`;
}
