import type {
  Dictionary,
  ExtensibleAuditedEntityDto,
  PagedAndSortedResultRequestDto,
} from '@abp/core';

interface OpenIddictAuthorizationDto extends ExtensibleAuditedEntityDto<string> {
  applicationId?: string;
  creationDate?: string;
  isStatic?: boolean;
  properties?: Dictionary<string, string>;
  required?: boolean;
  scopes?: string[];
  status?: string;
  subject?: string;
  type?: string;
}

interface OpenIddictAuthorizationGetListInput extends PagedAndSortedResultRequestDto {
  beginCreationTime?: string;
  clientId?: string;
  endCreationTime?: string;
  filter?: string;
  status?: string;
  subject?: string;
  type?: string;
}

export type { OpenIddictAuthorizationDto, OpenIddictAuthorizationGetListInput };
