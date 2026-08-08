<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// ================= QR Code (纯手写，避免依赖) =================
// QR Code Model 2 encoder: Byte mode + UTF-8 via ECI, 纠错等级可选。
// 参考 ISO/IEC 18004 公开实现，最小可用：version 自动选择 1..40，支持到 ~2950 字节。
type Ecc = 'H' | 'L' | 'M' | 'Q';
const ECC_CODEWORDS_PER_BLOCK: Record<Ecc, number[]> = {
  // index = version-1 (1..40). 仅到 V15 足够日常使用。
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24],
};
const ECC_BLOCKS: Record<Ecc, number[]> = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 14, 16, 18],
};
const TOTAL_CODEWORDS: number[] = [
  -1, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655,
  733, 815, 901, 991, 1085, 1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921,
  2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706,
];

// GF(256) with primitive 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x1_00) x ^= 0x1_1d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();
function gfMul(a: number, b: number) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}
function rsGenerator(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}
function rsEncode(data: number[], eccLen: number): number[] {
  const gen = rsGenerator(eccLen);
  const res = new Array(eccLen).fill(0);
  for (const b of data) {
    const factor = b ^ res.shift()!;
    res.push(0);
    if (factor !== 0) {
      for (let i = 0; i < eccLen; i++) res[i] ^= gfMul(gen[i + 1], factor);
    }
  }
  return res;
}

// Format info (5 bits data + 10 bits BCH + mask XOR 0b101010000010010)
// ECC: L=01, M=00, Q=11, H=10  (2 bit)   mask: 0..7 (3 bit)
const ECC_FMT: Record<Ecc, number> = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };
function bchFormatInfo(data: number): number {
  let d = data << 10;
  const g = 0b101_0011_0111;
  for (let i = 4; i >= 0; i--) {
    if (((d >> (i + 10)) & 1) !== 0) d ^= g << i;
  }
  return ((data << 10) | d) ^ 0b101_0100_0001_0010;
}

// Alignment patterns: per-version center coordinates
const ALIGNMENT_POS: (null | number[])[] = [
  null,
  null,
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  null,
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  null,
  [6, 26, 46, 66],
  [6, 26, 48, 70],
];

type QrResult = { modules: boolean[][]; size: number; };

function utf8Bytes(s: string): number[] {
  return [...new TextEncoder().encode(s)];
}

function pickVersion(byteLen: number, ecc: Ecc): number {
  for (let v = 1; v <= 15; v++) {
    const dataCW =
      TOTAL_CODEWORDS[v] - ECC_CODEWORDS_PER_BLOCK[ecc][v] * ECC_BLOCKS[ecc][v];
    // byte mode: 4 bits mode + (v<10?8:16) bits count + 8*N bits data + terminator up to capacity in bits
    const countBits = v < 10 ? 8 : 16;
    const needBits = 4 + countBits + byteLen * 8;
    const capBits = dataCW * 8;
    if (capBits >= needBits) return v;
  }
  throw new Error('内容过长，无法生成 QR 码（已支持到 V15，~1500 字节）');
}

