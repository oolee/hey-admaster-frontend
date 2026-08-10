import type { AiGeneratedImage, RefImage } from '#/store/aiDesignStore';

import { useAiDesignStore } from '#/store/aiDesignStore';

/** 从提示词中提取出的尺寸信息 */
interface ExtractedSize {
  /** 宽（cm） */
  widthCm: number;
  /** 高（cm） */
  heightCm: number;
  /** 宽高比（宽/高） */
  ratio: number;
  /** 原始匹配文本（如 300×150cm），用于展示 */
  raw: string;
}

/** 尺寸单位 → cm 换算系数 */
const UNIT_TO_CM: Record<string, number> = {
  cm: 1,
  厘米: 1,
  mm: 0.1,
  毫米: 0.1,
  m: 100,
  米: 100,
  寸: 3.3333,
  英寸: 2.54,
  in: 2.54,
};

/**
 * 从提示词中提取尺寸描述（如「300×150cm」「5米」「10cm」「2m×1.5m」），
 * 统一换算为 cm 与宽高比。单值（如 5米）按正方形处理。
 * 返回 null 表示未识别到可信尺寸。
 */
function extractPromptSize(prompt: string): ExtractedSize | null {
  if (!prompt) return null;
  // 优先：宽x高 + 可选单位（支持 × x X *，允许空格）
  const dimMatch = prompt.match(
    /(\d+(?:\.\d+)?)\s*[x×X*]\s*(\d+(?:\.\d+)?)\s*(cm|厘米|mm|毫米|m|米|寸|英寸|in)?/,
  );
  if (dimMatch) {
    const [raw, wStr, hStr, unit] = dimMatch as RegExpMatchArray;
    const w = Number.parseFloat(wStr ?? '');
    const h = Number.parseFloat(hStr ?? '');
    if (w > 0 && h > 0) {
      const k = (unit && UNIT_TO_CM[unit]) || 1;
      const widthCm = w * k;
      const heightCm = h * k;
      return { widthCm, heightCm, ratio: widthCm / heightCm, raw: raw ?? '' };
    }
  }
  // 其次：单值 + 明确单位（如 5米、10cm、6寸），按正方形处理
  const singleMatch = prompt.match(
    /(\d+(?:\.\d+)?)\s*(cm|厘米|mm|毫米|m|米|寸|英寸|in)/,
  );
  if (singleMatch) {
    const [raw, vStr, unit] = singleMatch as RegExpMatchArray;
    const v = Number.parseFloat(vStr ?? '');
    const k = UNIT_TO_CM[unit ?? ''] ?? 0;
    if (v > 0 && k) {
      const cm = v * k;
      return { widthCm: cm, heightCm: cm, ratio: 1, raw: raw ?? '' };
    }
  }
  return null;
}

/**
 * AI 设计真实生图（后端 Hey.AdMaster.AiDesign 模块）
 * 统一构建请求参数：尺寸、质量、参考图 base64、模型、模板、蒙版（局部修改）等。
 */
