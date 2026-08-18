<script lang="ts" setup>
import { App, ConfigProvider } from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';

defineOptions({ name: 'App' });
</script>

<template>
  <ConfigProvider :locale="zhCN">
    <App>
      <RouterView />
    </App>
  </ConfigProvider>
</template>
