import { defineEventHandler, readBody } from 'h3';
import { mockTextResult } from '~/utils/v2-mock-data';

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}));
  const {
    model = 'deepseek-v3',
    prompt = '',
    system = '',
    temperature = 0.7,
  } = body || {};

  const apiKey = process.env.GPTEAM_API_KEY;
  if (!apiKey) {
    return {
      ok: true,
      mock: true,
      text: mockTextResult(String(model), String(prompt)),
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  const base = process.env.GPTEAM_BASE_URL || 'https://api.gpteamservices.com';
  try {
    const resp = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
        ],
        temperature,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return {
        ok: false,
        error: `上游 ${resp.status}: ${errText.slice(0, 200)}`,
      };
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return { ok: true, mock: false, text, usage: data?.usage || {} };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `网关异常: ${msg}` };
  }
});
