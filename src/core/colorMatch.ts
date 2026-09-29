// 颜色空间转换与 CIEDE2000 色差算法
import { BEAD_PALETTE } from './beadPalette';

// sRGB (0-255) 转换为 CIELAB 颜色空间（D65 白点）
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // 归一化并做逆 gamma 校正
  let rn = r / 255;
  let gn = g / 255;
  let bn = b / 255;
  rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
  gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
  bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;

  // 线性 RGB → XYZ（D65）
  const x = (rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375) / 0.95047;
  const y = rn * 0.2126729 + gn * 0.7151522 + bn * 0.072175;
  const z = (rn * 0.0193339 + gn * 0.119192 + bn * 0.9503041) / 1.08883;

  // XYZ → Lab
  const fx = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
  const fy = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  const fz = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// 计算两个 Lab 颜色之间的 CIEDE2000 色差（标准完整实现）
export function ciede2000(lab1: [number, number, number], lab2: [number, number, number]): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const pow25_7 = Math.pow(25, 7);

  // 步骤 1：计算 C'、h'
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + pow25_7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const h1p = C1p === 0 ? 0 : (Math.atan2(b1, a1p) * 180) / Math.PI;
  const h2p = C2p === 0 ? 0 : (Math.atan2(b2, a2p) * 180) / Math.PI;

  // 步骤 2：计算 ΔL'、ΔC'、ΔH'
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);

  // 步骤 3：计算 SH、SC、SL、T、RT
  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp: number;
  if (C1p * C2p === 0) {
    hbp = h1p + h2p;
  } else {
    const sum = h1p + h2p;
    if (Math.abs(h1p - h2p) > 180) {
      hbp = sum < 360 ? (sum + 360) / 2 : (sum - 360) / 2;
    } else {
      hbp = sum / 2;
    }
  }
  const T =
    1 -
    0.17 * Math.cos(((hbp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hbp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hbp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * hbp - 63) * Math.PI) / 180);
  const dTheta = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
  const Cbp7 = Math.pow(Cbp, 7);
  const RC = 2 * Math.sqrt(Cbp7 / (Cbp7 + pow25_7));
  const L50 = Math.pow(Lbp - 50, 2);
  const SL = 1 + (0.015 * L50) / Math.sqrt(20 + L50);
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT = -Math.sin((2 * dTheta * Math.PI) / 180) * RC;

  // 步骤 4：合成总色差
  const dL = dLp / SL;
  const dC = dCp / SC;
  const dH = dHp / SH;
  return Math.sqrt(dL * dL + dC * dC + dH * dH + RT * dC * dH);
}

// 十六进制色值解析为 RGB 分量
export function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// 预计算调色板全部颜色的 Lab 缓存（模块加载时执行一次）
export const PALETTE_LABS: Float64Array = (() => {
  const labs = new Float64Array(BEAD_PALETTE.length * 3);
  for (let i = 0; i < BEAD_PALETTE.length; i++) {
    const [r, g, b] = hexToRgb(BEAD_PALETTE[i].hex);
    const lab = rgbToLab(r, g, b);
    labs[i * 3] = lab[0];
    labs[i * 3 + 1] = lab[1];
    labs[i * 3 + 2] = lab[2];
  }
  return labs;
})();

// 查找与给定 RGB 最接近的拼豆颜色下标（基于 CIEDE2000）
export function nearestBeadIndex(r: number, g: number, b: number): number {
  const lab = rgbToLab(r, g, b);
  let bestIndex = 0;
  let bestDelta = Infinity;
  const count = BEAD_PALETTE.length;
  for (let i = 0; i < count; i++) {
    const d = ciede2000(lab, [
      PALETTE_LABS[i * 3],
      PALETTE_LABS[i * 3 + 1],
      PALETTE_LABS[i * 3 + 2],
    ]);
    if (d < bestDelta) {
      bestDelta = d;
      bestIndex = i;
    }
  }
  return bestIndex;
}
