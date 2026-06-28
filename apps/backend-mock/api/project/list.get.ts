import { defineEventHandler } from 'h3';

import { listProjects } from '../../utils/storage';

export default defineEventHandler(() => {
  return {
    code: 0,
    message: 'ok',
    data: listProjects().map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  };
});
