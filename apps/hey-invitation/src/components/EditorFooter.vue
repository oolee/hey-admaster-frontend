<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import { useEditorStore } from '../store/editor';

const store = useEditorStore();

const displayProjectName = computed(() => {
  const n = (store.projectName || '').trim();
  return n || '我的请柬';
});

// ========== 对话框 ==========
const dialogVisible = ref(false);
const dialogKey = ref<
  'call' | 'consult' | 'export' | 'help' | 'reserve' | null
>(null);
const dialogTitle = computed(() => {
  const map: Record<string, string> = {
    call: '一键拨打',
    consult: '在线咨询',
    reserve: '快速预约',
    help: '使用帮助',
    export: '导出项目',
  };
  return dialogKey.value ? map[dialogKey.value] : '';
});

const openDialog = (
  key: 'call' | 'consult' | 'export' | 'help' | 'reserve',
) => {
  dialogKey.value = key;
  dialogVisible.value = true;
};

const closeDialog = () => {
  dialogVisible.value = false;
  dialogKey.value = null;
};

const onOneClickCall = () => openDialog('call');
const onOnlineConsult = () => openDialog('consult');
const onQuickReserve = () => openDialog('reserve');
const onHelp = () => openDialog('help');
const onExport = () => openDialog('export');

// ========== 快速预约表单 ==========
const reserveForm = reactive({
  name: '',
  phone: '',
  date: '',
  remark: '',
});

const resetReserveForm = () => {
  reserveForm.name = '';
  reserveForm.phone = '';
  reserveForm.date = '';
  reserveForm.remark = '';
};

const submitReserveForm = () => {
  if (!reserveForm.name.trim()) {
    store.showToast('请填写新人姓名', 'warning');
    return;
  }
  if (!/^1\d{10}$/.test(reserveForm.phone.trim())) {
    store.showToast('请填写有效的 11 位手机号', 'warning');
    return;
  }
  // 模拟提交：保存到本地并提示成功
  try {
    localStorage.setItem(
      `invitation_reserve_${Date.now()}`,
      JSON.stringify({
        name: reserveForm.name,
        phone: reserveForm.phone,
        date: reserveForm.date,
        remark: reserveForm.remark,
      }),
    );
  } catch {
    /* ignore */
  }
  store.showToast('预约信息已提交，我们会尽快与您联系', 'success');
  closeDialog();
};

// ========== 导出功能（复用 EditorHeader 的 html2canvas 逻辑） ==========
// 为避免重复逻辑，我们直接调用相同的逻辑：
const _getDeviceScreen = () =>
  document.querySelector('.device-screen') as HTMLElement | null;

