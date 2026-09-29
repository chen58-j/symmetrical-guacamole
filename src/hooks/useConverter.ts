import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConvertResult } from '../types';

// 转换器 Hook 的对外接口
export interface UseConverterReturn {
  converting: boolean; // 是否正在转换
  progress: { phase: string; value: number } | null; // 当前阶段进度
  result: ConvertResult | null; // 最近一次转换结果
  error: string | null; // 错误信息（中文）
  convert: (params: {
    imageData: ImageData;
    gridW: number;
    gridH: number;
    colorCount: number;
  }) => void;
  cancel: () => void; // 取消当前转换
  applyResult: (r: ConvertResult) => void; // 恢复本地存储的结果
}

// Web Worker 转换器：管理 Worker 生命周期、请求防过期与状态更新
export function useConverter(): UseConverterReturn {
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState<{ phase: string; value: number } | null>(null);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  // 惰性创建 Worker 实例
  const ensureWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/convert.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  // 终止并重建 Worker（用于取消）
  const resetWorker = useCallback((): void => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // 消息监听：在 converting 状态期间动态挂接
  const bindListeners = useCallback(
    (worker: Worker, requestId: number, dims: { gridW: number; gridH: number }): void => {
      const handleMessage = (e: MessageEvent): void => {
        const msg = e.data as
          | { type: 'progress'; requestId: number; phase: string; value: number }
          | { type: 'done'; requestId: number; grid: Uint16Array; usedColors: { index: number; count: number }[] }
          | { type: 'error'; requestId: number; message: string };

        // 过期响应直接丢弃
        if (msg.requestId !== requestId) return;

        if (msg.type === 'progress') {
          setProgress({ phase: msg.phase, value: msg.value });
        } else if (msg.type === 'done') {
          setResult({
            gridW: dims.gridW,
            gridH: dims.gridH,
            grid: msg.grid,
            usedColors: msg.usedColors,
          });
          setConverting(false);
          setProgress(null);
          setError(null);
          cleanup();
        } else {
          setError(msg.message);
          setConverting(false);
          setProgress(null);
          cleanup();
        }
      };
      const handleError = (e: ErrorEvent): void => {
        setError(`转换线程发生异常：${e.message || '未知错误'}`);
        setConverting(false);
        setProgress(null);
        cleanup();
      };
      const cleanup = (): void => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
      };
      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
    },
    []
  );

  // 发起转换
  const convert = useCallback(
    (params: { imageData: ImageData; gridW: number; gridH: number; colorCount: number }): void => {
      const { imageData, gridW, gridH, colorCount } = params;
      // 拷贝像素为独立缓冲区并转移给 Worker
      const pixels = new Uint8ClampedArray(imageData.data);
      const requestId = ++requestIdRef.current;

      setConverting(true);
      setProgress({ phase: '准备中', value: 0 });
      setError(null);

      const worker = ensureWorker();
      bindListeners(worker, requestId, { gridW, gridH });
      worker.postMessage(
        {
          type: 'convert',
          requestId,
          gridW,
          gridH,
          colorCount,
          width: imageData.width,
          height: imageData.height,
          pixels,
        },
        [pixels.buffer]
      );
    },
    [bindListeners, ensureWorker]
  );

  // 取消当前转换
  const cancel = useCallback((): void => {
    resetWorker();
    setConverting(false);
    setProgress(null);
  }, [resetWorker]);

  // 恢复本地存储的转换结果
  const applyResult = useCallback((r: ConvertResult): void => {
    setResult(r);
  }, []);

  // 组件卸载时终止 Worker
  useEffect(() => {
    return () => {
      resetWorker();
    };
  }, [resetWorker]);

  return { converting, progress, result, error, convert, cancel, applyResult };
}