export function useAiDesignGeneration() {
  const store = useAiDesignStore();

  /** 模型未声明 supportedSizes 时的兜底固定尺寸集（OpenAI 兼容 /images/generations 常见值） */
  const DEFAULT_SIZES = ['1024x1024', '1536x1024', '1024x1536'];

  /** 目标宽高比：自定义尺寸 > 选择的比例 > 设计类型默认比例 > 提示词提取尺寸 > 1:1 */
  function targetRatio(): number {
    const ratio = store.selectedAspectRatio;
    if (ratio === 'custom') {
      if (store.designWidth && store.designHeight) {
        return store.designWidth / store.designHeight;
      }
    } else if (ratio && ratio !== 'auto') {
      const [rwStr, rhStr] = ratio.split(':') as [string, string];
      const rw = Number.parseFloat(rwStr);
      const rh = Number.parseFloat(rhStr);
      if (rw && rh) return rw / rh;
    } else if (store.selectedDesignType) {
      const def = store.designTypeRatios[store.selectedDesignType];
      if (def) {
        const [rwStr, rhStr] = def.split(':') as [string, string];
        const rw = Number.parseFloat(rwStr);
        const rh = Number.parseFloat(rhStr);
        if (rw && rh) return rw / rh;
      }
    }
    return 1;
  }

  /**
   * 解析最终请求像素尺寸（如 1536x1024）：
   * - size（像素尺寸）只由「比例」决定，不再使用 1K/2K/4K 分辨率档位
   *   （分辨率属于 size 维度、质量才是 auto/low/medium/high，两者正交）
   * - 尺寸选择「自动」时：优先从提示词中提取尺寸说明（如 300×150cm），
   *   换算为 gpt-image-2 支持的像素尺寸（宽高均被 16 整除、比例 1:3~3:1）；
   *   提示词未含尺寸时回退 1:1
   * - 模型声明了 supportedSizes：从中选宽高比最接近目标比例的尺寸
   * - 未声明且为 GPT 图像模型（gpt-image-2 等）：按官方规则计算任意 WIDTHxHEIGHT
   * - 其余模型：固定标准尺寸集中选最接近比例的尺寸
   * - 物理尺寸（cm/m）仅作为构图提示与生产放样（physicalWidth/Height/dpi），不用于指定模型输出像素
   */
  function buildSize(prompt = ''): string {
    const supported = store.currentModel?.supportedSizes?.length
      ? store.currentModel.supportedSizes
      : null;
    let target = targetRatio();
    // 自动模式：优先以提示词中的尺寸比例为准（如「300×150cm 门头」→ 2:1）
    const isAuto =
      store.selectedAspectRatio === 'auto' && !store.selectedDesignType;
    if (isAuto) {
      const extracted = extractPromptSize(prompt);
      if (extracted) target = extracted.ratio;
    }
    if (supported?.length) {
      const parsed = supported.map((s) => {
        const [wStr, hStr] = s.split('x') as [string, string];
        const w = Number.parseInt(wStr, 10);
        const h = Number.parseInt(hStr, 10);
        return { size: s, w, h, ratio: w / h };
      });
      const best = [...parsed].toSorted(
        (a, b) => Math.abs(a.ratio - target) - Math.abs(b.ratio - target),
      )[0];
      return best?.size ?? parsed[0]?.size ?? '';
    }

    const modelName = store.selectedModel || store.currentModel?.id || '';
    if (/gpt-image/i.test(modelName) || /chatgpt-image/i.test(modelName)) {
      return buildArbitrarySize(target);
    }

    const parsed = DEFAULT_SIZES.map((s) => {
      const [wStr, hStr] = s.split('x') as [string, string];
      const w = Number.parseInt(wStr, 10);
      const h = Number.parseInt(hStr, 10);
      return { size: s, w, h, ratio: w / h };
    });
    const best = [...parsed].toSorted(
      (a, b) => Math.abs(a.ratio - target) - Math.abs(b.ratio - target),
    )[0];
    return best?.size ?? parsed[0]?.size ?? '';
  }

  /**
   * 按 gpt-image-2 规则计算任意像素尺寸：
   * 长边 1536、宽高均 16 的倍数、范围 [256, 3840]，比例与目标比例一致。
   * 官方比例限制 1:3 ~ 3:1，超出时收敛到边界，避免上游拒绝请求。
   */
  function buildArbitrarySize(ratio: number): string {
    const LONG_EDGE = 1536;
    const MIN = 256;
    const MAX = 3840;
    const clamped = Math.min(3, Math.max(1 / 3, ratio));
    const round16 = (v: number) =>
      Math.max(MIN, Math.min(MAX, Math.round(v / 16) * 16));
    const w = clamped >= 1 ? LONG_EDGE : round16(LONG_EDGE * clamped);
    const h = clamped >= 1 ? round16(LONG_EDGE / clamped) : LONG_EDGE;
    return `${w}x${h}`;
  }

  /** 用户是否明确选择了尺寸（设计类型 / 比例 / 自定义），决定是否携带物理尺寸并影响提示词附加 */
  function hasExplicitSize(): boolean {
    return Boolean(
      store.selectedDesignType || store.selectedAspectRatio !== 'auto',
    );
  }

  function refImagesToPayload(refImages: RefImage[]) {
    return refImages.map((ref) => {
      const comma = ref.dataUrl.indexOf(',');
      const contentType = ref.dataUrl.startsWith('data:')
        ? ref.dataUrl.slice(
            5,
            ref.dataUrl.indexOf(';') > 5 ? ref.dataUrl.indexOf(';') : 5,
          )
        : 'image/png';
      return {
        dataBase64: comma === -1 ? ref.dataUrl : ref.dataUrl.slice(comma + 1),
        contentType: contentType || 'image/png',
        fileName: ref.fileName,
        tag: ref.tag,
      };
    });
  }

  /**
   * 调用后端生图（同步返回或自动轮询异步任务），成功后刷新当前会话。
   * 返回可直接展示的图片列表（方案 A/B/C… 命名）。
   */
  async function generate(
    prompt: string,
    options: {
      autoOptimize?: boolean;
      count?: number;
      /** 编辑蒙版（局部修改）：透明区域为重绘区域，与 referenceImages 中的源图配合走 /images/edits */
      mask?: null | RefImage;
      model?: null | string;
      referenceImages?: RefImage[];
      templateId?: null | string;
    } = {},
  ): Promise<AiGeneratedImage[]> {
    // 文本模型：不传尺寸（后端忽略）、单次请求
    const modelName = options.model ?? store.selectedModel;
    const current = store.modelOptions.find((m) => m.id === modelName);
    const caps = current?.capabilities ?? 0;
    const isText =
      caps === 0
        ? current?.modelType === 1 // 能力位优先：无文生图/图生图能力按文本处理
        : (caps & 12) === 0;
    const hasSize = !isText && hasExplicitSize();
    // 自动模式：从提示词提取物理尺寸（如 300×150cm），用于生产放样与比例匹配
    const extracted = !isText && !hasSize ? extractPromptSize(prompt) : null;
    const images = await store.generateImages({
      prompt,
      optimizedPrompt: store.optimizedPrompt || null,
      model: modelName,
      size: isText ? null : buildSize(prompt),
      count: isText ? 1 : (options.count ?? store.generateCount),
      // 生成质量：auto / low / medium / high（对应模型 quality 参数，默认 auto 由模型自动选择）
      quality: store.quality || 'auto',
      templateId: options.templateId ?? null,
      referenceImages: refImagesToPayload(options.referenceImages ?? []),
      mask: options.mask ? refImagesToPayload([options.mask])[0] : null,
      autoOptimize: !isText && Boolean(options.autoOptimize),
      // 物理尺寸（cm，印刷放样用）；仅当用户明确选择尺寸或提示词含尺寸时携带
      physicalWidth:
        hasSize && store.designWidth
          ? store.designWidth
          : (extracted?.widthCm ?? null),
      physicalHeight:
        hasSize && store.designHeight
          ? store.designHeight
          : (extracted?.heightCm ?? null),
      dpi: 300,
    });

    if (images.length > 1) {
      return images.map((img, index) => ({
        ...img,
        title: `方案 ${String.fromCodePoint(65 + index)}`,
      }));
    }
    return images;
  }

  return { generate, buildSize };
}
