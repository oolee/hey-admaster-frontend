import { getPublish } from '../../../utils/publish-store';

// ========== HTML 生成函数（与 h5/[id].get.ts 版本同步） ==========

function escapeHtml(s: string): string {
  if (s === null) return '';
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cssColor(bg: string | undefined, opacity: number | undefined): string {
  if (!bg || bg === 'transparent') return 'transparent';
  if (bg.startsWith('rgb(') || bg.startsWith('rgba(')) return bg;
  const op = opacity === null || opacity === undefined ? 1 : opacity;
  if (bg.startsWith('#') && (bg.length === 7 || bg.length === 4)) {
    const hex =
      bg.length === 4
        ? [...bg.slice(1)].map((c) => c + c).join('')
        : bg.slice(1);
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${op})`;
  }
  return bg;
}

/** 入场动画类 */
function entryAnimClass(type: string | undefined): string {
  const map: Record<string, string> = {
    fadeIn: 'anim-fadeIn',
    slideInUp: 'anim-slideInUp',
    slideInDown: 'anim-slideInDown',
    slideInLeft: 'anim-slideInLeft',
    slideInRight: 'anim-slideInRight',
    zoomIn: 'anim-zoomIn',
    bounceIn: 'anim-bounceIn',
    flipIn: 'anim-flipIn',
  };
  const t = type || 'fadeIn';
  return `h5-el anim-ready ${map[t] || 'anim-fadeIn'}`;
}

function renderElement(el: any): string {
  if (!el || !el.type) return '';
  const x = el.x ?? 0;
  const y = el.y ?? 0;
  const w = el.width ?? 100;
  const h = el.height ?? 100;
  const rot = el.rotation ?? 0;
  const z = el.zIndex ?? 0;
  const visible = el.visible !== false;
  const bg = el.backgroundColor || 'transparent';
  const bgOpacity = el.backgroundOpacity ?? 1;
  const borderR = el.borderRadius ?? 0;
  const animDur = el.entryDuration ?? 0.4;

  const outer =
    `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;` +
    `transform:rotate(${rot}deg);z-index:${z};` +
    `background-color:${cssColor(bg, bgOpacity)};` +
    `overflow:hidden;animation-duration:${animDur}s;${
      borderR ? `border-radius:${borderR}px;` : ''
    }${visible ? '' : 'visibility:hidden;'}`;

  const t = el.type;

  if (t === 'text') {
    const ff = el.fontFamily || 'Microsoft YaHei';
    const fs = el.fontSize || 16;
    const fw = el.fontWeight || 'normal';
    const ta = el.textAlign || 'center';
    const color = el.textColor || '#333333';
    return `<div class="${entryAnimClass(el.entryAnimation)}" style="${outer}"><div class="inner" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;word-break:break-word;white-space:pre-wrap;font-family:${ff};font-size:${fs}px;font-weight:${fw};text-align:${ta};color:${color};box-sizing:border-box;">${escapeHtml(el.text || '')}</div></div>`;
  }

  if (t === 'image') {
    const fit = el.imageFit || 'cover';
    const imgOp = el.imageOpacity ?? 1;
    const imgRadius = el.imageRadius ?? 0;
    // 图片滤镜（与编辑器 imageStyle 一致）
    const imgFilter = el.imageFilter || 'original';
    let filterCss = 'none';
    if (imgFilter === 'grayscale') filterCss = 'grayscale(1)';
    else if (imgFilter === 'sepia') filterCss = 'sepia(0.8)';
    else if (imgFilter === 'blur') filterCss = 'blur(2px)';
    else if (imgFilter === 'brightness') filterCss = 'brightness(1.3)';
    else if (imgFilter === 'contrast') filterCss = 'contrast(1.3)';
    // 形状裁切（与编辑器 imageStyle 一致）
    const imgCrop = el.imageCrop || 'none';
    let cropBr = '0';
    let cropCp = '';
    if (imgCrop === 'circle') cropBr = '50%';
    else if (imgCrop === 'rounded') cropBr = '12px';
    else if (imgCrop === 'flower') cropBr = '40% 60% 30% 70% / 60% 40% 70% 30%';
    else if (imgCrop === 'triangle')
      cropCp = 'polygon(50% 0%, 0% 100%, 100% 100%)';
    else if (imgCrop === 'hexagon')
      cropCp = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    // 翻转（与编辑器一致）
    const flipSx = el.flip && el.flip.horizontal ? -1 : 1;
    const flipSy = el.flip && el.flip.vertical ? -1 : 1;
    const flipTransform =
      flipSx !== 1 || flipSy !== 1
        ? `transform:scale(${flipSx},${flipSy});`
        : '';
    if (el.imageUrl) {
      return `<div class="${entryAnimClass(el.entryAnimation)} h5-el-image" style="${outer}"><div class="inner" style="width:100%;height:100%;${cropCp ? `clip-path:${cropCp};overflow:hidden;` : ''}"><img src="${escapeHtml(el.imageUrl)}" style="width:100%;height:100%;object-fit:${fit};opacity:${imgOp};border-radius:${cropBr};${flipTransform}filter:${filterCss};${imgRadius ? `border-radius:${imgRadius}px;` : ''}display:block;" alt=""></div></div>`;
    }
    return `<div class="${entryAnimClass(el.entryAnimation)} h5-el-image" style="${outer}"><div class="inner" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f5f5f5;color:#ccc;font-size:14px;"><i class="bi bi-image" style="font-size:32px;margin-bottom:8px;"></i>请添加图片</div></div>`;
  }

  if (t === 'decoration') {
    const ds = el.decorationSize || 32;
    const dc = el.decorationColor || '#ff6b6b';
    return `<div class="${entryAnimClass(el.entryAnimation)} h5-el-decoration" style="${outer}"><div class="inner" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:${ds}px;color:${dc};"><i class="bi bi-suit-heart-fill"></i></div></div>`;
  }

  if (t === 'icon') {
    const is2 = el.iconSize || 24;
    const ic = el.iconColor || '#333333';
    const iconMap: Record<string, string> = {
      heart: 'bi bi-heart-fill',
      star: 'bi bi-star-fill',
      flower: 'bi bi-flower1',
      ring: 'bi bi-gem',
      diamond: 'bi bi-gem',
    };
    const cls = iconMap[el.iconType || 'heart'] || 'bi bi-heart-fill';
    return `<div class="${entryAnimClass(el.entryAnimation)} h5-el-icon" style="${outer}"><div class="inner" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:${is2}px;color:${ic};"><i class="${cls}"></i></div></div>`;
  }

  if (t === 'shape') {
    const sbg = el.shapeBackground || '#ffcccc';
    let sr = '0';
    if (el.shapeType === 'circle') sr = '50%';
    else if (el.shapeType === 'rounded') sr = '12px';
    else if (el.shapeType === 'heart') sr = '50%';
    return `<div class="${entryAnimClass(el.entryAnimation)} h5-el-shape" style="${outer}"><div class="inner" style="width:100%;height:100%;background:${sbg};border-radius:${sr};"></div></div>`;
  }

  if (t === 'border') {
    const bc = el.borderColor || '#4b5563';
    const bw = el.borderWidth || 2;
    const bs = el.borderStyle || 'solid';
    const br = el.borderRadius || 0;
    return `<div class="${entryAnimClass(el.entryAnimation)} h5-el-border" style="${outer}"><div class="inner" style="width:100%;height:100%;border:${bw}px ${bs} ${bc};border-radius:${br}px;box-sizing:border-box;"></div></div>`;
  }

  return '';
}

