<script setup>
import { ref, onMounted } from 'vue'
import { Save, RotateCcw } from 'lucide-vue-next'
import AButton from '@admin-demo/components/AButton.vue'
import { api } from '@admin-demo/api'
import { toast } from '@admin-demo/utils/toast'

const form = ref(null)
const groups = [
  { key: 'site', label: '站点信息' },
  { key: 'security', label: '安全设置' },
  { key: 'billing', label: '计费配置' },
  { key: 'ai', label: 'AI 引擎' }
]

onMounted(async () => {
  const res = await api.settings()
  form.value = res.data
})

function save() {
  toast.success('设置已保存')
}
function reset() {
  toast.info('已恢复默认设置')
}
</script>

<template>
  <div class="pg">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">系统设置</h1>
        <p class="pg-sub">平台基础配置</p>
      </div>
      <div class="pg-actions">
        <AButton variant="outline" @click="reset"><RotateCcw :size="15" /> 恢复默认</AButton>
        <AButton variant="primary" @click="save"><Save :size="15" /> 保存设置</AButton>
      </div>
    </header>

    <div v-if="form" class="settings-grid">
      <div v-for="g in groups" :key="g.key" class="card">
        <h3 class="card-title">{{ g.label }}</h3>
        <template v-if="g.key === 'site'">
          <label class="sf"><span>站点名称</span><input v-model="form.site.name" /></label>
          <label class="sf"><span>站点标语</span><input v-model="form.site.slogan" /></label>
          <label class="sf"><span>客服邮箱</span><input v-model="form.site.contact" /></label>
        </template>
        <template v-else-if="g.key === 'security'">
          <label class="sf"><span>登录失败限制</span><input v-model.number="form.security.loginLimit" type="number" min="1" max="20" /></label>
          <label class="sf switch"><span>短信验证码登录</span><input v-model="form.security.smsVerify" type="checkbox" /></label>
          <label class="sf switch"><span>内容自动审核</span><input v-model="form.security.auditContent" type="checkbox" /></label>
        </template>
        <template v-else-if="g.key === 'billing'">
          <label class="sf"><span>税率（%）</span><input v-model.number="form.billing.taxRate" type="number" min="0" max="30" /></label>
          <label class="sf"><span>发票前缀</span><input v-model="form.billing.invoicePrefix" /></label>
          <label class="sf switch"><span>自动续费</span><input v-model="form.billing.autoRenew" type="checkbox" /></label>
        </template>
        <template v-else>
          <label class="sf">
            <span>默认模型</span>
            <select v-model="form.ai.defaultModel">
              <option value="auto">Auto · 自动匹配</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="deepseek-v3">DeepSeek V3</option>
              <option value="midjourney-v6">Midjourney v6</option>
            </select>
          </label>
          <label class="sf">
            <span>默认图片尺寸</span>
            <select v-model="form.ai.imageSize">
              <option>1024x1024</option><option>1024x1536</option><option>1536x1024</option><option>auto</option>
            </select>
          </label>
          <label class="sf"><span>并发生成上限</span><input v-model.number="form.ai.concurrent" type="number" min="1" max="16" /></label>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pg { max-width: 1240px; margin: 0 auto; }
.pg-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 20px; }
.pg-title { font-size: var(--text-2xl); }
.pg-sub { font-size: var(--text-sm); color: var(--color-text-3); margin-top: 4px; }
.pg-actions { display: flex; gap: 10px; }

.settings-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 1024px) { .settings-grid { grid-template-columns: repeat(2, 1fr); } }
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 14px; padding: 20px; }
.card-title { font-size: var(--text-base); margin-bottom: 16px; }

.sf { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.sf span { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-2); }
.sf input, .sf select {
  padding: 0.55rem 0.7rem;
  background: var(--color-surface-2);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text-1);
  font-size: var(--text-sm);
  font-family: inherit;
}
.sf input:focus, .sf select:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--glow-accent); }
.sf.switch { flex-direction: row; align-items: center; justify-content: space-between; }
.sf.switch span { order: 2; }
.sf.switch input { order: 1; width: 42px; height: 22px; accent-color: var(--color-accent); }
</style>