// 导出项目数据（JSON）
const onExportProject = () => {
  try {
    const data = {
      projectName: store.projectName,
      pages: store.pages,
      currentPageId: store.currentPageId,
      zoom: store.zoom,
      pageTransition: store.pageTransition,
      hiddenMode: store.hiddenMode,
      canvasBackground: store.canvasBackground,
      audio: store.audio,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    a.download = `${data.projectName || 'invitation'}_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.invite.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    store.showToast('项目数据已导出', 'success');
    closeDialog();
  } catch (error) {
    console.error(error);
    store.showToast('导出失败', 'error');
  }
};

// 导出长图
const onExportLongImage = async () => {
  const screen = _getDeviceScreen();
  if (!screen) {
    store.showToast('未找到画布，无法生成长图', 'error');
    return;
  }
  store.showToast('正在生成长图...', 'info');
  try {
    const { default: html2canvas } = await import('html2canvas');
    const pageCanvases: HTMLCanvasElement[] = [];
    const pages = store.pages || [];
    const originalPageId = store.currentPageId;

    for (let i = 0; i < pages.length; i++) {
      store.selectPage(pages[i].id);
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      const s = document.querySelector('.device-screen') as HTMLElement | null;
      if (!s) continue;
      const cv = await html2canvas(s, {
        backgroundColor: pages[i].backgroundColor || '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      pageCanvases.push(cv);
    }

    const mergedWidth = Math.max(...pageCanvases.map((c) => c.width));
    const mergedHeight = pageCanvases.reduce((sum, c) => sum + c.height, 0);
    const merged = document.createElement('canvas');
    merged.width = mergedWidth;
    merged.height = mergedHeight;
    const ctx = merged.getContext('2d');
    if (!ctx) {
      store.showToast('长图生成失败', 'error');
      return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, mergedWidth, mergedHeight);
    let yOffset = 0;
    for (const c of pageCanvases) {
      ctx.drawImage(c, Math.floor((mergedWidth - c.width) / 2), yOffset);
      yOffset += c.height;
    }
    merged.toBlob((blob) => {
      if (!blob) {
        store.showToast('长图生成失败', 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      a.download = `${store.projectName || 'invitation'}_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.png`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      store.showToast('长图生成成功，已开始下载', 'success');
      if (originalPageId) store.selectPage(originalPageId);
      closeDialog();
    }, 'image/png');
  } catch (error) {
    console.error(error);
    store.showToast('长图生成失败', 'error');
  }
};

// 导出 PDF
const onExportPdf = async () => {
  const screen = _getDeviceScreen();
  if (!screen) {
    store.showToast('未找到画布，无法生成 PDF', 'error');
    return;
  }
  store.showToast('正在生成 PDF...', 'info');
  try {
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF: JsPDF } = await import('jspdf');
    const pages = store.pages || [];
    const originalPageId = store.currentPageId;
    const pdf = new JsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [screen.clientWidth, screen.clientHeight],
      compress: true,
    });

    for (let i = 0; i < pages.length; i++) {
      store.selectPage(pages[i].id);
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      const s = document.querySelector('.device-screen') as HTMLElement | null;
      if (!s) continue;
      const cv = await html2canvas(s, {
        backgroundColor: pages[i].backgroundColor || '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = cv.toDataURL('image/jpeg', 0.92);
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      if (i > 0) pdf.addPage([pw, ph], 'portrait');
      pdf.addImage(imgData, 'JPEG', 0, 0, pw, ph);
    }

    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    pdf.save(
      `${store.projectName || 'invitation'}_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.pdf`,
    );
    if (originalPageId) store.selectPage(originalPageId);
    store.showToast('PDF 生成成功，已开始下载', 'success');
    closeDialog();
  } catch (error) {
    console.error(error);
    store.showToast('PDF 生成失败', 'error');
  }
};

// 真正的 zip 构建（返回 Blob）
const _buildZip = async (
  entries: { blob: Blob; name: string }[],
): Promise<Blob> => {
  const parts: Uint8Array[] = [];
  const centralDirParts: Uint8Array[] = [];
  let offset = 0;
  const encoder = new TextEncoder();

  function crc(bytes: Uint8Array): number {
    let c = 0xff_ff_ff_ff;
    for (let i = 0; i < bytes.length; i++) {
      c ^= bytes[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xed_b8_83_20 : 0);
    }
    return Math.trunc(c ^ 0xff_ff_ff_ff);
  }

  for (const entry of entries) {
    const buf = new Uint8Array(await entry.blob.arrayBuffer());
    const nameBytes = encoder.encode(entry.name);
    const crcVal = crc(buf);
    const size = buf.length;

    const lfh = new Uint8Array(30 + nameBytes.length);
    const lfhView = new DataView(lfh.buffer);
    lfhView.setUint32(0, 0x04_03_4b_50, true);
    lfhView.setUint16(4, 20, true);
    lfhView.setUint16(6, 0x08_00, true);
    lfhView.setUint16(8, 0, true);
    lfhView.setUint16(10, 0, true);
    lfhView.setUint16(12, 0, true);
    lfhView.setUint32(14, crcVal, true);
    lfhView.setUint32(18, size, true);
    lfhView.setUint32(22, size, true);
    lfhView.setUint16(26, nameBytes.length, true);
    lfhView.setUint16(28, 0, true);
    lfh.set(nameBytes, 30);
    parts.push(lfh, buf);

    const cde = new Uint8Array(46 + nameBytes.length);
    const cdeView = new DataView(cde.buffer);
    cdeView.setUint32(0, 0x02_01_4b_50, true);
    cdeView.setUint16(4, 20, true);
    cdeView.setUint16(6, 20, true);
    cdeView.setUint16(8, 0x08_00, true);
    cdeView.setUint16(10, 0, true);
    cdeView.setUint16(12, 0, true);
    cdeView.setUint16(14, 0, true);
    cdeView.setUint32(16, crcVal, true);
    cdeView.setUint32(20, size, true);
    cdeView.setUint32(24, size, true);
    cdeView.setUint16(28, nameBytes.length, true);
    cdeView.setUint16(30, 0, true);
    cdeView.setUint16(32, 0, true);
    cdeView.setUint16(34, 0, true);
    cdeView.setUint32(38, 0, true);
    cdeView.setUint32(42, offset, true);
    cde.set(nameBytes, 46);
    centralDirParts.push(cde);

    offset += lfh.length + size;
  }

  const centralDirSize = centralDirParts.reduce((s, p) => s + p.length, 0);
  const endRec = new Uint8Array(22);
  const erView = new DataView(endRec.buffer);
  erView.setUint32(0, 0x06_05_4b_50, true);
  erView.setUint16(4, 0, true);
  erView.setUint16(6, 0, true);
  erView.setUint16(8, entries.length, true);
  erView.setUint16(10, entries.length, true);
  erView.setUint32(12, centralDirSize, true);
  erView.setUint32(16, offset, true);
  erView.setUint16(20, 0, true);

  const finalParts: Uint8Array[] = [...parts, ...centralDirParts, endRec];
  return new Blob(finalParts as unknown as BlobPart[], {
    type: 'application/zip',
  });
};

const onExportFramesZip = async () => {
  const screen = _getDeviceScreen();
  if (!screen) {
    store.showToast('未找到画布，无法生成序列帧', 'error');
    return;
  }
  store.showToast('正在生成序列帧 ZIP...', 'info');
  try {
    const { default: html2canvas } = await import('html2canvas');
    const pages = store.pages || [];
    const originalPageId = store.currentPageId;
    const entries: { blob: Blob; name: string }[] = [];

    for (let i = 0; i < pages.length; i++) {
      store.selectPage(pages[i].id);
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      const s = document.querySelector('.device-screen') as HTMLElement | null;
      if (!s) continue;
      const cv = await html2canvas(s, {
        backgroundColor: pages[i].backgroundColor || '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob: Blob = await new Promise((resolve, reject) => {
        cv.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/png',
        );
      });
      entries.push({
        name: `page_${String(i + 1).padStart(3, '0')}.png`,
        blob,
      });
    }

    if (entries.length === 0) {
      store.showToast('序列帧生成失败', 'error');
      return;
    }

    const zipBlob = await _buildZip(entries);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    a.download = `${store.projectName || 'invitation'}_frames_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.zip`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (originalPageId) store.selectPage(originalPageId);
    store.showToast('序列帧 ZIP 生成成功，已开始下载', 'success');
    closeDialog();
  } catch (error) {
    console.error(error);
    store.showToast('序列帧 ZIP 生成失败', 'error');
  }
};
</script>

<template>
  <footer class="editor-footer">
    <div class="footer-left">
      <i class="bi bi-info-circle"></i>
      <span>提示：选择元素后可以调整样式和位置</span>
      <span class="footer-sep">|</span>
      <span class="footer-info-item">
        <span class="info-label">当前项目：</span>
        <span class="info-value">{{ displayProjectName }}</span>
      </span>
      <span class="footer-info-item">
        <span class="info-label">当前页面：</span>
        <span class="info-value"
          >第{{ (store as any).currentPageIndex + 1 }}页（{{
            store.currentPage?.name || '-'
          }}）</span
        >
      </span>
      <span class="footer-info-item">
        <span class="info-label">元素数量：</span>
        <span class="info-value">{{
          store.currentPage?.elements.length || 0
        }}</span>
      </span>
      <span class="footer-info-item">
        <span class="info-label">上次保存：</span>
        <span class="info-value">{{ store.lastSavedTime || '-' }}</span>
      </span>
    </div>
    <div class="footer-right">
      <button class="footer-action-btn" @click="onOneClickCall">
        <i class="bi bi-telephone-fill"></i>
        <span>一键拨打</span>
      </button>
      <button class="footer-action-btn" @click="onOnlineConsult">
        <i class="bi bi-chat-dots-fill"></i>
        <span>在线咨询</span>
      </button>
      <button class="footer-action-btn" @click="onQuickReserve">
        <i class="bi bi-calendar-check-fill"></i>
        <span>快速预约</span>
      </button>
      <button class="footer-action-btn" @click="onHelp">
        <i class="bi bi-question-circle-fill"></i>
        <span>帮助</span>
      </button>
      <button
        class="footer-action-btn footer-action-btn-export"
        @click="onExport"
      >
        <i class="bi bi-upload"></i>
        <span>导出</span>
      </button>
    </div>

    <!-- 对话框（简单蒙层 + 内容） -->
    <Teleport to="body">
      <div
        v-if="dialogVisible"
        class="footer-dialog-mask"
        @click.self="closeDialog"
      >
        <div class="footer-dialog">
          <div class="footer-dialog-header">
            <span>{{ dialogTitle }}</span>
            <button class="footer-dialog-close" @click="closeDialog">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="footer-dialog-body">
            <!-- 一键拨打 -->
            <div v-if="dialogKey === 'call'" class="footer-dialog-content">
              <p>可拨打以下电话与我们联系：</p>
              <ul class="contact-list">
                <li>
                  <i class="bi bi-telephone"></i>
                  <span>客服电话：</span>
                  <a href="tel:400-123-4567">400-123-4567</a>
                </li>
                <li>
                  <i class="bi bi-headset"></i>
                  <span>技术支持：</span>
                  <a href="tel:400-765-4321">400-765-4321</a>
                </li>
                <li>
                  <i class="bi bi-geo-alt"></i>
                  <span>工作时间：周一至周日 9:00-21:00</span>
                </li>
              </ul>
            </div>

            <!-- 在线咨询 -->
            <div v-if="dialogKey === 'consult'" class="footer-dialog-content">
              <p>您可以通过以下方式联系在线客服：</p>
              <ul class="contact-list">
                <li>
                  <i class="bi bi-wechat"></i>
                  <span>微信客服：</span>
                  <strong>invitation-wedding</strong>
                </li>
                <li>
                  <i class="bi bi-qq"></i>
                  <span>QQ 咨询：</span>
                  <strong>123-456-789</strong>
                </li>
                <li>
                  <i class="bi bi-envelope"></i>
                  <span>邮件：</span>
                  <a href="mailto:support@example.com">support@example.com</a>
                </li>
              </ul>
            </div>

            <!-- 快速预约 -->
            <div v-if="dialogKey === 'reserve'" class="footer-dialog-content">
              <p>填写以下信息，我们将尽快与您联系：</p>
              <div class="form-row">
                <label>新人姓名：</label>
                <input
                  v-model="reserveForm.name"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="如：张三 &amp; 李四"
                />
              </div>
              <div class="form-row">
                <label>联系电话：</label>
                <input
                  v-model="reserveForm.phone"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="请输入手机号"
                />
              </div>
              <div class="form-row">
                <label>婚礼日期：</label>
                <input
                  v-model="reserveForm.date"
                  type="date"
                  class="form-control form-control-sm"
                />
              </div>
              <div class="form-row">
                <label>备注：</label>
                <textarea
                  v-model="reserveForm.remark"
                  class="form-control form-control-sm"
                  rows="3"
                  placeholder="可选"
                ></textarea>
              </div>
              <div class="form-actions">
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="resetReserveForm"
                >
                  清空
                </button>
                <button
                  class="btn btn-sm btn-primary"
                  @click="submitReserveForm"
                >
                  提交预约
                </button>
              </div>
            </div>

            <!-- 帮助 -->
            <div
              v-if="dialogKey === 'help'"
              class="footer-dialog-content help-content"
            >
              <h6>快捷键</h6>
              <ul>
                <li><kbd>Ctrl</kbd> + <kbd>Z</kbd>：撤销</li>
                <li><kbd>Ctrl</kbd> + <kbd>Y</kbd>：重做</li>
                <li><kbd>Delete</kbd>：删除选中元素</li>
              </ul>
              <h6>常用操作</h6>
              <ul>
                <li>在左侧拖拽元素到画布中添加元素</li>
                <li>点击画布元素可以选中并调整位置、大小</li>
                <li>在右侧「图层」中可以一键调整元素叠放顺序</li>
                <li>点击顶部「发布请柬」将生成可分享的网页、长图或 PDF</li>
                <li>在模板 tab 中可以一键应用预置设计模板</li>
              </ul>
              <h6>保存</h6>
              <p>
                项目内容会自动保存到浏览器本地存储（localStorage）中。如果清理浏览器缓存可能会丢失，重要内容请务必通过"导出"保存为数据文件。
              </p>
            </div>

            <!-- 导出 -->
            <div v-if="dialogKey === 'export'" class="footer-dialog-content">
              <p>选择要导出的内容：</p>
              <div class="export-grid">
                <button
                  class="btn btn-sm btn-outline-primary"
                  @click="onExportProject"
                >
                  <i class="bi bi-file-earmark-json"></i> 项目数据（.json）
                </button>
                <button
                  class="btn btn-sm btn-outline-primary"
                  @click="onExportLongImage"
                >
                  <i class="bi bi-image"></i> 全部页长图（.png）
                </button>
                <button
                  class="btn btn-sm btn-outline-primary"
                  @click="onExportPdf"
                >
                  <i class="bi bi-file-earmark-pdf"></i> 多页 PDF
                </button>
                <button
                  class="btn btn-sm btn-outline-primary"
                  @click="onExportFramesZip"
                >
                  <i class="bi bi-file-earmark-zip"></i> PNG 序列帧（.zip）
                </button>
              </div>
              <div class="export-hint">
                <i class="bi bi-lightbulb"></i>
                说明：项目数据可用于备份还原；图像/视频类导出会根据当前页面尺寸和元素渲染生成。
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </footer>
</template>

<style scoped>
.editor-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  font-size: 12px;
  color: #475569;
  background: #fff;
  border-top: 1px solid #e5e7eb;
}

.footer-left {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.footer-sep {
  color: #cbd5e1;
}

.footer-info-item {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.info-label {
  color: #94a3b8;
}

.info-value {
  font-weight: 500;
  color: #1f2937;
}

.footer-right {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.footer-action-btn {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 5px 10px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.footer-action-btn:hover {
  color: #1e3a8a;
  background: #eef2ff;
  border-color: #c7d2fe;
}

.footer-action-btn-export {
  color: #fff;
  background: #4f46e5;
  border-color: #4338ca;
}

.footer-action-btn-export:hover {
  color: #fff;
  background: #4338ca;
  border-color: #3730a3;
}

/* 对话框 */
.footer-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(15 23 42 / 45%);
}

.footer-dialog {
  width: 520px;
  max-width: calc(100% - 40px);
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 20px 50px rgb(15 23 42 / 20%);
}

.footer-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #e5e7eb;
}

.footer-dialog-close {
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  background: transparent;
  border: none;
}

.footer-dialog-close:hover {
  color: #111827;
}

.footer-dialog-body {
  padding: 16px;
  font-size: 13px;
  line-height: 1.7;
  color: #374151;
}

.footer-dialog-content p {
  margin: 0 0 10px;
}

.contact-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.contact-list li {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 6px;
  background: #f8fafc;
  border-radius: 6px;
}

.contact-list a {
  color: #4f46e5;
  text-decoration: none;
}

.contact-list a:hover {
  text-decoration: underline;
}

.form-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.form-row label {
  flex-shrink: 0;
  width: 80px;
  color: #64748b;
}

.form-row input,
.form-row textarea {
  flex: 1;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 10px;
}

.help-content h6 {
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.help-content kbd {
  padding: 1px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: #334155;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  box-shadow: 0 1px 0 rgb(0 0 0 / 5%);
}

.help-content ul {
  padding-left: 18px;
  margin: 0;
}

.help-content li {
  margin-bottom: 4px;
}

.export-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 4px;
}

.export-hint {
  padding: 10px 12px;
  margin-top: 16px;
  font-size: 12px;
  color: #64748b;
  background: #f8fafc;
  border-radius: 6px;
}
</style>
