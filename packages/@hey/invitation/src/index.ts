import type { DesignDocument } from '@hey/core';

import { createDefaultDocument } from '@hey/designer';

export interface InvitationTemplate {
  cover: string;
  document: DesignDocument;
  id: string;
  name: string;
  scene: 'birthday' | 'business' | 'opening' | 'wedding';
}

export const invitationTemplates: InvitationTemplate[] = [
  {
    id: 'wedding-rose',
    name: '玫瑰婚礼',
    scene: 'wedding',
    cover: 'rose',
    document: createDefaultDocument('玫瑰婚礼邀请函'),
  },
  {
    id: 'business-summit',
    name: '商务峰会',
    scene: 'business',
    cover: 'summit',
    document: createDefaultDocument('商务峰会邀请函'),
  },
  {
    id: 'opening-gold',
    name: '开业典礼',
    scene: 'opening',
    cover: 'gold',
    document: createDefaultDocument('开业典礼邀请函'),
  },
];

export function createInvitationDocument(
  templateId = 'wedding-rose',
): DesignDocument {
  return (
    invitationTemplates.find((item) => item.id === templateId)?.document ??
    createDefaultDocument()
  );
}
