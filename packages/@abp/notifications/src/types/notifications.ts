import type { Dictionary } from '@abp/core';

export enum NotificationLifetime {
  Persistent = 0,
  OnlyOne = 1,
}

export enum NotificationType {
  Application = 0,
  System = 10,
  User = 20,
  ServiceCallback = 30,
}

export enum NotificationContentType {
  Text = 0,
  Html = 1,
  Markdown = 2,
  Json = 3,
}

export enum NotificationSeverity {
  Success = 0,
  Info = 10,
  Warn = 20,
  Error = 30,
  Fatal = 40,
}

export enum NotificationReadState {
  Read = 0,
  UnRead = 1,
}

interface NotificationData {
  extraProperties: { [key: string]: any };
  type: string;
}

interface UserIdentifier {
  userId: string;
  userName?: string;
}

interface NotificationSendInput {
  /** 当前文化（模板渲染时需要） */
  culture?: string;
  /** 通知数据 */
  data: Dictionary<string, any>;
  /** 通知（模板通知时为模板名称）名称 */
  name: string;
  /** 紧急程度 */
  severity?: NotificationSeverity;
  /** 接收人列表 */
  toUsers?: UserIdentifier[];
}

type NotificationTemplateSendInput = NotificationSendInput;

interface NotificationInfo {
  /** 内容类型 */
  contentType: NotificationContentType;
  /** 创建时间 */
  creationTime: Date;
  /** 数据 */
  data: NotificationData;
  /** Id */
  id: string;
  /** 生命周期 */
  lifetime: NotificationLifetime;
  /** 名称 */
  name: string;
  /** 紧急程度 */
  severity: NotificationSeverity;
  /** 类型 */
  type: NotificationType;
}

interface Notification {
  [key: string]: any;
  contentType: NotificationContentType;
  creationTime: Date;
  data: Record<string, any>;
  description?: string;
  lifetime: NotificationLifetime;
  message: string;
  name: string;
  severity: NotificationSeverity;
  title: string;
  type: NotificationType;
}

export type {
  Notification,
  NotificationData,
  NotificationInfo,
  NotificationSendInput,
  NotificationTemplateSendInput,
};
