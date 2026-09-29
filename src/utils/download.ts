import type { ConvertResult } from '../types';
import { BEAD_PALETTE } from '../core/beadPalette';
import { countMaskedByColor } from '../core/backgroundMask';
import { flippedCoord, getContrastTextColor } from './imageUtils';

// 结果导出工具：PNG 拼豆模块图（含图例）

// PNG 导出选项
export interface PngExportOptions {
  cellPx: number; // 每格渲染像素
  renderStyle: 'round' | 'square'; // 拼豆样式
  flipH: boolean; // 水平镜像翻转
  flipV: boolean; // 垂直镜像翻转
  mask: Uint8Array | null; // 背景遮罩（1=边缘外需排除，null=不排除）
}

// 默认开启的渲染特性（硬编码）
const SHOW_GRID = true;
const SHOW_COLOR_CODE = true;

// 生成带图例的高清拼豆模块图 PNG Blob
// 上方为拼豆图纸区域，下方为颜色图例（色块 + 色号 + 数量）
// 默认开启：网格线 + 色号标注
export async function exportPngBlob(result: ConvertResult, opts: PngExportOptions): Promise<Blob> {
  const { gridW, gridH, grid } = result;
  const { cellPx, renderStyle, flipH, flipV, mask } = opts;

  // 有效拼豆集合：排除 mask=1 的格子（边缘外背景）
  const isExcluded = mask
    ? (i: number) => !!mask[i]
    : () => false;

  // 从 usedColors 中扣除被 mask 排除的数量
  const maskedByColor = mask ? countMaskedByColor(mask, grid) : new Map<number, number>();
  const effectiveColors = result.usedColors
    .map((u) => {
      const excludedCount = maskedByColor.get(u.index) ?? 0;
      return { ...u, count: u.count - excludedCount };
    })
    .filter((u) => u.count > 0);

  // 计算图例区域高度
  const legendHeaderH = 36;
  const legendItemH = 28;
  const legendItemPad = 6;
  const legendCols = effectiveColors.length <= 6 ? 2 : effectiveColors.length <= 15 ? 3 : 4;
  const legendRows = Math.max(1, Math.ceil(effectiveColors.length / legendCols));
  const legendH = legendHeaderH + legendRows * (legendItemH + legendItemPad) + legendItemPad * 2;

  const gridAreaH = gridH * cellPx;
  const canvasW = gridW * cellPx;
  const canvasH = gridAreaH + legendH;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  // ========== 第一部分：绘制拼豆图纸 ==========
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasW, gridAreaH);

  // 遍历原始坐标，翻转到目标坐标绘制
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const origIdx = y * gridW + x;
      if (isExcluded(origIdx)) continue;

      const colorIdx = grid[origIdx];
      const { fx, fy } = flippedCoord(x, y, gridW, gridH, flipH, flipV);
      const hex = BEAD_PALETTE[colorIdx].hex;
      const px = fx * cellPx;
      const py = fy * cellPx;
      const cx = px + cellPx / 2;
      const cy = py + cellPx / 2;

      ctx.fillStyle = hex;
      if (renderStyle === 'round') {
        const radius = cellPx * 0.42;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(px + 0.5, py + 0.5, cellPx - 1, cellPx - 1);
      }
    }
  }

  // 网格线（默认开启）
  if (SHOW_GRID) {
    ctx.strokeStyle = 'rgba(60, 54, 46, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= gridW; x++) {
      ctx.moveTo(x * cellPx + 0.5, 0);
      ctx.lineTo(x * cellPx + 0.5, gridAreaH);
    }
    for (let y = 0; y <= gridH; y++) {
      ctx.moveTo(0, y * cellPx + 0.5);
      ctx.lineTo(canvasW, y * cellPx + 0.5);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60, 54, 46, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasW, gridAreaH);
  }

  // 色号标注（默认开启，格子足够大时才显示）
  if (SHOW_COLOR_CODE && cellPx >= 14) {
    const fontSize = Math.max(10, cellPx * 0.4);
    ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const origIdx = y * gridW + x;
        if (isExcluded(origIdx)) continue;
        const colorIdx = grid[origIdx];
        const hex = BEAD_PALETTE[colorIdx].hex;
        const text = BEAD_PALETTE[colorIdx].code;
        const { fx, fy } = flippedCoord(x, y, gridW, gridH, flipH, flipV);
        const px = fx * cellPx + cellPx / 2;
        const py = fy * cellPx + cellPx / 2;
        ctx.fillStyle = getContrastTextColor(hex);
        ctx.fillText(text, px, py);
      }
    }
  }

  // ========== 第二部分：绘制图例 ==========
  const legendY = gridAreaH;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, legendY, canvasW, legendH);

  // 分隔线
  ctx.strokeStyle = 'rgba(60, 54, 46, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, legendY + 0.5);
  ctx.lineTo(canvasW, legendY + 0.5);
  ctx.stroke();

  // 图例标题
  const totalBeads = effectiveColors.reduce((s, c) => s + c.count, 0);
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#1F1A14';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `颜色列表（共 ${effectiveColors.length} 色，合计 ${totalBeads.toLocaleString('zh-CN')} 颗）`,
    legendItemPad + 6,
    legendY + legendHeaderH / 2
  );

  // 图例项布局
  const swatchSize = 18;
  const itemStartY = legendY + legendHeaderH;
  const colWidth = (canvasW - legendItemPad * 2) / legendCols;

  // 绘制每个图例项
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  for (let i = 0; i < effectiveColors.length; i++) {
    const used = effectiveColors[i];
    const color = BEAD_PALETTE[used.index];
    const col = i % legendCols;
    const row = Math.floor(i / legendCols);
    const itemY = itemStartY + row * (legendItemH + legendItemPad) + legendItemPad;
    const itemX = legendItemPad + col * colWidth;

    // 色块
    ctx.fillStyle = color.hex;
    ctx.fillRect(itemX, itemY, swatchSize, swatchSize);
    ctx.strokeStyle = 'rgba(60, 54, 46, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(itemX, itemY, swatchSize, swatchSize);

    // 色号 + 名称 + 数量
    ctx.fillStyle = '#1F1A14';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const label = `${color.code} ${color.name} ×${used.count}`;
    ctx.fillText(label, itemX + swatchSize + 8, itemY + swatchSize / 2);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG 导出失败'));
    }, 'image/png');
  });
}

// 触发浏览器下载 Blob 文件
export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
