<script setup lang="ts">
import ContentPage from '@/components/layout/ContentPage.vue';

const updated = '2026-08-12';
</script>

<template>
  <ContentPage
    eyebrow="隐私政策"
    title="Hey 19 隐私政策"
    :subtitle="`最后更新：${updated}`"
  >
    <h2 id="overview">概述</h2>
    <p>
      Hey 19
      致力于保护你的隐私。本政策说明我们如何收集、使用、储存和保护你的个人信息。使用
      Hey 19 服务即代表你同意本政策的条款。
    </p>

    <h2 id="collect">信息收集</h2>
    <p>我们收集以下类型的信息：</p>
    <ul>
      <li><strong>账户信息</strong>：邮箱、昵称、头像、密码（加密存储）</li>
      <li><strong>使用数据</strong>：功能使用情况、生成记录、积分消耗</li>
      <li>
        <strong>创作内容</strong>：你上传的图片与提示词，用于生成服务与历史记录
      </li>
      <li>
        <strong>设备信息</strong>：浏览器类型、操作系统、IP 地址（用于安全防护）
      </li>
    </ul>

    <h2 id="use">信息使用</h2>
    <ul>
      <li>提供、维护和改进 Hey 19 的服务</li>
      <li>训练推荐算法与个性化体验</li>
      <li>发送重要通知（账单、安全、协议变更）</li>
      <li>防范欺诈、滥用与安全事件</li>
    </ul>
    <div class="callout">
      <span>🔒</span>
      <span
        >我们<strong>不会</strong>将你的创作内容出售给第三方，也不会用于训练他人可访问的公开模型。</span
      >
    </div>

    <h2 id="share">信息共享</h2>
    <p>仅在以下情况与第三方共享你的信息：</p>
    <ul>
      <li>获得你的明确同意</li>
      <li>与提供基础设施的供应商（如云存储、支付）共享最小必要信息</li>
      <li>法律要求或为应对紧急安全问题</li>
    </ul>

    <h2 id="storage">数据存储与保护</h2>
    <p>
      所有数据存储于阿里云杭州节点，加密传输（HTTPS）与加密静态存储。密码使用
      bcrypt 加盐哈希，不存储明文。
    </p>

    <h2 id="rights">你的权利</h2>
    <p>你随时有权：</p>
    <ul>
      <li>查看、导出你的全部个人数据</li>
      <li>更正不准确的信息</li>
      <li>删除账户与所有相关数据（不可恢复）</li>
      <li>撤回授权，关闭个性化推荐</li>
    </ul>
    <p>行使上述权利请发送邮件至 <code>privacy@hey19.design</code>。</p>

    <h2 id="cookies">Cookies 与本地存储</h2>
    <p>
      Hey 19
      使用必要的本地存储（LocalStorage）保存你的偏好（如主题色、侧栏折叠状态）。你可以通过浏览器设置清除这些数据。
    </p>

    <h2 id="changes">政策变更</h2>
    <p>
      本政策如有重大变更，我们会通过站内信与邮件提前 30
      天通知。继续使用服务代表你接受变更后的政策。
    </p>

    <h2 id="contact">联系我们</h2>
    <p>如对本政策有任何疑问，请联系：<code>privacy@hey19.design</code></p>
  </ContentPage>
</template>
