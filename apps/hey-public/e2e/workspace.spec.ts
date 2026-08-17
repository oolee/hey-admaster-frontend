import type { Page } from '@playwright/test';

import { Buffer } from 'node:buffer';

import { expect, test } from '@playwright/test';

/** 登录（表单默认预填 admin@abp.io / 1q2w3E*） */
async function login(page: Page): Promise<void> {
  await page.goto('/auth');
  await page
    .locator('form.auth-form input[placeholder="name@example.com"]')
    .fill('admin@abp.io');
  await page
    .locator('form.auth-form input[placeholder="至少 6 位"]')
    .fill('1q2w3E*');
  await page
    .locator('form.auth-form')
    .getByRole('button', { name: '登录' })
    .click();
  await page.waitForURL('**/workspace', { timeout: 20_000 });
}

test.describe('AI 工作台', () => {
  test('登录后工作台加载，会话列表可见', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await login(page);
    await expect(page.locator('.ws')).toBeVisible();
    await expect(page.locator('.conv-panel')).toBeVisible();
    await expect(page.locator('.chat-scroll')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('新对话 → 空态；发送 chat 消息 → echo 回复', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: '新对话', exact: true }).click();
    await expect(page.locator('.chat-empty')).toBeVisible();
    await expect(page.locator('.chat-empty')).toContainText('今天想创作点什么');

    await page.locator('.composer-input').fill('你好，Playwright 测试');
    await page.locator('.send-btn').click();
    await expect(
      page
        .locator('.msg-text')
        .filter({ hasText: 'echo: 你好，Playwright 测试' }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('删除已落库会话 → 自定义确认框（非原生 confirm）', async ({ page }) => {
    await login(page);
    // 新对话 + 发消息 → 会话落库
    await page.getByRole('button', { name: '新对话', exact: true }).click();
    await page.locator('.composer-input').fill('删除测试消息');
    await page.locator('.send-btn').click();
    await expect(
      page.locator('.msg-text').filter({ hasText: 'echo: 删除测试消息' }),
    ).toBeVisible({ timeout: 20_000 });

    // 删除该会话（列表第一项）→ 自定义确认框
    await page.locator('.conv-item').first().getByTitle('删除').click();
    await expect(page.locator('.prompt-panel')).toBeVisible();
    await expect(page.locator('.prompt-panel')).toContainText('删除后无法恢复');

    // 取消：不删除
    await page
      .locator('.prompt-panel')
      .getByRole('button', { name: '取消' })
      .click();
    await expect(page.locator('.prompt-panel')).not.toBeVisible();
    await expect(page.locator('.conv-item').first()).toBeVisible();

    // 确认：删除 + 会话消失
    await page.locator('.conv-item').first().getByTitle('删除').click();
    await page
      .locator('.prompt-panel')
      .getByRole('button', { name: '删除' })
      .click();
    await expect(page.locator('.prompt-panel')).not.toBeVisible();
    const removed = page
      .locator('.conv-item')
      .filter({ hasText: '删除测试消息' });
    await expect(removed).toHaveCount(0);
  });

  test('文生图产物 → 注册表操作按钮（下载/复制链接/重新生成/改图）', async ({
    page,
  }) => {
    // 拦截产物图片 URL（返回 1x1 PNG，避免 404 破图）
    await page.route('**/ai-agent-images/e2e-fake.png', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64',
        ),
      });
    });
    // 拦截 stream-single（SSE 帧流），返回图像产物（快速且确定）
    await page.route('**/api/ai-agent/run/stream-single', async (route) => {
      const frames = [
        { type: 'IntentResolved', data: { capabilityId: 'image-gen.v1' } },
        { type: 'ModelSelected', data: 'e2e-image-bridge' },
        {
          type: 'Completed',
          data: {
            status: 0,
            artifacts: [
              {
                kind: 1,
                uri: '/ai-agent-images/e2e-fake.png',
                previewUri: '/ai-agent-images/e2e-fake.webp',
                contentType: 'image/png',
              },
            ],
            usage: null,
          },
        },
      ];
      const body = frames
        .map((f) => `data: ${JSON.stringify(f)}\n\n`)
        .join('');
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body,
      });
    });

    await login(page);
    await page.getByRole('button', { name: '新对话', exact: true }).click();
    await page.locator('.composer-input').fill('/image 生成测试图');
    await page.locator('.composer-input').press('Enter'); // 斜杠选中 image-gen 并发送

    // 图像产物 + 注册表操作按钮
    await expect(
      page.locator('.artifact-tools .t-btn[title="复制图像"]'),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator('.artifact-tools .t-btn[title="下载"]'),
    ).toBeVisible();
    await expect(
      page.locator('.artifact-tools .t-btn[title="重新生成"]'),
    ).toBeVisible();
    await expect(
      page.locator('.artifact-tools .t-btn[title="改图"]'),
    ).toBeVisible();
    await expect(
      page.locator('.artifact-tools .t-btn[title="复制链接"]'),
    ).toBeVisible();

    // 产物渲染为图片（img 指向产物地址）
    await expect(
      page.locator('.artifact img[src*="ai-agent-images"]').first(),
    ).toBeVisible();

    // 改图按钮 → 切到 image-edit + 附件 + 输入框聚焦
    await page.locator('.artifact-tools .t-btn[title="改图"]').click();
    await expect(page.locator('.attachments-row')).toBeVisible();
    await expect(page.locator('.composer-input')).toBeFocused();
  });
});
