<script setup>
import { onMounted, ref } from 'vue';

import { Eye, Heart, Pencil, Plus, Trash2 } from 'lucide-vue-next';

import ABadge from '#/components/admin/ABadge.vue';
import { toast } from '#/utils/toast';

const cases = ref([]);
onMounted(async () => {
  // 复用前台案例数据（简化版）
  cases.value = [
    {
      id: 1,
      title: '山野菜篮子 · 餐饮全案',
      category: '门头店招',
      industry: '餐饮连锁',
      views: 3280,
      likes: 486,
      status: 'published',
    },
    {
      id: 2,
      title: '构建商业 · 主视觉系统',
      category: 'VI 设计',
      industry: '科技互联网',
      views: 2465,
      likes: 392,
      status: 'published',
    },
    {
      id: 3,
      title: '潮玩品牌 · 社媒矩阵',
      category: '社媒内容',
      industry: '新消费',
      views: 1987,
      likes: 312,
      status: 'published',
    },
    {
      id: 4,
      title: '普者黑 · 旅游海报',
      category: '海报设计',
      industry: '文旅',
      views: 3120,
      likes: 428,
      status: 'published',
    },
    {
      id: 5,
      title: '少儿编程 · 招生传单',
      category: '印刷物料',
      industry: '教育',
      views: 1654,
      likes: 201,
      status: 'draft',
    },
    {
      id: 6,
      title: '草本护肤 · Logo 设计',
      category: 'Logo 设计',
      industry: '美妆',
      views: 2891,
      likes: 356,
      status: 'published',
    },
    {
      id: 7,
      title: '夏季音乐节 · 主视觉',
      category: '海报设计',
      industry: '活动',
      views: 3756,
      likes: 512,
      status: 'published',
    },
  ];
});
</script>

<template>
  <div class="pg">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">案例管理</h1>
        <p class="pg-sub">前台案例展示内容管理</p>
      </div>
      <AButton variant="primary"><Plus :size="15" /> 新建案例</AButton>
    </header>

    <div class="card table-card">
      <table class="tbl">
        <thead>
          <tr>
            <th>案例</th>
            <th>分类</th>
            <th>行业</th>
            <th>浏览</th>
            <th>点赞</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in cases" :key="c.id">
            <td class="strong">{{ c.title }}</td>
            <td>
              <ABadge tone="accent">{{ c.category }}</ABadge>
            </td>
            <td class="muted">{{ c.industry }}</td>
            <td class="num">{{ c.views.toLocaleString() }}</td>
            <td class="num like"><Heart :size="12" /> {{ c.likes }}</td>
            <td>
              <ABadge :tone="c.status === 'published' ? 'success' : 'warning'">
                {{ c.status === 'published' ? '已发布' : '草稿' }}
              </ABadge>
            </td>
            <td>
              <div class="row-actions">
                <button class="ra" title="预览"><Eye :size="14" /></button>
                <button class="ra" title="编辑"><Pencil :size="14" /></button>
                <button
                  class="ra danger"
                  title="删除"
                  @click="toast.info('演示：删除案例')"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.pg {
  max-width: 1240px;
  margin: 0 auto;
}

.pg-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
}

.pg-title {
  font-size: var(--text-2xl);
}

.pg-sub {
  margin-top: 4px;
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
}

.table-card {
  overflow-x: auto;
}

.tbl {
  width: 100%;
  font-size: var(--text-sm);
  border-collapse: collapse;
}

.tbl th {
  padding: 12px 16px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-3);
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--color-border);
}

.tbl td {
  padding: 12px 16px;
  color: var(--color-text-2);
  border-bottom: 1px dashed var(--color-border);
}

.tbl tr:last-child td {
  border-bottom: none;
}

.tbl tr:hover td {
  background: var(--color-surface-2);
}

.strong {
  font-weight: 600;
  color: var(--color-text-1);
}

.muted {
  color: var(--color-text-3);
}

.num {
  font-family: var(--font-display);
  font-weight: 600;
}

.num.like {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: var(--color-error);
}

.row-actions {
  display: flex;
  gap: 4px;
}

.ra {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--color-text-3);
  border-radius: 8px;
  transition: all var(--dur-fast) ease;
}

.ra:hover {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.ra.danger:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}
</style>
