// 图像加载与几何变换工具函数

// 从文件/Blob 加载图像并获取 ImageData（超长边自动等比缩放到 4000 以内）
export async function loadImageFile(file: Blob): Promise<ImageData> {
  // 优先使用 createImageBitmap 解码
  let source: ImageBitmap | HTMLImageElement;
  let width: number;
  let height: number;

  try {
    const bitmap = await createImageBitmap(file);
    source = bitmap;
    width = bitmap.width;
    height = bitmap.height;
  } catch {
    // 回退方案：使用 HTMLImageElement 解码
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片解码失败，文件可能已损坏'));
        img.src = url;
      });
      source = img;
      width = img.naturalWidth;
      height = img.naturalHeight;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // 超大图等比缩放，控制内存占用
  const MAX_EDGE = 4000;
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source as CanvasImageSource, 0, 0, targetW, targetH);

  if ('close' in source && typeof source.close === 'function') {
    source.close();
  }
  return ctx.getImageData(0, 0, targetW, targetH);
}

// 将 ImageData 顺时针旋转 times 次 90°
export function rotateImageData(src: ImageData, times: number): ImageData {
  const turns = ((times % 4) + 4) % 4;
  if (turns === 0) return src;

  const { width: w, height: h, data } = src;
  // 旋转 90°/270° 时宽高互换
  const outW = turns % 2 === 0 ? w : h;
  const outH = turns % 2 === 0 ? h : w;
  const out = new ImageData(outW, outH);
  const dst = out.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * w + x) * 4;
      // 计算旋转后的目标坐标
      let dx: number;
      let dy: number;
      if (turns === 1) {
        dx = h - 1 - y;
        dy = x;
      } else if (turns === 2) {
        dx = w - 1 - x;
        dy = h - 1 - y;
      } else {
        dx = y;
        dy = w - 1 - x;
      }
      const dstIdx = (dy * outW + dx) * 4;
      dst[dstIdx] = data[srcIdx];
      dst[dstIdx + 1] = data[srcIdx + 1];
      dst[dstIdx + 2] = data[srcIdx + 2];
      dst[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return out;
}

// 裁剪 ImageData 指定区域（越界自动收敛到有效范围）
export function cropImageData(src: ImageData, x: number, y: number, w: number, h: number): ImageData {
  // 收敛裁剪区域到图像边界内
  const cx = Math.max(0, Math.min(x, src.width - 1));
  const cy = Math.max(0, Math.min(y, src.height - 1));
  const cw = Math.max(1, Math.min(w, src.width - cx));
  const ch = Math.max(1, Math.min(h, src.height - cy));

  const out = new ImageData(cw, ch);
  const dst = out.data;
  for (let row = 0; row < ch; row++) {
    const srcStart = ((cy + row) * src.width + cx) * 4;
    dst.set(src.data.subarray(srcStart, srcStart + cw * 4), row * cw * 4);
  }
  return out;
}

// 将 ImageData 绘制到新的 canvas 并返回
export function imageDataToCanvas(img: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// 将模块尺寸收敛到有效范围 [5, 200]
export function clampGridSize(value: number): number {
  return Math.max(5, Math.min(200, Math.round(value) || 5));
}

// 计算翻转后的坐标（逻辑坐标 → 翻转后坐标）
export function flippedCoord(
  x: number,
  y: number,
  gridW: number,
  gridH: number,
  flipH: boolean,
  flipV: boolean
): { fx: number; fy: number } {
  return {
    fx: flipH ? gridW - 1 - x : x,
    fy: flipV ? gridH - 1 - y : y,
  };
}

// 根据背景亮度自动选择黑/白文字颜色
export function getContrastTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#1F1A14' : '#FFFFFF';
}
