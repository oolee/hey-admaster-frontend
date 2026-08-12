import { defineEventHandler, readBody } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}));
  const {
    model = 'gpt-image-2',
    prompt = '',
    size = '1024x1024',
    quality = 'high',
    n = 1,
    image = null,
  } = body || {};

  const apiKey = process.env.GPTEAM_API_KEY;
  if (!apiKey) {
    const idx = Math.floor(Math.random() * 6) + 1;
    return {
      ok: true,
      mock: true,
      images: [
        {
          url: `/asset/mock-cover-${idx}.svg`,
          seed: Math.floor(Math.random() * 100_000),
        },
      ],
    };
  }

  const base = process.env.GPTEAM_BASE_URL || 'https://api.gpteamservices.com';
  try {
    const payload: Record<string, unknown> = {
      model,
      prompt,
      size,
      quality,
      n,
      response_format: 'b64_json',
    };
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
    let resp: Response;
    if (image && String(image).startsWith('data:')) {
      payload.image = [image];
      payload.prompt =
        prompt ||
        'Apply the design onto this photo naturally and realistically.';
      resp = await fetch(`${base}/v1/images/edits`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } else {
      resp = await fetch(`${base}/v1/images/generations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return {
        ok: false,
        error: `上游 ${resp.status}: ${errText.slice(0, 200)}`,
      };
    }
    const data = await resp.json();
    const images = (data?.data || []).map(
      (d: { b64_json?: string; url?: string }) => ({
        url: d.url || (d.b64_json ? `data:image/png;base64,${d.b64_json}` : ''),
        revised_prompt: '',
        seed: Math.floor(Math.random() * 100_000),
      }),
    );
    return { ok: true, mock: false, images };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `网关异常: ${msg}` };
  }
});