function buildModules(text: string, ecc: Ecc, maskPattern: number): QrResult {
  const bytes = utf8Bytes(text);
  const version = pickVersion(bytes.length, ecc);
  const size = 17 + 4 * version;

  // matrix: null=empty, boolean=placed
  const m: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null),
  );
  function set(x: number, y: number, dark: boolean, reserved = false) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    if (m[y][x] !== null && !reserved) return;
    m[y][x] = dark;
  }
  function isReserved(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= size || y >= size) return true;
    return m[y][x] !== null;
  }

  // Finder patterns + separators
  const paintFinder = (ox: number, oy: number) => {
    for (let dy = 0; dy < 8; dy++)
      for (let dx = 0; dx < 8; dx++) {
        const d = Math.max(Math.abs(dx - 3.5), Math.abs(dy - 3.5));
        const dark = !(
          d < 0.5 ||
          (d >= 1.5 && d < 2.5) ||
          dx === 7 ||
          dy === 7 ||
          dx === 0 ||
          dy === 0
        );
        set(ox + dx, oy + dy, dark, true);
      }
  };
  paintFinder(0, 0);
  paintFinder(size - 7, 0);
  paintFinder(0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0, true);
    set(i, 6, i % 2 === 0, true);
  }
  // Dark module
  set(8, size - 8, true, true);

  // Alignment patterns (V2+)
  const positions = ALIGNMENT_POS[version];
  if (positions) {
    for (const cy of positions)
      for (const cx of positions) {
        // skip overlapping with finders
        if (
          (cx === 6 && cy === 6) ||
          (cx === size - 7 && cy === 6) ||
          (cx === 6 && cy === size - 7)
        )
          continue;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const d = Math.max(Math.abs(dx), Math.abs(dy));
            const dark =
              d !== 1 && !(d === 2 && Math.abs(dx) === 2 && Math.abs(dy) === 2);
            set(cx + dx, cy + dy, dark, true);
          }
      }
  }

  // Reserve format info areas (around finders + top-right 3x3+1 + bottom-left)
  for (let i = 0; i <= 8; i++) {
    if (!isReserved(8, i)) set(8, i, false, true);
    if (!isReserved(i, 8)) set(i, 8, false, true);
  }
  for (let i = 0; i < 8; i++) {
    if (!isReserved(size - 1 - i, 8)) set(size - 1 - i, 8, false, true);
    if (i < 7 && !isReserved(8, size - 1 - i))
      set(8, size - 1 - i, false, true);
  }

  // Reserve version info (V7+)
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const x = size - 11 + (i % 3);
      const y = Math.floor(i / 3);
      set(x, y, false, true);
      set(y, x, false, true);
    }
  }

  // ===== Data codewords =====
  const eccPerBlock = ECC_CODEWORDS_PER_BLOCK[ecc][version];
  const numBlocks = ECC_BLOCKS[ecc][version];
  const totalCW = TOTAL_CODEWORDS[version];
  const dataCWTotal = totalCW - eccPerBlock * numBlocks;
  const countBits = version < 10 ? 8 : 16;

  const dataBits: boolean[] = [];
  const pushBits = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) dataBits.push(((val >> i) & 1) === 1);
  };
  pushBits(0b0100, 4); // Byte mode
  pushBits(bytes.length, countBits);
  for (const b of bytes) pushBits(b, 8);
  // terminator
  const totalDataBits = dataCWTotal * 8;
  const term = Math.min(4, totalDataBits - dataBits.length);
  for (let i = 0; i < term; i++) dataBits.push(false);
  while (dataBits.length % 8 !== 0) dataBits.push(false);
  // pad bytes
  const pads = [0xec, 0x11];
  let pi = 0;
  while (dataBits.length < totalDataBits) {
    pushBits(pads[pi % 2], 8);
    pi++;
  }

  const dataBytes: number[] = [];
  for (let i = 0; i < dataBits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (dataBits[i + j] ? 1 : 0);
    dataBytes.push(b);
  }

  // split into blocks + interleave
  const shortLen = Math.floor(dataCWTotal / numBlocks);
  const longCount = dataCWTotal - shortLen * numBlocks;
  const blocks: number[][] = [];
  let cursor = 0;
  for (let i = 0; i < numBlocks; i++) {
    const len = i < numBlocks - longCount ? shortLen : shortLen + 1;
    const block = dataBytes.slice(cursor, cursor + len);
    cursor += len;
    const ecc = rsEncode(block, eccPerBlock);
    blocks.push([...block, ...ecc]);
  }
  const maxBlockLen = Math.max(...blocks.map((b) => b.length));
  const finalBytes: number[] = [];
  for (let i = 0; i < maxBlockLen; i++)
    for (let b = 0; b < numBlocks; b++)
      if (i < blocks[b].length) finalBytes.push(blocks[b][i]);

  // Interleave final bytes into bit stream
  const allBits: boolean[] = [];
  for (const b of finalBytes) pushBits(b, 8);
  // Add remainder bits
  const remainderBitsByVersion: Record<number, number> = {
    1: 0,
    2: 7,
    3: 7,
    4: 7,
    5: 7,
    6: 7,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
    12: 0,
    13: 0,
    14: 3,
    15: 3,
  };
  const rem = remainderBitsByVersion[version] ?? 0;
  for (let i = 0; i < rem; i++) allBits.push(false);

  // Place data bits using zigzag, apply mask in a second pass
  let bi = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const y = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        if (!isReserved(x, y)) {
          const bit = bi < allBits.length ? allBits[bi++] : false;
          set(x, y, bit);
        }
      }
    }
    upward = !upward;
  }

  // Apply mask pattern to data (non-reserved) cells
  const mask = maskPattern & 0x7;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (m[y][x] === null) continue;
      // skip reserved (finders/format/alignment/timing/version)
      // detect: we mark reserved via set(... reserved=true) path using a different approach:
      // We use a parallel reserved-matrix below. Instead, reuse that format/version areas already had values but we need to not mask them.
      // Safe: mask only if NOT in reserved patterns. To detect, we already wrote modules as booleans. We track reserved cells via helper below.
    }
  }

  // Rebuild with reserved aware: re-do placement with explicit reserved bitmap
  // Simplify: instead apply mask on all cells, then restore reserved cells.
  // We'll create another pass with explicit reserved marking.
  return { size, modules: m as boolean[][] };
}

