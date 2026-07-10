import type {
  ExtensibleAuditedEntityDto,
  IHasConcurrencyStamp,
  PagedAndSortedResultRequestDto,
} from '@abp/core';

enum JobStatus {
  None = -1,
  Completed = 0,
  Queuing = 5,
  Running = 10,
  FailedRetry = 15,
  Paused = 20,
  Stopped = 30,
}

enum JobType {
  Once = 0,
  Period = 1,
  Persistent = 2,
}

enum JobPriority {
  Low = 5,
  BelowNormal = 10,
  Normal = 15,
  AboveNormal = 20,
  High = 25,
}

enum JobSource {
  None = -1,
  User = 0,
  System = 10,
}

interface BackgroundJobInfoDto
  extends ExtensibleAuditedEntityDto<string>, IHasConcurrencyStamp {
  args: Record<string, any>;
  beginTime: string;
  cron?: string;
  description?: string;
  endTime?: string;
  group: string;
  interval: number;
  isAbandoned: boolean;
  isEnabled: boolean;
  jobType: JobType;
  lastRunTime?: string;
  lockTimeOut: number;
  maxCount: number;
  maxTryCount: number;
  name: string;
  nextRunTime?: string;
  priority: JobPriority;
  result?: string;
  source: JobSource;
  status: JobStatus;
  triggerCount: number;
  tryCount: number;
  type: string;
}

interface BackgroundJobInfoCreateOrUpdateDto {
  args: Record<string, any>;
  cron?: string;
  description?: string;
  interval: number;
  isEnabled: boolean;
  jobType: JobType;
  lockTimeOut: number;
  maxCount: number;
  maxTryCount: number;
  priority: JobPriority;
}

interface BackgroundJobInfoCreateDto extends BackgroundJobInfoCreateOrUpdateDto {
  beginTime: string;
  endTime?: string;
  group: string;
  name: string;
  nodeName?: string;
  source: JobSource;
  type: string;
}

interface BackgroundJobInfoUpdateDto
  extends BackgroundJobInfoCreateOrUpdateDto, IHasConcurrencyStamp {}

interface BackgroundJobInfoGetListInput extends PagedAndSortedResultRequestDto {
  beginCreationTime?: Date;
  beginLastRunTime?: Date;
  beginTime?: Date;
  endCreationTime?: Date;
  endLastRunTime?: Date;
  endTime?: Date;
  filter?: string;
  group?: string;
  isAbandoned?: boolean;
  jobType?: JobType;
  name?: string;
  priority?: JobPriority;
  source?: JobSource;
  status?: JobStatus;
  type?: string;
}

interface BackgroundJobInfoBatchInput {
  jobIds: string[];
}

interface BackgroundJobParamterDto {
  description?: string;
  displayName: string;
  name: string;
  required: boolean;
}

interface BackgroundJobDefinitionDto {
  description?: string;
  displayName: string;
  name: string;
  paramters: BackgroundJobParamterDto[];
}

export { JobPriority, JobSource, JobStatus, JobType };

export type {
  BackgroundJobDefinitionDto,
  BackgroundJobInfoBatchInput,
  BackgroundJobInfoCreateDto,
  BackgroundJobInfoDto,
  BackgroundJobInfoGetListInput,
  BackgroundJobInfoUpdateDto,
  BackgroundJobParamterDto,
};
