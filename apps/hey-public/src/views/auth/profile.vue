<script setup lang="ts">
import { RouterLink } from 'vue-router';

import { useAuth } from '#/composables/useAuth';

const { user, isLoggedIn } = useAuth();
</script>

<template>
  <div class="profile-page">
    <div class="container-custom">
      <div class="profile-header">
        <RouterLink to="/" class="back-link">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回首页
        </RouterLink>
      </div>

      <div v-if="isLoggedIn && user" class="profile-card glass-card">
        <div class="profile-avatar-section">
          <div class="profile-avatar">
            <img
              v-if="user.avatar"
              :src="user.avatar"
              :alt="user.realName"
              class="avatar-img"
            />
            <span v-else class="avatar-placeholder">
              {{ (user.realName || user.username).charAt(0).toUpperCase() }}
            </span>
          </div>
          <h2 class="profile-name">{{ user.realName || user.username }}</h2>
          <p class="profile-username">@{{ user.username }}</p>
        </div>

        <div class="profile-info">
          <div class="info-item">
            <span class="info-label">邮箱</span>
            <span class="info-value">{{ user.email || '未设置' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">手机号</span>
            <span class="info-value">{{ user.phoneNumber || '未设置' }}</span>
          </div>
        </div>
      </div>

      <div v-else class="profile-empty">
        <p>请先登录以查看个人中心</p>
        <RouterLink to="/login" class="btn-neon-filled">去登录</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: 120px 0 80px;
  background: var(--color-bg-primary);
}

.profile-header {
  margin-bottom: 32px;
}

.back-link {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--color-neon);
}

.profile-card {
  max-width: 560px;
  padding: 48px 40px;
  margin: 0 auto;
}

.profile-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 36px;
}

.profile-avatar {
  width: 88px;
  height: 88px;
  margin-bottom: 20px;
  overflow: hidden;
  border: 2px solid var(--color-neon-dim);
  border-radius: 50%;
  box-shadow: 0 0 20px var(--color-neon-glow);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.profile-name {
  margin-bottom: 4px;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.profile-username {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.info-label {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.info-value {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.profile-empty {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  padding: 80px 0;
  text-align: center;
}

.profile-empty p {
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.profile-empty .btn-neon-filled {
  padding: 12px 32px;
  font-size: 1rem;
  text-decoration: none;
  border-radius: 9999px;
}
</style>
