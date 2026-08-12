import { defineEventHandler, getQuery } from 'h3';
import { templates } from '~/utils/v2-mock-data';

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const cats = [
    '全部',
    '门头店招',
    'VI 设计',
    '印刷物料',
    '室内设计',
    '社媒内容',
  ];
  const cat = String(query.category || '全部');
  const list =
    cat === '全部' ? templates : templates.filter((t) => t.cat === cat);
  return { code: 0, data: { categories: cats, list }, message: 'ok' };
});
