import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConvertResult } from '../types';
import { BEAD_PALETTE } from '../core/beadPalette';
import { flippedCoord, getContrastTextColor } from '../utils/imageUtils';
import {
  IconZoomIn,
  IconZoomOut,
  IconFit,
  IconFlipH,
  IconFlipV,
  IconGrid,
  IconRuler,
  IconPalette,
} from './Icons';
import './BeadPreview.css';

interface BeadPreviewProps {
  result: ConvertResult | null; // 转换结果
  mask: Uint8Array | null; // 背景遮罩（1=边缘外需排除）
  showGrid: boolean; // 是否显示网格辅助线
  showColorCode: boolean; // 是否显示色号编码
  showCoords: boolean; // 是否显示坐标标注
  renderStyle: 'round' | 'square'; // 渲染样式
  converting: boolean; // 转换中
  progress: { phase: string; value: number } | null; // 进度
  flipH: boolean; // 水平镜像翻转
  flipV: boolean; // 垂直镜像翻转
  onToggleGrid: (v: boolean) => void; // 网格线切换
  onToggleColorCode: (v: boolean) => void; // 色号切换
  onToggleCoords: (v: boolean) => void; // 坐标切换
  onToggleStyle: (v: 'round' | 'square') => void; // 样式切换
  onToggleFlipH: (v: boolean) => void; // 水平翻转切换
  onToggleFlipV: (v: boolean) => void; // 垂直翻转切换
}

