import type { PagedResultDto } from '@abp/core';

import { useRequest } from '@abp/request';

// ========== Permissions ==========

export const PublicHomepagePermissions = {
  Default: 'AdMaster.PublicHomepage',
  Create: 'AdMaster.PublicHomepage.Create',
  Edit: 'AdMaster.PublicHomepage.Edit',
  Delete: 'AdMaster.PublicHomepage.Delete',
} as const;

// ========== Types ==========

export interface UploadImageResultDto {
  blobName: string;
}

export interface CarouselItemAdminDto {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateUpdateCarouselItemDto {
  /** 上传图片时返回的临时 BlobName */
  tempBlobName?: string;
  title: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface GetCarouselItemListInput {
  filter?: string;
  sorting?: string;
  skipCount?: number;
  maxResultCount?: number;
}

export interface ServiceItemAdminDto {
  id: string;
  tag: string;
  icon: string;
  title: string;
  description: string;
  features: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateUpdateServiceItemDto {
  tag: string;
  icon: string;
  title: string;
  description: string;
  features: string;
  sortOrder: number;
  isActive: boolean;
}

export interface GetServiceItemListInput {
  filter?: string;
  sorting?: string;
  skipCount?: number;
  maxResultCount?: number;
}

export interface DailyPromptAdminDto {
  id: string;
  prompt: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateUpdateDailyPromptDto {
  prompt: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

export interface GetDailyPromptListInput {
  filter?: string;
  sorting?: string;
  skipCount?: number;
  maxResultCount?: number;
}

export interface StatItemAdminDto {
  id: string;
  number: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateUpdateStatItemDto {
  number: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

export interface GetStatItemListInput {
  filter?: string;
  sorting?: string;
  skipCount?: number;
  maxResultCount?: number;
}

// ========== Upload API（共享） ==========

function uploadImageRequest(
  request: ReturnType<typeof useRequest>['request'],
  file: File,
) {
  return request<UploadImageResultDto>(
    '/api/admaster/public-homepage/upload-image',
    {
      data: { file },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      method: 'POST',
    },
  );
}

function updateIsActiveRequest(
  request: ReturnType<typeof useRequest>['request'],
  baseUrl: string,
  id: string,
  isActive: boolean,
) {
  return request(`/api/admaster/public-homepage/${baseUrl}/${id}/is-active`, {
    data: isActive,
    method: 'PATCH',
  });
}

// ========== Carousel API ==========

/** 轮播图正式图片 URL（通过 Provider 按 ID 读取 {id:N}/{pictureName}） */
export function getCarouselImageUrl(id: string): string {
  return `/api/app/public/homepage/image/carousel/${id.replaceAll('-', '')}`;
}

/** 临时图片 URL（upload-image 返回的 BlobName） */
export function getBlobImageUrl(blobName: string): string {
  return `/api/app/public/homepage/image/temp/${blobName}`;
}

export function useCarouselApi() {
  const { cancel, request } = useRequest();

  const baseUrl = 'carousel-items';

  const uploadImage = (file: File) => uploadImageRequest(request, file);

  const updateIsActive = (id: string, isActive: boolean) =>
    updateIsActiveRequest(request, baseUrl, id, isActive);

  const getList = (input?: GetCarouselItemListInput) =>
    request<PagedResultDto<CarouselItemAdminDto>>(
      `/api/admaster/public-homepage/${baseUrl}`,
      { method: 'GET', params: input },
    );

  const get = (id: string) =>
    request<CarouselItemAdminDto>(
      `/api/admaster/public-homepage/${baseUrl}/${id}`,
      { method: 'GET' },
    );

  const create = (input: CreateUpdateCarouselItemDto) =>
    request<CarouselItemAdminDto>(`/api/admaster/public-homepage/${baseUrl}`, {
      data: input,
      method: 'POST',
    });

  const update = (id: string, input: CreateUpdateCarouselItemDto) =>
    request<CarouselItemAdminDto>(
      `/api/admaster/public-homepage/${baseUrl}/${id}`,
      { data: input, method: 'PUT' },
    );

  const remove = (id: string) =>
    request(`/api/admaster/public-homepage/${baseUrl}/${id}`, {
      method: 'DELETE',
    });

  return {
    cancel,
    getList,
    get,
    create,
    update,
    remove,
    uploadImage,
    updateIsActive,
  };
}

// ========== Service API ==========

export function useServiceApi() {
  const { cancel, request } = useRequest();

  const baseUrl = 'service-items';

  const updateIsActive = (id: string, isActive: boolean) =>
    updateIsActiveRequest(request, baseUrl, id, isActive);

  const getList = (input?: GetServiceItemListInput) =>
    request<PagedResultDto<ServiceItemAdminDto>>(
      `/api/admaster/public-homepage/${baseUrl}`,
      { method: 'GET', params: input },
    );

  const get = (id: string) =>
    request<ServiceItemAdminDto>(
      `/api/admaster/public-homepage/${baseUrl}/${id}`,
      { method: 'GET' },
    );

  const create = (input: CreateUpdateServiceItemDto) =>
    request<ServiceItemAdminDto>(`/api/admaster/public-homepage/${baseUrl}`, {
      data: input,
      method: 'POST',
    });

  const update = (id: string, input: CreateUpdateServiceItemDto) =>
    request<ServiceItemAdminDto>(
      `/api/admaster/public-homepage/${baseUrl}/${id}`,
      { data: input, method: 'PUT' },
    );

  const remove = (id: string) =>
    request(`/api/admaster/public-homepage/${baseUrl}/${id}`, {
      method: 'DELETE',
    });

  return { cancel, getList, get, create, update, remove, updateIsActive };
}

// ========== DailyPrompt API ==========

export function useDailyPromptApi() {
  const { cancel, request } = useRequest();

  const baseUrl = 'daily-prompts';

  const updateIsActive = (id: string, isActive: boolean) =>
    updateIsActiveRequest(request, baseUrl, id, isActive);

  const getList = (input?: GetDailyPromptListInput) =>
    request<PagedResultDto<DailyPromptAdminDto>>(
      `/api/admaster/public-homepage/${baseUrl}`,
      { method: 'GET', params: input },
    );

  const get = (id: string) =>
    request<DailyPromptAdminDto>(
      `/api/admaster/public-homepage/${baseUrl}/${id}`,
      { method: 'GET' },
    );

  const create = (input: CreateUpdateDailyPromptDto) =>
    request<DailyPromptAdminDto>(`/api/admaster/public-homepage/${baseUrl}`, {
      data: input,
      method: 'POST',
    });

  const update = (id: string, input: CreateUpdateDailyPromptDto) =>
    request<DailyPromptAdminDto>(
      `/api/admaster/public-homepage/${baseUrl}/${id}`,
      { data: input, method: 'PUT' },
    );

  const remove = (id: string) =>
    request(`/api/admaster/public-homepage/${baseUrl}/${id}`, {
      method: 'DELETE',
    });

  return { cancel, getList, get, create, update, remove, updateIsActive };
}

// ========== Stat API ==========

export function useStatApi() {
  const { cancel, request } = useRequest();

  const baseUrl = 'stats';

  const updateIsActive = (id: string, isActive: boolean) =>
    updateIsActiveRequest(request, baseUrl, id, isActive);

  const getList = (input?: GetStatItemListInput) =>
    request<PagedResultDto<StatItemAdminDto>>(
      `/api/admaster/public-homepage/${baseUrl}`,
      { method: 'GET', params: input },
    );

  const get = (id: string) =>
    request<StatItemAdminDto>(
      `/api/admaster/public-homepage/${baseUrl}/${id}`,
      { method: 'GET' },
    );

  const create = (input: CreateUpdateStatItemDto) =>
    request<StatItemAdminDto>(`/api/admaster/public-homepage/${baseUrl}`, {
      data: input,
      method: 'POST',
    });

  const update = (id: string, input: CreateUpdateStatItemDto) =>
    request<StatItemAdminDto>(
      `/api/admaster/public-homepage/${baseUrl}/${id}`,
      { data: input, method: 'PUT' },
    );

  const remove = (id: string) =>
    request(`/api/admaster/public-homepage/${baseUrl}/${id}`, {
      method: 'DELETE',
    });

  return { cancel, getList, get, create, update, remove, updateIsActive };
}
