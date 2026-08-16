<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft, ZoomIn, ZoomOut, Maximize2, Save, Play, Trash2, Sparkles, X,
  Copy, Edit3, Move, ChevronDown, PanelLeftClose, PanelLeft,
  Upload, Loader2, Check, AlertCircle, History, Trash, Download, Layers, Plus,
  BookOpen, Volume2, ChevronLeft, ChevronRight, GitBranch, Share2, RefreshCw, Wand2,
  PackageOpen
} from 'lucide-vue-next'
import { CANVAS_NODES, NODE_CATEGORIES, PORT_COLOR, nodeMeta, canConnect, TEXT_LLM_DEFAULT, MULTIMODAL_LLM_DEFAULT } from '@/skills/canvas-nodes'
import { useCanvasStore } from '@/stores/canvas'
import { toast } from '@/utils/toast'
import { listVersions, saveVersion, loadVersionSnapshot, deleteVersion } from '@/utils/version'

const router = useRouter()
const store = useCanvasStore()

const canvasRef = ref(null)
const dragging = ref(null) // 节点拖动 / 画布平移 / 端口拉线 / 框选
const mode = ref('select')
const contextMenu = ref({ visible: false, x: 0, y: 0, items: [], title: '', forNodeId: null })
const portClickMenu = ref({ visible: false, x: 0, y: 0, nodeId: null, port: null })
const sidebarCollapsed = ref(false) // 任务 42：节点库折叠
const showAlbumModal = ref(false)    // 任务 43：翻书 Modal
const albumNodeId = ref(null)
const albumMode = ref('single')      // single | double
const albumPage = ref(0)

const zoomPercent = computed(() => Math.round(store.transform.scale * 100))

/* 屏幕坐标 → 世界坐标 */
function screenToWorld(sx, sy) {
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    wx: (sx - rect.left - store.transform.x) / store.transform.scale,
    wy: (sy - rect.top - store.transform.y) / store.transform.scale
  }
}

/* ===== 端口位置 ===== */
function portPos(nodeId, type) {
  const n = store.nodes.find((v) => v.id === nodeId)
  if (!n) return { x: 0, y: 0 }
  const m = nodeMeta(n.type)
  if (!m) return { x: 0, y: 0 }
  const cx = type === 'in' ? n.x : n.x + m.w
  const cy = n.y + m.h / 2
  return { x: cx, y: cy }
}

function edgePath(e) {
  const a = portPos(e.from, 'out')
  const b = portPos(e.to, 'in')
  if (!a || !b) return ''
  const dx = Math.max(40, Math.abs(b.x - a.x) / 2)
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`
}
function edgeMid(e) {
  const a = portPos(e.from, 'out')
  const b = portPos(e.to, 'in')
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}
function edgeColor(e) {
  const fromNode = store.nodes.find((n) => n.id === e.from)
  const meta = fromNode ? nodeMeta(fromNode.type) : null
  return PORT_COLOR[meta?.produces] || PORT_COLOR.any
}

/* 与选中节点相关的连线（高亮） */
const highlightEdges = computed(() => store.selectedId ? new Set(store.relatedEdges(store.selectedId)) : new Set())

/* ===== 鼠标事件 ===== */
function onMouseDown(e) {
  if (e.button === 1) {
    // 中键：拖动画布
    dragging.value = {
      type: 'pan',
      startX: e.clientX, startY: e.clientY,
      origX: store.transform.x, origY: store.transform.y
    }
    e.preventDefault()
    return
  }
  if (e.button !== 0) return
  const target = e.target

  // 端口：拖动连接线
  if (target.dataset?.port) {
    const [nodeId, port] = target.dataset.port.split(':')
    dragging.value = { type: 'edge', fromId: nodeId, fromPort: port }
    e.preventDefault()
    e.stopPropagation()
    return
  }

  // 节点
  const nodeEl = target.closest('[data-node-id]')
  if (nodeEl) {
    const id = nodeEl.dataset.nodeId
    const n = store.nodes.find((v) => v.id === id)
    if (!n) return
    // 多选逻辑：shift+点击切换
    if (e.shiftKey) {
      toggleMultiSelect(id)
      store.selectNode(id)
    } else {
      store.selectNode(id)
      clearMultiSelect()
    }
    const { wx, wy } = screenToWorld(e.clientX, e.clientY)
    dragging.value = { type: 'node', id, offsetX: wx - n.x, offsetY: wy - n.y }
    e.preventDefault()
    return
  }

  // 空白：开始框选（左键）
  clearMultiSelect()
  store.selectNode(null)
  isBoxSelecting.value = true
  boxSelectRect.value = { sx: e.clientX, sy: e.clientY, ex: e.clientX, ey: e.clientY }
  dragging.value = { type: 'box', startX: e.clientX, startY: e.clientY }
}

/* 拖拽悬停目标：valid | invalid */
const dragHover = ref(null)

function onMouseMove(e) {
  if (!dragging.value) return
  const d = dragging.value
  if (d.type === 'pan') {
    store.setTransform({ x: d.origX + (e.clientX - d.startX), y: d.origY + (e.clientY - d.startY) })
    return
  }
  if (d.type === 'node') {
    const { wx, wy } = screenToWorld(e.clientX, e.clientY)
    store.moveNode(d.id, Math.round(wx - d.offsetX), Math.round(wy - d.offsetY))
    return
  }
  if (d.type === 'box') {
    boxSelectRect.value = { sx: d.startX, sy: d.startY, ex: e.clientX, ey: e.clientY }
    // 实时更新选区内的节点
    setMultiSelect(getBoxedNodes())
    return
  }
  if (d.type === 'edge') {
    d.x = e.clientX
    d.y = e.clientY
    // 悬停目标检测（可连接 / 不可连接）
    dragHover.value = null
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const portEl = el?.closest?.('[data-port]')
    if (portEl?.dataset?.port) {
      const [toId, toPort] = portEl.dataset.port.split(':')
      if (toId !== d.fromId && toPort === 'in') {
        dragHover.value = {
          type: store.canConnectNodes(d.fromId, toId) ? 'valid' : 'invalid',
          nodeId: toId
        }
      }
    }
  }
}

function onMouseUp(e) {
  if (!dragging.value) return
  if (dragging.value.type === 'box') {
    isBoxSelecting.value = false
    boxSelectRect.value = null
    if (selectedIds.value.length > 0) {
      // 多选模式下保留最后选中的节点作为 single selected
      store.selectNode(selectedIds.value[0])
    }
  }
  if (dragging.value.type === 'edge') {
    const portEl = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-port]')
    if (portEl?.dataset?.port) {
      const [toId, toPort] = portEl.dataset.port.split(':')
      if (toPort === 'in' && toId !== dragging.value.fromId) {
        const ok = store.addEdge(dragging.value.fromId, toId)
        if (!ok) toast.info('✕ 无法连接：端口类型不匹配')
      }
    }
  }
  dragging.value = null
  dragHover.value = null
}

/* 拖拽引导线：起点=源端口（世界→屏幕），终点=鼠标 */
function dragEdgePath() {
  if (!dragging.value || dragging.value.type !== 'edge') return ''
  const src = portPos(dragging.value.fromId, 'out')
  const rect = canvasRef.value.getBoundingClientRect()
  const sx = src.x * store.transform.scale + store.transform.x
  const sy = src.y * store.transform.scale + store.transform.y
  const ex = dragging.value.x - rect.left
  const ey = dragging.value.y - rect.top
  const dx = Math.max(50, Math.abs(ex - sx) / 2)
  return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${ex - dx} ${ey}, ${ex} ${ey}`
}

function dragEdgeColor() {
  if (dragHover.value?.type === 'invalid') return 'var(--color-error)'
  if (dragHover.value?.type === 'valid') return 'var(--color-success)'
  return 'var(--color-accent)'
}

function isSelected(id) {
  return store.selectedId === id
}

function onWheel(e) {
  e.preventDefault()
  const delta = e.deltaY < 0 ? 1.08 : 1 / 1.08
  const next = Math.max(0.4, Math.min(2, store.transform.scale * delta))
  store.setTransform({ scale: next })
}

/* ===== 端口单击：弹下游节点菜单 ===== */
function onPortClick(e, nodeId, port) {
  e.stopPropagation()
  e.preventDefault()
  // 仅输出端口点击有意义（用户想看下游）
  if (port !== 'out') return
  const srcNode = store.nodes.find((n) => n.id === nodeId)
  if (!srcNode) return
  const srcMeta = nodeMeta(srcNode.type)
  if (!srcMeta?.produces) return
  const candidates = CANVAS_NODES.filter((n) =>
    n.accepts.includes(srcMeta.produces) || n.accepts.includes('any')
  )
  portClickMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    nodeId,
    port,
    candidates
  }
  document.addEventListener('click', closePortClickMenu, { once: true })
}

function closePortClickMenu() {
  portClickMenu.value.visible = false
}

function pickFromPortClick(candidate) {
  const srcNode = store.nodes.find((n) => n.id === portClickMenu.value.nodeId)
  if (!srcNode) return
  const srcMeta = nodeMeta(srcNode.type)
  const newId = store.addNode(candidate.id, srcNode.x + srcMeta.w + 80, srcNode.y + 20)
  if (newId) store.addEdge(srcNode.id, newId)
  closePortClickMenu()
}

/* ===== 画布右键空白：弹节点添加分类菜单 ===== */
function onCanvasContextMenu(e) {
  e.preventDefault()
  const nodeEl = e.target.closest('[data-node-id]')
  if (nodeEl) return // 节点右键由节点自身处理
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    title: '添加节点',
    forNodeId: null,
    items: NODE_CATEGORIES.map((cat) => ({
      type: cat.id,
      label: cat.label,
      isGroup: true,
      children: CANVAS_NODES.filter((n) => n.category === cat.id)
    }))
  }
  document.addEventListener('click', closeContextMenu, { once: true })
}

/* 节点右键：操作菜单 */
function onNodeContextMenu(e, node) {
  e.preventDefault()
  e.stopPropagation()
  store.selectNode(node.id)
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    title: '节点操作',
    forNodeId: node.id,
    items: [
      { key: 'copy',     label: '复制节点',   icon: Copy },
      { key: 'rename',   label: '重命名',     icon: Edit3 },
      { key: 'run',      label: '运行此节点', icon: Play },
      { key: 'duplicateChain', label: '复制整条链路', icon: Sparkles },
      { divider: true },
      { key: 'delete',   label: '删除节点',   icon: Trash2, danger: true },
      { key: 'disconnect',label: '移除所有连接',icon: X, danger: true }
    ]
  }
  document.addEventListener('click', closeContextMenu, { once: true })
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

