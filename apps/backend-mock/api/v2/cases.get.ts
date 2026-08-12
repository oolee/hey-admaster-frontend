import { defineEventHandler, getQuery } from 'h3';
import { cases } from '~/utils/v2-mock-data';

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const page = Number(query.page) || 1;
  const pageSize = Number(query.pageSize) || 9;
  const category = String(query.category || '全部');
  const keyword = String(query.keyword || '').toLowerCase();

  let list = cases;
  if (category && category !== '全部') {
    list = list.filter((c) => c.category === category);
  }
  if (keyword) {
    list = list.filter((c) =>
      [c.title, c.category, c.industry, ...(c.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }
  const total = list.length;
  const start = (page - 1) * pageSize;
  const items = list.slice(start, start + pageSize);
  return {
    code: 0,
    data: {
      list: items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    message: 'ok',
  };
});
