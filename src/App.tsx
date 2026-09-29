import { useCallback, useEffect, useMemo, useState } from 'react';
import UploadCard from './components/UploadCard';
import PhotoEditor from './components/PhotoEditor';
import ConvertPanel from './components/ConvertPanel';
import BeadPreview from './components/BeadPreview';
import ColorPanel from './components/ColorPanel';
import SizePanel from './components/SizePanel';
import DownloadPanel from './components/DownloadPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { IconUpload, IconCrop, IconGrid, IconImage, IconPalette, IconRuler, IconDownload } from './components/Icons';
import { useConverter } from './hooks/useConverter';
import { loadResult, loadSettings, saveResult, saveSettings, clearResult } from './utils/storage';
import { computeBackgroundMask } from './core/backgroundMask';
import type { AppSettings } from './types';
import './App.css';

// 应用根组件：全局状态、三栏布局
export default function App() {
  // 全局设置（从 localStorage 恢复）
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  // 照片数据（工作图与原图）
  const [photoData, setPhotoData] = useState<ImageData | null>(null);
  const [originalPhotoData, setOriginalPhotoData] = useState<ImageData | null>(null);
  const [photoName, setPhotoName] = useState('');

  const { converting, progress, result, error: convertError, convert, cancel, applyResult } = useConverter();

  // 背景遮罩：用 useMemo 从 result + settings 派生计算
  // 只有当 excludeBackground 开启且 backgroundIdx 有效时才计算，否则返回 null
  const mask = useMemo(() => {
    if (!result || !settings.excludeBackground || settings.backgroundIdx < 0) return null;
    return computeBackgroundMask(result.grid, result.gridW, result.gridH, settings.backgroundIdx);
  }, [result, settings.excludeBackground, settings.backgroundIdx]);

  // 初始化：恢复本地保存的转换结果
  useEffect(() => {
    const saved = loadResult();
    if (saved) applyResult(saved);
  }, [applyResult]);

  // 设置变化时持久化
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // 结果变化时持久化
  useEffect(() => {
    if (result) {
      saveResult(result);
      // 背景排除自动检测：默认选使用最多的颜色（通常是白色背景）
      setSettings((prev) => {
        if (prev.backgroundIdx === -1 && result.usedColors.length > 0) {
          return { ...prev, backgroundIdx: result.usedColors[0].index };
        }
        return prev;
      });
    }
  }, [result]);

  // 上传照片完成：按图片原始宽高比自动匹配初始网格尺寸
  // 基准格子数取 52（最常用正方形预设值），按图片比例推导另一边
  const handlePhotoLoaded = useCallback((data: ImageData, name: string) => {
    setPhotoData(data);
    setOriginalPhotoData(data);
    setPhotoName(name);

    // 根据图片原始宽高比自动计算初始 gridW × gridH
    const imgW = data.width;
    const imgH = data.height;
    const ratio = imgW / imgH;
    // 基准：以格子总数约 52² ≈ 2700 颗为目标量，按比例分配
    const targetCells = 52 * 52;
    let w = Math.round(Math.sqrt(targetCells * ratio));
    let h = Math.round(Math.sqrt(targetCells / ratio));
    // 收敛到合法范围 5-200
    w = Math.max(5, Math.min(200, w));
    h = Math.max(5, Math.min(200, h));
    // 确保乘积接近目标（避免 round 导致的微小偏差使比例跑掉）
    const actualRatio = w / h;
    // 如果偏差超过 10%，以宽度为基准重新计算高度
    if (Math.abs(Math.log(actualRatio / ratio)) > 0.1) {
      h = Math.max(5, Math.min(200, Math.round(w / ratio)));
    }
    setSettings((prev) => ({
      ...prev,
      gridW: w,
      gridH: h,
      lockRatio: true,
      sourceRatio: ratio,
    }));
  }, []);

  // 恢复原图
  const handleResetPhoto = useCallback(() => {
    if (originalPhotoData) {
      setPhotoData(originalPhotoData);
    }
  }, [originalPhotoData]);

  // 设置变更（合并局部字段）
  const handleSettingsChange = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // 发起转换
  const handleConvert = useCallback(() => {
    if (!photoData) return;
    convert({
      imageData: photoData,
      gridW: settings.gridW,
      gridH: settings.gridH,
      colorCount: settings.colorCount,
    });
  }, [photoData, settings, convert]);

  return (
    <ErrorBoundary>
      <div className="app-shell">
        {/* 顶部品牌区 */}
        <header className="app-header">
          <span className="app-logo">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="3" fill="#FF7A59" />
              <circle cx="17" cy="7" r="3" fill="#FF9F45" />
              <circle cx="7" cy="17" r="3" fill="#FF9F45" />
              <circle cx="17" cy="17" r="3" fill="#FF7A59" />
              <circle cx="12" cy="12" r="3" fill="#FF7A59" opacity="0.85" />
            </svg>
          </span>
          <div className="app-header-text">
            <h1>拼豆豆 · 照片转拼豆模块图</h1>
            <p>把照片变成手工拼豆图纸，一步步带你完成</p>
          </div>
        </header>

        {/* 三栏主布局 */}
        <main className="app-layout">
          {/* 左栏：上传 / 编辑 / 转换设置 */}
          <aside className="col col-left">
            <section className="card">
              <div className="card-title">
                <span className="card-icon">
                  <IconUpload size={18} />
                </span>
                上传照片
              </div>
              <UploadCard onLoaded={handlePhotoLoaded} hasPhoto={!!photoData} />
              {photoName && (
                <p className="photo-name" title={photoName}>
                  当前照片：{photoName}
                </p>
              )}
            </section>

            <section className="card">
              <div className="card-title">
                <span className="card-icon">
                  <IconCrop size={18} />
                </span>
                裁剪旋转
              </div>
              <PhotoEditor
                photoData={photoData}
                originalData={originalPhotoData}
                onEdited={setPhotoData}
                onReset={handleResetPhoto}
              />
            </section>

            <section className="card">
              <div className="card-title">
                <span className="card-icon">
                  <IconGrid size={18} />
                </span>
                转换设置
              </div>
              <ConvertPanel
                settings={settings}
                onChange={handleSettingsChange}
                hasPhoto={!!photoData}
                converting={converting}
                progress={progress}
                onConvert={handleConvert}
                onCancel={cancel}
              />
              {convertError && (
                <div className="error-banner" style={{ marginTop: 8 }}>
                  <span>{convertError}</span>
                </div>
              )}
            </section>
          </aside>

          {/* 中栏：拼豆图纸预览 */}
          <section className="col col-center">
            <div className="card preview-card">
              <div className="card-title">
                <span className="card-icon">
                  <IconImage size={18} />
                </span>
                拼豆图纸预览
                {result && (
                  <span className="preview-dim">
                    {result.gridW} × {result.gridH} 格 · {result.usedColors.length} 色
                  </span>
                )}
              </div>
              <ErrorBoundary>
                <BeadPreview
                  result={result}
                  mask={mask}
                  showGrid={settings.showGrid}
                  showColorCode={settings.showColorCode}
                  showCoords={settings.showCoords}
                  renderStyle={settings.renderStyle}
                  converting={converting}
                  progress={progress}
                  flipH={settings.flipH}
                  flipV={settings.flipV}
                  onToggleGrid={(v) => handleSettingsChange({ showGrid: v })}
                  onToggleColorCode={(v) => handleSettingsChange({ showColorCode: v })}
                  onToggleCoords={(v) => handleSettingsChange({ showCoords: v })}
                  onToggleStyle={(v) => handleSettingsChange({ renderStyle: v })}
                  onToggleFlipH={(v) => handleSettingsChange({ flipH: v })}
                  onToggleFlipV={(v) => handleSettingsChange({ flipV: v })}
                />
              </ErrorBoundary>
            </div>
          </section>

          {/* 右栏：颜色 / 尺寸 / 下载 */}
          <aside className="col col-right">
            <section className="card">
              <div className="card-title">
                <span className="card-icon">
                  <IconPalette size={18} />
                </span>
                颜色面板
              </div>
              <ErrorBoundary>
                <ColorPanel
                  result={result}
                  backgroundIdx={settings.backgroundIdx}
                  excludeBackground={settings.excludeBackground}
                  mask={mask}
                  onSetBackground={(idx) => handleSettingsChange({ backgroundIdx: idx })}
                  onToggleExcludeBackground={(v) => handleSettingsChange({ excludeBackground: v })}
                />
              </ErrorBoundary>
            </section>

            <section className="card">
              <div className="card-title">
                <span className="card-icon">
                  <IconRuler size={18} />
                </span>
                尺寸信息
              </div>
              <SizePanel settings={settings} onChange={handleSettingsChange} result={result} mask={mask} />
            </section>

            <section className="card">
              <div className="card-title">
                <span className="card-icon">
                  <IconDownload size={18} />
                </span>
                下载成品
              </div>
              <ErrorBoundary>
                <DownloadPanel
                  result={result}
                  renderStyle={settings.renderStyle}
                  flipH={settings.flipH}
                  flipV={settings.flipV}
                  mask={mask}
                />
              </ErrorBoundary>
              {result && (
                <button
                  type="button"
                  className="btn btn-link btn-sm clear-result"
                  onClick={() => {
                    clearResult();
                    window.location.reload();
                  }}
                >
                  清除本地保存的结果
                </button>
              )}
            </section>
          </aside>
        </main>
      </div>
    </ErrorBoundary>
  );
}
