<script setup lang="ts">
import ContentPage from '@/components/layout/ContentPage.vue';

const updated = '2026-08-12';
</script>

<template>
  <ContentPage
    eyebrow="服务条款"
    title="Hey 19 服务条款"
    :subtitle="`最后更新：${updated}`"
  >
    <h2 id="overview">服务说明</h2>
    <p>
      Hey 19 是一款 AI 驱动的创意设计平台，提供门头店招、海报、VI、Logo、PPT
      等设计生成与辅助服务。本条款约束你与 Hey 19 之间的权利义务。
    </p>

    <h2 id="account">账户与使用</h2>
    <ul>
      <li>注册时须提供真实、准确、完整的个人信息</li>
      <li>妥善保管账户密码；账户下发生的所有行为视为本人行为</li>
      <li>每个账户仅限本人使用，禁止出借、转让</li>
      <li>发现账户被盗用请立即联系 <code>security@hey19.design</code></li>
    </ul>

    <h2 id="content">用户内容与版权</h2>
    <ul>
      <li><strong>你提供的内容</strong>（上传图片、提示词）：你保留原始版权</li>
      <li>
        <strong>AI 生成的内容</strong
        >：自生成之时起，<strong>专业版及以上用户</strong>拥有完整商用授权
      </li>
      <li>体验版用户的生成内容仅限个人学习与预览，不可商用</li>
      <li>严禁输入侵犯他人版权、隐私、名誉的内容</li>
      <li>严禁生成违法违规、虚假信息、色情暴力的内容</li>
    </ul>

    <h2 id="credits">积分与计费</h2>
    <ul>
      <li>积分按消耗即时扣除，未使用完的积分可累积</li>
      <li>不同模型与分辨率消耗不同积分（详见定价页）</li>
      <li>订阅档位可享受阶梯价与月度积分包</li>
      <li>积分不支持退款，但可永久使用（除非账户被注销）</li>
    </ul>

    <h2 id="subscription">订阅与续费</h2>
    <p>
      订阅按月或按年自动续费。你可随时在「账户设置」中取消，取消后仍可使用至当前计费周期结束。
    </p>

    <h2 id="prohibited">禁止行为</h2>
    <ul>
      <li>逆向工程、破解 Hey 19 系统或模型</li>
      <li>使用自动化脚本批量生成以转售</li>
      <li>传播与 Hey 19 无关的垃圾内容</li>
      <li>任何违反中国法律法规的行为</li>
    </ul>

    <h2 id="termination">服务变更与终止</h2>
    <p>
      我们保留因不可抗力、政策变更等原因暂停或终止部分服务的权利。如对你的使用造成重大影响，我们将提前
      30 天公告。
    </p>

    <h2 id="liability">免责声明</h2>
    <p>
      Hey 19
      按「现状」提供服务。在法律允许的范围内，我们不对因使用本服务产生的间接、偶然或衍生损失承担责任。
    </p>

    <h2 id="law">适用法律</h2>
    <p>
      本条款受中华人民共和国法律管辖。争议双方应先协商解决；协商不成的，提交杭州仲裁委员会仲裁。
    </p>

    <div class="callout">
      <span>📧</span>
      <span>如对本条款有任何疑问，请联系 <code>legal@hey19.design</code></span>
    </div>
  </ContentPage>
</template>
