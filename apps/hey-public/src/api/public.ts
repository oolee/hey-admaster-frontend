import type { PublicHomepageData } from '#/types/api';

import { api } from '#/utils/api';

export async function fetchHomepageData(): Promise<PublicHomepageData> {
  return api<PublicHomepageData>('/app/public/homepage');
}
