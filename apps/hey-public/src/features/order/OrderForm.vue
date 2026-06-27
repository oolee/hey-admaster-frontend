<script setup lang="ts">
import { ref } from 'vue';

import NeonButton from '#/components/ui/NeonButton.vue';

const emit = defineEmits<{
  submit: [
    payload: {
      contactEmail: string;
      contactName: string;
      contactPhone: string;
      requirements: string;
    },
  ];
}>();

const requirements = ref('');
const contactName = ref('');
const contactEmail = ref('');
const contactPhone = ref('');

const isFormValid = () => {
  return (
    requirements.value.trim() &&
    contactName.value.trim() &&
    contactEmail.value.trim()
  );
};

function handleSubmit() {
  if (!isFormValid()) return;
  emit('submit', {
    requirements: requirements.value.trim(),
    contactName: contactName.value.trim(),
    contactEmail: contactEmail.value.trim(),
    contactPhone: contactPhone.value.trim(),
  });
}
</script>

<template>
  <form class="order-form" @submit.prevent="handleSubmit">
    <div class="form-field">
      <label class="field-label" for="order-requirements">
        项目需求 <span class="required">*</span>
      </label>
      <textarea
        id="order-requirements"
        v-model="requirements"
        class="form-textarea"
        placeholder="请详细描述您的项目需求，包括品牌信息、目标受众、风格偏好等..."
        rows="5"
      ></textarea>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label class="field-label" for="order-name">
          联系人姓名 <span class="required">*</span>
        </label>
        <input
          id="order-name"
          v-model="contactName"
          type="text"
          class="form-input"
          placeholder="请输入您的姓名"
        />
      </div>

      <div class="form-field">
        <label class="field-label" for="order-email">
          联系邮箱 <span class="required">*</span>
        </label>
        <input
          id="order-email"
          v-model="contactEmail"
          type="email"
          class="form-input"
          placeholder="请输入您的邮箱"
        />
      </div>
    </div>

    <div class="form-field">
      <label class="field-label" for="order-phone"> 联系电话 </label>
      <input
        id="order-phone"
        v-model="contactPhone"
        type="tel"
        class="form-input"
        placeholder="请输入您的电话（选填）"
      />
    </div>

    <NeonButton
      type="submit"
      variant="filled"
      size="lg"
      :disabled="!isFormValid()"
      class="submit-btn"
    >
      提交订单
    </NeonButton>
  </form>
</template>

<style scoped>
.order-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-family: var(--font-sans);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.required {
  margin-left: 2px;
  color: var(--color-neon);
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-textarea,
.form-input {
  width: 100%;
  padding: 14px 16px;
  font-family: var(--font-sans);
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  outline: none;
  background: var(--glass-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: border-color 0.3s ease;
}

.form-textarea {
  min-height: 120px;
  resize: vertical;
}

.form-textarea::placeholder,
.form-input::placeholder {
  color: var(--color-text-muted);
}

.form-textarea:focus,
.form-input:focus {
  border-color: var(--color-neon-dim);
  box-shadow: 0 0 20px var(--color-neon-glow);
}

.submit-btn {
  align-self: flex-start;
}

.submit-btn:disabled {
  cursor: not-allowed;
  box-shadow: none !important;
  opacity: 0.4;
  transform: none !important;
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }
}
</style>
