import { useState } from 'react';
import type { ConvertResult } from '../types';
import { exportPngBlob, downloadBlob } from '../utils/download';
import { IconDownload, IconCheck, IconInfo } from './Icons';
import './DownloadPanel.css';

interface DownloadPanelProps {
  result: ConvertResult | null; // 转换结果
  renderStyle: 'round' | 'square'; // PNG 渲染样式
  flipH: boolean; // 水平镜像翻转
  flipV: boolean; // 垂直镜像翻转
  mask: Uint8Array | null; // 背景遮罩
}

// 下载面板：单个高清 PNG 下载按钮（含图例）
export default function DownloadPanel({
  result,
  renderStyle,
  flipH,
  flipV,
  mask,
}: DownloadPanelProps) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 执行下载任务
  const run = async () => {
    if (!result) return;
    setBusy(true);
    setDone(false);
    setError(null);
    try {
      const cellPx = result.gridW * result.gridH > 40000 ? 20 : 28;
      const blob = await exportPngBlob(result, {
        cellPx,
        renderStyle,
        flipH,
        flipV,
        mask,
      });
      downloadBlob('拼豆图纸.png', blob);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '下载失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  // 无结果空状态
  if (!result) {
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <IconDownload size={32} />
        </span>
        <p className="empty-main">暂无可下载的内容</p>
        <p className="empty-sub">生成拼豆图纸后即可导出</p>
      </div>
    );
  }

  return (
    <div className="download-panel">
      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        onClick={() => void run()}
        disabled={busy}
      >
        {busy ? (
          <>
            <span className="btn-spinner" />
            正在生成图纸…
          </>
        ) : done ? (
          <>
            <IconCheck size={18} />
            已开始下载
          </>
        ) : (
          <>
            <IconDownload size={18} />
            下载拼豆图纸 PNG
          </>
        )}
      </button>

      <p className="download-note">
        <IconInfo size={13} style={{ verticalAlign: -2 }} />
        下载内容：拼豆模块图 + 颜色图例
        {flipH && <> · 水平翻转</>}
        {flipV && <> · 垂直翻转</>}
      </p>

      {error && (
        <div className="error-banner" style={{ marginTop: 4 }}>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
