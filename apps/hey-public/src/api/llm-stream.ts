import type { V2LlmGenerateInput } from '@/api';

/* =====================================================
   工作台 SSE 流式客户端（POST /api/llm/stream）
   解析 text/event-stream：meta / text / artifact / done / error
   ===================================================== */

export interface V2StreamMeta {
  sessionId: string;
  messageId: string;
  model: string;
  type: string;
  mock?: boolean;
}

export interface V2StreamArtifact {
  type: string;
  label?: string;
  html?: string;
  pages?: number;
  images?: Array<{ seed: number; url: string }>;
}

export interface V2StreamHandlers {
  onMeta?: (meta: V2StreamMeta) => void;
  onText?: (content: string) => void;
  onArtifact?: (artifact: V2StreamArtifact) => void;
  onDone?: (cost?: number) => void;
  onError?: (message: string) => void;
}

/**
 * 发起 SSE 流式生成。返回 AbortController，调用方可取消。
 * 与 request() 不同：不走统一 JSON 解包，直接解析 SSE 事件。
 */
export function llmStream(
  payload: V2LlmGenerateInput,
  handlers: V2StreamHandlers,
  timeoutMs = 180_000,
): AbortController {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  (async () => {
    try {
      const token = localStorage.getItem('hey19-v2-token') || '';
      const resp = await fetch('/api/llm/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
        credentials: 'include',
      });
      if (!resp.ok || !resp.body) {
        handlers.onError?.(`HTTP ${resp.status}`);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // 按空行分割 SSE 帧
        let idx: number;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          handleFrame(frame, handlers);
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        handlers.onError?.('请求超时或已取消');
      } else {
        handlers.onError?.(
          error instanceof Error ? error.message : '流式请求失败',
        );
      }
    } finally {
      clearTimeout(timer);
    }
  })();

  return ctrl;
}

function handleFrame(frame: string, handlers: V2StreamHandlers): void {
  let event = 'message';
  const datas: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) datas.push(line.slice(5).trim());
  }
  if (datas.length === 0) return;
  const data = datas.join('\n');
  let parsed: any;
  try {
    parsed = JSON.parse(data);
  } catch {
    return;
  }
  switch (event) {
    case 'artifact': {
      handlers.onArtifact?.({
        type: parsed.type || parsed.artifact?.type || 'image',
        label: parsed.artifact?.label,
        html: parsed.artifact?.html,
        pages: parsed.artifact?.pages,
        images: parsed.images,
      });
      break;
    }
    case 'done': {
      handlers.onDone?.(parsed.cost);
      break;
    }
    case 'error': {
      handlers.onError?.(parsed.error || '生成失败');
      break;
    }
    case 'meta': {
      handlers.onMeta?.({
        sessionId: parsed.sessionId,
        messageId: parsed.messageId,
        model: parsed.model,
        type: parsed.type,
        mock: parsed.mock,
      });
      break;
    }
    case 'text': {
      if (typeof parsed.content === 'string') handlers.onText?.(parsed.content);
      break;
    }
  }
}