// 拼豆图纸预览画布：缩放平移 / 网格线 / 圆点方块 / 镜像翻转 / 背景排除 / 色号显示 / 悬停颜色提示
// 默认开启：网格线 + 色号标注
export default function BeadPreview({
  result,
  mask,
  showGrid,
  showColorCode,
  showCoords,
  renderStyle,
  converting,
  progress,
  flipH,
  flipV,
  onToggleGrid,
  onToggleColorCode,
  onToggleCoords,
  onToggleStyle,
  onToggleFlipH,
  onToggleFlipV,
}: BeadPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 视图状态：每格像素、平移偏移
  const viewRef = useRef({ cell: 14, ox: 0, oy: 0 });
  const [, forceRender] = useState(0);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const rafRef = useRef(0);
  const fitCellRef = useRef(14); // 适应窗口时的格子尺寸（缩放百分比基准）
  const firstRenderRef = useRef(true);
  const revealRef = useRef(1); // 首渲染淡入动画进度 0-1

  // 判断某个格子是否需要排除（背景区域 mask=1 → 排除）
  const isExcluded = (idx: number) => !!(mask && mask[idx]);

  // 视图状态写入并触发重绘
  const setView = useCallback((patch: Partial<{ cell: number; ox: number; oy: number }>) => {
    Object.assign(viewRef.current, patch);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => forceRender((v) => v + 1));
  }, []);

  // 计算刚好填满容器的格子尺寸基准（100% 基准，用于缩放百分比和"适应窗口"按钮）
  const computeFitCell = useCallback(() => {
    const container = containerRef.current;
    if (!container || !result) return null;
    const cw = container.clientWidth - 16;
    const ch = container.clientHeight - 16;
    const fitCell = Math.min(cw / result.gridW, ch / result.gridH);
    return { fitCell, cw, ch };
  }, [result]);

  // 适应窗口：显示 100% 填满容器（用户手动点击"适应窗口"按钮时）
  const fitToWindow = useCallback(() => {
    const info = computeFitCell();
    if (!info) return;
    const { fitCell, cw, ch } = info;
    fitCellRef.current = fitCell;
    setView({
      cell: fitCell,
      ox: (cw - result!.gridW * fitCell) / 2 + 8,
      oy: (ch - result!.gridH * fitCell) / 2 + 8,
    });
  }, [computeFitCell, result, setView]);

  // 初始化视图：默认填满容器（100%）
  const initDefaultView = useCallback(() => {
    const info = computeFitCell();
    if (!info) return;
    const { fitCell, cw, ch } = info;
    fitCellRef.current = fitCell;
    setView({
      cell: fitCell,
      ox: (cw - result!.gridW * fitCell) / 2 + 8,
      oy: (ch - result!.gridH * fitCell) / 2 + 8,
    });
  }, [computeFitCell, result, setView]);

  // 结果变化时重置视图
  useEffect(() => {
    if (!result) return;
    firstRenderRef.current = true;
    revealRef.current = result.gridW * result.gridH > 12000 ? 1 : 0;
    initDefaultView();
  }, [result, initDefaultView]);

  // 淡入动画
  useEffect(() => {
    if (!result || revealRef.current >= 1) return;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / 260);
      revealRef.current = p;
      forceRender((v) => v + 1);
      if (p < 1) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  // 滚轮阻止默认行为的原生监听（React synthetic onWheel 是 passive 的，无法 preventDefault）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (!result) return;
      e.preventDefault();
      const bounds = container.getBoundingClientRect();
      const mx = e.clientX - bounds.left;
      const my = e.clientY - bounds.top;
      const { cell } = viewRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newCell = Math.max(2, Math.min(80, cell * factor));
      if (newCell === cell) return;
      const k = newCell / cell;
      setView({
        cell: newCell,
        ox: mx - (mx - viewRef.current.ox) * k,
        oy: my - (my - viewRef.current.oy) * k,
      });
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, [result, setView]);

  // 绘制函数
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !result) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    const { cell, ox, oy } = viewRef.current;
    const reveal = revealRef.current;
    const drawCell = cell * reveal;
    const drawOx = ox + (cell - drawCell) * (result.gridW / 2);
    const drawOy = oy + (cell - drawCell) * (result.gridH / 2);

    // 图纸区域底色（白色）
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(drawOx, drawOy, result.gridW * drawCell, result.gridH * drawCell);

    // 仅绘制可见区域内的格子（大图性能优化）
    const startX = Math.max(0, Math.floor((0 - drawOx) / drawCell));
    const endX = Math.min(result.gridW, Math.ceil((cw - drawOx) / drawCell));
    const startY = Math.max(0, Math.floor((0 - drawOy) / drawCell));
    const endY = Math.min(result.gridH, Math.ceil((ch - drawOy) / drawCell));

    // 绘制每格拼豆（考虑翻转 + 背景排除）
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const { fx, fy } = flippedCoord(x, y, result.gridW, result.gridH, flipH, flipV);
        const origIdx = fy * result.gridW + fx;

        // 边缘外背景格子跳过（mask=1）
        if (isExcluded(origIdx)) continue;

        const colorIdx = result.grid[origIdx];
        const hex = BEAD_PALETTE[colorIdx].hex;
        const px = drawOx + x * drawCell;
        const py = drawOy + y * drawCell;
        ctx.fillStyle = hex;
        if (renderStyle === 'round' && drawCell >= 4) {
          ctx.beginPath();
          ctx.arc(px + drawCell / 2, py + drawCell / 2, drawCell * 0.42, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(px, py, drawCell + 0.5, drawCell + 0.5);
        }
      }
    }

    // 网格线（默认开启）
    if (showGrid && drawCell >= 5) {
      ctx.strokeStyle = 'rgba(60, 54, 46, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = startX; x <= endX; x++) {
        const px = Math.round(drawOx + x * drawCell) + 0.5;
        ctx.moveTo(px, Math.max(0, drawOy));
        ctx.lineTo(px, Math.min(ch, drawOy + result.gridH * drawCell));
      }
      for (let y = startY; y <= endY; y++) {
        const py = Math.round(drawOy + y * drawCell) + 0.5;
        ctx.moveTo(Math.max(0, drawOx), py);
        ctx.lineTo(Math.min(cw, drawOx + result.gridW * drawCell), py);
      }
      ctx.stroke();
    }

    // 图纸外边框
    ctx.strokeStyle = 'rgba(60, 54, 46, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(drawOx, drawOy, result.gridW * drawCell, result.gridH * drawCell);

    // 坐标标注（从左上角 1,1 开始，根据翻转状态编号）
    // 无最小尺寸门槛 — 只要开启就强制显示，字体自动适配
    if (showCoords && result.gridW <= 300 && result.gridH <= 300) {
      // 每隔 step 格标注一个数字，避免密集
      const step = Math.max(1, Math.ceil(70 / Math.max(drawCell, 1)));
      const fontSize = Math.max(6, Math.min(14, drawCell * 0.45));
      ctx.font = `${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 顶部列号（flipH 时从右往左数）
      for (let x = 0; x < result.gridW; x += step) {
        const px = drawOx + x * drawCell + drawCell / 2;
        const py = drawOy - fontSize / 2 - 2;
        const colNum = flipH ? result.gridW - x : x + 1;
        // 绘制半透明背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(px - 10, py - fontSize / 2 - 1, 20, fontSize + 2);
        ctx.fillStyle = 'rgba(60, 54, 46, 0.85)';
        ctx.fillText(String(colNum), px, py);
      }

      // 左侧行号（flipV 时从下往上数）
      for (let y = 0; y < result.gridH; y += step) {
        const py = drawOy + y * drawCell + drawCell / 2;
        const px = drawOx - fontSize / 2 - 2;
        const rowNum = flipV ? result.gridH - y : y + 1;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(px - fontSize / 2 - 1, py - 10, fontSize + 2, 20);
        ctx.fillStyle = 'rgba(60, 54, 46, 0.85)';
        ctx.fillText(String(rowNum), px, py);
      }
    }

    // 色号标注（无最小尺寸门槛 — 只要开启就强制显示，字体自动缩小适配）
    if (showColorCode) {
      const fontSize = Math.max(5, drawCell * 0.42);
      ctx.font = `${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const { fx, fy } = flippedCoord(x, y, result.gridW, result.gridH, flipH, flipV);
          const origIdx = fy * result.gridW + fx;
          if (isExcluded(origIdx)) continue;
          const colorIdx = result.grid[origIdx];
          const hex = BEAD_PALETTE[colorIdx].hex;
          const text = BEAD_PALETTE[colorIdx].code;
          const px = drawOx + x * drawCell + drawCell / 2;
          const py = drawOy + y * drawCell + drawCell / 2;
          ctx.fillStyle = getContrastTextColor(hex);
          ctx.fillText(text, px, py);
        }
      }
    }

    // 悬停格子高亮描边
    if (hoverCell) {
      const { fx, fy } = flippedCoord(hoverCell.x, hoverCell.y, result.gridW, result.gridH, flipH, flipV);
      const px = drawOx + fx * drawCell;
      const py = drawOy + fy * drawCell;
      ctx.strokeStyle = '#FF7A59';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, drawCell, drawCell);
    }
  }, [result, mask, showGrid, showColorCode, showCoords, renderStyle, hoverCell, flipH, flipV]);

  // 每次渲染后都重绘
  useEffect(() => {
    draw();
  });

  // 容器尺寸变化时重绘
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  // 缩放（以鼠标为中心）
  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    if (!canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const mx = clientX - bounds.left;
    const my = clientY - bounds.top;
    const { cell, ox, oy } = viewRef.current;
    const newCell = Math.max(2, Math.min(80, cell * factor));
    if (newCell === cell) return;
    const k = newCell / cell;
    setView({ cell: newCell, ox: mx - (mx - ox) * k, oy: my - (my - oy) * k });
  };

  // 鼠标按下：开始平移
  const onMouseDown = (e: React.MouseEvent) => {
    if (!result) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: viewRef.current.ox, oy: viewRef.current.oy };
  };

  // 鼠标移动：平移或悬停高亮
  const onMouseMove = (e: React.MouseEvent) => {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      setView({ ox: dragRef.current.ox + dx, oy: dragRef.current.oy + dy });
      return;
    }
    if (!result || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const { cell, ox, oy } = viewRef.current;
    const rx = Math.floor((e.clientX - bounds.left - ox) / cell);
    const ry = Math.floor((e.clientY - bounds.top - oy) / cell);
    if (rx >= 0 && ry >= 0 && rx < result.gridW && ry < result.gridH) {
      const x = flipH ? result.gridW - 1 - rx : rx;
      const y = flipV ? result.gridH - 1 - ry : ry;
      setHoverCell({ x, y });
    } else {
      setHoverCell(null);
    }
    const container = containerRef.current;
    if (container) {
      const cbounds = container.getBoundingClientRect();
      setHoverPos({ x: e.clientX - cbounds.left, y: e.clientY - cbounds.top });
    }
  };

  // 鼠标抬起：结束平移
  const onMouseUp = () => {
    dragRef.current = null;
  };

  // 鼠标离开：清除悬停
  const onMouseLeave = () => {
    dragRef.current = null;
    setHoverCell(null);
  };

  // 缩放百分比显示
  const zoomPercent = result ? Math.round((viewRef.current.cell / fitCellRef.current) * 100) : 100;

  // 无结果时的空状态
  if (!result) {
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <IconFit size={40} />
        </span>
        <p className="empty-main">还没有拼豆图纸</p>
        <p className="empty-sub">上传照片并生成后，这里会实时预览拼豆效果</p>
      </div>
    );
  }

  // 悬停格子的颜色信息
  const hoverColor = hoverCell ? BEAD_PALETTE[result.grid[hoverCell.y * result.gridW + hoverCell.x]] : null;

  return (
    <div className="bead-preview">
      {/* 顶部工具栏 */}
      <div className="preview-toolbar">
        <button type="button" className="icon-btn" data-tip="缩小" onClick={() => {
          const container = containerRef.current;
          if (container) zoomAt(container.clientWidth / 2 + container.getBoundingClientRect().left, container.clientHeight / 2 + container.getBoundingClientRect().top, 1 / 1.2);
        }}>
          <IconZoomOut size={17} />
        </button>
        <span className="zoom-label">{zoomPercent}%</span>
        <button type="button" className="icon-btn" data-tip="放大" onClick={() => {
          const container = containerRef.current;
          if (container) zoomAt(container.clientWidth / 2 + container.getBoundingClientRect().left, container.clientHeight / 2 + container.getBoundingClientRect().top, 1.2);
        }}>
          <IconZoomIn size={17} />
        </button>
        <button type="button" className="icon-btn" data-tip="适应窗口" onClick={fitToWindow}>
          <IconFit size={17} />
        </button>

        <span className="toolbar-divider" />

        <button
          type="button"
          className={`icon-btn ${flipH ? 'active' : ''}`}
          data-tip="水平翻转"
          onClick={() => onToggleFlipH(!flipH)}
        >
          <IconFlipH size={17} />
        </button>
        <button
          type="button"
          className={`icon-btn ${flipV ? 'active' : ''}`}
          data-tip="垂直翻转"
          onClick={() => onToggleFlipV(!flipV)}
        >
          <IconFlipV size={17} />
        </button>

        <span className="toolbar-divider" />

        <div className="segmented">
          <button
            type="button"
            className={`segmented-item ${renderStyle === 'round' ? 'active' : ''}`}
            onClick={() => onToggleStyle('round')}
          >
            圆点
          </button>
          <button
            type="button"
            className={`segmented-item ${renderStyle === 'square' ? 'active' : ''}`}
            onClick={() => onToggleStyle('square')}
          >
            方块
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* 辅助线（网格）开关 */}
        <button
          type="button"
          className={`icon-btn ${showGrid ? 'active' : ''}`}
          data-tip="辅助线"
          onClick={() => onToggleGrid(!showGrid)}
        >
          <IconGrid size={17} />
        </button>
        {/* 色号开关 */}
        <button
          type="button"
          className={`icon-btn ${showColorCode ? 'active' : ''}`}
          data-tip="色号"
          onClick={() => onToggleColorCode(!showColorCode)}
        >
          <IconPalette size={17} />
        </button>
        {/* 坐标标注开关 */}
        <button
          type="button"
          className={`icon-btn ${showCoords ? 'active' : ''}`}
          data-tip="坐标"
          onClick={() => onToggleCoords(!showCoords)}
        >
          <IconRuler size={17} />
        </button>
      </div>

      {/* 画布区域 */}
      <div
        ref={containerRef}
        className={`preview-canvas-wrap pannable ${converting ? 'busy' : ''}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        <canvas ref={canvasRef} />

        {/* 转换进度遮罩 */}
        {converting && (
          <div className="preview-overlay">
            <div className="progress-ring" />
            <p>
              {progress?.phase ?? '准备中'} · {Math.round((progress?.value ?? 0) * 100)}%
            </p>
          </div>
        )}

        {/* 悬停信息浮层 */}
        {hoverCell && hoverColor && (
          <div
            className="hover-tip"
            style={{ left: hoverPos.x + 14, top: hoverPos.y + 14 }}
          >
            <span className="hover-swatch" style={{ background: hoverColor.hex }} />
            {hoverColor.code} {hoverColor.name} · 第{hoverCell.x + 1}列 第{hoverCell.y + 1}行
          </div>
        )}
      </div>
      <p className="preview-hint">拖拽平移 · 滚轮缩放</p>
    </div>
  );
}
