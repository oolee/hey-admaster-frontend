interface LogExceptionDto {
  class?: string;
  depth?: number;
  helpUrl?: string;
  hResult?: number;
  message?: string;
  source?: string;
  stackTrace?: string;
}

interface LogFieldDto {
  actionId?: string;
  actionName?: string;
  application?: string;
  clientId?: string;
  connectionId?: string;
  context?: string;
  correlationId?: string;
  environment?: string;
  id: string;
  machineName?: string;
  processId?: number;
  requestId?: string;
  requestPath?: string;
  threadId?: number;
  userId?: string;
}

enum LogLevel {
  Trace = 0,
  Debug = 1,
  Information = 2,
  Warning = 3,
  Error = 4,
  Critical = 5,
  None = 6,
}

interface LogDto {
  exceptions: LogExceptionDto[];
  fields: LogFieldDto;
  level: LogLevel;
  message: string;
  timeStamp: Date;
}

interface LogGetListInput {
  application?: string;
  context?: string;
  correlationId?: string;
  endTime?: Date;
  environment?: string;
  hasException?: boolean;
  level?: LogLevel;
  machineName?: string;
  processId?: number;
  requestId?: string;
  requestPath?: string;
  startTime?: Date;
  threadId?: number;
}

export type { LogDto, LogExceptionDto, LogFieldDto, LogGetListInput };

export { LogLevel };