function buildHtml(data: any, name: string): string {
  const pages: any[] = data.pages || [];
  const canvasWidth: number = data.canvasWidth || 320;
  const canvasHeight: number = data.canvasHeight || 628;
  const pageTransition: string = data.pageTransition || 'slide';
  const totalPages = pages.length;
  const displayName = escapeHtml(name || '请柬');

  const slidesHtml = pages
    .map((p) => {
      const bg = p?.backgroundColor || '#ffffff';
      const elements = (p?.elements || []) as any[];
      const innerHtml = elements.map((el) => renderElement(el)).join('');
      return `<div class="h5-slide" style="width:${canvasWidth}px;height:${canvasHeight}px;background:${bg};position:relative;flex-shrink:0;">${innerHtml}</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<title>${displayName}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { width: 100%; height: 100%; font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; overflow: hidden; }

/* ===== 舞台 ===== */
.h5-stage { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; touch-action: none; -webkit-user-select: none; user-select: none; }

/* ===== 画布内容 ===== */
.h5-stage-content { position: relative; width: ${canvasWidth}px; height: ${canvasHeight}px; transform-origin: center center; will-change: transform; overflow: hidden; }

/* ===== 轨道 ===== */
.h5-track { position: absolute; top: 0; left: 0; width: ${canvasWidth * totalPages}px; height: ${canvasHeight}px; display: flex; will-change: transform; transform: translate3d(0,0,0); }
.h5-track.animate-slide, .h5-track.animate-fade, .h5-track.animate-zoom { transition: transform 0.35s ease; }
.h5-track.animate-flip { transition: transform 0.45s ease; }
.h5-slide { position: relative; flex-shrink: 0; width: ${canvasWidth}px; height: ${canvasHeight}px; }

/* ===== 手机端 ===== */
body.h5-mobile { background: #ffffff; }

/* ===== PC 端：带手机框 ===== */
body.h5-pc { background: linear-gradient(135deg, #f5f0e6 0%, #e8ddc8 100%); }
body.h5-pc .h5-stage-content {
  border-radius: 36px;
  border: 10px solid #1a1a1a;
  box-shadow: 0 20px 60px rgba(0,0,0,0.35), inset 0 0 0 2px #f5deb3;
  overflow: hidden;
}
body.h5-pc .h5-stage-content::before {
  content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 90px; height: 18px; background: #1a1a1a;
  border-bottom-left-radius: 10px; border-bottom-right-radius: 10px; z-index: 100;
}

.h5-pc-header { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); text-align: center; z-index: 10; }
.h5-pc-header .title { color: #8a3a4a; font-size: 20px; letter-spacing: 4px; font-weight: 600; }
.h5-pc-header .sub { color: #7a6b4e; font-size: 12px; margin-top: 6px; }

/* ===== 翻页指示器 ===== */
.h5-indicator-wrap { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 4px; pointer-events: none; z-index: 50; }
.h5-dots { display: flex; gap: 5px; align-items: center; }
.h5-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(0,0,0,0.25); transition: all 0.32s ease; }
.h5-dot.active { width: 18px; border-radius: 4px; background: rgba(0,0,0,0.65); }
.h5-page-num { font-size: 11px; letter-spacing: 0.5px; color: rgba(0,0,0,0.5); }

/* ===== PC 端左右翻页按钮 ===== */
.h5-nav-left, .h5-nav-right {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(255,255,255,0.9); border: 1px solid rgba(0,0,0,0.15);
  color: #333; font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 40;
}
.h5-nav-left { left: 10px; }
.h5-nav-right { right: 10px; }
.h5-nav-left:hover, .h5-nav-right:hover { background: #e94560; color: #fff; border-color: #e94560; }

body.h5-mobile .h5-nav-left, body.h5-mobile .h5-nav-right { display: none; }

/* ===== 元素入场动画 ===== */
@keyframes animFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
@keyframes animSlideInUp { 0% { opacity: 0; transform: translateY(40px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes animSlideInDown { 0% { opacity: 0; transform: translateY(-40px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes animSlideInLeft { 0% { opacity: 0; transform: translateX(-40px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes animSlideInRight { 0% { opacity: 0; transform: translateX(40px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes animZoomIn { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
@keyframes animBounceIn {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes animFlipIn { 0% { opacity: 0; transform: perspective(600px) rotateX(-60deg); } 100% { opacity: 1; transform: perspective(600px) rotateX(0); } }

.h5-el { position: absolute; transform-origin: center center; }
.h5-el.anim-ready { opacity: 0; animation-fill-mode: both; animation-timing-function: ease-out; }
.h5-el.anim-fadeIn { animation-name: animFadeIn; }
.h5-el.anim-slideInUp { animation-name: animSlideInUp; }
.h5-el.anim-slideInDown { animation-name: animSlideInDown; }
.h5-el.anim-slideInLeft { animation-name: animSlideInLeft; }
.h5-el.anim-slideInRight { animation-name: animSlideInRight; }
.h5-el.anim-zoomIn { animation-name: animZoomIn; }
.h5-el.anim-bounceIn { animation-name: animBounceIn; }
.h5-el.anim-flipIn { animation-name: animFlipIn; }
</style>
</head>
<body id="body">
  <div class="h5-stage" id="stage">
    <div class="h5-stage-content" id="stageContent">
      <div class="h5-track" id="track">
${slidesHtml}
      </div>
      ${
        totalPages > 1
          ? `
      <button class="h5-nav-left" id="navLeft"><i class="bi bi-chevron-left"></i></button>
      <button class="h5-nav-right" id="navRight"><i class="bi bi-chevron-right"></i></button>`
          : ''
      }
      <div class="h5-indicator-wrap" id="indicatorWrap"${totalPages < 2 ? ' style="display:none;"' : ''}>
        <div class="h5-dots" id="dots"></div>
        <span class="h5-page-num" id="pageNum">1 / ${totalPages}</span>
      </div>
    </div>
  </div>

<script>
(function() {
  var _pages = ${JSON.stringify(pages)};
  var _cw = ${canvasWidth};
  var _ch = ${canvasHeight};
  var _transition = '${pageTransition}';
  var _total = _pages.length;
  var _idx = 0;
  var _name = '${displayName}';

  // ========== 移动端判断：视口宽度 < 768px ==========
  function detectIsMobile() { return window.innerWidth < 768; }
  var _isMobile = detectIsMobile();

  var body = document.getElementById('body');
  var stageContent = document.getElementById('stageContent');
  var track = document.getElementById('track');
  var dotsEl = document.getElementById('dots');
  var pageNumEl = document.getElementById('pageNum');
  var stageEl = document.getElementById('stage');

  body.classList.add(_isMobile ? 'h5-mobile' : 'h5-pc');

  if (!_isMobile) {
    var header = document.createElement('div');
    header.className = 'h5-pc-header';
    header.innerHTML = '<div class="title">' + _name + '</div><div class="sub"><i class="bi bi-phone"></i> 手机扫码获得最佳体验</div>';
    document.body.appendChild(header);
  }

  // 构建圆点指示器
  if (dotsEl && _total > 1) {
    for (var i = 0; i < _total; i++) {
      var dot = document.createElement('span');
      dot.className = 'h5-dot';
      if (i === 0) dot.classList.add('active');
      dotsEl.appendChild(dot);
    }
  }

  // 缩放适配：手机等比填满视口，PC 留出边距显示手机框
  // 同时将 body/stage 背景设为当前页背景色，消除画布外白边
  var pageBgs = _pages.map(function(p) { return (p && p.backgroundColor) ? p.backgroundColor : '#ffffff'; });
  function applyBgAndScale() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var scale;
    if (_isMobile) {
      scale = Math.min(vw / _cw, vh / _ch);
    } else {
      var availH = vh - 140;
      scale = Math.min(availH / _ch, vw / (_cw + 80), 1.1);
      if (scale < 0.4) scale = 0.4;
    }
    stageContent.style.transform = 'scale(' + scale + ')';
    // 手机端：stage 背景与当前页背景色一致；PC 端：保留渐变
    if (_isMobile && stageEl) stageEl.style.background = pageBgs[_idx] || '#ffffff';
  }
  applyBgAndScale();

  // 窗口尺寸变化时重新检测设备类型并重算缩放
  window.addEventListener('resize', function() {
    var newIsMobile = detectIsMobile();
    if (newIsMobile !== _isMobile) {
      _isMobile = newIsMobile;
      body.classList.remove('h5-mobile', 'h5-pc');
      body.classList.add(_isMobile ? 'h5-mobile' : 'h5-pc');
      var existing = document.querySelector('.h5-pc-header');
      if (existing) existing.remove();
      if (!_isMobile) {
        var h = document.createElement('div');
        h.className = 'h5-pc-header';
        h.innerHTML = '<div class="title">' + _name + '</div><div class="sub"><i class="bi bi-phone"></i> 手机扫码获得最佳体验</div>';
        document.body.appendChild(h);
      }
    }
    applyBgAndScale();
  });

  // 更新指示器
  function updateIndicator() {
    if (dotsEl) {
      var dots = dotsEl.querySelectorAll('.h5-dot');
      dots.forEach(function(d, i) { d.classList.toggle('active', i === _idx); });
    }
    if (pageNumEl) pageNumEl.textContent = (_idx + 1) + ' / ' + _total;
  }

  // 元素入场动画
  function playEntryAnimations(pageIdx) {
    var slide = track.children[pageIdx];
    if (!slide) return;
    var els = slide.querySelectorAll('.h5-el');
    els.forEach(function(el, i) { el.style.animationDelay = (i * 0.08) + 's'; });
  }

  // ========== 边界判断：第一页不能往前，最后一页不能往后 ==========
  function canGoPrev() { return _idx > 0; }
  function canGoNext() { return _idx < _total - 1; }

  // 翻页按钮禁用状态同步
  function updateNavButtons() {
    var leftBtn = document.getElementById('navLeft');
    var rightBtn = document.getElementById('navRight');
    if (leftBtn) leftBtn.style.opacity = canGoPrev() ? '1' : '0.35';
    if (rightBtn) rightBtn.style.opacity = canGoNext() ? '1' : '0.35';
  }

  // 翻页
  function applyTrack(animated) {
    track.classList.remove('animate-slide', 'animate-fade', 'animate-zoom', 'animate-flip');
    if (animated && _total > 1) {
      var t = _transition === 'none' ? 'slide' : _transition;
      track.classList.add('animate-' + t);
    }
    track.style.transform = 'translate3d(' + (-_idx * _cw) + 'px, 0, 0)';
    updateIndicator();
    updateNavButtons();
    // 翻页时同步更新 stage 背景（仅手机端），保持"不漏白边"
    if (_isMobile && stageEl) stageEl.style.background = pageBgs[_idx] || '#ffffff';
    setTimeout(function() { playEntryAnimations(_idx); }, animated ? 80 : 30);
  }

  function goTo(index) {
    if (_total <= 1) return;
    if (index < 0 || index > _total - 1 || index === _idx) return;
    _idx = index;
    applyTrack(true);
  }

  // 左右按钮
  var leftBtn = document.getElementById('navLeft');
  var rightBtn = document.getElementById('navRight');
  if (leftBtn) leftBtn.addEventListener('click', function() { goTo(_idx - 1); });
  if (rightBtn) rightBtn.addEventListener('click', function() { goTo(_idx + 1); });

  // 键盘导航
  window.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') goTo(_idx - 1);
    if (e.key === 'ArrowRight') goTo(_idx + 1);
  });

  // ========== 触摸 / 鼠标滑动翻页（带边界） ==========
  var startX = 0, startY = 0, deltaX = 0, dragging = false, moved = false;
  // 边界判断

  function onStart(e) {
    if (_total <= 1) return;
    var pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX; startY = pt.clientY; deltaX = 0; dragging = true; moved = false;
    track.classList.remove('animate-slide', 'animate-fade', 'animate-zoom', 'animate-flip');
    if (!e.touches) e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    var pt = e.touches ? e.touches[0] : e;
    deltaX = pt.clientX - startX;
    var dy = Math.abs(pt.clientY - startY);
    if (Math.abs(deltaX) > dy) {
      moved = true;
      // 边界阻力：第一页往右滑、最后一页往左滑时减少位移
      var effectiveDelta = deltaX;
      if (!canGoPrev() && deltaX > 0) effectiveDelta = deltaX * 0.3;
      else if (!canGoNext() && deltaX < 0) effectiveDelta = deltaX * 0.3;
      track.style.transform = 'translate3d(' + (-_idx * _cw + effectiveDelta) + 'px, 0, 0)';
      if (e.cancelable) { try { e.preventDefault(); } catch (err) {} }
    }
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    // 关键修复：点击（tap，没有真正的滑动）不触发任何翻页或入场动画重放
    if (!moved) { deltaX = 0; return; }
    var threshold = Math.max(30, Math.min(_cw * 0.15, 60));
    if (deltaX < -threshold && canGoNext()) goTo(_idx + 1);
    else if (deltaX > threshold && canGoPrev()) goTo(_idx - 1);
    else applyTrack(true);
    deltaX = 0;
  }

  stageEl.addEventListener('touchstart', onStart, { passive: true });
  stageEl.addEventListener('touchmove', onMove, { passive: false });
  stageEl.addEventListener('touchend', onEnd);
  stageEl.addEventListener('touchcancel', onEnd);
  stageEl.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  // 启动
  applyTrack(false);
})();
</script>
</body>
</html>`;
}

// ========== 路由处理器 ==========

export default defineEventHandler(async (event: any) => {
  // 支持 /h5/:name/:id 和 /h5/:id 两种路由
  const parts = (event.node?.req?.url || '')
    .split('/')
    .filter((x: string) => x && x !== 'h5');
  let id = parts[parts.length - 1] || '';
  id = id.split('?')[0];

  const record = getPublish(id);
  if (!record || !record.pages || record.pages.length === 0) {
    event.node.res.statusCode = 404;
    event.node.res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>未找到</title><style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;}</style></head><body><div><h2>请柬链接已失效</h2><p style="color:#888;font-size:14px;">请从编辑器重新生成分享链接</p></div></body></html>`;
  }

  const displayName = decodeURIComponent(
    (event.context?.params?.name as string) || record.name || '请柬',
  );
  event.node.res.setHeader('Content-Type', 'text/html; charset=utf-8');
  event.node.res.setHeader('Cache-Control', 'no-cache');
  return buildHtml(record, displayName);
});
