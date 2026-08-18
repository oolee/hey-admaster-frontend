<script setup>
import { computed, onMounted, ref } from 'vue';

import { Ban, CheckCircle, Plus, Search, Shield } from 'lucide-vue-next';

import { api } from '#/api/demo';
import ABadge from '#/components/admin/ABadge.vue';
import AButton from '#/components/admin/AButton.vue';
import AInput from '#/components/admin/AInput.vue';
import AModal from '#/components/admin/AModal.vue';
import { toast } from '#/utils/toast';

const users = ref([]);
const loading = ref(true);
const keyword = ref('');
const statusFilter = ref('all');
const editUser = ref(null);

const filtered = computed(() => {
  let list = users.value;
  if (statusFilter.value !== 'all')
    list = list.filter((u) => u.status === statusFilter.value);
  const kw = keyword.value.toLowerCase();
  if (kw)
    list = list.filter(
      (u) =>
        u.name.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw),
    );
  return list;
});

const statusTone = {
  active: 'success',
  suspended: 'error',
  banned: 'error',
  pending: 'warning',
};
const statusLabel = {
  active: '正常',
  suspended: '已封禁',
  banned: '已封禁',
  pending: '待启用',
};

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d) ? '-' : d.toLocaleDateString('zh-CN');
}

onMounted(async () => {
  loading.value = true;
  const res = await api.users();
  users.value = res.data.list;
  loading.value = false;
});

async function toggleStatus(u) {
  const target = u.status === 'active' ? 'banned' : 'active';
  const res = await api.userAction(u.id, target === 'banned' ? 'ban' : 'unban');
  if (res.code === 0) {
    u.status = target;
    toast.success(
      target === 'active' ? `已恢复用户 ${u.name}` : `已封禁用户 ${u.name}`,
    );
  } else {
    toast.error(res.message || '操作失败');
  }
}
async function activateUser(u) {
  const res = await api.userAction(u.id, 'activate');
  if (res.code === 0) {
    u.status = 'active';
    toast.success(`已启用账号 ${u.name}`);
  } else {
    toast.error(res.message || '操作失败');
  }
}
async function setCredits(u) {
  // oxlint-disable-next-line no-alert
  const val = prompt(`调整 ${u.name} 的积分（当前 ${u.credits}）：`, u.credits);
  if (val === null) return;
  const res = await api.userAction(u.id, 'setCredits', Number(val));
  if (res.code === 0) {
    u.credits = Number(val);
    toast.success('积分已调整');
  } else toast.error(res.message || '操作失败');
}
async function setRole(u) {
  // oxlint-disable-next-line no-alert
  const val = prompt(
    `设置 ${u.name} 的角色（user / admin）：`,
    u.role || 'user',
  );
  if (!val) return;
  const res = await api.userAction(u.id, 'setRole', val);
  if (res.code === 0) {
    u.role = val;
    toast.success('角色已更新');
  } else toast.error(res.message || '操作失败');
}
function openEdit(u) {
  editUser.value = { ...u };
}
function saveEdit() {
  Object.assign(
    users.value.find((u) => u.id === editUser.value.id),
    editUser.value,
  );
  toast.success('用户信息已更新');
  editUser.value = null;
}
</script>

