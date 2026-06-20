import type { EntityDto, PagedAndSortedResultRequestDto } from '@abp/core';

import type { UserNotificationDto } from './my-notifilers';

export enum NotificationSendState {
  None = 0,
  Disabled = 1,
  Sent = 2,
  Failed = 3,
}

interface NotificationSendRecordDto extends EntityDto<string> {
  notification: UserNotificationDto;
  provider: string;
  reason?: string;
  sendTime: Date;
  state: NotificationSendState;
  userId: string;
  userName: string;
}

interface NotificationSendRecordGetPagedListInput extends PagedAndSortedResultRequestDto {
  beginSendTime?: Date;
  endSendTime?: Date;
  notificationName?: string;
  provider?: string;
  state?: NotificationSendState;
  userId?: string;
}

export type {
  NotificationSendRecordDto,
  NotificationSendRecordGetPagedListInput,
};
