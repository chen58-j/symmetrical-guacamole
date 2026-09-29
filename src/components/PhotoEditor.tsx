import { useEffect, useRef, useState } from 'react';
import {
  IconRotateLeft,
  IconRotateRight,
  IconCrop,
  IconRefresh,
  IconCheck,
  IconClose,
} from './Icons';
import { imageDataToCanvas, rotateImageData, cropImageData } from '../utils/imageUtils';
import './PhotoEditor.css';

// 拖拽选区（图像坐标）
interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PhotoEditorProps {
  photoData: ImageData | null; // 当前工作图
  originalData: ImageData | null; // 原始图（用于重置）
  onEdited: (data: ImageData) => void; // 编辑结果回调
  onReset: () => void; // 重置回调（App 恢复原图）
}

// 照片编辑器：90° 旋转 + 拖拽裁剪（四角手柄 + 暗色遮罩）
export default function PhotoEditor({ photoData, originalData, onEdited, onReset }: PhotoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cropping, setCropping] = useState(false);
  const [rect, setRect] = useState<CropRect | null>(null);
  // 拖拽状态记录（用 ref 避免频繁重渲染）
  const dragRef = useRef<{
    mode: 'new' | 'move' | 'resize';
    handle?: number;
    startX: number;
    startY: number;
    origin: CropRect;
  } | null>(null);
  const viewRef = useRef({ scale: 1, ox: 0, oy: 0 }); // 显示缩放与偏移

  // 绘制当前帧（照片 + 裁剪遮罩）
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !photoData) return;
    const ctx = canvas.getContext('2d')!;
    const maxW = canvas.clientWidth || 320;
    const maxH = 300;
    const scale = Math.min(maxW / photoData.width, maxH / photoData.height, 1);
    const dispW = Math.round(photoData.width * scale);
    const dispH = Math.round(photoData.height * scale);
    canvas.width = dispW;
    canvas.height = dispH;
    viewRef.current = { scale, ox: 0, oy: 0 };

    // 底图（借助临时 canvas 实现缩放绘制）
    const tmp = imageDataToCanvas(photoData);
    ctx.clearRect(0, 0, dispW, dispH);
    ctx.drawImage(tmp, 0, 0, dispW, dispH);

    // 裁剪模式：绘制暗色遮罩与选区
    if (cropping && rect) {
      const r = {
        x: rect.x * scale,
        y: rect.y * scale,
        w: rect.w * scale,
        h: rect.h * scale,
      };
      ctx.fillStyle = 'rgba(20, 16, 12, 0.55)';
      // 四块遮罩
      ctx.fillRect(0, 0, dispW, r.y);
      ctx.fillRect(0, r.y + r.h, dispW, dispH - r.y - r.h);
      ctx.fillRect(0, r.y, r.x, r.h);
      ctx.fillRect(r.x + r.w, r.y, dispW - r.x - r.w, r.h);
      // 选区描边
      ctx.strokeStyle = '#FF7A59';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      // 四角 L 形手柄
      const h = 10;
      ctx.lineWidth = 3;
      const corners: [number, number, number, number][] = [
        [r.x, r.y, 1, 1], // 左上
        [r.x + r.w, r.y, -1, 1], // 右上
        [r.x, r.y + r.h, 1, -1], // 左下
        [r.x + r.w, r.y + r.h, -1, -1], // 右下
      ];
      for (const [cx, cy, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * h, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * h);
        ctx.stroke();
      }
    }
  };

  // 照片/模式/选区变化时重绘
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoData, cropping, rect]);

  // 图像坐标 ↔ 显示坐标转换
  const toImageCoord = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    const { scale } = viewRef.current;
    return {
      x: Math.max(0, Math.min(photoData!.width, (e.clientX - bounds.left) / scale)),
      y: Math.max(0, Math.min(photoData!.height, (e.clientY - bounds.top) / scale)),
    };
  };

  // 判断点是否靠近选区角柄（返回柄编号 0-3，-1 表示不在柄上）
  const hitHandle = (p: { x: number; y: number }): number => {
    if (!rect) return -1;
    const tolerance = 12 / viewRef.current.scale;
    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.w, y: rect.y },
      { x: rect.x, y: rect.y + rect.h },
      { x: rect.x + rect.w, y: rect.y + rect.h },
    ];
    for (let i = 0; i < corners.length; i++) {
      if (Math.abs(p.x - corners[i].x) < tolerance && Math.abs(p.y - corners[i].y) < tolerance) {
        return i;
      }
    }
    return -1;
  };

  // 鼠标按下：开始新选区 / 移动 / 缩放
  const onMouseDown = (e: React.MouseEvent) => {
    if (!cropping || !photoData) return;
    const p = toImageCoord(e);
    const handle = hitHandle(p);
    if (handle >= 0 && rect) {
      dragRef.current = { mode: 'resize', handle, startX: p.x, startY: p.y, origin: { ...rect } };
    } else if (rect && p.x > rect.x && p.x < rect.x + rect.w && p.y > rect.y && p.y < rect.y + rect.h) {
      dragRef.current = { mode: 'move', startX: p.x, startY: p.y, origin: { ...rect } };
    } else {
      dragRef.current = { mode: 'new', startX: p.x, startY: p.y, origin: { x: p.x, y: p.y, w: 0, h: 0 } };
      setRect({ x: p.x, y: p.y, w: 0, h: 0 });
    }
  };

  // 鼠标移动：更新选区
  const onMouseMove = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag || !photoData) return;
    const p = toImageCoord(e);
    if (drag.mode === 'new') {
      setRect({
        x: Math.min(drag.startX, p.x),
        y: Math.min(drag.startY, p.y),
        w: Math.abs(p.x - drag.startX),
        h: Math.abs(p.y - drag.startY),
      });
    } else if (drag.mode === 'move') {
      const dx = p.x - drag.startX;
      const dy = p.y - drag.startY;
      setRect({
        ...drag.origin,
        x: Math.max(0, Math.min(photoData.width - drag.origin.w, drag.origin.x + dx)),
        y: Math.max(0, Math.min(photoData.height - drag.origin.h, drag.origin.y + dy)),
      });
    } else if (drag.mode === 'resize') {
      // 根据拖动的对角重新计算选区（支持任意方向）
      const anchorMap: Record<number, { ax: number; ay: number }> = {
        0: { ax: drag.origin.x + drag.origin.w, ay: drag.origin.y + drag.origin.h },
        1: { ax: drag.origin.x, ay: drag.origin.y + drag.origin.h },
        2: { ax: drag.origin.x + drag.origin.w, ay: drag.origin.y },
        3: { ax: drag.origin.x, ay: drag.origin.y },
      };
      const anchor = anchorMap[drag.handle!];
      setRect({
        x: Math.min(anchor.ax, p.x),
        y: Math.min(anchor.ay, p.y),
        w: Math.abs(p.x - anchor.ax),
        h: Math.abs(p.y - anchor.ay),
      });
    }
  };

  // 鼠标抬起：结束拖拽
  const onMouseUp = () => {
    dragRef.current = null;
  };

  // 旋转（times: 1=右转 90°, -1=左转 90°）
  const rotate = (times: number) => {
    if (!photoData) return;
    setRect(null);
    setCropping(false);
    onEdited(rotateImageData(photoData, times));
  };

  // 确认裁剪
  const confirmCrop = () => {
    if (!rect || !photoData || rect.w < 2 || rect.h < 2) return;
    onEdited(
      cropImageData(photoData, Math.round(rect.x), Math.round(rect.y), Math.round(rect.w), Math.round(rect.h))
    );
    setRect(null);
    setCropping(false);
  };

  // 取消裁剪
  const cancelCrop = () => {
    setRect(null);
    setCropping(false);
  };

  // 无照片时的占位
  if (!photoData) {
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <IconCrop size={32} />
        </span>
        <p className="empty-main">还没有照片</p>
        <p className="empty-sub">上传照片后可在此裁剪旋转</p>
      </div>
    );
  }

  return (
    <div className="photo-editor">
      <div className="editor-toolbar">
        <button type="button" className="icon-btn" data-tip="向左旋转 90°" onClick={() => rotate(-1)}>
          <IconRotateLeft size={18} />
        </button>
        <button type="button" className="icon-btn" data-tip="向右旋转 90°" onClick={() => rotate(1)}>
          <IconRotateRight size={18} />
        </button>
        <button
          type="button"
          className={`icon-btn ${cropping ? 'active' : ''}`}
          data-tip={cropping ? '正在裁剪' : '裁剪照片'}
          onClick={() => setCropping((v) => !v)}
        >
          <IconCrop size={18} />
        </button>
        <button type="button" className="icon-btn" data-tip="恢复原图" onClick={onReset} disabled={!originalData}>
          <IconRefresh size={18} />
        </button>
        {originalData && (
          <span className="editor-dim">
            {photoData.width} × {photoData.height}
          </span>
        )}
      </div>

      <div className="editor-canvas-wrap">
        <canvas
          ref={canvasRef}
          className={cropping ? 'cropping' : ''}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </div>

      {cropping && (
        <div className="editor-crop-actions">
          <p className="field-hint">拖拽绘制选区，拖动角柄调整，拖动选区内部移动</p>
          <div className="editor-crop-btns">
            <button type="button" className="btn btn-secondary btn-sm" onClick={cancelCrop}>
              <IconClose size={14} />
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={confirmCrop}
              disabled={!rect || rect.w < 2 || rect.h < 2}
            >
              <IconCheck size={14} />
              确认裁剪
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