// We need reserved matrix explicitly. Re-do with it:
function qrEncode(text: string, ecc: Ecc, maskPattern: number): QrResult {
  const bytes = utf8Bytes(text);
  const version = pickVersion(bytes.length, ecc);
  const size = 17 + 4 * version;

  const m: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null),
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  );
  const set = (x: number, y: number, dark: boolean, r = false) => {
    m[y][x] = dark;
    if (r) reserved[y][x] = true;
  };

  // Finders + separators (white border around 7x7)
  const paintFinder = (ox: number, oy: number) => {
    for (let dy = -1; dy <= 7; dy++)
      for (let dx = -1; dx <= 7; dx++) {
        const x = ox + dx;
        const y = oy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        if (dx < 0 || dy < 0 || dx > 6 || dy > 6) {
          set(x, y, false, true);
          continue;
        }
        const inOuter = dx === 0 || dy === 0 || dx === 6 || dy === 6;
        const inInner = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        set(x, y, inOuter || inInner, true);
      }
  };
  paintFinder(0, 0);
  paintFinder(size - 7, 0);
  paintFinder(0, size - 7);

  // Timing
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0, true);
    set(i, 6, i % 2 === 0, true);
  }
  // Dark module
  set(8, size - 8, true, true);

  // Alignment
  const positions = ALIGNMENT_POS[version];
  if (positions) {
    for (const cy of positions)
      for (const cx of positions) {
        if (
          (cx === 6 && cy === 6) ||
          (cx === size - 7 && cy === 6) ||
          (cx === 6 && cy === size - 7)
        )
          continue;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const d = Math.max(Math.abs(dx), Math.abs(dy));
            const dark = d === 0 || d === 2;
            set(cx + dx, cy + dy, dark, true);
          }
      }
  }

  // Format info area (15 bits around each finder corner)
  for (let i = 0; i <= 8; i++) {
    if (!reserved[i][8]) set(i, 8, false, true);
    if (!reserved[8][i]) set(8, i, false, true);
  }
  for (let i = 0; i < 8; i++) {
    const xR = size - 1 - i;
    if (!reserved[xR][8]) set(xR, 8, false, true);
    if (i < 7) {
      const yB = size - 1 - i;
      if (!reserved[8][yB]) set(8, yB, false, true);
    }
  }

  // Version info V7+
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const x = size - 11 + (i % 3);
      const y = Math.floor(i / 3);
      set(x, y, false, true);
      set(y, x, false, true);
    }
  }

  // Data codewords
  const eccPerBlock = ECC_CODEWORDS_PER_BLOCK[ecc][version];
  const numBlocks = ECC_BLOCKS[ecc][version];
  const totalCW = TOTAL_CODEWORDS[version];
  const dataCWTotal = totalCW - eccPerBlock * numBlocks;
  const countBits = version < 10 ? 8 : 16;

  const dataBits: boolean[] = [];
  const pushBits = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) dataBits.push(((val >> i) & 1) === 1);
  };
  pushBits(0b0100, 4);
  pushBits(bytes.length, countBits);
  for (const b of bytes) pushBits(b, 8);
  const totalDataBits = dataCWTotal * 8;
  const term = Math.min(4, Math.max(0, totalDataBits - dataBits.length));
  for (let i = 0; i < term; i++) dataBits.push(false);
  while (dataBits.length % 8 !== 0) dataBits.push(false);
  const pads = [0xec, 0x11];
  let pi = 0;
  while (dataBits.length < totalDataBits) {
    pushBits(pads[pi % 2], 8);
    pi++;
  }
  const dataBytes: number[] = [];
  for (let i = 0; i < dataBits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (dataBits[i + j] ? 1 : 0);
    dataBytes.push(b);
  }

  const shortLen = Math.floor(dataCWTotal / numBlocks);
  const longCount = dataCWTotal - shortLen * numBlocks;
  const blocks: number[][] = [];
  let cursor = 0;
  for (let i = 0; i < numBlocks; i++) {
    const len = i < numBlocks - longCount ? shortLen : shortLen + 1;
    const block = dataBytes.slice(cursor, cursor + len);
    cursor += len;
    const ecw = rsEncode(block, eccPerBlock);
    blocks.push([...block, ...ecw]);
  }
  const maxBlockLen = Math.max(...blocks.map((b) => b.length));
  const finalBytes: number[] = [];
  for (let i = 0; i < maxBlockLen; i++)
    for (let b = 0; b < numBlocks; b++)
      if (i < blocks[b].length) finalBytes.push(blocks[b][i]);

  const allBits: boolean[] = [];
  for (const b of finalBytes) pushBits(b, 8);
  const remainderBitsByVersion: Record<number, number> = {
    1: 0,
    2: 7,
    3: 7,
    4: 7,
    5: 7,
    6: 7,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
    12: 0,
    13: 0,
    14: 3,
    15: 3,
  };
  const rem = remainderBitsByVersion[version] ?? 0;
  for (let i = 0; i < rem; i++) allBits.push(false);

  let bi = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const y = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        if (x < 0 || reserved[y][x]) continue;
        const bit = bi < allBits.length ? allBits[bi++] : false;
        set(x, y, bit);
      }
    }
    upward = !upward;
  }

  // Apply mask to data modules (non-reserved)
  const maskFn = (() => {
    switch (maskPattern) {
      case 0: {
        return (x: number, y: number) => (x + y) % 2 === 0;
      }
      case 1: {
        return (_x: number, y: number) => y % 2 === 0;
      }
      case 2: {
        return (x: number) => x % 3 === 0;
      }
      case 3: {
        return (x: number, y: number) => (x + y) % 3 === 0;
      }
      case 4: {
        return (x: number, y: number) =>
          (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      }
      case 5: {
        return (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3) === 0;
      }
      case 6: {
        return (x: number, y: number) =>
          (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      }
      case 7:
      default: {
        return (x: number, y: number) =>
          (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
      }
    }
  })();
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (!reserved[y][x] && maskFn(x, y)) set(x, y, !m[y][x]!);

  // Place format info
  const fmtBits = bchFormatInfo((ECC_FMT[ecc] << 3) | maskPattern);
  for (let i = 0; i < 15; i++) {
    const dark = ((fmtBits >> i) & 1) === 1;
    // around top-left
    if (i < 6) set(8, i, dark, true);
    else if (i === 6) set(8, 7, dark, true);
    else if (i === 7) set(8, 8, dark, true);
    else if (i === 8) set(7, 8, dark, true);
    else set(14 - i, 8, dark, true);
    // around bottom-left + top-right
    if (i < 8) set(8, size - 1 - i, dark, true);
    else set(size - 15 + i, 8, dark, true);
  }

  return { size, modules: m as boolean[][] };
}

// ================= UI State =================
type PresetKey = 'email' | 'sms' | 'tel' | 'text' | 'url' | 'vcard' | 'wifi';

const PRESETS: { hint: string; key: PresetKey; name: string; }[] = [
  { key: 'url', name: '网址', hint: 'https:// 开头，扫码直达网页' },
  { key: 'text', name: '纯文本', hint: '任意文字、备忘录、数字串' },
  { key: 'wifi', name: 'Wi-Fi', hint: 'SSID / 密码 / 加密方式' },
  { key: 'vcard', name: '电子名片', hint: '姓名 / 电话 / 邮箱 / 公司' },
  { key: 'email', name: '邮件', hint: '收件人 / 主题 / 正文' },
  { key: 'sms', name: '短信', hint: '手机号 + 预设文本' },
  { key: 'tel', name: '电话', hint: '手机号，一键拨号' },
];

const presetKey = ref<PresetKey>('url');
const url = ref('https://');
const text = ref('Hey-AdMaster · 本地生成二维码，隐私安全');
const wifiSsid = ref('');
const wifiPwd = ref('');
const wifiEnc = ref<'nopass' | 'WEP' | 'WPA'>('WPA');
const wifiHidden = ref(false);
const name = ref('张三');
const phone = ref('13800000000');
const email = ref('name@example.com');
const company = ref('Hey Studio');
const mailTo = ref('admin@example.com');
const mailSubject = ref('');
const mailBody = ref('');
const smsTo = ref('');
const smsBody = ref('');
const telNo = ref('');

const ecc = ref<Ecc>('M');
const quietZone = ref(2);
const modulePx = ref<'auto' | number>('auto');
const marginPx = ref(48);
const darkColor = ref('#0B0D0C');
const lightColor = ref('#FFFFFF');
const autoMask = ref(true);
const manualMask = ref(0);

let toastTimer: null | number = null;
const toast = ref<null | { text: string; type: 'err' | 'ok'; }>(null);
function showToast(type: 'err' | 'ok', text: string) {
  toast.value = { type, text };
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.value = null), 2200);
}
onBeforeUnmount(() => {
  if (toastTimer) window.clearTimeout(toastTimer);
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const downloadName = ref('qrcode');
const svgCode = ref('');

const content = computed<string>(() => {
  switch (presetKey.value) {
    case 'email': {
      const to = encodeURIComponent(mailTo.value);
      const s = encodeURIComponent(mailSubject.value);
      const b = encodeURIComponent(mailBody.value);
      return `mailto:${to}?subject=${s}&body=${b}`;
    }
    case 'sms': {
      const to = smsTo.value;
      const b = encodeURIComponent(smsBody.value);
      return `SMSTO:${to}:${b}`;
    }
    case 'tel': {
      return `tel:${telNo.value}`;
    }
    case 'text': {
      return text.value;
    }
    case 'url': {
      return url.value.trim();
    }
    case 'vcard': {
      const parts: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];
      if (name.value) parts.push(`N:${name.value}`);
      if (name.value) parts.push(`FN:${name.value}`);
      if (company.value) parts.push(`ORG:${company.value}`);
      if (phone.value) parts.push(`TEL;CELL:${phone.value}`);
      if (email.value) parts.push(`EMAIL:${email.value}`);
      parts.push('END:VCARD');
      return parts.join('\n');
    }
    case 'wifi': {
      const e = wifiEnc.value;
      const s = wifiSsid.value.replaceAll(/([\\;,:"])/g, String.raw`\$1`);
      const p = wifiPwd.value.replaceAll(/([\\;,:"])/g, String.raw`\$1`);
      const h = wifiHidden.value ? 'H:true;' : '';
      if (e === 'nopass') return `WIFI:T:nopass;S:${s};${h};`;
      return `WIFI:T:${e};S:${s};P:${p};${h};`;
    }
  }
});

const canGenerate = computed(() => {
  const c = content.value;
  if (!c || !c.trim()) return false;
  if (presetKey.value === 'wifi' && !wifiSsid.value.trim()) return false;
  return true;
});

const qrData = computed<null | QrResult>(() => {
  if (!canGenerate.value) return null;
  try {
    let mask = 0;
    if (autoMask.value) {
      let bestScore = Infinity;
      let best: null | QrResult = null;
      for (let m = 0; m < 8; m++) {
        const r = qrEncode(content.value, ecc.value, m);
        // Simple penalty N1 (row/col runs of same color) approximation
        let penalty = 0;
        const s = r.size;
        for (let y = 0; y < s; y++) {
          let run = 1;
          for (let x = 1; x < s; x++) {
            if (r.modules[y][x] === r.modules[y][x - 1]) {
              run++;
            } else {
              if (run >= 5) penalty += 3 + (run - 5);
              run = 1;
            }
          }
          if (run >= 5) penalty += 3 + (run - 5);
        }
        if (penalty < bestScore) {
          bestScore = penalty;
          best = r;
          mask = m;
        }
      }
      manualMask.value = mask;
      return best;
    }
    return qrEncode(content.value, ecc.value, manualMask.value);
  } catch (error) {
    showToast('err', error instanceof Error ? error.message : '生成失败');
    return null;
  }
});

// Render to canvas
watch(
  [qrData, darkColor, lightColor, quietZone, modulePx, marginPx],
  () => {
    nextTick(() => {
      const cv = canvasRef.value;
      if (!cv || !qrData.value) {
        svgCode.value = '';
        return;
      }
      const q = qrData.value;
      const quiet = quietZone.value;
      const logicalSize = q.size + quiet * 2;
      const targetCanvasPx = 640;
      const px =
        modulePx.value === 'auto'
          ? Math.max(1, Math.floor(targetCanvasPx / logicalSize))
          : modulePx.value;
      const canvasSize = logicalSize * px;
      cv.width = canvasSize;
      cv.height = canvasSize;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = lightColor.value;
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      ctx.fillStyle = darkColor.value;
      for (let y = 0; y < q.size; y++) {
        for (let x = 0; x < q.size; x++) {
          if (q.modules[y][x]) {
            ctx.fillRect((x + quiet) * px, (y + quiet) * px, px, px);
          }
        }
      }

      // SVG
      const rects: string[] = [];
      for (let y = 0; y < q.size; y++) {
        for (let x = 0; x < q.size; x++) {
          if (q.modules[y][x]) {
            rects.push(
              `<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1" fill="${darkColor.value}" />`,
            );
          }
        }
      }
      const vb = logicalSize;
      svgCode.value = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${lightColor.value}"/>${rects.join('')}</svg>`;
    });
  },
  { immediate: true, deep: true },
);

function copyText(t: string) {
  if (!t) {
    showToast('err', '无内容可复制');
    return;
  }
  navigator.clipboard
    .writeText(t)
    .then(() => showToast('ok', '已复制'))
    .catch(() => showToast('err', '复制失败'));
}
function downloadCanvas(format: 'jpeg' | 'png' | 'webp') {
  const cv = canvasRef.value;
  if (!cv || !qrData.value) return;
  const link = document.createElement('a');
  const mime = `image/${format === 'jpg' ? 'jpeg' : format}`;
  link.download = `${downloadName.value || 'qrcode'}.${format}`;
  link.href = cv.toDataURL(mime, 0.95);
  document.body.append(link);
  link.click();
  link.remove();
  showToast('ok', `已下载 ${format.toUpperCase()}`);
}
function downloadSvg() {
  if (!svgCode.value) return;
  const blob = new Blob([svgCode.value], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${downloadName.value || 'qrcode'}.svg`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('ok', '已下载 SVG');
}
function resetToPreset() {
  switch (presetKey.value) {
    case 'email': {
      mailTo.value = '';
      mailSubject.value = '';
      mailBody.value = '';
      break;
    }
    case 'sms': {
      smsTo.value = '';
      smsBody.value = '';
      break;
    }
    case 'tel': {
      telNo.value = '';
      break;
    }
    case 'text': {
      text.value = '';
      break;
    }
    case 'url': {
      url.value = 'https://';
      break;
    }
    case 'vcard': {
      name.value = '';
      phone.value = '';
      email.value = '';
      company.value = '';
      break;
    }
    case 'wifi': {
      wifiSsid.value = '';
      wifiPwd.value = '';
      wifiEnc.value = 'WPA';
      wifiHidden.value = false;
      break;
    }
  }
}
</script>

<template>
  <div class="tool-page">
    <!-- ========= Topbar ========= -->
    <header class="topbar">
      <div class="topbar-inner container-custom">
        <RouterLink to="/tools" class="topbar-back" title="返回工具箱">
          <span>返回工具箱</span>
        </RouterLink>
        <div class="topbar-title">
          <h1>二维码生成器</h1>
          <p>
            本地编码 · 支持 7 种场景 · PNG / JPG / WebP / SVG 多格式导出 ·
            自定义配色
          </p>
        </div>
        <span class="pill-format">ISO / IEC 18004 · Model 2</span>
      </div>
    </header>

    <main class="container-custom main-grid">
      <!-- ========= 左侧：内容 & 预设 ========= -->
      <section class="glass-card card-content">
        <div class="card-head">
          <h2>内容类型</h2>
          <span class="head-hint">实时生成</span>
        </div>
        <div class="preset-grid">
          <button
            v-for="p in PRESETS"
            :key="p.key"
            type="button"
            class="preset-btn"
            :class="{ active: presetKey === p.key }"
            @click="presetKey = p.key"
          >
            <span class="preset-name">{{ p.name }}</span>
          </button>
        </div>
        <p class="preset-hint">
          {{ PRESETS.find((p) => p.key === presetKey)?.hint }}
        </p>

        <div class="divider"></div>

        <!-- URL -->
        <div v-if="presetKey === 'url'" class="form-block">
          <label class="field-label-block">目标网址</label>
          <input
            v-model="url"
            type="url"
            class="text-input"
            placeholder="https://example.com"
          />
        </div>

        <!-- TEXT -->
        <div v-else-if="presetKey === 'text'" class="form-block">
          <label class="field-label-block">文本内容</label>
          <textarea
            v-model="text"
            rows="6"
            class="text-input textarea"
            placeholder="输入任意文字，扫码即可查看"
          ></textarea>
        </div>

        <!-- WIFI -->
        <div v-else-if="presetKey === 'wifi'" class="form-col">
          <div class="form-block">
            <label class="field-label-block">网络名称（SSID）</label>
            <input
              v-model="wifiSsid"
              class="text-input"
              placeholder="My-WiFi"
            />
          </div>
          <div class="form-block">
            <label class="field-label-block">加密方式</label>
            <div class="seg">
              <button
                v-for="e in ['WPA', 'WEP', 'nopass'] as const"
                :key="e"
                type="button"
                class="seg-btn"
                :class="{ active: wifiEnc === e }"
                @click="wifiEnc = e"
              >
                {{ e === 'nopass' ? '无密码' : e }}
              </button>
            </div>
          </div>
          <div v-if="wifiEnc !== 'nopass'" class="form-block">
            <label class="field-label-block">密码</label>
            <input
              v-model="wifiPwd"
              type="text"
              class="text-input"
              placeholder="Wi-Fi 密码"
            />
          </div>
          <div class="form-row">
            <label class="field-label-block">隐藏网络</label>
            <button
              class="switch"
              :class="{ on: wifiHidden }"
              type="button"
              @click="wifiHidden = !wifiHidden"
            >
              <span class="knob"></span>
              <span class="switch-label">{{ wifiHidden ? '是' : '否' }}</span>
            </button>
          </div>
        </div>

        <!-- VCARD -->
        <div v-else-if="presetKey === 'vcard'" class="form-col">
          <div class="form-block">
            <label class="field-label-block">姓名</label>
            <input v-model="name" class="text-input" placeholder="联系人姓名" />
          </div>
          <div class="form-block">
            <label class="field-label-block">手机</label>
            <input
              v-model="phone"
              class="text-input"
              placeholder="13800000000"
            />
          </div>
          <div class="form-block">
            <label class="field-label-block">邮箱</label>
            <input
              v-model="email"
              type="email"
              class="text-input"
              placeholder="name@example.com"
            />
          </div>
          <div class="form-block">
            <label class="field-label-block">公司</label>
            <input
              v-model="company"
              class="text-input"
              placeholder="公司 / 职位"
            />
          </div>
        </div>

        <!-- EMAIL -->
        <div v-else-if="presetKey === 'email'" class="form-col">
          <div class="form-block">
            <label class="field-label-block">收件人</label>
            <input
              v-model="mailTo"
              type="email"
              class="text-input"
              placeholder="to@example.com"
            />
          </div>
          <div class="form-block">
            <label class="field-label-block">主题</label>
            <input
              v-model="mailSubject"
              class="text-input"
              placeholder="邮件标题"
            />
          </div>
          <div class="form-block">
            <label class="field-label-block">正文</label>
            <textarea
              v-model="mailBody"
              rows="4"
              class="text-input textarea"
              placeholder="正文内容"
            ></textarea>
          </div>
        </div>

        <!-- SMS -->
        <div v-else-if="presetKey === 'sms'" class="form-col">
          <div class="form-block">
            <label class="field-label-block">收件人号码</label>
            <input v-model="smsTo" class="text-input" placeholder="手机号" />
          </div>
          <div class="form-block">
            <label class="field-label-block">预设内容</label>
            <textarea
              v-model="smsBody"
              rows="4"
              class="text-input textarea"
              placeholder="短信正文"
            ></textarea>
          </div>
        </div>

        <!-- TEL -->
        <div v-else-if="presetKey === 'tel'" class="form-block">
          <label class="field-label-block">电话号码</label>
          <input
            v-model="telNo"
            class="text-input"
            placeholder="电话号码，扫码可拨出"
          />
        </div>

        <button
          type="button"
          class="btn btn-ghost full reset-btn"
          @click="resetToPreset"
        >
          清空当前类型内容
        </button>
      </section>

      <!-- ========= 中部：预览 ========= -->
      <section class="glass-card card-preview">
        <div class="card-head">
          <h2>二维码预览</h2>
          <span class="head-hint" v-if="qrData"
            >V · {{ qrData.size }}×{{ qrData.size }}</span
          >
        </div>

        <div class="qr-stage">
          <div
            class="qr-wrap"
            :style="{
              padding: `${marginPx }px`,
              background: lightColor,
            }"
          >
            <canvas ref="canvasRef" v-if="qrData" class="qr-canvas"></canvas>
            <div v-else class="qr-empty">
              <p>填写左侧内容后，这里实时显示二维码</p>
              <p class="qr-empty-sub">内容越简洁，识别越快速</p>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="card-head">
          <h2>纠错等级</h2>
        </div>
        <div class="seg full-seg">
          <button
            v-for="e in ['L', 'M', 'Q', 'H'] as Ecc[]"
            :key="e"
            type="button"
            class="seg-btn"
            :class="{ active: ecc === e }"
            @click="ecc = e"
          >
            {{
              e === 'L'
                ? 'L · ~7%'
                : e === 'M'
                  ? 'M · ~15%'
                  : e === 'Q'
                    ? 'Q · ~25%'
                    : 'H · ~30%'
            }}
          </button>
        </div>
        <p class="seg-hint">
          越高等级容错能力越强，可在中间添加 Logo（H 推荐）
        </p>

        <div class="divider"></div>

        <div class="card-head">
          <h2>原始内容</h2>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            @click="copyText(content)"
          >
            复制
          </button>
        </div>
        <div class="raw-box">
          <code>{{ content || '（暂无内容）' }}</code>
        </div>
      </section>

      <!-- ========= 右侧：样式 & 导出 ========= -->
      <section class="glass-card card-style">
        <div class="card-head">
          <h2>视觉样式</h2>
        </div>

        <div class="form-col">
          <div class="form-row">
            <label class="field-label-block">前景色</label>
            <div class="color-row">
              <input type="color" v-model="darkColor" class="color-picker" />
              <input
                v-model="darkColor"
                class="text-input mono"
                maxlength="9"
              />
            </div>
          </div>
          <div class="form-row">
            <label class="field-label-block">背景色</label>
            <div class="color-row">
              <input type="color" v-model="lightColor" class="color-picker" />
              <input
                v-model="lightColor"
                class="text-input mono"
                maxlength="9"
              />
            </div>
          </div>

          <div class="form-block">
            <label class="field-label-block">
              模块像素
              <span class="chip-mini" v-if="modulePx === 'auto'">自动</span>
            </label>
            <div class="seg">
              <button
                type="button"
                class="seg-btn"
                :class="{ active: modulePx === 'auto' }"
                @click="modulePx = 'auto'"
              >
                自动
              </button>
              <button
                v-for="n in [4, 6, 8, 12]"
                :key="n"
                type="button"
                class="seg-btn"
                :class="{ active: modulePx === n }"
                @click="modulePx = n"
              >
                {{ n }}px
              </button>
            </div>
          </div>

          <div class="form-block">
            <label class="field-label-block">外边距（容器）</label>
            <div class="seg">
              <button
                v-for="n in [16, 24, 32, 48, 72]"
                :key="n"
                type="button"
                class="seg-btn"
                :class="{ active: marginPx === n }"
                @click="marginPx = n"
              >
                {{ n }}
              </button>
            </div>
          </div>

          <div class="form-row">
            <label class="field-label-block">空白边框（Quiet Zone）</label>
            <div class="seg">
              <button
                v-for="n in [0, 2, 4]"
                :key="n"
                type="button"
                class="seg-btn"
                :class="{ active: quietZone === n }"
                @click="quietZone = n"
              >
                {{ n }} 格
              </button>
            </div>
          </div>

          <div class="form-row">
            <label class="field-label-block">自动选择最优蒙板</label>
            <button
              class="switch"
              :class="{ on: autoMask }"
              type="button"
              @click="autoMask = !autoMask"
            >
              <span class="knob"></span>
              <span class="switch-label">{{ autoMask ? '是' : '否' }}</span>
            </button>
          </div>
          <div v-if="!autoMask" class="form-block">
            <label class="field-label-block">手动蒙板</label>
            <div class="seg seg-wrap">
              <button
                v-for="n in 8"
                :key="n"
                type="button"
                class="seg-btn"
                :class="{ active: manualMask === n - 1 }"
                @click="manualMask = n - 1"
              >
                Mask {{ n - 1 }}
              </button>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="card-head">
          <h2>导出</h2>
        </div>
        <div class="form-block">
          <label class="field-label-block">文件名</label>
          <input
            v-model="downloadName"
            class="text-input mono"
            placeholder="qrcode"
          />
        </div>
        <div class="export-grid">
          <button
            type="button"
            class="btn btn-ghost"
            :disabled="!qrData"
            @click="downloadCanvas('png')"
          >
            PNG
          </button>
          <button
            type="button"
            class="btn btn-ghost"
            :disabled="!qrData"
            @click="downloadCanvas('jpeg')"
          >
            JPG
          </button>
          <button
            type="button"
            class="btn btn-ghost"
            :disabled="!qrData"
            @click="downloadCanvas('webp')"
          >
            WebP
          </button>
          <button
            type="button"
            class="btn btn-neon"
            :disabled="!qrData"
            @click="downloadSvg"
          >
            矢量 SVG
          </button>
        </div>
      </section>
    </main>

    <!-- ========= Toast ========= -->
    <transition name="toast-fade">
      <div v-if="toast" class="toast" :class="toast.type">
        {{ toast.text }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.tool-page {
  position: relative;
  min-height: 100vh;
  padding-top: 60px;
  padding-bottom: 80px;
  background: var(--color-bg-primary);
}

.topbar {
  position: sticky;
  top: 56px;
  z-index: 20;
  background: color-mix(in srgb, var(--color-bg-primary) 82%, transparent);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: saturate(180%) blur(14px);
  backdrop-filter: saturate(180%) blur(14px);
}

.topbar-inner {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  height: 54px;
}

.topbar-back {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  transition: all 0.2s ease;
}

.topbar-back:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.topbar-title h1 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
  letter-spacing: 0.02em;
}

.topbar-title p {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-align: center;
  opacity: 0.85;
}

.pill-format {
  padding: 6px 14px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-neon);
  letter-spacing: 0.02em;
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
}

.main-grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
  margin-top: 24px;
}

@media (max-width: 1180px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

.glass-card {
  padding: 22px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.card-head {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-head h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
}

.head-hint {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.divider {
  height: 1px;
  margin: 20px 0;
  background: var(--color-border);
  opacity: 0.85;
}

.seg {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  background: var(--color-bg-elevated-2);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.seg-wrap {
  gap: 2px;
}

.full-seg {
  display: flex;
  width: 100%;
}

.full-seg .seg-btn {
  flex: 1;
}

.seg-btn {
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
  transition: all 0.18s ease;
}

.seg-btn:hover {
  color: var(--color-text-primary);
}

.seg-btn.active {
  color: #0b0d0c;
  background: var(--color-neon);
}

.switch {
  --w: 68px;
  --h: 30px;

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: var(--w);
  height: var(--h);
  padding: 0 10px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-elevated-2);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  transition: all 0.2s ease;
}

.switch.on {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.switch .knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(var(--h) - 6px);
  height: calc(var(--h) - 6px);
  background: var(--color-text-secondary);
  border-radius: 50%;
  opacity: 0.8;
  transition: all 0.2s ease;
}

.switch.on .knob {
  left: calc(var(--w) - var(--h) + 3px);
  background: var(--color-neon);
  opacity: 1;
}

.switch-label {
  position: relative;
  z-index: 1;
  width: 100%;
  text-align: right;
}

.switch:not(.on) .switch-label {
  padding-left: calc(var(--h) - 2px);
  text-align: left;
}

/* ===== content card ===== */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

@media (max-width: 480px) {
  .preset-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.preset-btn {
  padding: 10px 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-elevated-2);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.18s ease;
}

.preset-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-neon-dim);
}

.preset-btn.active {
  color: #0b0d0c;
  background: var(--color-neon);
  border-color: var(--color-neon);
  box-shadow: 0 6px 22px -10px var(--color-neon);
}

.preset-name {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.preset-hint {
  margin: 12px 0 0;
  font-size: 0.76rem;
  line-height: 1.55;
  color: var(--color-text-secondary);
}

.form-block {
  margin-bottom: 14px;
}

.form-col {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.field-label-block {
  display: block;
  margin-bottom: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-row .field-label-block {
  margin-bottom: 0;
}

.text-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 0.85rem;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-elevated-2);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.text-input:focus {
  border-color: var(--color-neon-dim);
  box-shadow: 0 0 0 3px var(--color-neon-glow);
}

.text-input.textarea {
  min-height: 120px;
  line-height: 1.55;
  resize: vertical;
}

.text-input.mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  letter-spacing: 0.02em;
}

.chip-mini {
  display: inline-block;
  padding: 1px 8px;
  margin-left: 6px;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
}

.color-row {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.color-row .text-input {
  flex: 0 0 auto;
  width: 110px;
  text-align: center;
}

.color-picker {
  width: 36px;
  height: 36px;
  padding: 0;
  overflow: hidden;
  appearance: none;
  appearance: none;
  cursor: pointer;
  background: var(--color-bg-elevated-2);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border: 0;
  border-radius: 9px;
}

.reset-btn {
  margin-top: 6px;
}

/* ===== preview card ===== */
.qr-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.qr-wrap {
  max-width: 100%;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  box-shadow: 0 20px 60px -30px color-mix(in srgb, #000 60%, transparent);
}

.qr-canvas {
  display: block;
  width: min(460px, 60vw);
  height: auto;
  image-rendering: pixelated;
}

.qr-empty {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: min(460px, 60vw);
  aspect-ratio: 1 / 1;
  color: var(--color-text-secondary);
  background: repeating-linear-gradient(
    45deg,
    var(--color-bg-elevated-2),
    var(--color-bg-elevated-2) 10px,
    color-mix(in srgb, var(--color-bg-elevated-2) 88%, var(--color-neon)) 10px,
    color-mix(in srgb, var(--color-bg-elevated-2) 88%, var(--color-neon)) 20px
  );
}

.qr-empty p {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
}

.qr-empty-sub {
  font-size: 0.72rem !important;
  opacity: 0.75;
}

.seg-hint {
  margin: 8px 0 0;
  font-size: 0.74rem;
  color: var(--color-text-secondary);
}

.raw-box {
  max-height: 180px;
  padding: 14px;
  overflow: auto;
  background: var(--color-bg-elevated-2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.raw-box code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  word-break: break-all;
  white-space: pre-wrap;
}

/* ===== export card ===== */
.export-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 4px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 16px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 10px;
  transition: all 0.18s ease;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.76rem;
  border-radius: 8px;
}

.btn.full {
  width: 100%;
}

.btn-ghost {
  color: var(--color-text-primary);
  background: var(--color-bg-elevated-2);
  border-color: var(--color-border);
}

.btn-ghost:hover:not(:disabled) {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
}

.btn-neon {
  color: #0b0d0c;
  background: var(--color-neon);
  border-color: transparent;
  box-shadow: 0 6px 24px -10px var(--color-neon);
}

.btn-neon:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.toast {
  position: fixed;
  bottom: 42px;
  left: 50%;
  z-index: 100;
  padding: 10px 18px;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: 9999px;
  backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  transform: translateX(-50%);
}

.toast.ok {
  color: #0b0d0c;
  background: color-mix(in srgb, var(--color-neon) 92%, white);
  border: 1px solid var(--color-neon);
  box-shadow: 0 12px 40px -18px var(--color-neon);
}

.toast.err {
  color: #fff1f2;
  background: color-mix(in srgb, #fb7185 86%, transparent);
  border: 1px solid #fb7185;
  box-shadow: 0 12px 40px -18px #fb7185;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
