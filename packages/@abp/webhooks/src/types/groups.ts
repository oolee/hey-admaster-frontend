import type { IHasConcurrencyStamp, IHasExtraProperties } from '@abp/core';
import type { WebhookDefinitionDto } from './definitions';

interface WebhookGroupDefinitionDto extends IHasExtraProperties {
  displayName: string;
  isStatic: boolean;
  name: string;
  /** 子网格数据（表格树形展开用） */
  items?: WebhookDefinitionDto[];
}

interface WebhookGroupDefinitionCreateOrUpdateDto extends IHasExtraProperties {
  displayName: string;
}

interface WebhookGroupDefinitionCreateDto extends WebhookGroupDefinitionCreateOrUpdateDto {
  name: string;
}

interface WebhookGroupDefinitionUpdateDto
  extends IHasConcurrencyStamp, WebhookGroupDefinitionCreateOrUpdateDto {}

interface WebhookGroupDefinitionGetListInput {
  filter?: string;
}

export type {
  WebhookGroupDefinitionCreateDto,
  WebhookGroupDefinitionDto,
  WebhookGroupDefinitionGetListInput,
  WebhookGroupDefinitionUpdateDto,
};
