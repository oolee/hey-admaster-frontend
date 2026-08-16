import { reactive } from 'vue';

/**
 * hey-public 统一提示系统（prompt）
 * - prompt.confirm(): 双按钮确认（危险操作如删除），返回 Promise<boolean>
 * - prompt.alert(): 单按钮提示（info/success/warning/error），返回 Promise<void>
 * 铁律：禁止再使用原生 confirm()/alert()/window.prompt()，统一走本系统
 * （霓虹玻璃风，跟随主题色系/明暗切换）。宿主组件：components/ui/PromptHost.vue。
 */
export type PromptVariant =
  | 'confirm'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

export interface PromptOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** 确认按钮使用危险色（删除/清空等破坏性操作） */
  danger?: boolean;
  /** 单按钮提示变体（alert 专用） */
  variant?: Exclude<PromptVariant, 'confirm'>;
}

interface PromptState {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
  variant: PromptVariant;
  resolve?: (value: boolean) => void;
}

const state = reactive<PromptState>({
  open: false,
  title: '提示',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  danger: false,
  variant: 'confirm',
});

function open(
  options: PromptOptions,
  variant: PromptVariant,
): Promise<boolean> {
  state.title = options.title ?? '提示';
  state.message = options.message;
  state.confirmText =
    options.confirmText ?? (variant === 'confirm' ? '确定' : '知道了');
  state.cancelText = options.cancelText ?? '取消';
  state.danger = options.danger ?? false;
  state.variant = variant;
  state.open = true;
  return new Promise<boolean>((resolve) => {
    state.resolve = resolve;
  });
}

export const prompt = {
  state,
  /** 确认对话框：确认 → true；取消/关闭 → false */
  confirm(options: PromptOptions): Promise<boolean> {
    return open(options, 'confirm');
  },
  /** 单按钮提示（info/success/warning/error）：点击按钮后 resolve */
  alert(
    options: PromptOptions & { variant?: Exclude<PromptVariant, 'confirm'> },
  ): Promise<void> {
    return open(options, options.variant ?? 'info').then(() => undefined);
  },
  /** 关闭对话框并给出结果（由 PromptHost 调用） */
  settle(value: boolean): void {
    state.open = false;
    const resolve = state.resolve;
    state.resolve = undefined;
    resolve?.(value);
  },
};