function onContextAction(action) {
  const node = contextMenu.value.forNodeId ? store.nodes.find((n) => n.id === contextMenu.value.forNodeId) : null
  switch (action.key) {
    case 'copy': {
      if (node) {
        const id = store.copyNode(node.id)
        toast.success('已复制节点')
      }
      break
    }
    case 'rename': {
      if (node) {
        const name = prompt('重命名节点', node.label)
        if (name) store.updateNodeLabel(node.id, name)
      }
      break
    }
    case 'run': {
      if (node) {
        store.runSingleNode(node.id)
        toast.info(`运行节点：${node.label}`)
      }
      break
    }
    case 'duplicateChain': {
      // 复制从该节点开始的下游所有节点
      if (node) {
        const adj = {}
        store.edges.forEach((e) => {
          if (!adj[e.from]) adj[e.from] = []
          adj[e.from].push(e.to)
        })
        const collected = new Set([node.id])
        const queue = [node.id]
        while (queue.length) {
          const id = queue.shift()
          ;(adj[id] || []).forEach((t) => {
            if (!collected.has(t)) { collected.add(t); queue.push(t) }
          })
        }
        // 深拷贝节点 + 边，建立新 id 映射
        const idMap = {}
        const offset = { x: 40, y: 40 }
        for (const nid of collected) {
          const src = store.nodes.find((n) => n.id === nid)
          if (!src) continue
          const newId = 'n-' + src.type + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
          idMap[nid] = newId
          store.nodes.push({
            ...JSON.parse(JSON.stringify(src)),
            id: newId,
            x: src.x + offset.x,
            y: src.y + offset.y,
            status: 'idle',
            result: undefined
          })
        }
        // 复制边
        for (const e of store.edges) {
          if (idMap[e.from] && idMap[e.to]) {
            store.edges.push({ id: 'e-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), from: idMap[e.from], to: idMap[e.to] })
          }
        }
        toast.success(`已复制 ${collected.size} 个节点`)
      }
      break
    }
    case 'delete': {
      if (node) { store.removeNode(node.id); toast.success('已删除节点') }
      break
    }
    case 'disconnect': {
      if (node) {
        store.edges = store.edges.filter((e) => e.from !== node.id && e.to !== node.id)
        toast.success('已移除所有连接')
      }
      break
    }
  }
  closeContextMenu()
}

/* ===== 操作按钮 ===== */
function loadTemplate() {
  store.loadTemplate12P()
  toast.success('已加载「12P 画册示例」')
}
function clearCanvas() {
  if (!store.nodeCount || confirm('确认清空画布？')) { store.clear(); toast.info('画布已清空') }
}
function zoomIn()  { store.setTransform({ scale: Math.min(2, store.transform.scale * 1.2) }) }
function zoomOut() { store.setTransform({ scale: Math.max(0.4, store.transform.scale / 1.2) }) }
function zoomReset() { store.setTransform({ x: 0, y: 0, scale: 1 }) }
function runFlow() {
  store.resetStatus()
  store.runFlow().then(() => toast.success('工作流执行完成'))
}
async function saveFlow() {
  const ok = await store.saveToDB()
  toast.success(ok ? '已保存到本地（IndexedDB）' : '保存失败')
}

/* 自动保存（防抖） */
let saveTimer = null
function scheduleAutoSave() {
  if (store.running) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => { await store.saveToDB() }, 800)
}
watch(() => [store.nodes, store.edges, store.transform], scheduleAutoSave, { deep: true })

/* ===== 版本历史 ===== */
const showHistory = ref(false)
const versions = ref([])
const historyLabel = ref('')
let autoVersionTimer = null

async function openHistory() {
  versions.value = await listVersions()
  showHistory.value = true
}
function closeHistory() { showHistory.value = false }

async function saveAsVersion() {
  const snap = store.snapshot()
  const label = historyLabel.value.trim() || `版本 · ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
  const entry = await saveVersion(label, snap)
  versions.value = await listVersions()
  historyLabel.value = ''
  toast.success(`已保存「${entry.label}」`)
}

async function loadVer(id) {
  const data = await loadVersionSnapshot(id)
  if (data) {
    store.applySnapshot(data)
    closeHistory()
    toast.success('已加载该版本')
  }
}

async function removeVer(id, e) {
  e.stopPropagation()
  await deleteVersion(id)
  versions.value = await listVersions()
  toast.info('已删除该版本')
}

/* 自动每 60s 保存一次版本（仅在有节点时） */
function scheduleAutoVersion() {
  clearTimeout(autoVersionTimer)
  autoVersionTimer = setTimeout(async () => {
    if (store.nodeCount > 0) {
      const snap = store.snapshot()
      await saveVersion(`自动 · ${new Date().toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`, snap)
    }
    scheduleAutoVersion()
  }, 60_000)
}

/* 文本输入节点：实时写入 params.text */
function updateTextInput(id, text) {
  store.updateNodeParams(id, { text })
}

/* 入口节点检测（无输入边），用于显示"等待上游"提示 */
function hasUpstream(nodeId) {
  return store.edges.some((e) => e.to === nodeId)
}

function goHome() { router.push('/') }

/* ===== 多选 / 框选 ===== */
const selectedIds = ref([])
const showMultiToolbar = computed(() => selectedIds.value.length > 1)
const isBoxSelecting = ref(false)
const boxSelectRect = ref(null) // { sx, sy, ex, ey } 屏幕坐标
let multiSelectAnchor = null

function clearMultiSelect() {
  selectedIds.value = []
}
function toggleMultiSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value.push(id)
  else selectedIds.value.splice(idx, 1)
}
function setMultiSelect(ids) {
  selectedIds.value = ids
}
function isInBox(node) {
  if (!boxSelectRect.value) return false
  const r = boxSelectRect.value
  const cx = node.x + 100, cy = node.y + 60
  return cx >= Math.min(r.sx, r.ex) && cx <= Math.max(r.sx, r.ex) && cy >= Math.min(r.sy, r.ey) && cy <= Math.max(r.sy, r.ey)
}
function getBoxedNodes() {
  return store.nodes.filter(isInBox).map((n) => n.id)
}

/* ===== 浮层内下拉开关 ===== */
const openPanel = ref(null)
function closeAllPanels() { openPanel.value = null }

function onModelPick(opt) {
  store.updateNodeParams(store.selectedId, { model: opt })
  openPanel.value = null
}
function onSizePick(s) {
  store.updateNodeParams(store.selectedId, { size: s })
  openPanel.value = null
}
function onDurPick(d) {
  store.updateNodeParams(store.selectedId, { duration: d })
  openPanel.value = null
}

watch(() => store.selectedId, () => { openPanel.value = null })

/* ===== 浮层操作面板：位置 = 选中节点屏幕坐标 ===== */
/* ===== 复杂节点：外挂浮层；简单节点：内嵌展开 ===== */
const COMPLEX_NODE_TYPES = [
  'image-gen', 'image-gen-mode', 'video-gen',
  'upscale-8k', 'ai-cutout', 'color-adjust', 'image-transform', 'long-image',
  'album-flip', 'image-compare', 'vector-free', 'vector-trace',
  'prompt-optimize', 'chat', 'reverse-prompt'
]
function isComplexNode(type) {
  return COMPLEX_NODE_TYPES.includes(type)
}

/* 视觉类节点（生成图 / 视频 / 图像处理） */
const VISUAL_NODE_TYPES = ['image-gen','image-gen-mode','video-gen','upscale-8k','ai-cutout','color-adjust','image-transform','long-image','album-flip','image-compare','vector-free','vector-trace']
function isVisualNode(type) { return VISUAL_NODE_TYPES.includes(type) }
/* 文本类节点（提示词优化 / 对话 / 反推） */
const TEXT_NODE_TYPES = ['prompt-optimize','chat','reverse-prompt']
function isTextNode(type) { return TEXT_NODE_TYPES.includes(type) }

function copyText(node) {
  if (!node.result?.text) return
  try {
    navigator.clipboard?.writeText(node.result.text)
    toast.success('已复制结果')
  } catch { toast.info('复制失败') }
}

function downloadOne(node) {
  if (!node.result?.url) { toast.info('暂无产物'); return }
  const a = document.createElement('a')
  a.href = node.result.url
  a.download = (node.label || '产物') + '.svg'
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/* 导出交付：打包下载（演示：生成 txt 清单文本） */
function triggerExport(node) {
  try {
    // 收集上游节点的产物信息
    const upstream = store.edges
      .filter((e) => e.to === node.id)
      .map((e) => store.nodes.find((n) => n.id === e.from))
      .filter(Boolean)
    const parts = []
    parts.push('Hey 19 交付包清单')
    parts.push('生成时间：' + new Date().toLocaleString('zh-CN'))
    parts.push('')
    upstream.forEach((u) => {
      parts.push(`【${u.label}】`)
      if (u.result?.url) parts.push(`  产物：${u.result.url}`)
      if (u.result?.text) parts.push(`  文本：${u.result.text.slice(0, 80)}`)
      if (u.result?.total) parts.push(`  报价：¥${u.result.total}`)
      if (u.result?.items) parts.push(`  物料：${u.result.items.length} 项`)
      parts.push('')
    })
    parts.push('已包含：效果图 + 施工尺寸图 + 物料清单 + 报价单（演示）')
    const blob = new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'hey19-delivery-' + Date.now() + '.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(a.href)
    toast.success('交付包已生成并下载')
  } catch (e) {
    toast.error('导出失败：' + e.message)
  }
}

function copyImage(node) {
  if (!node.result?.url) return
  try {
    navigator.clipboard?.writeText(`[${node.label}] ${node.result.url}`)
    toast.success('图像信息已复制')
  } catch { toast.info('复制失败') }
}

/* 模型选项按节点 LLM 类型分组 */
function modelOptionsFor(type) {
  const meta = nodeMeta(type)
  if (!meta) return ['auto']
  if (meta.llmType === 'multimodal') return ['auto', 'gpt-4o', 'claude-3.5', 'gemini-1.5-pro', 'gpt-image-1', 'midjourney-v6', 'sdxl', 'dall-e-3']
  if (meta.llmType === 'text' || !meta.llmType) return ['auto', 'deepseek-v3', 'gpt-4o', 'claude-3.5', 'gemini-1.5-pro']
  return ['auto']
}

/* 模式生图预设 */
const MODE_PRESETS = ['无预设提示词（通用）', '拆分平面稿', '设计/制作过程', '生成文化墙效果图', '实景合成文化墙', '生成门头效果图', '实景合成（仅招牌）', '实景合成（店铺）', '合成控图（仅招牌）', '合成控图（店铺）']
function presetsFor(type) { return MODE_PRESETS }

/* 节点操作面板 helper（每个节点独立 panel key） */
function pickModel(node, opt) {
  store.updateNodeParams(node.id, { model: opt })
  openPanel.value = null
}
function pickSize(node, s) {
  store.updateNodeParams(node.id, { size: s })
  openPanel.value = null
}
function pickDur(node, d) {
  store.updateNodeParams(node.id, { duration: d })
  openPanel.value = null
}
function pickQuality(node, q) {
  store.updateNodeParams(node.id, { quality: q })
  openPanel.value = null
}
function pickPreset(node, p) {
  store.updateNodeParams(node.id, { preset: p })
  openPanel.value = null
}
function createUpstreamInput(node, type) {
  if (!node) return
  const m = nodeMeta(node.type)
  const newId = store.addNode(type, node.x - ((m?.w || 240) + 80), node.y + 20)
  if (newId) {
    store.addEdge(newId, node.id)
    toast.success(`已创建${type === 'text-input' ? '文字输入' : '图片输入'}并连接`)
  }
}

const floatingPanelPos = computed(() => {
  if (!store.selectedId || !canvasRef.value) return null
  const n = store.nodes.find((v) => v.id === store.selectedId)
  if (!n) return null
  if (!isComplexNode(n.type)) return null // 简单节点不显示浮层，节点内展开
  const m = nodeMeta(n.type)
  if (!m) return null
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    left: rect.left + n.x * store.transform.scale + store.transform.x,
    top: rect.top + n.y * store.transform.scale + store.transform.y,
    width: (m.w || 240) * store.transform.scale, // 宽度与节点一致
    bottom: rect.top + (n.y + (m.h || 140)) * store.transform.scale + store.transform.y
  }
})
const flipPanelUp = computed(() => {
  if (!floatingPanelPos.value) return false
  // 画布下沿减去面板预估高度，剩余不足则向上展开
  const panelH = 360
  return window.innerHeight - floatingPanelPos.value.bottom < panelH
})
const showNodeActionPanel = computed(() =>
  !!store.selectedId && store.selectedId !== 'multi' && !isBoxSelecting.value
)

/* ===== 批量操作（多选工具条） ===== */
async function runSelected() {
  const ids = selectedIds.value.length ? selectedIds.value : (store.selectedId ? [store.selectedId] : [])
  for (const id of ids) {
    const n = store.nodes.find((x) => x.id === id)
    if (n) await store.runSingleNode(id)
  }
  toast.success(`已批量执行 ${ids.length} 个节点`)
}
function copySelected() {
  const ids = selectedIds.value.length ? selectedIds.value : (store.selectedId ? [store.selectedId] : [])
  for (const id of ids) store.copyNode(id)
  toast.success(`已复制 ${ids.length} 个节点`)
}
function deleteSelected() {
  const ids = selectedIds.value.length ? selectedIds.value : (store.selectedId ? [store.selectedId] : [])
  for (const id of ids) store.removeNode(id)
  clearMultiSelect()
  store.selectNode(null)
  toast.success(`已删除 ${ids.length} 个节点`)
}
function alignSelected(mode) {
  // mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
  const ids = selectedIds.value.length ? selectedIds.value : (store.selectedId ? [store.selectedId] : [])
  const nodes = ids.map((id) => store.nodes.find((n) => n.id === id)).filter(Boolean)
  if (nodes.length < 2) { toast.info('至少需要 2 个节点'); return }
  if (mode === 'left')   { const min = Math.min(...nodes.map((n) => n.x)); nodes.forEach((n) => n.x = min) }
  if (mode === 'right')  { const max = Math.max(...nodes.map((n) => n.x + nodeMeta(n.type).w)); nodes.forEach((n) => n.x = max - nodeMeta(n.type).w) }
  if (mode === 'top')    { const min = Math.min(...nodes.map((n) => n.y)); nodes.forEach((n) => n.y = min) }
  if (mode === 'bottom') { const max = Math.max(...nodes.map((n) => n.y + nodeMeta(n.type).h)); nodes.forEach((n) => n.y = max - nodeMeta(n.type).h) }
  if (mode === 'center-h') { const avg = nodes.reduce((s, n) => s + n.x + nodeMeta(n.type).w / 2, 0) / nodes.length; nodes.forEach((n) => n.x = avg - nodeMeta(n.type).w / 2) }
  if (mode === 'center-v') { const avg = nodes.reduce((s, n) => s + n.y + nodeMeta(n.type).h / 2, 0) / nodes.length; nodes.forEach((n) => n.y = avg - nodeMeta(n.type).h / 2) }
  toast.success(`已对齐 ${nodes.length} 个节点`)
}
function tidySelected() {
  // 简单自动布局：网格排列
  const ids = selectedIds.value.length ? selectedIds.value : (store.selectedId ? [store.selectedId] : [])
  const nodes = ids.map((id) => store.nodes.find((n) => n.id === id)).filter(Boolean)
  const cols = Math.ceil(Math.sqrt(nodes.length))
  const colW = 280, rowH = 240
  nodes.forEach((n, i) => {
    n.x = 60 + (i % cols) * colW
    n.y = 80 + Math.floor(i / cols) * rowH
  })
  toast.success(`已整理 ${nodes.length} 个节点`)
}
function downloadSelected() {
  // 下载所有选中节点的产物
  const ids = selectedIds.value.length ? selectedIds.value : (store.selectedId ? [store.selectedId] : [])
  const images = []
  ids.forEach((id) => {
    const n = store.nodes.find((x) => x.id === id)
    if (!n?.result) return
    if (n.result.url && n.result.type !== 'share' && n.result.type !== 'text') images.push({ name: `${n.label}.svg`, url: n.result.url })
    if (n.result.pages) n.result.pages.forEach((p, i) => images.push({ name: `${n.label}-${i + 1}.svg`, url: p }))
  })
  if (!images.length) { toast.info('暂无产物可下载'); return }
  images.forEach((img) => {
    const a = document.createElement('a')
    a.href = img.url
    a.download = img.name
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    a.remove()
  })
  toast.success(`已下载 ${images.length} 个产物`)
}

/* ===== 翻书 Modal ===== */
const COVERS = [1, 2, 3, 4, 5, 6]
let audioCtx = null
function playFlipSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const t = audioCtx.currentTime
    // 高频翻页声（白噪声 + 衰减）
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.18, audioCtx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 8)
    const src = audioCtx.createBufferSource()
    src.buffer = buffer
    const filter = audioCtx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2200
    filter.Q.value = 1.5
    const gain = audioCtx.createGain()
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    src.connect(filter).connect(gain).connect(audioCtx.destination)
    src.start(t)
    src.stop(t + 0.2)
  } catch (e) { /* ignore */ }
}

function openAlbumModal(node) {
  albumNodeId.value = node.id
  albumPage.value = 0
  albumMode.value = 'single'
  showAlbumModal.value = true
}
function closeAlbumModal() { showAlbumModal.value = false; albumNodeId.value = null }

function albumNext() {
  if (!albumNodeId.value) return
  const max = albumMode.value === 'double' ? (COVERS.length - 1) : COVERS.length - 1
  if (albumPage.value < max) {
    albumPage.value++
    playFlipSound()
  }
}
function albumPrev() {
  if (albumPage.value > 0) {
    albumPage.value--
    playFlipSound()
  }
}
function setAlbumMode(m) { albumMode.value = m; if (m === 'double' && albumPage.value > 0) albumPage.value = Math.max(0, albumPage.value - 1) }

/* album-flip 节点点击 art-frame 触发 */
function onArtFrameClick(n) {
  if (n.type === 'album-flip' && n.status === 'done') {
    openAlbumModal(n)
  }
}

function addNodeAtCenter(type) {
  const rect = canvasRef.value.getBoundingClientRect()
  const { wx, wy } = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2)
  store.addNode(type, Math.round(wx) + (Math.random() - 0.5) * 80, Math.round(wy) + (Math.random() - 0.5) * 80)
}

function onNodePickFromMenu(type) {
  const rect = canvasRef.value.getBoundingClientRect()
  const { wx, wy } = screenToWorld(contextMenu.value.x, contextMenu.value.y)
  store.addNode(type, Math.round(wx), Math.round(wy))
  closeContextMenu()
}

/* 滑块字段元数据 */
const SLIDER_META = {
  temperature:   { label: '温度', min: 0, max: 1, step: 0.05 },
  length:        { label: '长度', min: 1, max: 5, step: 1 },
  factor:        { label: '放大倍数', min: 1, max: 8, step: 1 },
  denoise:       { label: '降噪', min: 0, max: 100, step: 5 },
  feather:       { label: '羽化', min: 0, max: 10, step: 1 },
  brightness:    { label: '亮度', min: -100, max: 100, step: 5 },
  contrast:      { label: '对比', min: -100, max: 100, step: 5 },
  saturation:    { label: '饱和度', min: -100, max: 100, step: 5 },
  hue:           { label: '色相', min: -180, max: 180, step: 5 },
  angle:         { label: '角度', min: -180, max: 180, step: 1 },
  gap:           { label: '间距', min: 0, max: 30, step: 1 },
  ratio:         { label: '对比比例', min: 0.1, max: 1, step: 0.05 },
  detail:        { label: '细节', min: 1, max: 10, step: 1 },
  smooth:        { label: '平滑', min: 1, max: 100, step: 1 },
  simplify:      { label: '简化', min: 0.1, max: 10, step: 0.5 },
  threshold:     { label: '阈值', min: 0, max: 255, step: 1 },
  colorCount:    { label: '颜色数', min: 2, max: 32, step: 1 },
  pages:         { label: '页数', min: 1, max: 50, step: 1 },
  duration:      { label: '时长（秒）', min: 1, max: 30, step: 1 },
  fps:           { label: '帧率', min: 12, max: 60, step: 6 },
  expireDays:    { label: '有效期（天）', min: 1, max: 365, step: 1 }
}
function sliderLabel(key) { return SLIDER_META[key]?.label || key }
function sliderMin(key) { return SLIDER_META[key]?.min ?? 0 }
function sliderMax(key) { return SLIDER_META[key]?.max ?? 100 }
function sliderStep(key) { return SLIDER_META[key]?.step ?? 1 }

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  restoreCanvas()
  scheduleAutoVersion()
})
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  clearTimeout(saveTimer)
  clearTimeout(autoVersionTimer)
})

async function restoreCanvas() {
  const ok = await store.loadFromDB()
  if (!ok) loadTemplate()
}
</script>

<template>
  <div class="ic-shell">
    <!-- 顶栏 -->
    <header class="ic-top">
      <div class="ic-top-left">
        <button class="back-home" @click="goHome"><ArrowLeft :size="16" /><span>首页</span></button>
        <span class="ic-divider"></span>
        <router-link to="/workspace" class="ws-logo">
          <span class="ws-logo-mark">H</span><span class="ws-logo-text">Hey 19</span>
        </router-link>
        <span class="ic-title">无限画布</span>
        <input
          class="project-name-input"
          :value="store.projectName"
          @change="store.projectName = $event.target.value"
          placeholder="项目名称"
          title="项目名称（保存到云端）"
        />
        <span class="storage-badge" :class="store.storageMode">
          {{ store.storageMode === 'cloud' ? '☁ 云端' : '💾 本地' }}
        </span>
      </div>
      <div class="ic-top-right">
        <button class="ic-btn" @click="sidebarCollapsed = !sidebarCollapsed" :title="sidebarCollapsed ? '展开节点库' : '折叠节点库'">
          <PanelLeftClose v-if="!sidebarCollapsed" :size="15" />
          <PanelLeft v-else :size="15" />
        </button>
        <button class="ic-btn ic-btn-primary" :disabled="store.running" @click="runFlow">
          <Play :size="15" /> {{ store.running ? '运行中…' : '运行' }}
        </button>
        <button class="ic-btn" @click="saveFlow"><Save :size="15" /> 保存</button>
        <button class="ic-btn" @click="openHistory" title="版本历史"><History :size="15" /> 历史</button>
        <button class="ic-btn-danger" @click="clearCanvas"><Trash2 :size="15" /></button>
        <div class="ic-zoom">
          <button class="ic-btn" @click="zoomOut"><ZoomOut :size="15" /></button>
          <span class="zoom-num">{{ zoomPercent }}%</span>
          <button class="ic-btn" @click="zoomIn"><ZoomIn :size="15" /></button>
          <button class="ic-btn" @click="zoomReset" title="还原"><Maximize2 :size="15" /></button>
        </div>
      </div>
    </header>

    <div class="ic-body">
      <!-- 左：节点分类面板（可折叠为图标） -->
      <aside class="ic-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <!-- 折叠态：图标条 -->
        <template v-if="sidebarCollapsed">
          <div class="sb-collapsed-head">
            <button class="sb-icon-btn" @click="sidebarCollapsed = false" title="展开节点库">
              <PanelLeft :size="18" />
            </button>
          </div>
          <div class="sb-collapsed-icons">
            <button
              v-for="n in CANVAS_NODES"
              :key="n.id"
              class="sb-ic-item"
              :style="{ '--nc': n.color }"
              @click="addNodeAtCenter(n.id); sidebarCollapsed = false"
              :title="n.label"
            >
              <component :is="n.icon" :size="16" />
            </button>
          </div>
        </template>
        <!-- 展开态：分类节点库 -->
        <template v-else>
        <p class="side-title">节点库</p>
        <p class="side-hint">点击或拖入到画布</p>
        <div v-for="cat in NODE_CATEGORIES" :key="cat.id" class="cat-block">
          <p class="cat-label">{{ cat.label }}</p>
          <button
            v-for="n in CANVAS_NODES.filter((x) => x.category === cat.id)"
            :key="n.id"
            class="node-type-btn"
            :style="{ '--nc': n.color }"
            @click="addNodeAtCenter(n.id)"
            :title="n.description"
          >
            <span class="nt-icon"><component :is="n.icon" :size="14" /></span>
            <span class="nt-name">{{ n.label }}</span>
            <span v-if="n.llmRequired === 'yes'" class="nt-llm yes">AI</span>
            <span v-else-if="n.llmRequired === 'optional'" class="nt-llm opt">⚡/✋</span>
            <span v-else class="nt-llm no">·</span>
          </button>
        </div>
        <button class="template-btn" @click="loadTemplate">
          <Sparkles :size="14" /> 加载 6P 画册示例
        </button>
        <div class="side-tips">
          <p><strong>操作提示</strong></p>
          <p>• 拖节点移动</p>
          <p>• 滚轮缩放 / <b>中键拖平移</b></p>
          <p>• <b>左键空白框选节点</b></p>
          <p>• 从节点右端口拖到另一节点左端口连接</p>
          <p>• 单击右端口显示该节点支持的下游</p>
          <p>• 右键节点显示操作菜单</p>
          <p>• 右键空白显示添加节点菜单</p>
        </div>
        </template>
      </aside>

      <!-- 中央画布 -->
      <main
        ref="canvasRef"
        class="ic-canvas"
        @mousedown="onMouseDown"
        @wheel="onWheel"
        @contextmenu.prevent="onCanvasContextMenu"
      >
        <div class="grid-bg"></div>

        <div class="ic-world" :style="{ transform: `translate(${store.transform.x}px, ${store.transform.y}px) scale(${store.transform.scale})` }">
          <!-- 连线 SVG -->
          <svg class="edges-svg" :width="6000" :height="4000" viewBox="0 0 6000 4000">
            <defs>
              <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#ff6b35" stop-opacity="0.6"/>
                <stop offset="100%" stop-color="#7c5cff" stop-opacity="0.6"/>
              </linearGradient>
            </defs>
            <g v-for="e in store.edges" :key="e.id">
              <path :d="edgePath(e)" :stroke="edgeColor(e)" stroke-width="2.5" fill="none" :class="{ 'edge-hot': highlightEdges.has(e.id) }" />
              <g class="edge-handle" @click.stop="store.removeEdge(e.id)">
                <circle :cx="edgeMid(e).x" :cy="edgeMid(e).y" r="4" :fill="edgeColor(e)" />
                <circle :cx="edgeMid(e).x + 18" :cy="edgeMid(e).y" r="9" fill="#fff" :stroke="edgeColor(e)" stroke-width="1.5" />
                <text :x="edgeMid(e).x + 18" :y="edgeMid(e).y + 3.5" text-anchor="middle" font-size="11" font-weight="700" :fill="edgeColor(e)">×</text>
              </g>
            </g>
          </svg>

          <!-- 节点 -->
          <div
            v-for="n in store.nodes"
            :key="n.id"
            class="node"
            :class="{
              selected: store.selectedId === n.id,
              collapsed: store.selectedId !== n.id,
              running: n.status === 'running',
              done: n.status === 'done',
              'has-upstream': hasUpstream(n.id)
            }"
            :data-node-id="n.id"
            :style="{
              left: n.x + 'px', top: n.y + 'px',
              width: (nodeMeta(n.type)?.w || 240) + 'px',
              minHeight: (nodeMeta(n.type)?.h || 140) + 'px',
              '--nc': nodeMeta(n.type)?.color || '#888'
            }"
            @dblclick.stop="store.removeNode(n.id)"
            @contextmenu.prevent.stop="onNodeContextMenu($event, n)"
          >
            <!-- 顶栏：图标 + 标题 + 关闭 -->
            <div class="node-head">
              <span class="node-icon" :style="{ background: nodeMeta(n.type)?.color }">
                <component :is="nodeMeta(n.type)?.icon || Sparkles" :size="13" />
              </span>
              <span class="node-title">{{ n.label }}</span>
              <button class="node-x" @click.stop="store.removeNode(n.id)" title="删除"><X :size="11" /></button>
            </div>

            <!-- 未选中：紧凑摘要（只显示核心状态） -->
            <div v-if="store.selectedId !== n.id" class="node-summary">
              <template v-if="n.status === 'running'"><span class="sum-dot running"></span> 运行中…</template>
              <template v-else-if="n.status === 'done' && n.result"><span class="sum-dot done">✓</span> 已完成</template>
              <template v-else-if="nodeMeta(n.type)?.inputs > 0 && !hasUpstream(n.id)"><span class="sum-dot wait"></span> 等待上游</template>
              <template v-else><span class="sum-dot idle"></span> 待执行</template>
              <span v-if="n.params.model" class="sum-model">{{ n.params.model }}</span>
            </div>

            <!-- 选中：完整内容 + 操作（所有节点统一：顶部播放 / 主内容 / 底部状态 / 操作区） -->
            <template v-else>
              <!-- 顶部播放按钮（圆形，按状态变色） -->
              <button class="node-run" :class="{ running: n.status === 'running', done: n.status === 'done' }" @click="store.runSingleNode(n.id)" :title="n.status === 'running' ? '运行中…' : (n.status === 'done' ? '重新执行' : '执行')">
                <Loader2 v-if="n.status === 'running'" :size="15" class="spin" />
                <Play v-else :size="15" :fill="n.status === 'done' ? 'currentColor' : 'none'" />
              </button>

              <!-- 等待上游提示 -->
              <div v-if="nodeMeta(n.type)?.inputs > 0 && !hasUpstream(n.id) && n.status !== 'done'" class="node-hint waiting">
                <AlertCircle :size="11" /> 等待上游输入
              </div>

              <!-- 来源徽章（文本类节点有上游时） -->
              <div v-if="isTextNode(n.type) && hasUpstream(n.id)" class="src-badge">
                <Sparkles :size="10" /> 已由{{ hasUpstream(n.id) ? '上游' : '文本输入' }}控制
              </div>

              <!-- 主体内容（按节点类型 + 状态分发） -->
              <div class="node-main">
                <!-- 视觉类节点：生成图/视频/图像处理 -->
                <template v-if="isVisualNode(n.type)">
                  <div v-if="n.status === 'running'" class="visual-state running">
                    <Loader2 :size="36" class="spin state-icon" />
                    <p class="state-text">{{ n.type === 'video-gen' ? '生成视频中…' : '生成中…' }}</p>
                    <div class="progress"><div class="progress-bar"></div></div>
                  </div>
                  <div v-else-if="n.status === 'done' && n.result?.url && n.result.type !== 'share'" class="visual-state done" @click="onArtFrameClick(n)">
                    <img v-if="n.result.type !== 'album'" :src="n.result.url" :alt="n.label" class="result-img" />
                    <img v-else-if="n.result.pages?.[0]" :src="n.result.pages[0]" alt="" class="result-img" />
                    <div class="result-tools">
                      <button class="rt-btn" title="下载" @click.stop="downloadOne(n)"><Download :size="13" /></button>
                      <button class="rt-btn" title="复制" @click.stop="copyImage(n)"><Copy :size="13" /></button>
                      <button class="rt-btn" title="重新生成" @click.stop="store.runSingleNode(n.id)"><RefreshCw :size="13" /></button>
                      <button class="rt-btn" title="全屏" @click.stop="onArtFrameClick(n)"><Maximize2 :size="13" /></button>
                    </div>
                    <div v-if="n.type === 'album-flip'" class="result-cta">点击查看翻页效果</div>
                  </div>
                  <div v-else class="visual-state idle">
                    <component :is="nodeMeta(n.type)?.icon || Sparkles" :size="40" class="state-icon idle-icon" />
                    <p class="state-text">{{ n.type === 'video-gen' ? '等待生成视频' : '等待生成' }}</p>
                  </div>
                </template>

                <!-- 文本类节点：生成文本 -->
                <template v-else-if="isTextNode(n.type)">
                  <div v-if="n.status === 'done' && n.result?.text" class="text-result">
                    <div class="tr-head">
                      <span class="tr-label">美化结果</span>
                      <button class="tr-copy" @click.stop="copyText(n)"><Copy :size="11" /> 复制</button>
                    </div>
                    <textarea class="tr-body" rows="4" :value="n.result.text" @input="n.result.text = $event.target.value"></textarea>
                  </div>
                  <div v-else-if="n.status === 'running'" class="text-state running">
                    <Loader2 :size="28" class="spin" />
                    <p>生成中…</p>
                  </div>
                  <div v-else class="text-state idle">
                    <component :is="nodeMeta(n.type)?.icon || Wand2" :size="34" class="state-icon idle-icon" />
                    <p class="state-text">等待上游文本输入</p>
                  </div>
                </template>

                <!-- 文本输入节点：可编辑 textarea -->
                <template v-else-if="['text-input','doc-import','text-note'].includes(n.type)">
                  <textarea
                    class="ops-textarea-large"
                    rows="3"
                    placeholder="这里可以输入文字"
                    :value="n.params.text"
                    @input="store.updateNodeParams(n.id, { text: $event.target.value })"
                  ></textarea>
                </template>

                <!-- 图片输入节点：上传按钮 -->
                <template v-else-if="n.type === 'image-input'">
                  <div v-if="n.result?.url" class="visual-state done">
                    <img :src="n.result.url" alt="" class="result-img" />
                  </div>
                  <div v-else class="visual-state idle">
                    <Upload :size="36" class="state-icon idle-icon" />
                    <p class="state-text">点击上传或粘贴图片</p>
                    <button class="up-btn">选择图片</button>
                  </div>
                </template>

                <!-- share 节点：预览链接 -->
                <template v-else-if="n.type === 'share'">
                  <div v-if="n.result" class="share-result">
                    <router-link :to="n.result.url" class="open-link" target="_blank">打开预览页面 →</router-link>
                    <span class="share-id">ID: {{ n.result.shareId || '生成中…' }}</span>
                  </div>
                  <div v-else class="text-state idle">
                    <Share2 :size="34" class="state-icon idle-icon" />
                    <p class="state-text">等待上游结果</p>
                  </div>
                </template>

                <!-- 业务节点：需求记录（字段化表单） -->
                <template v-else-if="n.type === 'req-form'">
                  <div class="req-form">
                    <div class="rf-row">
                      <span class="rf-label">客户</span>
                      <input :value="n.params.customer" placeholder="如：王姐奶茶店" @input="store.updateNodeParams(n.id, { customer: $event.target.value })" />
                    </div>
                    <div class="rf-row">
                      <span class="rf-label">项目</span>
                      <select :value="n.params.projectType" @change="store.updateNodeParams(n.id, { projectType: $event.target.value })">
                        <option>门头店招</option><option>海报</option><option>画册</option><option>文化墙</option><option>活动物料</option>
                      </select>
                    </div>
                    <div class="rf-grid">
                      <div class="rf-row">
                        <span class="rf-label">尺寸</span>
                        <input :value="n.params.size" placeholder="80×40cm" @input="store.updateNodeParams(n.id, { size: $event.target.value })" />
                      </div>
                      <div class="rf-row">
                        <span class="rf-label">预算</span>
                        <input :value="n.params.budget" placeholder="5000" @input="store.updateNodeParams(n.id, { budget: $event.target.value })" />
                      </div>
                    </div>
                    <div class="rf-row">
                      <span class="rf-label">材质</span>
                      <input :value="n.params.material" placeholder="铝塑板+灯带" @input="store.updateNodeParams(n.id, { material: $event.target.value })" />
                    </div>
                    <div class="rf-row">
                      <span class="rf-label">交期</span>
                      <input :value="n.params.deadline" placeholder="5 天" @input="store.updateNodeParams(n.id, { deadline: $event.target.value })" />
                    </div>
                    <div class="rf-row">
                      <span class="rf-label">备注</span>
                      <input :value="n.params.note" placeholder="红底金字…" @input="store.updateNodeParams(n.id, { note: $event.target.value })" />
                    </div>
                  </div>
                  <div v-if="n.result?.text" class="brief-card">
                    <p class="bc-title">📋 需求摘要</p>
                    <pre class="bc-text">{{ n.result.text }}</pre>
                  </div>
                </template>

                <!-- 业务节点：报价计算 -->
                <template v-else-if="n.type === 'quote-calc'">
                  <div v-if="n.result?.type === 'quote'" class="quote-card">
                    <p class="bc-title">💰 报价单</p>
                    <table class="quote-table">
                      <thead><tr><th>项目</th><th>规格</th><th>数量</th><th>单价</th><th>小计</th></tr></thead>
                      <tbody>
                        <tr v-for="(r, i) in n.result.rows" :key="i">
                          <td>{{ r.item }}</td><td>{{ r.spec }}</td><td>{{ r.qty }}</td><td>¥{{ r.unitPrice }}</td><td>¥{{ r.amount }}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div class="quote-total">
                      <span>合计（含利润）</span><b>¥{{ n.result.total }}</b>
                    </div>
                  </div>
                  <div v-else class="quote-form">
                    <div class="rf-grid">
                      <div class="rf-row"><span class="rf-label">宽</span><input type="number" :value="n.params.width" @input="store.updateNodeParams(n.id, { width: Number($event.target.value) })" /></div>
                      <div class="rf-row"><span class="rf-label">高</span><input type="number" :value="n.params.height" @input="store.updateNodeParams(n.id, { height: Number($event.target.value) })" /></div>
                    </div>
                    <div class="rf-row">
                      <span class="rf-label">材质</span>
                      <select :value="n.params.material" @change="store.updateNodeParams(n.id, { material: $event.target.value, processPrice: $event.target.value === '亚克力' ? 200 : $event.target.value === '灯箱' ? 180 : 120 })">
                        <option>铝塑板</option><option>亚克力</option><option>灯箱</option><option>喷绘布</option>
                      </select>
                    </div>
                    <div class="rf-row"><span class="rf-label">数量</span><input type="number" :value="n.params.quantity" @input="store.updateNodeParams(n.id, { quantity: Number($event.target.value) })" /></div>
                    <div class="rf-row"><span class="rf-label">人工费</span><input type="number" :value="n.params.labor" @input="store.updateNodeParams(n.id, { labor: Number($event.target.value) })" /></div>
                  </div>
                </template>

                <!-- 业务节点：物料清单 -->
                <template v-else-if="n.type === 'material-list'">
                  <div class="rf-row">
                    <span class="rf-label">工艺模板</span>
                    <select :value="n.params.template" @change="store.updateNodeParams(n.id, { template: $event.target.value })">
                      <option>门头灯箱</option><option>海报喷绘</option><option>文化墙</option>
                    </select>
                  </div>
                  <div v-if="n.result?.type === 'material'" class="material-card">
                    <p class="bc-title">📦 物料清单（{{ n.result.template }}）</p>
                    <table class="quote-table">
                      <thead><tr><th>物料</th><th>规格</th><th>数量</th><th>单位</th></tr></thead>
                      <tbody>
                        <tr v-for="(m, i) in n.result.items" :key="i">
                          <td>{{ m.name }}</td><td>{{ m.spec }}</td><td>{{ m.qty }}</td><td>{{ m.unit }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </template>

                <!-- 业务节点：导出交付 -->
                <template v-else-if="n.type === 'export-deliver'">
                  <div v-if="n.result?.type === 'export'" class="export-card">
                    <p class="bc-title">📦 交付包已生成</p>
                    <p class="bc-text">包含：效果图 + 施工尺寸图 + 物料清单 + 报价单</p>
                    <button class="open-link" @click="triggerExport(n)">
                      <Download :size="13" /> 下载交付包
                    </button>
                  </div>
                  <div v-else class="text-state idle">
                    <PackageOpen :size="34" class="state-icon idle-icon" />
                    <p class="state-text">连接上游产物后生成交付包</p>
                  </div>
                </template>

                <!-- 默认 -->
                <template v-else>
                  <div class="text-state idle">
                    <p class="state-text">{{ nodeMeta(n.type)?.description }}</p>
                  </div>
                </template>
              </div>

              <!-- 快捷操作 pill（仅 prompt-optimize） -->
              <div v-if="n.type === 'prompt-optimize'" class="quick-actions">
                <button class="qa-pill" @click="createUpstreamInput(n, 'text-input')">
                  <Plus :size="10" /> 创建文字输入
                </button>
                <button class="qa-pill" @click="createUpstreamInput(n, 'image-input')">
                  <Plus :size="10" /> 创建图片输入
                </button>
                <button v-if="n.status === 'done' && n.result?.text" class="qa-pill ghost" @click="toast.info('演示：拆分')">
                  <GitBranch :size="10" /> 拆分
                </button>
              </div>

                <!-- 底部状态条（执行完后） -->
                <div v-if="n.status === 'done' && n.result?.ms" class="node-meta">
                  <span class="meta-chip">耗时 {{ Math.round((n.result.ms || 0) / 1000) }}s</span>
                  <span class="meta-chip cost">{{ n.result.cost || '3' }} 积分</span>
                </div>

                <!-- 选中后展开操作区（所有节点统一：模型/尺寸/画质/时长/参数/执行） -->
                <div class="node-ops">
                  <!-- 模型选择 -->
                <div v-if="nodeMeta(n.type)?.llmRequired === 'yes'" class="ops-row">
                  <span class="ops-label">模型</span>
                    <div class="ops-select-wrap">
                      <button class="ops-select" :class="{ open: openPanel === `model-${n.id}` }" @click.stop="openPanel = openPanel === `model-${n.id}` ? null : `model-${n.id}`">
                        <span>{{ n.params.model || 'auto' }}</span>
                        <ChevronDown :size="11" />
                      </button>
                      <div v-if="openPanel === `model-${n.id}`" class="ops-options">
                        <button v-for="m in modelOptionsFor(n.type)" :key="m" class="ops-opt" :class="{ active: n.params.model === m }" @click="pickModel(n, m)">
                          <Check v-if="n.params.model === m" :size="11" /><span v-else class="ops-opt-sp"></span>
                          {{ m === 'auto' ? 'Auto 自动' : m }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- 图像尺寸 + 画质（image-gen） -->
                  <template v-if="n.type === 'image-gen'">
                    <div class="ops-row">
                      <span class="ops-label">尺寸</span>
                      <div class="ops-select-wrap">
                        <button class="ops-select" :class="{ open: openPanel === `size-${n.id}` }" @click.stop="openPanel = openPanel === `size-${n.id}` ? null : `size-${n.id}`">
                          <span>{{ n.params.size || '1024x1024' }}</span>
                          <ChevronDown :size="11" />
                        </button>
                        <div v-if="openPanel === `size-${n.id}`" class="ops-options">
                          <button v-for="s in ['1024x1024','1024x1536','1536x1024','auto']" :key="s" class="ops-opt" :class="{ active: n.params.size === s }" @click="pickSize(n, s)">
                            <Check v-if="n.params.size === s" :size="11" /><span v-else class="ops-opt-sp"></span>
                            {{ s }}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="ops-row">
                      <span class="ops-label">画质</span>
                      <div class="ops-select-wrap">
                        <button class="ops-select" :class="{ open: openPanel === `quality-${n.id}` }" @click.stop="openPanel = openPanel === `quality-${n.id}` ? null : `quality-${n.id}`">
                          <span>{{ n.params.quality || 'high' }}</span>
                          <ChevronDown :size="11" />
                        </button>
                        <div v-if="openPanel === `quality-${n.id}`" class="ops-options">
                          <button v-for="q in ['low','medium','high','ultra']" :key="q" class="ops-opt" :class="{ active: n.params.quality === q }" @click="pickQuality(n, q)">
                            <Check v-if="n.params.quality === q" :size="11" /><span v-else class="ops-opt-sp"></span>
                            {{ q }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </template>

                  <!-- 模式生图预设（image-gen-mode） -->
                  <div v-if="n.type === 'image-gen-mode'" class="ops-row">
                    <span class="ops-label">预设</span>
                    <div class="ops-select-wrap">
                      <button class="ops-select" :class="{ open: openPanel === `preset-${n.id}` }" @click.stop="openPanel = openPanel === `preset-${n.id}` ? null : `preset-${n.id}`">
                        <span>{{ n.params.preset || '无预设' }}</span>
                        <ChevronDown :size="11" />
                      </button>
                      <div v-if="openPanel === `preset-${n.id}`" class="ops-options">
                        <button v-for="p in presetsFor(n.type)" :key="p" class="ops-opt" :class="{ active: n.params.preset === p }" @click="pickPreset(n, p)">
                          <Check v-if="n.params.preset === p" :size="11" /><span v-else class="ops-opt-sp"></span>
                          {{ p }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- 视频时长 -->
                  <div v-if="n.type === 'video-gen'" class="ops-row">
                    <span class="ops-label">时长</span>
                    <div class="ops-select-wrap">
                      <button class="ops-select" :class="{ open: openPanel === `dur-${n.id}` }" @click.stop="openPanel = openPanel === `dur-${n.id}` ? null : `dur-${n.id}`">
                        <span>{{ (n.params.duration || 5) }}s</span>
                        <ChevronDown :size="11" />
                      </button>
                      <div v-if="openPanel === `dur-${n.id}`" class="ops-options">
                        <button v-for="d in [3,5,10,15]" :key="d" class="ops-opt" :class="{ active: n.params.duration === d }" @click="pickDur(n, d)">
                          <Check v-if="n.params.duration === d" :size="11" /><span v-else class="ops-opt-sp"></span>
                          {{ d }}s
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- 数字滑块参数 -->
                  <template v-for="(v, key) in n.params" :key="key">
                    <div v-if="typeof v === 'number' && !['quality','pages','duration','expireDays'].includes(key)" class="ops-row slider">
                      <span class="ops-label">
                        {{ sliderLabel(key) }}
                        <em>{{ v }}</em>
                      </span>
                      <input type="range" :min="sliderMin(key)" :max="sliderMax(key)" :step="sliderStep(key)" :value="v" @input="store.updateNodeParams(n.id, { [key]: Number($event.target.value) })" />
                    </div>
                  </template>

                  <!-- 文本输入编辑（text-input / doc-import / text-note / prompt-optimize 文本源） -->
                  <div v-if="['text-input','doc-import','text-note'].includes(n.type)" class="ops-row">
                    <span class="ops-label">文本</span>
                    <textarea
                      class="ops-textarea"
                      rows="2"
                      :value="n.params.text"
                      @input="store.updateNodeParams(n.id, { text: $event.target.value })"
                      placeholder="这里可以输入文字"
                    ></textarea>
                  </div>

                  <!-- 创建输入快捷（prompt-optimize） -->
                  <div v-if="n.type === 'prompt-optimize'" class="ops-row">
                    <span class="ops-label">上游</span>
                    <div class="ops-pills">
                      <button class="ops-pill" @click="createUpstreamInput(n, 'text-input')">
                        <Plus :size="10" /> 创建文字输入
                      </button>
                      <button class="ops-pill" @click="createUpstreamInput(n, 'image-input')">
                        <Plus :size="10" /> 创建图片输入
                      </button>
                    </div>
                  </div>

                  <!-- 预估积分 -->
                  <div class="ops-row cost">
                    <span class="ops-label">预估</span>
                    <span class="ops-cost">按量计费</span>
                  </div>

                  <!-- 操作按钮 -->
                  <div class="ops-actions">
                    <button class="ops-btn primary" @click="store.runSingleNode(n.id)">
                      <Play :size="11" /> {{ n.status === 'running' ? '执行中…' : '执行' }}
                    </button>
                    <button class="ops-btn" @click="store.copyNode(n.id)">
                      <Copy :size="11" /> 复制
                    </button>
                    <button class="ops-btn danger" @click="store.removeNode(n.id)">
                      <Trash2 :size="11" /> 删除
                    </button>
                  </div>
                </div>
              </template>

            <!-- 状态徽章 -->
            <span v-if="n.status === 'running'" class="node-status running" title="运行中"><span class="pulse"></span></span>
            <span v-else-if="n.status === 'done'" class="node-status done" title="已完成">✓</span>

            <!-- 端口 -->
            <span
              v-if="nodeMeta(n.type)?.inputs > 0"
              class="port port-in"
              :style="{ '--pc': PORT_COLOR[nodeMeta(n.type)?.accepts[0]] || PORT_COLOR.any }"
              :data-port="`${n.id}:in`"
              :title="`接收：${(nodeMeta(n.type)?.accepts || []).join(' / ')}`"
            ></span>
            <span
              v-if="nodeMeta(n.type)?.outputs > 0"
              class="port port-out"
              :style="{ '--pc': PORT_COLOR[nodeMeta(n.type)?.produces] || PORT_COLOR.any }"
              :data-port="`${n.id}:out`"
              :title="`输出：${nodeMeta(n.type)?.produces}（拖动连接 / 单击查看下游）`"
              @click.stop="onPortClick($event, n.id, 'out')"
            ></span>
          </div>
        </div>

        <!-- 拖拽中的引导线（跟随鼠标） -->
        <svg v-if="dragging?.type === 'edge'" class="drag-edge-svg" :viewBox="`0 0 ${canvasRef?.clientWidth || 1200} ${canvasRef?.clientHeight || 700}`" preserveAspectRatio="none">
          <path
            :d="dragEdgePath()"
            :stroke="dragEdgeColor()"
            stroke-width="2.5"
            fill="none"
            stroke-dasharray="7 5"
          />
          <!-- 拖拽终点标记 -->
          <g v-if="dragging" :transform="`translate(${dragging.x - canvasRef.getBoundingClientRect().left}, ${dragging.y - canvasRef.getBoundingClientRect().top})`">
            <circle
              r="10"
              :fill="dragHover?.type === 'invalid' ? 'var(--color-error)' : dragHover?.type === 'valid' ? 'var(--color-success)' : 'var(--color-accent)'"
              :opacity="0.9"
            />
            <text
              text-anchor="middle"
              dy="4"
              font-size="12"
              font-weight="700"
              fill="#fff"
            >{{ dragHover?.type === 'invalid' ? '✕' : '+' }}</text>
          </g>
        </svg>

        <!-- 状态栏 -->
        <div class="canvas-status">
          <span v-if="store.saveState === 'saved'" class="st-ok">● 已自动保存</span>
          <span v-else-if="store.saveState === 'saving'">● 保存中…</span>
          <span v-else-if="store.runProgress">{{ store.runProgress }}</span>
          <span v-else>{{ store.nodeCount }} 节点 · {{ store.edges.length }} 连接</span>
          <span>·</span>
          <span>{{ store.doneCount }}/{{ store.nodeCount }} 完成</span>
          <span>·</span>
          <span>{{ zoomPercent }}%</span>
        </div>
      </main>

      <!-- 右侧：选中节点操作面板 -->
      <aside class="ic-inspector">
        <template v-if="store.selected">
          <p class="ins-title" :style="{ color: nodeMeta(store.selected.type)?.color }">
            {{ nodeMeta(store.selected.type)?.label }}
          </p>
          <p class="ins-desc">{{ nodeMeta(store.selected.type)?.description }}</p>

          <label class="ins-field">
            <span>节点名称</span>
            <input :value="store.selected.label" @input="store.updateNodeLabel(store.selected.id, $event.target.value)" />
          </label>

          <!-- 模型选择 -->
          <label v-if="nodeMeta(store.selected.type)?.llmRequired === 'yes'" class="ins-field">
            <span>推荐模型</span>
            <select :value="store.selected.params.model" @change="store.updateNodeParams(store.selected.id, { model: $event.target.value })">
              <option value="auto">Auto · 自动匹配</option>
              <option v-if="nodeMeta(store.selected.type)?.llmType === 'text' || nodeMeta(store.selected.type)?.llmType === 'multimodal'" value="deepseek-v3">DeepSeek V3 · 文本</option>
              <option v-if="nodeMeta(store.selected.type)?.llmType === 'multimodal'" value="gpt-image-1">GPT-image-1 · 多模态</option>
              <option v-if="nodeMeta(store.selected.type)?.llmType === 'multimodal'" value="gpt-4o">GPT-4o · 多模态</option>
              <option v-if="nodeMeta(store.selected.type)?.llmType === 'multimodal'" value="midjourney-v6">Midjourney v6 · 图像</option>
              <option v-if="nodeMeta(store.selected.type)?.llmType === 'multimodal'" value="sdxl">SDXL · 图像</option>
            </select>
          </label>

          <!-- 尺寸选择（图像类） -->
          <label v-if="store.selected.type === 'image-gen'" class="ins-field">
            <span>图像尺寸</span>
            <select :value="store.selected.params.size" @change="store.updateNodeParams(store.selected.id, { size: $event.target.value })">
              <option>1024x1024</option><option>1024x1536</option><option>1536x1024</option><option>auto</option>
            </select>
          </label>

          <!-- 文字输入参数 -->
          <label v-if="store.selected.type === 'text-input'" class="ins-field">
            <span>文本内容</span>
            <textarea rows="3" :value="store.selected.params.text" @input="updateTextInput(store.selected.id, $event.target.value)"></textarea>
          </label>

          <!-- 模式生图预设 -->
          <label v-if="store.selected.type === 'image-gen-mode'" class="ins-field">
            <span>生图模式预设</span>
            <select :value="store.selected.params.preset" @change="store.updateNodeParams(store.selected.id, { preset: $event.target.value })">
              <option>无预设提示词（通用）</option>
              <option>拆分平面稿</option>
              <option>设计/制作过程</option>
              <option>生成文化墙效果图</option>
              <option>实景合成文化墙</option>
              <option>生成门头效果图</option>
              <option>实景合成（仅招牌）</option>
              <option>实景合成（店铺）</option>
            </select>
          </label>

          <!-- 滑块参数（统一渲染 number 字段） -->
          <template v-for="(v, key) in store.selected.params" :key="key">
            <label v-if="typeof v === 'number' && !['quality'].includes(key)" class="ins-field slider-field">
              <span>{{ sliderLabel(key) }} <em>{{ v }}</em></span>
              <input type="range" :min="sliderMin(key)" :max="sliderMax(key)" :step="sliderStep(key)" :value="v" @input="store.updateNodeParams(store.selected.id, { [key]: Number($event.target.value) })" />
            </label>
          </template>

          <!-- 操作按钮 -->
          <div class="ins-actions">
            <button class="ins-btn" @click="store.runSingleNode(store.selected.id)"><Play :size="13" /> 运行此节点</button>
            <button class="ins-btn" @click="store.copyNode(store.selected.id)"><Copy :size="13" /> 复制</button>
            <button class="ins-btn danger" @click="store.removeNode(store.selected.id)"><Trash2 :size="13" /> 删除</button>
          </div>
        </template>
        <template v-else>
          <p class="ins-empty">
            <Move :size="28" />
            <span>点击节点查看与编辑参数</span>
          </p>
          <div class="ins-stat">
            <p><strong>工作流统计</strong></p>
            <p>· 节点：{{ store.nodeCount }}</p>
            <p>· 连接：{{ store.edges.length }}</p>
            <p>· 类型：{{ [...new Set(store.nodes.map(n => nodeMeta(n.type)?.label))].join(' / ') || '无' }}</p>
            <p>· 状态：<span :class="{ ok: store.doneCount === store.nodeCount }">{{ store.doneCount }}/{{ store.nodeCount }}</span> 完成</p>
          </div>
        </template>
      </aside>
    </div>

    <!-- 节点右键菜单 -->
    <Teleport to="body">
      <Transition name="ctx">
        <div
          v-if="contextMenu.visible"
          class="ctx-menu"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          @contextmenu.prevent
        >
          <p class="ctx-title">{{ contextMenu.title }}</p>

          <!-- 节点操作菜单 -->
          <template v-if="contextMenu.forNodeId">
            <button
              v-for="(item, idx) in contextMenu.items"
              :key="idx"
              class="ctx-item"
              :class="{ danger: item.danger, divider: item.divider }"
              @click="onContextAction(item)"
            >
              <template v-if="!item.divider">
                <span class="ctx-icon" :class="{ danger: item.danger }">
                  <component :is="item.icon" :size="14" />
                </span>
                <span class="ctx-label">{{ item.label }}</span>
              </template>
            </button>
          </template>

          <!-- 节点添加分类菜单 -->
          <template v-else>
            <div v-for="(group, gi) in contextMenu.items" :key="group.type" class="ctx-group">
              <p class="ctx-group-label">{{ group.label }}</p>
              <div class="ctx-group-items">
                <button
                  v-for="n in group.children"
                  :key="n.id"
                  class="ctx-item ctx-node"
                  :style="{ '--nc': n.color }"
                  @click="onNodePickFromMenu(n.id)"
                >
                  <span class="ctx-icon" :style="{ background: n.color, color: '#fff' }"><component :is="n.icon" :size="13" /></span>
                  <span class="ctx-label">{{ n.label }}</span>
                  <span v-if="n.llmRequired === 'yes'" class="ctx-llm yes">AI</span>
                  <span v-else-if="n.llmRequired === 'optional'" class="ctx-llm opt">⚡/✋</span>
                </button>
              </div>
            </div>
          </template>
        </div>
      </Transition>
    </Teleport>

    <!-- 端口点击：弹下游节点菜单 -->
    <Teleport to="body">
      <Transition name="ctx">
        <div
          v-if="portClickMenu.visible"
          class="ctx-menu port-menu"
          :style="{ left: portClickMenu.x + 'px', top: portClickMenu.y + 'px' }"
          @contextmenu.prevent
          @click.stop
        >
          <p class="ctx-title">添加下游节点</p>
          <p class="ctx-hint">从输出「{{ nodeMeta(store.nodes.find(n => n.id === portClickMenu.nodeId)?.type)?.produces }}」可连接：</p>
          <div v-if="portClickMenu.candidates.length" class="port-cand-grid">
            <button
              v-for="n in portClickMenu.candidates"
              :key="n.id"
              class="ctx-item ctx-node"
              :style="{ '--nc': n.color }"
              @click="pickFromPortClick(n)"
            >
              <span class="ctx-icon" :style="{ background: n.color, color: '#fff' }"><component :is="n.icon" :size="13" /></span>
              <span class="ctx-label">{{ n.label }}</span>
            </button>
          </div>
          <p v-else class="ctx-empty">该输出类型暂无可连接的下游</p>
        </div>
      </Transition>
    </Teleport>

    <!-- 版本历史抽屉 -->
    <Teleport to="body">
      <Transition name="hist">
        <div v-if="showHistory" class="hist-mask" @click.self="closeHistory">
          <div class="hist-drawer">
            <header class="hist-head">
              <div>
                <p class="hist-title">版本历史</p>
                <p class="hist-sub">当前画布的所有快照 · 自动每 60 秒存一次</p>
              </div>
              <button class="hist-x" @click="closeHistory"><X :size="18" /></button>
            </header>

            <!-- 保存为新版本 -->
            <div class="hist-save">
              <input v-model="historyLabel" placeholder="版本标签（可选）" @keyup.enter="saveAsVersion" />
              <button class="hist-save-btn" @click="saveAsVersion">
                <Save :size="14" /> 保存
              </button>
            </div>

            <!-- 版本列表 -->
            <div class="hist-list">
              <div v-if="!versions.length" class="hist-empty">
                暂无快照版本。点击"保存"创建第一个版本。
              </div>
              <div
                v-for="v in versions"
                :key="v.id"
                class="hist-item"
              >
                <div class="hist-item-main">
                  <p class="hist-item-title">{{ v.label }}</p>
                  <p class="hist-item-meta">
                    {{ new Date(v.savedAt).toLocaleString('zh-CN') }} · {{ v.nodeCount }} 节点 · {{ v.edgeCount }} 连接
                  </p>
                </div>
                <div class="hist-item-actions">
                  <button class="hi-load" @click="loadVer(v.id)" title="加载"><Download :size="13" /></button>
                  <button class="hi-del" @click="removeVer(v.id, $event)" title="删除"><Trash :size="13" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- 多选工具条（底部） -->
    <Teleport to="body">
      <Transition name="multi-tb">
        <div v-if="showMultiToolbar" class="multi-tb">
          <div class="mt-count">
            <Layers :size="14" />
            <span>已选 <b>{{ selectedIds.length }}</b> 个节点</span>
          </div>
          <button class="mt-btn primary" @click="runSelected" title="批量执行">
            <Play :size="14" /> 执行
          </button>
          <button class="mt-btn" @click="copySelected" title="批量复制">
            <Copy :size="14" /> 复制
          </button>
          <button class="mt-btn" @click="tidySelected" title="整理">
            <Sparkles :size="14" /> 整理
          </button>
          <button class="mt-btn" @click="downloadSelected" title="下载产物">
            <Download :size="14" /> 下载
          </button>
          <div class="mt-sep"></div>
          <button class="mt-btn icon" @click="alignSelected('left')" title="左对齐">⫷</button>
          <button class="mt-btn icon" @click="alignSelected('center-h')" title="水平居中">⫶</button>
          <button class="mt-btn icon" @click="alignSelected('right')" title="右对齐">⫸</button>
          <button class="mt-btn icon" @click="alignSelected('top')" title="顶对齐">⫯</button>
          <button class="mt-btn icon" @click="alignSelected('center-v')" title="垂直居中">⫶</button>
          <button class="mt-btn icon" @click="alignSelected('bottom')" title="底对齐">⫭</button>
          <div class="mt-sep"></div>
          <button class="mt-btn danger" @click="deleteSelected" title="删除">
            <Trash2 :size="14" /> 删除
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- 翻书 Modal（任务 43：album-flip 节点点击弹出） -->
    <Teleport to="body">
      <Transition name="album">
        <div v-if="showAlbumModal" class="album-mask" @click.self="closeAlbumModal">
          <div class="album-stage" :class="albumMode">
            <header class="album-bar">
              <div class="ab-title">
                <BookOpen :size="18" />
                <span>{{ store.nodes.find(n => n.id === albumNodeId)?.label || '画册预览' }}</span>
              </div>
              <div class="ab-mode">
                <button :class="{ on: albumMode === 'single' }" @click="setAlbumMode('single')">单页</button>
                <button :class="{ on: albumMode === 'double' }" @click="setAlbumMode('double')">双页</button>
              </div>
              <button class="ab-close" @click="closeAlbumModal" title="关闭"><X :size="18" /></button>
            </header>

            <div class="book-wrap">
              <button class="book-nav prev" :disabled="albumPage === 0" @click="albumPrev"><ChevronLeft :size="32" /></button>
              <div class="book" :class="albumMode">
                <!-- 单页模式 -->
                <Transition :name="'book-single-' + (albumPage >= (albumMode === 'double' ? COVERS.length - 1 : COVERS.length - 1) ? 'fwd' : 'fwd')" mode="out-in">
                  <div v-if="albumMode === 'single'" :key="albumPage" class="book-page single">
                    <img :src="`/asset/cover-${COVERS[albumPage]}.svg`" :alt="`第 ${albumPage + 1} 页`" />
                    <div class="page-no">— {{ albumPage + 1 }} —</div>
                  </div>
                </Transition>
                <!-- 双页模式 -->
                <Transition name="book-double" mode="out-in">
                  <div v-if="albumMode === 'double'" :key="albumPage" class="book-double">
                    <div class="book-page left">
                      <img :src="`/asset/cover-${COVERS[albumPage]}.svg`" :alt="`第 ${albumPage + 1} 页`" />
                      <div class="page-no">— {{ albumPage + 1 }} —</div>
                    </div>
                    <div class="book-spine"></div>
                    <div class="book-page right">
                      <img :src="`/asset/cover-${COVERS[albumPage + 1] || COVERS[albumPage]}.svg`" :alt="`第 ${albumPage + 2} 页`" />
                      <div class="page-no">— {{ albumPage + 2 }} —</div>
                    </div>
                  </div>
                </Transition>
              </div>
              <button class="book-nav next" :disabled="albumMode === 'single' ? albumPage >= COVERS.length - 1 : albumPage >= COVERS.length - 2" @click="albumNext"><ChevronRight :size="32" /></button>
            </div>

            <footer class="album-foot">
              <span class="page-info">{{ albumPage + 1 }} / {{ COVERS.length }}</span>
              <div class="page-dots">
                <span
                  v-for="(i, idx) in COVERS"
                  :key="i"
                  class="dot"
                  :class="{ active: idx === albumPage }"
                  @click="albumPage = idx"
                ></span>
              </div>
              <button class="sound-btn" @click="playFlipSound" title="试听翻页音效">
                <Volume2 :size="14" /> 翻页音效
              </button>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* —— 顶部 —— */
.ic-shell { display: flex; flex-direction: column; height: 100vh; background: var(--color-bg-deep); }
.ic-top { flex-shrink: 0; height: var(--header-h); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: color-mix(in srgb, var(--color-surface) 80%, transparent); backdrop-filter: blur(14px); border-bottom: 1px solid var(--color-border); }
.ic-top-left, .ic-top-right { display: flex; align-items: center; gap: 10px; }
.back-home { display: inline-flex; align-items: center; gap: 6px; padding: 0.4rem 0.8rem; border-radius: var(--r-full); font-size: var(--text-xs); font-weight: 500; color: var(--color-text-2); background: var(--color-surface); border: 1px solid var(--color-border); transition: all var(--dur-fast) ease; }
.back-home:hover { color: var(--color-accent); border-color: var(--color-accent); transform: translateX(-2px); }
.ic-divider { width: 1px; height: 18px; background: var(--color-border); }
.ws-logo { display: flex; align-items: center; gap: 0.4rem; font-family: var(--font-display); font-weight: 700; font-size: var(--text-sm); color: var(--color-text-1); }
.ws-logo-mark { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; background: var(--color-accent); color: var(--color-text-inverse); border-radius: 8px; font-weight: 700; }
.ic-title { font-size: var(--text-sm); font-weight: 500; color: var(--color-text-3); }
.project-name-input { width: 150px; padding: 4px 10px; border-radius: 8px; background: var(--color-surface-2); border: 1.5px solid var(--color-border); color: var(--color-text-1); font-size: var(--text-sm); }
.project-name-input:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--glow-accent); }
.storage-badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: var(--r-full); }
.storage-badge.cloud { background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success); }
.storage-badge.local { background: var(--color-surface-2); color: var(--color-text-3); }

.ic-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.45rem 0.8rem; border-radius: 10px; background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text-2); font-size: var(--text-sm); font-weight: 500; transition: all var(--dur-fast) ease; }
.ic-btn:hover { color: var(--color-accent); border-color: var(--color-accent); }
.ic-btn-primary { background: var(--color-accent); color: var(--color-text-inverse); border-color: transparent; box-shadow: var(--shadow-accent); }
.ic-btn-primary:hover { background: var(--color-accent-hover); transform: translateY(-1px); }
.ic-btn-danger { color: var(--color-error); border-color: color-mix(in srgb, var(--color-error) 30%, transparent); }

.ic-zoom { display: inline-flex; align-items: center; gap: 4px; padding: 3px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; }
.ic-zoom .ic-btn { padding: 0.3rem 0.5rem; border: none; background: transparent; }
.zoom-num { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-2); min-width: 42px; text-align: center; }

/* —— 主体 —— */
.ic-body { flex: 1; display: flex; overflow: hidden; }

/* —— 左侧节点库 —— */
.ic-sidebar { flex-shrink: 0; width: 232px; padding: 14px 12px; background: var(--color-surface); border-right: 1px solid var(--color-border); overflow-y: auto; transition: width 0.25s var(--ease-out-expo), padding 0.2s ease; }
.ic-sidebar.collapsed { width: 56px; padding: 12px 6px; overflow-x: hidden; }
.ic-sidebar.collapsed .side-title, .ic-sidebar.collapsed .side-hint, .ic-sidebar.collapsed .cat-block, .ic-sidebar.collapsed .template-btn, .ic-sidebar.collapsed .side-tips { display: none; }
.sb-collapsed-head { display: flex; justify-content: center; padding-bottom: 12px; border-bottom: 1px dashed var(--color-border); margin-bottom: 8px; }
.sb-icon-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--color-surface-2); color: var(--color-text-2); }
.sb-icon-btn:hover { color: var(--color-accent); background: var(--color-accent-soft); }
.sb-collapsed-icons { display: flex; flex-direction: column; gap: 4px; align-items: center; }
.sb-ic-item { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--color-surface-2); color: var(--nc); border: 1.5px solid transparent; transition: all var(--dur-fast) ease; position: relative; }
.sb-ic-item:hover { border-color: var(--nc); background: color-mix(in srgb, var(--nc) 10%, transparent); transform: scale(1.06); }
.sb-ic-item:hover::after { content: attr(title); position: absolute; left: calc(100% + 8px); top: 50%; transform: translateY(-50%); padding: 4px 10px; background: var(--color-text-1); color: var(--color-surface); font-size: var(--text-xs); white-space: nowrap; border-radius: 6px; pointer-events: none; z-index: 100; }

.side-title { font-size: var(--text-sm); font-weight: 700; color: var(--color-text-1); }
.side-hint { font-size: var(--text-xs); color: var(--color-text-3); margin-bottom: var(--sp-3); }
.cat-block { margin-bottom: 12px; }
.cat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-3); padding: 4px 6px; }
.node-type-btn { width: 100%; display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; background: var(--color-surface-2); border: 1px solid transparent; color: var(--color-text-2); font-size: var(--text-xs); font-weight: 500; text-align: left; margin-bottom: 2px; transition: all var(--dur-fast) ease; }
.node-type-btn:hover { border-color: var(--nc); background: color-mix(in srgb, var(--nc) 12%, transparent); color: var(--color-text-1); }
.nt-icon { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: var(--nc); color: #fff; flex-shrink: 0; }
.nt-name { flex: 1; }
.nt-llm { font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 700; }
.nt-llm.yes { background: color-mix(in srgb, var(--color-accent) 16%, transparent); color: var(--color-accent); }
.nt-llm.opt { background: color-mix(in srgb, var(--color-warning) 16%, transparent); color: var(--color-warning); }
.nt-llm.no { background: var(--color-surface-2); color: var(--color-text-3); }

.template-btn { width: 100%; display: flex; align-items: center; gap: 6px; justify-content: center; margin-top: 12px; padding: 0.55rem; border-radius: 10px; background: linear-gradient(135deg, var(--color-accent), var(--color-ai)); color: #fff; font-size: var(--text-sm); font-weight: 600; box-shadow: var(--shadow-accent); transition: all var(--dur-fast) ease; }
.template-btn:hover { transform: translateY(-1px); }

.side-tips { margin-top: 16px; padding: 10px; background: var(--color-surface-2); border-radius: 10px; font-size: 11px; color: var(--color-text-3); line-height: 1.85; }
.side-tips p:first-child { color: var(--color-text-1); margin-bottom: 2px; }
.side-tips b { color: var(--color-text-2); font-weight: 600; }

/* —— 中央画布 —— */
.ic-canvas { flex: 1; position: relative; overflow: hidden; background: var(--color-bg); }
.grid-bg { position: absolute; inset: 0; background-image: linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px); background-size: 24px 24px; opacity: 0.5; pointer-events: none; }

.ic-world { position: absolute; top: 0; left: 0; transform-origin: 0 0; width: 0; height: 0; }

.edges-svg { position: absolute; top: 0; left: 0; width: 6000px; height: 4000px; max-width: none; max-height: none; pointer-events: none; overflow: visible; z-index: 1; }
.edge-hot { stroke-width: 4 !important; filter: drop-shadow(0 0 6px currentColor); }
.edge-handle { cursor: pointer; pointer-events: all; }
.drag-edge-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 3; }

/* —— 节点 —— */
.node { position: absolute; background: var(--color-surface); border: 1.5px solid var(--nc); border-radius: 14px; padding: 12px 14px 10px; cursor: grab; transition: box-shadow var(--dur-fast) ease, transform 0.05s; user-select: none; display: flex; flex-direction: column; gap: 8px; z-index: 2; }
.node:hover { box-shadow: var(--shadow-md); }
.node.selected { z-index: 1000; box-shadow: 0 0 0 3px color-mix(in srgb, var(--nc) 30%, transparent), var(--shadow-lg); }
.node.in-multi { box-shadow: 0 0 0 2px var(--color-accent), var(--shadow-md); }
.node.running { animation: n-blink 1.2s ease-in-out infinite; z-index: 3; }
.node.done { box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-success) 30%, transparent); }
.node:active { cursor: grabbing; }
@keyframes n-blink { 50% { box-shadow: 0 0 0 4px var(--color-warning); } }

.node-head { display: flex; align-items: center; gap: 6px; }
.node-icon { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; color: #fff; flex-shrink: 0; }
.node-title { flex: 1; font-size: var(--text-sm); font-weight: 700; color: var(--color-text-1); }
.node-x { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; color: var(--color-text-3); transition: all var(--dur-fast) ease; opacity: 0; }
.node:hover .node-x { opacity: 1; }
.node-x:hover { background: var(--color-error); color: #fff; }

.node-hint.waiting { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; background: var(--color-surface-2); color: var(--color-text-3); font-size: var(--text-xs); }

/* 未选中：紧凑摘要 */
.node-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--color-surface-2);
  font-size: var(--text-xs);
  color: var(--color-text-2);
  font-weight: 500;
}
.node-summary .sum-model { margin-left: auto; font-family: var(--font-mono); font-size: 9px; color: var(--color-text-3); }
.sum-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.sum-dot.running { background: var(--color-warning); animation: pulse 1s ease-in-out infinite; }
.sum-dot.done { background: var(--color-success); }
.sum-dot.wait { background: var(--color-text-3); }
.sum-dot.idle { background: var(--color-border-strong); }

/* 复杂节点统一视觉：节点主区（占据核心） */
.node-main { display: flex; flex-direction: column; gap: 8px; min-height: 140px; }

/* 视觉类状态：idle / running / done */
.visual-state { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 140px; border-radius: 10px; background: var(--color-surface-2); padding: 16px; overflow: hidden; }
.visual-state.idle { color: var(--color-text-3); }
.visual-state.running { background: color-mix(in srgb, var(--color-warning) 8%, transparent); color: var(--color-warning); }
.visual-state.done { background: var(--color-surface); padding: 0; cursor: pointer; }
.state-icon.idle-icon { color: var(--nc); opacity: 0.6; }
.state-text { font-size: var(--text-xs); font-weight: 500; color: var(--color-text-3); }
.progress { width: 60%; height: 4px; background: var(--color-surface); border-radius: 2px; overflow: hidden; }
.progress-bar { width: 30%; height: 100%; background: linear-gradient(90deg, var(--color-warning), var(--color-accent)); border-radius: 2px; animation: p-move 1.2s infinite; }
@keyframes p-move { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }

/* 图片结果 */
.visual-state.done .result-img { width: 100%; height: auto; max-height: 280px; object-fit: cover; display: block; border-radius: 10px; }
.result-tools { position: absolute; right: 8px; top: 8px; display: flex; flex-direction: column; gap: 4px; opacity: 0; transition: opacity 0.2s; }
.visual-state.done:hover .result-tools { opacity: 1; }
.rt-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(255,255,255,0.95); color: var(--color-text-1); border: 1px solid var(--color-border); box-shadow: var(--shadow-sm); transition: all 0.15s ease; }
.rt-btn:hover { background: var(--color-accent); color: #fff; }
.result-cta { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); padding: 4px 12px; border-radius: var(--r-full); background: rgba(0,0,0,0.65); color: #fff; font-size: var(--text-xs); font-weight: 600; opacity: 0.95; }

/* 文本类节点 */
.text-result { display: flex; flex-direction: column; gap: 6px; }
.tr-head { display: flex; align-items: center; justify-content: space-between; }
.tr-label { font-size: 11px; font-weight: 700; color: var(--nc); text-transform: uppercase; letter-spacing: 0.05em; }
.tr-copy { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: var(--r-full); background: color-mix(in srgb, var(--nc) 10%, transparent); color: var(--nc); font-size: 11px; font-weight: 600; }
.tr-copy:hover { background: var(--nc); color: #fff; }
.tr-body { width: 100%; padding: 10px 12px; background: var(--color-bg); border: 1.5px solid var(--color-border); border-radius: 8px; color: var(--color-text-1); font-size: 11px; font-family: var(--font-mono); line-height: 1.55; resize: vertical; min-height: 100px; }
.tr-body:focus { outline: none; border-color: var(--nc); box-shadow: 0 0 0 3px color-mix(in srgb, var(--nc) 15%, transparent); }
.text-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 100px; padding: 16px; color: var(--color-text-3); border-radius: 10px; background: var(--color-surface-2); }
.text-state.running { color: var(--color-warning); background: color-mix(in srgb, var(--color-warning) 8%, transparent); }

/* 来源徽章（已由上游控制） */
.src-badge { display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; padding: 3px 10px; border-radius: var(--r-full); background: color-mix(in srgb, var(--nc) 10%, transparent); color: var(--nc); font-size: 10px; font-weight: 600; }

/* 快捷操作 pill（创建输入 / 拆分） */
.quick-actions { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 6px; border-top: 1px dashed var(--color-border); }
.qa-pill { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: var(--r-full); background: var(--color-surface-2); color: var(--color-text-2); font-size: 11px; border: 1px solid var(--color-border); transition: all 0.15s ease; }
.qa-pill:hover { color: var(--nc); border-color: var(--nc); }
.qa-pill.ghost { background: transparent; }

/* 顶部执行按钮（圆形，参考图 1） */
.node-run { position: absolute; top: -8px; right: -8px; width: 32px; height: 32px; border-radius: 50%; background: var(--color-surface); border: 1.5px solid var(--color-border); color: var(--color-text-3); display: flex; align-items: center; justify-content: center; z-index: 2; transition: all 0.2s ease; box-shadow: var(--shadow-sm); }
.node-run:hover { background: var(--color-accent); color: #fff; border-color: var(--color-accent); transform: scale(1.06); }
.node-run.running { background: var(--color-warning); color: #fff; border-color: var(--color-warning); animation: pulse 1.2s infinite; }
.node-run.done { background: var(--color-success); color: #fff; border-color: var(--color-success); }

/* 底部状态条（耗时 + 消耗） */
.node-meta { display: flex; gap: 6px; padding-top: 6px; border-top: 1px dashed var(--color-border); }
.meta-chip { padding: 3px 10px; border-radius: var(--r-full); background: var(--color-surface-2); font-size: 10px; color: var(--color-text-3); font-weight: 600; }
.meta-chip.cost { background: color-mix(in srgb, var(--color-warning) 12%, transparent); color: var(--color-warning); }

/* 节点操作区（内嵌，所有节点选中后显示） */
.node-ops { display: flex; flex-direction: column; gap: 8px; padding: 10px 0 0; border-top: 1px dashed var(--color-border); margin-top: 4px; }
.ops-row { display: flex; flex-direction: column; gap: 4px; }
.ops-row.slider { gap: 6px; }
.ops-label { font-size: 10px; font-weight: 700; color: var(--color-text-3); text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; align-items: center; }
.ops-label em { font-style: normal; font-family: var(--font-mono); color: var(--color-accent); }
.ops-cost { padding: 4px 10px; border-radius: var(--r-full); background: color-mix(in srgb, var(--color-success) 10%, transparent); color: var(--color-success); font-size: 11px; font-weight: 600; align-self: flex-start; }

.ops-select-wrap { position: relative; }
.ops-select { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: var(--color-bg); border: 1.5px solid var(--color-border); border-radius: 8px; color: var(--color-text-1); font-size: 11px; font-weight: 600; transition: all 0.15s ease; cursor: pointer; }
.ops-select:hover { border-color: var(--color-text-2); }
.ops-select.open { border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--glow-accent); }
.ops-options { position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 50; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; box-shadow: var(--shadow-lg); max-height: 220px; overflow-y: auto; padding: 4px; }
.ops-opt { width: 100%; display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 6px; font-size: 11px; color: var(--color-text-2); transition: background 0.15s ease; text-align: left; }
.ops-opt:hover { background: var(--color-surface-2); color: var(--color-text-1); }
.ops-opt.active { background: color-mix(in srgb, var(--color-accent) 12%, transparent); color: var(--color-accent); font-weight: 600; }
.ops-opt-sp { display: inline-block; width: 11px; }

.ops-textarea, .ops-textarea-large { width: 100%; padding: 6px 10px; background: var(--color-bg); border: 1.5px solid var(--color-border); border-radius: 8px; color: var(--color-text-1); font-size: 11px; font-family: inherit; resize: vertical; min-height: 50px; }
.ops-textarea-large { min-height: 60px; }
.ops-textarea:focus, .ops-textarea-large:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--glow-accent); }

.ops-row input[type="range"] { width: 100%; height: 4px; -webkit-appearance: none; appearance: none; background: var(--color-surface-2); border-radius: 2px; }
.ops-row input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--color-accent); cursor: pointer; box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-accent) 12%, transparent); }

.ops-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.ops-pill { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: var(--r-full); background: color-mix(in srgb, var(--nc) 10%, transparent); color: var(--nc); font-size: 11px; font-weight: 600; border: 1px solid color-mix(in srgb, var(--nc) 20%, transparent); transition: all 0.15s ease; }
.ops-pill:hover { background: var(--nc); color: #fff; }

.ops-actions { display: flex; gap: 6px; padding-top: 6px; }
.ops-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 6px; border-radius: 8px; background: var(--color-surface-2); color: var(--color-text-2); font-size: 11px; font-weight: 600; transition: all 0.15s ease; }
.ops-btn:hover { background: var(--color-surface); color: var(--color-text-1); }
.ops-btn.primary { background: var(--color-accent); color: var(--color-text-inverse); }
.ops-btn.primary:hover { filter: brightness(1.08); }
.ops-btn.danger:hover { background: color-mix(in srgb, var(--color-error) 12%, transparent); color: var(--color-error); }

.ops-row.cost { display: flex; flex-direction: row; align-items: center; justify-content: space-between; }
.ops-row.cost .ops-label { flex: 0; }

/* 节点内操作区（选中时显示） */
.node-actions { display: flex; flex-direction: column; gap: 6px; padding: 8px 0 0; border-top: 1px dashed var(--color-border); margin-top: 4px; }
.na-group { display: flex; flex-direction: column; gap: 3px; }
.na-label { font-size: 10px; font-weight: 700; color: var(--color-text-3); text-transform: uppercase; letter-spacing: 0.05em; }
.na-select {
  width: 100%;
  padding: 6px 10px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-1);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--dur-fast) ease;
}
.na-select:hover { border-color: var(--color-text-2); }
.na-select:focus { outline: none; border-color: var(--nc); box-shadow: 0 0 0 3px color-mix(in srgb, var(--nc) 18%, transparent); }
.na-run {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  padding: 7px 12px;
  margin-top: 4px;
  border-radius: 8px;
  background: var(--nc);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  transition: all var(--dur-fast) ease;
}
.na-run:hover { transform: translateY(-1px); filter: brightness(1.08); }

.node-body { display: flex; flex-direction: column; gap: 6px; }
.n-text { resize: vertical; width: 100%; padding: 6px 8px; background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-text-1); font-size: var(--text-xs); font-family: inherit; min-height: 50px; }
.n-text:focus { outline: none; border-color: var(--nc); box-shadow: 0 0 0 3px color-mix(in srgb, var(--nc) 18%, transparent); }

.n-upload { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 0; border: 1.5px dashed var(--color-border); border-radius: 10px; color: var(--color-text-3); }
.up-thumb { color: var(--nc); }
.up-tip { font-size: var(--text-xs); }
.up-btn { font-size: var(--text-xs); padding: 4px 12px; border-radius: 6px; background: var(--nc); color: #fff; font-weight: 600; }

.n-art { display: flex; flex-direction: column; gap: 4px; }
.art-frame { position: relative; width: 100%; aspect-ratio: 4 / 3; background: var(--color-surface-2); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--color-text-3); overflow: hidden; }
.art-frame.running { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
.art-frame.is-share { background: linear-gradient(135deg, var(--color-success-soft), color-mix(in srgb, var(--color-accent) 12%, transparent)); aspect-ratio: auto; min-height: 80px; padding: 12px; }
.art-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.share-preview { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--color-text-1); text-align: center; }
.share-icon { width: 36px; height: 36px; border-radius: 50%; background: var(--color-success); color: #fff; display: flex; align-items: center; justify-content: center; }
.share-title { font-size: var(--text-sm); font-weight: 600; }
.open-link { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: var(--r-full); background: var(--color-accent); color: #fff; font-size: var(--text-xs); font-weight: 700; transition: all var(--dur-fast) ease; }
.open-link:hover { transform: translateY(-1px); filter: brightness(1.08); }
.art-pulse, .art-done, .art-placeholder { display: flex; align-items: center; gap: 6px; font-size: var(--text-xs); font-weight: 600; }
.art-done { color: var(--color-success); }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.art-meta { font-size: 10px; color: var(--color-text-3); text-align: center; }
.art-meta.muted { color: var(--color-text-3); }

.n-tagging { display: flex; flex-direction: column; gap: 6px; }
.tag { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; align-self: flex-start; }
.n-desc { font-size: var(--text-xs); color: var(--color-text-2); }
.act-row { display: flex; gap: 6px; flex-wrap: wrap; }
.act-mini { font-size: 10px; padding: 3px 8px; border-radius: 6px; background: var(--color-surface-2); color: var(--color-text-2); border: 1px solid var(--color-border); }
.act-mini:hover { color: var(--nc); border-color: var(--nc); }

.n-llm { display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; background: var(--color-surface-2); }
.llm-status { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-xs); color: var(--color-text-2); font-weight: 500; }
.llm-status .spin { color: var(--color-warning); }

.n-default .n-desc { font-size: var(--text-xs); color: var(--color-text-3); }

/* 简单节点：share 内嵌预览链接 */
.share-inline { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 0; }
.share-inline-id { font-size: var(--text-xs); color: var(--color-text-3); font-family: var(--font-mono); }

/* 业务节点：需求记录 / 报价 / 物料 / 导出 */
.req-form { display: flex; flex-direction: column; gap: 5px; }
.rf-row { display: flex; align-items: center; gap: 8px; }
.rf-label { flex: 0 0 42px; font-size: 11px; font-weight: 600; color: var(--color-text-3); }
.rf-row input, .rf-row select { flex: 1; min-width: 0; padding: 4px 8px; background: var(--color-bg); border: 1.5px solid var(--color-border); border-radius: 6px; color: var(--color-text-1); font-size: 11px; font-family: inherit; }
.rf-row input:focus, .rf-row select:focus { outline: none; border-color: var(--nc); box-shadow: 0 0 0 3px color-mix(in srgb, var(--nc) 14%, transparent); }
.rf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.brief-card, .quote-card, .material-card, .export-card { display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border-radius: 8px; background: var(--color-surface-2); }
.bc-title { font-size: 11px; font-weight: 700; color: var(--color-text-1); }
.bc-text { font-size: 10px; color: var(--color-text-2); line-height: 1.6; white-space: pre-wrap; margin: 0; font-family: inherit; }
.quote-table { width: 100%; border-collapse: collapse; font-size: 10px; }
.quote-table th, .quote-table td { padding: 3px 5px; border-bottom: 1px solid var(--color-border); text-align: left; color: var(--color-text-2); }
.quote-table th { color: var(--color-text-3); font-weight: 600; }
.quote-total { display: flex; align-items: center; justify-content: flex-end; gap: 8px; font-size: 11px; color: var(--color-text-2); }
.quote-total b { font-size: 13px; color: var(--color-accent); }
.quote-form { display: flex; flex-direction: column; gap: 5px; }
.material-card .quote-table { font-size: 10px; }
.export-card { align-items: flex-start; }
.export-card .open-link { align-self: stretch; justify-content: center; }

.node-foot { display: flex; align-items: center; justify-content: space-between; gap: 4px; padding-top: 6px; border-top: 1px dashed var(--color-border); font-size: 10px; color: var(--color-text-3); }
.foot-model, .foot-size { padding: 1px 6px; border-radius: 4px; background: var(--color-surface-2); font-family: var(--font-mono); }

/* 节点运行状态徽章 */
.node-status { position: absolute; top: -6px; left: -6px; display: flex; align-items: center; justify-content: center; }
.node-status.running { width: 16px; height: 16px; border-radius: 50%; background: var(--color-warning); }
.pulse { width: 8px; height: 8px; border-radius: 50%; background: #fff; animation: pulse 1s ease-in-out infinite; }
@keyframes pulse { 50% { transform: scale(0.5); opacity: 0.5; } }
.node-status.done { width: 18px; height: 18px; border-radius: 50%; background: var(--color-success); color: #fff; font-size: 10px; font-weight: 700; }

/* 端口 */
.port { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: var(--color-surface); border: 2.5px solid var(--pc, var(--color-accent)); cursor: crosshair; transition: transform var(--dur-fast) ease; pointer-events: all; box-shadow: 0 0 0 3px var(--color-surface); }
.port:hover { transform: scale(1.4); box-shadow: 0 0 0 4px var(--color-surface); }
.port-in { left: -8px; top: 50%; transform: translateY(-50%); }
.port-out { right: -8px; top: 50%; transform: translateY(-50%); cursor: pointer; }
.port-in:hover, .port-out:hover { transform: translateY(-50%) scale(1.4); }

/* —— 状态栏 —— */
.canvas-status { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 99px; background: var(--color-surface); border: 1px solid var(--color-border); box-shadow: var(--shadow-md); font-size: var(--text-xs); color: var(--color-text-3); font-weight: 500; pointer-events: none; z-index: 5; }
.st-ok { color: var(--color-success); }

/* —— 右侧属性面板 —— */
.ic-inspector { flex-shrink: 0; width: 280px; padding: 16px; background: var(--color-surface); border-left: 1px solid var(--color-border); overflow-y: auto; }
.ins-title { font-size: var(--text-base); font-weight: 700; margin-bottom: 4px; }
.ins-desc { font-size: var(--text-xs); color: var(--color-text-3); margin-bottom: 14px; line-height: 1.6; }
.ins-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.ins-field span { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-2); display: flex; justify-content: space-between; align-items: center; }
.ins-field span em { font-style: normal; font-family: var(--font-mono); color: var(--color-accent); }
.ins-field input, .ins-field textarea, .ins-field select { padding: 0.5rem 0.7rem; background: var(--color-surface-2); border: 1.5px solid var(--color-border); border-radius: 8px; color: var(--color-text-1); font-size: var(--text-sm); font-family: inherit; transition: all var(--dur-fast) ease; }
.ins-field input:focus, .ins-field textarea:focus, .ins-field select:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--glow-accent); }
.ins-field textarea { resize: vertical; min-height: 60px; }
.slider-field input[type="range"] { padding: 0; background: transparent; border: none; -webkit-appearance: none; width: 100%; height: 4px; border-radius: 2px; background: var(--color-surface-2); }
.slider-field input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--color-accent); cursor: pointer; box-shadow: 0 0 0 4px var(--color-accent-soft); }

.ins-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--color-border); }
.ins-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0.55rem; border-radius: 10px; background: var(--color-surface-2); color: var(--color-text-2); font-size: var(--text-sm); font-weight: 600; transition: all var(--dur-fast) ease; }
.ins-btn:hover { background: var(--color-accent-soft); color: var(--color-accent); }
.ins-btn.danger:hover { background: color-mix(in srgb, var(--color-error) 10%, transparent); color: var(--color-error); }

.ins-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 40px 0; color: var(--color-text-3); font-size: var(--text-sm); }
.ins-stat { padding: 12px; background: var(--color-surface-2); border-radius: 10px; font-size: var(--text-xs); color: var(--color-text-3); line-height: 1.9; }
.ins-stat p:first-child { color: var(--color-text-1); margin-bottom: 4px; }
.ins-stat .ok { color: var(--color-success); font-weight: 600; }

/* —— 右键菜单 —— */
.ctx-menu { position: fixed; z-index: 2000; min-width: 200px; max-width: 280px; max-height: 480px; overflow-y: auto; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; box-shadow: var(--shadow-lg); padding: 6px; }
.ctx-title { font-size: var(--text-xs); font-weight: 700; color: var(--color-text-3); padding: 6px 10px 8px; border-bottom: 1px solid var(--color-border); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
.ctx-hint { padding: 4px 10px; font-size: 11px; color: var(--color-text-3); }
.ctx-group { margin-bottom: 4px; }
.ctx-group-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-3); padding: 6px 10px 2px; }
.ctx-group-items { display: flex; flex-direction: column; gap: 1px; }
.ctx-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 8px; text-align: left; transition: background var(--dur-fast) ease; }
.ctx-item:hover { background: color-mix(in srgb, var(--nc, var(--color-text-2)) 14%, transparent); }
.ctx-item.danger:hover { background: color-mix(in srgb, var(--color-error) 10%, transparent); }
.ctx-item.divider { height: 1px; background: var(--color-border); padding: 0; margin: 4px 0; pointer-events: none; }
.ctx-icon { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; background: var(--color-surface-2); color: var(--color-text-2); flex-shrink: 0; }
.ctx-icon.danger { color: var(--color-error); }
.ctx-item.ctx-node .ctx-icon { background: var(--nc); color: #fff; }
.ctx-label { flex: 1; font-size: var(--text-sm); font-weight: 600; color: var(--color-text-1); }
.ctx-llm { font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 700; }
.ctx-llm.yes { background: var(--color-accent-soft); color: var(--color-accent); }
.ctx-llm.opt { background: color-mix(in srgb, var(--color-warning) 16%, transparent); color: var(--color-warning); }
.ctx-empty { padding: 14px 10px; text-align: center; font-size: var(--text-xs); color: var(--color-text-3); }

.port-menu { min-width: 320px; max-width: 380px; }
.port-cand-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; padding: 4px; }

.ctx-enter-active, .ctx-leave-active { transition: all 0.15s var(--ease-out-expo); }
.ctx-enter-from, .ctx-leave-to { opacity: 0; transform: scale(0.96) translateY(-4px); }

/* 响应式 */
@media (max-width: 1023px) {
  .ic-sidebar { width: 180px; }
  .ic-inspector { width: 240px; }
}
@media (max-width: 768px) {
  .ic-sidebar { display: none; }
  .ic-inspector { position: absolute; right: 0; top: var(--header-h); bottom: 0; box-shadow: var(--shadow-lg); z-index: 20; }
  .ic-top-left .ws-logo-text, .ic-title { display: none; }
}

/* —— 浮层操作面板 —— */
.float-panel { position: fixed; z-index: 1500; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 14px; box-shadow: var(--shadow-lg); padding: 0; min-width: 200px; max-width: 380px; }
.fp-handle { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--color-border); }
.fp-dot { width: 10px; height: 10px; border-radius: 50%; }
.fp-title { flex: 1; font-size: var(--text-sm); font-weight: 700; color: var(--color-text-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fp-close { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; color: var(--color-text-3); }
.fp-close:hover { background: var(--color-surface-2); color: var(--color-text-1); }
.fp-group { display: flex; flex-direction: column; gap: 6px; padding: 10px 14px; border-bottom: 1px dashed var(--color-border); }
.fp-group:last-of-type { border-bottom: none; }
.fp-label { font-size: 10px; font-weight: 700; color: var(--color-text-3); text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; align-items: center; }
.fp-label em { font-style: normal; font-family: var(--font-mono); color: var(--color-accent); }
.fp-select-wrap { position: relative; }
.fp-select { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--color-bg); border: 1.5px solid var(--color-border); border-radius: 8px; color: var(--color-text-1); font-size: var(--text-sm); font-weight: 500; cursor: pointer; transition: all var(--dur-fast) ease; }
.fp-select:hover, .fp-select:focus { border-color: var(--color-text-2); outline: none; }
.fp-options { position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 100; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; box-shadow: var(--shadow-lg); max-height: 280px; overflow-y: auto; padding: 4px; }
.fp-opt { width: 100%; display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-radius: 6px; font-size: var(--text-sm); color: var(--color-text-2); transition: background var(--dur-fast) ease; text-align: left; }
.fp-opt:hover { background: var(--color-surface-2); color: var(--color-text-1); }
.fp-opt.active { background: var(--color-accent-soft); color: var(--color-accent); font-weight: 600; }
.fp-opt-spacer { display: inline-block; width: 12px; }
.fp-textarea { width: 100%; padding: 8px 10px; background: var(--color-bg); border: 1.5px solid var(--color-border); border-radius: 8px; color: var(--color-text-1); font-size: var(--text-sm); font-family: inherit; resize: vertical; min-height: 70px; }
.fp-textarea:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--glow-accent); }
.fp-row { display: flex; gap: 6px; margin-top: 6px; }
.fp-mini { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; background: var(--color-surface-2); color: var(--color-text-2); font-size: 11px; border: 1px solid var(--color-border); transition: all var(--dur-fast) ease; }
.fp-mini:hover { color: var(--color-accent); border-color: var(--color-accent); }
.fp-actions { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; }
.fp-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; border-radius: 8px; background: var(--color-surface-2); color: var(--color-text-1); font-size: var(--text-sm); font-weight: 600; transition: all var(--dur-fast) ease; }
.fp-btn:hover { background: var(--color-surface); }
.fp-btn.primary { background: var(--color-accent); color: var(--color-text-inverse); }
.fp-btn.primary:hover { filter: brightness(1.08); }
.fp-btn.danger:hover { background: color-mix(in srgb, var(--color-error) 12%, transparent); color: var(--color-error); }
.float-panel input[type="range"] { width: 100%; height: 4px; -webkit-appearance: none; appearance: none; background: var(--color-surface-2); border-radius: 2px; }
.float-panel input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--color-accent); cursor: pointer; }
.float-panel-enter-active, .float-panel-leave-active { transition: all 0.18s var(--ease-out-expo); }
.float-panel-enter-from, .float-panel-leave-to { opacity: 0; transform: translateY(-6px) scale(0.98); }

/* —— 框选矩形 —— */
.box-svg { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 999; }

/* —— 多选工具条 —— */
.multi-tb { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 1100; display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 14px; box-shadow: var(--shadow-lg); }
.mt-count { display: inline-flex; align-items: center; gap: 4px; padding: 0 8px 0 4px; color: var(--color-text-2); font-size: var(--text-xs); }
.mt-count b { color: var(--color-accent); font-size: var(--text-sm); }
.mt-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 8px; background: var(--color-surface-2); color: var(--color-text-2); font-size: var(--text-xs); font-weight: 600; transition: all var(--dur-fast) ease; }
.mt-btn:hover { background: var(--color-surface); color: var(--color-text-1); }
.mt-btn.primary { background: var(--color-accent); color: var(--color-text-inverse); }
.mt-btn.primary:hover { filter: brightness(1.08); }
.mt-btn.danger:hover { background: color-mix(in srgb, var(--color-error) 12%, transparent); color: var(--color-error); }
.mt-btn.icon { width: 32px; padding: 6px 0; justify-content: center; font-size: 13px; }
.mt-sep { width: 1px; height: 18px; background: var(--color-border); }
.multi-tb-enter-active, .multi-tb-leave-active { transition: all 0.2s var(--ease-out-expo); }
.multi-tb-enter-from, .multi-tb-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }

/* —— 版本历史抽屉 —— */
.hist-mask { position: fixed; inset: 0; z-index: 1500; background: rgba(7,23,20,0.5); backdrop-filter: blur(4px); display: flex; justify-content: flex-end; }
.hist-drawer { width: 380px; max-width: 100vw; height: 100%; background: var(--color-surface); border-left: 1px solid var(--color-border); display: flex; flex-direction: column; box-shadow: -8px 0 24px rgba(0,0,0,0.12); }
.hist-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px; border-bottom: 1px solid var(--color-border); }
.hist-title { font-size: var(--text-base); font-weight: 700; }
.hist-sub { font-size: var(--text-xs); color: var(--color-text-3); margin-top: 4px; }
.hist-x { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: var(--r-md); color: var(--color-text-3); }
.hist-x:hover { background: var(--color-surface-2); color: var(--color-text-1); }

.hist-save { display: flex; gap: 8px; padding: 12px 20px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-2); }
.hist-save input { flex: 1; padding: 6px 10px; background: var(--color-surface); border: 1.5px solid var(--color-border); border-radius: 8px; font-size: var(--text-sm); color: var(--color-text-1); }
.hist-save input:focus { outline: none; border-color: var(--color-accent); }
.hist-save-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px; border-radius: 8px; background: var(--color-accent); color: var(--color-text-inverse); font-size: var(--text-sm); font-weight: 600; }

.hist-list { flex: 1; overflow-y: auto; padding: 8px 12px; }
.hist-empty { padding: 40px 12px; text-align: center; font-size: var(--text-sm); color: var(--color-text-3); }
.hist-item { display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 10px; transition: background var(--dur-fast) ease; margin-bottom: 4px; }
.hist-item:hover { background: var(--color-surface-2); }
.hist-item-main { flex: 1; min-width: 0; }
.hist-item-title { font-size: var(--text-sm); font-weight: 600; color: var(--color-text-1); }
.hist-item-meta { font-size: var(--text-xs); color: var(--color-text-3); margin-top: 2px; }
.hist-item-actions { display: flex; gap: 4px; }
.hi-load, .hi-del { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: var(--color-text-3); transition: all var(--dur-fast) ease; }
.hi-load:hover { background: var(--color-accent-soft); color: var(--color-accent); }
.hi-del:hover { background: color-mix(in srgb, var(--color-error) 12%, transparent); color: var(--color-error); }

.hist-enter-active, .hist-leave-active { transition: opacity 0.2s; }
.hist-enter-active .hist-drawer, .hist-leave-active .hist-drawer { transition: transform 0.25s var(--ease-spring); }
.hist-enter-from, .hist-leave-to { opacity: 0; }
.hist-enter-from .hist-drawer, .hist-leave-to .hist-drawer { transform: translateX(100%); }

/* —— 翻书 Modal —— */
.album-mask { position: fixed; inset: 0; z-index: 2000; background: rgba(7, 23, 20, 0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 32px; }
.album-stage { width: 100%; max-width: 1100px; height: 100%; display: flex; flex-direction: column; }
.album-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 4px 16px; color: #fff; }
.ab-title { display: flex; align-items: center; gap: 8px; font-size: var(--text-base); font-weight: 700; }
.ab-mode { display: flex; gap: 4px; background: rgba(255,255,255,0.08); border-radius: 99px; padding: 3px; }
.ab-mode button { padding: 6px 16px; border-radius: 99px; font-size: var(--text-sm); color: rgba(255,255,255,0.7); font-weight: 600; transition: all var(--dur-fast) ease; }
.ab-mode button.on { background: #fff; color: var(--color-text-1); }
.ab-close { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: rgba(255,255,255,0.1); }
.ab-close:hover { background: rgba(255,255,255,0.2); }

.book-wrap { flex: 1; display: flex; align-items: center; justify-content: center; gap: 24px; perspective: 2400px; }
.book-nav { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: rgba(255,255,255,0.08); flex-shrink: 0; transition: all var(--dur-fast) ease; }
.book-nav:hover:not(:disabled) { background: rgba(255,255,255,0.18); transform: scale(1.06); }
.book-nav:disabled { opacity: 0.3; cursor: not-allowed; }

.book { position: relative; display: flex; align-items: center; justify-content: center; transform-style: preserve-3d; }
.book.double { gap: 0; }

.book-page { background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2); position: relative; }
.book.single .book-page { width: 480px; height: 640px; }
.book.double .book-page { width: 380px; height: 520px; }
.book-page.left { border-radius: 6px 0 0 6px; transform-origin: right center; }
.book-page.right { border-radius: 0 6px 6px 0; transform-origin: left center; }
.book-spine { width: 8px; height: 100%; background: linear-gradient(90deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.18) 100%); position: relative; }
.book-spine::before, .book-spine::after { content: ''; position: absolute; left: 0; right: 0; height: 1px; background: rgba(0,0,0,0.1); }
.book-spine::before { top: 0; }
.book-spine::after { bottom: 0; }

.book-page img { display: block; width: 100%; height: 100%; object-fit: cover; }
.page-no { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.85); font-size: var(--text-sm); font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }

.album-foot { display: flex; align-items: center; justify-content: space-between; padding: 16px 4px 0; color: #fff; }
.page-info { font-family: var(--font-mono); font-size: var(--text-sm); color: rgba(255,255,255,0.7); }
.page-dots { display: flex; gap: 6px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.25); cursor: pointer; transition: all var(--dur-fast) ease; }
.dot:hover { background: rgba(255,255,255,0.5); }
.dot.active { background: #fff; transform: scale(1.3); }
.sound-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 99px; background: rgba(255,255,255,0.08); color: #fff; font-size: var(--text-xs); }
.sound-btn:hover { background: rgba(255,255,255,0.18); }

/* 翻书过渡动画 */
.album-enter-active, .album-leave-active { transition: opacity 0.3s; }
.album-enter-from, .album-leave-to { opacity: 0; }

.book-single-fwd-enter-active { animation: pageFlipFwd 0.7s var(--ease-spring) both; transform-origin: left center; }
.book-single-fwd-leave-active { animation: pageFlipFwdOut 0.7s var(--ease-spring) both; transform-origin: left center; }
@keyframes pageFlipFwd { 0% { opacity: 0; transform: perspective(2000px) rotateY(-90deg); } 100% { opacity: 1; transform: perspective(2000px) rotateY(0); } }
@keyframes pageFlipFwdOut { 0% { opacity: 1; transform: perspective(2000px) rotateY(0); } 100% { opacity: 0; transform: perspective(2000px) rotateY(90deg); } }

.book-double-enter-active { animation: bookOpen 0.6s var(--ease-spring) both; }
.book-double-leave-active { animation: bookOpenOut 0.4s var(--ease-spring) both; }
@keyframes bookOpen { 0% { opacity: 0; transform: perspective(2000px) rotateX(8deg) scale(0.95); } 100% { opacity: 1; transform: perspective(2000px) rotateX(0) scale(1); } }
@keyframes bookOpenOut { 0% { opacity: 1; } 100% { opacity: 0; transform: perspective(2000px) rotateX(-8deg) scale(0.95); } }

/* art-frame 可点击状态 */
.art-frame.clickable { cursor: pointer; }
.art-frame.clickable:hover { box-shadow: 0 0 0 2px var(--color-accent); }
</style>