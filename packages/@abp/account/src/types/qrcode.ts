export enum QrCodeStatus {
  /** 无效 */
  Invalid = -1,
  /** 创建 */
  Created = 0,
  /** 已扫描 */
  Scaned = 5,
  /** 已确认 */
  Confirmed = 10,
}

interface GenerateQrCodeResult {
  key: string;
}

interface QrCodeInfoResult {
  key: string;
  status: QrCodeStatus;
}

interface QrCodeUserInfoResult extends QrCodeInfoResult {
  picture?: string;
  tenantId?: string;
  userId?: string;
  userName?: string;
}

export type { GenerateQrCodeResult, QrCodeUserInfoResult };
