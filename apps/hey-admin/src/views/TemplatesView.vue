<script setup>
import { onMounted, ref } from 'vue';

import { Pencil, Plus, Star, Trash2 } from 'lucide-vue-next';

import ABadge from '#/components/admin/ABadge.vue';
import { toast } from '#/utils/toast';

const templates = ref([]);
onMounted(async () => {
  templates.value = [
    {
      id: 'mt-1',
      name: '门头设计',
      cat: '门头店招',
      ratio: '80×40cm',
      hot: true,
    },
    {
      id: 'mt-2',
      name: '门头店招',
      cat: '门头店招',
      ratio: '60×120cm',
      hot: true,
    },
    {
      id: 'mt-3',
      name: '3D 门头效果图',
      cat: '门头店招',
      ratio: '场景渲染',
      hot: true,
    },
    {
      id: 'vi-1',
      name: 'VI 基础系统',
      cat: 'VI 设计',
      ratio: '完整手册',
      hot: false,
    },
    {
      id: 'vi-2',
      name: 'Logo 设计',
      cat: 'VI 设计',
      ratio: 'AI 生成',
      hot: true,
    },
    {
      id: 'vi-3',
      name: '名片设计',
      cat: 'VI 设计',
      ratio: '90×54mm',
      hot: false,
    },
    {
      id: 'pr-1',
      name: 'DM 传单',
      cat: '印刷物料',
      ratio: 'A4 / A5',
      hot: false,
    },
    {
      id: 'pr-2',
      name: '活动海报',
      cat: '印刷物料',
      ratio: 'A2 / A3',
      hot: false,
    },
    {
      id: 'id-1',
      name: '室内效果图',
      cat: '室内设计',
      ratio: '4K 输出',
      hot: true,
    },
    {
      id: 'sm-1',
      name: '社媒九宫格',
      cat: '社媒内容',
      ratio: '9 宫格',
      hot: true,
    },
    {
      id: 'sm-2',
      name: '直播预告海报',
      cat: '社媒内容',
      ratio: '1080×1920',
      hot: false,
    },
    {
      id: 'sm-3',
      name: '品牌 VI 模板',
      cat: '社媒内容',
      ratio: '响应式',
      hot: false,
    },
  ];
});

function toggleHot(t) {
  t.hot = !t.hot;
  toast.success(t.hot ? `「${t.name}」已设为热门` : `已取消「${t.name}」热门`);
}
</script>

<template>
  <div class="pg">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">模板管理</h1>
        <p class="pg-sub">前台模板库 · 共 {{ templates.length }} 款</p>
      </div>
      <AButton variant="primary"><Plus :size="15" /> 新增模板</AButton>
    </header>

    <div class="card table-card">
      <table class="tbl">
        <thead>
          <tr>
            <th>模板名称</th>
            <th>分类</th>
            <th>规格</th>
            <th>热门</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in templates" :key="t.id">
            <td class="strong">
              {{ t.name }} <span class="mono muted">{{ t.id }}</span>
            </td>
            <td>
              <ABadge tone="accent">{{ t.cat }}</ABadge>
            </td>
            <td class="muted">{{ t.ratio }}</td>
            <td>
              <button
                class="star-btn"
                :class="{ hot: t.hot }"
                @click="toggleHot(t)"
                :title="t.hot ? '取消热门' : '设为热门'"
              >
                <Star :size="15" :fill="t.hot ? 'currentColor' : 'none'" />
              </button>
            </td>
            <td>
              <div class="row-actions">
                <button class="ra" title="编辑"><Pencil :size="14" /></button>
                <button class="ra danger" @click="toast.info('演示：删除模板')">
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

.mono {
  margin-left: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.star-btn {
  color: var(--color-text-3);
  transition: all var(--dur-fast) ease;
}

.star-btn.hot {
  color: var(--color-warning);
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
