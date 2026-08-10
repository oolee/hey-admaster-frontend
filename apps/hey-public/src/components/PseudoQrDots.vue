<script lang="ts">
// 伪二维码 dot 生成：基于 seed 生成可重现的 0/1 点阵
import { defineComponent, h } from 'vue';

/** 字符串散列：返回 32 位整型种子（后续位运算只取低 32 位，符号不影响结果） */
function hashStr(s: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.codePointAt(i) ?? 0;
    h = Math.imul(h, 16_777_619);
  }
  return h;
}

/** mulberry32 伪随机数生成器（保持原算法位运算语义） */
function mulberry32(a: number) {
  return function () {
    // oxlint-disable-next-line unicorn/prefer-math-trunc -- PRNG 需保留 int32 回绕语义，Math.trunc 不等价
    a |= 0;
    // oxlint-disable-next-line unicorn/prefer-math-trunc -- 同上
    a = (a + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    // oxlint-disable-next-line unicorn/prefer-math-trunc -- 需转回无符号 32 位归一化到 [0,1)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export default defineComponent({
  name: 'PseudoQrDots',
  props: { seed: { type: String, required: true } },
  setup(props) {
    return () => {
      const cells: any[] = [];
      // 可绘制区域：x/y 从 72 到 148 排除中心 40 像素方块；外围 0~64 也可画（排除三个角 0~64 范围）
      const size = 10;
      const step = 8;
      const rand = mulberry32(hashStr(props.seed));
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const px = 72 + x * step;
          const py = 72 + y * step;
          // 排除中心 24x24
          if (px >= 98 && px <= 122 && py >= 98 && py <= 122) continue;
          if (rand() > 0.45) {
            cells.push(
              h('rect', {
                x: px,
                y: py,
                width: 6,
                height: 6,
                fill: '#111',
                rx: 1,
              }),
            );
          }
        }
      }
      // 外围额外随机散点
      for (let y = 0; y < 18; y++) {
        for (let x = 0; x < 18; x++) {
          const px = 12 + x * 11;
          const py = 12 + y * 11;
          // 跳过三个角
          if (
            (px < 72 && py < 72) ||
            (px > 148 && py < 72) ||
            (px < 72 && py > 148)
          )
            continue;
          if (rand() > 0.55) {
            cells.push(
              h('rect', {
                x: px,
                y: py,
                width: 7,
                height: 7,
                fill: '#111',
                rx: 1,
              }),
            );
          }
        }
      }
      return h('g', cells);
    };
  },
});
</script>
