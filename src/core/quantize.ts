import type { UsedColor } from '../types';
import { nearestBeadIndex } from './colorMatch';

// 将源图像像素箱式面积平均降采样到 gridW × gridH 网格
// 返回长度为 gridW*gridH*3 的 Float32Array（每格的 RGB 均值）
export function downsampleToGrid(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  gridW: number,
  gridH: number,
  onProgress?: (v: number) => void
): Float32Array {
  const result = new Float32Array(gridW * gridH * 3);
  const lastReport = Math.floor(height * 0.05);

  // 逐目标行处理，行内按列分块
  for (let gy = 0; gy < gridH; gy++) {
    // 当前格子在源图中的垂直边界（浮点）
    const y0 = (gy * height) / gridH;
    const y1 = ((gy + 1) * height) / gridH;
    const yStart = Math.floor(y0);
    const yEnd = Math.ceil(y1);

    for (let gx = 0; gx < gridW; gx++) {
      const x0 = (gx * width) / gridW;
      const x1 = ((gx + 1) * width) / gridW;
      const xStart = Math.floor(x0);
      const xEnd = Math.ceil(x1);

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let wSum = 0;

      // 遍历覆盖到的源像素，按重叠面积加权
      for (let y = yStart; y < yEnd; y++) {
        const wy = Math.min(y + 1, y1) - Math.max(y, y0);
        if (wy <= 0) continue;
        for (let x = xStart; x < xEnd; x++) {
          const wx = Math.min(x + 1, x1) - Math.max(x, x0);
          if (wx <= 0) continue;
          const w = wx * wy;
          const idx = (y * width + x) * 4;
          rSum += pixels[idx] * w;
          gSum += pixels[idx + 1] * w;
          bSum += pixels[idx + 2] * w;
          wSum += w;
        }
      }

      const cell = (gy * gridW + gx) * 3;
      if (wSum > 0) {
        result[cell] = rSum / wSum;
        result[cell + 1] = gSum / wSum;
        result[cell + 2] = bSum / wSum;
      }
    }

    // 每 5% 汇报一次进度
    if (onProgress && gy % Math.max(1, lastReport) === 0) {
      onProgress(gy / gridH);
    }
  }
  return result;
}

