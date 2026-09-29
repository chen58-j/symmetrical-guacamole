// 拼豆转换 Web Worker：降采样 → 中位切分量化 → CIEDE2000 拼豆匹配
import { downsampleToGrid, medianCut, mapColorsToBeads } from '../core/quantize';

// Worker 消息处理：接收转换请求，分阶段执行并汇报进度
self.onmessage = (e: MessageEvent) => {
  const request = e.data as {
    type: string;
    requestId: number;
    gridW: number;
    gridH: number;
    colorCount: number;
    width: number;
    height: number;
    pixels: Uint8ClampedArray;
  };
  if (request.type !== 'convert') return;

  const { requestId, gridW, gridH, colorCount, width, height, pixels } = request;

  try {
    // 阶段 1：箱式面积平均降采样到目标网格
    postProgress(requestId, '降采样', 0);
    const cellColors = downsampleToGrid(pixels, width, height, gridW, gridH, (v) => {
      postProgress(requestId, '降采样', v);
    });
    postProgress(requestId, '降采样', 1);

    // 阶段 2：中位切分量化提取主要颜色
    postProgress(requestId, '色彩量化', 0);
    const palette = medianCut(cellColors, colorCount);
    postProgress(requestId, '色彩量化', 1);

    // 阶段 3：量化色 → 拼豆标准色匹配
    postProgress(requestId, '拼豆匹配', 0);
    const { grid, usedColors } = mapColorsToBeads(cellColors, palette, (v) => {
      postProgress(requestId, '拼豆匹配', v);
    });
    postProgress(requestId, '拼豆匹配', 1);

    // 完成：返回格子颜色矩阵与使用统计（grid 转移所有权）
    const response = {
      type: 'done' as const,
      requestId,
      grid,
      usedColors,
    };
    (self as unknown as Worker).postMessage(response, [grid.buffer]);
  } catch (err) {
    // 异常统一转为中文错误消息
    const message = err instanceof Error ? err.message : '未知错误';
    const response = { type: 'error' as const, requestId, message: `转换失败：${message}` };
    (self as unknown as Worker).postMessage(response);
  }
};

// 向主线程汇报阶段进度
function postProgress(requestId: number, phase: string, value: number): void {
  (self as unknown as Worker).postMessage({ type: 'progress', requestId, phase, value });
}