<template>
  <div class="pg">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">用户管理</h1>
        <p class="pg-sub">共 {{ users.length }} 位注册用户</p>
      </div>
      <div class="pg-actions">
        <AButton variant="primary"><Plus :size="15" /> 新增用户</AButton>
      </div>
    </header>

    <div class="toolbar">
      <div class="search-box">
        <Search :size="15" />
        <input v-model="keyword" placeholder="搜索用户 / 邮箱…" />
      </div>
      <div class="filter-tabs">
        <button
          :class="{ on: statusFilter === 'all' }"
          @click="statusFilter = 'all'"
        >
          全部
        </button>
        <button
          :class="{ on: statusFilter === 'active' }"
          @click="statusFilter = 'active'"
        >
          正常
        </button>
        <button
          :class="{ on: statusFilter === 'suspended' }"
          @click="statusFilter = 'suspended'"
        >
          封禁
        </button>
      </div>
    </div>

    <div class="card table-card">
      <table class="tbl">
        <thead>
          <tr>
            <th>用户</th>
            <th>角色</th>
            <th>积分</th>
            <th>注册时间</th>
            <th>状态</th>
            <th style="width: 150px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filtered" :key="u.id">
            <td>
              <div class="user-cell">
                <span class="u-avatar">{{
                  (u.name || u.email || 'U')[0]
                }}</span>
                <div>
                  <p class="u-name">{{ u.name || u.email }}</p>
                  <p class="u-email">{{ u.email }}</p>
                </div>
              </div>
            </td>
            <td>
              <ABadge :tone="u.role === 'admin' ? 'ai' : 'neutral'">
                {{ u.role === 'admin' ? '管理员' : '用户' }}
              </ABadge>
            </td>
            <td class="num">{{ (u.credits ?? 0).toLocaleString() }}</td>
            <td class="muted">{{ fmtDate(u.createdAt) }}</td>
            <td>
              <ABadge :tone="statusTone[u.status] || 'neutral'">
                {{ statusLabel[u.status] || '正常' }}
              </ABadge>
            </td>
            <td>
              <div class="row-actions">
                <button
                  v-if="u.status === 'pending'"
                  class="ra primary"
                  @click="activateUser(u)"
                  title="启用账号"
                >
                  <CheckCircle :size="14" /> 启用
                </button>
                <button class="ra" @click="setCredits(u)" title="调整积分">
                  <Plus :size="14" />
                </button>
                <button class="ra" @click="setRole(u)" title="设置角色">
                  <Shield :size="14" />
                </button>
                <button
                  class="ra"
                  @click="toggleStatus(u)"
                  :title="u.status === 'active' ? '封禁' : '恢复'"
                >
                  <Ban :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filtered.length" class="tbl-empty">没有匹配的用户</div>
    </div>

    <AModal
      :open="!!editUser"
      title="编辑用户"
      @update:open="(v) => !v && (editUser = null)"
      @close="editUser = null"
    >
      <div v-if="editUser" class="edit-form">
        <AInput v-model="editUser.name" label="昵称" />
        <AInput v-model="editUser.email" label="邮箱" />
        <label class="af">
          <span>积分</span>
          <input v-model.number="editUser.credits" type="number" min="0" />
        </label>
        <label class="af">
          <span>角色</span>
          <select v-model="editUser.role">
            <option value="user">用户</option>
            <option value="admin">管理员</option>
          </select>
        </label>
      </div>
      <template #footer>
        <AButton variant="ghost" @click="editUser = null">取消</AButton>
        <AButton variant="primary" @click="saveEdit">保存</AButton>
      </template>
    </AModal>
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

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.search-box {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 240px;
  height: 38px;
  padding: 0 12px;
  color: var(--color-text-3);
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
}

.search-box:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--glow-accent);
}

.search-box input {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-text-1);
  background: transparent;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  background: var(--color-surface-2);
  border-radius: 10px;
}

.filter-tabs button {
  padding: 0.4rem 0.9rem;
  font-size: var(--text-sm);
  color: var(--color-text-3);
  border-radius: 8px;
}

.filter-tabs button.on {
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
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
  white-space: nowrap;
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

.num {
  font-family: var(--font-display);
  font-weight: 600;
}

.muted {
  color: var(--color-text-3);
}

.user-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.u-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  border-radius: 50%;
}

.u-name {
  font-weight: 600;
  color: var(--color-text-1);
}

.u-email {
  font-size: var(--text-xs);
  color: var(--color-text-3);
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

.tbl-empty {
  padding: 40px;
  color: var(--color-text-3);
  text-align: center;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.af {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.af span {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-2);
}

.af select,
.af input {
  padding: 0.55rem 0.7rem;
  font-size: var(--text-sm);
  color: var(--color-text-1);
  background: var(--color-surface-2);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
}

.af select:focus,
.af input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--glow-accent);
}
</style>