// 中位切分量化：对 N×3 颜色集合提取 colorCount 个代表色
// 返回 colorCount×3 的 Uint8Array 代表色板
export function medianCut(colors: Float32Array, colorCount: number): Uint8Array {
  const total = colors.length / 3;

  // 先按 5bit 量化去重聚合并统计权重，降低计算量
  const buckets = new Map<number, { r: number; g: number; b: number; w: number }>();
  for (let i = 0; i < total; i++) {
    const r = colors[i * 3];
    const g = colors[i * 3 + 1];
    const b = colors[i * 3 + 2];
    // 5bit 量化作为去重键
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const entry = buckets.get(key);
    if (entry) {
      entry.r += r;
      entry.g += g;
      entry.b += b;
      entry.w += 1;
    } else {
      buckets.set(key, { r, g, b, w: 1 });
    }
  }

  // 展平为用于切分的数组：[r*g*b 聚合和, 权重]
  const entries = Array.from(buckets.values());
  const uniqueCount = entries.length;
  // 实际颜色种类少于目标数时直接返回全部
  if (uniqueCount <= colorCount) {
    const palette = new Uint8Array(uniqueCount * 3);
    for (let i = 0; i < uniqueCount; i++) {
      const e = entries[i];
      palette[i * 3] = Math.round(e.r / e.w);
      palette[i * 3 + 1] = Math.round(e.g / e.w);
      palette[i * 3 + 2] = Math.round(e.b / e.w);
    }
    return palette;
  }

  // 箱结构：记录成员下标与各通道范围
  interface Box {
    indices: number[];
    rMin: number;
    rMax: number;
    gMin: number;
    gMax: number;
    bMin: number;
    bMax: number;
  }

  // 计算单个箱的通道范围
  const computeRange = (box: Box): void => {
    let rMin = Infinity;
    let rMax = -Infinity;
    let gMin = Infinity;
    let gMax = -Infinity;
    let bMin = Infinity;
    let bMax = -Infinity;
    for (const idx of box.indices) {
      const e = entries[idx];
      rMin = Math.min(rMin, e.r / e.w);
      rMax = Math.max(rMax, e.r / e.w);
      gMin = Math.min(gMin, e.g / e.w);
      gMax = Math.max(gMax, e.g / e.w);
      bMin = Math.min(bMin, e.b / e.w);
      bMax = Math.max(bMax, e.b / e.w);
    }
    box.rMin = rMin;
    box.rMax = rMax;
    box.gMin = gMin;
    box.gMax = gMax;
    box.bMin = bMin;
    box.bMax = bMax;
  };

  // 初始箱
  const initial: Box = {
    indices: entries.map((_, i) => i),
    rMin: 0,
    rMax: 0,
    gMin: 0,
    gMax: 0,
    bMin: 0,
    bMax: 0,
  };
  computeRange(initial);
  const boxes: Box[] = [initial];

  // 反复分裂直到达到目标色数或无法再分
  while (boxes.length < colorCount) {
    // 找出可分裂且体积最大的箱
    let bestIdx = -1;
    let bestVolume = 0;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.indices.length < 2) continue;
      const volume =
        (box.rMax - box.rMin) * (box.gMax - box.gMin) * (box.bMax - box.bMin);
      if (volume > bestVolume) {
        bestVolume = volume;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;

    const box = boxes[bestIdx];
    // 选择跨度最大的通道作为分裂轴
    const rRange = box.rMax - box.rMin;
    const gRange = box.gMax - box.gMin;
    const bRange = box.bMax - box.bMin;
    const axis = rRange >= gRange && rRange >= bRange ? 0 : gRange >= bRange ? 1 : 2;

    // 按分裂轴上的值排序，取中位数位置切分成两箱
    const sortedIdx = [...box.indices].sort((a, b) => {
      const ea = entries[a];
      const eb = entries[b];
      const va = axis === 0 ? ea.r / ea.w : axis === 1 ? ea.g / ea.w : ea.b / ea.w;
      const vb = axis === 0 ? eb.r / eb.w : axis === 1 ? eb.g / eb.w : eb.b / eb.w;
      return va - vb;
    });
    const mid = Math.floor(sortedIdx.length / 2);

    const boxA: Box = { indices: sortedIdx.slice(0, mid), rMin: 0, rMax: 0, gMin: 0, gMax: 0, bMin: 0, bMax: 0 };
    const boxB: Box = { indices: sortedIdx.slice(mid), rMin: 0, rMax: 0, gMin: 0, gMax: 0, bMin: 0, bMax: 0 };
    computeRange(boxA);
    computeRange(boxB);

    boxes.splice(bestIdx, 1, boxA, boxB);
  }

  // 每个箱生成加权均值代表色
  const palette = new Uint8Array(boxes.length * 3);
  for (let i = 0; i < boxes.length; i++) {
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let wSum = 0;
    for (const idx of boxes[i].indices) {
      const e = entries[idx];
      rSum += e.r;
      gSum += e.g;
      bSum += e.b;
      wSum += e.w;
    }
    palette[i * 3] = Math.round(rSum / wSum);
    palette[i * 3 + 1] = Math.round(gSum / wSum);
    palette[i * 3 + 2] = Math.round(bSum / wSum);
  }
  return palette;
}

// 将每个格子的量化色映射到拼豆色板下标，并统计使用情况
export function mapColorsToBeads(
  cellColors: Float32Array,
  palette: Uint8Array,
  onProgress?: (v: number) => void
): { grid: Uint16Array; usedColors: UsedColor[] } {
  const cellCount = cellColors.length / 3;
  const paletteCount = palette.length / 3;
  const grid = new Uint16Array(cellCount);
  const counts = new Map<number, number>();

  // 步骤 1：为每个量化代表色预计算最近的拼豆色下标（避免逐格重复计算）
  const repToBead = new Int32Array(paletteCount);
  for (let p = 0; p < paletteCount; p++) {
    repToBead[p] = nearestBeadIndex(palette[p * 3], palette[p * 3 + 1], palette[p * 3 + 2]);
  }

  // 步骤 2：逐格子先找最近代表色（RGB 欧氏距离），再映射到拼豆色
  for (let c = 0; c < cellCount; c++) {
    const r = cellColors[c * 3];
    const g = cellColors[c * 3 + 1];
    const b = cellColors[c * 3 + 2];
    let bestP = 0;
    let bestDist = Infinity;
    for (let p = 0; p < paletteCount; p++) {
      const dr = r - palette[p * 3];
      const dg = g - palette[p * 3 + 1];
      const db = b - palette[p * 3 + 2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        bestP = p;
      }
    }
    const beadIdx = repToBead[bestP];
    grid[c] = beadIdx;
    counts.set(beadIdx, (counts.get(beadIdx) ?? 0) + 1);

    if (onProgress && c % 2000 === 0) {
      onProgress(c / cellCount);
    }
  }

  // 步骤 3：聚合使用统计（数量降序，同数量按下标升序）
  const usedColors: UsedColor[] = Array.from(counts.entries())
    .map(([index, count]) => ({ index, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.index - b.index));

  return { grid, usedColors };
}
